import { soundstage } from '../../utils/audio';
import type { PokerSuit, PokerCard, DoomedMinePhase } from './types';

export const SUIT_COLORS: Record<PokerSuit, string> = {
  spades: '#1c1511',
  hearts: '#d33833',
  diamonds: '#b72722',
  clubs: '#1c1511',
};

export const SUIT_LABELS: Record<PokerSuit, string> = {
  spades: 'Picas',
  hearts: 'Corazones',
  diamonds: 'Diamantes',
  clubs: 'Tréboles',
};

export const RANK_NAMES: Record<string, string> = {
  '2': 'Doses',
  '3': 'Treses',
  '4': 'Cuatros',
  '5': 'Cincos',
  '6': 'Seises',
  '7': 'Sietes',
  '8': 'Ochos',
  '9': 'Nueves',
  '10': 'Dieces',
  J: 'Jotas',
  Q: 'Damas',
  K: 'Reyes',
  A: 'Ases',
};

export interface PhaseMetadata {
  step: number;
  title: string;
  subtitle: string;
  description: string;
}

export const PHASE_METADATA: Record<DoomedMinePhase, PhaseMetadata> = {
  pre_flop: {
    step: 1,
    title: 'EL SONDEO',
    subtitle: '2 Cartas en Mano',
    description: 'Examina tus 2 cartas secretas y elige una ficha de presión estimada.',
  },
  flop: {
    step: 2,
    title: 'EL FLOP',
    subtitle: '3 Rocas Comunitarias',
    description: 'Se abren 3 cartas en la mesa. Ajusta tu ficha si tu jugada ha mejorado.',
  },
  turn: {
    step: 3,
    title: 'EL TURN',
    subtitle: '4ª Roca Comunitaria',
    description: 'Crujen las vigas de la mina. Revisa la solidez de tu combinación.',
  },
  river: {
    step: 4,
    title: 'EL RIVER',
    subtitle: '5ª Roca Comunitaria',
    description: 'Presión máxima. Última oportunidad de ajustar tu viga antes del despeje.',
  },
  showdown: {
    step: 5,
    title: 'EL DESPEJE',
    subtitle: 'Veredicto de la Mina',
    description: 'Se revelan todas las manos: las fichas deben coincidir de menor a mayor.',
  },
  game_over: {
    step: 6,
    title: 'FIN DE LA EXPEDICIÓN',
    subtitle: 'Resultado Final',
    description: 'La cuadrilla concluyó su incursión subterránea.',
  },
};

// Client-side quick poker hand namer for active player feedback
export function evaluateQuickHandName(myCards: PokerCard[], communityCards: PokerCard[]): string {
  const allCards = [...(myCards || []), ...(communityCards || [])];
  if (allCards.length < 2) return 'Esperando reparto...';

  // Count ranks
  const rankCounts: Record<number, number> = {};
  const suitCounts: Record<string, number> = {};
  allCards.forEach((c) => {
    rankCounts[c.value] = (rankCounts[c.value] || 0) + 1;
    suitCounts[c.suit] = (suitCounts[c.suit] || 0) + 1;
  });

  const sortedValues = [...new Set(allCards.map((c) => c.value))].sort((a, b) => b - a);

  // Check flush
  const hasFlush = Object.values(suitCounts).some((count) => count >= 5);

  // Check straight
  let hasStraight = false;
  let straightHigh = 0;
  for (let i = 0; i <= sortedValues.length - 5; i++) {
    if (
      sortedValues[i] - 1 === sortedValues[i + 1] &&
      sortedValues[i] - 2 === sortedValues[i + 2] &&
      sortedValues[i] - 3 === sortedValues[i + 3] &&
      sortedValues[i] - 4 === sortedValues[i + 4]
    ) {
      hasStraight = true;
      straightHigh = sortedValues[i];
      break;
    }
  }
  // Ace-low straight check
  if (!hasStraight && sortedValues.includes(14) && sortedValues.includes(2) && sortedValues.includes(3) && sortedValues.includes(4) && sortedValues.includes(5)) {
    hasStraight = true;
    straightHigh = 5;
  }

  // Check groups
  const quads = Object.entries(rankCounts).filter(([, count]) => count === 4).map(([val]) => Number(val));
  const trips = Object.entries(rankCounts).filter(([, count]) => count === 3).map(([val]) => Number(val)).sort((a, b) => b - a);
  const pairs = Object.entries(rankCounts).filter(([, count]) => count === 2).map(([val]) => Number(val)).sort((a, b) => b - a);

  const getRankName = (val: number) => {
    if (val === 14) return 'Ases';
    if (val === 13) return 'Reyes';
    if (val === 12) return 'Damas';
    if (val === 11) return 'Jotas';
    return `${val}s`;
  };

  const getSingleName = (val: number) => {
    if (val === 14) return 'As';
    if (val === 13) return 'Rey';
    if (val === 12) return 'Dama';
    if (val === 11) return 'Jota';
    return `${val}`;
  };

  if (hasFlush && hasStraight) return `Escalera de Color (al ${getSingleName(straightHigh)})`;
  if (quads.length > 0) return `Póquer de ${getRankName(quads[0])}`;
  if (trips.length > 0 && (pairs.length > 0 || trips.length > 1)) {
    const pairVal = trips.length > 1 ? trips[1] : pairs[0];
    return `Full House (${getRankName(trips[0])} y ${getRankName(pairVal)})`;
  }
  if (hasFlush) return 'Color';
  if (hasStraight) return `Escalera (al ${getSingleName(straightHigh)})`;
  if (trips.length > 0) return `Trío de ${getRankName(trips[0])}`;
  if (pairs.length >= 2) return `Doble Pareja (${getRankName(pairs[0])} y ${getRankName(pairs[1])})`;
  if (pairs.length === 1) return `Pareja de ${getRankName(pairs[0])}`;

  // High card
  const high = Math.max(...allCards.map((c) => c.value));
  return `Carta Alta (${getSingleName(high)})`;
}

// Sound effects wrapper using soundstage
export function playTokenSelectSound(step = 0) {
  soundstage.playTileSelect(step);
}

export function playConfirmSound() {
  soundstage.playRoundBell();
}

export function playSuccessSound() {
  soundstage.playVictoryFanfare();
}

export function playCaveInSound() {
  soundstage.playBulbHorn();
}
