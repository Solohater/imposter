import { Player, PlayerSessionStats } from '../types/player.types';
import { WordItem } from '../types/word.types';
import { GameSettings, PlayerAssignment, Role, RoundState } from '../types/game.types';
import { FairnessSelector } from './fairness-selector';
import { CATEGORIES } from '../data/words';

export class GameEngine {
  /**
   * Initializes a new round by choosing a word, selecting imposters,
   * building private assignments according to the settings matrix, and setting the turn order.
   */
  public static startNewRound(
    players: Player[],
    settings: GameSettings,
    roundIndex: number,
    sessionStats: Record<string, PlayerSessionStats>,
    wordBank: WordItem[],
    usedWordIds: Set<string>
  ): {
    roundState: RoundState;
    newSessionStats: Record<string, PlayerSessionStats>;
    updatedUsedWordIds: string[];
  } {
    const activePlayers = players.filter((p) => p.isActive);
    if (activePlayers.length < 3) {
      throw new Error('At least 3 active players are required to start a game.');
    }

    // Determine Imposter count (fixed or randomized within bounds)
    let imposterCount = settings.imposterCount;
    if (settings.randomizeImposterCount) {
      const min = Math.max(1, settings.minRandomImposters);
      const max = Math.min(activePlayers.length - 1, settings.maxRandomImposters);
      imposterCount = Math.floor(Math.random() * (max - min + 1)) + min;
    }
    imposterCount = Math.max(1, Math.min(imposterCount, activePlayers.length - 1));

    // Normalize selected category IDs to lowercase
    const selectedCategorySet = new Set(
      settings.selectedCategories.map((c) => c.toLowerCase().trim())
    );

    const matchesCategory = (w: WordItem): boolean => {
      if (selectedCategorySet.size === 0) return true;
      if (w.categoryId && selectedCategorySet.has(w.categoryId.toLowerCase().trim())) {
        return true;
      }
      const catLower = w.category.toLowerCase().trim();
      if (selectedCategorySet.has(catLower)) return true;

      // Check category info alias (e.g. "food" matches "Food & Drinks")
      const catInfo = CATEGORIES.find(
        (c) => c.name.toLowerCase() === catLower || c.id.toLowerCase() === catLower
      );
      if (catInfo && selectedCategorySet.has(catInfo.id.toLowerCase())) {
        return true;
      }
      return false;
    };

    const categoryFilteredWords = wordBank.filter(matchesCategory);

    // Fallback if category filter returns empty
    let availablePool = categoryFilteredWords.length > 0 ? categoryFilteredWords : wordBank;

    // In Picture Mode, prioritize items that have imageUrl
    const isPictureActive = settings.gameMode === 'PICTURES' || settings.gameMode === 'HYBRID';
    if (isPictureActive) {
      const withImages = availablePool.filter((w) => !!w.imageUrl || !!w.imageAssetId);
      if (withImages.length > 0) {
        availablePool = withImages;
      }
    }

    // Smart Anti-Repetition Shuffle-Bag (Deck System)
    const availablePoolIdSet = new Set(availablePool.map((w) => w.id));
    let unusedWords = availablePool.filter((w) => !usedWordIds.has(w.id));

    let currentUsedIds = Array.from(usedWordIds);
    // If the deck for this pool has been completely exhausted, reset the deck for this pool
    if (unusedWords.length === 0) {
      currentUsedIds = currentUsedIds.filter((id) => !availablePoolIdSet.has(id));
      unusedWords = availablePool;
    }

    const activeWord = unusedWords[Math.floor(Math.random() * unusedWords.length)];
    const updatedUsedWordIds = [...currentUsedIds, activeWord.id];

    // Lookup Category Icon
    const catInfo = CATEGORIES.find(
      (c) => c.name.toLowerCase() === activeWord.category.toLowerCase()
    );
    const categoryIcon = catInfo?.icon || 'pricetag';

    // Select Imposters using the Fair Randomness Engine
    const selection = FairnessSelector.selectImposters({
      players: activePlayers,
      imposterCount,
      fairnessMode: settings.fairnessMode,
      avoidConsecutive: settings.avoidConsecutiveImposter,
      currentRoundIndex: roundIndex,
      sessionStats,
    });

    const imposterIdSet = new Set(selection.imposterIds);

    // Get imposter player names for teammate visibility
    const imposterNames = activePlayers
      .filter((p) => imposterIdSet.has(p.id))
      .map((p) => p.name);

    // Build role assignments with strict information isolation
    const assignments: Record<string, PlayerAssignment> = {};

    for (const player of activePlayers) {
      const isImposter = imposterIdSet.has(player.id);

      if (!isImposter) {
        // Civilians receive secret word or image (depending on gameMode).
        // Category and extra hints are strictly hidden from civilians.
        assignments[player.id] = {
          playerId: player.id,
          playerName: player.name,
          role: 'CIVILIAN',
          secretWord: settings.gameMode === 'PICTURES' ? undefined : activeWord.word,
          secretWordAmharic:
            settings.showAmharic && settings.gameMode !== 'PICTURES'
              ? activeWord.wordAmharic
              : undefined,
          imageUrl: isPictureActive ? activeWord.imageUrl : undefined,
          decoyImageUrl: undefined,
          imageAssetId: isPictureActive ? activeWord.imageAssetId : undefined,
          decoyImageAssetId: undefined,
          category: undefined,
          categoryAmharic: undefined,
          categoryIcon: undefined,
          extraHint: undefined,
          extraHintAmharic: undefined,
          revealed: false,
          isBot: player.isBot,
        };
      } else {
        // Imposters see only what settings explicitly allow
        const otherTeammates = imposterNames.filter((name) => name !== player.name);

        assignments[player.id] = {
          playerId: player.id,
          playerName: player.name,
          role: 'IMPOSTER',
          secretWord: undefined,
          secretWordAmharic: undefined,
          imageUrl: undefined,
          decoyImageUrl: isPictureActive ? activeWord.decoyImageUrl : undefined,
          imageAssetId: undefined,
          decoyImageAssetId: isPictureActive ? activeWord.decoyImageAssetId : undefined,
          category: settings.showCategoryToImposters ? activeWord.category : undefined,
          categoryAmharic:
            settings.showCategoryToImposters && settings.showAmharic
              ? activeWord.categoryAmharic
              : undefined,
          categoryIcon: settings.showCategoryToImposters ? categoryIcon : undefined,
          extraHint: settings.showExtraHintToImposters ? activeWord.extraHint : undefined,
          extraHintAmharic:
            settings.showExtraHintToImposters && settings.showAmharic
              ? activeWord.extraHintAmharic
              : undefined,
          teammateNames:
            settings.impostersKnowEachOther && imposterCount > 1 ? otherTeammates : undefined,
          revealed: false,
          isBot: player.isBot,
        };
      }
    }

    // Determine speaking sequence: Clockwise seating order or Fisher-Yates shuffle
    const speakingOrderPlayerIds: string[] = [];
    if (settings.speakingOrderMode === 'SEATING_ORDER') {
      const startIdx = Math.floor(Math.random() * activePlayers.length);
      for (let i = 0; i < activePlayers.length; i++) {
        speakingOrderPlayerIds.push(activePlayers[(startIdx + i) % activePlayers.length].id);
      }
    } else {
      const randomized = activePlayers.map((p) => p.id);
      for (let i = randomized.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [randomized[i], randomized[j]] = [randomized[j], randomized[i]];
      }
      speakingOrderPlayerIds.push(...randomized);
    }
    const startingPlayerId = speakingOrderPlayerIds[0];

    // Update Session Stats with this round's selections
    const newSessionStats = { ...sessionStats };
    for (const player of activePlayers) {
      const isImposter = imposterIdSet.has(player.id);
      const prev = newSessionStats[player.id] || {
        playerId: player.id,
        imposterCount: 0,
        civilianCount: 0,
        lastImposterRoundIndex: -1,
        consecutiveImposterStreak: 0,
      };

      if (isImposter) {
        newSessionStats[player.id] = {
          ...prev,
          imposterCount: prev.imposterCount + 1,
          lastImposterRoundIndex: roundIndex,
          consecutiveImposterStreak:
            prev.lastImposterRoundIndex === roundIndex - 1 ? prev.consecutiveImposterStreak + 1 : 1,
        };
      } else {
        newSessionStats[player.id] = {
          ...prev,
          civilianCount: prev.civilianCount + 1,
          consecutiveImposterStreak: 0,
        };
      }
    }

    const roundState: RoundState = {
      roundIndex,
      investigationPhaseIndex: 1,
      activeWord,
      imposterCount,
      assignments,
      currentTurnPlayerIndex: 0,
      speakingOrderPlayerIds,
      startingPlayerId,
      eliminatedPlayerIds: [],
      isVoteSkipped: false,
      isGameOver: false,
      pointsAwarded: {},
    };

    return { roundState, newSessionStats, updatedUsedWordIds };
  }

  /**
   * Evaluates the outcome when a player is voted out or when vote is skipped.
   *
   * Win Rules:
   * 1. Civilians Win: When ALL imposters have been voted out (survivingImposters === 0).
   * 2. Imposters Win: Imposters win when their number is equal to or greater than the civilians
   *    ONLY when there are 2 or fewer civilians left:
   *    - 1:1 -> Imposters win
   *    - 2:1 -> Imposters win
   *    - 3:2 -> Imposters win
   *    - 4:2 -> Imposters win
   *    - 0 civilians left -> Imposters win
   * 3. Game Continues: While 3 or more civilians remain (e.g. 3:3, 4:3, 2:3), or when tied 2:2,
   *    the game continues because civilians still have a fighting chance to vote out imposters.
   *    Crucially, during voting, players are NEVER told whether an eliminated player was imposter or civilian!
   */
  public static evaluateVoteOutcome(
    roundState: RoundState,
    eliminatedPlayerInput?: string | string[]
  ): {
    isGameOver: boolean;
    winnerRole?: Role;
    pointsAwarded: Record<string, number>;
    survivingImpostersCount: number;
    survivingCiviliansCount: number;
    eliminatedPlayerIds: string[];
  } {
    const assignments = Object.values(roundState.assignments);
    const imposterIds = assignments.filter((a) => a.role === 'IMPOSTER').map((a) => a.playerId);
    const civilianIds = assignments.filter((a) => a.role === 'CIVILIAN').map((a) => a.playerId);

    const eliminatedPlayerIds = [...roundState.eliminatedPlayerIds];
    const toAdd = Array.isArray(eliminatedPlayerInput)
      ? eliminatedPlayerInput
      : eliminatedPlayerInput
      ? [eliminatedPlayerInput]
      : [];

    for (const id of toAdd) {
      if (id && !eliminatedPlayerIds.includes(id)) {
        eliminatedPlayerIds.push(id);
      }
    }

    const survivingImposters = imposterIds.filter((id) => !eliminatedPlayerIds.includes(id));
    const survivingCivilians = civilianIds.filter((id) => !eliminatedPlayerIds.includes(id));

    const survivingImpostersCount = survivingImposters.length;
    const survivingCiviliansCount = survivingCivilians.length;

    let isGameOver = false;
    let winnerRole: Role | undefined = undefined;
    const pointsAwarded: Record<string, number> = {};

    // Condition 1: All imposters have been eliminated -> Civilians Win!
    if (survivingImpostersCount === 0) {
      isGameOver = true;
      winnerRole = 'CIVILIAN';
      civilianIds.forEach((id) => (pointsAwarded[id] = 5));
      imposterIds.forEach((id) => (pointsAwarded[id] = 0));
    }
    // Condition 2: Imposters win when their number >= civilians ONLY when 2 or fewer civilians remain
    else if (
      survivingCiviliansCount === 0 ||
      (survivingCiviliansCount === 1 && survivingImpostersCount >= 1) ||
      (survivingCiviliansCount === 2 && survivingImpostersCount > 2)
    ) {
      isGameOver = true;
      winnerRole = 'IMPOSTER';
      imposterIds.forEach((id) => (pointsAwarded[id] = 15));
      civilianIds.forEach((id) => (pointsAwarded[id] = 0));
    }
    // Condition 3: Otherwise (e.g. 2:2, 3:3, 4:3, 2:3, or 3+ civilians remain) -> Game continues!
    else {
      isGameOver = false;
      winnerRole = undefined;
    }

    return {
      isGameOver,
      winnerRole,
      pointsAwarded,
      survivingImpostersCount,
      survivingCiviliansCount,
      eliminatedPlayerIds,
    };
  }
}
