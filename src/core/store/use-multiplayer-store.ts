import { create } from 'zustand';
import { NativeHotspot, hotspotEventEmitter } from '../network/hotspot-server.native';
import { scanForLocalRooms } from '../network/room-scanner';
import { PlayerAssignment } from '../types/game.types';
import { UserProfile } from '../types/profile.types';
import { WORD_BANK } from '../data/words';

export const MEMORABLE_ROOM_KEYWORDS = [
  'LION', 'TIGER', 'EAGLE', 'SHARK', 'WOLF', 'BEAR', 'MOON', 'STAR',
  'FIRE', 'HERO', 'COOL', 'YAP', 'CHEF', 'FROG', 'ROSE', 'GOLD',
  'EPIC', 'SWIFT', 'MAGIC', 'RUBY', 'JADE', 'HAWK', 'CAFE', 'PEAK',
  'BOLT', 'WAVE', 'LUCK', 'GAME', 'KING', 'NEON', 'RUSH', 'SURF',
];

export function generateRandomKeyword(): string {
  const idx = Math.floor(Math.random() * MEMORABLE_ROOM_KEYWORDS.length);
  return MEMORABLE_ROOM_KEYWORDS[idx];
}

/**
 * Ensures any local file:// avatar URI is converted to an inline data URI (base64)
 * so it is universally readable across the local network by all connected phones.
 */
export async function normalizeAvatarUri(uri?: string | null): Promise<string | null> {
  if (!uri) return null;
  if (uri.startsWith('data:')) return uri;
  if (uri.startsWith('file://')) {
    try {
      const res = await fetch(uri);
      const blob = await res.blob();
      const b64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      if (b64 && b64.startsWith('data:')) return b64;
    } catch {
      // If conversion fails, return original uri
    }
  }
  return uri;
}

export type MultiplayerRole = 'HOST' | 'CLIENT' | null;
export type MultiplayerPhase = 'LOBBY' | 'REVEAL' | 'DISCUSSION' | 'VOTING' | 'RESULTS';

export interface ConnectedPlayer {
  id: string;
  name: string;
  avatarUri?: string | null;
  avatarColor: string;
  avatarIcon: string;
  isHost?: boolean;
  isBot?: boolean;
  botClue?: string;
  playerClue?: string;
  isReady?: boolean;
  isEliminated?: boolean;
  votesReceived?: number;
}

export interface PublicGameState {
  phase: MultiplayerPhase;
  roomCode: string;
  roomKey: string;
  hostName: string;
  players: ConnectedPlayer[];
  speakingPlayerId: string | null;
  currentRoundIndex: number;
  eliminatedPlayerIds: string[];
  activeCategory: string | null;
  secretWordRevealed: string | null;
  imposterIds: string[];
  winners: 'CIVILIANS' | 'IMPOSTERS' | null;
}

interface MultiplayerState {
  role: MultiplayerRole;
  hostIp: string;
  roomCode: string;
  roomKey: string;
  isConnected: boolean;
  isServerRunning: boolean;
  publicState: PublicGameState;
  myRoleAssignment: PlayerAssignment | null;
  myVoteTargetIds: string[];
  isVotingSubmitted: boolean;
  connectionError: string | null;

  // Host actions
  startHosting: (hostProfile: UserProfile, roomCode?: string, roomKey?: string) => Promise<boolean>;
  setRoomName: (roomName: string) => void;
  setRoomKey: (key: string) => void;
  stopHosting: () => Promise<void>;
  addBot: () => void;
  removePlayer: (playerId: string) => void;
  startMultiplayerRound: (settings: { imposterCount: number; gameMode: string; showAmharic: boolean; selectedCategories: string[] }) => boolean;
  advanceToDiscussion: () => void;
  advanceToVoting: () => void;
  tallyVotesAndConclude: () => void;
  returnToLobby: () => void;

  // Client actions
  joinRoom: (ip: string, profile: UserProfile) => Promise<boolean>;
  joinByRoomKey: (key: string, profile: UserProfile) => Promise<boolean>;
  leaveRoom: () => void;
  pollState: () => Promise<void>;
  fetchMyRole: (playerId: string) => Promise<void>;
  submitReady: (playerId: string) => Promise<void>;
  submitClue: (playerId: string, clue: string) => Promise<void>;
  submitVote: (voterId: string, targetIds: string[]) => Promise<void>;
}

const DEFAULT_PUBLIC_STATE: PublicGameState = {
  phase: 'LOBBY',
  roomCode: 'Agent Lounge',
  roomKey: 'yap',
  hostName: 'Host',
  players: [],
  speakingPlayerId: null,
  currentRoundIndex: 1,
  eliminatedPlayerIds: [],
  activeCategory: null,
  secretWordRevealed: null,
  imposterIds: [],
  winners: null,
};

let pollTimer: ReturnType<typeof setInterval> | null = null;
let eventSubscriptions: { remove: () => void }[] = [];

export const useMultiplayerStore = create<MultiplayerState>()((set, get) => ({
  role: null,
  hostIp: '192.168.43.1',
  roomCode: 'Agent Lounge',
  roomKey: 'yap',
  isConnected: false,
  isServerRunning: false,
  publicState: DEFAULT_PUBLIC_STATE,
  myRoleAssignment: null,
  myVoteTargetIds: [],
  isVotingSubmitted: false,
  connectionError: null,

  // ==========================================
  // HOST IMPLEMENTATION
  // ==========================================
  startHosting: async (hostProfile, customRoomCode, customRoomKey) => {
    try {
      const ip = await NativeHotspot.getLocalIpAddress();
      const success = await NativeHotspot.startServer(8080);
      if (!success) return false;

      const roomName = customRoomCode?.trim() || `${hostProfile.name}'s Room`;
      const roomKey = (customRoomKey?.trim() || generateRandomKeyword()).toLowerCase();
      const normalizedAvatar = await normalizeAvatarUri(hostProfile.avatarUri);

      const hostPlayer: ConnectedPlayer = {
        id: hostProfile.id,
        name: hostProfile.name,
        avatarUri: normalizedAvatar,
        avatarColor: hostProfile.avatarColor,
        avatarIcon: hostProfile.avatarIcon,
        isHost: true,
        isReady: false,
      };

      const initialState: PublicGameState = {
        ...DEFAULT_PUBLIC_STATE,
        roomCode: roomName,
        roomKey,
        hostName: hostProfile.name,
        players: [hostPlayer],
      };

      NativeHotspot.updatePublicState(JSON.stringify(initialState));

      // Cleanup existing listeners if any
      eventSubscriptions.forEach((s) => s.remove());
      eventSubscriptions = [];

      if (hotspotEventEmitter) {
        // Player Join
        const subJoin = hotspotEventEmitter.addListener('onPlayerJoinRequest', (data: any) => {
          try {
            const body = JSON.parse(data.body);
            const current = get().publicState;
            // Prevent duplicates
            const filtered = current.players.filter((p) => p.id !== body.playerId);
            const newPlayer: ConnectedPlayer = {
              id: body.playerId,
              name: body.name || 'Agent',
              avatarUri: body.avatarUri || null,
              avatarColor: body.avatarColor || '#00E5FF',
              avatarIcon: body.avatarIcon || 'person',
              isHost: false,
              isReady: false,
            };
            const updated: PublicGameState = {
              ...current,
              players: [...filtered, newPlayer],
            };
            set({ publicState: updated });
            NativeHotspot.updatePublicState(JSON.stringify(updated));
          } catch {
            // ignore malformed join
          }
        });

        // Player Leave
        const subLeave = hotspotEventEmitter.addListener('onPlayerLeaveRequest', (data: any) => {
          try {
            const body = JSON.parse(data.body);
            const current = get().publicState;
            const updated: PublicGameState = {
              ...current,
              players: current.players.filter((p) => p.id !== body.playerId),
            };
            set({ publicState: updated });
            NativeHotspot.updatePublicState(JSON.stringify(updated));
          } catch {
            // ignore
          }
        });

        // Player Ready
        const subReady = hotspotEventEmitter.addListener('onPlayerReady', (data: any) => {
          try {
            const body = JSON.parse(data.body);
            const current = get().publicState;
            const updated: PublicGameState = {
              ...current,
              players: current.players.map((p) =>
                p.id === body.playerId ? { ...p, isReady: true } : p
              ),
            };
            set({ publicState: updated });
            NativeHotspot.updatePublicState(JSON.stringify(updated));
          } catch {
            // ignore
          }
        });

        // Player Vote
        const subVote = hotspotEventEmitter.addListener('onPlayerVoteSubmitted', (data: any) => {
          try {
            const body = JSON.parse(data.body);
            // Record vote internally on host
            const targetIds: string[] = body.targetIds || [];
            const current = get().publicState;
            const updatedPlayers = current.players.map((p) => {
              if (targetIds.includes(p.id)) {
                return { ...p, votesReceived: (p.votesReceived || 0) + 1 };
              }
              return p;
            });
            const updated: PublicGameState = { ...current, players: updatedPlayers };
            set({ publicState: updated });
            NativeHotspot.updatePublicState(JSON.stringify(updated));
          } catch {
            // ignore
          }
        });

        // Player Clue
        const subClue = hotspotEventEmitter.addListener('onPlayerClueSubmitted', (data: any) => {
          try {
            const body = JSON.parse(data.body);
            const { playerId, clue } = body;
            if (!playerId || !clue) return;
            const current = get().publicState;
            const updatedPlayers = current.players.map((p) =>
              p.id === playerId ? { ...p, playerClue: clue } : p
            );
            const updated: PublicGameState = { ...current, players: updatedPlayers };
            set({ publicState: updated });
            NativeHotspot.updatePublicState(JSON.stringify(updated));
          } catch {
            // ignore
          }
        });

        eventSubscriptions.push(subJoin, subLeave, subReady, subVote, subClue);
      }

      set({
        role: 'HOST',
        hostIp: ip,
        roomCode: roomName,
        isConnected: true,
        isServerRunning: true,
        publicState: initialState,
      });

      return true;
    } catch {
      return false;
    }
  },

  setRoomName: (roomName: string) => {
    const trimmed = roomName.trim();
    if (!trimmed) return;
    const current = get().publicState;
    const updated: PublicGameState = {
      ...current,
      roomCode: trimmed,
    };
    set({ roomCode: trimmed, publicState: updated });
    NativeHotspot.updatePublicState(JSON.stringify(updated));
  },

  setRoomKey: (key: string) => {
    const trimmed = key.trim().toLowerCase();
    if (!trimmed) return;
    const current = get().publicState;
    const updated: PublicGameState = {
      ...current,
      roomKey: trimmed,
    };
    set({ roomKey: trimmed, publicState: updated });
    NativeHotspot.updatePublicState(JSON.stringify(updated));
  },

  stopHosting: async () => {
    eventSubscriptions.forEach((s) => s.remove());
    eventSubscriptions = [];
    await NativeHotspot.stopServer();
    set({
      role: null,
      isServerRunning: false,
      isConnected: false,
      publicState: DEFAULT_PUBLIC_STATE,
      myRoleAssignment: null,
    });
  },

  addBot: () => {
    const current = get().publicState;
    const botCount = current.players.filter((p) => p.isBot).length + 1;
    const botPlayer: ConnectedPlayer = {
      id: 'bot_' + Math.random().toString(36).substring(2, 7),
      name: `AI Bot ${botCount}`,
      avatarColor: '#7C3AED',
      avatarIcon: 'hardware-chip-outline',
      isBot: true,
      isReady: true,
    };
    const updated = { ...current, players: [...current.players, botPlayer] };
    set({ publicState: updated });
    NativeHotspot.updatePublicState(JSON.stringify(updated));
  },

  removePlayer: (playerId: string) => {
    const current = get().publicState;
    const updated = {
      ...current,
      players: current.players.filter((p) => p.id !== playerId),
    };
    set({ publicState: updated });
    NativeHotspot.updatePublicState(JSON.stringify(updated));
  },

  startMultiplayerRound: (settings) => {
    const current = get().publicState;
    const players = current.players;
    if (players.length < 3) return false;

    // Pick a word
    const available = WORD_BANK.filter((w) =>
      settings.selectedCategories.length === 0 ||
      settings.selectedCategories.includes(w.categoryId || '') ||
      settings.selectedCategories.includes(w.category)
    );
    const pool = available.length > 0 ? available : WORD_BANK;
    const activeWord = pool[Math.floor(Math.random() * pool.length)];

    // Select imposters randomly
    const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
    const actualImposterCount = Math.min(settings.imposterCount, players.length - 1);
    const imposterList = shuffledPlayers.slice(0, actualImposterCount);
    const imposterIds = imposterList.map((p) => p.id);
    const imposterNames = imposterList.map((p) => p.name);

    NativeHotspot.clearPlayerRoles();

    // Assign roles & store privately in native server
    let hostAssignment: PlayerAssignment | null = null;
    players.forEach((p) => {
      const isImposter = imposterIds.includes(p.id);
      const isPictureActive = settings.gameMode === 'PICTURES' || settings.gameMode === 'HYBRID';

      const assignment: PlayerAssignment = {
        playerId: p.id,
        playerName: p.name,
        role: isImposter ? 'IMPOSTER' : 'CIVILIAN',
        secretWord: isImposter ? undefined : activeWord.word,
        secretWordAmharic: !isImposter && settings.showAmharic ? activeWord.wordAmharic : undefined,
        imageUrl: !isImposter && isPictureActive ? activeWord.imageUrl : undefined,
        decoyImageUrl: isImposter && isPictureActive ? activeWord.decoyImageUrl : undefined,
        imageAssetId: !isImposter && isPictureActive ? activeWord.imageAssetId : undefined,
        decoyImageAssetId: isImposter && isPictureActive ? activeWord.decoyImageAssetId : undefined,
        category: isImposter ? activeWord.category : undefined,
        categoryAmharic: isImposter && settings.showAmharic ? activeWord.categoryAmharic : undefined,
        extraHint: isImposter ? activeWord.extraHint : undefined,
        extraHintAmharic: isImposter && settings.showAmharic ? activeWord.extraHintAmharic : undefined,
        teammateNames: isImposter && actualImposterCount > 1 ? imposterNames.filter((n) => n !== p.name) : undefined,
        revealed: false,
        isBot: p.isBot,
      };

      if (p.isHost) {
        hostAssignment = assignment;
      }
      NativeHotspot.setPlayerRole(p.id, JSON.stringify(assignment));
    });

    const updatedState: PublicGameState = {
      ...current,
      phase: 'REVEAL',
      activeCategory: activeWord.category,
      imposterIds,
      secretWordRevealed: activeWord.word,
      winners: null,
      eliminatedPlayerIds: [],
      players: players.map((p) => {
        let botClue: string | undefined = undefined;
        if (p.isBot) {
          const isImposter = imposterIds.includes(p.id);
          if (isImposter) {
            botClue = activeWord.extraHint || activeWord.category || 'Subtle';
            if (settings.showAmharic && activeWord.extraHintAmharic) {
              botClue = `${activeWord.extraHint} (${activeWord.extraHintAmharic})`;
            }
          } else {
            const clues =
              activeWord.botClues && activeWord.botClues.length > 0
                ? activeWord.botClues
                : [activeWord.word];
            const cluesAm = activeWord.botCluesAmharic || [];
            const rndIdx = Math.floor(Math.random() * clues.length);
            const en = clues[rndIdx];
            const am = cluesAm[rndIdx];
            botClue = settings.showAmharic && am ? `${en} (${am})` : en;
          }
        }
        return {
          ...p,
          botClue,
          isReady: p.isBot ? true : false,
          votesReceived: 0,
        };
      }),
    };

    set({
      publicState: updatedState,
      myRoleAssignment: hostAssignment,
      myVoteTargetIds: [],
      isVotingSubmitted: false,
    });
    NativeHotspot.updatePublicState(JSON.stringify(updatedState));
    return true;
  },

  advanceToDiscussion: () => {
    const current = get().publicState;
    const updated: PublicGameState = {
      ...current,
      phase: 'DISCUSSION',
    };
    set({ publicState: updated });
    NativeHotspot.updatePublicState(JSON.stringify(updated));
  },

  advanceToVoting: () => {
    const current = get().publicState;
    const bots = current.players.filter((p) => p.isBot);
    const imposterIds = current.imposterIds;

    // Simulate intelligent secret votes cast by autonomous AI bots
    const voteCounts: Record<string, number> = {};
    current.players.forEach((p) => {
      voteCounts[p.id] = 0;
    });

    bots.forEach((bot) => {
      const isBotImposter = imposterIds.includes(bot.id);
      const possibleTargets = current.players.filter((p) => p.id !== bot.id);
      if (possibleTargets.length === 0) return;

      let chosenTarget: ConnectedPlayer | null = null;
      if (isBotImposter) {
        // Imposter bot frames a civilian with the weakest or missing clue
        const civilians = possibleTargets.filter((p) => !imposterIds.includes(p.id));
        const pool = civilians.length > 0 ? civilians : possibleTargets;
        const sorted = [...pool].sort((a, b) => {
          const aHas = !!a.playerClue;
          const bHas = !!b.playerClue;
          return aHas === bHas ? 0 : aHas ? 1 : -1;
        });
        chosenTarget = sorted[0];
      } else {
        // Civilian bot analyzes who sounds suspicious based on their submitted clue
        const candidatesWithScores = possibleTargets.map((p) => {
          let suspicion = 0;
          if (imposterIds.includes(p.id)) suspicion += 3; // Actual imposter baseline
          if (!p.playerClue || p.playerClue.trim().length === 0) {
            suspicion += 2; // Missing clue is very suspicious
          } else {
            const clueLower = p.playerClue.toLowerCase();
            const wordLower = (current.secretWordRevealed || '').toLowerCase();
            if (clueLower === wordLower) suspicion += 1;
          }
          return { player: p, suspicion: suspicion + Math.random() * 2 };
        });

        candidatesWithScores.sort((a, b) => b.suspicion - a.suspicion);
        chosenTarget = candidatesWithScores[0].player;
      }

      if (chosenTarget) {
        voteCounts[chosenTarget.id] = (voteCounts[chosenTarget.id] || 0) + 1;
      }
    });

    const updated: PublicGameState = {
      ...current,
      phase: 'VOTING',
      players: current.players.map((p) => ({
        ...p,
        isReady: p.isBot ? true : false,
        votesReceived: voteCounts[p.id] || 0,
      })),
    };
    set({ publicState: updated, myVoteTargetIds: [], isVotingSubmitted: false });
    NativeHotspot.updatePublicState(JSON.stringify(updated));
  },

  tallyVotesAndConclude: () => {
    const current = get().publicState;
    // Find player(s) with highest votes
    let maxVotes = 0;
    current.players.forEach((p) => {
      if ((p.votesReceived || 0) > maxVotes) {
        maxVotes = p.votesReceived || 0;
      }
    });

    const eliminated = maxVotes > 0
      ? current.players.filter((p) => (p.votesReceived || 0) === maxVotes).map((p) => p.id)
      : [];

    // Check if imposters were eliminated
    const imposterCaught = eliminated.some((id) => current.imposterIds.includes(id));
    const winners = imposterCaught ? 'CIVILIANS' : 'IMPOSTERS';

    const updated: PublicGameState = {
      ...current,
      phase: 'RESULTS',
      eliminatedPlayerIds: eliminated,
      winners,
    };

    set({ publicState: updated });
    NativeHotspot.updatePublicState(JSON.stringify(updated));
  },

  returnToLobby: () => {
    const current = get().publicState;
    const updated: PublicGameState = {
      ...current,
      phase: 'LOBBY',
      activeCategory: null,
      imposterIds: [],
      winners: null,
      eliminatedPlayerIds: [],
      players: current.players.map((p) => ({ ...p, isReady: false, votesReceived: 0 })),
    };
    set({
      publicState: updated,
      myRoleAssignment: null,
      myVoteTargetIds: [],
      isVotingSubmitted: false,
    });
    NativeHotspot.updatePublicState(JSON.stringify(updated));
  },

  // ==========================================
  // CLIENT IMPLEMENTATION
  // ==========================================
  joinRoom: async (ip, profile) => {
    try {
      const cleanIp = ip.trim() || '192.168.43.1';
      const endpoint = `http://${cleanIp}:8080/api/join`;
      const normalizedAvatar = await normalizeAvatarUri(profile.avatarUri);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: profile.id,
          name: profile.name,
          avatarUri: normalizedAvatar,
          avatarColor: profile.avatarColor,
          avatarIcon: profile.avatarIcon,
        }),
      });

      if (!response.ok) {
        set({ connectionError: 'Could not connect to Host. Check Wi-Fi Hotspot.' });
        return false;
      }

      set({
        role: 'CLIENT',
        hostIp: cleanIp,
        isConnected: true,
        connectionError: null,
      });

      // Start 500ms polling loop
      if (pollTimer) clearInterval(pollTimer);
      pollTimer = setInterval(() => {
        get().pollState();
      }, 500);

      await get().pollState();
      return true;
    } catch {
      set({ connectionError: 'Failed to reach Host. Verify Wi-Fi is connected.' });
      return false;
    }
  },

  joinByRoomKey: async (key: string, profile: UserProfile) => {
    const cleanKey = key.trim().toLowerCase();
    if (!cleanKey) return false;

    set({ connectionError: null });

    // 1. Scan network (Wi-Fi subnet sweep, UDP broadcast, hotspot gateway)
    try {
      const rooms = await scanForLocalRooms();
      const matched = rooms.find(
        (r) =>
          r.roomKey.toLowerCase() === cleanKey ||
          r.roomCode.toLowerCase().includes(cleanKey)
      );
      if (matched) {
        return await get().joinRoom(matched.hostIp, profile);
      }
    } catch {}

    // 2. Direct probe against high-probability gateways
    const candidateIps: string[] = [];
    try {
      const gw = await NativeHotspot.getGatewayIpAddress();
      if (gw && gw !== '0.0.0.0') candidateIps.push(gw);
    } catch {}
    for (const ip of ['192.168.43.1', '192.168.49.1', '172.20.10.1']) {
      if (!candidateIps.includes(ip)) candidateIps.push(ip);
    }

    for (const ip of candidateIps) {
      try {
        const res = await fetch(`http://${ip}:8080/api/state`);
        if (res.ok) {
          const text = await res.text();
          const state: PublicGameState = JSON.parse(text);
          const matchesKey = state.roomKey && state.roomKey.toLowerCase() === cleanKey;
          const matchesName = state.roomCode && state.roomCode.toLowerCase().includes(cleanKey);
          if (matchesKey || matchesName) {
            return await get().joinRoom(ip, profile);
          }
        }
      } catch {}
    }

    set({
      connectionError: `Room keyword "${key.toUpperCase()}" not found. Verify you are connected to the same Wi-Fi or Hotspot as the host.`,
    });
    return false;
  },

  leaveRoom: () => {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = null;
    const hostIp = get().hostIp;
    try {
      fetch(`http://${hostIp}:8080/api/leave`, { method: 'POST' }).catch(() => {});
    } catch {}
    set({
      role: null,
      isConnected: false,
      publicState: DEFAULT_PUBLIC_STATE,
      myRoleAssignment: null,
      connectionError: null,
    });
  },

  pollState: async () => {
    const { hostIp, role } = get();
    if (role !== 'CLIENT') return;

    try {
      const res = await fetch(`http://${hostIp}:8080/api/state`);
      if (res.ok) {
        const state: PublicGameState = await res.json();
        const prevPhase = get().publicState.phase;

        // Reset client voting flags on phase transitions to guarantee voting works!
        if (state.phase === 'VOTING' && prevPhase !== 'VOTING') {
          set({ isVotingSubmitted: false, myVoteTargetIds: [] });
        }
        if (state.phase === 'REVEAL' && prevPhase !== 'REVEAL') {
          set({ isVotingSubmitted: false, myVoteTargetIds: [] });
        }

        set({ publicState: state, isConnected: true, connectionError: null });
      }
    } catch {
      // transient network drop
    }
  },

  fetchMyRole: async (playerId: string) => {
    const { hostIp } = get();
    try {
      const res = await fetch(`http://${hostIp}:8080/api/role?playerId=${playerId}`);
      if (res.ok) {
        const roleData: PlayerAssignment = await res.json();
        set({ myRoleAssignment: roleData });
      }
    } catch {
      // ignore
    }
  },

  submitReady: async (playerId: string) => {
    const { hostIp, role } = get();
    if (role === 'HOST') {
      const current = get().publicState;
      const updated = {
        ...current,
        players: current.players.map((p) =>
          p.id === playerId ? { ...p, isReady: true } : p
        ),
      };
      set({ publicState: updated });
      NativeHotspot.updatePublicState(JSON.stringify(updated));
    } else {
      try {
        await fetch(`http://${hostIp}:8080/api/ready`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId }),
        });
      } catch {}
    }
  },

  submitClue: async (playerId: string, clue: string) => {
    const cleanClue = clue.trim();
    if (!cleanClue) return;
    const { hostIp, role } = get();

    if (role === 'HOST') {
      const current = get().publicState;
      const updated = {
        ...current,
        players: current.players.map((p) =>
          p.id === playerId ? { ...p, playerClue: cleanClue } : p
        ),
      };
      set({ publicState: updated });
      NativeHotspot.updatePublicState(JSON.stringify(updated));
    } else {
      try {
        await fetch(`http://${hostIp}:8080/api/clue`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId, clue: cleanClue }),
        });
      } catch {}
    }
  },

  submitVote: async (voterId: string, targetIds: string[]) => {
    const { hostIp, role } = get();
    set({ myVoteTargetIds: targetIds, isVotingSubmitted: true });

    if (role === 'HOST') {
      const current = get().publicState;
      const updatedPlayers = current.players.map((p) => {
        if (targetIds.includes(p.id)) {
          return { ...p, votesReceived: (p.votesReceived || 0) + 1 };
        }
        return p;
      });
      const updated: PublicGameState = { ...current, players: updatedPlayers };
      set({ publicState: updated });
      NativeHotspot.updatePublicState(JSON.stringify(updated));
    } else {
      try {
        await fetch(`http://${hostIp}:8080/api/vote`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ voterId, targetIds }),
        });
      } catch {}
    }
  },
}));
