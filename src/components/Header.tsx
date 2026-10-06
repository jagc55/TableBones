import React from 'react';
import { Trophy, Dices } from 'lucide-react';
import { UserProfile } from '../types';
import { AvatarIcon } from '../utils/avatars';
import { AudioToggle } from './AudioToggle';
import { soundstage } from '../utils/audio';

interface HeaderProps {
  userProfile: UserProfile;
  unlockedAchievementsCount: number;
  totalAchievementsCount: number;
  onOpenProfile: () => void;
  onGoHome?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  userProfile,
  unlockedAchievementsCount,
  totalAchievementsCount,
  onOpenProfile,
  onGoHome,
}) => {
  return (
    <header className="cuphead-marquee">
      <div className="marquee-inner">
        {/* Brand / Logo */}
        <div
          className="brand-container"
          onClick={() => {
            soundstage.playTap();
            if (onGoHome) onGoHome();
          }}
          role="button"
          tabIndex={0}
          title="Home"
        >
          <div className="brand-icon-box">
            <Dices size={26} strokeWidth={2.6} className="brand-dice-icon" />
          </div>
          <div className="brand-text">
            <span className="brand-ribbon">ONLINE BOARD GAMES</span>
            <h1 className="brand-title">TABLEBONES</h1>
          </div>
        </div>

        {/* Right Action Controls */}
        <div className="header-actions">
          {/* Audio Soundstage Toggle */}
          <AudioToggle />

          {/* Profile & Achievements Button */}
          <button
            onClick={() => {
              soundstage.playTap();
              onOpenProfile();
            }}
            className="btn-cel btn-brawl-neutral profile-nav-pill"
            title="Player Profile & Achievements"
          >
            <div className="profile-pill-avatar">
              <AvatarIcon id={userProfile.avatarId} size={30} />
            </div>
            <div className="profile-pill-meta">
              <span className="profile-pill-name">{userProfile.name}</span>
              <div className="profile-pill-badges">
                <span className={`auth-badge ${userProfile.isGoogleAuth ? 'auth-google' : 'auth-guest'}`}>
                  {userProfile.isGoogleAuth ? 'GOOGLE' : 'GUEST'}
                </span>
                <span className="trophy-count" title="Achievements">
                  <Trophy size={12} strokeWidth={2.8} />
                  <span>
                    {unlockedAchievementsCount}/{totalAchievementsCount}
                  </span>
                </span>
              </div>
            </div>
          </button>
        </div>
      </div>

      <style>{`
        .cuphead-marquee {
          position: sticky;
          top: 0;
          z-index: 800;
          background-color: var(--color-canvas-parchment);
          border-bottom: var(--border-ink-thick);
          box-shadow: 0 3px 0 var(--color-ink-black);
          padding: 8px 16px;
        }
        .marquee-inner {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }
        .brand-container {
          display: flex;
          align-items: center;
          gap: 10px;
          cursor: pointer;
          user-select: none;
        }
        .brand-icon-box {
          background-color: var(--color-golden-buttercup);
          border: var(--border-ink-standard);
          box-shadow: var(--shadow-cel-sm);
          border-radius: 9px;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .brand-dice-icon {
          color: var(--color-ink-black);
        }
        .brand-text {
          display: flex;
          flex-direction: column;
        }
        .brand-ribbon {
          font-family: var(--font-theatre-rye);
          font-size: 10px;
          letter-spacing: 0.12em;
          color: var(--color-cuphead-red);
          line-height: 1.1;
        }
        .brand-title {
          font-family: var(--font-luckiest-guy);
          font-size: 26px;
          letter-spacing: 0.05em;
          color: var(--color-ink-black);
          line-height: 0.95;
        }
        .header-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .profile-nav-pill {
          padding: 4px 12px 4px 6px;
          gap: 8px;
        }
        .profile-pill-avatar {
          display: flex;
          align-items: center;
        }
        .profile-pill-meta {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          text-align: left;
        }
        .profile-pill-name {
          font-family: var(--font-luckiest-guy);
          font-size: 14px;
          line-height: 1.1;
          color: var(--color-ink-black);
        }
        .profile-pill-badges {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .auth-badge {
          font-family: var(--font-theatre-rye);
          font-size: 9px;
          letter-spacing: 0.05em;
          padding: 1px 5px;
          border-radius: 4px;
          border: 1px solid var(--color-ink-black);
        }
        .auth-guest {
          background-color: var(--color-parchment-deep);
          color: var(--color-ink-black);
        }
        .auth-google {
          background-color: var(--color-mugman-cyan);
          color: var(--color-glove-ivory);
        }
        .trophy-count {
          display: flex;
          align-items: center;
          gap: 3px;
          font-family: var(--font-typewriter-elite);
          font-size: 10px;
          font-weight: 700;
          color: var(--color-cuphead-red);
        }

        @media (max-width: 600px) {
          .brand-ribbon { display: none; }
          .brand-title { font-size: 20px; }
          .profile-pill-meta { display: none; }
          .profile-nav-pill { padding: 4px; }
        }
      `}</style>
    </header>
  );
};
