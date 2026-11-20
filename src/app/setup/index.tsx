import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/shared/theme/colors';
import { NeonButton } from '@/shared/components/NeonButton';
import { useSettingsStore } from '@/core/store/use-settings-store';
import { usePlayerStore } from '@/core/store/use-player-store';
import { useGameStore } from '@/core/store/use-game-store';
import { useCustomContentStore } from '@/core/store/use-custom-content-store';
import { CATEGORIES } from '@/core/data/words';
import { FairnessMode } from '@/core/types/game.types';
import { useHaptics } from '@/shared/hooks/useHaptics';

export default function SetupScreen() {
  const router = useRouter();
  const haptics = useHaptics();

  const {
    settings,
    updateSettings,
    setImposterCount,
    toggleCategory,
    selectAllCategories,
    setFairnessMode,
    toggleAmharic,
    setGameMode,
  } = useSettingsStore();
  const players = usePlayerStore((s) => s.players);
  const startNewRound = useGameStore((s) => s.startNewRound);

  const activePlayers = players.filter((p) => p.isActive);
  const maxAllowedImposters = Math.max(1, activePlayers.length - 1);

  const handleStartGame = () => {
    if (activePlayers.length < 3) {
      router.push('/players');
      return;
    }
    const success = startNewRound();
    if (success) {
      router.push('/game/reveal');
    }
  };

  const customCategories = useCustomContentStore((s) => s.customCategories);
  const allCategories = [...CATEGORIES, ...customCategories];
  const allCategoryIds = allCategories.map((c) => c.id);
  const allSelected = allCategoryIds.every((id) => settings.selectedCategories.includes(id));

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            haptics.tap();
            router.back();
          }}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Game Setup</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {/* Game Mode Selector */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Game Mode</Text>
          <Text style={[styles.cardSub, { marginBottom: 14 }]}>
            Choose between classic words, visual pictures, or hybrid play
          </Text>

          <View style={styles.modeRow}>
            {[
              { id: 'WORDS' as const, label: 'Words', icon: 'text-outline', desc: 'Secret words & text' },
              { id: 'PICTURES' as const, label: 'Pictures', icon: 'image-outline', desc: 'Visual cards & photo decoys' },
              { id: 'HYBRID' as const, label: 'Hybrid', icon: 'shuffle-outline', desc: 'Words + picture cards' },
            ].map((m) => {
              const isSelected = (settings.gameMode || 'WORDS') === m.id;
              return (
                <TouchableOpacity
                  key={m.id}
                  activeOpacity={0.8}
                  onPress={() => {
                    haptics.tap();
                    setGameMode(m.id);
                  }}
                  style={[
                    styles.modeCard,
                    isSelected ? styles.modeCardSelected : styles.modeCardUnselected,
                  ]}
                >
                  <Ionicons
                    name={m.icon as any}
                    size={22}
                    color={isSelected ? COLORS.primary : COLORS.textMuted}
                  />
                  <Text
                    style={[
                      styles.modeCardTitle,
                      isSelected && { color: COLORS.primary, fontWeight: '800' },
                    ]}
                  >
                    {m.label}
                  </Text>
                  <Text style={styles.modeCardDesc}>{m.desc}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Language Options */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Language & Region</Text>
          <View style={[styles.toggleRow, { marginTop: 10 }]}>
            <View style={styles.toggleInfo}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 18, marginRight: 8 }}>🇪🇹</Text>
                <Text style={styles.toggleLabel}>Amharic Translations</Text>
              </View>
              <Text style={styles.toggleSub}>
                Show Amharic translations alongside secret clues and categories
              </Text>
            </View>
            <Switch
              value={settings.showAmharic}
              onValueChange={() => {
                haptics.tap();
                toggleAmharic();
              }}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Imposter Count Stepper */}
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <View>
              <Text style={styles.cardTitle}>Imposters</Text>
              <Text style={styles.cardSub}>
                {settings.randomizeImposterCount ? 'Random count per round' : `Fixed: ${settings.imposterCount} of ${activePlayers.length} players`}
              </Text>
            </View>

            {!settings.randomizeImposterCount && (
              <View style={styles.stepperContainer}>
                <TouchableOpacity
                  onPress={() => {
                    if (settings.imposterCount > 1) {
                      haptics.tap();
                      setImposterCount(settings.imposterCount - 1);
                    }
                  }}
                  disabled={settings.imposterCount <= 1}
                  style={[styles.stepBtn, settings.imposterCount <= 1 && styles.stepBtnDisabled]}
                >
                  <Ionicons name="remove" size={20} color={COLORS.text} />
                </TouchableOpacity>

                <Text style={styles.stepCountText}>{settings.imposterCount}</Text>

                <TouchableOpacity
                  onPress={() => {
                    if (settings.imposterCount < maxAllowedImposters) {
                      haptics.tap();
                      setImposterCount(settings.imposterCount + 1);
                    }
                  }}
                  disabled={settings.imposterCount >= maxAllowedImposters}
                  style={[
                    styles.stepBtn,
                    settings.imposterCount >= maxAllowedImposters && styles.stepBtnDisabled,
                  ]}
                >
                  <Ionicons name="add" size={20} color={COLORS.text} />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Randomize Toggle */}
          <View style={[styles.toggleRow, { marginTop: 14, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 14 }]}>
            <View>
              <Text style={styles.toggleLabel}>Randomize count each round</Text>
              <Text style={styles.toggleSub}>Between 1 and {Math.min(2, maxAllowedImposters)}</Text>
            </View>
            <Switch
              value={settings.randomizeImposterCount}
              onValueChange={(val) => {
                haptics.tap();
                updateSettings({ randomizeImposterCount: val });
              }}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Categories Selector */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View>
              <Text style={styles.cardTitle}>Word Categories</Text>
              <Text style={styles.cardSub}>
                {settings.selectedCategories.length} selected of {CATEGORIES.length} packs
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                haptics.tap();
                if (allSelected) {
                  selectAllCategories([CATEGORIES[0].id]); // keep at least 1
                } else {
                  selectAllCategories(allCategoryIds);
                }
              }}
            >
              <Text style={styles.selectAllText}>{allSelected ? 'Clear All' : 'Select All'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.categoryGrid}>
            {allCategories.map((cat) => {
              const isSelected = settings.selectedCategories.includes(cat.id);
              return (
                <TouchableOpacity
                  key={cat.id}
                  activeOpacity={0.8}
                  onPress={() => {
                    haptics.tap();
                    toggleCategory(cat.id);
                  }}
                  style={[
                    styles.categoryCard,
                    isSelected ? styles.categoryCardSelected : styles.categoryCardUnselected,
                  ]}
                >
                  <View style={[styles.catIconCircle, isSelected && styles.catIconCircleSelected]}>
                    <Ionicons
                      name={cat.icon as any}
                      size={20}
                      color={isSelected ? COLORS.primary : COLORS.textMuted}
                    />
                  </View>
                  <Text
                    style={[
                      styles.categoryCardTitle,
                      isSelected && styles.categoryCardTitleSelected,
                    ]}
                    numberOfLines={1}
                  >
                    {cat.name}
                  </Text>
                  {settings.showAmharic && cat.nameAmharic ? (
                    <Text style={styles.categoryCardAmharic} numberOfLines={1}>
                      {cat.nameAmharic}
                    </Text>
                  ) : null}
                  <Text style={styles.categoryCountText}>
                    {cat.isCustom ? `${cat.wordCount} custom` : `${cat.wordCount} items`}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Create Custom Category Shortcut */}
          <TouchableOpacity
            style={styles.manageCustomBtn}
            activeOpacity={0.8}
            onPress={() => {
              haptics.tap();
              router.push('/custom');
            }}
          >
            <Ionicons name="add-circle-outline" size={18} color="#FF9100" style={{ marginRight: 6 }} />
            <Text style={styles.manageCustomBtnText}>Add / Manage Custom Words & Pictures</Text>
          </TouchableOpacity>
        </View>

        {/* Independent Hint Matrix */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Information Given to Imposters</Text>
          <Text style={[styles.cardSub, { marginBottom: 14 }]}>
            Independent controls for imposter difficulty
          </Text>

          {/* Show Category */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>Show Word Category</Text>
              <Text style={styles.toggleSub}>Imposter sees the category (e.g. Food, Animals)</Text>
            </View>
            <Switch
              value={settings.showCategoryToImposters}
              onValueChange={(val) => {
                haptics.tap();
                updateSettings({ showCategoryToImposters: val });
              }}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Show Extra Hint */}
          <View style={[styles.toggleRow, { marginTop: 14 }]}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>Show Extra Hint</Text>
              <Text style={styles.toggleSub}>Imposter receives plausible decoy intel (risk vs reward)</Text>
            </View>
            <Switch
              value={settings.showExtraHintToImposters}
              onValueChange={(val) => {
                haptics.tap();
                updateSettings({ showExtraHintToImposters: val });
              }}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Teammates Know Each Other */}
          <View style={[styles.toggleRow, { marginTop: 14 }]}>
            <View style={styles.toggleInfo}>
              <Text
                style={[
                  styles.toggleLabel,
                  settings.imposterCount < 2 && !settings.randomizeImposterCount && { opacity: 0.5 },
                ]}
              >
                Imposters Know Teammates
              </Text>
              <Text style={styles.toggleSub}>
                {settings.imposterCount < 2 && !settings.randomizeImposterCount
                  ? 'Active when there are 2+ imposters'
                  : 'Imposters see partner names during reveal'}
              </Text>
            </View>
            <Switch
              disabled={settings.imposterCount < 2 && !settings.randomizeImposterCount}
              value={settings.impostersKnowEachOther}
              onValueChange={(val) => {
                haptics.tap();
                updateSettings({ impostersKnowEachOther: val });
              }}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Fairness Engine Mode */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Fairness Engine Mode</Text>
          <Text style={[styles.cardSub, { marginBottom: 14 }]}>
            Controls how role selections are weighted over rounds
          </Text>

          <View style={styles.fairnessOptions}>
            {(['PURE_RANDOM', 'BALANCED', 'STRICT_COOLDOWN'] as FairnessMode[]).map((mode) => {
              const isSelected = settings.fairnessMode === mode;
              const titles = {
                PURE_RANDOM: 'True Random (Unpredictable - Recommended)',
                BALANCED: 'Balanced Randomness',
                STRICT_COOLDOWN: 'Strict Cooldown',
              };
              const descs = {
                PURE_RANDOM: 'Every player has an equal chance every round. Completely unpredictable and suspenseful.',
                BALANCED: 'Subtle history-weighted probability across long sessions.',
                STRICT_COOLDOWN: 'Hard lockout preventing recent imposters from being picked again.',
              };

              return (
                <TouchableOpacity
                  key={mode}
                  activeOpacity={0.8}
                  onPress={() => {
                    haptics.tap();
                    setFairnessMode(mode);
                  }}
                  style={[
                    styles.fairnessCard,
                    isSelected ? styles.fairnessCardSelected : styles.fairnessCardUnselected,
                  ]}
                >
                  <View style={styles.fairnessRadio}>
                    {isSelected && <View style={styles.fairnessRadioDot} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.fairnessTitle,
                        isSelected && { color: COLORS.primary },
                      ]}
                    >
                      {titles[mode]}
                    </Text>
                    <Text style={styles.fairnessDesc}>{descs[mode]}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Game Timers Configuration */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Game Countdown Timers</Text>
          <Text style={styles.cardSub}>
            Enable or disable countdown timers and customize durations
          </Text>

          {/* Role Viewing Timer Toggle & Stepper */}
          <View style={[styles.toggleRow, { marginTop: 14 }]}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>Role Viewing Timer</Text>
              <Text style={styles.toggleSub}>
                {settings.enableRoleTimer !== false
                  ? 'Active: Auto-advances when time expires'
                  : 'Disabled: Take as much time as needed'}
              </Text>
            </View>
            <Switch
              value={settings.enableRoleTimer !== false}
              onValueChange={(val) => {
                haptics.tap();
                updateSettings({ enableRoleTimer: val });
              }}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          {settings.enableRoleTimer !== false && (
            <View style={[styles.cardRow, { marginTop: 10, paddingLeft: 12 }]}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={[styles.toggleLabel, { fontSize: 13, color: COLORS.textSecondary }]}>
                  Duration per player
                </Text>
              </View>

              <View style={styles.stepperContainer}>
                <TouchableOpacity
                  onPress={() => {
                    const current = settings.roleRevealDurationSeconds || 20;
                    if (current > 5) {
                      haptics.tap();
                      updateSettings({ roleRevealDurationSeconds: current - 5 });
                    }
                  }}
                  disabled={(settings.roleRevealDurationSeconds || 20) <= 5}
                  style={[
                    styles.stepBtn,
                    (settings.roleRevealDurationSeconds || 20) <= 5 && styles.stepBtnDisabled,
                  ]}
                >
                  <Ionicons name="remove" size={18} color={COLORS.text} />
                </TouchableOpacity>

                <Text style={styles.stepCountText}>{`${settings.roleRevealDurationSeconds || 20}s`}</Text>

                <TouchableOpacity
                  onPress={() => {
                    const current = settings.roleRevealDurationSeconds || 20;
                    if (current < 60) {
                      haptics.tap();
                      updateSettings({ roleRevealDurationSeconds: current + 5 });
                    }
                  }}
                  disabled={(settings.roleRevealDurationSeconds || 20) >= 60}
                  style={[
                    styles.stepBtn,
                    (settings.roleRevealDurationSeconds || 20) >= 60 && styles.stepBtnDisabled,
                  ]}
                >
                  <Ionicons name="add" size={18} color={COLORS.text} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Clue Speaker Timer */}
          <View style={[styles.toggleRow, { marginTop: 16, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 14 }]}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>Speaker Clue Turn</Text>
              <Text style={styles.toggleSub}>
                {settings.enableSpeakerTimer !== false
                  ? 'Active: Time limit for each clue'
                  : 'Disabled: Untimed clues (advance manually)'}
              </Text>
            </View>
            <Switch
              value={settings.enableSpeakerTimer !== false}
              onValueChange={(val) => {
                haptics.tap();
                updateSettings({ enableSpeakerTimer: val });
              }}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          {settings.enableSpeakerTimer !== false && (
            <View style={[styles.cardRow, { marginTop: 10, paddingLeft: 12 }]}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={[styles.toggleLabel, { fontSize: 13, color: COLORS.textSecondary }]}>
                  Duration per speaker
                </Text>
              </View>

              <View style={styles.stepperContainer}>
                <TouchableOpacity
                  onPress={() => {
                    const current = settings.clueSpeakerDurationSeconds || 15;
                    if (current > 5) {
                      haptics.tap();
                      updateSettings({ clueSpeakerDurationSeconds: current - 5 });
                    }
                  }}
                  disabled={(settings.clueSpeakerDurationSeconds || 15) <= 5}
                  style={[
                    styles.stepBtn,
                    (settings.clueSpeakerDurationSeconds || 15) <= 5 && styles.stepBtnDisabled,
                  ]}
                >
                  <Ionicons name="remove" size={18} color={COLORS.text} />
                </TouchableOpacity>

                <Text style={styles.stepCountText}>{`${settings.clueSpeakerDurationSeconds || 15}s`}</Text>

                <TouchableOpacity
                  onPress={() => {
                    const current = settings.clueSpeakerDurationSeconds || 15;
                    if (current < 60) {
                      haptics.tap();
                      updateSettings({ clueSpeakerDurationSeconds: current + 5 });
                    }
                  }}
                  disabled={(settings.clueSpeakerDurationSeconds || 15) >= 60}
                  style={[
                    styles.stepBtn,
                    (settings.clueSpeakerDurationSeconds || 15) >= 60 && styles.stepBtnDisabled,
                  ]}
                >
                  <Ionicons name="add" size={18} color={COLORS.text} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Turn Order Mode */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Clue Speaking Order</Text>
          <Text style={[styles.cardSub, { marginBottom: 14 }]}>
            How players take turns during the investigation clue phase
          </Text>

          <View style={styles.modeRow}>
            {[
              {
                id: 'SEATING_ORDER' as const,
                label: 'Seating Circle',
                icon: 'people-circle-outline',
                desc: 'Follows physical seating arrangement (arranged with ▲▼)',
              },
              {
                id: 'RANDOMIZED' as const,
                label: 'Random Order',
                icon: 'shuffle-outline',
                desc: 'Shuffled turn sequence every investigation round',
              },
            ].map((order) => {
              const isSelected = (settings.speakingOrderMode || 'SEATING_ORDER') === order.id;
              return (
                <TouchableOpacity
                  key={order.id}
                  activeOpacity={0.8}
                  onPress={() => {
                    haptics.tap();
                    updateSettings({ speakingOrderMode: order.id });
                  }}
                  style={[
                    styles.modeCard,
                    isSelected ? styles.modeCardSelected : styles.modeCardUnselected,
                  ]}
                >
                  <Ionicons
                    name={order.icon as any}
                    size={22}
                    color={isSelected ? COLORS.primary : COLORS.textMuted}
                  />
                  <Text
                    style={[
                      styles.modeCardTitle,
                      isSelected && { color: COLORS.primary, fontWeight: '800' },
                    ]}
                  >
                    {order.label}
                  </Text>
                  <Text style={styles.modeCardDesc}>{order.desc}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Timers & Tactile Settings */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Audio & Haptics</Text>
          <View style={[styles.toggleRow, { marginTop: 10 }]}>
            <View>
              <Text style={styles.toggleLabel}>Tactile Haptics</Text>
              <Text style={styles.toggleSub}>Physical vibrations on peek & tap</Text>
            </View>
            <Switch
              value={settings.hapticsEnabled}
              onValueChange={(val) => updateSettings({ hapticsEnabled: val })}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Start Button */}
      <View style={styles.bottomBar}>
        <NeonButton
          title="Start Round Now"
          icon="play"
          size="lg"
          onPress={handleStartGame}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: 6,
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
  },
  container: {
    padding: 20,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  cardTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '800',
  },
  modeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modeCard: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeCardSelected: {
    backgroundColor: 'rgba(0, 230, 118, 0.1)',
    borderColor: COLORS.primary,
  },
  modeCardUnselected: {
    backgroundColor: COLORS.cardSecondary,
    borderColor: COLORS.border,
  },
  modeCardTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 6,
    textAlign: 'center',
  },
  modeCardDesc: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center',
  },
  cardSub: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardSecondary,
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnDisabled: {
    opacity: 0.3,
  },
  stepCountText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
    paddingHorizontal: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleInfo: {
    flex: 1,
    marginRight: 12,
  },
  toggleLabel: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
  },
  toggleSub: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  selectAllText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  categoryCard: {
    width: '48%',
    backgroundColor: COLORS.cardSecondary,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  categoryCardSelected: {
    backgroundColor: 'rgba(0, 230, 118, 0.1)',
    borderColor: COLORS.primary,
  },
  categoryCardUnselected: {
    backgroundColor: COLORS.cardSecondary,
    borderColor: COLORS.border,
  },
  catIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  catIconCircleSelected: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(0, 230, 118, 0.15)',
  },
  categoryCardTitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  categoryCardTitleSelected: {
    color: COLORS.text,
    fontWeight: '800',
  },
  categoryCardAmharic: {
    color: COLORS.primary,
    fontSize: 11,
    marginTop: 1,
    textAlign: 'center',
    fontWeight: '600',
  },
  categoryCountText: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  manageCustomBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 145, 0, 0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 145, 0, 0.25)',
  },
  manageCustomBtnText: {
    color: '#FF9100',
    fontSize: 13,
    fontWeight: '700',
  },
  fairnessOptions: {
    gap: 10,
  },
  fairnessCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  fairnessCardSelected: {
    backgroundColor: 'rgba(0, 230, 118, 0.08)',
    borderColor: COLORS.primary,
  },
  fairnessCardUnselected: {
    backgroundColor: COLORS.cardSecondary,
    borderColor: COLORS.border,
  },
  fairnessRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.borderHighlight,
    marginRight: 12,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fairnessRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  fairnessTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  fairnessDesc: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.backgroundSecondary,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
});
