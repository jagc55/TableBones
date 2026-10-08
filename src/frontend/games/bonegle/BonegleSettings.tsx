import React from 'react';
import { GameSettingsFormProps } from '../../types';
import { FlagIcon } from '../../components/FlagIcon';
import { soundstage } from '../../utils/audio';

export const BonegleSettings: React.FC<GameSettingsFormProps> = ({
  settings,
  onUpdateSetting,
  isHost,
  stepOffset = 4,
}) => {
  const gridSize = settings.bonegleGridSize || 5;
  const lang = settings.dictionaryLang || 'es';

  return (
    <>
      <div className="form-group">
        <label className="group-label">{stepOffset}. BONEGLE BOARD SIZE</label>
        <div className="clock-options-row">
          {([4, 5, 6] as const).map((sz) => (
            <button
              key={sz}
              type="button"
              disabled={!isHost}
              onClick={() => {
                soundstage.playTap();
                onUpdateSetting('bonegleGridSize', sz);
              }}
              className={`duration-chip ${gridSize === sz ? 'duration-selected' : ''}`}
            >
              <span>{sz}x{sz} {sz === 4 ? 'Classic' : sz === 5 ? 'Pro (Recommended)' : 'Heavyweight'}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label className="group-label">{stepOffset + 1}. DICTIONARY LANGUAGE</label>
        <div className="clock-options-row">
          <button
            type="button"
            disabled={!isHost}
            onClick={() => {
              soundstage.playTap();
              onUpdateSetting('dictionaryLang', 'en');
            }}
            className={`duration-chip ${lang === 'en' ? 'duration-selected' : ''}`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <FlagIcon country="uk" size={16} />
            <span>English</span>
          </button>
          <button
            type="button"
            disabled={!isHost}
            onClick={() => {
              soundstage.playTap();
              onUpdateSetting('dictionaryLang', 'es');
            }}
            className={`duration-chip ${lang === 'es' ? 'duration-selected' : ''}`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <FlagIcon country="es" size={16} />
            <span>Español</span>
          </button>
        </div>
      </div>
    </>
  );
};
