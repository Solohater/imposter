import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  BackHandler,
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
import { CATEGORIES } from '@/core/data/words';
import { getClueImageSource } from '@/core/data/clue-assets';
import { Image } from 'expo-image';

export default function ResultsScreen() {
  const router = useRouter();
  const haptics = useHaptics();

  const currentRound = useGameStore((s) => s.currentRound);
  const startNewRound = useGameStore((s) => s.startNewRound);
  const players = usePlayerStore((s) => s.players);
  const showAmharic = useSettingsStore((s) => s.settings.showAmharic);
  const gameMode = useSettingsStore((s) => s.settings.gameMode);
  const isPictureActive = gameMode === 'PICTURES' || gameMode === 'HYBRID';

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      router.replace('/');
      return true;
    });
    return () => sub.remove();
  }, [router]);

  if (!currentRound) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No results available / ምንም ውጤት አልተገኘም።</Text>
          <TouchableOpacity onPress={() => router.replace('/')} style={styles.returnBtn}>
            <Text style={styles.returnBtnText}>Return Home / ወደ ዋና ገጽ</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const {
    activeWord,
    winnerRole,
    assignments,
    pointsAwarded,
    eliminatedPlayerIds,
  } = currentRound;

  const isCivilianWin = winnerRole === 'CIVILIAN';

  // Category Icon Lookup
  const catInfo = CATEGORIES.find(
    (c) => c.name.toLowerCase() === activeWord.category.toLowerCase()
  );

  // All active players and their true roles unmasked
  const activePlayers = players.filter((p) => p.isActive);
  const imposterAssignments = Object.values(assignments).filter((a) => a.role === 'IMPOSTER');

  // Sorted leaderboard by score descending
  const sortedPlayers = [...activePlayers].sort((a, b) => b.score - a.score);

  const handleNextRound = () => {
    haptics.tap();
    const success = startNewRound();
    if (success) {
      router.replace('/game/reveal');
    } else {
      router.replace('/setup');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Victory Banner */}
        <View
          style={[
            styles.victoryBanner,
            isCivilianWin ? styles.victoryBannerCivilian : styles.victoryBannerImposter,
          ]}
        >
          <Ionicons
            name={isCivilianWin ? 'shield-checkmark' : 'skull'}
            size={48}
            color={isCivilianWin ? COLORS.civilian : COLORS.imposter}
            style={{ marginBottom: 8 }}
          />
          <Text
            style={[
              styles.victoryTitle,
              { color: isCivilianWin ? COLORS.civilian : COLORS.imposter },
            ]}
          >
            {isCivilianWin ? 'CIVILIANS WIN!' : 'IMPOSTERS WIN!'}
          </Text>
          <Text style={styles.victorySub}>
            {isCivilianWin
              ? 'All imposters were identified and eliminated!'
              : 'Imposters reached equal numbers with civilians and took control!'}
          </Text>
        </View>

        {/* Secret Word / Image Unmasking with Category Icon */}
        <View style={styles.secretWordCard}>
          <Text style={styles.secretWordLabel}>THE SECRET CLUE WAS</Text>
          <Text style={styles.secretWordText}>{activeWord.word}</Text>
          {showAmharic && activeWord.wordAmharic ? (
            <View style={styles.amharicPill}>
              <Text style={styles.secretWordAmharic}>{activeWord.wordAmharic}</Text>
            </View>
          ) : null}

          {isPictureActive && (activeWord.imageAssetId || activeWord.imageUrl) ? (
            <View style={styles.resultImageContainer}>
              <Image
                source={
                  getClueImageSource(activeWord.imageAssetId) ||
                  getClueImageSource(activeWord.imageUrl)
                }
                style={styles.resultImage}
                contentFit="cover"
                transition={250}
              />
            </View>
          ) : null}

          <View style={styles.categoryPill}>
            <Ionicons
              name={(catInfo?.icon || 'pricetag') as any}
              size={16}
              color={COLORS.primary}
              style={{ marginRight: 6 }}
            />
            <Text style={styles.secretCategoryText}>
              {activeWord.category}
              {showAmharic && activeWord.categoryAmharic ? ` (${activeWord.categoryAmharic})` : ''}
            </Text>
          </View>
        </View>

        {/* Imposter Reveal Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>THE IMPOSTERS UNMASKED</Text>
          <View style={styles.imposterList}>
            {imposterAssignments.map((imp) => {
              const p = players.find((pl) => pl.id === imp.playerId);
              if (!p) return null;
              const wasEliminated = eliminatedPlayerIds.includes(p.id);
              return (
                <View key={imp.playerId} style={styles.imposterItem}>
                  <Avatar name={p.name} color={p.avatarColor} size={40} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.imposterItemName}>{p.name}</Text>
                    <Text style={styles.imposterItemRole}>
                      {wasEliminated
                        ? 'Caught Imposter'
                        : 'Survived Imposter'}
                    </Text>
                  </View>
                  <View style={styles.pointsBadge}>
                    <Text style={styles.pointsBadgeText}>
                      +{pointsAwarded[p.id] ?? 0} pts
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* All Players True Identity Audit */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>ALL ROLES THIS MATCH</Text>
          <View style={styles.allRolesList}>
            {activePlayers.map((player) => {
              const role = assignments[player.id]?.role || 'CIVILIAN';
              const isImp = role === 'IMPOSTER';
              const wasEliminated = eliminatedPlayerIds.includes(player.id);
              return (
                <View key={player.id} style={styles.roleItem}>
                  <Avatar name={player.name} color={player.avatarColor} size={32} />
                  <Text style={styles.rolePlayerName} numberOfLines={1}>
                    {player.name}
                  </Text>
                  {wasEliminated && (
                    <View style={styles.eliminatedTag}>
                      <Ionicons name="skull" size={12} color={COLORS.danger} />
                      <Text style={styles.eliminatedTagText}>Voted Out</Text>
                    </View>
                  )}
                  <View
                    style={[
                      styles.roleTag,
                      isImp ? styles.roleTagImposter : styles.roleTagCivilian,
                    ]}
                  >
                    <Text
                      style={[
                        styles.roleTagText,
                        { color: isImp ? COLORS.imposter : COLORS.civilian },
                      ]}
                    >
                      {role}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Live Scoreboard */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>SESSION SCOREBOARD</Text>
          <View style={styles.scoreboardList}>
            {sortedPlayers.map((player, rank) => (
              <View key={player.id} style={styles.scoreRow}>
                <Text style={styles.rankText}>#{rank + 1}</Text>
                <Avatar name={player.name} color={player.avatarColor} size={34} />
                <Text style={styles.scorePlayerName} numberOfLines={1}>
                  {player.name}
                </Text>
                <Text style={styles.scorePointsText}>{player.score} pts</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <NeonButton
            title="Play Next Round"
            icon="refresh"
            size="lg"
            onPress={handleNextRound}
          />

          <TouchableOpacity
            onPress={() => router.replace('/')}
            style={styles.homeBtn}
          >
            <Text style={styles.homeBtnText}>Return to Home</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  victoryBanner: {
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
  },
  victoryBannerCivilian: {
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    borderColor: COLORS.civilian,
    shadowColor: COLORS.civilian,
    shadowOpacity: 0.2,
    shadowRadius: 15,
  },
  victoryBannerImposter: {
    backgroundColor: 'rgba(255, 109, 0, 0.1)',
    borderColor: COLORS.imposter,
    shadowColor: COLORS.imposter,
    shadowOpacity: 0.2,
    shadowRadius: 15,
  },
  victoryTitle: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  victorySub: {
    color: COLORS.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 4,
  },
  secretWordCard: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  secretWordLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  secretWordText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 1,
    textAlign: 'center',
  },
  amharicPill: {
    backgroundColor: 'rgba(0, 230, 118, 0.12)',
    paddingVertical: 4,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.3)',
    marginTop: 6,
    marginBottom: 10,
  },
  secretWordAmharic: {
    color: COLORS.primary,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  resultImageContainer: {
    width: '100%',
    height: 180,
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.3)',
    backgroundColor: '#0a101d',
  },
  resultImage: {
    width: '100%',
    height: '100%',
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardSecondary,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  secretCategoryText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  sectionCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    marginBottom: 16,
  },
  sectionTitle: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 14,
  },
  imposterList: {
    gap: 10,
  },
  imposterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 109, 0, 0.08)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 109, 0, 0.25)',
  },
  imposterItemName: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
  },
  imposterItemRole: {
    color: COLORS.imposterLight,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  pointsBadge: {
    backgroundColor: 'rgba(0, 230, 118, 0.15)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  pointsBadgeText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  allRolesList: {
    gap: 8,
  },
  roleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardSecondary,
    borderRadius: 12,
    padding: 10,
  },
  rolePlayerName: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 10,
    flex: 1,
  },
  eliminatedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 23, 68, 0.15)',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
    marginRight: 8,
    gap: 3,
  },
  eliminatedTagText: {
    color: COLORS.danger,
    fontSize: 10,
    fontWeight: '700',
  },
  roleTag: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  roleTagCivilian: {
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    borderColor: 'rgba(0, 229, 255, 0.3)',
  },
  roleTagImposter: {
    backgroundColor: 'rgba(255, 109, 0, 0.15)',
    borderColor: 'rgba(255, 109, 0, 0.3)',
  },
  roleTagText: {
    fontSize: 11,
    fontWeight: '800',
  },
  scoreboardList: {
    gap: 8,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardSecondary,
    borderRadius: 12,
    padding: 10,
  },
  rankText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '900',
    width: 28,
  },
  scorePlayerName: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 10,
    flex: 1,
  },
  scorePointsText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '800',
  },
  actions: {
    gap: 12,
    marginTop: 8,
  },
  homeBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: COLORS.cardSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  homeBtnText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontWeight: '700',
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
    marginBottom: 16,
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
