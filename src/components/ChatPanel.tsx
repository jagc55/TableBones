import React, { useState, useRef, useEffect } from 'react';
import { Send, Volume2, VolumeX, MessageSquare } from 'lucide-react';
import { ChatMessage } from '../types';
import { AvatarIcon } from '../utils/avatars';
import { soundstage } from '../utils/audio';

interface ChatPanelProps {
  messages: ChatMessage[];
  currentUserId: string;
  mutedPlayerIds: string[];
  onSendMessage: (text: string) => void;
  onToggleMutePlayer: (playerId: string, playerName: string) => void;
  title?: string;
  className?: string;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  currentUserId,
  mutedPlayerIds,
  onSendMessage,
  onToggleMutePlayer,
  title = 'GAME CHAT',
  className = '',
}) => {
  const [inputText, setInputText] = useState('');
  const [revealedMutedMessageIds, setRevealedMutedMessageIds] = useState<Record<string, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed) return;
    soundstage.playTap();
    onSendMessage(trimmed);
    setInputText('');
  };

  const toggleRevealMuted = (msgId: string) => {
    soundstage.playTap();
    setRevealedMutedMessageIds((prev) => ({
      ...prev,
      [msgId]: !prev[msgId],
    }));
  };

  return (
    <div className={`cel-card chat-panel-container ${className}`}>
      {/* Chat Header */}
      <div className="chat-header">
        <div className="chat-header-title">
          <MessageSquare size={16} strokeWidth={2.8} />
          <span>{title}</span>
        </div>
      </div>

      {/* Messages List - Fixed scroll viewport */}
      <div className="chat-messages-viewport">
        {messages.length === 0 ? (
          <div className="chat-empty-slate">
            <span>No messages yet.</span>
          </div>
        ) : (
          messages.map((msg) => {
            if (msg.isSystem) {
              return (
                <div key={msg.id} className="chat-msg-system">
                  <span className="system-pill">{msg.text}</span>
                </div>
              );
            }

            const isMe = msg.senderId === currentUserId;
            const isMuted = mutedPlayerIds.includes(msg.senderId);
            const isRevealed = !!revealedMutedMessageIds[msg.id];

            return (
              <div
                key={msg.id}
                className={`chat-bubble-row ${isMe ? 'bubble-me' : 'bubble-them'} ${
                  isMuted ? 'bubble-muted-state' : ''
                }`}
              >
                {!isMe && (
                  <div className="bubble-avatar-box">
                    <AvatarIcon id={msg.senderAvatarId} size={28} />
                  </div>
                )}

                <div className="bubble-content-wrap">
                  <div className="bubble-meta">
                    <span className="bubble-author">{isMe ? 'You' : msg.senderName}</span>
                    {!isMe && (
                      <button
                        onClick={() => onToggleMutePlayer(msg.senderId, msg.senderName)}
                        className={`msg-mute-btn ${isMuted ? 'is-muted' : ''}`}
                        title={isMuted ? `Unmute ${msg.senderName}` : `Mute ${msg.senderName}`}
                      >
                        {isMuted ? <VolumeX size={12} strokeWidth={2.8} /> : <Volume2 size={12} strokeWidth={2.2} />}
                        <span>{isMuted ? 'MUTED' : 'MUTE'}</span>
                      </button>
                    )}
                  </div>

                  {isMuted && !isRevealed ? (
                    <div className="muted-hidden-placeholder" onClick={() => toggleRevealMuted(msg.id)}>
                      <VolumeX size={13} strokeWidth={2.5} />
                      <span>Message hidden (Player muted). Click to reveal.</span>
                    </div>
                  ) : (
                    <div className={`chat-bubble ${isMe ? 'chat-bubble-primary' : 'chat-bubble-neutral'}`}>
                      <p className="bubble-text">{msg.text}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <form onSubmit={handleSend} className="chat-input-bar">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type a message..."
          maxLength={140}
          className="ink-input chat-text-input"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="btn-cel btn-brawl-primary btn-sm chat-send-btn"
          aria-label="Send message"
        >
          <Send size={14} strokeWidth={2.8} />
          <span>SEND</span>
        </button>
      </form>

      <style>{`
        .chat-panel-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          max-height: 520px;
          background-color: var(--color-glove-ivory);
          border: var(--border-ink-standard);
          border-radius: var(--radius-cel-box);
          overflow: hidden;
        }
        .chat-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 12px;
          background-color: var(--color-parchment-deep);
          border-bottom: var(--border-ink-thin);
          flex-shrink: 0;
        }
        .chat-header-title {
          display: flex;
          align-items: center;
          gap: 6px;
          font-family: var(--font-luckiest-guy);
          font-size: 13px;
          letter-spacing: 0.05em;
          color: var(--color-ink-black);
        }
        .chat-messages-viewport {
          flex: 1 1 0px;
          min-height: 0;
          padding: 12px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 10px;
          background-color: var(--color-canvas-parchment);
        }
        .chat-empty-slate {
          margin: auto;
          text-align: center;
          font-size: 13px;
          color: #887766;
          font-style: italic;
        }
        .chat-msg-system {
          display: flex;
          justify-content: center;
          margin: 3px 0;
        }
        .system-pill {
          background-color: var(--color-parchment-deep);
          border: 1.5px dashed var(--color-ink-black);
          border-radius: 6px;
          padding: 3px 8px;
          font-family: var(--font-theatre-rye);
          font-size: 10px;
          letter-spacing: 0.05em;
          color: var(--color-ink-black);
          text-align: center;
        }
        .chat-bubble-row {
          display: flex;
          gap: 8px;
          align-items: flex-start;
          max-width: 90%;
        }
        .bubble-me {
          align-self: flex-end;
          flex-direction: row-reverse;
        }
        .bubble-them {
          align-self: flex-start;
        }
        .bubble-avatar-box {
          flex-shrink: 0;
          border: 1.5px solid var(--color-ink-black);
          border-radius: 7px;
          overflow: hidden;
          background-color: var(--color-golden-buttercup);
        }
        .bubble-content-wrap {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .bubble-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
        }
        .bubble-author {
          font-family: var(--font-luckiest-guy);
          letter-spacing: 0.03em;
          color: var(--color-ink-black);
        }
        .msg-mute-btn {
          background: none;
          border: none;
          display: flex;
          align-items: center;
          gap: 2px;
          font-family: var(--font-theatre-rye);
          font-size: 9px;
          cursor: pointer;
          color: #887766;
          padding: 1px 4px;
          border-radius: 4px;
        }
        .msg-mute-btn:hover {
          color: var(--color-cuphead-red);
          background-color: rgba(211, 56, 51, 0.1);
        }
        .msg-mute-btn.is-muted {
          color: var(--color-cuphead-red);
          font-weight: bold;
        }
        .chat-bubble {
          padding: 7px 11px;
          border-radius: 10px;
          border: var(--border-ink-thin);
          box-shadow: 1.5px 1.5px 0 var(--color-ink-black);
          word-break: break-word;
        }
        .chat-bubble-primary {
          background-color: var(--color-cuphead-red);
          color: var(--color-glove-ivory);
          border-bottom-right-radius: 2px;
        }
        .chat-bubble-neutral {
          background-color: var(--color-glove-ivory);
          color: var(--color-ink-black);
          border-bottom-left-radius: 2px;
        }
        .bubble-text {
          font-family: var(--font-comic-fredoka);
          font-size: 13px;
          line-height: 1.3;
          margin: 0;
        }
        .muted-hidden-placeholder {
          background-color: #eedcd6;
          border: 1.5px dashed var(--color-cuphead-red);
          color: var(--color-cuphead-red);
          padding: 5px 8px;
          border-radius: 6px;
          font-size: 11px;
          display: flex;
          align-items: center;
          gap: 5px;
          cursor: pointer;
          user-select: none;
        }
        .muted-hidden-placeholder:hover {
          background-color: #f8cfc8;
        }
        .chat-input-bar {
          display: flex;
          gap: 6px;
          padding: 8px;
          background-color: var(--color-parchment-deep);
          border-top: var(--border-ink-thin);
          flex-shrink: 0;
        }
        .chat-text-input {
          flex: 1;
          padding: 7px 10px;
          font-size: 13px;
        }
        .chat-send-btn {
          padding: 7px 12px;
          font-size: 12px;
        }
      `}</style>
    </div>
  );
};
