import React, { useEffect, useState } from 'react';
import {
  X,
  Check,
  Trophy,
  ShieldCheck,
  UserCheck,
  Sparkles,
  VolumeX,
  MessageSquare,
  Key,
  Swords,
  Award,
  Crown,
  Lock,
  LogIn,
  LogOut,
} from 'lucide-react';
import { UserProfile, Achievement } from '../types';
import { AVATAR_LIST, AvatarIcon } from '../utils/avatars';
import { soundstage } from '../utils/audio';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile;
  achievements: Achievement[];
  onUpdateProfile: (updated: Partial<UserProfile>) => void;
  onLogin: (username: string, password: string) => Promise<void>;
  onSetPassword: (password: string) => Promise<void>;
  onSwitchToGuest?: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  userProfile,
  achievements,
  onUpdateProfile,
  onLogin,
  onSetPassword,
  onSwitchToGuest,
}) => {
  const [alias, setAlias] = useState(userProfile.name);
  const [authMode, setAuthMode] = useState<'none' | 'register' | 'login'>('none');
  const [passwordInput, setPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [loginUsernameInput, setLoginUsernameInput] = useState('');
  const [loginPasswordInput, setLoginPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAlias(userProfile.name);
      setAuthMode('none');
      setAuthError('');
      setPasswordInput('');
      setConfirmPasswordInput('');
      setLoginUsernameInput('');
      setLoginPasswordInput('');
    }
  }, [isOpen, userProfile.name]);

  if (!isOpen) return null;

  const handleSaveAlias = () => {
    soundstage.playTap();
    onUpdateProfile({ name: alias.trim() || 'Contender' });
  };

  const handleSelectAvatar = (avatarId: string) => {
    soundstage.playTap();
    onUpdateProfile({ avatarId });
  };

  const handleRegisterPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordInput) return;
    if (passwordInput.length < 6) {
      setAuthError('Password must be at least 6 characters.');
      return;
    }
    if (passwordInput !== confirmPasswordInput) {
      setAuthError('Passwords do not match.');
      return;
    }
    setIsSubmittingAuth(true);
    setAuthError('');
    try {
      await onSetPassword(passwordInput);
      setAuthMode('none');
      setPasswordInput('');
      setConfirmPasswordInput('');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Failed to protect nickname.');
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUsernameInput.trim() || !loginPasswordInput) return;
    setIsSubmittingAuth(true);
    setAuthError('');
    try {
      await onLogin(loginUsernameInput.trim(), loginPasswordInput);
      setAuthMode('none');
      setLoginUsernameInput('');
      setLoginPasswordInput('');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Invalid username or password.');
    } finally {
      setIsSubmittingAuth(false);
    }
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
                  {userProfile.isRegistered ? (
                    <div className="account-status-pill registered">
                      <div className="status-pill-info">
                        <ShieldCheck size={18} strokeWidth={2.8} className="shield-icon-active" />
                        <div className="status-pill-text">
                          <span className="status-title">PROTECTED IDENTITY</span>
                          <small className="status-sub">Secured with password</small>
                        </div>
                      </div>
                      {onSwitchToGuest && (
                        <button
                          type="button"
                          onClick={() => {
                            soundstage.playTap();
                            onSwitchToGuest();
                          }}
                          className="btn-cel btn-brawl-neutral btn-sm"
                          title="Switch back to guest mode"
                        >
                          <LogOut size={13} strokeWidth={2.5} />
                          <span>SIGN OUT</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="account-status-pill guest">
                      <div className="status-pill-info">
                        <UserCheck size={18} strokeWidth={2.5} className="guest-icon" />
                        <div className="status-pill-text">
                          <span className="status-title">GUEST SESSION</span>
                          <small className="status-sub">Protect nickname with password</small>
                        </div>
                      </div>
                      <div className="auth-action-buttons">
                        <button
                          type="button"
                          onClick={() => {
                            soundstage.playTap();
                            setAuthMode(authMode === 'register' ? 'none' : 'register');
                            setAuthError('');
                          }}
                          className={`btn-cel btn-sm ${authMode === 'register' ? 'btn-brawl-secondary' : 'btn-brawl-primary'}`}
                          title="Protect your current alias"
                        >
                          <Lock size={13} strokeWidth={2.5} />
                          <span>PROTECT</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            soundstage.playTap();
                            setAuthMode(authMode === 'login' ? 'none' : 'login');
                            setAuthError('');
                          }}
                          className={`btn-cel btn-sm ${authMode === 'login' ? 'btn-brawl-secondary' : 'btn-brawl-neutral'}`}
                          title="Log into existing account"
                        >
                          <LogIn size={13} strokeWidth={2.5} />
                          <span>LOG IN</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Register Password Form */}
                  {authMode === 'register' && !userProfile.isRegistered && (
                    <div className="auth-drawer cel-card">
                      <div className="drawer-header">
                        <Lock size={16} strokeWidth={2.8} />
                        <span className="woodcut-title">SECURE ALIAS: "{alias.trim() || userProfile.name}"</span>
                      </div>
                      <p className="drawer-desc">
                        Set a password to register this name. Once registered, no one else can use it, and your stats and achievements stay safe.
                      </p>
                      <form onSubmit={handleRegisterPassword} className="auth-drawer-form">
                        <div className="drawer-inputs">
                          <input
                            type="password"
                            value={passwordInput}
                            onChange={(e) => setPasswordInput(e.target.value)}
                            placeholder="Password (min 6 characters)"
                            required
                            minLength={6}
                            maxLength={128}
                            className="ink-input drawer-input"
                          />
                          <input
                            type="password"
                            value={confirmPasswordInput}
                            onChange={(e) => setConfirmPasswordInput(e.target.value)}
                            placeholder="Confirm password"
                            required
                            minLength={6}
                            maxLength={128}
                            className="ink-input drawer-input"
                          />
                        </div>
                        {authError && <p className="auth-drawer-error">{authError}</p>}
                        <div className="drawer-buttons">
                          <button
                            type="submit"
                            disabled={isSubmittingAuth}
                            className="btn-cel btn-brawl-primary btn-sm"
                          >
                            <ShieldCheck size={14} strokeWidth={2.5} />
                            <span>{isSubmittingAuth ? 'REGISTERING...' : 'CONFIRM PASSWORD'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              soundstage.playTap();
                              setAuthMode('none');
                              setAuthError('');
                            }}
                            className="btn-cel btn-brawl-neutral btn-sm"
                          >
                            CANCEL
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* Login Form */}
                  {authMode === 'login' && !userProfile.isRegistered && (
                    <div className="auth-drawer cel-card">
                      <div className="drawer-header">
                        <LogIn size={16} strokeWidth={2.8} />
                        <span className="woodcut-title">LOG IN WITH REGISTERED NAME</span>
                      </div>
                      <p className="drawer-desc">
                        Enter your username and password. Any achievements from this guest session will be merged into your account.
                      </p>
                      <form onSubmit={handleLogin} className="auth-drawer-form">
                        <div className="drawer-inputs">
                          <input
                            type="text"
                            value={loginUsernameInput}
                            onChange={(e) => setLoginUsernameInput(e.target.value)}
                            placeholder="Registered username"
                            required
                            maxLength={24}
                            className="ink-input drawer-input"
                          />
                          <input
                            type="password"
                            value={loginPasswordInput}
                            onChange={(e) => setLoginPasswordInput(e.target.value)}
                            placeholder="Password"
                            required
                            maxLength={128}
                            className="ink-input drawer-input"
                          />
                        </div>
                        {authError && <p className="auth-drawer-error">{authError}</p>}
                        <div className="drawer-buttons">
                          <button
                            type="submit"
                            disabled={isSubmittingAuth}
                            className="btn-cel btn-brawl-primary btn-sm"
                          >
                            <LogIn size={14} strokeWidth={2.5} />
                            <span>{isSubmittingAuth ? 'LOGGING IN...' : 'LOG IN'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              soundstage.playTap();
                              setAuthMode('none');
                              setAuthError('');
                            }}
                            className="btn-cel btn-brawl-neutral btn-sm"
                          >
                            CANCEL
                          </button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Unified Career Record Ledger */}
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
          .account-status-pill {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
            background-color: var(--color-canvas-parchment);
            border: var(--border-ink-thin);
            border-radius: 7px;
            padding: 6px 10px;
          }
          .account-status-pill.registered {
            background-color: rgba(62, 136, 165, 0.12);
            border-color: rgba(62, 136, 165, 0.4);
          }
          .status-pill-info {
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .shield-icon-active {
            color: var(--color-mugman-cyan);
            flex-shrink: 0;
          }
          .guest-icon {
            color: var(--color-text-muted);
            flex-shrink: 0;
          }
          .status-pill-text {
            display: flex;
            flex-direction: column;
            line-height: 1.2;
          }
          .status-title {
            font-family: var(--font-comic-fredoka);
            font-size: 11px;
            font-weight: 700;
            color: var(--color-text-main);
          }
          .status-sub {
            font-size: 10px;
            color: var(--color-text-muted);
          }
          .auth-action-buttons {
            display: flex;
            align-items: center;
            gap: 6px;
          }
          .auth-drawer {
            margin-top: 8px;
            padding: 10px 12px;
            background-color: var(--color-canvas-parchment);
            border: var(--border-ink-thick);
            border-radius: 8px;
          }
          .drawer-header {
            display: flex;
            align-items: center;
            gap: 6px;
            font-family: var(--font-luckiest-guy);
            font-size: 13px;
            color: var(--color-text-main);
            margin-bottom: 3px;
          }
          .drawer-desc {
            font-size: 11px;
            margin-bottom: 8px;
            color: var(--color-text-muted);
            line-height: 1.3;
          }
          .auth-drawer-form {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          .drawer-inputs {
            display: flex;
            flex-direction: column;
            gap: 6px;
          }
          .drawer-input {
            width: 100%;
          }
          .drawer-buttons {
            display: flex;
            justify-content: flex-end;
            gap: 6px;
          }
          .auth-drawer-error {
            font-size: 11px;
            color: var(--color-cuphead-red);
            font-weight: bold;
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
          @media (max-width: 600px) {
            .auth-box-top { flex-direction: column; align-items: center; text-align: center; }
            .alias-input-row { flex-direction: column; }
            .career-ledger { grid-template-columns: repeat(2, 1fr); gap: 8px; }
            .ledger-cell:not(:last-child) { border-right: none; }
            .avatar-grid { grid-template-columns: repeat(2, 1fr); }
            .account-status-pill { flex-direction: column; align-items: stretch; gap: 8px; }
            .auth-action-buttons { justify-content: flex-end; }
          }
        `}</style>
      </div>
    </div>
  );
};
