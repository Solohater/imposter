import { Player, PlayerSessionStats } from '../types/player.types';
import { FairnessMode } from '../types/game.types';

export interface SelectionInput {
  players: Player[];
  imposterCount: number;
  fairnessMode: FairnessMode;
  avoidConsecutive: boolean;
  currentRoundIndex: number; // 1-based
  sessionStats: Record<string, PlayerSessionStats>;
}

export interface SelectionResult {
  imposterIds: string[];
  selectionWeights: Record<string, number>;
  excludedIds: string[];
}

export class FairnessSelector {
  /**
   * Selects imposters using the chosen fairness strategy.
   */
  public static selectImposters(input: SelectionInput): SelectionResult {
    const {
      players,
      imposterCount,
      fairnessMode,
      avoidConsecutive,
      currentRoundIndex,
      sessionStats,
    } = input;

    const activePlayers = players.filter((p) => p.isActive);
    const n = activePlayers.length;

    if (n < 3) {
      throw new Error('At least 3 active players are required to select imposters.');
    }

    const clampedImposters = Math.max(1, Math.min(imposterCount, n - 1));

    // Pure Random: True Fisher-Yates uniform shuffle
    if (fairnessMode === 'PURE_RANDOM') {
      const pool = [...activePlayers];
      // Fisher-Yates (Knuth) unbiased shuffle
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = pool[i];
        pool[i] = pool[j];
        pool[j] = temp;
      }

      const chosen = pool.slice(0, clampedImposters).map((p) => p.id);
      const weights: Record<string, number> = {};
      activePlayers.forEach((p) => (weights[p.id] = 1));
      return {
        imposterIds: chosen,
        selectionWeights: weights,
        excludedIds: [],
      };
    }

    // Identify players who were imposters in the immediate previous round
    const prevRoundIndex = currentRoundIndex - 1;
    const previousImposters = activePlayers.filter((p) => {
      const stat = sessionStats[p.id];
      return stat && stat.lastImposterRoundIndex === prevRoundIndex;
    });

    let eligiblePool: Player[] = [];
    const excludedIds: string[] = [];

    const shouldAvoidConsecutive =
      avoidConsecutive && (fairnessMode === 'STRICT_COOLDOWN' || fairnessMode === 'BALANCED');

    if (shouldAvoidConsecutive && previousImposters.length > 0) {
      // Exclude previous-round imposters if candidate pool has enough members
      const nonPrevious = activePlayers.filter((p) => {
        const stat = sessionStats[p.id];
        return !stat || stat.lastImposterRoundIndex !== prevRoundIndex;
      });

      if (nonPrevious.length >= clampedImposters) {
        eligiblePool = [...nonPrevious];
        previousImposters.forEach((p) => excludedIds.push(p.id));
      } else {
        // Pool is too small to exclude all previous imposters (e.g. 4 players, 3 imposters).
        // Include all non-previous players first
        eligiblePool = [...nonPrevious];

        // Sort previous imposters by least lifetime/session imposter count, then by lowest streak
        const sortedPrevious = [...previousImposters].sort((a, b) => {
          const statA = sessionStats[a.id]?.imposterCount ?? 0;
          const statB = sessionStats[b.id]?.imposterCount ?? 0;
          if (statA !== statB) return statA - statB;
          return Math.random() - 0.5;
        });

        const needed = clampedImposters - eligiblePool.length;
        for (let i = 0; i < sortedPrevious.length; i++) {
          if (i < needed) {
            eligiblePool.push(sortedPrevious[i]);
          } else {
            excludedIds.push(sortedPrevious[i].id);
          }
        }
      }
    } else {
      eligiblePool = [...activePlayers];
    }

    // Calculate inverse frequency weights: W_i = 1 / (imposterCount + 1)^2
    const weights: Record<string, number> = {};
    for (const player of activePlayers) {
      if (excludedIds.includes(player.id)) {
        weights[player.id] = 0;
        continue;
      }

      const stat = sessionStats[player.id];
      const count = stat?.imposterCount ?? 0;

      if (fairnessMode === 'STRICT_COOLDOWN') {
        // Strict cooldown gives heavy bonus to 0-count players
        weights[player.id] = count === 0 ? 100 : Math.max(1, Math.round(10 / (count + 1)));
      } else {
        // Balanced Randomness: quadratic inverse
        // 0 times => weight 1.0 (or 100)
        // 1 time => weight 0.25 (or 25)
        // 2 times => weight 0.11 (or 11)
        // 3 times => weight 0.06 (or 6)
        weights[player.id] = Math.round(100 / Math.pow(count + 1, 2));
      }
    }

    // Weighted selection without replacement
    const chosenIds: string[] = [];
    let candidatePool = [...eligiblePool];

    for (let step = 0; step < clampedImposters; step++) {
      if (candidatePool.length === 0) break;

      const totalWeight = candidatePool.reduce((sum, p) => sum + (weights[p.id] || 1), 0);
      let threshold = Math.random() * totalWeight;

      let selectedPlayer = candidatePool[0];
      for (const candidate of candidatePool) {
        const w = weights[candidate.id] || 1;
        if (threshold <= w) {
          selectedPlayer = candidate;
          break;
        }
        threshold -= w;
      }

      chosenIds.push(selectedPlayer.id);
      candidatePool = candidatePool.filter((p) => p.id !== selectedPlayer.id);
    }

    return {
      imposterIds: chosenIds,
      selectionWeights: weights,
      excludedIds,
    };
  }
}
