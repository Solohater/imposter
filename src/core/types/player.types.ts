export interface Player {
  id: string;
  name: string;
  avatarColor: string;
  isActive: boolean;
  score: number;
  isBot?: boolean;
  botPersonality?: 'CAUTIOUS' | 'BOLD' | 'DECEPTIVE';
}

export interface PlayerGroup {
  id: string;
  name: string;
  players: Player[];
  createdAt: number;
}

export interface PlayerSessionStats {
  playerId: string;
  imposterCount: number;
  civilianCount: number;
  lastImposterRoundIndex: number; // -1 if never
  consecutiveImposterStreak: number;
}
