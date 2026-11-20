import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  BackHandler,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/shared/theme/colors';
import { Avatar } from '@/shared/components/Avatar';
import { NeonButton } from '@/shared/components/NeonButton';
import { useGameStore } from '@/core/store/use-game-store';
import { usePlayerStore } from '@/core/store/use-player-store';
import { useSettingsStore } from '@/core/store/use-settings-store';
import { useHaptics } from '@/shared/hooks/useHaptics';
import { getOrdinal } from '@/shared/utils/formatters';
import { Player } from '@/core/types/player.types';

export default function CluePhaseScreen() {
  const router = useRouter();
  const haptics = useHaptics();

  const clueDuration = useSettingsStore((s) => s.settings.clueSpeakerDurationSeconds || 15);
  const enableSpeakerTimer = useSettingsStore((s) => s.settings.enableSpeakerTimer);
  const currentRound = useGameStore((s) => s.currentRound);
  const proceedToVoting = useGameStore((s) => s.proceedToVoting);
  const recordPlayerClue = useGameStore((s) => s.recordPlayerClue);
  const players = usePlayerStore((s) => s.players);

  const activePlayers = players.filter((p) => p.isActive);
  const eliminatedIds = useMemo(() => currentRound?.eliminatedPlayerIds || [], [currentRound?.eliminatedPlayerIds]);
  const hasBots = activePlayers.some((p) => p.isBot);

  const [humanClueInput, setHumanClueInput] = useState('');

  // Surviving and eliminated players
  const survivingPlayers = useMemo(
    () => activePlayers.filter((p) => !eliminatedIds.includes(p.id)),
    [activePlayers, eliminatedIds]
  );
  const eliminatedPlayers = useMemo(
    () => activePlayers.filter((p) => eliminatedIds.includes(p.id)),
    [activePlayers, eliminatedIds]
  );

  // Build the randomized sequence of surviving players
  const rawOrder = useMemo(() => currentRound?.speakingOrderPlayerIds || [], [currentRound?.speakingOrderPlayerIds]);
  const effectiveSpeakers = useMemo(() => {
    const orderedSurvivingPlayers: Player[] = [];
    const addedIds = new Set<string>();

    for (const id of rawOrder) {
      if (!eliminatedIds.includes(id)) {
        const found = survivingPlayers.find((p) => p.id === id);
        if (found && !addedIds.has(found.id)) {
          orderedSurvivingPlayers.push(found);
          addedIds.add(found.id);
        }
      }
    }

    for (const p of survivingPlayers) {
      if (!addedIds.has(p.id)) {
        orderedSurvivingPlayers.push(p);
        addedIds.add(p.id);
      }
    }

    return orderedSurvivingPlayers.length > 0 ? orderedSurvivingPlayers : survivingPlayers;
  }, [rawOrder, eliminatedIds, survivingPlayers]);

  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
  const [speakerSecondsLeft, setSpeakerSecondsLeft] = useState(clueDuration);
  const [isPaused, setIsPaused] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalSpeakers = effectiveSpeakers.length;
  const safeTurnIndex = Math.min(currentTurnIndex, Math.max(0, totalSpeakers - 1));
  const currentSpeaker = effectiveSpeakers[safeTurnIndex] || effectiveSpeakers[0];
  const firstPlayer = effectiveSpeakers[0];
  const isLastSpeaker = safeTurnIndex === totalSpeakers - 1;

  // Sync clue input when speaker changes (render-time state adjustment)
  const [prevSpeakerId, setPrevSpeakerId] = useState<string | undefined>(currentSpeaker?.id);
  if (currentSpeaker?.id !== prevSpeakerId) {
    setPrevSpeakerId(currentSpeaker?.id);
    setHumanClueInput(
      (currentSpeaker && currentRound?.playerClues?.[currentSpeaker.id]) || ''
    );
  }

  // Accidental exit protection
  const handleConfirmExit = useCallback(() => {
    haptics.warning();
    Alert.alert(
      'Leave Game?',
      'Are you sure you want to exit the current round? Your progress will be lost.',
      [
        { text: 'Stay in Game', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: () => router.replace('/'),
        },
      ]
    );
  }, [haptics, router]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleConfirmExit();
      return true;
    });
    return () => sub.remove();
  }, [handleConfirmExit]);

  const getBotClue = useCallback((speakerId: string): string => {
    if (!currentRound) return 'Interesting';
    const assignment = currentRound.assignments[speakerId];
    const activeWord = currentRound.activeWord;
    const showAmharic = useSettingsStore.getState().settings.showAmharic;

    if (assignment?.role === 'IMPOSTER') {
      if (assignment.extraHint) {
        return showAmharic && assignment.extraHintAmharic
          ? `${assignment.extraHint} (${assignment.extraHintAmharic})`
          : assignment.extraHint;
      }
      if (assignment.category) {
        return showAmharic && assignment.categoryAmharic
          ? `${assignment.category} (${assignment.categoryAmharic})`
          : assignment.category;
      }
      return 'Subtle';
    } else {
      const clues =
        activeWord.botClues && activeWord.botClues.length > 0
          ? activeWord.botClues
          : [activeWord.word];
      const cluesAm = activeWord.botCluesAmharic || [];

      const idx = Math.abs((currentRound.roundIndex * 7 + speakerId.charCodeAt(0)) % clues.length);
      const en = clues[idx] || clues[0];
      const am = cluesAm[idx];

      return showAmharic && am ? `${en} (${am})` : en;
    }
  }, [currentRound]);

  const handleGoToVoting = useCallback(() => {
    if (currentSpeaker) {
      if (currentSpeaker.isBot) {
        recordPlayerClue(currentSpeaker.id, getBotClue(currentSpeaker.id));
      } else if (humanClueInput.trim()) {
        recordPlayerClue(currentSpeaker.id, humanClueInput.trim());
        setHumanClueInput('');
      }
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    haptics.warning();
    proceedToVoting();
    router.replace('/game/voting');
  }, [currentSpeaker, getBotClue, humanClueInput, recordPlayerClue, haptics, proceedToVoting, router]);

  const handleNextSpeaker = useCallback(() => {
    if (currentSpeaker) {
      if (currentSpeaker.isBot) {
        recordPlayerClue(currentSpeaker.id, getBotClue(currentSpeaker.id));
      } else if (humanClueInput.trim()) {
        recordPlayerClue(currentSpeaker.id, humanClueInput.trim());
        setHumanClueInput('');
      }
    }
    if (isLastSpeaker) {
      // Reached the full circle back to start!
      handleGoToVoting();
    } else {
      haptics.tap();
      setSpeakerSecondsLeft(clueDuration);
      setCurrentTurnIndex((prev) => prev + 1);
    }
  }, [currentSpeaker, getBotClue, humanClueInput, recordPlayerClue, isLastSpeaker, handleGoToVoting, haptics, clueDuration]);

  const handleNextSpeakerRef = useRef(handleNextSpeaker);
  useEffect(() => {
    handleNextSpeakerRef.current = handleNextSpeaker;
  }, [handleNextSpeaker]);

  // 15-second countdown timer for each speaker (or untimed if disabled)
  useEffect(() => {
    if (isPaused || enableSpeakerTimer === false) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setInterval(() => {
      setSpeakerSecondsLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          handleNextSpeakerRef.current();
          return 0;
        }
        if (prev <= 4) {
          haptics.tap();
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [currentTurnIndex, isPaused, enableSpeakerTimer, haptics]);

  const togglePause = () => {
    haptics.medium();
    setIsPaused((prev) => !prev);
  };

  const phaseIndex = currentRound?.investigationPhaseIndex || 1;
  const ordinalEn = getOrdinal(safeTurnIndex + 1);
  const isUrgent = speakerSecondsLeft <= 4;
  const progressPercent = Math.max(0, Math.min(100, (speakerSecondsLeft / clueDuration) * 100));

  const currentBotClue = currentSpeaker?.isBot ? getBotClue(currentSpeaker.id) : null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>
              {phaseIndex > 1
                ? `INVESTIGATION ROUND ${phaseIndex}`
                : 'PHASE 1: CLUES'}
            </Text>
          </View>
          <TouchableOpacity style={styles.exitBtn} onPress={handleConfirmExit}>
            <Ionicons name="close" size={20} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        {/* Starts with indicator */}
        {firstPlayer && (
          <View style={styles.startsWithBanner}>
            <Ionicons name="sparkles" size={14} color={COLORS.primary} style={{ marginRight: 6 }} />
            <Text style={styles.startsWithText}>
              Starts with: <Text style={styles.startsWithHighlight}>{firstPlayer.name}</Text>
            </Text>
          </View>
        )}

        <Text style={styles.headerTitle}>Give Your Clues</Text>
        <Text style={styles.headerSub}>
          Take turns giving ONE subtle clue related to the secret word.
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {/* Active Speaker Spotlight Card */}
        {currentSpeaker && (
          <View style={styles.spotlightCard}>
            {/* Ordinal speaker label */}
            <View style={styles.speakerOrdinalBadge}>
              <Text style={styles.speakerOrdinalText}>
                {ordinalEn} Speaker
              </Text>
            </View>

            <View style={styles.avatarSpotlight}>
              <Avatar
                name={currentSpeaker.name}
                color={currentSpeaker.avatarColor}
                size={88}
                isSpeaker
                isBot={currentSpeaker.isBot}
              />
            </View>

            <Text style={styles.speakerName}>{currentSpeaker.name}</Text>
            {currentSpeaker.isBot ? (
              <View style={styles.botSpeechContainer}>
                <View style={styles.botSpeechBadge}>
                  <Ionicons
                    name="hardware-chip-outline"
                    size={14}
                    color="#00E5FF"
                    style={{ marginRight: 5 }}
                  />
                  <Text style={styles.botSpeechBadgeText}>AI SPEECH CLUE</Text>
                </View>
                <View style={styles.botSpeechBubble}>
                  <Text style={styles.botSpeechQuote}>{`"${currentBotClue}"`}</Text>
                </View>
                <Text style={styles.botSpeechSub}>
                  {currentSpeaker.name} has submitted their clue onto the screen!
                </Text>
              </View>
            ) : (
              <>
                <Text style={styles.speakerInstruction}>
                  {"Speak out loud: Give a single word clue to prove you're not the imposter!"}
                </Text>
                {hasBots && (
                  <View style={styles.humanBotInputCard}>
                    <View style={styles.humanBotInputHeader}>
                      <Ionicons name="hardware-chip" size={15} color="#00E5FF" />
                      <Text style={styles.humanBotInputTitle}>AI Bot Hearing Input</Text>
                    </View>
                    <Text style={styles.humanBotInputSubtitle}>
                      Type your clue so AI bots can hear & deduce your identity:
                    </Text>
                    <TextInput
                      style={styles.humanBotTextInput}
                      placeholder="Type your 1-word clue..."
                      placeholderTextColor={COLORS.textMuted}
                      value={humanClueInput}
                      onChangeText={setHumanClueInput}
                      maxLength={30}
                      autoCapitalize="words"
                      returnKeyType="done"
                    />
                  </View>
                )}
              </>
            )}

            {/* Speaker Timer Display (or Untimed) */}
            {enableSpeakerTimer !== false ? (
              <View style={styles.timerSection}>
                <View style={styles.timerHeaderRow}>
                  <View style={styles.timerBadge}>
                    <Ionicons
                      name={isPaused ? 'pause-circle' : 'timer-outline'}
                      size={20}
                      color={isUrgent ? COLORS.danger : COLORS.primary}
                    />
                    <Text style={[styles.timerBadgeText, isUrgent && styles.timerUrgentText]}>
                      {`${speakerSecondsLeft}s`}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={togglePause}
                    style={styles.pauseBtn}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={isPaused ? 'play' : 'pause'}
                      size={16}
                      color={COLORS.text}
                      style={{ marginRight: 4 }}
                    />
                    <Text style={styles.pauseBtnText}>
                      {isPaused ? 'Resume' : 'Pause'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Progress bar */}
                <View style={styles.timerBarTrack}>
                  <View
                    style={[
                      styles.timerBarFill,
                      {
                        width: `${progressPercent}%`,
                        backgroundColor: isUrgent ? COLORS.danger : COLORS.primary,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.timerRemainingText}>
                  {isPaused ? 'Timer Paused' : `${speakerSecondsLeft}s remaining`}
                </Text>
              </View>
            ) : (
              <View style={[styles.timerSection, { alignItems: 'center', paddingVertical: 8 }]}>
                <View style={[styles.timerBadge, { borderColor: 'rgba(255, 255, 255, 0.1)' }]}>
                  <Ionicons name="infinite-outline" size={18} color={COLORS.textSecondary} />
                  <Text style={[styles.timerBadgeText, { color: COLORS.textSecondary }]}>
                    Speaker Clue Timer: Off (Take your time)
                  </Text>
                </View>
              </View>
            )}

            {/* Next Speaker Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleNextSpeaker}
              style={[styles.nextSpeakerBtn, isLastSpeaker && styles.finishSpeakerBtn]}
            >
              <Text style={styles.nextSpeakerBtnText}>
                {isLastSpeaker
                  ? 'Finish Clues & Go to Voting'
                  : 'Next Player'}
              </Text>
              <Ionicons
                name={isLastSpeaker ? 'checkmark-done' : 'arrow-forward'}
                size={18}
                color="#0A0A0E"
                style={{ marginLeft: 6 }}
              />
            </TouchableOpacity>
          </View>
        )}

        {/* Randomized Turn Order Roster */}
        <View style={styles.rosterCard}>
          <View style={styles.rosterHeader}>
            <Text style={styles.rosterTitle}>
              TURN ORDER ({effectiveSpeakers.length})
            </Text>
            <View style={styles.turnProgressPill}>
              <Text style={styles.turnProgressPillText}>
                {safeTurnIndex + 1}/{totalSpeakers}
              </Text>
            </View>
          </View>

          <View style={styles.rosterList}>
            {effectiveSpeakers.map((player, idx) => {
              const isCurrent = idx === safeTurnIndex;
              const hasPassed = idx < safeTurnIndex;
              const playerOrdinal = getOrdinal(idx + 1);

              return (
                <View
                  key={player.id}
                  style={[
                    styles.playerChip,
                    isCurrent && styles.playerChipActive,
                    hasPassed && styles.playerChipPassed,
                  ]}
                >
                  <View style={styles.chipIndexBadge}>
                    <Text style={styles.chipIndexText}>{playerOrdinal}</Text>
                  </View>

                  <Avatar
                    name={player.name}
                    color={player.avatarColor}
                    size={36}
                    isSpeaker={isCurrent}
                    isBot={player.isBot}
                  />

                  <Text
                    style={[
                      styles.playerChipName,
                      isCurrent && styles.playerChipNameActive,
                    ]}
                    numberOfLines={1}
                  >
                    {player.name}
                  </Text>

                  {isCurrent && (
                    <View style={styles.speakingTag}>
                      <Text style={styles.speakingTagText}>Speaking</Text>
                    </View>
                  )}

                  {hasPassed && (
                    <Ionicons name="checkmark-circle" size={18} color={COLORS.primary} style={{ marginLeft: 'auto' }} />
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* Eliminated Players List if any */}
        {eliminatedPlayers.length > 0 && (
          <View style={[styles.rosterCard, { marginTop: 14, opacity: 0.8 }]}>
            <Text style={[styles.rosterTitle, { color: COLORS.danger }]}>
              ELIMINATED PLAYERS ({eliminatedPlayers.length})
            </Text>
            <Text style={styles.eliminatedSubtext}>
              Role was not revealed. They may not speak or vote.
            </Text>
            <View style={styles.rosterList}>
              {eliminatedPlayers.map((player) => (
                <View key={player.id} style={styles.eliminatedChip}>
                  <Avatar
                    name={player.name}
                    color={player.avatarColor}
                    size={32}
                    isEliminated
                  />
                  <Text style={styles.eliminatedName}>{player.name}</Text>
                  <View style={styles.skullBadge}>
                    <Ionicons name="skull" size={14} color={COLORS.danger} />
                    <Text style={styles.skullBadgeText}>OUT</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Advance to Voting */}
      <View style={styles.bottomBar}>
        <NeonButton
          title="Proceed to Voting"
          icon="chatbubbles-outline"
          size="lg"
          variant="primary"
          onPress={handleGoToVoting}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    alignItems: 'center',
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    position: 'relative',
    marginBottom: 6,
  },
  exitBtn: {
    position: 'absolute',
    right: 0,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  humanBotInputCard: {
    width: '100%',
    backgroundColor: 'rgba(0, 229, 255, 0.06)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.25)',
    padding: 12,
    marginTop: 12,
    marginBottom: 4,
  },
  humanBotInputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  humanBotInputTitle: {
    color: '#00E5FF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  humanBotInputSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginBottom: 8,
    lineHeight: 15,
  },
  humanBotTextInput: {
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  headerBadge: {
    backgroundColor: 'rgba(0, 230, 118, 0.1)',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.3)',
    marginBottom: 6,
  },
  headerBadgeText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  startsWithBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.3)',
    marginBottom: 6,
  },
  startsWithText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  startsWithHighlight: {
    color: COLORS.civilian,
    fontWeight: '900',
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  headerSub: {
    color: COLORS.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 17,
  },
  container: {
    padding: 16,
    paddingBottom: 100,
  },
  spotlightCard: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: COLORS.primary,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.2,
    shadowRadius: 15,
  },
  speakerOrdinalBadge: {
    backgroundColor: 'rgba(0, 230, 118, 0.15)',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
    marginBottom: 12,
  },
  speakerOrdinalText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  avatarSpotlight: {
    marginBottom: 12,
  },
  speakerName: {
    color: COLORS.text,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  botSpeechContainer: {
    width: '100%',
    alignItems: 'center',
    marginVertical: 10,
  },
  botSpeechBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 229, 255, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.3)',
    marginBottom: 8,
  },
  botSpeechBadgeText: {
    color: '#00E5FF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  botSpeechBubble: {
    backgroundColor: 'rgba(0, 229, 255, 0.08)',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#00E5FF',
    paddingVertical: 14,
    paddingHorizontal: 24,
    shadowColor: '#00E5FF',
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  botSpeechQuote: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  botSpeechSub: {
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
  speakerInstruction: {
    color: COLORS.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
    paddingHorizontal: 10,
  },
  timerSection: {
    width: '100%',
    backgroundColor: COLORS.cardSecondary,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  timerHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timerBadgeText: {
    color: COLORS.primary,
    fontSize: 22,
    fontWeight: '900',
    marginLeft: 6,
  },
  timerUrgentText: {
    color: COLORS.danger,
  },
  pauseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  pauseBtnText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
  },
  timerBarTrack: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  timerBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  timerRemainingText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  nextSpeakerBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  finishSpeakerBtn: {
    backgroundColor: COLORS.warning,
  },
  nextSpeakerBtnText: {
    color: '#0A0A0E',
    fontSize: 15,
    fontWeight: '800',
  },
  rosterCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 14,
  },
  rosterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  rosterTitle: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  rosterSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  turnProgressPill: {
    backgroundColor: COLORS.cardSecondary,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  turnProgressPillText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  rosterList: {
    gap: 8,
  },
  playerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardSecondary,
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  playerChipActive: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(0, 230, 118, 0.08)',
  },
  playerChipPassed: {
    opacity: 0.65,
  },
  chipIndexBadge: {
    width: 32,
    marginRight: 6,
    alignItems: 'center',
  },
  chipIndexText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '800',
  },
  playerChipName: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 10,
    flex: 1,
  },
  playerChipNameActive: {
    color: COLORS.primary,
    fontWeight: '900',
  },
  speakingTag: {
    backgroundColor: 'rgba(0, 230, 118, 0.2)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  speakingTagText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  eliminatedSubtext: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginBottom: 10,
    lineHeight: 15,
  },
  eliminatedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 23, 68, 0.08)',
    borderRadius: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 23, 68, 0.2)',
  },
  eliminatedName: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 10,
    textDecorationLine: 'line-through',
    flex: 1,
  },
  skullBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 23, 68, 0.2)',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
    gap: 4,
  },
  skullBadgeText: {
    color: COLORS.danger,
    fontSize: 10,
    fontWeight: '800',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.background,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
});
