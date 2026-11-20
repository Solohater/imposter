export interface UserProfile {
  id: string;
  name: string;
  avatarUri?: string | null;
  avatarColor: string;
  avatarIcon: string;
}

export const AVATAR_COLORS = [
  '#00E5FF', // Neon Cyan
  '#39FF14', // Neon Green
  '#FF9100', // Neon Orange
  '#FF0055', // Neon Pink
  '#FFE600', // Neon Yellow
  '#9D00FF', // Neon Purple
  '#00B0FF', // Neon Electric Blue
  '#FF1744', // Neon Crimson
];

export const AVATAR_ICONS = [
  'person',
  'skull',
  'game-controller',
  'flash',
  'shield',
  'flame',
  'finger-print',
  'hardware-chip',
  'glasses',
  'nuclear',
  'planet',
  'rocket',
];
