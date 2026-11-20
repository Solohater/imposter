import { WordItem } from './word.types';

export type Role = 'CIVILIAN' | 'IMPOSTER';

export type FairnessMode = 'BALANCED' | 'STRICT_COOLDOWN' | 'PURE_RANDOM';

export type GameMode = 'WORDS' | 'PICTURES' | 'HYBRID';

export interface GameSettings {
  imposterCount: number;
  randomizeImposterCount: boolean;
  minRandomImposters: number;
  maxRandomImposters: number;
  showCategoryToImposters: boolean;
  showExtraHintToImposters: boolean;
  impostersKnowEachOther: boolean;
  fairnessMode: FairnessMode;
  avoidConsecutiveImposter: boolean;
  selectedCategories: string[];
  enableTimer: boolean;
  enableRoleTimer: boolean;
  enableSpeakerTimer: boolean;
  speakingOrderMode: 'SEATING_ORDER' | 'RANDOMIZED';
  discussionDurationSeconds: number;
  roleRevealDurationSeconds: number;
  clueSpeakerDurationSeconds: number;
  hapticsEnabled: boolean;
  soundEnabled: boolean;
  showAmharic: boolean;
  gameMode: GameMode;
}

export interface PlayerAssignment {
  playerId: string;
  playerName: string;
  role: Role;
  secretWord?: string;
  secretWordAmharic?: string;
  imageUrl?: string;
  decoyImageUrl?: string;
  imageAssetId?: string;
  decoyImageAssetId?: string;
  category?: string;
  categoryAmharic?: string;
  categoryIcon?: string;
  extraHint?: string;
  extraHintAmharic?: string;
  teammateNames?: string[];
  revealed: boolean;
  isBot?: boolean;
}

export interface RoundState {
  roundIndex: number; // 1-based match index
  investigationPhaseIndex: number; // 1-based investigation sub-round within this match
  activeWord: WordItem;
  imposterCount: number;
  assignments: Record<string, PlayerAssignment>;
  currentTurnPlayerIndex: number;
  speakingOrderPlayerIds: string[];
  playerClues?: Record<string, string>;
  startingPlayerId: string;
  eliminatedPlayerIds: string[];
  lastEliminatedPlayerId?: string;
  isVoteSkipped: boolean;
  isGameOver: boolean;
  winnerRole?: Role;
  pointsAwarded: Record<string, number>;
}
