import { GameManifest, Room } from '../../types';
import { BonegleEngine } from './BonegleEngine';
import { BonegleRules } from './BonegleRules';
import { BonegleSettings } from './BonegleSettings';
import { FlagIcon } from '../../components/FlagIcon';

export const bonegleManifest: GameManifest = {
  id: 'bonegle',
  definition: {
    id: 'bonegle',
    title: 'Bonegle',
    subtitle: 'Fast-Paced Word Scramble',
    description: 'Find as many words as you can by connecting adjacent letters in any direction before time runs out!',
    minPlayers: 2,
    maxPlayers: 6,
    estimatedTimeMin: 2,
    iconName: 'Swords',
    badge: 'NEW',
  },
  hasRoundTimer: true,
  hideContinuousScoreboard: true,
  engine: BonegleEngine,
  rulesComponent: BonegleRules,
  settingsComponent: BonegleSettings,
  lobbyMetaChips: (room: Room) => (
    <>
      <span className="meta-chip">
        <strong>Grid:</strong> {room.settings.bonegleGridSize || 5}x{room.settings.bonegleGridSize || 5}
      </span>
      <span className="meta-chip" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
        <strong>Dictionary:</strong>
        <FlagIcon country={room.settings.dictionaryLang === 'es' ? 'es' : 'uk'} size={14} />
        <span>{room.settings.dictionaryLang === 'es' ? 'Español' : 'English'}</span>
      </span>
      <span
        className="meta-chip"
        style={{ backgroundColor: 'var(--color-golden-buttercup)', color: 'var(--color-ink-black)', fontWeight: 700 }}
      >
        ★ Unique words score x2!
      </span>
    </>
  ),
};
