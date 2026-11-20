import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GameSettings, FairnessMode } from '../types/game.types';

interface SettingsState {
  settings: GameSettings;
  updateSettings: (partial: Partial<GameSettings>) => void;
  setImposterCount: (count: number) => void;
  toggleCategory: (categoryId: string) => void;
  selectAllCategories: (allIds: string[]) => void;
  setFairnessMode: (mode: FairnessMode) => void;
  toggleAmharic: () => void;
  setGameMode: (mode: GameSettings['gameMode']) => void;
  resetToDefaults: () => void;
}

const DEFAULT_SETTINGS: GameSettings = {
  imposterCount: 1,
  randomizeImposterCount: false,
  minRandomImposters: 1,
  maxRandomImposters: 2,
  showCategoryToImposters: true,
  showExtraHintToImposters: false,
  impostersKnowEachOther: false,
  fairnessMode: 'PURE_RANDOM',
  avoidConsecutiveImposter: false,
  selectedCategories: ['animals', 'food', 'objects', 'places', 'movies', 'jobs', 'activities'],
  enableTimer: false,
  enableRoleTimer: true,
  enableSpeakerTimer: true,
  speakingOrderMode: 'SEATING_ORDER',
  discussionDurationSeconds: 120,
  roleRevealDurationSeconds: 20,
  clueSpeakerDurationSeconds: 15,
  hapticsEnabled: true,
  soundEnabled: true,
  showAmharic: true,
  gameMode: 'WORDS',
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,

      updateSettings: (partial) =>
        set((state) => ({
          settings: { ...state.settings, ...partial },
        })),

      setImposterCount: (count) =>
        set((state) => ({
          settings: { ...state.settings, imposterCount: count },
        })),

      toggleCategory: (categoryId) =>
        set((state) => {
          const current = state.settings.selectedCategories;
          const exists = current.includes(categoryId);
          const next = exists
            ? current.filter((id) => id !== categoryId)
            : [...current, categoryId];
          return {
            settings: { ...state.settings, selectedCategories: next },
          };
        }),

      selectAllCategories: (allIds) =>
        set((state) => ({
          settings: { ...state.settings, selectedCategories: allIds },
        })),

      setFairnessMode: (mode) =>
        set((state) => ({
          settings: { ...state.settings, fairnessMode: mode },
        })),

      toggleAmharic: () =>
        set((state) => ({
          settings: { ...state.settings, showAmharic: !state.settings.showAmharic },
        })),

      setGameMode: (mode) =>
        set((state) => ({
          settings: { ...state.settings, gameMode: mode },
        })),

      resetToDefaults: () =>
        set({
          settings: DEFAULT_SETTINGS,
        }),
    }),
    {
      name: 'imposter-settings-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
