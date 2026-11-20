import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  BackHandler,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/shared/theme/colors';
import { Avatar } from '@/shared/components/Avatar';
import { HoldToPeekCard } from '@/shared/components/HoldToPeekCard';
import { AppConfirmModal } from '@/shared/components/AppConfirmModal';
import { useGameStore } from '@/core/store/use-game-store';
import { usePlayerStore } from '@/core/store/use-player-store';
import { useSettingsStore } from '@/core/store/use-settings-store';
import { useHaptics } from '@/shared/hooks/useHaptics';

export default function RoleRevealScreen() {
  const router = useRouter();
  const haptics = useHaptics();

  const roleDuration = useSettingsStore((s) => s.settings.roleRevealDurationSeconds || 20);
  const enableRoleTimer = useSettingsStore((s) => s.settings.enableRoleTimer);
  const currentRound = useGameStore((s) => s.currentRound);
  const markRoleRevealed = useGameStore((s) => s.markRoleRevealed);
  const proceedToClues = useGameStore((s) => s.proceedToClues);
  const players = usePlayerStore((s) => s.players);

  const activePlayers = players.filter((p) => p.isActive);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [isHandoffConfirmed, setIsHandoffConfirmed] = useState(false);
  const [isQuitModalVisible, setIsQuitModalVisible] = useState(false);
  const [revealSecondsLeft, setRevealSecondsLeft] = useState(roleDuration);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setIsQuitModalVisible(true);
      return true;
    });
    return () => sub.remove();
  }, []);

  const currentPlayer = activePlayers[currentPlayerIndex];
  const isLastPlayer = currentPlayerIndex === activePlayers.length - 1;

  const handleRoleConfirmed = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (currentPlayer) {
      markRoleRevealed(currentPlayer.id);
    }

    if (isLastPlayer) {
      proceedToClues();
      router.replace('/game/clues');
    } else {
      // Advance to next player's handoff screen
      setIsHandoffConfirmed(false);
      setRevealSecondsLeft(roleDuration);
      setCurrentPlayerIndex((prev) => prev + 1);
    }
  }, [currentPlayer, isLastPlayer, markRoleRevealed, proceedToClues, roleDuration, router]);

  const handleRoleConfirmedRef = useRef(handleRoleConfirmed);
  useEffect(() => {
    handleRoleConfirmedRef.current = handleRoleConfirmed;
  }, [handleRoleConfirmed]);

  // 20-Second Countdown Timer when viewing role & hints
  useEffect(() => {
    if (!isHandoffConfirmed || enableRoleTimer === false) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setInterval(() => {
      setRevealSecondsLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          haptics.warning();
          handleRoleConfirmedRef.current();
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
  }, [isHandoffConfirmed, currentPlayerIndex, enableRoleTimer, haptics]);

  if (!currentRound || !currentPlayer) {
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

  const assignment = currentRound.assignments[currentPlayer.id];

  const handleConfirmHandoff = () => {
    haptics.medium();
    setRevealSecondsLeft(roleDuration);
    setIsHandoffConfirmed(true);
  };

  const handleAbortGame = () => {
    setIsQuitModalVisible(true);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleAbortGame} style={styles.abortBtn}>
          <Ionicons name="close" size={24} color={COLORS.textMuted} />
        </TouchableOpacity>
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            Player {currentPlayerIndex + 1} of {activePlayers.length}
          </Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${((currentPlayerIndex + 1) / activePlayers.length) * 100}%` },
              ]}
            />
          </View>
        </View>
        <View style={{ width: 32 }} />
      </View>

      <View style={styles.container}>
        {!isHandoffConfirmed ? (
          // STEP 1: Hand-off Screen (Waits until player clicks)
          <View style={styles.handoffContainer}>
            <View style={styles.handoffCard}>
              <View style={styles.avatarWrapper}>
                <Avatar
                  name={currentPlayer.name}
                  color={currentPlayer.avatarColor}
                  size={96}
                  isBot={currentPlayer.isBot}
                />
              </View>

              <Text style={styles.handoffPrompt}>
                {currentPlayer.isBot ? 'AUTONOMOUS AI' : 'PASS PHONE TO'}
              </Text>
              <Text style={styles.handoffName}>{currentPlayer.name}</Text>

              <View
                style={[
                  styles.warningBox,
                  currentPlayer.isBot && {
                    borderColor: 'rgba(0, 229, 255, 0.4)',
                    backgroundColor: 'rgba(0, 229, 255, 0.08)',
                  },
                ]}
              >
                <Ionicons
                  name={currentPlayer.isBot ? 'hardware-chip-outline' : 'eye-off-outline'}
                  size={20}
                  color={currentPlayer.isBot ? '#00E5FF' : COLORS.imposterLight}
                  style={{ marginRight: 8 }}
                />
                <Text
                  style={[
                    styles.warningText,
                    currentPlayer.isBot && { color: '#00E5FF' },
                  ]}
                >
                  {currentPlayer.isBot
                    ? 'Role securely assigned to AI. Ready to speak during clue turn!'
                    : 'Make sure other players cannot see the screen!'}
                </Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={currentPlayer.isBot ? handleRoleConfirmed : handleConfirmHandoff}
                style={[
                  styles.handoffButton,
                  currentPlayer.isBot && { backgroundColor: '#00E5FF' },
                ]}
              >
                <Text style={styles.handoffButtonText}>
                  {currentPlayer.isBot
                    ? 'Confirm Bot & Next Player'
                    : `I am ${currentPlayer.name} (View Role)`}
                </Text>
                <Ionicons
                  name="arrow-forward"
                  size={20}
                  color="#0A0A0E"
                  style={{ marginLeft: 8 }}
                />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          // STEP 2: Role View Card with 20s Countdown
          <View style={styles.revealWrapper}>
            <View style={styles.revealHeader}>
              <Avatar
                name={currentPlayer.name}
                color={currentPlayer.avatarColor}
                size={38}
              />
              <View style={styles.headerTitles}>
                <Text style={styles.viewingAsText}>{`${currentPlayer.name}'s Secret Turn`}</Text>
              </View>
            </View>

            <HoldToPeekCard
              assignment={assignment}
              onConfirmSeen={handleRoleConfirmed}
              secondsLeft={revealSecondsLeft}
              totalSeconds={roleDuration}
            />
          </View>
        )}
      </View>

      {/* Custom Confirm Modal */}
      <AppConfirmModal
        visible={isQuitModalVisible}
        title="QUIT GAME?"
        message="Are you sure you want to end this round and return home?"
        icon="exit-outline"
        iconColor={COLORS.danger}
        confirmText="QUIT"
        confirmColor={COLORS.danger}
        cancelText="Cancel"
        onConfirm={() => {
          setIsQuitModalVisible(false);
          router.replace('/');
        }}
        onCancel={() => setIsQuitModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  abortBtn: {
    padding: 6,
  },
  progressContainer: {
    alignItems: 'center',
  },
  progressText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  progressBar: {
    width: 160,
    height: 4,
    backgroundColor: COLORS.cardSecondary,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
  },
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  handoffContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  handoffCard: {
    width: '100%',
    backgroundColor: COLORS.card,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 24,
    alignItems: 'center',
  },
  avatarWrapper: {
    marginBottom: 16,
  },
  handoffPrompt: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  handoffName: {
    color: COLORS.text,
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 20,
    textAlign: 'center',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 109, 0, 0.1)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 109, 0, 0.3)',
    marginBottom: 24,
    width: '100%',
  },
  warningText: {
    color: COLORS.imposterLight,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    flex: 1,
  },
  handoffButton: {
    backgroundColor: COLORS.primary,
    width: '100%',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  btnContent: {
    flex: 1,
  },
  handoffButtonText: {
    color: '#0A0A0E',
    fontSize: 15,
    fontWeight: '800',
  },
  handoffButtonSubtext: {
    color: '#15321F',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  revealWrapper: {
    flex: 1,
  },
  revealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitles: {
    marginLeft: 12,
  },
  viewingAsText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
  },
  viewingAsSubtext: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 15,
    marginBottom: 16,
    textAlign: 'center',
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
