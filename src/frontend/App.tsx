import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Room,
  UserProfile,
  Achievement,
  ChatMessage,
  Player,
  RoomSettings,
} from './types';
import {
  loadTheme,
  loadGuestProfile,
  saveGuestProfile,
  clearGuestProfile,
} from './utils/storage';
import { soundstage } from './utils/audio';
import { GameAction, MatchState, networkManager } from './websocket/client';
import { api } from './utils/api';
import { INITIAL_ACHIEVEMENTS } from './utils/mockData';

import { Header } from './components/Header';
import { RoomBrowser } from './components/RoomBrowser';
import { PreGameLobby } from './components/PreGameLobby';
import { GameArena } from './components/GameArena';
import { CreateRoomModal } from './components/CreateRoomModal';
import { JoinByCodeModal } from './components/JoinByCodeModal';
import { ProfileModal } from './components/ProfileModal';
import { VictoryModal } from './components/VictoryModal';
import { ToastNotification, ToastData } from './components/ToastNotification';

const mergeAchievementStatus = (unlockedAchievements: Array<{ id: string; unlockedAt: number }>): Achievement[] => {
  const unlockedAtById = new Map(unlockedAchievements.map((achievement) => [achievement.id, achievement.unlockedAt]));
  return INITIAL_ACHIEVEMENTS.map((achievement) => {
    const unlockedAt = unlockedAtById.get(achievement.id);
    return unlockedAt === undefined ? achievement : { ...achievement, isUnlocked: true, unlockedAt };
  });
};

// Initial isolated chat histories for rooms
export const INITIAL_ROOM_CHATS: Record<string, ChatMessage[]> = {
  'room-pub-101': [
    {
      id: 'msg-101-init',
      senderId: 'system',
      senderName: 'System',
      senderAvatarId: 'ringmaster',
      text: 'Room created. Code: BONE-924',
      timestamp: Date.now() - 1000 * 60 * 3,
      isSystem: true,
    },
    {
      id: 'msg-101-1',
      senderId: 'host-barnaby',
      senderName: 'Barnaby Roy',
      senderAvatarId: 'ringmaster',
      text: 'Welcome! Ready up when you are set.',
      timestamp: Date.now() - 1000 * 60 * 2,
    },
  ],
  'room-pub-102': [
    {
      id: 'msg-102-init',
      senderId: 'system',
      senderName: 'System',
      senderAvatarId: 'captain',
      text: 'Room created. Code: DICE-418',
      timestamp: Date.now() - 1000 * 60 * 8,
      isSystem: true,
    },
    {
      id: 'msg-102-1',
      senderId: 'host-saloon',
      senderName: 'Captain Bartholomew',
      senderAvatarId: 'captain',
      text: 'Hello everyone! Dice duel starting soon.',
      timestamp: Date.now() - 1000 * 60 * 7,
    },
  ],
  'room-pub-105': [
    {
      id: 'msg-105-init',
      senderId: 'system',
      senderName: 'System',
      senderAvatarId: 'ringmaster',
      text: 'Room created. Code: ALLEY-888',
      timestamp: Date.now() - 1000 * 60 * 2,
      isSystem: true,
    },
    {
      id: 'msg-105-1',
      senderId: 'host-don-bones',
      senderName: 'Don Skelletone',
      senderAvatarId: 'ringmaster',
      text: 'Welcome to Midnight Alley! Watch out for The Boss and Gangsters.',
      timestamp: Date.now() - 1000 * 60 * 1,
    },
  ],
};

export const App: React.FC = () => {
  // Navigation View State
  const [currentView, setCurrentView] = useState<'browser' | 'lobby' | 'arena'>('browser');

  // User Profile & Achievements
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    const saved = loadGuestProfile();
    return {
      id: '',
      name: saved?.name || 'Guest',
      avatarId: saved?.avatarId || 'boxer',
      isRegistered: false,
      stats: saved?.stats || { matchesPlayed: 0, matchesWon: 0, wordsFound: 0, walkoverWins: 0 },
      mutedPlayerIds: [],
    };
  });
  const [achievements, setAchievements] = useState<Achievement[]>(INITIAL_ACHIEVEMENTS);

  // Rooms Collection & Current Active Room
  const [rooms, setRooms] = useState<Room[]>([]);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [activeMatchState, setActiveMatchState] = useState<MatchState | null>(null);
  const currentRoomRef = useRef<Room | null>(null);
  const userIdRef = useRef('');
  currentRoomRef.current = currentRoom;
  userIdRef.current = userProfile.id;

  // Per-room isolated chat storage
  const [roomChats, setRoomChats] = useState<Record<string, ChatMessage[]>>({});

  // Modals Visibility
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJoinCodeModalOpen, setIsJoinCodeModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isVictoryModalOpen, setIsVictoryModalOpen] = useState(false);
  const [isRematching, setIsRematching] = useState(false);

  // Victory Result State
  const [boutWinner, setBoutWinner] = useState<Player | null>(null);
  const [winReasonText, setWinReasonText] = useState<string | null>(null);

  // Notification Toasts
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const hasAttemptedInvite = useRef(false);

  const refreshAchievements = useCallback(async () => {
    try {
      const unlocked = await api.getAchievements();
      setAchievements(mergeAchievementStatus(unlocked));
      const currentGuest = loadGuestProfile();
      if (currentGuest) {
        saveGuestProfile({
          ...currentGuest,
          achievements: unlocked,
        });
      }
    } catch {
      // Achievement status is refreshed again after the next server-backed event.
    }
  }, []);

  // Initialize theme on root
  useEffect(() => {
    const savedTheme = loadTheme();
    document.documentElement.setAttribute('data-theme', savedTheme);
    try {
      localStorage.removeItem('tb_temp_palette_id');
      localStorage.removeItem('tb_temp_font_id');
      document.documentElement.removeAttribute('style');
    } catch {
      // Ignore storage access errors
    }
  }, []);

  // Bootstrap the authenticated session and recover any public active room from the backend.
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const profile = await api.ensureGuestSession();
        const [availableRooms, activeRoom, unlockedAchievements] = await Promise.all([
          api.listRooms(),
          api.fetchActiveRoom(),
          api.getAchievements(),
        ]);
        if (!active) return;
        setUserProfile(profile);
        setAchievements(mergeAchievementStatus(unlockedAchievements));
        if (!profile.isRegistered) {
          saveGuestProfile({
            name: profile.name,
            avatarId: profile.avatarId,
            stats: profile.stats,
            achievements: unlockedAchievements,
          });
        }
        setRooms(availableRooms);
        if (activeRoom) {
          setCurrentRoom(activeRoom);
          setCurrentView(activeRoom.status === 'in_progress' ? 'arena' : 'lobby');
        }
        networkManager.connect();
      } catch (error) {
        if (active) addToast('alert', 'CONNECTION ERROR', error instanceof Error ? error.message : 'Unable to load your session.');
      }
    };
    void load();
    return () => { active = false; };
  }, [refreshAchievements]);

  useEffect(() => {
    if (currentView !== 'browser') return;
    let active = true;
    void api.listRooms().then((availableRooms) => {
      if (active) setRooms(availableRooms);
    }).catch(() => {
      // The existing room collection remains visible until the next successful refresh.
    });
    return () => { active = false; };
  }, [currentView]);

  // Accept room and chat state only from the backend socket.
  useEffect(() => {
    const unsubscribe = networkManager.subscribe((data) => {
      if (data.type === 'ROOM_UPDATED' || data.type === 'MATCH_STARTED') {
        const incomingRoom: Room = data.room;
        if (incomingRoom.status === 'closed') {
          setRooms((prev) => prev.filter((r) => r.id !== incomingRoom.id));
          setCurrentRoom((prev) => {
            if (prev && prev.id === incomingRoom.id) {
              setCurrentView('browser');
              addToast('info', 'ROOM CLOSED', 'The room was closed.');
              return null;
            }
            return prev;
          });
          return;
        }

        setRooms((prev) => {
          if (incomingRoom.isPrivate && !incomingRoom.players.some((p) => p.id === userIdRef.current)) {
            return prev.filter((r) => r.id !== incomingRoom.id);
          }
          const exists = prev.some((r) => r.id === incomingRoom.id);
          if (exists) {
            return prev.map((r) => (r.id === incomingRoom.id ? incomingRoom : r));
          }
          return [incomingRoom, ...prev];
        });

        setCurrentRoom((prev) => {
          if (prev && prev.id === incomingRoom.id) {
            if (incomingRoom.status === 'in_progress') {
              setCurrentView('arena');
            }
            return incomingRoom;
          }
          return prev;
        });
      } else if (data.type === 'MATCH_STATE') {
        if (currentRoomRef.current?.id === data.roomId) {
          setActiveMatchState((previous) => {
            const prevFeedback = (previous as any)?.wordFeedback || (previous as any)?.actionFeedback;
            if (prevFeedback && previous?.gameId === data.state.gameId) {
              return { ...data.state, wordFeedback: prevFeedback, actionFeedback: prevFeedback };
            }
            return data.state;
          });
        }
      } else if (data.type === 'BONEGLE_WORD_RESULT') {
        if (currentRoomRef.current?.id === data.roomId) {
          setActiveMatchState((previous) => (
            previous
              ? {
                  ...previous,
                  wordFeedback: { word: data.word, status: data.status, id: Date.now() },
                  actionFeedback: { word: data.word, status: data.status, id: Date.now() },
                }
              : previous
          ));
        }
      } else if (data.type === 'MATCH_FINISHED') {
        const previousRoom = currentRoomRef.current;
        if (previousRoom?.id !== data.roomId) return;

        const scoresMap: Record<string, number> = data.scores || (
          (data.state as any).scores ||
          (data.state as any).cumulativeScores ||
          Object.fromEntries(
            Object.entries((data.state as any).breakdowns || {}).map(([playerId, breakdown]: any) => [
              playerId,
              breakdown?.score ?? 0,
            ])
          )
        );

        const breakdownsMap: Record<string, any> = data.breakdowns || (data.state as any).breakdowns || {};

        const baseRoom: Room = data.room || {
          ...previousRoom,
          status: 'finished',
          winnerId: data.state.winnerId || null,
          winReason: data.state.winReason || null,
          players: previousRoom.players.map((player) => ({
            ...player,
            score: scoresMap[player.id] ?? player.score,
          })),
        };

        const enrichedPlayers = baseRoom.players.map((player) => {
          const breakdown = breakdownsMap[player.id];
          if (!breakdown) return player;

          let breakdownSections = player.breakdownSections || breakdown.sections;
          let wordsBreakdown = player.wordsBreakdown;

          if (!wordsBreakdown && breakdown.words && Array.isArray(breakdown.words)) {
            const unique = breakdown.words
              .filter((w: any) => !w.shared)
              .map((w: any) => ({ word: w.word, pts: w.awarded }));
            const shared = breakdown.words
              .filter((w: any) => w.shared)
              .map((w: any) => ({ word: w.word, pts: w.awarded, sharedWith: w.sharedWith }));
            wordsBreakdown = { uniqueWords: unique, sharedWords: shared };
          }

          if (!breakdownSections && wordsBreakdown) {
            breakdownSections = [
              {
                title: 'Unique Words',
                badge: 'x2 PTS',
                items: wordsBreakdown.uniqueWords.map((uw) => ({ label: uw.word, value: `+${uw.pts}`, variant: 'primary' as const })),
              },
              {
                title: 'Shared Words',
                badge: 'x1 PT',
                items: wordsBreakdown.sharedWords.map((sw) => ({
                  label: sw.word,
                  value: `+${sw.pts}`,
                  detail: sw.sharedWith?.length ? sw.sharedWith.join(', ') : undefined,
                  variant: 'secondary' as const,
                })),
              },
            ];
          }

          return {
            ...player,
            score: scoresMap[player.id] ?? player.score,
            wordsBreakdown,
            breakdownSections,
            breakdownItems: player.breakdownItems || breakdown.items,
          };
        });

        const resolvedRoom: Room = {
          ...baseRoom,
          players: enrichedPlayers,
        };
        const winner = resolvedRoom.players.find((player) => player.id === data.state.winnerId) || null;

        setActiveMatchState(data.state);
        setCurrentRoom(resolvedRoom);
        setRooms((previous) => previous.map((room) => room.id === resolvedRoom.id ? resolvedRoom : room));
        setBoutWinner(winner);
        setWinReasonText(data.state.winReason || resolvedRoom.winReason || 'Match complete.');
        setIsVictoryModalOpen(Boolean(winner));
        void refreshAchievements();
      } else if (data.type === 'ROOM_CLOSED' && data.roomId) {
        setRooms((prev) => prev.filter((r) => r.id !== data.roomId));
        setCurrentRoom((prev) => {
          if (prev && prev.id === data.roomId) {
            setCurrentView('browser');
            addToast('info', 'ROOM CLOSED', 'The room was closed.');
            return null;
          }
          return prev;
        });
      } else if (data.type === 'CHAT_MESSAGE' && data.roomId && data.chatMessage) {
        setRoomChats((prev) => ({
          ...prev,
          [data.roomId]: [...(prev[data.roomId] || []), data.chatMessage],
        }));
        if (data.chatMessage.senderId === userIdRef.current) void refreshAchievements();
      } else if (data.type === 'ERROR') {
        addToast('alert', 'REALTIME ERROR', data.message);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [refreshAchievements]);

  // Subscribe before reading history so the server is the single source for every chat message.
  useEffect(() => {
    if (!currentRoom) return;
    let active = true;
    networkManager.subscribeRoom(currentRoom.id);
    void api.fetchChat(currentRoom.id).then((messages) => {
      if (active) setRoomChats((previous) => ({ ...previous, [currentRoom.id]: messages }));
    }).catch((error) => {
      if (active) addToast('alert', 'CHAT ERROR', error instanceof Error ? error.message : 'Unable to load chat history.');
    });
    return () => { active = false; };
  }, [currentRoom?.id]);

  // Helper: Show Toast (with deduplication guard)

  const addToast = (type: 'achievement' | 'alert' | 'info', title: string, message: string) => {
    setToasts((prev) => {
      // Prevent duplicate notification if identical toast is already active
      const exists = prev.some((t) => t.title === title && t.message === message);
      if (exists) return prev;

      const newToast: ToastData = {
        id: 'toast-' + Date.now() + '-' + Math.random(),
        type,
        title,
        message,
      };
      return [...prev, newToast];
    });
  };

  const handleDispatchSystemNotice = useCallback((_text: string) => {
    // Game-engine notices remain local to the engine until game actions have server support.
  }, []);

  const applyRoomUpdate = (room: Room) => {
    setRooms((previous) => {
      const exists = previous.some((item) => item.id === room.id);
      return exists
        ? previous.map((item) => item.id === room.id ? room : item)
        : [room, ...previous];
    });
    setCurrentRoom((previous) => previous?.id === room.id ? room : previous);
  };

  const openJoinedRoom = (room: Room) => {
    applyRoomUpdate(room);
    setCurrentRoom(room);
    setCurrentView(room.status === 'in_progress' ? 'arena' : 'lobby');
    void refreshAchievements();
  };

  // 1. CREATE ROOM
  const handleCreateRoom = async (roomData: Omit<Room, 'id' | 'createdAt'>) => {
    try {
      const room = await api.createRoom({
        title: roomData.title,
        gameId: roomData.gameId,
        isPrivate: roomData.isPrivate,
        settings: roomData.settings,
      });
      applyRoomUpdate(room);
      setCurrentRoom(room);
      setCurrentView('lobby');
      await refreshAchievements();
    } catch (error) {
      addToast('alert', 'CREATE FAILED', error instanceof Error ? error.message : 'Unable to create room.');
    }
  };

  // 2. JOIN ROOM
  const handleJoinRoom = async (roomId: string) => {
    try {
      const joinedRoom = await api.joinRoom(roomId);
      openJoinedRoom(joinedRoom);
    } catch (error) {
      addToast('alert', 'JOIN FAILED', error instanceof Error ? error.message : 'Unable to join room.');
    }
  };

  const handleJoinByCode = async (code: string): Promise<void> => {
    try {
      const room = await api.lookupRoomByCode(code);
      const joinedRoom = await api.joinRoom(room.id);
      openJoinedRoom(joinedRoom);
    } catch (error) {
      addToast('alert', 'JOIN FAILED', error instanceof Error ? error.message : 'Unable to join room.');
      throw error;
    }
  };

  // Auto-join room if opened with an invite URL containing a room code.
  useEffect(() => {
    if (hasAttemptedInvite.current) return;
    if (!userProfile.id) return;
    hasAttemptedInvite.current = true;
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const joinCode = searchParams.get('join') || searchParams.get('room');

      if (joinCode) {
        const cleanCode = joinCode.trim().toUpperCase();
        void handleJoinByCode(cleanCode)
          .then(() => addToast('info', 'JOINING ROOM', `Joining room ${cleanCode}...`))
          .catch(() => undefined);
      }
    } catch (e) {
      console.warn('Auto-join from invite URL failed', e);
    }
  }, [userProfile.id]);

  // 3. TOGGLE READY (Lobby)
  const handleToggleReady = async () => {
    if (!currentRoom) return;
    const currentPlayer = currentRoom.players.find((player) => player.id === userProfile.id);
    if (!currentPlayer) return;
    try {
      const room = await api.setReady(currentRoom.id, !currentPlayer.isReady);
      setCurrentRoom(room);
      setRooms((previous) => previous.map((item) => item.id === room.id ? room : item));
    } catch (error) {
      addToast('alert', 'READY FAILED', error instanceof Error ? error.message : 'Unable to update readiness.');
    }
  };

  // 4. ADD BOT (Lobby)
  const handleAddBot = async (botName: string, avatarId: string) => {
    if (!currentRoom) return;
    try {
      applyRoomUpdate(await api.addBot(currentRoom.id, botName, avatarId));
    } catch (error) {
      addToast('alert', 'BOT FAILED', error instanceof Error ? error.message : 'Unable to add bot.');
    }
  };

  // 5. HOST KICK PLAYER (Lobby)
  const handleKickPlayer = async (playerId: string) => {
    if (!currentRoom) return;
    try {
      applyRoomUpdate(await api.kickPlayer(currentRoom.id, playerId));
    } catch (error) {
      addToast('alert', 'KICK FAILED', error instanceof Error ? error.message : 'Unable to remove player.');
    }
  };

  // 6. TRANSFER HOST
  const handleTransferHost = async (newHostId: string) => {
    if (!currentRoom) return;
    try {
      applyRoomUpdate(await api.transferHost(currentRoom.id, newHostId));
    } catch (error) {
      addToast('alert', 'TRANSFER FAILED', error instanceof Error ? error.message : 'Unable to transfer host.');
    }
  };

  // Update room settings (from gear configuration modal inside lobby or arena)
  const handleUpdateRoomSettings = async (newSettings: RoomSettings, newTitle?: string, isPrivate?: boolean) => {
    if (!currentRoom) return;
    try {
      applyRoomUpdate(await api.updateRoomSettings(currentRoom.id, {
        settings: newSettings,
        title: newTitle,
        isPrivate,
      }));
    } catch (error) {
      addToast('alert', 'SETTINGS FAILED', error instanceof Error ? error.message : 'Unable to update room settings.');
    }
  };

  // 7. START MATCH (Lobby -> Arena)
  const handleStartGame = async () => {
    if (!currentRoom) return;
    try {
      const { room, match } = await api.startRoom(currentRoom.id);
      setCurrentRoom(room);
      setRooms((previous) => previous.map((item) => item.id === room.id ? room : item));
      if (match) setActiveMatchState(match);
      setCurrentView('arena');
    } catch (error) {
      addToast('alert', 'START FAILED', error instanceof Error ? error.message : 'Unable to start match.');
    }
  };

  // 9. LEAVE MATCH / FORFEIT (Critical Quorum & Host Migration Rule)
  const handleLeaveMatch = async () => {
    if (!currentRoom) {
      if (window.location.search) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      setCurrentView('browser');
      return;
    }

    try {
      await api.leaveRoom(currentRoom.id);
      networkManager.clearRoom(currentRoom.id);
      setActiveMatchState(null);
      setCurrentRoom(null);
      setCurrentView('browser');
      setRooms(await api.listRooms());
      if (window.location.search) window.history.replaceState({}, document.title, window.location.pathname);
      soundstage.playSlideDown();
      addToast('info', 'LEFT GAME', 'You left the game.');
    } catch (error) {
      addToast('alert', 'LEAVE FAILED', error instanceof Error ? error.message : 'Unable to leave room.');
    }
  };

  const handleRematch = async () => {
    if (!currentRoom || isRematching) return;
    setIsRematching(true);
    try {
      const { room } = await api.rematchRoom(currentRoom.id);
      applyRoomUpdate(room);
      setActiveMatchState(null);
      setBoutWinner(null);
      setWinReasonText(null);
      setIsVictoryModalOpen(false);
      setCurrentView('lobby');
      soundstage.playRoundBell();
      addToast('info', 'BACK IN ROOM', 'You returned to the room. Click READY when prepared!');
    } catch (error) {
      addToast('alert', 'REMATCH FAILED', error instanceof Error ? error.message : 'Unable to return to room.');
    } finally {
      setIsRematching(false);
    }
  };

  // 12. SEND CHAT MESSAGE (Scoped to current room)
  const handleSendMessage = (text: string) => {
    if (!currentRoom) return;
    networkManager.sendChat(currentRoom.id, text);
  };

  // 13. MUTE / UNMUTE PLAYER
  const handleToggleMutePlayer = async (playerId: string, playerName: string) => {
    const isCurrentlyMuted = userProfile.mutedPlayerIds.includes(playerId);
    try {
      await api.mutePlayer(currentRoom?.id || '', playerId, !isCurrentlyMuted);
      setUserProfile(await api.getProfile());
      await refreshAchievements();
      soundstage.playTap();
      if (isCurrentlyMuted) addToast('info', 'PLAYER UNMUTED', `Messages from ${playerName} are now visible.`);
      else {
        addToast('alert', 'PLAYER MUTED', `${playerName} has been muted. Their messages are hidden.`);
      }
    } catch (error) {
      addToast('alert', 'MUTE FAILED', error instanceof Error ? error.message : 'Unable to update muted player.');
    }
  };

  // Current room messages
  const activeChatMessages = currentRoom ? roomChats[currentRoom.id] || [] : [];

  // Unlocked achievements count
  const unlockedCount = achievements.filter((a) => a.isUnlocked).length;

  return (
    <div className="tablebones-app">
      {/* Header */}
      <Header
        userProfile={userProfile}
        unlockedAchievementsCount={unlockedCount}
        totalAchievementsCount={achievements.length}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onGoHome={() => {
          if (currentView !== 'browser') {
            if (currentRoom) {
              void handleLeaveMatch();
            } else {
              if (window.location.search) {
                window.history.replaceState({}, document.title, window.location.pathname);
              }
              setCurrentView('browser');
            }
          }
        }}
      />

      {/* Main View Router */}
      <main className="app-main-viewport">
        {currentView === 'browser' && (
          <RoomBrowser
            rooms={rooms}
            onJoinRoom={(room) => { void handleJoinRoom(room.id); }}
            onCreateRoomClick={() => setIsCreateModalOpen(true)}
            onJoinByCodeClick={() => setIsJoinCodeModalOpen(true)}
          />
        )}

        {currentView === 'lobby' && currentRoom && (
          <PreGameLobby
            room={currentRoom}
            currentUser={userProfile}
            chatMessages={activeChatMessages}
            onStartGame={handleStartGame}
            onLeaveLobby={handleLeaveMatch}
            onKickPlayer={handleKickPlayer}
            onTransferHost={handleTransferHost}
            onToggleReady={handleToggleReady}
            onAddBotPlayer={handleAddBot}
            onSendMessage={handleSendMessage}
            onToggleMutePlayer={handleToggleMutePlayer}
            onUpdateRoomSettings={handleUpdateRoomSettings}
          />
        )}

        {currentView === 'arena' && currentRoom && (
          <GameArena
            room={currentRoom}
            currentUser={userProfile}
            chatMessages={activeChatMessages}
            onLeaveMatch={handleLeaveMatch}
            onSendMessage={handleSendMessage}
            onToggleMutePlayer={handleToggleMutePlayer}
            onDispatchSystemNotice={handleDispatchSystemNotice}
            matchState={activeMatchState}
            onGameAction={(action: GameAction) => networkManager.sendGameAction(currentRoom.id, action)}
          />
        )}
      </main>

      {/* Modals */}
      <CreateRoomModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        currentUser={userProfile}
        onCreateRoom={handleCreateRoom}
      />

      <JoinByCodeModal
        isOpen={isJoinCodeModalOpen}
        onClose={() => setIsJoinCodeModalOpen(false)}
        onJoinByCode={handleJoinByCode}
      />

      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        userProfile={userProfile}
        achievements={achievements}
        onUpdateProfile={(updated) => {
          void api.updateProfile({
            name: updated.name || userProfile.name,
            avatarId: updated.avatarId || userProfile.avatarId,
          }).then((newProfile) => {
            setUserProfile(newProfile);
            if (!newProfile.isRegistered) {
              const currentGuest = loadGuestProfile();
              saveGuestProfile({
                name: newProfile.name,
                avatarId: newProfile.avatarId,
                stats: newProfile.stats,
                achievements: currentGuest?.achievements,
              });
            }
          }).catch((error) => {
            addToast('alert', 'PROFILE FAILED', error instanceof Error ? error.message : 'Unable to update profile.');
          });
        }}
        onLogin={async (username, password) => {
          try {
            const updatedUser = await api.login(username, password);
            setUserProfile(updatedUser);
            const unlockedAchievements = await api.getAchievements();
            setAchievements(mergeAchievementStatus(unlockedAchievements));
            networkManager.connect();
            addToast('info', 'LOGGED IN', `Welcome back, ${updatedUser.name}!`);
          } catch (error) {
            addToast('alert', 'LOGIN FAILED', error instanceof Error ? error.message : 'Invalid credentials.');
            throw error;
          }
        }}
        onSetPassword={async (password) => {
          try {
            const updatedUser = await api.setPassword(password);
            setUserProfile(updatedUser);
            addToast('info', 'ALIAS PROTECTED', `"${updatedUser.name}" is now secured with your password.`);
          } catch (error) {
            addToast('alert', 'PROTECTION FAILED', error instanceof Error ? error.message : 'Unable to set password.');
            throw error;
          }
        }}
        onSwitchToGuest={async () => {
          try {
            clearGuestProfile();
            localStorage.removeItem('tableskull_auth_token');
            document.cookie = 'tableskull_auth_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax';
            const guest = await api.ensureGuestSession();
            setUserProfile(guest);
            const unlockedAchievements = await api.getAchievements();
            setAchievements(mergeAchievementStatus(unlockedAchievements));
            networkManager.connect();
            addToast('info', 'GUEST MODE', 'Switched to guest session.');
          } catch (error) {
            addToast('alert', 'ERROR', error instanceof Error ? error.message : 'Failed to switch to guest session.');
          }
        }}
      />

      <VictoryModal
        isOpen={isVictoryModalOpen}
        winnerPlayer={boutWinner}
        allPlayers={currentRoom ? currentRoom.players : []}
        winReason={winReasonText}
        onRematch={() => { void handleRematch(); }}
        isRematching={isRematching}
        onReturnToLobby={() => {
          setIsVictoryModalOpen(false);
          void handleLeaveMatch();
        }}
      />

      {/* Toast Notifications */}
      <ToastNotification
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />
    </div>
  );
};

export default App;
