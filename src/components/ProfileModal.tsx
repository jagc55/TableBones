import React, { useState } from 'react';
import { X, Check, Trophy, ShieldCheck, UserCheck, Sparkles, VolumeX, MessageSquare, Key, Swords, Award, Crown } from 'lucide-react';
import { UserProfile, Achievement } from '../types';
import { AVATAR_LIST, AvatarIcon } from '../utils/avatars';
import { soundstage } from '../utils/audio';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile;
  achievements: Achievement[];
  onUpdateProfile: (updated: Partial<UserProfile>) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  userProfile,
  achievements,
  onUpdateProfile,
}) => {
  const [alias, setAlias] = useState(userProfile.name);
  const [showGoogleAuthDialog, setShowGoogleAuthDialog] = useState(false);
  const [mockGoogleEmail, setMockGoogleEmail] = useState('player@gmail.com');

  if (!isOpen) return null;

  const handleSaveAlias = () => {
    soundstage.playTap();
    onUpdateProfile({ name: alias.trim() || 'Contender' });
  };

  const handleSelectAvatar = (avatarId: string) => {
    soundstage.playTap();
    onUpdateProfile({ avatarId });
  };

  const handleSimulateGoogleLogin = () => {
    soundstage.playScoreTrumpet();
    onUpdateProfile({
      isGoogleAuth: true,
      googleEmail: mockGoogleEmail,
      name: alias.trim() || 'Google Contender',
    });
    setShowGoogleAuthDialog(false);
  };

  const handleSwitchToGuest = () => {
    soundstage.playTap();
    onUpdateProfile({
      isGoogleAuth: false,
      googleEmail: undefined,
    });
  };

  const unlockedPoints = achievements
    .filter((a) => a.isUnlocked)
    .reduce((sum, a) => sum + a.points, 0);
  const totalPoints = achievements.reduce((sum, a) => sum + a.points, 0);

  const getAchievementIcon = (key: string) => {
    const size = 18;
    const strokeWidth = 2.5;
    switch (key) {
      case 'Swords': return <Swords size={size} strokeWidth={strokeWidth} />;
      case 'Trophy': return <Trophy size={size} strokeWidth={strokeWidth} />;
      case 'Crown': return <Crown size={size} strokeWidth={strokeWidth} />;
      case 'Key': return <Key size={size} strokeWidth={strokeWidth} />;
      case 'VolumeX': return <VolumeX size={size} strokeWidth={strokeWidth} />;
      case 'MessageSquare': return <MessageSquare size={size} strokeWidth={strokeWidth} />;
      case 'Award': return <Award size={size} strokeWidth={strokeWidth} />;
      default: return <Sparkles size={size} strokeWidth={strokeWidth} />;
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content profile-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header-strip">
          <div className="header-meta">
            <span className="ribbon-banner">PLAYER LEDGER</span>
            <h2 className="woodcut-title profile-title">CONTENDER DOSSIER</h2>
          </div>
          <button onClick={onClose} className="btn-cel btn-brawl-neutral btn-icon-sq" aria-label="Close modal">
            <X size={18} strokeWidth={3} />
          </button>
        </div>

        <div className="profile-modal-body">
          {/* Identity & Account Card */}
          <div className="cel-card profile-auth-box">
            <div className="auth-box-top">
              <div className="current-avatar-preview">
                <AvatarIcon id={userProfile.avatarId} size={60} />
              </div>

              <div className="auth-box-inputs">
                <label className="field-label">CONTENDER ALIAS</label>
                <div className="alias-input-row">
                  <input
                    type="text"
                    value={alias}
                    onChange={(e) => setAlias(e.target.value)}
                    maxLength={24}
                    className="ink-input"
                    placeholder="Enter player name..."
                  />
                  <button onClick={handleSaveAlias} className="btn-cel btn-brawl-secondary btn-sm" title="Save Alias">
                    <Check size={14} strokeWidth={3} />
                    <span>SAVE</span>
                  </button>
                </div>

                <div className="auth-status-bar">
                  {userProfile.isGoogleAuth ? (
                    <div className="google-status-pill">
                      <ShieldCheck size={16} strokeWidth={2.8} className="verified-shield-icon" />
                      <div className="google-email-text">
                        <span>Google Account Linked</span>
                        <strong>{userProfile.googleEmail}</strong>
                      </div>
                      <button onClick={handleSwitchToGuest} className="btn-cel btn-brawl-neutral btn-sm auth-switch-btn">
                        DISCONNECT
                      </button>
                    </div>
                  ) : (
                    <div className="guest-status-pill">
                      <UserCheck size={16} strokeWidth={2.5} />
                      <div className="guest-info">
                        <span>Local Guest Session</span>
                        <small>Saved in browser local storage</small>
                      </div>
                      <button
                        onClick={() => setShowGoogleAuthDialog(true)}
                        className="btn-cel btn-brawl-cyan btn-sm google-login-cta"
                      >
                        <GoogleIcon size={14} />
                        <span>LINK GOOGLE</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Unified Career Record Ledger (Replacing 4 separated AI metric cards) */}
          <div className="career-stats-section">
            <span className="section-subheading">CAREER RECORD</span>
            <div className="career-ledger cel-card">
              <div className="ledger-cell">
                <span className="ledger-num">{userProfile.stats.matchesPlayed}</span>
                <span className="ledger-lbl">MATCHES</span>
              </div>
              <div className="ledger-cell cell-gold">
                <span className="ledger-num">{userProfile.stats.matchesWon}</span>
                <span className="ledger-lbl">VICTORIES</span>
              </div>
              <div className="ledger-cell">
                <span className="ledger-num">
                  {userProfile.stats.matchesPlayed > 0
                    ? Math.round((userProfile.stats.matchesWon / userProfile.stats.matchesPlayed) * 100)
                    : 0}
                  %
                </span>
                <span className="ledger-lbl">WIN RATIO</span>
              </div>
              <div className="ledger-cell">
                <span className="ledger-num">{userProfile.stats.walkoverWins}</span>
                <span className="ledger-lbl">WALKOVERS</span>
              </div>
            </div>
          </div>

          {/* Avatar Selector Grid */}
          <div className="avatar-selector-section">
            <span className="section-subheading">CARTOON PORTRAITS</span>
            <div className="avatar-grid">
              {AVATAR_LIST.map((av) => {
                const isSelected = userProfile.avatarId === av.id;
                return (
                  <button
                    key={av.id}
                    onClick={() => handleSelectAvatar(av.id)}
                    className={`avatar-choice-card ${isSelected ? 'avatar-selected' : ''}`}
                    title={av.name}
                  >
                    <div className="avatar-svg-wrap">
                      <AvatarIcon id={av.id} size={42} />
                    </div>
                    <span className="avatar-card-name">{av.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Achievements Showcase */}
          <div className="achievements-section">
            <div className="achievements-header">
              <div>
                <span className="section-subheading">HONORS & TROPHIES</span>
                <p className="achievements-subtext">Unlock achievements by playing matches.</p>
              </div>
              <div className="ticket-stub">
                <span className="ticket-stub-label">POINTS</span>
                <span className="ticket-stub-code">
                  {unlockedPoints} / {totalPoints} PTS
                </span>
              </div>
            </div>

            <div className="achievements-list">
              {achievements.map((ach) => (
                <div key={ach.id} className={`achievement-item ${ach.isUnlocked ? 'ach-unlocked' : 'ach-locked'}`}>
                  <div className="ach-icon-cell">
                    {getAchievementIcon(ach.iconKey)}
                  </div>
                  <div className="ach-info">
                    <div className="ach-title-row">
                      <h4 className="ach-title">{ach.title}</h4>
                      <span className="ach-points">+{ach.points} PTS</span>
                    </div>
                    <p className="ach-desc">{ach.description}</p>
                  </div>
                  <div className="ach-status-badge">
                    {ach.isUnlocked ? 'EARNED' : 'LOCKED'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Google Auth Dialog Modal */}
        {showGoogleAuthDialog && (
          <div className="modal-overlay inner-modal-overlay">
            <div className="modal-content google-auth-popup" onClick={(e) => e.stopPropagation()}>
              <div className="google-auth-header">
                <GoogleIcon size={26} />
                <h3 className="google-auth-title">Link Google Account</h3>
                <p className="google-auth-desc">
                  Connect your profile and achievements without storing third-party passwords.
                </p>
              </div>

              <div className="google-auth-body">
                <label className="field-label">GOOGLE ACCOUNT EMAIL</label>
                <input
                  type="email"
                  className="ink-input"
                  value={mockGoogleEmail}
                  onChange={(e) => setMockGoogleEmail(e.target.value)}
                  placeholder="name@gmail.com"
                />
              </div>

              <div className="google-auth-actions">
                <button
                  onClick={() => setShowGoogleAuthDialog(false)}
                  className="btn-cel btn-brawl-neutral btn-sm"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleSimulateGoogleLogin}
                  className="btn-cel btn-brawl-primary btn-sm"
                >
                  LINK ACCOUNT
                </button>
              </div>
            </div>
          </div>
        )}

        <style>{`
          .profile-modal-card {
            max-width: 600px;
          }
          .modal-header-strip {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 14px 18px 10px;
            border-bottom: var(--border-ink-standard);
            background-color: var(--color-parchment-deep);
          }
          .profile-title {
            font-size: 22px;
            color: var(--color-text-main);
          }
          .profile-modal-body {
            padding: 18px;
            display: flex;
            flex-direction: column;
            gap: 16px;
          }
          .profile-auth-box {
            padding: 12px;
          }
          .auth-box-top {
            display: flex;
            align-items: flex-start;
            gap: 14px;
          }
          .current-avatar-preview {
            border: var(--border-ink-standard);
            border-radius: 10px;
            background-color: var(--color-golden-buttercup);
            padding: 4px;
            box-shadow: var(--shadow-cel-sm);
            flex-shrink: 0;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .auth-box-inputs {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 5px;
          }
          .field-label {
            font-family: var(--font-theatre-rye);
            font-size: 9.5px;
            letter-spacing: 0.08em;
            color: var(--color-text-main);
          }
          .alias-input-row {
            display: flex;
            gap: 6px;
          }
          .auth-status-bar {
            margin-top: 4px;
          }
          .guest-status-pill, .google-status-pill {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
            background-color: var(--color-canvas-parchment);
            border: var(--border-ink-thin);
            border-radius: 7px;
            padding: 6px 10px;
          }
          .google-status-pill {
            background-color: rgba(62, 136, 165, 0.12);
          }
          .verified-shield-icon {
            color: var(--color-mugman-cyan);
            flex-shrink: 0;
          }
          .google-email-text, .guest-info {
            display: flex;
            flex-direction: column;
            font-size: 12px;
            line-height: 1.2;
          }
          .guest-info small {
            font-size: 10px;
            color: var(--color-text-muted);
          }
          .google-email-text strong {
            font-family: var(--font-typewriter-elite);
            font-size: 11.5px;
          }
          .google-login-cta {
            flex-shrink: 0;
            padding: 4px 8px;
            font-size: 10.5px;
          }
          .auth-switch-btn {
            padding: 3px 6px;
            font-size: 9.5px;
          }
          .section-subheading {
            font-family: var(--font-luckiest-guy);
            font-size: 14.5px;
            letter-spacing: 0.04em;
            color: var(--color-text-main);
            margin-bottom: 6px;
            display: block;
          }
          .career-ledger {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            padding: 10px;
            border-radius: 9px;
            text-align: center;
          }
          .ledger-cell {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 2px;
            padding: 4px;
          }
          .ledger-cell:not(:last-child) {
            border-right: 1.5px dashed var(--color-ink-stroke);
          }
          .ledger-num {
            font-family: var(--font-luckiest-guy);
            font-size: 22px;
            color: var(--color-text-main);
            line-height: 1;
          }
          .cell-gold .ledger-num {
            color: var(--color-cuphead-red);
          }
          .ledger-lbl {
            font-family: var(--font-theatre-rye);
            font-size: 8.5px;
            letter-spacing: 0.06em;
            color: var(--color-text-muted);
          }
          .avatar-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
          }
          .avatar-choice-card {
            background-color: var(--color-glove-ivory);
            border: var(--border-ink-thin);
            border-radius: 8px;
            padding: 6px 4px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
            cursor: pointer;
            box-shadow: var(--shadow-cel-sm);
            transition: transform 0.08s ease;
          }
          .avatar-choice-card:hover {
            transform: translateY(-2px);
          }
          .avatar-choice-card.avatar-selected {
            border: var(--border-ink-standard);
            border-color: var(--color-cuphead-red);
            background-color: var(--color-golden-buttercup);
            box-shadow: 0 0 0 2px var(--color-cuphead-red);
          }
          .avatar-card-name {
            font-family: var(--font-comic-fredoka);
            font-size: 11px;
            font-weight: 700;
            text-align: center;
            line-height: 1.1;
            color: var(--color-text-main);
          }
          .avatar-selected .avatar-card-name {
            color: var(--color-ink-black);
          }
          .achievements-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 8px;
          }
          .achievements-subtext {
            font-size: 11.5px;
            color: var(--color-text-muted);
          }
          .achievements-list {
            display: flex;
            flex-direction: column;
            gap: 6px;
            max-height: 200px;
            overflow-y: auto;
            padding-right: 4px;
          }
          .achievement-item {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 7px 10px;
            border-radius: 8px;
            border: var(--border-ink-thin);
            box-shadow: var(--shadow-cel-sm);
          }
          .ach-unlocked {
            background-color: var(--color-glove-ivory);
            border-color: var(--color-ink-stroke);
          }
          .ach-locked {
            background-color: var(--color-parchment-deep);
            opacity: 0.55;
            filter: grayscale(0.8);
          }
          .ach-icon-cell {
            background-color: var(--color-golden-buttercup);
            border: 1.5px solid var(--color-ink-stroke);
            border-radius: 6px;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            color: var(--color-ink-black);
          }
          .ach-locked .ach-icon-cell {
            background-color: var(--color-parchment-deep);
            color: var(--color-text-muted);
          }
          .ach-info {
            flex: 1;
          }
          .ach-title-row {
            display: flex;
            align-items: center;
            gap: 6px;
          }
          .ach-title {
            font-family: var(--font-luckiest-guy);
            font-size: 13px;
            letter-spacing: 0.03em;
            color: var(--color-text-main);
          }
          .ach-points {
            font-family: var(--font-theatre-rye);
            font-size: 9px;
            color: var(--color-cuphead-red);
            font-weight: bold;
          }
          .ach-desc {
            font-size: 11px;
            color: var(--color-text-lead);
            line-height: 1.2;
          }
          .ach-status-badge {
            font-family: var(--font-theatre-rye);
            font-size: 8.5px;
            letter-spacing: 0.06em;
            padding: 2px 6px;
            border-radius: 3px;
            border: 1px solid var(--color-ink-stroke);
            background-color: var(--color-parchment-deep);
            color: var(--color-text-main);
          }
          .ach-unlocked .ach-status-badge {
            background-color: var(--color-status-success-bg);
            color: var(--color-status-success-text);
            border-color: var(--color-status-success-text);
          }
          .inner-modal-overlay {
            z-index: 1100;
          }
          .google-auth-popup {
            max-width: 380px;
            padding: 18px;
            display: flex;
            flex-direction: column;
            gap: 12px;
          }
          .google-auth-header {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            gap: 5px;
          }
          .google-auth-title {
            font-family: var(--font-luckiest-guy);
            font-size: 18px;
            color: var(--color-text-main);
          }
          .google-auth-desc {
            font-size: 12px;
            color: var(--color-text-lead);
          }
          .google-auth-actions {
            display: flex;
            justify-content: flex-end;
            gap: 8px;
            margin-top: 4px;
          }

          @media (max-width: 600px) {
            .auth-box-top { flex-direction: column; align-items: center; text-align: center; }
            .alias-input-row { flex-direction: column; }
            .career-ledger { grid-template-columns: repeat(2, 1fr); gap: 8px; }
            .ledger-cell:not(:last-child) { border-right: none; }
            .avatar-grid { grid-template-columns: repeat(2, 1fr); }
          }
        `}</style>
      </div>
    </div>
  );
};

// SVG Google Icon component
const GoogleIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      fill="#EA4335"
    />
  </svg>
);
