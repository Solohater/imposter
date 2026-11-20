import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/shared/theme/colors';
import { NeonButton } from '@/shared/components/NeonButton';
import { usePlayerStore } from '@/core/store/use-player-store';
import { useSettingsStore } from '@/core/store/use-settings-store';
import { useGameStore } from '@/core/store/use-game-store';
import { useProfileStore } from '@/core/store/use-profile-store';
import { useHaptics } from '@/shared/hooks/useHaptics';
import { Avatar } from '@/shared/components/Avatar';
import { ProfileEditModal } from '@/shared/components/ProfileEditModal';

export default function HomeScreen() {
  const router = useRouter();
  const haptics = useHaptics();
  const players = usePlayerStore((s) => s.players);
  const settings = useSettingsStore((s) => s.settings);
  const startNewRound = useGameStore((s) => s.startNewRound);
  const profile = useProfileStore((s) => s.profile);

  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const activePlayers = players.filter((p) => p.isActive);

  const handleQuickPlay = () => {
    if (activePlayers.length < 3) {
      router.push('/players');
      return;
    }

    const success = startNewRound();
    if (success) {
      router.push('/game/reveal');
    } else {
      router.push('/setup');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} bounces={false}>
        {/* Top Profile Chip Bar */}
        <View style={styles.topProfileBar}>
          <TouchableOpacity
            style={styles.profileChip}
            activeOpacity={0.8}
            onPress={() => {
              haptics.tap();
              setShowProfileModal(true);
            }}
          >
            <Avatar
              name={profile.name}
              color={profile.avatarColor}
              size={36}
              avatarUri={profile.avatarUri}
              avatarIcon={profile.avatarIcon}
            />
            <View style={styles.profileChipInfo}>
              <Text style={styles.profileChipName} numberOfLines={1}>{profile.name}</Text>
              <Text style={styles.profileChipSub}>My Profile</Text>
            </View>
            <Ionicons name="pencil-outline" size={14} color={COLORS.primary} style={{ marginLeft: 6 }} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.howToPlayMiniBtn}
            onPress={() => {
              haptics.tap();
              setShowHowToPlay(true);
            }}
          >
            <Ionicons name="help-circle-outline" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Glowing Logo & Header */}
        <View style={styles.header}>
          <Image
            source={require('../../assets/images/icon.png')}
            style={styles.appLogo}
            resizeMode="cover"
          />
          <Text style={styles.title}>IMPOSTER</Text>
          <Text style={styles.subtitle}>
            Blend in. Give subtle clues. Unmask the deceiver.
          </Text>
        </View>

        {/* Multi-Device Hotspot Hero Card */}
        <TouchableOpacity
          style={styles.hotspotHeroCard}
          activeOpacity={0.88}
          onPress={() => {
            haptics.tap();
            router.push('/multiplayer');
          }}
        >
          <View style={styles.hotspotHeroHeader}>
            <View style={styles.hotspotIconBox}>
              <Ionicons name="wifi" size={26} color="#39FF14" />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <View style={styles.hotspotBadgeRow}>
                <Text style={styles.hotspotBadgeText}>HOTSPOT MULTIPLAYER</Text>
                <View style={styles.offlinePill}>
                  <Text style={styles.offlinePillText}>100% OFFLINE</Text>
                </View>
              </View>
              <Text style={styles.hotspotTitle}>Play on Separate Phones</Text>
              <Text style={styles.hotspotSub}>
                Connect over Wi-Fi Hotspot. See roles and vote secretly on each device!
              </Text>
            </View>
          </View>
          <View style={styles.hotspotActionRow}>
            <Text style={styles.hotspotActionText}>Host or Join Room</Text>
            <Ionicons name="arrow-forward" size={16} color="#39FF14" />
          </View>
        </TouchableOpacity>

        {/* Hero Play Section (Single Phone Pass & Play) */}
        <View style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <View>
              <Text style={styles.heroReadyTitle}>PASS & PLAY (1 PHONE)</Text>
              <Text style={styles.heroReadySub}>
                {activePlayers.length} Players · {settings.imposterCount} Imposter
                {settings.imposterCount > 1 ? 's' : ''}
              </Text>
            </View>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>
                {settings.selectedCategories.length} Categories
              </Text>
            </View>
          </View>

          <NeonButton
            title="START ROUND"
            icon="play"
            size="lg"
            onPress={handleQuickPlay}
            style={styles.playButton}
          />
        </View>

        {/* Quick Access Menu Cards */}
        <View style={styles.menuGrid}>
          {/* Players Roster */}
          <TouchableOpacity
            style={styles.menuCard}
            activeOpacity={0.8}
            onPress={() => {
              haptics.tap();
              router.push('/players');
            }}
          >
            <View style={[styles.menuIconBox, { backgroundColor: 'rgba(0, 229, 255, 0.15)' }]}>
              <Ionicons name="people" size={24} color={COLORS.civilian} />
            </View>
            <Text style={styles.menuCardTitle}>Players</Text>
            <Text style={styles.menuCardSub}>
              {activePlayers.length} active of {players.length} total
            </Text>
          </TouchableOpacity>

          {/* Game Setup & Rules */}
          <TouchableOpacity
            style={styles.menuCard}
            activeOpacity={0.8}
            onPress={() => {
              haptics.tap();
              router.push('/setup');
            }}
          >
            <View style={[styles.menuIconBox, { backgroundColor: 'rgba(255, 145, 0, 0.15)' }]}>
              <Ionicons name="options" size={24} color={COLORS.imposterLight} />
            </View>
            <Text style={styles.menuCardTitle}>Settings</Text>
            <Text style={styles.menuCardSub}>
              Hints, categories & fairness
            </Text>
          </TouchableOpacity>

          {/* Fairness Stats */}
          <TouchableOpacity
            style={styles.menuCard}
            activeOpacity={0.8}
            onPress={() => {
              haptics.tap();
              router.push('/stats');
            }}
          >
            <View style={[styles.menuIconBox, { backgroundColor: 'rgba(0, 230, 118, 0.15)' }]}>
              <Ionicons name="bar-chart" size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.menuCardTitle}>Fairness</Text>
            <Text style={styles.menuCardSub}>
              Role history & balance stats
            </Text>
          </TouchableOpacity>

          {/* Custom Packs & Words */}
          <TouchableOpacity
            style={styles.menuCard}
            activeOpacity={0.8}
            onPress={() => {
              haptics.tap();
              router.push('/custom');
            }}
          >
            <View style={[styles.menuIconBox, { backgroundColor: 'rgba(255, 145, 0, 0.15)' }]}>
              <Ionicons name="color-wand" size={24} color="#FF9100" />
            </View>
            <Text style={styles.menuCardTitle}>Custom Packs</Text>
            <Text style={styles.menuCardSub}>
              Add custom words & photos
            </Text>
          </TouchableOpacity>

          {/* How to Play Modal Trigger */}
          <TouchableOpacity
            style={styles.menuCard}
            activeOpacity={0.8}
            onPress={() => {
              haptics.tap();
              setShowHowToPlay(true);
            }}
          >
            <View style={[styles.menuIconBox, { backgroundColor: 'rgba(255, 214, 0, 0.15)' }]}>
              <Ionicons name="help-circle" size={24} color={COLORS.warning} />
            </View>
            <Text style={styles.menuCardTitle}>How to Play</Text>
            <Text style={styles.menuCardSub}>
              Quick 4-step game rules
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer info */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>100% Offline · Single Phone Gameplay</Text>
        </View>
      </ScrollView>

      {/* How to Play Modal */}
      <Modal visible={showHowToPlay} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>How to Play</Text>
              <TouchableOpacity
                onPress={() => setShowHowToPlay(false)}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.ruleStep}>
                <View style={styles.ruleNumber}>
                  <Text style={styles.ruleNumberText}>1</Text>
                </View>
                <View style={styles.ruleBody}>
                  <Text style={styles.ruleStepTitle}>Pass & Peek</Text>
                  <Text style={styles.ruleStepDesc}>
                    Pass the phone to each player. Hold down the card to peek at your secret word. Civilians receive the secret word; the Imposter receives only category clues!
                  </Text>
                </View>
              </View>

              <View style={styles.ruleStep}>
                <View style={styles.ruleNumber}>
                  <Text style={styles.ruleNumberText}>2</Text>
                </View>
                <View style={styles.ruleBody}>
                  <Text style={styles.ruleStepTitle}>Give Clues</Text>
                  <Text style={styles.ruleStepDesc}>
                    In turn, each player gives a 1-word clue related to the secret word. The Imposter tries to blend in without knowing the word!
                  </Text>
                </View>
              </View>

              <View style={styles.ruleStep}>
                <View style={styles.ruleNumber}>
                  <Text style={styles.ruleNumberText}>3</Text>
                </View>
                <View style={styles.ruleBody}>
                  <Text style={styles.ruleStepTitle}>Debate & Vote</Text>
                  <Text style={styles.ruleStepDesc}>
                    Discuss who gave suspicious clues and vote to eliminate the suspected Imposter.
                  </Text>
                </View>
              </View>

              <View style={styles.ruleStep}>
                <View style={styles.ruleNumber}>
                  <Text style={styles.ruleNumberText}>4</Text>
                </View>
                <View style={styles.ruleBody}>
                  <Text style={styles.ruleStepTitle}>Unmask & Score</Text>
                  <Text style={styles.ruleStepDesc}>
                    Civilians win (+5 pts) if they vote out the Imposter. Imposters win (+15 pts) if they survive or fool civilians into voting an innocent out!
                  </Text>
                </View>
              </View>

              <NeonButton
                title="Got it, Let's Play!"
                onPress={() => setShowHowToPlay(false)}
                style={{ marginTop: 16 }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Profile Edit Modal */}
      <ProfileEditModal
        visible={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />
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
  topProfileBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 22,
    paddingVertical: 4,
    paddingHorizontal: 8,
    paddingRight: 12,
  },
  profileChipInfo: {
    marginLeft: 8,
  },
  profileChipName: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '800',
    maxWidth: 130,
  },
  profileChipSub: {
    color: COLORS.textMuted,
    fontSize: 10,
  },
  howToPlayMiniBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hotspotHeroCard: {
    backgroundColor: 'rgba(57, 255, 20, 0.05)',
    borderWidth: 1.5,
    borderColor: 'rgba(57, 255, 20, 0.35)',
    borderRadius: 22,
    padding: 18,
    marginBottom: 18,
  },
  hotspotHeroHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  hotspotIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(57, 255, 20, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hotspotBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  hotspotBadgeText: {
    color: '#39FF14',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  offlinePill: {
    backgroundColor: 'rgba(57, 255, 20, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  offlinePillText: {
    color: '#39FF14',
    fontSize: 9,
    fontWeight: '900',
  },
  hotspotTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 4,
  },
  hotspotSub: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },
  hotspotActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 6,
  },
  hotspotActionText: {
    color: '#39FF14',
    fontSize: 13,
    fontWeight: '800',
  },
  header: {
    alignItems: 'center',
    marginVertical: 20,
  },
  appLogo: {
    width: 80,
    height: 80,
    borderRadius: 22,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
  title: {
    color: COLORS.text,
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: 3,
    marginBottom: 6,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 20,
  },
  heroCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 20,
    marginBottom: 20,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  heroReadyTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  heroReadySub: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginTop: 2,
    fontWeight: '600',
  },
  categoryBadge: {
    backgroundColor: COLORS.cardSecondary,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  categoryBadgeText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  playButton: {
    width: '100%',
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  menuCard: {
    width: '48%',
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    minHeight: 120,
    justifyContent: 'space-between',
  },
  menuIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  menuCardTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
  },
  menuCardSub: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  footer: {
    alignItems: 'center',
    marginTop: 10,
  },
  footerText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.backgroundSecondary,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 4,
  },
  ruleStep: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  ruleNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.cardSecondary,
    borderWidth: 1,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    marginTop: 2,
  },
  ruleNumberText: {
    color: COLORS.primary,
    fontWeight: '800',
    fontSize: 14,
  },
  ruleBody: {
    flex: 1,
  },
  ruleStepTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  ruleStepDesc: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
});
