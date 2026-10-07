import React from 'react';
import { Check, AlertCircle, Sparkles, Trophy } from 'lucide-react';
import { BonegleSubmissionFeedback, BoneglePlayerBreakdown } from './types';
import { FlagIcon } from '../../components/FlagIcon';

interface BonegleWordBannerProps {
  currentWord: string;
  potentialPoints: number;
  lang: 'es' | 'en';
  feedback: BonegleSubmissionFeedback | null;
  onClear: () => void;
  onSubmit: () => void;
}

export const BonegleWordBanner: React.FC<BonegleWordBannerProps> = ({
  currentWord,
  potentialPoints,
  lang,
  feedback,
  onClear,
  onSubmit,
}) => {
  return (
    <div
      className={`bonegle-word-banner cel-card ${
        feedback ? `feedback-banner-${feedback.status}` : ''
      }`}
    >
      <div className="word-banner-left">
        <div className="word-banner-top-row">
          <span className="banner-subtag">
            {feedback
              ? feedback.status === 'valid'
                ? lang === 'es'
                  ? 'PALABRA CORRECTA'
                  : 'VALID WORD'
                : feedback.status === 'duplicate'
                ? lang === 'es'
                  ? 'YA ENCONTRADA'
                  : 'ALREADY FOUND'
                : lang === 'es'
                ? 'PALABRA NO VÁLIDA'
                : 'INVALID WORD'
              : lang === 'es'
              ? 'PALABRA EN CURSO'
              : 'CURRENT WORD'}
          </span>
          <span className="lang-indicator-pill">
            <FlagIcon country={lang === 'es' ? 'es' : 'uk'} size={14} />
            <span>{lang === 'es' ? 'ES' : 'EN'}</span>
          </span>
        </div>

        <div className="word-banner-display-line">
          {feedback ? (
            <div className="feedback-content-row">
              {feedback.status === 'valid' && <Check size={20} strokeWidth={3} className="feedback-icon-ok" />}
              {feedback.status === 'duplicate' && (
                <AlertCircle size={20} strokeWidth={3} className="feedback-icon-dup" />
              )}
              {feedback.status === 'invalid' && (
                <AlertCircle size={20} strokeWidth={3} className="feedback-icon-err" />
              )}
              <span className="feedback-word-text">{feedback.word}</span>
              {feedback.status === 'valid' && (
                <span className="feedback-pts-tag">+{feedback.pts} PTS</span>
              )}
            </div>
          ) : currentWord ? (
            <span className="constructed-word-bold">{currentWord}</span>
          ) : (
            <span className="word-placeholder">
              {lang === 'es' ? 'Arrastra o toca letras adyacentes...' : 'Drag or tap adjacent letters...'}
            </span>
          )}
        </div>
      </div>

      <div className="word-banner-actions">
        <button
          type="button"
          onClick={onClear}
          className="btn-cel btn-brawl-neutral btn-sm clear-word-btn"
          title="Borrar palabra actual"
          style={{
            visibility: currentWord.length > 0 && !feedback ? 'visible' : 'hidden',
            pointerEvents: currentWord.length > 0 && !feedback ? 'auto' : 'none',
          }}
        >
          <span>{lang === 'es' ? 'BORRAR' : 'CLEAR'}</span>
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={currentWord.length < 3 || !!feedback}
          className="btn-cel btn-brawl-primary btn-sm submit-word-btn"
        >
          <Check size={15} strokeWidth={3} />
          <span>
            {currentWord.length >= 3 ? `+${potentialPoints} PTS` : '3+ LETRAS'}
          </span>
        </button>
      </div>
    </div>
  );
};

interface BonegleWordBankProps {
  myFoundWords: Map<string, number>;
  lang: 'es' | 'en';
}

export const BonegleWordBank: React.FC<BonegleWordBankProps> = ({ myFoundWords, lang }) => {
  const wordsArray = Array.from(myFoundWords.entries());
  const totalScore = wordsArray.reduce((acc, [, pts]) => acc + pts, 0);

  return (
    <div className="bonegle-words-sidebar cel-card">
      <div className="sidebar-header">
        <span className="sidebar-title">
          {lang === 'es' ? 'PALABRAS REGISTRADAS' : 'FOUND WORDS'} ({wordsArray.length})
        </span>
        <strong className="sidebar-subscore">{totalScore} PTS</strong>
      </div>

      <div className="words-chips-scroll">
        {wordsArray.length === 0 ? (
          <div className="words-empty-state">
            <Sparkles size={20} className="empty-sparkle" />
            <p>
              {lang === 'es'
                ? 'Conecta letras en cualquier dirección: horizontal, vertical o diagonal.'
                : 'Connect letters in any direction: horizontal, vertical, or diagonal.'}
            </p>
          </div>
        ) : (
          wordsArray.map(([word, pts]) => (
            <div key={word} className="bonegle-chip">
              <span className="chip-word">{word}</span>
              <span className="chip-pts">+{pts}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

interface BonegleRevelationViewProps {
  breakdowns: BoneglePlayerBreakdown[];
  longestWord?: string;
  lang: 'es' | 'en';
}

export const BonegleRevelationView: React.FC<BonegleRevelationViewProps> = ({
  breakdowns,
  longestWord,
  lang,
}) => {
  const champ = breakdowns[0];

  return (
    <div className="bonegle-revelation-card cel-card">
      <div className="revelation-header-box">
        <Trophy size={36} className="trophy-icon" style={{ color: 'var(--color-golden-buttercup)' }} />
        <h2 className="woodcut-title">
          {lang === 'es' ? '¡LA GRAN REVELACIÓN!' : 'THE GREAT REVELATION!'}
        </h2>
        <span className="revelation-subtitle">
          {lang === 'es'
            ? '¡Las palabras exclusivas duplican su valor (x2 PTS)!'
            : 'Exclusive words scored double points (x2 PTS)!'}
        </span>
      </div>

      {champ && (
        <div className="revelation-podium-strip">
          <span className="champ-label">
            {lang === 'es' ? 'CAMPEÓN DEL COMBATE' : 'ROUND CHAMPION'}
          </span>
          <strong className="champ-name">{champ.player.name}</strong>
          <span className="champ-score">{champ.totalScore} PTS</span>
        </div>
      )}

      {longestWord && (
        <div className="longest-word-chip">
          <strong>{lang === 'es' ? 'Palabra más larga:' : 'Longest word on board:'}</strong>
          <span>"{longestWord}"</span>
        </div>
      )}
    </div>
  );
};
