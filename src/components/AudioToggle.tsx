import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { soundstage } from '../utils/audio';
import { saveAudioMuted, loadAudioMuted } from '../utils/storage';

export const AudioToggle: React.FC = () => {
  const [isMuted, setIsMuted] = useState<boolean>(false);

  useEffect(() => {
    const saved = loadAudioMuted();
    setIsMuted(saved);
    soundstage.setMuted(saved);
  }, []);

  const handleToggle = () => {
    const next = !isMuted;
    setIsMuted(next);
    soundstage.setMuted(next);
    saveAudioMuted(next);
    if (!next) {
      soundstage.playTap();
    }
  };

  return (
    <button
      onClick={handleToggle}
      className={`btn-cel btn-icon-sq ${isMuted ? 'btn-brawl-neutral' : 'btn-brawl-secondary'}`}
      title={isMuted ? 'Unmute Sound Effects' : 'Mute Sound Effects'}
      aria-label="Toggle Sound Effects"
    >
      {isMuted ? (
        <VolumeX size={20} strokeWidth={2.8} />
      ) : (
        <Volume2 size={20} strokeWidth={2.8} />
      )}
    </button>
  );
};
