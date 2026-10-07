import { AbstractGameEngine } from '../types';
import { DiceBid } from './types';

export function rollDiceSet(count = 5): number[] {
  return Array.from({ length: count }, () => Math.floor(Math.random() * 6) + 1);
}

export function evaluateBluff(dice: number[], bid: DiceBid, simulatedBonus = 2): { isBluff: boolean; matchCount: number } {
  const matchCount = dice.filter((d) => d === bid.face).length + simulatedBonus;
  return {
    isBluff: matchCount < bid.count,
    matchCount,
  };
}

export class SkullBonesGameLogic extends AbstractGameEngine<
  { currentBid: DiceBid; dice: number[] },
  { type: 'bid' | 'bluff'; bid?: DiceBid }
> {
  readonly gameId = 'skull-bones' as const;
  readonly title = "Liar's Dice: Duel";

  initialize() {
    return {
      currentBid: { count: 2, face: 4 },
      dice: rollDiceSet(5),
    };
  }

  processAction(
    state: { currentBid: DiceBid; dice: number[] },
    action: { type: 'bid' | 'bluff'; bid?: DiceBid }
  ) {
    if (action.type === 'bid' && action.bid) {
      state.currentBid = action.bid;
    }
    return state;
  }

  calculateScores(): Record<string, number> {
    return {};
  }

  checkGameOver(): boolean {
    return false;
  }
}
