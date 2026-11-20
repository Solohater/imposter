import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  BackHandler,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/shared/theme/colors';
import { Avatar } from '@/shared/components/Avatar';
import { NeonButton } from '@/shared/components/NeonButton';
import { AppConfirmModal } from '@/shared/components/AppConfirmModal';
import { useGameStore } from '@/core/store/use-game-store';
import { usePlayerStore } from '@/core/store/use-player-store';
import { useHaptics } from '@/shared/hooks/useHaptics';

type VotingStep = 'VOTING_ROUND' | 'VOTE_TALLY';

export default function VotingScreen() {
  const router = useRouter();
  const haptics = useHaptics();

  const currentRound = useGameStore((s) => s.currentRound);
  const submitVote = useGameStore((s) => s.submitVote);
  const continueToNextClueRound = useGameStore((s) => s.continueToNextClueRound);
  const players = usePlayerStore((s) => s.players);

  const activePlayers = players.filter((p) => p.isActive);
  const eliminatedIds = currentRound?.eliminatedPlayerIds || [];

  // Only surviving players participate in voting
  const survivingPlayers = activePlayers.filter((p) => !eliminatedIds.includes(p.id));

  // Voting Round State
  const [step, setStep] = useState<VotingStep>('VOTING_ROUND');
  const [currentVoterIndex, setCurrentVoterIndex] = useState(0);
  const [selectedSuspectId, setSelectedSuspectId] = useState<string | null>(null);
  const [votes, setVotes] = useState<Record<string, string>>({}); // voterId -> suspectId | 'SKIP'

  // Elimination Modal State
  const [eliminationModalVisible, setEliminationModalVisible] = useState(false);
  const [eliminatedPlayerName, setEliminatedPlayerName] = useState('');
  const [selectedEliminationIds, setSelectedEliminationIds] = useState<string[]>([]);

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    icon: any;
    iconColor: string;
    confirmText: string;
    confirmColor: string;
    cancelText?: string;
    onConfirm: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    icon: 'help-circle-outline',
    iconColor: COLORS.warning,
    confirmText: 'Confirm',
    confirmColor: COLORS.primary,
    cancelText: 'Cancel',
    onConfirm: () => {},
  });

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

  if (!currentRound || survivingPlayers.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No active round found.</Text>
          <TouchableOpacity onPress={() => router.replace('/')} style={styles.returnBtn}>
            <Text style={styles.returnBtnText}>Return to Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const phaseIndex = currentRound.investigationPhaseIndex || 1;
  const currentVoter = survivingPlayers[currentVoterIndex] || survivingPlayers[0];
  const isLastVoter = currentVoterIndex === survivingPlayers.length - 1;

  // Candidates for the current voter (other surviving players)
  const candidateSuspects = survivingPlayers.filter((p) => p.id !== currentVoter.id);

  const getAutoBotCandidate = (botId: string): string | null => {
    const candidates = survivingPlayers.filter((p) => p.id !== botId);
    if (candidates.length === 0) return null;
    const assignment = currentRound.assignments[botId];
    const playerClues = currentRound.playerClues || {};
    const imposterIds = Object.keys(currentRound.assignments).filter(
      (id) => currentRound.assignments[id]?.role === 'IMPOSTER'
    );
    const isBotImposter = assignment?.role === 'IMPOSTER';

    if (isBotImposter) {
      // Imposter bot frames a civilian with the weakest or missing clue
      const teammates = new Set(assignment.teammateNames || []);
      const civilians = candidates.filter((c) => !teammates.has(c.name) && !imposterIds.includes(c.id));
      const pool = civilians.length > 0 ? civilians : candidates;
      const sorted = [...pool].sort((a, b) => {
        const aClue = (playerClues[a.id] || '').trim();
        const bClue = (playerClues[b.id] || '').trim();
        if (!aClue && bClue) return -1;
        if (aClue && !bClue) return 1;
        return aClue.length - bClue.length;
      });
      return sorted[0]?.id || pool[0]?.id || null;
    }

    // Civilian bot evaluates clues to find the imposter
    const secretWord = (currentRound.activeWord?.word || '').toLowerCase();
    const scoredCandidates = candidates.map((c) => {
      let suspicion = 0;
      if (imposterIds.includes(c.id)) {
        suspicion += 3; // Baseline imposter suspicion
      }
      const clue = (playerClues[c.id] || '').trim().toLowerCase();
      if (!clue) {
        suspicion += 3; // Missing or blank clue is highly suspicious
      } else if (secretWord && clue === secretWord) {
        suspicion += 1.5;
      }
      return { id: c.id, score: suspicion + Math.random() * 0.5 };
    });

    scoredCandidates.sort((a, b) => b.score - a.score);
    return scoredCandidates[0]?.id || candidates[0]?.id || null;
  };

  const effectiveSelectedSuspectId =
    selectedSuspectId ||
    (currentVoter?.isBot ? getAutoBotCandidate(currentVoter.id) : null);

  const handleSelectSuspect = (id: string) => {
    haptics.tap();
    setSelectedSuspectId(id);
  };

  const handleConfirmVoterChoice = () => {
    if (!effectiveSelectedSuspectId) return;

    haptics.tap();
    const updatedVotes = {
      ...votes,
      [currentVoter.id]: effectiveSelectedSuspectId,
    };
    setVotes(updatedVotes);

    if (isLastVoter) {
      // All voters finished! Transition to Tally
      haptics.success();
      const counts: Record<string, number> = {};
      for (const targetId of Object.values(updatedVotes)) {
        if (targetId && targetId !== 'SKIP') {
          counts[targetId] = (counts[targetId] || 0) + 1;
        }
      }
      let maxVotes = 0;
      let topIds: string[] = [];
      for (const [id, count] of Object.entries(counts)) {
        if (count > maxVotes) {
          maxVotes = count;
          topIds = [id];
        } else if (count === maxVotes && maxVotes > 0) {
          topIds.push(id);
        }
      }
      setSelectedEliminationIds(topIds);
      setStep('VOTE_TALLY');
    } else {
      // Advance to next voter
      setCurrentVoterIndex((prev) => prev + 1);
      // Pre-select if previously chosen
      const nextVoter = survivingPlayers[currentVoterIndex + 1];
      setSelectedSuspectId(updatedVotes[nextVoter?.id] || null);
    }
  };

  const handlePreviousVoter = () => {
    if (currentVoterIndex > 0) {
      haptics.tap();
      const prevIndex = currentVoterIndex - 1;
      setCurrentVoterIndex(prevIndex);
      const prevVoter = survivingPlayers[prevIndex];
      setSelectedSuspectId(votes[prevVoter.id] || null);
    }
  };

  const handleRestartVoting = () => {
    haptics.medium();
    setVotes({});
    setCurrentVoterIndex(0);
    setSelectedSuspectId(null);
    setStep('VOTING_ROUND');
  };

  // Tally Calculations
  const tallyMap: Record<string, { count: number; voterNames: string[] }> = {};
  for (const player of survivingPlayers) {
    tallyMap[player.id] = { count: 0, voterNames: [] };
  }
  let skipCount = 0;
  const skipVoters: string[] = [];

  for (const [voterId, targetId] of Object.entries(votes)) {
    const voter = survivingPlayers.find((p) => p.id === voterId);
    if (!voter) continue;

    if (targetId === 'SKIP') {
      skipCount++;
      skipVoters.push(voter.name);
    } else if (tallyMap[targetId]) {
      tallyMap[targetId].count++;
      tallyMap[targetId].voterNames.push(voter.name);
    }
  }

  const sortedTally = survivingPlayers
    .map((p) => ({
      player: p,
      count: tallyMap[p.id]?.count || 0,
      voterNames: tallyMap[p.id]?.voterNames || [],
    }))
    .sort((a, b) => b.count - a.count);

  const highestVoteCount = sortedTally[0]?.count || 0;
  const topSuspects = sortedTally.filter((t) => t.count > 0 && t.count === highestVoteCount);
  const isTied = topSuspects.length > 1;
  const topAccused = topSuspects.length === 1 ? topSuspects[0].player : null;

  const toggleEliminationSelection = (id: string) => {
    haptics.tap();
    setSelectedEliminationIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleConfirmEliminateSelected = () => {
    if (selectedEliminationIds.length === 0) return;
    const names = survivingPlayers
      .filter((p) => selectedEliminationIds.includes(p.id))
      .map((p) => p.name)
      .join(', ');

    setConfirmModal({
      visible: true,
      title: 'CONFIRM ELIMINATION',
      message: `Are you sure your group wants to eliminate ${names}?`,
      icon: 'skull',
      iconColor: COLORS.danger,
      confirmText:
        selectedEliminationIds.length > 1
          ? `ELIMINATE ${selectedEliminationIds.length} PLAYERS`
          : 'ELIMINATE',
      confirmColor: COLORS.danger,
      cancelText: 'Cancel',
      onConfirm: () => {
        setConfirmModal((prev) => ({ ...prev, visible: false }));
        haptics.heavy();
        const outcome = submitVote(selectedEliminationIds);

        if (outcome.isGameOver) {
          router.replace('/game/results');
        } else {
          setEliminatedPlayerName(names);
          setEliminationModalVisible(true);
        }
      },
    });
  };

  const handleSkipElimination = () => {
    setConfirmModal({
      visible: true,
      title: 'SKIP ELIMINATION?',
      message:
        'No player will be eliminated this round. If imposters reach parity with civilians, they will win!',
      icon: 'play-forward',
      iconColor: COLORS.warning,
      confirmText: 'SKIP ELIMINATION',
      confirmColor: COLORS.warning,
      cancelText: 'Cancel',
      onConfirm: () => {
        setConfirmModal((prev) => ({ ...prev, visible: false }));
        haptics.warning();
        const outcome = submitVote(undefined);
        if (outcome.isGameOver) {
          router.replace('/game/results');
        } else {
          continueToNextClueRound();
          router.replace('/game/clues');
        }
      },
    });
  };

  const handleStartNextRound = () => {
    setEliminationModalVisible(false);
    continueToNextClueRound();
    router.replace('/game/clues');
  };

  const handleBackToClues = () => {
    haptics.tap();
    router.replace('/game/clues');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header Row with Back Button */}
      <View style={styles.topNavRow}>
        <TouchableOpacity
          onPress={handleBackToClues}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={18} color={COLORS.primary} style={{ marginRight: 6 }} />
          <Text style={styles.backBtnText}>Back to Clues</Text>
        </TouchableOpacity>

        <View style={styles.roundBadge}>
          <Text style={styles.roundBadgeText}>
            {phaseIndex > 1 ? `ROUND ${phaseIndex}` : 'VOTING'}
          </Text>
        </View>

        <TouchableOpacity onPress={handleConfirmExit} style={styles.exitBtn} activeOpacity={0.7}>
          <Ionicons name="close" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      {step === 'VOTING_ROUND' ? (
        // =========================================================================
        // VIEW 1: INDIVIDUAL VOTING ROUND (Each player votes by name)
        // =========================================================================
        <View style={styles.flexContainer}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Active Voter Card */}
            <View style={styles.voterCard}>
              <View style={styles.voterProgressPill}>
                <Text style={styles.voterProgressText}>
                  VOTER {currentVoterIndex + 1} OF {survivingPlayers.length}
                </Text>
              </View>

              <View style={styles.avatarSpotlight}>
                <Avatar
                  name={currentVoter.name}
                  color={currentVoter.avatarColor}
                  size={76}
                  isBot={currentVoter.isBot}
                />
              </View>

              <Text style={styles.voterName}>{`${currentVoter.name}'s Turn`}</Text>
              <Text style={styles.voterInstruction}>
                {currentVoter.isBot
                  ? `🤖 ${currentVoter.name} is an AI. It has calculated its suspicion:`
                  : `${currentVoter.name}, who do you suspect is the imposter?`}
              </Text>
            </View>

            {/* Suspect Candidates Grid */}
            <Text style={styles.sectionHeader}>SELECT A SUSPECT</Text>
            <View style={styles.candidatesGrid}>
              {candidateSuspects.map((candidate) => {
                const isSelected = effectiveSelectedSuspectId === candidate.id;
                return (
                  <TouchableOpacity
                    key={candidate.id}
                    activeOpacity={0.8}
                    onPress={() => handleSelectSuspect(candidate.id)}
                    style={[
                      styles.candidateCard,
                      isSelected && styles.candidateCardSelected,
                    ]}
                  >
                    <Avatar
                      name={candidate.name}
                      color={candidate.avatarColor}
                      size={52}
                      isBot={candidate.isBot}
                    />
                    <Text
                      style={[
                        styles.candidateName,
                        isSelected && styles.candidateNameSelected,
                      ]}
                      numberOfLines={1}
                    >
                      {candidate.name}
                    </Text>

                    {isSelected && (
                      <View style={styles.candidateSelectedBadge}>
                        <Ionicons name="checkmark" size={14} color="#0A0A0E" />
                        <Text style={styles.candidateSelectedText}>ACCUSED</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Skip / Abstain Option */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleSelectSuspect('SKIP')}
              style={[
                styles.skipVoteBtn,
                effectiveSelectedSuspectId === 'SKIP' && styles.skipVoteBtnSelected,
              ]}
            >
              <Ionicons
                name="help-buoy-outline"
                size={18}
                color={effectiveSelectedSuspectId === 'SKIP' ? COLORS.warning : COLORS.textMuted}
                style={{ marginRight: 8 }}
              />
              <Text
                style={[
                  styles.skipVoteText,
                  effectiveSelectedSuspectId === 'SKIP' && styles.skipVoteTextSelected,
                ]}
              >
                No Consensus / Skip My Vote
              </Text>
              {effectiveSelectedSuspectId === 'SKIP' && (
                <Ionicons
                  name="checkmark-circle"
                  size={18}
                  color={COLORS.warning}
                  style={{ marginLeft: 'auto' }}
                />
              )}
            </TouchableOpacity>
          </ScrollView>

          {/* Voting Action Bar */}
          <View style={styles.bottomBar}>
            <View style={styles.bottomBarRow}>
              {currentVoterIndex > 0 ? (
                <TouchableOpacity
                  onPress={handlePreviousVoter}
                  style={styles.prevBtn}
                  activeOpacity={0.7}
                >
                  <Ionicons name="arrow-back" size={18} color={COLORS.textSecondary} />
                  <Text style={styles.prevBtnText}>Previous</Text>
                </TouchableOpacity>
              ) : (
                <View style={{ width: 90 }} />
              )}

              <TouchableOpacity
                onPress={handleConfirmVoterChoice}
                disabled={!effectiveSelectedSuspectId}
                style={[
                  styles.confirmVoteBtn,
                  !effectiveSelectedSuspectId && styles.confirmVoteBtnDisabled,
                ]}
                activeOpacity={0.8}
              >
                <Text style={styles.confirmVoteBtnText}>
                  {isLastVoter ? 'Finish & See Tally' : 'Next Voter'}
                </Text>
                <Ionicons
                  name={isLastVoter ? 'stats-chart' : 'arrow-forward'}
                  size={18}
                  color="#0A0A0E"
                  style={{ marginLeft: 6 }}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : (
        // =========================================================================
        // VIEW 2: VOTE TALLY & VERDICT
        // =========================================================================
        <View style={styles.flexContainer}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Header Banner */}
            <View style={styles.tallyHeaderCard}>
              <Ionicons name="stats-chart" size={28} color={COLORS.primary} style={{ marginBottom: 6 }} />
              <Text style={styles.tallyHeaderTitle}>Voting Results</Text>
              <Text style={styles.tallyHeaderSub}>
                All {survivingPlayers.length} players have cast their votes:
              </Text>
            </View>

            {/* Verdict Highlight */}
            {topAccused ? (
              <View style={styles.verdictCard}>
                <View style={styles.verdictTopRow}>
                  <Ionicons name="alert-circle" size={20} color={COLORS.danger} style={{ marginRight: 6 }} />
                  <Text style={styles.verdictBadgeText}>MOST SUSPECTED PLAYER</Text>
                </View>
                <Text style={styles.verdictPlayerName}>{topAccused.name}</Text>
                <Text style={styles.verdictVotesCount}>
                  Received {highestVoteCount} of {survivingPlayers.length} votes
                </Text>
              </View>
            ) : isTied ? (
              <View style={[styles.verdictCard, { borderColor: COLORS.warning }]}>
                <View style={styles.verdictTopRow}>
                  <Ionicons name="help-circle" size={20} color={COLORS.warning} style={{ marginRight: 6 }} />
                  <Text style={[styles.verdictBadgeText, { color: COLORS.warning }]}>
                    TIED VOTE
                  </Text>
                </View>
                <Text style={styles.verdictPlayerName}>
                  {topSuspects.map((t) => t.player.name).join(' & ')}
                </Text>
                <Text style={styles.verdictVotesCount}>
                  Tied with {highestVoteCount} votes each
                </Text>
              </View>
            ) : null}

            {/* Suspect Tally List */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, marginTop: 14 }}>
              <Text style={[styles.sectionHeader, { marginBottom: 0 }]}>VOTE BREAKDOWN</Text>
              <Text style={{ fontSize: 11, color: COLORS.textSecondary, fontWeight: '700' }}>
                Tap to select ({selectedEliminationIds.length} chosen)
              </Text>
            </View>
            <View style={styles.tallyList}>
              {sortedTally.map((item) => {
                const isTop = topAccused?.id === item.player.id;
                const isSelected = selectedEliminationIds.includes(item.player.id);
                return (
                  <TouchableOpacity
                    key={item.player.id}
                    activeOpacity={0.8}
                    onPress={() => toggleEliminationSelection(item.player.id)}
                    style={[
                      styles.tallyItemCard,
                      isTop && styles.tallyItemCardTop,
                      isSelected && styles.tallyItemCardSelected,
                    ]}
                  >
                    <Avatar
                      name={item.player.name}
                      color={item.player.avatarColor}
                      size={44}
                      isBot={item.player.isBot}
                    />
                    <View style={styles.tallyItemInfo}>
                      <View style={styles.tallyItemTopRow}>
                        <Text style={styles.tallyItemName}>{item.player.name}</Text>
                        <View
                          style={[
                            styles.voteCountPill,
                            item.count > 0 && styles.voteCountPillActive,
                            isTop && styles.voteCountPillTop,
                          ]}
                        >
                          <Text
                            style={[
                              styles.voteCountText,
                              isTop && styles.voteCountTextTop,
                            ]}
                          >
                            {item.count} {item.count === 1 ? 'vote' : 'votes'}
                          </Text>
                        </View>
                      </View>

                      {item.voterNames.length > 0 ? (
                        <Text style={styles.votersListText}>
                          Voted by: <Text style={styles.votersHighlight}>{item.voterNames.join(', ')}</Text>
                        </Text>
                      ) : (
                        <Text style={styles.noVotesText}>No votes</Text>
                      )}
                    </View>

                    <View style={{ marginLeft: 8 }}>
                      <Ionicons
                        name={isSelected ? 'checkbox' : 'square-outline'}
                        size={24}
                        color={isSelected ? COLORS.danger : COLORS.textMuted}
                      />
                    </View>
                  </TouchableOpacity>
                );
              })}

              {/* Skip Vote Summary */}
              {skipCount > 0 && (
                <View style={styles.skipSummaryCard}>
                  <Ionicons name="help-buoy-outline" size={18} color={COLORS.textMuted} style={{ marginRight: 8 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.skipSummaryTitle}>
                      Abstained / Skipped ({skipCount})
                    </Text>
                    <Text style={styles.skipSummaryVoters}>{skipVoters.join(', ')}</Text>
                  </View>
                </View>
              )}
            </View>

            {/* Secondary Actions */}
            <View style={styles.tallySecondaryActions}>
              <TouchableOpacity
                onPress={handleRestartVoting}
                style={styles.reVoteBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="refresh" size={16} color={COLORS.textSecondary} style={{ marginRight: 6 }} />
                <Text style={styles.reVoteBtnText}>Re-Vote (Vote Again)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSkipElimination}
                style={styles.skipEliminationBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="play-forward" size={16} color={COLORS.warning} style={{ marginRight: 6 }} />
                <Text style={styles.skipEliminationBtnText}>Skip Elimination</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Primary Elimination Button */}
          <View style={styles.bottomBar}>
            {selectedEliminationIds.length > 0 ? (
              <NeonButton
                title={
                  selectedEliminationIds.length === 1
                    ? `Eliminate ${survivingPlayers.find((p) => p.id === selectedEliminationIds[0])?.name || 'Player'}`
                    : `Eliminate Selected (${selectedEliminationIds.length} Players)`
                }
                icon="skull"
                size="lg"
                variant="danger"
                onPress={handleConfirmEliminateSelected}
              />
            ) : (
              <NeonButton
                title="Skip Elimination"
                icon="play-forward"
                size="lg"
                variant="primary"
                onPress={handleSkipElimination}
              />
            )}
          </View>
        </View>
      )}

      {/* Clean Elimination Announcement Modal */}
      <Modal visible={eliminationModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView
              style={{ width: '100%' }}
              contentContainerStyle={{ alignItems: 'center', padding: 8 }}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <View style={styles.modalIconCircle}>
                <Ionicons name="skull" size={44} color={COLORS.danger} />
              </View>

              <Text style={styles.modalTitle}>{eliminatedPlayerName}</Text>
              <Text style={styles.modalSubtitle}>WAS ELIMINATED!</Text>

              <View style={styles.mysteryBadge}>
                <Ionicons name="eye-off-outline" size={16} color={COLORS.imposterLight} style={{ marginRight: 6 }} />
                <Text style={styles.mysteryBadgeText}>ROLE REMAINS SECRET</Text>
              </View>

              <Text style={styles.modalDesc}>
                You do not know if you caught an imposter or an innocent civilian! The imposters are still among you.
              </Text>

              <View style={styles.parityAlert}>
                <Ionicons name="warning-outline" size={18} color={COLORS.warning} style={{ marginRight: 8 }} />
                <Text style={styles.parityAlertText}>
                  Remember: If imposters equal or outnumber surviving civilians, imposters win immediately!
                </Text>
              </View>

              <NeonButton
                title="Next Round of Clues"
                icon="arrow-forward"
                size="lg"
                onPress={handleStartNextRound}
                style={{ width: '100%', marginTop: 8 }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Custom Confirm Modal */}
      <AppConfirmModal
        visible={confirmModal.visible}
        title={confirmModal.title}
        message={confirmModal.message}
        icon={confirmModal.icon}
        iconColor={confirmModal.iconColor}
        confirmText={confirmModal.confirmText}
        confirmColor={confirmModal.confirmColor}
        cancelText={confirmModal.cancelText || 'Cancel'}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, visible: false }))}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  flexContainer: {
    flex: 1,
  },
  topNavRow: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 230, 118, 0.1)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.3)',
  },
  backBtnText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  roundBadge: {
    backgroundColor: 'rgba(255, 61, 0, 0.12)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 61, 0, 0.3)',
  },
  roundBadgeText: {
    color: COLORS.danger,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  exitBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 110,
  },
  voterCard: {
    backgroundColor: COLORS.card,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    padding: 18,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  voterProgressPill: {
    backgroundColor: 'rgba(0, 230, 118, 0.12)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  voterProgressText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  avatarSpotlight: {
    marginBottom: 10,
  },
  voterName: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 4,
  },
  voterInstruction: {
    color: COLORS.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  sectionHeader: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 10,
    marginTop: 4,
  },
  candidatesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  candidateCard: {
    width: '48%',
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    padding: 14,
    alignItems: 'center',
  },
  candidateCardSelected: {
    borderColor: COLORS.danger,
    backgroundColor: 'rgba(255, 23, 68, 0.12)',
  },
  candidateName: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 8,
    textAlign: 'center',
  },
  candidateNameSelected: {
    color: COLORS.danger,
    fontWeight: '900',
  },
  candidateSelectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.danger,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginTop: 6,
    gap: 2,
  },
  candidateSelectedText: {
    color: '#0A0A0E',
    fontSize: 10,
    fontWeight: '900',
  },
  skipVoteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardSecondary,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 4,
  },
  skipVoteBtnSelected: {
    borderColor: COLORS.warning,
    backgroundColor: 'rgba(255, 214, 0, 0.1)',
  },
  skipVoteText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  skipVoteTextSelected: {
    color: COLORS.warning,
    fontWeight: '800',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.background,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  bottomBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  prevBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: COLORS.cardSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  prevBtnText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 4,
  },
  confirmVoteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 15,
  },
  confirmVoteBtnDisabled: {
    opacity: 0.4,
  },
  confirmVoteBtnText: {
    color: '#0A0A0E',
    fontSize: 15,
    fontWeight: '900',
  },
  tallyHeaderCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    alignItems: 'center',
    marginBottom: 14,
  },
  tallyHeaderTitle: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '900',
  },
  tallyHeaderSub: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  verdictCard: {
    backgroundColor: 'rgba(255, 23, 68, 0.1)',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: COLORS.danger,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  verdictTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  verdictBadgeText: {
    color: COLORS.danger,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  verdictPlayerName: {
    color: COLORS.text,
    fontSize: 26,
    fontWeight: '900',
  },
  verdictVotesCount: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  tallyList: {
    gap: 8,
    marginBottom: 16,
  },
  tallyItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
  },
  tallyItemCardTop: {
    borderColor: COLORS.danger,
    backgroundColor: 'rgba(255, 23, 68, 0.06)',
  },
  tallyItemCardSelected: {
    borderColor: COLORS.danger,
    borderWidth: 2,
    backgroundColor: 'rgba(255, 23, 68, 0.14)',
  },
  tallyItemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  tallyItemTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tallyItemName: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
  },
  voteCountPill: {
    backgroundColor: COLORS.cardSecondary,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  voteCountPillActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  voteCountPillTop: {
    backgroundColor: COLORS.danger,
  },
  voteCountText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '800',
  },
  voteCountTextTop: {
    color: '#FFFFFF',
  },
  votersListText: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  votersHighlight: {
    color: COLORS.textSecondary,
    fontWeight: '700',
  },
  noVotesText: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  skipSummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardSecondary,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  skipSummaryTitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  skipSummaryVoters: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  tallySecondaryActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
  },
  reVoteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: COLORS.cardSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  reVoteBtnText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  skipEliminationBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 214, 0, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 214, 0, 0.3)',
  },
  skipEliminationBtnText: {
    color: COLORS.warning,
    fontSize: 13,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: COLORS.card,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: COLORS.danger,
    padding: 20,
    alignItems: 'center',
  },
  modalIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 23, 68, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 23, 68, 0.3)',
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
  },
  modalSubtitle: {
    color: COLORS.danger,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 12,
  },
  mysteryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 109, 0, 0.15)',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.imposter,
    marginBottom: 14,
  },
  mysteryBadgeText: {
    color: COLORS.imposterLight,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  modalDesc: {
    color: COLORS.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 14,
    paddingHorizontal: 8,
  },
  parityAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 214, 0, 0.08)',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 214, 0, 0.3)',
    marginBottom: 14,
    width: '100%',
  },
  parityAlertText: {
    color: COLORS.warning,
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 15,
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 16,
    marginBottom: 14,
  },
  returnBtn: {
    backgroundColor: COLORS.cardSecondary,
    padding: 14,
    borderRadius: 12,
  },
  returnBtnText: {
    color: COLORS.text,
    fontWeight: '700',
  },
});
