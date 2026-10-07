import React, { useState, useEffect, useCallback } from 'react';
import {
  Room,
  UserProfile,
  Achievement,
  ChatMessage,
  Player,
  RoomSettings,
} from './types';
import {
  loadUserProfile,
  saveUserProfile,
  loadAchievements,
  saveAchievements,
  loadTheme,
  loadActiveRooms,
  saveActiveRooms,
  decodeRoomInvite,
  DEFAULT_ROOM_SETTINGS,
} from './utils/storage';
import { soundstage } from './utils/audio';
import { networkManager } from './utils/networkSync';

import { Header } from './components/Header';
import { RoomBrowser } from './components/RoomBrowser';
import { PreGameLobby } from './components/PreGameLobby';
import { GameArena } from './components/GameArena';
import { CreateRoomModal } from './components/CreateRoomModal';
import { JoinByCodeModal } from './components/JoinByCodeModal';
import { ProfileModal } from './components/ProfileModal';
import { VictoryModal } from './components/VictoryModal';
import { ToastNotification, ToastData } from './components/ToastNotification';

// Initial isolated chat histories for rooms
const INITIAL_ROOM_CHATS: Record<string, ChatMessage[]> = {
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
  const [userProfile, setUserProfile] = useState<UserProfile>(loadUserProfile());
  const [achievements, setAchievements] = useState<Achievement[]>(loadAchievements());

  // Rooms Collection & Current Active Room
  const [rooms, setRooms] = useState<Room[]>(() => loadActiveRooms());
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);

  // Per-room isolated chat storage
  const [roomChats, setRoomChats] = useState<Record<string, ChatMessage[]>>(INITIAL_ROOM_CHATS);

  // Modals Visibility
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isJoinCodeModalOpen, setIsJoinCodeModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isVictoryModalOpen, setIsVictoryModalOpen] = useState(false);

  // Victory Result State
  const [boutWinner, setBoutWinner] = useState<Player | null>(null);
  const [winReasonText, setWinReasonText] = useState<string | null>(null);

  // Notification Toasts
  const [toasts, setToasts] = useState<ToastData[]>([]);

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

  // Persist Profile & Achievements changes
  useEffect(() => {
    saveUserProfile(userProfile);
  }, [userProfile]);

  useEffect(() => {
    saveAchievements(achievements);
  }, [achievements]);

  // Persist active rooms across tabs/sessions
  useEffect(() => {
    saveActiveRooms(rooms);
  }, [rooms]);

  // Real-time synchronization across devices (WebSocket) and tabs (BroadcastChannel)
  useEffect(() => {
    const unsubscribe = networkManager.subscribe((data) => {
      if (data.type === 'SYNC_ROOM' && data.room) {
        const incomingRoom: Room = data.room;
        setRooms((prev) => {
          const exists = prev.some((r) => r.id === incomingRoom.id);
          if (exists) {
            return prev.map((r) => (r.id === incomingRoom.id ? incomingRoom : r));
          }
          return [incomingRoom, ...prev];
        });

        setCurrentRoom((prev) => {
          if (prev && prev.id === incomingRoom.id) {
            if (data.kickedPlayerId === userProfile.id) {
              addToast('alert', 'REMOVED', 'You were removed from the room.');
              setCurrentView('browser');
              return null;
            }
            if (incomingRoom.status === 'in_progress' && prev.status !== 'in_progress') {
              setCurrentView('arena');
            }
            return incomingRoom;
          }
          return prev;
        });
      } else if (data.type === 'START_GAME' && data.roomId) {
        setCurrentRoom((prev) => {
          if (prev && prev.id === data.roomId) {
            setCurrentView('arena');
            return { ...prev, status: 'in_progress' };
          }
          return prev;
        });
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
      }
    });

    return () => {
      unsubscribe();
    };
  }, [userProfile.id]);

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

  // Helper: Unlock Achievement
  const unlockAchievement = (id: string) => {
    setAchievements((prev) => {
      const target = prev.find((a) => a.id === id);
      if (target && !target.isUnlocked) {
        soundstage.playScoreTrumpet();
        addToast('achievement', target.title, target.description);
        return prev.map((a) =>
          a.id === id ? { ...a, isUnlocked: true, unlockedAt: Date.now() } : a
        );
      }
      return prev;
    });
  };

  // Add system message to specific room chat
  const postSystemChatMessage = useCallback((roomId: string, text: string) => {
    const sysMsg: ChatMessage = {
      id: 'msg-sys-' + Date.now() + '-' + Math.random(),
      senderId: 'system',
      senderName: 'System',
      senderAvatarId: 'ringmaster',
      text,
      timestamp: Date.now(),
      isSystem: true,
    };
    setRoomChats((prev) => ({
      ...prev,
      [roomId]: [...(prev[roomId] || []), sysMsg],
    }));
  }, []);

  const handleDispatchSystemNotice = useCallback((text: string) => {
    if (currentRoom) {
      postSystemChatMessage(currentRoom.id, text);
    }
  }, [currentRoom, postSystemChatMessage]);

  // 1. CREATE ROOM
  const handleCreateRoom = (roomData: Omit<Room, 'id' | 'createdAt'>) => {
    const newRoomId = 'room-' + Date.now();
    const newRoom: Room = {
      ...roomData,
      id: newRoomId,
      createdAt: Date.now(),
    };

    setRooms((prev) => [newRoom, ...prev]);
    setCurrentRoom(newRoom);
    setCurrentView('lobby');

    // Broadcast room creation to other tabs/players
    networkManager.send({ type: 'SYNC_ROOM', room: newRoom });

    // Initialize isolated chat for this new room
    setRoomChats((prev) => ({
      ...prev,
      [newRoomId]: [
        {
          id: 'msg-init-' + Date.now(),
          senderId: 'system',
          senderName: 'System',
          senderAvatarId: 'ringmaster',
          text: `Room created for ${newRoom.title}. Code: ${newRoom.code}`,
          timestamp: Date.now(),
          isSystem: true,
        },
      ],
    }));

    // Achievements check
    if (!newRoom.isPrivate) {
      unlockAchievement('gracious-host');
    } else {
      unlockAchievement('secret-society');
    }
  };

  // 2. JOIN ROOM
  const handleJoinRoom = (room: Room) => {
    const alreadyIn = room.players.some((p) => p.id === userProfile.id);
    let updatedRoom = room;

    if (!alreadyIn) {
      const newPlayer: Player = {
        id: userProfile.id,
        name: userProfile.name,
        avatarId: userProfile.avatarId,
        isHost: room.players.length === 0,
        isReady: false,
        score: 0,
      };

      updatedRoom = {
        ...room,
        players: [...room.players, newPlayer],
      };

      // Add join system message to THIS ROOM'S chat only
      postSystemChatMessage(room.id, `${userProfile.name} joined the room.`);
    }

    setRooms((prev) => {
      const exists = prev.some((r) => r.id === updatedRoom.id);
      if (exists) {
        return prev.map((r) => (r.id === updatedRoom.id ? updatedRoom : r));
      }
      return [updatedRoom, ...prev];
    });

    setCurrentRoom(updatedRoom);
    setCurrentView('lobby');

    // Broadcast update to other tabs/players
    networkManager.send({ type: 'SYNC_ROOM', room: updatedRoom });

    if (updatedRoom.isPrivate) {
      unlockAchievement('secret-society');
    }
  };

  // Auto-join room if opened with invite URL parameter (?join=CODE&data=BASE64)
  useEffect(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const joinCode = searchParams.get('join') || searchParams.get('room');
      const dataPayload = searchParams.get('data');

      if (joinCode) {
        const cleanCode = joinCode.trim().toUpperCase();
        const activeRooms = loadActiveRooms();
        let targetRoom = activeRooms.find((r) => r.code.toUpperCase() === cleanCode);

        if (!targetRoom && dataPayload) {
          const decoded = decodeRoomInvite(dataPayload);
          if (decoded) {
            targetRoom = {
              id: decoded.id || `room-${Date.now()}`,
              code: decoded.code || cleanCode,
              title: decoded.title || 'Midnight Alley Table',
              gameId: decoded.gameId || 'midnight-alley',
              isPrivate: decoded.isPrivate ?? true,
              minPlayers: decoded.minPlayers ?? 2,
              maxPlayers: decoded.maxPlayers ?? 6,
              hostId: decoded.hostId || 'host',
              players: [],
              settings: decoded.settings || DEFAULT_ROOM_SETTINGS,
              status: 'waiting',
              createdAt: Date.now(),
            };
          }
        }

        if (targetRoom) {
          handleJoinRoom(targetRoom);
          addToast('info', 'JOINED ROOM', `Joined room ${targetRoom.title}!`);
        }
      }
    } catch (e) {
      console.warn('Auto-join from invite URL failed', e);
    }
  }, []);

  // 3. TOGGLE READY (Lobby)
  const handleToggleReady = () => {
    if (!currentRoom) return;
    const updatedPlayers = currentRoom.players.map((p) =>
      p.id === userProfile.id ? { ...p, isReady: !p.isReady } : p
    );
    const updated = { ...currentRoom, players: updatedPlayers };
    setCurrentRoom(updated);
    setRooms((prev) => prev.map((r) => (r.id === currentRoom.id ? updated : r)));
    networkManager.send({ type: 'SYNC_ROOM', room: updated });
  };

  // 4. ADD SIMULATED BOT (Lobby)
  const handleAddBot = (botName: string, avatarId: string) => {
    if (!currentRoom) return;
    const botPlayer: Player = {
      id: 'bot-' + Date.now(),
      name: botName,
      avatarId,
      isHost: false,
      isReady: true,
      score: 0,
      isBot: true,
    };
    const updated = {
      ...currentRoom,
      players: [...currentRoom.players, botPlayer],
    };
    setCurrentRoom(updated);
    setRooms((prev) => prev.map((r) => (r.id === currentRoom.id ? updated : r)));
    postSystemChatMessage(currentRoom.id, `${botName} joined.`);
    networkManager.send({ type: 'SYNC_ROOM', room: updated });
  };

  // 5. HOST KICK PLAYER (Lobby)
  const handleKickPlayer = (playerId: string) => {
    if (!currentRoom) return;
    const kicked = currentRoom.players.find((p) => p.id === playerId);
    if (!kicked) return;

    soundstage.playBulbHorn();
    const updatedPlayers = currentRoom.players.filter((p) => p.id !== playerId);
    const updated = { ...currentRoom, players: updatedPlayers };

    setCurrentRoom(updated);
    setRooms((prev) => prev.map((r) => (r.id === currentRoom.id ? updated : r)));

    addToast('alert', 'PLAYER REMOVED', `${kicked.name} was removed from the room.`);
    postSystemChatMessage(currentRoom.id, `Host removed ${kicked.name} from the room.`);
    networkManager.send({ type: 'SYNC_ROOM', room: updated, kickedPlayerId: playerId });
  };

  // 6. TRANSFER HOST
  const handleTransferHost = (newHostId: string) => {
    if (!currentRoom) return;
    const newHostPlayer = currentRoom.players.find((p) => p.id === newHostId);
    if (!newHostPlayer) return;

    const updatedPlayers = currentRoom.players.map((p) => ({
      ...p,
      isHost: p.id === newHostId,
    }));

    const updated = {
      ...currentRoom,
      hostId: newHostId,
      players: updatedPlayers,
    };

    setCurrentRoom(updated);
    setRooms((prev) => prev.map((r) => (r.id === currentRoom.id ? updated : r)));
    postSystemChatMessage(currentRoom.id, `Host role transferred to ${newHostPlayer.name}.`);
    addToast('info', 'HOST TRANSFERRED', `${newHostPlayer.name} is now the room host.`);
    networkManager.send({ type: 'SYNC_ROOM', room: updated });
  };

  // Update room settings (from gear configuration modal inside lobby or arena)
  const handleUpdateRoomSettings = (newSettings: RoomSettings, newTitle?: string, isPrivate?: boolean) => {
    if (!currentRoom) return;
    const updated: Room = {
      ...currentRoom,
      title: newTitle || currentRoom.title,
      isPrivate: isPrivate !== undefined ? isPrivate : currentRoom.isPrivate,
      settings: newSettings,
    };
    setCurrentRoom(updated);
    setRooms((prev) => prev.map((r) => (r.id === currentRoom.id ? updated : r)));
    postSystemChatMessage(currentRoom.id, `Room settings updated by host.`);
    addToast('info', 'SETTINGS UPDATED', 'Room configuration saved.');
    networkManager.send({ type: 'SYNC_ROOM', room: updated });
  };

  // 7. START MATCH (Lobby -> Arena)
  const handleStartGame = () => {
    if (!currentRoom) return;
    const matchSeed = currentRoom.settings.bonegleSeed || `${currentRoom.code}-${Date.now().toString(36)}`;
    const updated: Room = {
      ...currentRoom,
      status: 'in_progress',
      settings: {
        ...currentRoom.settings,
        bonegleSeed: matchSeed,
      },
    };
    setCurrentRoom(updated);
    setRooms((prev) => prev.map((r) => (r.id === currentRoom.id ? updated : r)));
    setCurrentView('arena');

    unlockAchievement('first-bout');
    postSystemChatMessage(currentRoom.id, 'The game has started!');
    networkManager.send({ type: 'SYNC_ROOM', room: updated });
    networkManager.send({ type: 'START_GAME', roomId: updated.id });
  };

  // 8. SCORE IN GAME
  const handlePlayerScore = (playerId: string, addedScore: number) => {
    if (!currentRoom) return;
    const updatedPlayers = currentRoom.players.map((p) =>
      p.id === playerId ? { ...p, score: p.score + addedScore } : p
    );
    const updated = { ...currentRoom, players: updatedPlayers };
    setCurrentRoom(updated);
    setRooms((prev) => prev.map((r) => (r.id === currentRoom.id ? updated : r)));

    if (playerId === userProfile.id) {
      const myPlayer = updatedPlayers.find((p) => p.id === playerId);
      if (myPlayer && myPlayer.score >= 30) {
        unlockAchievement('high-roller');
      }
      setUserProfile((prev) => ({
        ...prev,
        stats: {
          ...prev.stats,
          wordsFound: prev.stats.wordsFound + 1,
        },
      }));
    }
  };

  // 9. LEAVE MATCH / FORFEIT (Critical Quorum & Host Migration Rule)
  const handleLeaveMatch = () => {
    if (!currentRoom) {
      if (window.location.search) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      setCurrentView('browser');
      return;
    }

    soundstage.playSlideDown();

    const remainingPlayers = currentRoom.players.filter((p) => p.id !== userProfile.id);

    // If no players remain, dissolve room
    if (remainingPlayers.length === 0) {
      setRooms((prev) => prev.filter((r) => r.id !== currentRoom.id));
      setCurrentRoom(null);
      setCurrentView('browser');
      if (window.location.search) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      networkManager.send({ type: 'ROOM_CLOSED', roomId: currentRoom.id });
      addToast('info', 'ROOM CLOSED', 'All players left the room.');
      return;
    }

    // If host left, pass host role to next player
    let newHostId = currentRoom.hostId;
    if (currentRoom.hostId === userProfile.id) {
      newHostId = remainingPlayers[0].id;
      remainingPlayers[0].isHost = true;
      postSystemChatMessage(currentRoom.id, `Host left the game. Leadership transferred to ${remainingPlayers[0].name}.`);
    }

    // Quorum check: If remaining players < minPlayers, remaining player wins!
    if (remainingPlayers.length < currentRoom.minPlayers) {
      const winner = remainingPlayers[0];
      const winReason = `Players dropped below the minimum required (${currentRoom.minPlayers}). Last remaining player wins by default!`;

      const finishedRoom: Room = {
        ...currentRoom,
        hostId: newHostId,
        players: remainingPlayers,
        status: 'finished',
        winnerId: winner.id,
        winReason,
      };

      setRooms((prev) => prev.map((r) => (r.id === currentRoom.id ? finishedRoom : r)));
      setCurrentRoom(null);
      setCurrentView('browser');
      if (window.location.search) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      networkManager.send({ type: 'SYNC_ROOM', room: finishedRoom });
      addToast('alert', 'MATCH ENDED', winReason);
      return;
    }

    // Otherwise, game continues
    const updatedRoom: Room = {
      ...currentRoom,
      hostId: newHostId,
      players: remainingPlayers,
    };

    setRooms((prev) => prev.map((r) => (r.id === currentRoom.id ? updatedRoom : r)));
    setCurrentRoom(null);
    setCurrentView('browser');
    if (window.location.search) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    networkManager.send({ type: 'SYNC_ROOM', room: updatedRoom, leftPlayerId: userProfile.id });
    addToast('info', 'LEFT GAME', 'You left the game.');
  };

  // 11. MATCH FINISHED (Timer concluded)
  const handleMatchComplete = (winner: Player, winReason?: string, finalPlayers?: Player[]) => {
    if (!currentRoom) return;

    const resolvedPlayers = finalPlayers || currentRoom.players;
    const resolvedWinner = resolvedPlayers.find((p) => p.id === winner.id) || winner;

    setBoutWinner(resolvedWinner);
    setWinReasonText(winReason || 'Timer concluded. Final scores tallied.');
    setIsVictoryModalOpen(true);

    const isMeWinner = resolvedWinner.id === userProfile.id;
    if (isMeWinner) {
      unlockAchievement('ring-champion');
    }

    setUserProfile((prev) => ({
      ...prev,
      stats: {
        ...prev.stats,
        matchesPlayed: prev.stats.matchesPlayed + 1,
        matchesWon: isMeWinner ? prev.stats.matchesWon + 1 : prev.stats.matchesWon,
      },
    }));

    const finishedRoom: Room = {
      ...currentRoom,
      players: resolvedPlayers,
      status: 'finished',
      winnerId: resolvedWinner.id,
      winReason: winReason || null,
    };
    setCurrentRoom(finishedRoom);
    setRooms((prev) => prev.map((r) => (r.id === currentRoom.id ? finishedRoom : r)));
    networkManager.send({ type: 'SYNC_ROOM', room: finishedRoom });
  };

  // 12. SEND CHAT MESSAGE (Scoped to current room)
  const handleSendMessage = (text: string) => {
    if (!currentRoom) return;

    const newMsg: ChatMessage = {
      id: 'msg-' + Date.now() + '-' + Math.random(),
      senderId: userProfile.id,
      senderName: userProfile.name,
      senderAvatarId: userProfile.avatarId,
      text,
      timestamp: Date.now(),
    };

    setRoomChats((prev) => {
      const currentList = prev[currentRoom.id] || [];
      const updatedList = [...currentList, newMsg];
      const myMsgs = updatedList.filter((m) => m.senderId === userProfile.id);
      if (myMsgs.length >= 5) {
        unlockAchievement('silver-tongue');
      }
      return {
        ...prev,
        [currentRoom.id]: updatedList,
      };
    });

    networkManager.send({
      type: 'CHAT_MESSAGE',
      roomId: currentRoom.id,
      chatMessage: newMsg,
    });
  };

  // 13. MUTE / UNMUTE PLAYER
  const handleToggleMutePlayer = (playerId: string, playerName: string) => {
    const isCurrentlyMuted = userProfile.mutedPlayerIds.includes(playerId);

    if (isCurrentlyMuted) {
      soundstage.playTap();
      setUserProfile((prev) => ({
        ...prev,
        mutedPlayerIds: prev.mutedPlayerIds.filter((id) => id !== playerId),
      }));
      addToast('info', 'PLAYER UNMUTED', `Messages from ${playerName} are now visible.`);
    } else {
      soundstage.playTap();
      setUserProfile((prev) => ({
        ...prev,
        mutedPlayerIds: [...prev.mutedPlayerIds, playerId],
      }));
      unlockAchievement('peacekeeper');
      addToast(
        'alert',
        'PLAYER MUTED',
        `${playerName} has been muted. Their messages are hidden.`
      );
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
            if (window.location.search) {
              window.history.replaceState({}, document.title, window.location.pathname);
            }
            setCurrentView('browser');
          }
        }}
      />

      {/* Main View Router */}
      <main className="app-main-viewport">
        {currentView === 'browser' && (
          <RoomBrowser
            rooms={rooms}
            onJoinRoom={handleJoinRoom}
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
            onPlayerScore={handlePlayerScore}
            onLeaveMatch={handleLeaveMatch}
            onMatchComplete={handleMatchComplete}
            onSendMessage={handleSendMessage}
            onToggleMutePlayer={handleToggleMutePlayer}
            onDispatchSystemNotice={handleDispatchSystemNotice}
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
        rooms={rooms}
        onJoinSuccess={handleJoinRoom}
      />

      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        userProfile={userProfile}
        achievements={achievements}
        onUpdateProfile={(updated) => {
          setUserProfile((prev) => ({ ...prev, ...updated }));
        }}
      />

      <VictoryModal
        isOpen={isVictoryModalOpen}
        winnerPlayer={boutWinner}
        allPlayers={currentRoom ? currentRoom.players : []}
        winReason={winReasonText}
        onRematch={() => {
          setIsVictoryModalOpen(false);
          if (currentRoom) {
            const resetRoom = {
              ...currentRoom,
              status: 'waiting' as const,
              settings: {
                ...currentRoom.settings,
                bonegleSeed: undefined,
                bonegleBoard: undefined,
              },
              players: currentRoom.players.map((p) => ({ ...p, score: 0, isReady: p.isHost || !!p.isBot })),
            };
            setCurrentRoom(resetRoom);
            setRooms((prev) => prev.map((r) => (r.id === currentRoom.id ? resetRoom : r)));
            setCurrentView('lobby');
          }
        }}
        onReturnToLobby={() => {
          setIsVictoryModalOpen(false);
          setCurrentView('browser');
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
