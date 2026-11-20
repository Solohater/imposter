import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Player, PlayerGroup } from '../types/player.types';

export const AVATAR_PALETTE = [
  '#00E676', // Neon Green
  '#00E5FF', // Cyan
  '#FF9100', // Amber
  '#FF5252', // Coral Red
  '#E040FB', // Purple
  '#FFD600', // Yellow
  '#7C4DFF', // Deep Indigo
  '#00B0FF', // Sky Blue
  '#1DE9B6', // Teal
  '#FF4081', // Pink
  '#76FF03', // Lime
  '#FF6E40', // Deep Orange
];

interface PlayerState {
  players: Player[];
  savedGroups: PlayerGroup[];
  addPlayer: (name: string, avatarColor?: string) => void;
  addBot: (personality?: 'CAUTIOUS' | 'BOLD' | 'DECEPTIVE') => void;
  removePlayer: (id: string) => void;
  togglePlayerActive: (id: string) => void;
  updatePlayerName: (id: string, name: string) => void;
  updatePlayerColor: (id: string, color: string) => void;
  reorderPlayers: (reordered: Player[]) => void;
  movePlayer: (index: number, direction: 'UP' | 'DOWN') => void;
  reorderToIndex: (fromIndex: number, toIndex: number) => void;
  saveCurrentGroup: (name: string) => void;
  loadGroup: (groupId: string) => void;
  deleteGroup: (groupId: string) => void;
  awardPoints: (pointsAwarded: Record<string, number>) => void;
  resetScores: () => void;
}

const INITIAL_PLAYERS: Player[] = [
  { id: 'p1', name: 'Alex', avatarColor: AVATAR_PALETTE[0], isActive: true, score: 0 },
  { id: 'p2', name: 'Sarah', avatarColor: AVATAR_PALETTE[1], isActive: true, score: 0 },
  { id: 'p3', name: 'Jordan', avatarColor: AVATAR_PALETTE[2], isActive: true, score: 0 },
  { id: 'p4', name: 'Emma', avatarColor: AVATAR_PALETTE[3], isActive: true, score: 0 },
  { id: 'p5', name: 'Leo', avatarColor: AVATAR_PALETTE[4], isActive: true, score: 0 },
  { id: 'p6', name: 'Maya', avatarColor: AVATAR_PALETTE[5], isActive: true, score: 0 },
];

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set) => ({
      players: INITIAL_PLAYERS,
      savedGroups: [],

      addPlayer: (name: string, avatarColor?: string) => {
        const trimmed = name.trim();
        if (!trimmed) return;

        set((state) => {
          const color =
            avatarColor ||
            AVATAR_PALETTE[state.players.length % AVATAR_PALETTE.length];
          const newPlayer: Player = {
            id: 'player_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            name: trimmed,
            avatarColor: color,
            isActive: true,
            score: 0,
            isBot: false,
          };
          return { players: [...state.players, newPlayer] };
        });
      },

      addBot: (personality?: 'CAUTIOUS' | 'BOLD' | 'DECEPTIVE') => {
        const BOT_NAMES = ['Bot Nova', 'Bot Echo', 'Bot Cyber', 'Bot Spark', 'Bot Pixel', 'Bot Quantum', 'Bot Apex'];
        const PERSONALITIES: ('CAUTIOUS' | 'BOLD' | 'DECEPTIVE')[] = ['CAUTIOUS', 'BOLD', 'DECEPTIVE'];

        set((state) => {
          const existingNames = new Set(state.players.map((p) => p.name));
          let chosenName = BOT_NAMES.find((n) => !existingNames.has(n));
          if (!chosenName) {
            chosenName = `Bot ${state.players.filter((p) => p.isBot).length + 1}`;
          }

          const botColor = AVATAR_PALETTE[(state.players.length * 3) % AVATAR_PALETTE.length];
          const assignedPersonality =
            personality || PERSONALITIES[Math.floor(Math.random() * PERSONALITIES.length)];

          const newBot: Player = {
            id: 'bot_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            name: chosenName,
            avatarColor: botColor,
            isActive: true,
            score: 0,
            isBot: true,
            botPersonality: assignedPersonality,
          };

          return { players: [...state.players, newBot] };
        });
      },

      removePlayer: (id: string) =>
        set((state) => ({
          players: state.players.filter((p) => p.id !== id),
        })),

      togglePlayerActive: (id: string) =>
        set((state) => ({
          players: state.players.map((p) =>
            p.id === id ? { ...p, isActive: !p.isActive } : p
          ),
        })),

      updatePlayerName: (id: string, name: string) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        set((state) => ({
          players: state.players.map((p) =>
            p.id === id ? { ...p, name: trimmed } : p
          ),
        }));
      },

      updatePlayerColor: (id: string, color: string) =>
        set((state) => ({
          players: state.players.map((p) =>
            p.id === id ? { ...p, avatarColor: color } : p
          ),
        })),

      reorderPlayers: (reordered: Player[]) =>
        set({ players: reordered }),

      movePlayer: (index: number, direction: 'UP' | 'DOWN') => {
        set((state) => {
          const targetIndex = direction === 'UP' ? index - 1 : index + 1;
          if (targetIndex < 0 || targetIndex >= state.players.length) return state;
          const reordered = [...state.players];
          const temp = reordered[index];
          reordered[index] = reordered[targetIndex];
          reordered[targetIndex] = temp;
          return { players: reordered };
        });
      },

      reorderToIndex: (fromIndex: number, toIndex: number) => {
        set((state) => {
          if (
            fromIndex < 0 ||
            fromIndex >= state.players.length ||
            toIndex < 0 ||
            toIndex >= state.players.length ||
            fromIndex === toIndex
          ) {
            return state;
          }
          const reordered = [...state.players];
          const [moved] = reordered.splice(fromIndex, 1);
          reordered.splice(toIndex, 0, moved);
          return { players: reordered };
        });
      },

      saveCurrentGroup: (name: string) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        set((state) => {
          const newGroup: PlayerGroup = {
            id: 'group_' + Date.now(),
            name: trimmed,
            players: JSON.parse(JSON.stringify(state.players)),
            createdAt: Date.now(),
          };
          return { savedGroups: [...state.savedGroups, newGroup] };
        });
      },

      loadGroup: (groupId: string) =>
        set((state) => {
          const group = state.savedGroups.find((g) => g.id === groupId);
          if (!group) return state;
          return { players: JSON.parse(JSON.stringify(group.players)) };
        }),

      deleteGroup: (groupId: string) =>
        set((state) => ({
          savedGroups: state.savedGroups.filter((g) => g.id !== groupId),
        })),

      awardPoints: (pointsAwarded: Record<string, number>) =>
        set((state) => ({
          players: state.players.map((p) => ({
            ...p,
            score: p.score + (pointsAwarded[p.id] || 0),
          })),
        })),

      resetScores: () =>
        set((state) => ({
          players: state.players.map((p) => ({ ...p, score: 0 })),
        })),
    }),
    {
      name: 'imposter-players-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
