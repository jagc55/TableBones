import React from 'react';
import { Trophy } from 'lucide-react';
import { UserProfile } from '../types';
import { AvatarIcon } from '../utils/avatars';
import { AudioToggle } from './AudioToggle';
import { ThemeToggle } from './ThemeToggle';
import { soundstage } from '../utils/audio';
import logoImg from '../assets/logo.png';

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
          <div className="brand-logo-frame">
            <img
              src={logoImg}
              alt="Tablebones Skull Mascot"
              className="brand-logo-img"
              width={46}
              height={46}
            />
          </div>
          <div className="brand-text">
            <span className="brand-ribbon">ONLINE BOARD GAMES</span>
            <h1 className="brand-title">TABLEBONES</h1>
          </div>
        </div>

        {/* Right Action Controls */}
        <div className="header-actions">
          {/* Day / Night Theme Toggle */}
          <ThemeToggle />

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
                <span className="trophy-count" title="Achievements">
                  <Trophy size={11} strokeWidth={2.8} />
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
          box-shadow: 0 3px 0 var(--color-shadow-solid);
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
          gap: 12px;
          cursor: pointer;
          user-select: none;
        }
        .brand-logo-frame {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .brand-logo-img {
          width: 48px;
          height: 48px;
          object-fit: contain;
          filter: drop-shadow(2px 2px 0px var(--color-shadow-solid));
          transition: transform 0.16s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .brand-container:hover .brand-logo-img {
          transform: scale(1.12) rotate(-5deg);
        }
        .brand-container:active .brand-logo-img {
          transform: scale(0.95) rotate(2deg);
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
          .brand-logo-frame, .brand-logo-img { width: 38px; height: 38px; }
          .profile-pill-meta { display: none; }
          .profile-nav-pill { padding: 4px; }
        }
      `}</style>
    </header>
  );
};
