import React, { useState, useEffect } from 'react';
import type { BaseGameEngineProps, Player } from '../../types';
import type { DoomedMineMatchState } from './types';
import { PokerCardView, PressureTokenChip } from './DoomedMineCards';
import { DoomedMineRules } from './DoomedMineRules';
import {
  playTokenSelectSound,
  playSuccessSound,
  playCaveInSound,
} from './doomedMineLogic';
import { soundstage } from '../../utils/audio';
import { AvatarIcon } from '../../utils/avatars';
import {
  Pickaxe,
  AlertTriangle,
  Trophy,
  CheckCircle2,
  Clock,
  Crown,
  BookOpen,
  X,
  ChevronRight,
  Zap,
} from 'lucide-react';

export const DoomedMineEngine: React.FC<BaseGameEngineProps> = ({
  matchState,
  currentUserPlayer,
  players,
  onGameAction,
  onActionNotification,
}) => {
  const state = matchState as DoomedMineMatchState;
  const userId = currentUserPlayer?.id || '';

  // Local ticker for smooth countdown
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, []);

  const [showRulesModal, setShowRulesModal] = useState(false);
  const feedScrollRef = React.useRef<HTMLDivElement>(null);

  // Sound effects on showdown (called unconditionally at top level)
  useEffect(() => {
    if (state?.phase === 'showdown' && state?.showdownResult) {
      if (state.showdownResult.success) {
        playSuccessSound();
        onActionNotification?.('¡Viga apuntalada! El orden de las fichas fue correcto.');
      } else {
        playCaveInSound();
        onActionNotification?.('¡Derrumbe en la mina! Las fichas no coincidieron.');
      }
    }
  }, [state?.phase, state?.expedition, state?.showdownResult, onActionNotification]);

  // Feed auto-scroll (called unconditionally at top level)
  useEffect(() => {
    if (feedScrollRef.current) {
      feedScrollRef.current.scrollTop = feedScrollRef.current.scrollHeight;
    }
  }, [state?.actionLog?.length]);

  // Active players list
  const activePlayers: Player[] = (players && players.length >= 2
    ? players
    : ((state?.players as unknown as Player[]) || [currentUserPlayer])) as Player[];

  if (!state || state.gameId !== 'doomed-mine') {
    return (
      <div className="cel-card doomed-mine-loading-box">
        <Pickaxe size={32} className="animate-tremble" />
        <h3 className="woodcut-title">CARGANDO LA MINA...</h3>
        <p>Preparando cartas y vigas de soporte.</p>
        <style>{`
          .doomed-mine-loading-box {
            text-align: center;
            padding: 50px 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 10px;
            color: var(--color-text-main);
          }
        `}</style>
      </div>
    );
  }

  const isShowdown = state.phase === 'showdown';
  const isGameOver = state.phase === 'game_over';

  // Round naming without poker jargon: Ronda 1, Ronda 2, Ronda 3, Ronda 4, Veredicto
  const getRoundLabel = () => {
    switch (state.phase) {
      case 'pre_flop':
        return 'RONDA 1';
      case 'flop':
        return 'RONDA 2';
      case 'turn':
        return 'RONDA 3';
      case 'river':
        return 'RONDA 4';
      case 'showdown':
        return 'VEREDICTO';
      case 'game_over':
        return 'FINAL';
      default:
        return 'RONDA';
    }
  };

  const myCards = state.privateCards?.[userId] || [];
  const myToken = state.tokens?.[userId] ?? null;

  const otherPlayers = activePlayers.filter((p) => p.id !== userId);
  const totalPlayers = activePlayers.length || state.players?.length || 2;
  const tokenRange = Array.from({ length: totalPlayers }, (_, i) => i + 1);

  const timeLeft = Math.max(0, Math.ceil(((state.deadline || 0) - now) / 1000));

  // Host identification
  const isHost = Boolean(
    currentUserPlayer?.isHost ||
      (state.hostId && state.hostId === userId) ||
      (!state.hostId && activePlayers[0]?.id === userId)
  );
  const hostPlayer = activePlayers.find(
    (p) => p.id === (state.hostId || (activePlayers.find((ap) => ap.isHost)?.id || activePlayers[0]?.id))
  );
  const hostName = hostPlayer ? (hostPlayer.id === userId ? 'Tú (Capataz)' : hostPlayer.name) : 'Capataz';

  const tokensHeldCount = (state.players || []).filter(
    (p) => state.tokens?.[p.id] !== null && state.tokens?.[p.id] !== undefined
  ).length;
  const allPlayersHaveTokens =
    (state.players || []).length > 0 && tokensHeldCount === (state.players || []).length;

  const getNextRoundLabel = () => {
    switch (state.phase) {
      case 'pre_flop':
        return 'RONDA 2';
      case 'flop':
        return 'RONDA 3';
      case 'turn':
        return 'RONDA 4';
      case 'river':
        return 'VEREDICTO';
      default:
        return 'SIGUIENTE RONDA';
    }
  };

  const getPlayerHistoryRounds = (playerId: string) => {
    const hist = state.tokenHistory?.[playerId] || {};
    const rounds = [
      { label: 'R1', token: hist.r1 ?? hist.preFlop ?? null },
      { label: 'R2', token: hist.r2 ?? hist.flop ?? null },
      { label: 'R3', token: hist.r3 ?? hist.turn ?? null },
      { label: 'R4', token: hist.r4 ?? hist.river ?? null },
    ];
    return rounds.filter((r) => r.token !== null && r.token !== undefined);
  };

  // Actions
  const handleAdvancePhase = () => {
    if (isShowdown || isGameOver || !allPlayersHaveTokens || !isHost) return;
    soundstage.playTap();
    onGameAction?.({ type: 'ADVANCE_PHASE' });
  };

  const handleSelectToken = (token: number) => {
    if (isShowdown || isGameOver) return;
    if (myToken !== null) {
      if (myToken === token) {
        onActionNotification?.(`Ya tienes la Ficha ${myToken}. No puedes soltarla.`);
        soundstage.playTileBacktrack();
        return;
      }
      onActionNotification?.(
        `Ya tienes la Ficha ${myToken}. Solo puedes librarte de ella si otro minero te la quita.`
      );
      soundstage.playTileBacktrack();
      return;
    }
    playTokenSelectSound(token);
    onGameAction?.({ type: 'SELECT_TOKEN', token });
  };

  const handleMinerClick = (minerPlayer: Player) => {
    if (isShowdown || isGameOver) return;
    const playerToken = state.tokens?.[minerPlayer.id];
    if (playerToken === null || playerToken === undefined) {
      onActionNotification?.(`${minerPlayer.name} no tiene ninguna ficha.`);
      return;
    }

    if (myToken !== null) {
      onActionNotification?.(
        `Ya tienes la Ficha ${myToken}. Solo puedes librarte de ella si otro minero te la quita.`
      );
      soundstage.playTileBacktrack();
      return;
    }

    handleSelectToken(playerToken);
  };

  const handleNextExpedition = () => {
    soundstage.playTap();
    onGameAction?.({ type: 'NEXT_EXPEDITION' });
  };

  return (
    <div className="doomed-mine-compact-container">
      {/* ========================================================= */}
      {/* 1. ESTADO GLOBAL DE LA PARTIDA (MINIMALISTA, SOLO ICONOS) */}
      {/* ========================================================= */}
      <header className="cel-card mine-compact-header">
        {/* Vigas Aseguradas (3 slots, solo iconos de faroles/trofeos) */}
        <div className="header-icon-group" title="Vigas aseguradas (3 para escapar)">
          {[1, 2, 3].map((num) => {
            const secured = state.successes >= num;
            return (
              <div
                key={`beam-slot-${num}`}
                className={`compact-meter-slot beam-meter-slot ${secured ? 'meter-active-gold' : ''}`}
                title={secured ? `Viga ${num} asegurada` : `Viga ${num} pendiente`}
              >
                <Trophy size={14} className={secured ? 'icon-lit-gold' : 'icon-dim'} />
                <span className="meter-num">{num}</span>
              </div>
            );
          })}
        </div>

        {/* Derrumbes Sufridos (3 slots, solo iconos de peligro/derrumbes) */}
        <div className="header-icon-group" title="Derrumbes (3 = colapso)">
          {[1, 2, 3].map((num) => {
            const collapsed = state.failures >= num;
            return (
              <div
                key={`cavein-slot-${num}`}
                className={`compact-meter-slot cavein-meter-slot ${collapsed ? 'meter-active-red' : ''}`}
                title={collapsed ? `Derrumbe ${num} sufrido` : `Sin derrumbe`}
              >
                <AlertTriangle size={14} className={collapsed ? 'icon-lit-red' : 'icon-dim'} />
                <span className="meter-num">{num}</span>
              </div>
            );
          })}
        </div>

        {/* Ronda Actual (Ronda 1, 2, 3, 4) */}
        <div className="compact-round-badge">
          <span className="round-badge-text">{getRoundLabel()}</span>
        </div>

        {/* Temporizador */}
        <div
          className={`compact-timer-badge ${
            timeLeft <= 10 && !isShowdown && !isGameOver ? 'timer-urgent-pulse animate-tremble' : ''
          }`}
          title="Tiempo restante"
        >
          <Clock size={13} strokeWidth={2.6} />
          <span>{timeLeft}s</span>
        </div>

        {/* Botón de Reglas */}
        <button
          type="button"
          onClick={() => {
            soundstage.playTap();
            setShowRulesModal(true);
          }}
          className="btn-cel btn-brawl-neutral btn-sm compact-rules-btn"
          title="Ver reglas"
        >
          <BookOpen size={13} />
          <span>REGLAS</span>
        </button>
      </header>

      {/* ========================================================= */}
      {/* 1.5 CONTROL DE AVANCE DE RONDA (CONTROLADO POR EL CAPATAZ) */}
      {/* ========================================================= */}
      {!isShowdown && !isGameOver && (
        <div
          className={`mine-host-advance-bar cel-card ${
            allPlayersHaveTokens ? 'bar-ready-to-advance' : 'bar-waiting-tokens'
          }`}
        >
          {isHost ? (
            allPlayersHaveTokens ? (
              <button
                type="button"
                onClick={handleAdvancePhase}
                className="btn-cel btn-advance-gold"
                title={`Avanzar a ${getNextRoundLabel()}`}
              >
                <Pickaxe size={15} className="animate-tremble" />
                <span className="advance-btn-text">AVANZAR A {getNextRoundLabel()}</span>
                <ChevronRight size={15} />
              </button>
            ) : (
              <div className="advance-status-row waiting-host">
                <Clock size={14} />
                <span>
                  Esperando que todos los mineros tengan ficha ({tokensHeldCount}/{totalPlayers}) para avanzar a {getNextRoundLabel()}
                </span>
              </div>
            )
          ) : (
            <div className="advance-status-row">
              {allPlayersHaveTokens ? (
                <>
                  <CheckCircle2 size={14} className="icon-lit-gold" />
                  <span>
                    ¡Todos los mineros tienen ficha! Esperando a que el Capataz ({hostName}) avance a {getNextRoundLabel()}...
                  </span>
                </>
              ) : (
                <>
                  <Clock size={14} />
                  <span>
                    Esperando a que todos los mineros tengan ficha ({tokensHeldCount}/{totalPlayers})...
                  </span>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. LA MESA CENTRAL (DIRECTAMENTE SOBRE EL TAPETE VERDE)  */}
      {/* ========================================================= */}
      <section className="mine-felt-arena">
        {/* The 5 Community Cards of Texas Hold'em directly on green felt */}
        <div className="community-cards-felt-row">
          {[0, 1, 2, 3, 4].map((idx) => {
            const card = state.communityCards[idx];
            const isRevealed = Boolean(card);
            let slotTag = '';
            if (idx < 3) slotTag = 'R2';
            else if (idx === 3) slotTag = 'R3';
            else if (idx === 4) slotTag = 'R4';

            return (
              <div key={`felt-comm-card-${idx}`} className="felt-card-slot">
                {isRevealed ? (
                  <PokerCardView card={card} size="md" />
                ) : (
                  <div className="felt-card-placeholder" title={`Carta comunitaria de ${slotTag}`}>
                    <span className="placeholder-subtle-tag">{slotTag}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Showdown Result Overlay on the Felt */}
        {isShowdown && state.showdownResult && (
          <div
            className={`felt-showdown-modal cel-card ${
              state.showdownResult.success ? 'showdown-box-success' : 'showdown-box-failure'
            }`}
          >
            <div className="showdown-modal-header">
              {state.showdownResult.success ? (
                <Trophy size={20} className="icon-lit-gold" />
              ) : (
                <AlertTriangle size={20} className="icon-lit-red" />
              )}
              <strong className="woodcut-title showdown-modal-title">
                {state.showdownResult.success ? '¡VIGA APUNTALADA!' : '¡DERRUMBE EN LA MINA!'}
              </strong>
            </div>

            <p className="showdown-modal-msg">{state.showdownResult.message}</p>

            {/* Violations details */}
            {state.showdownResult.violations && state.showdownResult.violations.length > 0 && (
              <div className="showdown-violations-list">
                {state.showdownResult.violations.map((v, vIdx) => (
                  <div key={`v-${vIdx}`} className="violation-line">
                    <span>⚡ {v.message}</span>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={handleNextExpedition}
              className="btn-cel btn-brawl-primary btn-sm showdown-advance-btn"
            >
              <span>{state.pendingGameOver ? 'VER PODIO FINAL' : 'SIGUIENTE EXPEDICIÓN'}</span>
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </section>

      {/* ========================================================= */}
      {/* 3. EN PARALELO: TUS CARTAS (1/3) Y EL RESTO DE MINEROS (2/3)*/}
      {/* ========================================================= */}
      <section className="doomed-mine-split-arena">
        {/* LADO A: TUS CARTAS Y FICHAS DISPONIBLES (~1/3 ESPACIO) */}
        <div className="cel-card split-panel my-hand-panel">
          <div className="split-panel-header">
            <span className="woodcut-title panel-mini-title">TUS CARTAS</span>
          </div>

          <div className="my-hand-content">
            {/* Pocket Cards Together */}
            <div className="my-pocket-cards-fan">
              {myCards.length === 0 ? (
                <span className="empty-cards-note">Repartiendo cartas...</span>
              ) : (
                myCards.map((card, idx) => (
                  <div key={`my-hole-card-${card.id || idx}`} className="pocket-card-holder">
                    <PokerCardView card={card} size="lg" />
                  </div>
                ))
              )}
            </div>

            {/* Historial de fichas en rondas previas a simple vista */}
            <div className="my-history-strip">
              <span className="history-strip-label">FICHAS PREVIAS:</span>
              {getPlayerHistoryRounds(userId).length === 0 ? (
                <span className="history-empty-tag">Sin rondas previas</span>
              ) : (
                <div className="history-pills-row">
                  {getPlayerHistoryRounds(userId).map((item) => (
                    <span key={item.label} className="token-history-badge" title={`${item.label}: Ficha ${item.token}`}>
                      <span className="badge-round">{item.label}:</span>
                      <span className="badge-token">★{item.token}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Available Pressure Tokens (1..N) */}
            {!isShowdown && !isGameOver && (
              <div className="my-tokens-claim-box">
                <div className="claim-box-header">
                  <span className="claim-title">
                    {myToken === null
                      ? `ELIGE TU FICHA (1=MÍN, ${totalPlayers}=MÁX):`
                      : `TU FICHA ACTUAL: FICHA ${myToken} (¡LISTO!)`}
                  </span>
                </div>

                <div className="compact-tokens-strip">
                  {tokenRange.map((t) => {
                    const holderId = Object.keys(state.tokens || {}).find(
                      (id) => state.tokens[id] === t
                    );
                    const holderPlayer = activePlayers.find((p) => p.id === holderId);
                    const isSelectedByMe = myToken === t;
                    const isHolderReady = holderId ? state.ready?.[holderId] : false;

                    return (
                      <PressureTokenChip
                        key={`chip-select-${t}`}
                        token={t}
                        totalTokens={totalPlayers}
                        size="md"
                        selected={isSelectedByMe}
                        confirmed={isHolderReady}
                        disabled={myToken !== null && !isSelectedByMe}
                        holderName={
                          holderPlayer
                            ? holderPlayer.id === userId
                              ? 'TÚ'
                              : holderPlayer.name
                            : undefined
                        }
                        onClick={() => handleSelectToken(t)}
                      />
                    );
                  })}
                </div>

                {/* Instant Ready State (no reconfirm / no voluntary drop) */}
                <div className="my-status-action-area">
                  {myToken === null ? (
                    <span className="choose-token-hint">
                      ⛏ Elige una ficha libre o pincha en un minero para quitársela
                    </span>
                  ) : (
                    <div className="confirmed-ready-state">
                      <span className="ready-indicator-text">
                        <CheckCircle2 size={14} /> ¡LISTO CON FICHA {myToken}!
                      </span>
                      <span className="ready-sub-hint">
                        No se puede soltar; solo te libras si te la roban
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* LADO B: EL RESTO DE LOS MINEROS (~2/3 ESPACIO) */}
        <div className="cel-card split-panel team-miners-panel">
          <div className="split-panel-header">
            <span className="woodcut-title panel-mini-title">MINEROS</span>
            <span className="miners-count-pill">{otherPlayers.length} COMPAÑEROS</span>
          </div>

          <div className="miners-roster-grid">
            {otherPlayers.map((player) => {
              const playerToken = state.tokens?.[player.id];
              const isReady = state.ready?.[player.id];
              const evaluation = state.showdownResult?.evaluations?.[player.id];
              const revealedCards = state.privateCards?.[player.id] || [];
              const hasToken = playerToken !== null && playerToken !== undefined;
              const canSteal = !isShowdown && !isGameOver && myToken === null && hasToken;
              const pastRounds = getPlayerHistoryRounds(player.id);

              return (
                <div
                  key={player.id}
                  onClick={() => canSteal && handleMinerClick(player)}
                  className={`miner-roster-chip cel-card ${isReady ? 'miner-ready' : ''} ${
                    canSteal ? 'miner-clickable-steal' : ''
                  }`}
                  title={
                    canSteal
                      ? `Pincha para quitarle la Ficha ${playerToken} a ${player.name}`
                      : hasToken
                      ? `Ficha ${playerToken} en poder de ${player.name}`
                      : `${player.name} todavía no tiene ficha`
                  }
                >
                  <div className="miner-main-row">
                    <div className="miner-avatar-box">
                      <AvatarIcon id={player.avatarId} size={28} />
                      {player.isHost && (
                        <div className="miner-crown" title="Capataz">
                          <Crown size={8} strokeWidth={3} />
                        </div>
                      )}
                    </div>

                    <div className="miner-info-col">
                      <div className="miner-name-line">
                        <strong className="miner-name">{player.name}</strong>
                        {player.isBot && <span className="bot-tag">BOT</span>}
                      </div>

                      <div className="miner-status-line">
                        {isReady ? (
                          <span className="miner-ready-text">✓ LISTO</span>
                        ) : (
                          <span className="miner-thinking-text">⏳ PENSANDO...</span>
                        )}
                      </div>

                      {canSteal && (
                        <span className="miner-steal-tip">⛏ Pincha para robar</span>
                      )}
                    </div>

                    {/* Held Token */}
                    <div className="miner-token-dock">
                      {hasToken ? (
                        <PressureTokenChip
                          token={playerToken}
                          totalTokens={totalPlayers}
                          size="sm"
                          confirmed={isReady}
                        />
                      ) : (
                        <div className="token-empty-circle">?</div>
                      )}
                    </div>
                  </div>

                  {/* Fichas previas de este minero a simple vista */}
                  <div className="miner-history-row">
                    <span className="miner-hist-title">Previas:</span>
                    {pastRounds.length === 0 ? (
                      <span className="miner-hist-empty">—</span>
                    ) : (
                      <div className="miner-hist-pills">
                        {pastRounds.map((item) => (
                          <span
                            key={item.label}
                            className="miner-past-badge"
                            title={`${player.name} en ${item.label}: Ficha ${item.token}`}
                          >
                            <span className="past-round">{item.label}:</span>
                            <span className="past-num">★{item.token}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* ONLY in Showdown: Reveal other players' cards */}
                  {isShowdown && (
                    <div className="miner-showdown-reveal">
                      <div className="miner-cards-row">
                        {revealedCards.map((card, cIdx) => (
                          <PokerCardView key={`${player.id}-rev-${cIdx}`} card={card} size="sm" />
                        ))}
                      </div>
                      {evaluation && (
                        <span className="miner-eval-text">{evaluation.handName}</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 4. HISTORIAL DE DISPUTA Y ROTACIÓN DE FICHAS (ABAJO)      */}
      {/* ========================================================= */}
      <footer className="cel-card-deep dispute-feed-card">
        <div className="feed-header-line">
          <Zap size={13} className="gold-icon" />
          <strong className="feed-title-text">HISTORIAL DE DISPUTA Y ROTACIÓN DE FICHAS:</strong>
          <span className="feed-badge-count">{(state.actionLog || []).length}</span>
        </div>

        <div className="feed-scroll-list" ref={feedScrollRef}>
          {!state.actionLog || state.actionLog.length === 0 ? (
            <span className="feed-row-empty">Sin movimientos registrados aún...</span>
          ) : (
            state.actionLog.map((entry) => (
              <div key={entry.id} className="feed-row-item">
                <span className="feed-item-bullet">•</span>
                <span className="feed-item-text">{entry.text}</span>
              </div>
            ))
          )}
        </div>
      </footer>

      {/* ========================================================= */}
      {/* MODAL DE REGLAS                                           */}
      {/* ========================================================= */}
      {showRulesModal && (
        <div className="modal-overlay" onClick={() => setShowRulesModal(false)}>
          <div className="modal-content rules-modal-window" onClick={(e) => e.stopPropagation()}>
            <div className="rules-modal-header">
              <div className="header-title-row">
                <Pickaxe size={22} className="gold-icon" />
                <h3 className="woodcut-title">LA MINA MALDITA — MANUAL DE REGLAS</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRulesModal(false)}
                className="btn-cel btn-brawl-neutral btn-icon-sq"
                title="Cerrar"
              >
                <X size={16} />
              </button>
            </div>
            <div className="rules-modal-body">
              <DoomedMineRules />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* CSS ESPECÍFICO (COMPACTO Y SIN SCROLL)                    */}
      {/* ========================================================= */}
      <style>{`
        .doomed-mine-compact-container {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 8px;
          user-select: none;
        }

        /* 1. COMPACT TOP HEADER */
        .mine-compact-header {
          padding: 6px 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background-color: var(--color-glove-ivory);
          border: var(--border-ink-standard);
          border-radius: var(--radius-cel-box);
          box-shadow: var(--shadow-cel-sm);
          gap: 10px;
          flex-wrap: wrap;
        }
        .header-icon-group {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .compact-meter-slot {
          display: flex;
          align-items: center;
          gap: 3px;
          padding: 3px 6px;
          border-radius: 6px;
          border: 1.5px solid var(--color-ink-stroke);
          background-color: var(--color-parchment-deep);
          font-family: var(--font-mono);
          font-size: 11px;
          font-weight: bold;
          line-height: 1;
        }
        .meter-active-gold {
          background-color: var(--color-golden-buttercup);
          box-shadow: var(--shadow-cel-sm);
        }
        .meter-active-red {
          background-color: var(--color-cuphead-red);
          color: #ffffff;
          box-shadow: var(--shadow-cel-sm);
        }
        .icon-lit-gold { color: #854d0e; }
        .icon-lit-red { color: #ffffff; }
        .icon-dim { color: var(--color-text-muted); opacity: 0.35; }
        .meter-num { font-size: 11px; }

        .compact-round-badge {
          background-color: var(--color-golden-buttercup);
          border: 1.5px solid var(--color-ink-stroke);
          border-radius: 999px;
          padding: 2px 10px;
          font-family: var(--font-accent);
          font-size: 11px;
          font-weight: bold;
          color: #1c1511;
          box-shadow: var(--shadow-cel-sm);
        }
        .compact-timer-badge {
          display: flex;
          align-items: center;
          gap: 4px;
          background-color: var(--color-parchment-deep);
          border: var(--border-ink-thin);
          border-radius: 6px;
          padding: 3px 8px;
          font-family: var(--font-mono);
          font-size: 12px;
          font-weight: 700;
          color: var(--color-text-main);
        }
        .timer-urgent-pulse {
          background-color: var(--color-cuphead-red);
          color: #ffffff;
          border-color: #1c1511;
        }
        .compact-rules-btn {
          font-size: 11px;
          padding: 4px 10px;
        }

        /* 1.5 CONTROL DE AVANCE DE RONDA (CAPATAZ) */
        .mine-host-advance-bar {
          padding: 8px 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius-cel-box);
          border: var(--border-ink-standard);
          background-color: var(--color-glove-ivory);
          box-shadow: var(--shadow-cel-sm);
        }
        .mine-host-advance-bar.bar-ready-to-advance {
          background-color: #fef9c3;
          border-color: #854d0e;
        }
        .btn-advance-gold {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background-color: var(--color-golden-buttercup);
          color: #1c1511;
          font-family: var(--font-heading);
          font-size: 13px;
          font-weight: 900;
          letter-spacing: 0.04em;
          padding: 6px 18px;
          border-radius: 6px;
          border: 2px solid #1c1511;
          box-shadow: 2px 3px 0px #1c1511;
          cursor: pointer;
          transition: transform 0.1s ease, box-shadow 0.1s ease;
        }
        .btn-advance-gold:hover {
          transform: translateY(-2px);
          box-shadow: 3px 5px 0px #1c1511;
        }
        .btn-advance-gold:active {
          transform: translateY(1px);
          box-shadow: 1px 1px 0px #1c1511;
        }
        .advance-status-row {
          display: flex;
          align-items: center;
          gap: 6px;
          font-family: var(--font-body);
          font-size: 11.5px;
          font-weight: 700;
          color: var(--color-text-main);
          text-align: center;
        }
        .advance-status-row.waiting-host {
          color: var(--color-status-warn-text);
        }

        /* 2. THE FELT POKER TABLE (DIRECTLY ON GREEN FELT, NO BROWN FRAME) */
        .mine-felt-arena {
          background: radial-gradient(circle at center, #1b4d32 0%, #0d281a 100%);
          border: 4px solid #2b1e17;
          border-radius: 14px;
          box-shadow: inset 0 0 35px rgba(0, 0, 0, 0.7), var(--shadow-cel-sm);
          min-height: 140px;
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 14px 16px;
          gap: 8px;
        }
        .community-cards-felt-row {
          display: flex;
          gap: 12px;
          justify-content: center;
          flex-wrap: wrap;
          z-index: 2;
        }
        .felt-card-slot {
          position: relative;
        }
        /* Card placeholder on felt: subtle integrated card outline with fine white dashed border */
        .felt-card-placeholder {
          width: 72px;
          height: 104px;
          border-radius: 8px;
          border: 1px dashed rgba(255, 255, 255, 0.35);
          background: rgba(255, 255, 255, 0.02);
          box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          box-sizing: border-box;
          transition: border-color 0.2s ease;
        }
        .placeholder-subtle-tag {
          font-family: var(--font-mono);
          font-size: 11px;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.35);
          letter-spacing: 0.06em;
          user-select: none;
        }

        /* Showdown Modal Overlay on Felt */
        .felt-showdown-modal {
          z-index: 10;
          position: absolute;
          inset: 8px;
          background-color: var(--color-glove-ivory);
          border: var(--border-ink-thick);
          border-radius: 12px;
          box-shadow: var(--shadow-cel-md);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 12px 18px;
          text-align: center;
          gap: 6px;
        }
        .showdown-box-success { border-color: #ca8a04; }
        .showdown-box-failure { border-color: var(--color-cuphead-red); }
        .showdown-modal-header {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .showdown-modal-title {
          font-size: 16px;
          color: var(--color-text-main);
        }
        .showdown-modal-msg {
          font-family: var(--font-body);
          font-size: 12px;
          color: var(--color-text-lead);
          margin: 0;
        }
        .showdown-violations-list {
          background-color: var(--color-parchment-deep);
          border: var(--border-ink-thin);
          border-radius: 6px;
          padding: 4px 8px;
          width: 100%;
          max-width: 480px;
          font-family: var(--font-body);
          font-size: 11px;
          font-weight: bold;
          color: var(--color-cuphead-red);
          text-align: left;
        }
        .showdown-advance-btn {
          margin-top: 4px;
        }

        /* 3. PARALLEL SPLIT ARENA: 1/3 (TUS CARTAS) VS 2/3 (MINEROS) */
        .doomed-mine-split-arena {
          display: grid;
          grid-template-columns: 1fr 2fr;
          gap: 10px;
          align-items: stretch;
        }
        @media (max-width: 780px) {
          .doomed-mine-split-arena {
            grid-template-columns: 1fr;
          }
        }

        .split-panel {
          padding: 10px 12px;
          background-color: var(--color-glove-ivory);
          border: var(--border-ink-standard);
          border-radius: var(--radius-cel-box);
          box-shadow: var(--shadow-cel-sm);
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .split-panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1.5px solid var(--color-ink-stroke);
          padding-bottom: 4px;
        }
        .panel-mini-title {
          font-size: 13px;
          letter-spacing: 0.03em;
          color: var(--color-text-main);
        }

        /* LADO A: TUS CARTAS Y FICHAS */
        .my-hand-panel {
          min-width: 0;
        }
        .my-hand-content {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .my-pocket-cards-fan {
          display: flex;
          justify-content: center;
          gap: 8px;
        }
        .pocket-card-holder {
          transition: transform 0.12s ease;
        }
        .pocket-card-holder:hover {
          transform: translateY(-4px) scale(1.03);
        }
        .empty-cards-note {
          font-family: var(--font-body);
          font-size: 12px;
          color: var(--color-text-muted);
        }

        .my-tokens-claim-box {
          display: flex;
          flex-direction: column;
          gap: 6px;
          background-color: var(--color-canvas-parchment);
          border: var(--border-ink-thin);
          border-radius: 8px;
          padding: 8px;
        }
        .claim-box-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .claim-title {
          font-family: var(--font-accent);
          font-size: 9.5px;
          color: var(--color-text-lead);
          letter-spacing: 0.04em;
        }
        /* HISTORIAL DE FICHAS PROPIAS EN RONDAS PREVIAS */
        .my-history-strip {
          display: flex;
          align-items: center;
          gap: 6px;
          background-color: var(--color-parchment-deep);
          border: 1px solid var(--color-ink-stroke);
          border-radius: 6px;
          padding: 4px 8px;
          flex-wrap: wrap;
        }
        .history-strip-label {
          font-family: var(--font-accent);
          font-size: 8.5px;
          color: var(--color-text-muted);
          letter-spacing: 0.04em;
        }
        .history-empty-tag {
          font-family: var(--font-body);
          font-size: 10px;
          color: var(--color-text-muted);
          font-style: italic;
        }
        .history-pills-row {
          display: flex;
          gap: 5px;
          align-items: center;
          flex-wrap: wrap;
        }
        .token-history-badge {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          background-color: var(--color-canvas-parchment);
          border: 1px solid var(--color-ink-stroke);
          border-radius: 4px;
          padding: 1px 6px;
          font-family: var(--font-mono);
          font-size: 10.5px;
          font-weight: bold;
        }
        .badge-round {
          color: var(--color-text-muted);
          font-size: 9px;
        }
        .badge-token {
          color: #854d0e;
          font-weight: 900;
        }

        .compact-tokens-strip {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: center;
        }
        .my-status-action-area {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          margin-top: 4px;
        }
        .choose-token-hint {
          font-family: var(--font-body);
          font-size: 11px;
          color: var(--color-status-warn-text);
          font-weight: 700;
          text-align: center;
        }
        .confirmed-ready-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 100%;
          gap: 2px;
        }
        .ready-indicator-text {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-family: var(--font-heading);
          font-size: 12px;
          color: var(--color-status-success-text);
        }
        .ready-sub-hint {
          font-family: var(--font-body);
          font-size: 9.5px;
          color: var(--color-text-muted);
          font-style: italic;
        }

        /* LADO B: EL RESTO DE LOS MINEROS */
        .team-miners-panel {
          min-width: 0;
        }
        .miners-count-pill {
          font-family: var(--font-accent);
          font-size: 8.5px;
          background-color: var(--color-parchment-deep);
          color: var(--color-text-muted);
          padding: 1px 6px;
          border-radius: 999px;
          border: 1px solid var(--color-ink-stroke);
        }
        .miners-roster-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
          gap: 6px;
        }
        .miner-roster-chip {
          padding: 6px 8px;
          background-color: var(--color-canvas-parchment);
          border: 1.5px solid var(--color-ink-stroke);
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .miner-roster-chip.miner-ready {
          border-color: #10b981;
          background-color: var(--color-status-success-bg);
        }
        /* Clickable miner card for stealing tokens */
        .miner-clickable-steal {
          cursor: pointer;
          transition: transform 0.12s ease, border-color 0.12s ease, box-shadow 0.12s ease;
        }
        .miner-clickable-steal:hover {
          transform: translateY(-2px);
          border-color: var(--color-cuphead-red);
          box-shadow: 2px 3px 0px #1c1511;
        }
        .miner-main-row {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .miner-avatar-box {
          position: relative;
          width: 28px;
          height: 28px;
          background-color: var(--color-golden-buttercup);
          border: 1.5px solid var(--color-ink-stroke);
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .miner-crown {
          position: absolute;
          top: -2px;
          right: -2px;
          background-color: var(--color-golden-buttercup);
          color: #1c1511;
          border: 1px solid #1c1511;
          border-radius: 999px;
          width: 12px;
          height: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .miner-info-col {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
        }
        .miner-name-line {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .miner-name {
          font-family: var(--font-heading);
          font-size: 12px;
          color: var(--color-text-main);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .bot-tag {
          font-family: var(--font-accent);
          font-size: 7.5px;
          background-color: var(--color-parchment-deep);
          color: var(--color-text-muted);
          padding: 0 3px;
          border-radius: 2px;
          border: 1px solid var(--color-ink-stroke);
        }
        .miner-status-line {
          font-family: var(--font-body);
          font-size: 9.5px;
          font-weight: 700;
        }
        .miner-ready-text { color: var(--color-status-success-text); }
        .miner-thinking-text { color: var(--color-status-warn-text); }
        .miner-steal-tip {
          font-family: var(--font-accent);
          font-size: 8px;
          color: var(--color-cuphead-red);
          font-weight: bold;
          letter-spacing: 0.02em;
          margin-top: 1px;
        }
        .miner-token-dock {
          flex-shrink: 0;
        }
        .token-empty-circle {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 1.5px dashed var(--color-ink-stroke);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-heading);
          font-size: 11px;
          color: var(--color-text-muted);
        }

        /* Historial de fichas de compañeros a simple vista */
        .miner-history-row {
          display: flex;
          align-items: center;
          gap: 4px;
          margin-top: 2px;
          padding-top: 3px;
          border-top: 1px dashed var(--color-ink-stroke);
          flex-wrap: wrap;
        }
        .miner-hist-title {
          font-family: var(--font-accent);
          font-size: 8px;
          color: var(--color-text-muted);
          letter-spacing: 0.03em;
        }
        .miner-hist-empty {
          font-family: var(--font-body);
          font-size: 9px;
          color: var(--color-text-muted);
        }
        .miner-hist-pills {
          display: flex;
          align-items: center;
          gap: 3px;
          flex-wrap: wrap;
        }
        .miner-past-badge {
          display: inline-flex;
          align-items: center;
          gap: 2px;
          background-color: var(--color-parchment-deep);
          border: 1px solid var(--color-ink-stroke);
          border-radius: 3px;
          padding: 0 4px;
          font-family: var(--font-mono);
          font-size: 9px;
          font-weight: bold;
        }
        .past-round {
          color: var(--color-text-muted);
          font-size: 8px;
        }
        .past-num {
          color: #854d0e;
          font-weight: 800;
        }

        /* Showdown Reveal for Opponents */
        .miner-showdown-reveal {
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding-top: 4px;
          border-top: 1px dashed var(--color-ink-stroke);
        }
        .miner-cards-row {
          display: flex;
          gap: 4px;
          justify-content: center;
        }
        .miner-eval-text {
          font-family: var(--font-body);
          font-size: 9px;
          font-weight: 800;
          color: var(--color-cuphead-red);
          text-align: center;
        }

        /* 4. DISPUTE / ROTATION COMPACT FEED (SCROLLABLE DOWNWARD) */
        .dispute-feed-card {
          padding: 6px 12px;
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          background-color: var(--color-parchment-deep);
          border: var(--border-ink-thin);
        }
        .feed-header-line {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .feed-title-text {
          font-family: var(--font-accent);
          font-size: 10px;
          letter-spacing: 0.04em;
          color: var(--color-text-main);
        }
        .feed-badge-count {
          font-family: var(--font-mono);
          font-size: 9px;
          padding: 0 5px;
          border-radius: 999px;
          background-color: var(--color-glove-ivory);
          border: 1px solid var(--color-ink-stroke);
          color: var(--color-text-muted);
          font-weight: 700;
        }
        .feed-scroll-list {
          max-height: 72px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 3px;
          padding-right: 4px;
        }
        .feed-row-item {
          display: flex;
          align-items: baseline;
          gap: 6px;
          background-color: var(--color-canvas-parchment);
          border: 1px solid rgba(28, 21, 17, 0.16);
          border-radius: 4px;
          padding: 2px 6px;
          font-family: var(--font-body);
          font-size: 11px;
          color: var(--color-text-main);
          line-height: 1.3;
        }
        .feed-item-bullet {
          color: var(--color-cuphead-red);
          font-weight: 900;
          font-size: 11px;
        }
        .feed-item-text {
          flex: 1;
        }
        .feed-row-empty {
          font-family: var(--font-body);
          font-size: 10.5px;
          color: var(--color-text-muted);
          font-style: italic;
          padding: 2px 4px;
        }

        /* ========================================================= */
        /* POKER CARD & BRASS TOKEN SPECIFIC CSS                     */
        /* ========================================================= */
        .poker-card-view {
          background-color: #fdfbf5;
          border: 2.5px solid #2b1e17;
          border-radius: 8px;
          box-shadow: 2.5px 2.5px 0px #1c1511;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          position: relative;
          user-select: none;
          overflow: hidden;
          box-sizing: border-box;
          flex-shrink: 0;
        }
        .poker-card-view.size-sm {
          width: 48px;
          height: 70px;
          padding: 2px;
        }
        .poker-card-view.size-md {
          width: 72px;
          height: 104px;
          padding: 4px;
        }
        .poker-card-view.size-lg {
          width: 82px;
          height: 118px;
          padding: 5px;
        }
        .poker-card-view.is-clickable:hover {
          transform: translateY(-4px);
          cursor: pointer;
        }

        /* Face Down */
        .card-face-down {
          background-color: #b72722;
          border-color: #2b1e17;
        }
        .card-back-pattern {
          width: 100%;
          height: 100%;
          background: repeating-linear-gradient(
            45deg,
            #8c1d18,
            #8c1d18 3px,
            #a82620 3px,
            #a82620 6px
          );
          border: 1.5px solid #ffd043;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .card-back-center-badge {
          background-color: #1c1511;
          border: 1px solid #ffd043;
          border-radius: 50%;
          width: 22px;
          height: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .back-pickaxe-icon {
          color: #ffd043;
          font-size: 11px;
        }

        /* Face Up */
        .corner-index {
          display: flex;
          flex-direction: column;
          align-items: center;
          line-height: 1;
        }
        .corner-top { align-self: flex-start; }
        .corner-bottom {
          align-self: flex-end;
          transform: rotate(180deg);
        }
        .rank-text {
          font-family: 'Calistoga', serif, sans-serif;
          font-weight: 900;
          line-height: 1;
        }
        .size-sm .rank-text { font-size: 11px; }
        .size-md .rank-text { font-size: 14px; }
        .size-lg .rank-text { font-size: 17px; }

        .card-center-stage {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          pointer-events: none;
        }
        .number-card-suit-badge {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .card-label-tag {
          position: absolute;
          bottom: 2px;
          background-color: #ffd043;
          color: #1c1511;
          border: 1px solid #1c1511;
          border-radius: 3px;
          font-family: var(--font-mono);
          font-size: 7px;
          font-weight: 700;
          padding: 0 3px;
        }

        /* BRASS PRESSURE TOKENS */
        .brass-token-chip {
          background: linear-gradient(135deg, #ffd043 0%, #e5a720 100%);
          border: 2px solid #1c1511;
          border-radius: 50%;
          box-shadow: 2px 2px 0px #1c1511;
          cursor: pointer;
          user-select: none;
          transition: transform 0.08s ease, box-shadow 0.08s ease;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          position: relative;
          padding: 0;
        }
        .brass-token-chip.chip-sm {
          width: 28px;
          height: 28px;
        }
        .brass-token-chip.chip-md {
          width: 44px;
          height: 44px;
        }
        .brass-token-chip.chip-lg {
          width: 56px;
          height: 56px;
        }
        .brass-token-chip:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 2px 4px 0px #1c1511;
        }
        .brass-token-chip:active:not(:disabled) {
          transform: translate(1px, 1px);
          box-shadow: 1px 1px 0px #1c1511;
        }
        .brass-token-chip:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .chip-outer-rim {
          width: 86%;
          height: 86%;
          border: 1px dashed #1c1511;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .chip-inner-face {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          line-height: 1;
        }
        .chip-number {
          font-family: 'Calistoga', serif, sans-serif;
          font-weight: 900;
          color: #1c1511;
          line-height: 1;
        }
        .chip-sm .chip-number { font-size: 13px; }
        .chip-md .chip-number { font-size: 17px; }
        .chip-lg .chip-number { font-size: 22px; }
        .chip-stars-row {
          font-size: 7px;
          color: #78350f;
          letter-spacing: 0.5px;
          line-height: 1;
          margin-top: 1px;
        }
        .chip-holder-tag {
          position: absolute;
          bottom: -6px;
          background-color: #1c1511;
          color: #ffd043;
          border: 1px solid #1c1511;
          border-radius: 999px;
          font-family: var(--font-heading);
          font-size: 7.5px;
          padding: 0 4px;
          white-space: nowrap;
          max-width: 50px;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .chip-selected {
          border-color: var(--color-cuphead-red);
          box-shadow: 0 0 0 2.5px var(--color-cuphead-red), 2px 2px 0px #1c1511;
        }
        .chip-confirmed {
          border-color: #10b981;
          box-shadow: 0 0 0 2.5px #10b981, 2px 2px 0px #1c1511;
        }

        /* MODAL */
        .rules-modal-window {
          max-width: 680px;
          padding: 16px;
        }
        .rules-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 2px solid var(--color-ink-stroke);
          padding-bottom: 8px;
          margin-bottom: 12px;
        }
        .header-title-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .header-title-row h3 {
          font-size: 16px;
          color: var(--color-text-main);
        }
      `}</style>
    </div>
  );
};
