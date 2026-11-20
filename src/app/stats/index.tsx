import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/shared/theme/colors';
import { Avatar } from '@/shared/components/Avatar';
import { AppConfirmModal } from '@/shared/components/AppConfirmModal';
import { useGameStore } from '@/core/store/use-game-store';
import { usePlayerStore } from '@/core/store/use-player-store';
import { useSettingsStore } from '@/core/store/use-settings-store';
import { useHaptics } from '@/shared/hooks/useHaptics';

export default function StatsScreen() {
  const router = useRouter();
  const haptics = useHaptics();

  const sessionStats = useGameStore((s) => s.sessionStats);
  const roundIndex = useGameStore((s) => s.roundIndex);
  const resetSession = useGameStore((s) => s.resetSession);
  const players = usePlayerStore((s) => s.players);
  const settings = useSettingsStore((s) => s.settings);

  const activePlayers = players.filter((p) => p.isActive);
  const [isResetModalVisible, setIsResetModalVisible] = useState(false);

  const handleResetSession = () => {
    setIsResetModalVisible(true);
  };

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
        <Text style={styles.headerTitle}>Fairness & Stats</Text>
        <TouchableOpacity onPress={handleResetSession} style={styles.resetButton}>
          <Ionicons name="refresh-outline" size={20} color={COLORS.danger} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {/* Session Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryStat}>
            <Text style={styles.summaryValue}>{roundIndex}</Text>
            <Text style={styles.summaryLabel}>Rounds Played</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryStat}>
            <Text style={styles.summaryValue}>{activePlayers.length}</Text>
            <Text style={styles.summaryLabel}>Active Players</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryStat}>
            <Text style={[styles.summaryValue, { color: COLORS.primary }]}>
              {settings.fairnessMode === 'BALANCED' ? 'Balanced' : settings.fairnessMode === 'STRICT_COOLDOWN' ? 'Strict' : 'Random'}
            </Text>
            <Text style={styles.summaryLabel}>Fairness Mode</Text>
          </View>
        </View>

        {/* Imposter Distribution Audit */}
        <View style={styles.auditCard}>
          <Text style={styles.cardTitle}>IMPOSTER DISTRIBUTION AUDIT</Text>
          <Text style={styles.cardSub}>
            Historical role distribution across all rounds in this session.
          </Text>

          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.th, { flex: 2 }]}>Player</Text>
              <Text style={[styles.th, styles.thCenter]}>Imposter</Text>
              <Text style={[styles.th, styles.thCenter]}>Civilian</Text>
              <Text style={[styles.th, styles.thRight]}>Rate</Text>
            </View>

            {activePlayers.map((player) => {
              const stat = sessionStats[player.id];
              const impCount = stat?.imposterCount ?? 0;
              const civCount = stat?.civilianCount ?? 0;
              const total = impCount + civCount;
              const rate = total > 0 ? Math.round((impCount / total) * 100) : 0;

              return (
                <View key={player.id} style={styles.tableRow}>
                  <View style={[styles.tdPlayer, { flex: 2 }]}>
                    <Avatar name={player.name} color={player.avatarColor} size={28} />
                    <Text style={styles.tdPlayerName} numberOfLines={1}>
                      {player.name}
                    </Text>
                  </View>
                  <Text style={[styles.td, styles.thCenter, { color: COLORS.imposter, fontWeight: '800' }]}>
                    {impCount}
                  </Text>
                  <Text style={[styles.td, styles.thCenter, { color: COLORS.civilian }]}>
                    {civCount}
                  </Text>
                  <Text style={[styles.td, styles.thRight, { fontWeight: '700' }]}>
                    {rate}%
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Fairness Guarantee Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="shield-checkmark" size={20} color={COLORS.primary} style={{ marginRight: 8 }} />
            <Text style={styles.infoTitle}>Mathematical Fairness Guarantee</Text>
          </View>
          <Text style={styles.infoText}>
            Our Balanced Randomness engine calculates inverse frequency weights: W = 1 / (count + 1)². Players with fewer imposter rounds receive greater selection weight, while previous-round imposters are protected from consecutive selection.
          </Text>
        </View>
      </ScrollView>

      {/* Themed Reset History Modal */}
      <AppConfirmModal
        visible={isResetModalVisible}
        title="RESET SESSION HISTORY?"
        message="This will reset all session scores and fairness history for a brand new gaming session."
        icon="refresh-circle-outline"
        iconColor={COLORS.danger}
        confirmText="RESET"
        confirmColor={COLORS.danger}
        cancelText="Cancel"
        onConfirm={() => {
          setIsResetModalVisible(false);
          haptics.warning();
          resetSession();
        }}
        onCancel={() => setIsResetModalVisible(false)}
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
  resetButton: {
    padding: 6,
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  summaryStat: {
    alignItems: 'center',
  },
  summaryValue: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '900',
  },
  summaryLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  summaryDivider: {
    width: 1,
    height: 32,
    backgroundColor: COLORS.border,
  },
  auditCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
  },
  cardTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1,
  },
  cardSub: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 4,
    marginBottom: 16,
  },
  table: {
    width: '100%',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 8,
  },
  th: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '800',
    flex: 1,
  },
  thCenter: {
    textAlign: 'center',
  },
  thRight: {
    textAlign: 'right',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border + '55',
  },
  tdPlayer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tdPlayerName: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 8,
    flex: 1,
  },
  td: {
    color: COLORS.text,
    fontSize: 14,
    flex: 1,
  },
  infoCard: {
    backgroundColor: 'rgba(0, 230, 118, 0.08)',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 230, 118, 0.3)',
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoTitle: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '800',
  },
  infoText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
});
