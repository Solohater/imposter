import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { PlayerAssignment } from '@/core/types/game.types';
import { COLORS } from '../theme/colors';
import { useHaptics } from '../hooks/useHaptics';
import { useSettingsStore } from '@/core/store/use-settings-store';
import { getClueImageSource } from '@/core/data/clue-assets';

interface HoldToPeekCardProps {
  assignment: PlayerAssignment;
  onConfirmSeen: () => void;
  secondsLeft?: number;
  totalSeconds?: number;
}

const ClueImage: React.FC<{ source: any; label?: string }> = ({ source, label }) => {
  const isBundled = typeof source === 'number' || (source && !source.uri);
  const [loading, setLoading] = useState(!isBundled);
  const [error, setError] = useState(false);

  return (
    <View style={styles.imageCardContainer}>
      {label ? (
        <View style={styles.imageHeaderRow}>
          <Ionicons name="image-outline" size={13} color={COLORS.warning} style={{ marginRight: 5 }} />
          <Text style={styles.imageLabelText}>{label}</Text>
        </View>
      ) : null}

      <View style={styles.imageFrame}>
        {loading && (
          <View style={styles.imageLoader}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.imageLoaderText}>Loading photo clue...</Text>
          </View>
        )}
        {error ? (
          <View style={styles.imageError}>
            <Ionicons name="image-outline" size={24} color={COLORS.textMuted} />
            <Text style={styles.imageErrorText}>Photo clue unavailable (Offline)</Text>
          </View>
        ) : (
          <Image
            source={source}
            style={styles.pictureClue}
            contentFit="cover"
            cachePolicy="memory-disk"
            priority="high"
            transition={isBundled ? 0 : 200}
            onLoad={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setError(true);
            }}
          />
        )}
      </View>
    </View>
  );
};

export const HoldToPeekCard: React.FC<HoldToPeekCardProps> = ({
  assignment,
  onConfirmSeen,
  secondsLeft = 20,
  totalSeconds = 20,
}) => {
  const [isTemporarilyHidden, setIsTemporarilyHidden] = useState(true);
  const haptics = useHaptics();
  const showAmharic = useSettingsStore((s) => s.settings.showAmharic);
  const gameMode = useSettingsStore((s) => s.settings.gameMode);
  const enableRoleTimer = useSettingsStore((s) => s.settings.enableRoleTimer);
  const isPictureActive = gameMode === 'PICTURES' || gameMode === 'HYBRID';

  const handleToggleHide = () => {
    haptics.tap();
    setIsTemporarilyHidden((prev) => !prev);
  };

  const isImposter = assignment.role === 'IMPOSTER';
  const progressRatio = Math.max(0, Math.min(1, secondsLeft / totalSeconds));
  const isUrgent = secondsLeft <= 3;

  return (
    <View style={styles.container}>
      {/* 20-Second Countdown Header or Untimed Indicator */}
      {enableRoleTimer !== false ? (
        <View style={styles.timerContainer}>
          <View style={styles.timerBadge}>
            <Ionicons
              name="timer-outline"
              size={18}
              color={isUrgent ? COLORS.danger : COLORS.primary}
            />
            <Text style={[styles.timerBadgeText, isUrgent && styles.timerUrgentText]}>
              {`${secondsLeft}s remaining`}
            </Text>
          </View>

          {/* Visual Progress Bar */}
          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${progressRatio * 100}%`,
                  backgroundColor: isUrgent ? COLORS.danger : COLORS.primary,
                },
              ]}
            />
          </View>
        </View>
      ) : (
        <View style={styles.timerContainer}>
          <View style={[styles.timerBadge, { borderColor: 'rgba(255,255,255,0.1)' }]}>
            <Ionicons name="infinite-outline" size={18} color={COLORS.textSecondary} />
            <Text style={[styles.timerBadgeText, { color: COLORS.textSecondary }]}>
              Untimed (Tap card to reveal/hide)
            </Text>
          </View>
        </View>
      )}

      {/* Secret Card: 100% UNIFORM NEUTRAL CARD (Anti-reflection, no color leaks) */}
      <Pressable
        onPress={handleToggleHide}
        style={[
          styles.card,
          isTemporarilyHidden && styles.cardHidden,
        ]}
      >
        {isTemporarilyHidden ? (
          <View style={styles.hiddenState}>
            <View style={styles.lockIconContainer}>
              <Ionicons name="eye-off-outline" size={48} color={COLORS.primary} />
            </View>
            <Text style={styles.hiddenPrompt}>TAP TO REVEAL SECRET ROLE</Text>
            <Text style={styles.hiddenSubtext}>
              Check that nobody else is looking at your screen, then tap anywhere on this card to reveal your role.
            </Text>
            <View style={styles.tapBadge}>
              <Ionicons name="finger-print-outline" size={18} color={COLORS.primary} style={{ marginRight: 6 }} />
              <Text style={styles.tapBadgeText}>Tap to Flip Card</Text>
            </View>
          </View>
        ) : (
          <ScrollView
            style={styles.cardScroll}
            contentContainerStyle={styles.revealedState}
            showsVerticalScrollIndicator={true}
            bounces={false}
          >
            {/* Stealthy Neutral Role Header Badge */}
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>
                {assignment.role}
              </Text>
            </View>

            {/* Secret Word / Image for Civilians */}
            {!isImposter ? (
              <View style={styles.wordSection}>
                <Text style={styles.sectionLabel}>SECRET CLUE</Text>
                {assignment.secretWord ? (
                  <Text style={styles.secretWord}>{assignment.secretWord}</Text>
                ) : null}
                {showAmharic && assignment.secretWordAmharic ? (
                  <View style={styles.amharicPill}>
                    <Text style={styles.secretWordAmharic}>{assignment.secretWordAmharic}</Text>
                  </View>
                ) : null}

                {/* Picture Mode Clue (Compact, with loader & error fallback) */}
                {isPictureActive && (assignment.imageAssetId || assignment.imageUrl) ? (
                  <ClueImage
                    source={
                      getClueImageSource(assignment.imageAssetId) ||
                      getClueImageSource(assignment.imageUrl)
                    }
                  />
                ) : null}

                <Text style={styles.instructionText}>
                  Give a subtle 1-word clue to prove you know the clue without giving it away!
                </Text>
              </View>
            ) : (
              // Imposter Section (Text clues prioritized, extra hint front & center)
              <View style={styles.imposterSection}>
                <Text style={styles.imposterTitle}>YOU ARE THE IMPOSTER!</Text>
                <Text style={styles.imposterSubtitle}>
                  {"You do not know the secret clue. Blend in and guess it from others' clues!"}
                </Text>

                {/* 1. Category Pill (If Enabled) */}
                {assignment.category ? (
                  <View style={styles.hintBox}>
                    <View style={styles.hintHeaderRow}>
                      <Ionicons
                        name={(assignment.categoryIcon || 'pricetag') as any}
                        size={14}
                        color={COLORS.warning}
                        style={{ marginRight: 6 }}
                      />
                      <Text style={styles.hintLabel}>CATEGORY</Text>
                    </View>
                    <Text style={styles.hintValue}>
                      {assignment.category}
                      {showAmharic && assignment.categoryAmharic
                        ? ` (${assignment.categoryAmharic})`
                        : ''}
                    </Text>
                  </View>
                ) : null}

                {/* 2. Double-Edged Extra Hint (RISKY INTEL - High Priority, Never Cut Off) */}
                {assignment.extraHint ? (
                  <View style={[styles.hintBox, styles.hintBoxCryptic]}>
                    <View style={styles.hintHeaderRow}>
                      <Ionicons
                        name="warning-outline"
                        size={15}
                        color={COLORS.warning}
                        style={{ marginRight: 6 }}
                      />
                      <Text style={[styles.hintLabel, { color: COLORS.warning, fontWeight: '900' }]}>
                        RISKY INTEL (MAY MISLEAD)
                      </Text>
                    </View>
                    <Text style={styles.hintValueMajor}>{assignment.extraHint}</Text>
                    {showAmharic && assignment.extraHintAmharic ? (
                      <View style={styles.extraHintAmharicContainer}>
                        <Text style={styles.hintValueAmharicMajor}>{assignment.extraHintAmharic}</Text>
                      </View>
                    ) : null}
                  </View>
                ) : null}

                {/* 3. Decoy Image for Imposters (Compact, with loader & error fallback) */}
                {isPictureActive && (assignment.decoyImageAssetId || assignment.decoyImageUrl) ? (
                  <ClueImage
                    source={
                      getClueImageSource(assignment.decoyImageAssetId) ||
                      getClueImageSource(assignment.decoyImageUrl)
                    }
                    label="RISKY VISUAL INTEL (MAY MISLEAD)"
                  />
                ) : null}

                {/* 4. Optional Teammates */}
                {assignment.teammateNames && assignment.teammateNames.length > 0 ? (
                  <View style={styles.teammateBox}>
                    <Text style={styles.teammateLabel}>YOUR PARTNER IN CRIME</Text>
                    <Text style={styles.teammateNames}>
                      {assignment.teammateNames.join(', ')}
                    </Text>
                  </View>
                ) : null}
              </View>
            )}

            <Text style={styles.tapToHideText}>
              Tap card to hide
            </Text>
          </ScrollView>
        )}
      </Pressable>

      {/* Done Button */}
      <View style={styles.actionContainer}>
        <Pressable
          onPress={() => {
            haptics.success();
            onConfirmSeen();
          }}
          style={styles.confirmButton}
        >
          <Ionicons name="checkmark-circle" size={22} color="#0A0A0E" style={{ marginRight: 8 }} />
          <Text style={styles.confirmButtonText}>
            {"I've Seen My Role"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    justifyContent: 'space-between',
  },
  timerContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 230, 118, 0.1)',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.3)',
    marginBottom: 6,
  },
  timerBadgeText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '800',
    marginLeft: 6,
  },
  timerUrgentText: {
    color: COLORS.danger,
  },
  progressBarTrack: {
    width: '100%',
    height: 5,
    backgroundColor: COLORS.cardSecondary,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  // UNIFORM STEALTH CARD (No color leak / reflection!)
  card: {
    flex: 1,
    backgroundColor: '#12141C',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 14,
    minHeight: 340,
    overflow: 'hidden',
  },
  cardHidden: {
    borderColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: '#12141C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardScroll: {
    width: '100%',
    flex: 1,
  },
  hiddenState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  lockIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 230, 118, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.3)',
  },
  hiddenPrompt: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 6,
    textAlign: 'center',
  },
  hiddenSubtext: {
    color: COLORS.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 18,
  },
  tapBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 230, 118, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.3)',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 20,
  },
  tapBadgeText: {
    color: COLORS.primary,
    fontWeight: '800',
    fontSize: 13,
  },
  revealedState: {
    alignItems: 'center',
    width: '100%',
    paddingBottom: 40,
  },
  // Stealthy Neutral Role Header
  roleBadge: {
    paddingVertical: 6,
    paddingHorizontal: 22,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    marginBottom: 14,
    alignSelf: 'center',
  },
  roleBadgeText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 15,
    letterSpacing: 2,
  },
  wordSection: {
    alignItems: 'center',
    width: '100%',
    marginVertical: 6,
  },
  sectionLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  secretWord: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 1,
    textAlign: 'center',
  },
  amharicPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 5,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    marginTop: 6,
    marginBottom: 10,
  },
  secretWordAmharic: {
    color: COLORS.primary,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  // Compact Photo Frame with Loader
  imageCardContainer: {
    width: '100%',
    borderRadius: 14,
    marginTop: 6,
    marginBottom: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 6,
  },
  imageHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  imageLabelText: {
    color: COLORS.warning,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  imageFrame: {
    width: '100%',
    height: 110,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#0A0C12',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pictureClue: {
    width: '100%',
    height: '100%',
  },
  imageLoader: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0A0C12',
    flexDirection: 'row',
    gap: 8,
  },
  imageLoaderText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  imageError: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0A0C12',
    padding: 8,
  },
  imageErrorText: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
  },
  instructionText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 14,
    marginTop: 4,
  },
  imposterSection: {
    alignItems: 'center',
    width: '100%',
  },
  imposterTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 4,
  },
  imposterSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 10,
    lineHeight: 18,
  },
  hintBox: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 12,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  hintBoxCryptic: {
    borderColor: 'rgba(255, 214, 0, 0.35)',
    backgroundColor: 'rgba(255, 214, 0, 0.07)',
  },
  hintHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  hintLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  hintValue: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  hintValueMajor: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  hintValueAmharicMajor: {
    color: COLORS.warning,
    fontSize: 17,
    fontWeight: '800',
  },
  extraHintAmharicContainer: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 214, 0, 0.2)',
  },
  teammateBox: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginTop: 4,
  },
  teammateLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  teammateNames: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '800',
  },
  tapToHideText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 14,
    textAlign: 'center',
  },
  actionContainer: {
    width: '100%',
    paddingTop: 12,
  },
  confirmButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  confirmButtonText: {
    color: '#0A0A0E',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
