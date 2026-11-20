import { FairnessSelector } from '../core/engine/fairness-selector';
import { Player, PlayerSessionStats } from '../core/types/player.types';
import { GameEngine } from '../core/engine/game-engine';
import { GameSettings } from '../core/types/game.types';
import { WORD_BANK } from '../core/data/words';

console.log('🧪 RUNNING COMPREHENSIVE IMPOSTER FAIRNESS & ENGINE SIMULATION...\n');

// 1. Setup 6 players
const testPlayers: Player[] = [
  { id: 'p1', name: 'Alex', avatarColor: '#00E676', isActive: true, score: 0 },
  { id: 'p2', name: 'Sarah', avatarColor: '#00E5FF', isActive: true, score: 0 },
  { id: 'p3', name: 'Jordan', avatarColor: '#FF9100', isActive: true, score: 0 },
  { id: 'p4', name: 'Emma', avatarColor: '#FF5252', isActive: true, score: 0 },
  { id: 'p5', name: 'Leo', avatarColor: '#E040FB', isActive: true, score: 0 },
  { id: 'p6', name: 'Maya', avatarColor: '#FFD600', isActive: true, score: 0 },
];

const totalRounds = 1200;
let sessionStats: Record<string, PlayerSessionStats> = {};
let consecutiveViolations = 0;
let prevImposterId: string | null = null;

for (let r = 1; r <= totalRounds; r++) {
  const result = FairnessSelector.selectImposters({
    players: testPlayers,
    imposterCount: 1,
    fairnessMode: 'BALANCED',
    avoidConsecutive: true,
    currentRoundIndex: r,
    sessionStats,
  });

  const chosenId = result.imposterIds[0];

  if (prevImposterId && prevImposterId === chosenId) {
    consecutiveViolations++;
  }
  prevImposterId = chosenId;

  // Update session stats
  testPlayers.forEach((p) => {
    const isImp = p.id === chosenId;
    const prev = sessionStats[p.id] || {
      playerId: p.id,
      imposterCount: 0,
      civilianCount: 0,
      lastImposterRoundIndex: -1,
      consecutiveImposterStreak: 0,
    };
    sessionStats[p.id] = {
      ...prev,
      imposterCount: isImp ? prev.imposterCount + 1 : prev.imposterCount,
      civilianCount: !isImp ? prev.civilianCount + 1 : prev.civilianCount,
      lastImposterRoundIndex: isImp ? r : prev.lastImposterRoundIndex,
    };
  });
}

console.log(`✅ Simulation of ${totalRounds} rounds completed.`);
console.log(`Consecutive violations (expected 0): ${consecutiveViolations}`);
if (consecutiveViolations !== 0) {
  throw new Error(`Consecutive imposter selection violation count was ${consecutiveViolations}`);
}

console.log('\nDistribution across 6 players (ideal ~200 per player):');
testPlayers.forEach((p) => {
  const count = sessionStats[p.id].imposterCount;
  const pct = ((count / totalRounds) * 100).toFixed(1);
  console.log(`  - ${p.name} (${p.id}): ${count} times (${pct}%)`);
  if (count < 140 || count > 260) {
    throw new Error(`Distribution for ${p.name} was outside balanced variance: ${count}`);
  }
});

// 2. Test Independent Hint Matrix Privacy & Civilians NOT getting Category/Hint
console.log('\n🔒 TESTING ROLE PRIVACY & CIVILIAN BLINDNESS...');

const testSettings: GameSettings = {
  imposterCount: 2,
  randomizeImposterCount: false,
  minRandomImposters: 1,
  maxRandomImposters: 2,
  showCategoryToImposters: true,
  showExtraHintToImposters: true,
  impostersKnowEachOther: true,
  fairnessMode: 'BALANCED',
  avoidConsecutiveImposter: true,
  selectedCategories: ['animals'],
  enableTimer: false,
  discussionDurationSeconds: 120,
  roleRevealDurationSeconds: 20,
  clueSpeakerDurationSeconds: 15,
  hapticsEnabled: true,
  soundEnabled: true,
  showAmharic: true,
  gameMode: 'WORDS',
  enableRoleTimer: true,
  enableSpeakerTimer: true,
  speakingOrderMode: 'SEATING_ORDER',
};

const round1 = GameEngine.startNewRound(
  testPlayers,
  testSettings,
  1,
  {},
  WORD_BANK,
  new Set()
);

const assignments = Object.values(round1.roundState.assignments);
const imposters = assignments.filter((a) => a.role === 'IMPOSTER');
const civilians = assignments.filter((a) => a.role === 'CIVILIAN');

console.log(`  - Imposter Count: ${imposters.length} (Expected 2)`);
console.log(`  - Civilian Count: ${civilians.length} (Expected 4)`);

if (imposters.length !== 2 || civilians.length !== 4) {
  throw new Error('Incorrect role counts assigned!');
}

imposters.forEach((imp) => {
  if (imp.secretWord !== undefined) {
    throw new Error(`LEAK: Imposter ${imp.playerName} received the secret word!`);
  }
  if (!imp.category) {
    throw new Error(`Category was supposed to be ON for imposter ${imp.playerName}`);
  }
  if (!imp.extraHint) {
    throw new Error(`Cryptic extra hint was supposed to be ON for imposter ${imp.playerName}`);
  }
  if (!imp.teammateNames || imp.teammateNames.length !== 1) {
    throw new Error(`Teammate visibility failed for imposter ${imp.playerName}`);
  }
});

// Verify Civilians NEVER get category or hint (Requirement 5)
civilians.forEach((civ) => {
  if (!civ.secretWord) {
    throw new Error(`Civilian ${civ.playerName} did not receive secret word!`);
  }
  if (civ.category !== undefined) {
    throw new Error(`LEAK: Civilian ${civ.playerName} received the category!`);
  }
  if (civ.extraHint !== undefined) {
    throw new Error(`LEAK: Civilian ${civ.playerName} received the extra hint!`);
  }
});

console.log('✅ Civilians strictly receive ONLY the secret word (No hints/categories leaked)!');
console.log('✅ Imposters received category and cryptic red-herring extra hint correctly!');

// 3. Test 1:1 Parity and All-Eliminated Win Conditions (Requirement 3)
console.log('\n🏆 TESTING PARITY AND MULTI-ROUND ELIMINATION WIN CONDITIONS...');

// Scenario A: 5 players (1 imposter, 4 civilians)
// Round 1: eliminate 1 civilian -> 1 imposter, 3 civilians -> GAME MUST CONTINUE (NOT OVER)
const fivePlayers = testPlayers.slice(0, 5);
const fiveSettings: GameSettings = {
  ...testSettings,
  imposterCount: 1,
};

const matchA = GameEngine.startNewRound(fivePlayers, fiveSettings, 1, {}, WORD_BANK, new Set());
const civA = Object.values(matchA.roundState.assignments).filter((a) => a.role === 'CIVILIAN');

// Step 1: Eliminate a civilian
const vote1 = GameEngine.evaluateVoteOutcome(matchA.roundState, civA[0].playerId);
console.log(`  - Vote 1 (Civilian eliminated, 1 Imposter vs 3 Civilians remaining): isGameOver = ${vote1.isGameOver}`);
if (vote1.isGameOver) {
  throw new Error('Game should NOT be over when 1 imposter and 3 civilians remain!');
}

// Step 2: Eliminate another civilian -> 1 Imposter vs 2 Civilians remaining -> GAME MUST CONTINUE
matchA.roundState.eliminatedPlayerIds = vote1.eliminatedPlayerIds;
const vote2 = GameEngine.evaluateVoteOutcome(matchA.roundState, civA[1].playerId);
console.log(`  - Vote 2 (Civilian eliminated, 1 Imposter vs 2 Civilians remaining): isGameOver = ${vote2.isGameOver}`);
if (vote2.isGameOver) {
  throw new Error('Game should NOT be over when 1 imposter and 2 civilians remain!');
}

// Step 3: Eliminate another civilian -> 1 Imposter vs 1 Civilian remaining (1:1 PARITY) -> IMPOSTERS WIN!
matchA.roundState.eliminatedPlayerIds = vote2.eliminatedPlayerIds;
const vote3 = GameEngine.evaluateVoteOutcome(matchA.roundState, civA[2].playerId);
console.log(`  - Vote 3 (1:1 Parity reached, 1 Imposter vs 1 Civilian remaining): isGameOver = ${vote3.isGameOver}, Winner = ${vote3.winnerRole}`);
if (!vote3.isGameOver || vote3.winnerRole !== 'IMPOSTER') {
  throw new Error('Imposters MUST win when 1:1 parity is reached!');
}

// Scenario B: Eliminate the imposter -> CIVILIANS WIN!
const matchB = GameEngine.startNewRound(fivePlayers, fiveSettings, 1, {}, WORD_BANK, new Set());
const impB = Object.values(matchB.roundState.assignments).find((a) => a.role === 'IMPOSTER')!;
const voteCivWin = GameEngine.evaluateVoteOutcome(matchB.roundState, impB.playerId);
console.log(`  - Vote Imposter Eliminated (0 Imposters remaining): isGameOver = ${voteCivWin.isGameOver}, Winner = ${voteCivWin.winnerRole}`);
if (!voteCivWin.isGameOver || voteCivWin.winnerRole !== 'CIVILIAN') {
  throw new Error('Civilians MUST win when all imposters are eliminated!');
}

console.log('Testing Yoseph Win Condition Table...');
// Table combinations:
// 1:1 Imposters win
// 2:1 Imposters win
// 3:2 Imposters win
// 3:3 Game continues
// 4:3 Game continues
// 4:2 Imposters win
// 2:2 Game continues
// 2:3 Game continues
// 0 imposters remaining Civilians win

const createMockRoundState = (imposterCount: number, civilianCount: number): any => {
  const assignments: Record<string, any> = {};
  for (let i = 0; i < imposterCount; i++) {
    assignments[`imp_${i}`] = { playerId: `imp_${i}`, role: 'IMPOSTER' };
  }
  for (let c = 0; c < civilianCount; c++) {
    assignments[`civ_${c}`] = { playerId: `civ_${c}`, role: 'CIVILIAN' };
  }
  return {
    assignments,
    eliminatedPlayerIds: [],
  };
};

const testCases = [
  { imp: 1, civ: 1, expected: 'IMPOSTER', label: '1:1 Imposters win' },
  { imp: 2, civ: 1, expected: 'IMPOSTER', label: '2:1 Imposters win' },
  { imp: 3, civ: 2, expected: 'IMPOSTER', label: '3:2 Imposters win' },
  { imp: 4, civ: 2, expected: 'IMPOSTER', label: '4:2 Imposters win' },
  { imp: 3, civ: 3, expected: undefined, label: '3:3 Game continues' },
  { imp: 4, civ: 3, expected: undefined, label: '4:3 Game continues' },
  { imp: 2, civ: 2, expected: undefined, label: '2:2 Game continues' },
  { imp: 2, civ: 3, expected: undefined, label: '2:3 Game continues' },
  { imp: 0, civ: 4, expected: 'CIVILIAN', label: '0 imposters remaining Civilians win' },
];

for (const tc of testCases) {
  const mockState = createMockRoundState(tc.imp, tc.civ);
  const result = GameEngine.evaluateVoteOutcome(mockState);
  const outcomeText = result.isGameOver ? `${result.winnerRole} win` : 'Game continues';
  console.log(`  - Test [${tc.imp} Imp vs ${tc.civ} Civ]: ${outcomeText} (Expected: ${tc.label})`);
  if (tc.expected === undefined) {
    if (result.isGameOver) {
      throw new Error(`Expected game to continue for ${tc.label}, but got isGameOver=true (${result.winnerRole})`);
    }
  } else {
    if (!result.isGameOver || result.winnerRole !== tc.expected) {
      throw new Error(`Expected ${tc.label}, but got isGameOver=${result.isGameOver}, winner=${result.winnerRole}`);
    }
  }
}

console.log('\n✨ ALL USER REQUIREMENTS & TESTS PASSED FLAWLESSLY! ✨\n');
