import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  BackHandler,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/shared/theme/colors';
import { Avatar } from '@/shared/components/Avatar';
import { NeonButton } from '@/shared/components/NeonButton';
import { HoldToPeekCard } from '@/shared/components/HoldToPeekCard';
import { useProfileStore } from '@/core/store/use-profile-store';
import { useMultiplayerStore } from '@/core/store/use-multiplayer-store';
import { useHaptics } from '@/shared/hooks/useHaptics';

export default function MultiplayerGameScreen() {
  const router = useRouter();
  const haptics = useHaptics();

  const profile = useProfileStore((s) => s.profile);
  const role = useMultiplayerStore((s) => s.role);
  const publicState = useMultiplayerStore((s) => s.publicState);
  const myRoleAssignment = useMultiplayerStore((s) => s.myRoleAssignment);
  const fetchMyRole = useMultiplayerStore((s) => s.fetchMyRole);
  const submitReady = useMultiplayerStore((s) => s.submitReady);
  const submitClue = useMultiplayerStore((s) => s.submitClue);
  const submitVote = useMultiplayerStore((s) => s.submitVote);
  const isVotingSubmitted = useMultiplayerStore((s) => s.isVotingSubmitted);
  const advanceToDiscussion = useMultiplayerStore((s) => s.advanceToDiscussion);
  const advanceToVoting = useMultiplayerStore((s) => s.advanceToVoting);
  const tallyVotesAndConclude = useMultiplayerStore((s) => s.tallyVotesAndConclude);
  const returnToLobby = useMultiplayerStore((s) => s.returnToLobby);

  const [hasConfirmedSeen, setHasConfirmedSeen] = useState(false);
  const [selectedSuspectIds, setSelectedSuspectIds] = useState<string[]>([]);
  const [myClueInput, setMyClueInput] = useState('');

  const isHost = role === 'HOST';
  const phase = publicState.phase;

  // Accidental exit protection
  const handleExitGame = useCallback(() => {
    haptics.warning();
    Alert.alert(
      'Leave Game?',
      'Are you sure you want to exit the current round? Your progress will be lost.',
      [
        { text: 'Stay in Game', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: () => {
            if (isHost) {
              returnToLobby();
            } else {
              useMultiplayerStore.getState().leaveRoom();
            }
            router.back();
          },
        },
      ]
    );
  }, [haptics, isHost, returnToLobby, router]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleExitGame();
      return true;
    });
    return () => sub.remove();
  }, [handleExitGame]);

  // Reset local suspect selection when entering VOTING phase
  const [prevPhase, setPrevPhase] = useState(phase);
  if (phase !== prevPhase) {
    setPrevPhase(phase);
    if (phase === 'VOTING') {
      setSelectedSuspectIds([]);
    }
  }

  // On client, fetch role when phase is REVEAL
  useEffect(() => {
    if (phase === 'REVEAL' && !myRoleAssignment) {
      fetchMyRole(profile.id);
    }
    if (phase === 'LOBBY') {
      router.back();
    }
  }, [phase, myRoleAssignment, fetchMyRole, profile.id, router]);

  const handleConfirmSeen = () => {
    haptics.success();
    setHasConfirmedSeen(true);
    submitReady(profile.id);
  };

  const handleToggleSuspect = (playerId: string) => {
    if (isVotingSubmitted) return;
    haptics.tap();
    setSelectedSuspectIds((prev) =>
      prev.includes(playerId) ? prev.filter((id) => id !== playerId) : [...prev, playerId]
    );
  };

  const handleCastVote = () => {
    if (selectedSuspectIds.length === 0) return;
    haptics.success();
    submitVote(profile.id, selectedSuspectIds);
  };

  const readyCount = publicState.players.filter((p) => p.isReady).length;
  const totalCount = publicState.players.length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Top Synchronized Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.exitBtn} onPress={handleExitGame}>
            <Ionicons name="close" size={20} color={COLORS.text} />
          </TouchableOpacity>
          <View style={styles.phaseBadge}>
            <Text style={styles.phaseBadgeText}>PHASE: {phase}</Text>
          </View>
          <View style={styles.roomBadge}>
            <Text style={styles.roomBadgeText}>{publicState.roomCode}</Text>
          </View>
        </View>

        {/* ========================================================
            PHASE 1: REVEAL (Secret Role on Each Phone)
            ======================================================== */}
        {phase === 'REVEAL' && (
          <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
            {myRoleAssignment ? (
              <HoldToPeekCard
                assignment={myRoleAssignment}
                onConfirmSeen={handleConfirmSeen}
              />
            ) : (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Loading secret role...</Text>
              </View>
            )}

            {/* Ready Status & Advance Actions */}
            <View style={styles.readyCard}>
              <View style={styles.readyHeaderRow}>
                <Ionicons name="people" size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
                <Text style={styles.readyHeaderText}>
                  PLAYERS READY: {readyCount} / {totalCount}
                </Text>
              </View>

              {!hasConfirmedSeen ? (
                <NeonButton
                  title="I'M READY (PROCEED)"
                  icon="checkmark"
                  onPress={handleConfirmSeen}
                  style={{ marginTop: 12 }}
                />
              ) : (
                <View style={styles.confirmedPill}>
                  <Ionicons name="checkmark-circle" size={18} color="#39FF14" style={{ marginRight: 6 }} />
                  <Text style={styles.confirmedText}>You are ready! Waiting for others...</Text>
                </View>
              )}

              {isHost && (
                <TouchableOpacity
                  style={styles.hostAdvanceBtn}
                  onPress={() => {
                    haptics.tap();
                    advanceToDiscussion();
                  }}
                >
                  <Text style={styles.hostAdvanceText}>Start Discussion Now</Text>
                  <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        )}

        {/* ========================================================
            PHASE 2: DISCUSSION / CLUES
            ======================================================== */}
        {phase === 'DISCUSSION' && (
          <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
            <View style={styles.discussionHero}>
              <View style={styles.iconCircleCyan}>
                <Ionicons name="chatbubbles" size={36} color={COLORS.primary} />
              </View>
              <Text style={styles.discussionTitle}>DISCUSSION ROUND</Text>
              <Text style={styles.discussionDesc}>
                Take turns giving your 1-word clues! Listen closely to spot who doesn&apos;t know the secret word.
              </Text>
            </View>

            {/* If AI Bot is present, show Clue Input for human players */}
            {publicState.players.some((p) => p.isBot) && (
              <View style={styles.clueInputCard}>
                <View style={styles.clueInputHeader}>
                  <Ionicons name="hardware-chip-outline" size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
                  <Text style={styles.clueInputTitle}>SUBMIT YOUR CLUE (AI BOT WILL LISTEN)</Text>
                </View>
                <Text style={styles.clueInputSubtitle}>
                  Type your 1-word clue so the AI Bot can evaluate who is suspicious!
                </Text>
                <View style={styles.clueInputRow}>
                  <TextInput
                    style={styles.clueTextInput}
                    value={myClueInput}
                    onChangeText={setMyClueInput}
                    placeholder="Enter your clue (e.g. Fast)"
                    placeholderTextColor={COLORS.textMuted}
                    maxLength={25}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    style={styles.clueSubmitBtn}
                    onPress={() => {
                      if (!myClueInput.trim()) return;
                      haptics.success();
                      submitClue(profile.id, myClueInput.trim());
                      setMyClueInput('');
                    }}
                  >
                    <Text style={styles.clueSubmitBtnText}>SUBMIT</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Player Roster for Discussion */}
            <View style={styles.discussionList}>
              {publicState.players.map((p, idx) => (
                <View key={p.id} style={styles.discussionRow}>
                  <View style={styles.discussionRowTop}>
                    <View style={styles.speakerIndexBox}>
                      <Text style={styles.speakerIndexText}>#{idx + 1}</Text>
                    </View>
                    <Avatar
                      name={p.name}
                      color={p.avatarColor}
                      size={40}
                      avatarUri={p.avatarUri}
                      avatarIcon={p.avatarIcon}
                      isBot={p.isBot}
                    />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.discussionName}>{p.name}</Text>
                      <Text style={styles.botRoleSub}>
                        {p.isBot ? 'Autonomous AI Player' : 'Speaks clue out loud'}
                      </Text>
                    </View>
                  </View>

                  {/* Player Submitted Clue for Bots */}
                  {p.playerClue ? (
                    <View style={styles.playerClueBadge}>
                      <Text style={styles.playerClueLabel}>SUBMITTED CLUE: </Text>
                      <Text style={styles.playerClueText}>&quot;{p.playerClue}&quot;</Text>
                    </View>
                  ) : null}

                  {/* AI Bot Speech Clue */}
                  {p.isBot && p.botClue ? (
                    <View style={styles.botSpeechCard}>
                      <View style={styles.botSpeechHeader}>
                        <Ionicons name="hardware-chip-outline" size={13} color="#00E5FF" style={{ marginRight: 5 }} />
                        <Text style={styles.botSpeechTitle}>AI SPOKEN CLUE</Text>
                      </View>
                      <Text style={styles.botSpeechWord}>&quot;{p.botClue}&quot;</Text>
                    </View>
                  ) : null}
                </View>
              ))}
            </View>

            {isHost && (
              <View style={{ marginTop: 24 }}>
                <NeonButton
                  title="PROCEED TO VOTING"
                  icon="checkbox"
                  size="lg"
                  onPress={() => {
                    haptics.success();
                    advanceToVoting();
                  }}
                />
              </View>
            )}
          </ScrollView>
        )}

        {/* ========================================================
            PHASE 3: SIMULTANEOUS SECRET VOTING
            ======================================================== */}
        {phase === 'VOTING' && (
          <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
            <View style={styles.votingHero}>
              <Ionicons name="finger-print" size={36} color={COLORS.warning} />
              <Text style={styles.votingTitle}>SECRET BALLOT</Text>
              <Text style={styles.votingDesc}>
                Vote for who you believe is the Imposter. Your vote is 100% private.
              </Text>
            </View>

            {/* Voting Cards Grid */}
            <View style={styles.votingGrid}>
              {publicState.players
                .filter((p) => p.id !== profile.id)
                .map((p) => {
                  const isSelected = selectedSuspectIds.includes(p.id);
                  return (
                    <TouchableOpacity
                      key={p.id}
                      style={[styles.voteCard, isSelected && styles.voteCardSelected]}
                      activeOpacity={0.8}
                      onPress={() => handleToggleSuspect(p.id)}
                    >
                      <Avatar
                        name={p.name}
                        color={p.avatarColor}
                        size={52}
                        avatarUri={p.avatarUri}
                        avatarIcon={p.avatarIcon}
                        isBot={p.isBot}
                      />
                      <Text style={styles.voteName} numberOfLines={1}>{p.name}</Text>
                      <View style={[styles.checkCircle, isSelected && styles.checkCircleSelected]}>
                        {isSelected && <Ionicons name="checkmark" size={14} color="#000" />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
            </View>

            {!isVotingSubmitted ? (
              <NeonButton
                title={
                  selectedSuspectIds.length === 0
                    ? 'SELECT SUSPECT(S)'
                    : `VOTE FOR ${selectedSuspectIds.length} SUSPECT${selectedSuspectIds.length > 1 ? 'S' : ''}`
                }
                icon="checkmark-done"
                disabled={selectedSuspectIds.length === 0}
                onPress={handleCastVote}
                style={{ marginTop: 20 }}
              />
            ) : (
              <View style={styles.voteSubmittedBox}>
                <Ionicons name="shield-checkmark" size={24} color="#39FF14" style={{ marginBottom: 6 }} />
                <Text style={styles.voteSubmittedTitle}>Vote Cast Secretly</Text>
                <Text style={styles.voteSubmittedSub}>Waiting for all players to finish voting...</Text>
              </View>
            )}

            {publicState.players.some((p) => p.isBot) && (
              <View style={styles.botVotesSection}>
                {publicState.players
                  .filter((p) => p.isBot)
                  .map((bot) => (
                    <View key={bot.id} style={styles.botVotedRow}>
                      <Ionicons name="checkmark-circle" size={14} color="#39FF14" style={{ marginRight: 6 }} />
                      <Text style={styles.botVotedText}>{bot.name} has cast its secret ballot</Text>
                    </View>
                  ))}
              </View>
            )}

            {isHost && (
              <TouchableOpacity
                style={styles.hostTallyBtn}
                onPress={() => {
                  haptics.success();
                  tallyVotesAndConclude();
                }}
              >
                <Text style={styles.hostTallyText}>Tally Votes & Reveal Imposters</Text>
                <Ionicons name="arrow-forward" size={16} color={COLORS.warning} />
              </TouchableOpacity>
            )}
          </ScrollView>
        )}

        {/* ========================================================
            PHASE 4: RESULTS & REVEAL
            ======================================================== */}
        {phase === 'RESULTS' && (
          <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
            <View style={styles.resultsHero}>
              <Text style={styles.resultsBanner}>
                {publicState.winners === 'CIVILIANS' ? '🎉 CIVILIANS WIN! 🎉' : '😈 IMPOSTERS WIN! 😈'}
              </Text>
              <Text style={styles.secretWordNotice}>
                Secret Word was: <Text style={styles.secretWordHighlight}>{publicState.secretWordRevealed}</Text>
              </Text>
            </View>

            {/* Revealed Imposters */}
            <Text style={styles.resultsSectionTitle}>THE IMPOSTER(S)</Text>
            <View style={styles.imposterRoster}>
              {publicState.players
                .filter((p) => publicState.imposterIds.includes(p.id))
                .map((p) => (
                  <View key={p.id} style={styles.imposterCard}>
                    <Avatar
                      name={p.name}
                      color={p.avatarColor}
                      size={52}
                      avatarUri={p.avatarUri}
                      avatarIcon={p.avatarIcon}
                      isBot={p.isBot}
                    />
                    <Text style={styles.imposterName}>{p.name}</Text>
                    <View style={styles.imposterRoleBadge}>
                      <Text style={styles.imposterRoleText}>IMPOSTER</Text>
                    </View>
                  </View>
                ))}
            </View>

            {/* Vote Tally */}
            <Text style={styles.resultsSectionTitle}>VOTE BREAKDOWN</Text>
            <View style={styles.tallyList}>
              {publicState.players.map((p) => (
                <View key={p.id} style={styles.tallyRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Avatar
                      name={p.name}
                      color={p.avatarColor}
                      size={36}
                      avatarUri={p.avatarUri}
                      avatarIcon={p.avatarIcon}
                    />
                    <Text style={styles.tallyName}>{p.name}</Text>
                  </View>
                  <Text style={styles.tallyCount}>
                    {p.votesReceived || 0} vote{(p.votesReceived || 0) === 1 ? '' : 's'}
                  </Text>
                </View>
              ))}
            </View>

            {isHost ? (
              <View style={{ marginTop: 24, gap: 10 }}>
                <NeonButton
                  title="PLAY ANOTHER ROUND"
                  icon="refresh"
                  onPress={() => {
                    haptics.success();
                    returnToLobby();
                  }}
                />
              </View>
            ) : (
              <View style={styles.waitingNotice}>
                <ActivityIndicator size="small" color={COLORS.primary} style={{ marginRight: 10 }} />
                <Text style={styles.waitingText}>Waiting for Host to return to lobby...</Text>
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  exitBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clueInputCard: {
    backgroundColor: 'rgba(0, 229, 255, 0.05)',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 229, 255, 0.3)',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
  },
  clueInputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  clueInputTitle: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  clueInputSubtitle: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginBottom: 12,
  },
  clueInputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  clueTextInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.3)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '800',
  },
  clueSubmitBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clueSubmitBtnText: {
    color: '#050B14',
    fontSize: 12,
    fontWeight: '900',
  },
  playerClueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 8,
  },
  playerClueLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '800',
  },
  playerClueText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  phaseBadge: {
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.3)',
  },
  phaseBadgeText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  roomBadge: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  roomBadgeText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '800',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingBox: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.textMuted,
    fontSize: 14,
    marginTop: 12,
  },
  readyCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    padding: 16,
    marginTop: 16,
  },
  readyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  readyHeaderText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  confirmedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(57, 255, 20, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(57, 255, 20, 0.3)',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  confirmedText: {
    color: '#39FF14',
    fontSize: 13,
    fontWeight: '700',
  },
  hostAdvanceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    paddingVertical: 10,
    gap: 6,
  },
  hostAdvanceText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  discussionHero: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: COLORS.card,
    borderRadius: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.2)',
  },
  iconCircleCyan: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  discussionTitle: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 6,
  },
  discussionDesc: {
    color: COLORS.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  discussionList: {
    gap: 8,
  },
  discussionRow: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 12,
  },
  discussionRowTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  botRoleSub: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  botSpeechCard: {
    marginTop: 10,
    backgroundColor: 'rgba(0, 229, 255, 0.07)',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.25)',
    borderRadius: 12,
    padding: 10,
  },
  botSpeechHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  botSpeechTitle: {
    color: '#00E5FF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  botSpeechWord: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '900',
    fontStyle: 'italic',
  },
  botVotesSection: {
    marginTop: 14,
    gap: 8,
  },
  botVotedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(57, 255, 20, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(57, 255, 20, 0.2)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  botVotedText: {
    color: '#39FF14',
    fontSize: 12,
    fontWeight: '700',
  },
  speakerIndexBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  speakerIndexText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '900',
  },
  discussionName: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '800',
    marginLeft: 12,
  },
  votingHero: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: COLORS.card,
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 145, 0, 0.3)',
  },
  votingTitle: {
    color: COLORS.warning,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 8,
    marginBottom: 4,
  },
  votingDesc: {
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: 'center',
  },
  votingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  voteCard: {
    width: '48%',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    position: 'relative',
  },
  voteCardSelected: {
    borderColor: COLORS.danger,
    backgroundColor: 'rgba(255, 0, 85, 0.1)',
  },
  voteName: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '800',
    marginTop: 10,
  },
  checkCircle: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleSelected: {
    backgroundColor: COLORS.danger,
    borderColor: COLORS.danger,
  },
  voteSubmittedBox: {
    alignItems: 'center',
    backgroundColor: 'rgba(57, 255, 20, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(57, 255, 20, 0.3)',
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
  },
  voteSubmittedTitle: {
    color: '#39FF14',
    fontSize: 16,
    fontWeight: '800',
  },
  voteSubmittedSub: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  hostTallyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 145, 0, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 145, 0, 0.4)',
    borderRadius: 14,
    padding: 14,
    marginTop: 16,
    gap: 8,
  },
  hostTallyText: {
    color: COLORS.warning,
    fontSize: 14,
    fontWeight: '800',
  },
  resultsHero: {
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 20,
  },
  resultsBanner: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 10,
  },
  secretWordNotice: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  secretWordHighlight: {
    color: COLORS.primary,
    fontWeight: '900',
    fontSize: 16,
  },
  resultsSectionTitle: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  imposterRoster: {
    gap: 10,
    marginBottom: 20,
  },
  imposterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 0, 85, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 85, 0.3)',
    borderRadius: 16,
    padding: 12,
  },
  imposterName: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
    flex: 1,
    marginLeft: 14,
  },
  imposterRoleBadge: {
    backgroundColor: COLORS.danger,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  imposterRoleText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '900',
  },
  tallyList: {
    gap: 8,
    marginBottom: 24,
  },
  tallyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    padding: 10,
  },
  tallyName: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 10,
  },
  tallyCount: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  waitingNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 229, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.2)',
    borderRadius: 12,
    padding: 14,
    justifyContent: 'center',
    marginTop: 20,
  },
  waitingText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
  },
});
