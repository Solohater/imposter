import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PlayerSessionStats } from '../types/player.types';
import { RoundState, Role } from '../types/game.types';
import { GameEngine } from '../engine/game-engine';
import { usePlayerStore } from './use-player-store';
import { useSettingsStore } from './use-settings-store';
import { useCustomContentStore } from './use-custom-content-store';

export type GamePhase = 'IDLE' | 'REVEAL' | 'CLUES' | 'VOTING' | 'RESULTS';

interface GameState {
  gamePhase: GamePhase;
  currentRound: RoundState | null;
  roundIndex: number;
  sessionStats: Record<string, PlayerSessionStats>;
  usedWordIds: string[];
  history: RoundState[];

  // Actions
  startNewRound: () => boolean;
  markRoleRevealed: (playerId: string) => void;
  proceedToClues: () => void;
  recordPlayerClue: (playerId: string, clue: string) => void;
  proceedToVoting: () => void;
  advanceTurn: () => void;
  continueToNextClueRound: () => void;
  submitVote: (eliminatedPlayerInput?: string | string[]) => {
    isGameOver: boolean;
    winnerRole?: Role;
    eliminatedPlayerId?: string;
    eliminatedPlayerIds?: string[];
  };
  resetSession: () => void;
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      gamePhase: 'IDLE',
      currentRound: null,
      roundIndex: 0,
      sessionStats: {},
      usedWordIds: [],
      history: [],

      startNewRound: () => {
        const { players } = usePlayerStore.getState();
        const { settings } = useSettingsStore.getState();
        const activePlayers = players.filter((p) => p.isActive);

        if (activePlayers.length < 3) {
          return false;
        }

        const nextRoundIndex = get().roundIndex + 1;
        const usedWordSet = new Set(get().usedWordIds);

        const combinedWords = useCustomContentStore.getState().getCombinedWords();

        const { roundState, newSessionStats, updatedUsedWordIds } = GameEngine.startNewRound(
          activePlayers,
          settings,
          nextRoundIndex,
          get().sessionStats,
          combinedWords,
          usedWordSet
        );

        set({
          gamePhase: 'REVEAL',
          roundIndex: nextRoundIndex,
          currentRound: roundState,
          sessionStats: newSessionStats,
          usedWordIds: updatedUsedWordIds,
        });

        return true;
      },

      markRoleRevealed: (playerId: string) => {
        const round = get().currentRound;
        if (!round) return;

        const updatedAssignments = {
          ...round.assignments,
          [playerId]: {
            ...round.assignments[playerId],
            revealed: true,
          },
        };

        set({
          currentRound: {
            ...round,
            assignments: updatedAssignments,
          },
        });
      },

      proceedToClues: () => {
        set({ gamePhase: 'CLUES' });
      },

      recordPlayerClue: (playerId: string, clue: string) => {
        const round = get().currentRound;
        if (!round || !clue.trim()) return;
        set({
          currentRound: {
            ...round,
            playerClues: {
              ...(round.playerClues || {}),
              [playerId]: clue.trim(),
            },
          },
        });
      },

      proceedToVoting: () => {
        set({ gamePhase: 'VOTING' });
      },

      advanceTurn: () => {
        const round = get().currentRound;
        if (!round) return;

        const order = round.speakingOrderPlayerIds || [];
        if (order.length === 0) return;

        const nextIndex = (round.currentTurnPlayerIndex + 1) % order.length;

        set({
          currentRound: {
            ...round,
            currentTurnPlayerIndex: nextIndex,
          },
        });
      },

      continueToNextClueRound: () => {
        const round = get().currentRound;
        if (!round) return;

        const { players } = usePlayerStore.getState();
        const activePlayers = players.filter((p) => p.isActive);
        const survivingIds = activePlayers
          .filter((p) => !round.eliminatedPlayerIds.includes(p.id))
          .map((p) => p.id);

        // Re-randomize turn sequence for the surviving players
        const newSpeakingOrder = [...survivingIds];
        for (let i = newSpeakingOrder.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [newSpeakingOrder[i], newSpeakingOrder[j]] = [newSpeakingOrder[j], newSpeakingOrder[i]];
        }

        set({
          gamePhase: 'CLUES',
          currentRound: {
            ...round,
            investigationPhaseIndex: round.investigationPhaseIndex + 1,
            speakingOrderPlayerIds: newSpeakingOrder,
            startingPlayerId: newSpeakingOrder[0] || round.startingPlayerId,
            currentTurnPlayerIndex: 0,
            lastEliminatedPlayerId: undefined,
          },
        });
      },

      submitVote: (eliminatedPlayerInput?: string | string[]) => {
        const round = get().currentRound;
        if (!round) return { isGameOver: false };

        const toAdd = Array.isArray(eliminatedPlayerInput)
          ? eliminatedPlayerInput
          : eliminatedPlayerInput
          ? [eliminatedPlayerInput]
          : [];
        const firstEliminatedId = toAdd[0];

        const outcome = GameEngine.evaluateVoteOutcome(round, eliminatedPlayerInput);

        if (outcome.isGameOver) {
          // Award points in player store on game over
          usePlayerStore.getState().awardPoints(outcome.pointsAwarded);

          const finishedRound: RoundState = {
            ...round,
            eliminatedPlayerIds: outcome.eliminatedPlayerIds,
            lastEliminatedPlayerId: firstEliminatedId,
            isVoteSkipped: toAdd.length === 0,
            isGameOver: true,
            winnerRole: outcome.winnerRole,
            pointsAwarded: outcome.pointsAwarded,
          };

          set((state) => ({
            gamePhase: 'RESULTS',
            currentRound: finishedRound,
            history: [...state.history, finishedRound],
          }));

          return {
            isGameOver: true,
            winnerRole: outcome.winnerRole,
            eliminatedPlayerId: firstEliminatedId,
            eliminatedPlayerIds: outcome.eliminatedPlayerIds,
          };
        } else {
          // Game continues! Do not end match, keep roles hidden
          const continuedRound: RoundState = {
            ...round,
            eliminatedPlayerIds: outcome.eliminatedPlayerIds,
            lastEliminatedPlayerId: firstEliminatedId,
            isVoteSkipped: toAdd.length === 0,
            isGameOver: false,
          };

          set({
            currentRound: continuedRound,
          });

          return {
            isGameOver: false,
            eliminatedPlayerId: firstEliminatedId,
            eliminatedPlayerIds: outcome.eliminatedPlayerIds,
          };
        }
      },

      resetSession: () => {
        set({
          gamePhase: 'IDLE',
          currentRound: null,
          roundIndex: 0,
          sessionStats: {},
          usedWordIds: [],
          history: [],
        });
        usePlayerStore.getState().resetScores();
      },
    }),
    {
      name: 'imposter-game-session-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
