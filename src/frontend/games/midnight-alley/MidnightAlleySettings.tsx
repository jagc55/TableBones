import React from 'react';
import { GameSettingsFormProps } from '../../types';
import { soundstage } from '../../utils/audio';

export const MidnightAlleySettings: React.FC<GameSettingsFormProps> = ({
  settings,
  onUpdateSetting,
  isHost,
  stepOffset = 4,
}) => {
  const isAdvanced = Boolean(settings.advancedMode);

  return (
    <div className="form-group">
      <label className="group-label">{stepOffset}. MIDNIGHT ALLEY EXPANSION</label>
      <div className="clock-options-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <button
          type="button"
          disabled={!isHost}
          onClick={() => {
            soundstage.playTap();
            onUpdateSetting('advancedMode', false);
          }}
          className={`duration-chip ${!isAdvanced ? 'duration-selected' : ''}`}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: '4px',
            padding: '10px 14px',
            height: 'auto',
            textAlign: 'left',
            backgroundColor: !isAdvanced ? 'var(--color-cuphead-red)' : 'var(--color-glove-ivory)',
            color: !isAdvanced ? '#ffffff' : '#1c1511',
          }}
        >
          <div style={{ fontWeight: 700, fontSize: '13px', color: !isAdvanced ? '#ffffff' : '#1c1511' }}>
            Classic (70 Cards)
          </div>
          <span
            style={{
              fontSize: '11px',
              lineHeight: 1.3,
              color: !isAdvanced ? 'rgba(255, 255, 255, 0.9)' : 'rgba(28, 21, 17, 0.75)',
            }}
          >
            Standard deck: The Boss, Femme Fatales, Gangsters, Chameleon, Alibis, and 4 mob suits.
          </span>
        </button>

        <button
          type="button"
          disabled={!isHost}
          onClick={() => {
            soundstage.playTap();
            onUpdateSetting('advancedMode', true);
          }}
          className={`duration-chip ${isAdvanced ? 'duration-selected' : ''}`}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: '4px',
            padding: '10px 14px',
            height: 'auto',
            textAlign: 'left',
            backgroundColor: isAdvanced ? 'var(--color-cuphead-red)' : 'var(--color-glove-ivory)',
            color: isAdvanced ? '#ffffff' : '#1c1511',
          }}
        >
          <div style={{ fontWeight: 700, fontSize: '13px', color: isAdvanced ? '#ffffff' : '#1c1511' }}>
            Advanced (74 Cards)
          </div>
          <span
            style={{
              fontSize: '11px',
              lineHeight: 1.3,
              color: isAdvanced ? 'rgba(255, 255, 255, 0.9)' : 'rgba(28, 21, 17, 0.75)',
            }}
          >
            Includes The Police, Fat Vinnie, and 2 Black Money Briefcases.
          </span>
        </button>
      </div>
    </div>
  );
};
