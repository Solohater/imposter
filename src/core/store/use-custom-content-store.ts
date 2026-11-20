import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CategoryInfo, WordItem } from '../types/word.types';
import { CATEGORIES, WORD_BANK } from '../data/words';

interface CustomContentState {
  customCategories: CategoryInfo[];
  customItems: WordItem[];

  // Actions
  addCategory: (cat: {
    name: string;
    nameAmharic?: string;
    icon?: string;
    description?: string;
    descriptionAmharic?: string;
  }) => CategoryInfo;
  deleteCategory: (categoryId: string) => void;

  addItem: (item: {
    word: string;
    wordAmharic?: string;
    category: string;
    categoryAmharic?: string;
    extraHint: string;
    extraHintAmharic?: string;
    imageUrl?: string;
    decoyImageUrl?: string;
    botClues?: string[];
  }) => WordItem;
  deleteItem: (itemId: string) => void;

  // Selectors / Helpers
  getCombinedCategories: () => CategoryInfo[];
  getCombinedWords: () => WordItem[];
  resetCustomContent: () => void;
}

export const useCustomContentStore = create<CustomContentState>()(
  persist(
    (set, get) => ({
      customCategories: [],
      customItems: [],

      addCategory: (cat) => {
        const id = 'custom_cat_' + Date.now();
        const newCat: CategoryInfo = {
          id,
          name: cat.name.trim(),
          nameAmharic: cat.nameAmharic?.trim(),
          icon: cat.icon || 'star',
          description: cat.description?.trim() || 'Custom user-created category',
          descriptionAmharic: cat.descriptionAmharic?.trim(),
          wordCount: 0,
          isCustom: true,
        };

        set((state) => ({
          customCategories: [...state.customCategories, newCat],
        }));

        return newCat;
      },

      deleteCategory: (categoryId: string) => {
        const cat = get().customCategories.find((c) => c.id === categoryId);
        set((state) => ({
          customCategories: state.customCategories.filter((c) => c.id !== categoryId),
          customItems: state.customItems.filter(
            (i) => i.category.toLowerCase() !== cat?.name.toLowerCase()
          ),
        }));
      },

      addItem: (item) => {
        const id = 'custom_item_' + Date.now();
        const newItem: WordItem = {
          id,
          word: item.word.trim(),
          wordAmharic: item.wordAmharic?.trim(),
          category: item.category.trim(),
          categoryAmharic: item.categoryAmharic?.trim(),
          extraHint: item.extraHint.trim(),
          extraHintAmharic: item.extraHintAmharic?.trim(),
          imageUrl: item.imageUrl,
          decoyImageUrl: item.decoyImageUrl,
          botClues: item.botClues || [item.word],
          isCustom: true,
        };

        set((state) => {
          const updatedItems = [...state.customItems, newItem];
          // Update category wordCount
          const updatedCats = state.customCategories.map((c) => {
            if (c.name.toLowerCase() === item.category.toLowerCase()) {
              return { ...c, wordCount: c.wordCount + 1 };
            }
            return c;
          });

          return {
            customItems: updatedItems,
            customCategories: updatedCats,
          };
        });

        return newItem;
      },

      deleteItem: (itemId: string) => {
        const item = get().customItems.find((i) => i.id === itemId);
        set((state) => {
          const updatedItems = state.customItems.filter((i) => i.id !== itemId);
          const updatedCats = state.customCategories.map((c) => {
            if (item && c.name.toLowerCase() === item.category.toLowerCase()) {
              return { ...c, wordCount: Math.max(0, c.wordCount - 1) };
            }
            return c;
          });

          return {
            customItems: updatedItems,
            customCategories: updatedCats,
          };
        });
      },

      getCombinedCategories: () => {
        const customCats = get().customCategories;
        return [...CATEGORIES, ...customCats];
      },

      getCombinedWords: () => {
        const custom = get().customItems;
        return [...WORD_BANK, ...custom];
      },

      resetCustomContent: () => {
        set({ customCategories: [], customItems: [] });
      },
    }),
    {
      name: 'imposter-custom-content-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
