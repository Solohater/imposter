import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/shared/theme/colors';
import { Avatar } from '@/shared/components/Avatar';
import { ProfileEditModal } from '@/shared/components/ProfileEditModal';
import { useProfileStore } from '@/core/store/use-profile-store';
import { useHaptics } from '@/shared/hooks/useHaptics';

export default function MultiplayerMenuScreen() {
  const router = useRouter();
  const haptics = useHaptics();
  const profile = useProfileStore((s) => s.profile);
  const [showProfileModal, setShowProfileModal] = useState(false);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} bounces={false}>
        {/* Navigation Bar */}
        <View style={styles.navBar}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => {
              haptics.tap();
              router.back();
            }}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.navTitle}>HOTSPOT MULTIPLAYER</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* User Profile Card (Editable) */}
        <TouchableOpacity
          style={styles.profileCard}
          activeOpacity={0.85}
          onPress={() => {
            haptics.tap();
            setShowProfileModal(true);
          }}
        >
          <View style={styles.profileLeft}>
            <Avatar
              name={profile.name}
              color={profile.avatarColor}
              size={56}
              avatarUri={profile.avatarUri}
              avatarIcon={profile.avatarIcon}
            />
            <View style={styles.profileInfo}>
              <View style={styles.profileNameRow}>
                <Text style={styles.profileName}>{profile.name}</Text>
                <View style={[styles.colorDot, { backgroundColor: profile.avatarColor }]} />
              </View>
              <Text style={styles.profileSubtitle}>Tap to edit name & photo</Text>
            </View>
          </View>
          <View style={styles.editBadge}>
            <Ionicons name="pencil" size={16} color={COLORS.primary} />
          </View>
        </TouchableOpacity>

        {/* Hotspot Offline Explainer */}
        <View style={styles.infoBanner}>
          <Ionicons name="wifi" size={22} color={COLORS.primary} style={{ marginRight: 12 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>100% Offline Local Play</Text>
            <Text style={styles.infoDesc}>
              No internet or cellular data needed! One player turns on portable hotspot, and everyone else connects to their Wi-Fi.
            </Text>
          </View>
        </View>

        {/* Mode Actions */}
        <View style={styles.actionGrid}>
          {/* Host Card */}
          <TouchableOpacity
            style={[styles.actionCard, styles.hostCard]}
            activeOpacity={0.85}
            onPress={() => {
              haptics.tap();
              router.push('/multiplayer/host');
            }}
          >
            <View style={[styles.iconBox, { backgroundColor: 'rgba(0, 229, 255, 0.15)' }]}>
              <Ionicons name="radio" size={32} color={COLORS.primary} />
            </View>
            <Text style={styles.actionTitle}>HOST ROOM</Text>
            <Text style={styles.actionDesc}>
              Turn on Hotspot on this phone. Create a local room and lead the game.
            </Text>
            <View style={styles.actionArrow}>
              <Text style={styles.actionArrowText}>Create Room</Text>
              <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
            </View>
          </TouchableOpacity>

          {/* Join Card */}
          <TouchableOpacity
            style={[styles.actionCard, styles.joinCard]}
            activeOpacity={0.85}
            onPress={() => {
              haptics.tap();
              router.push('/multiplayer/join');
            }}
          >
            <View style={[styles.iconBox, { backgroundColor: 'rgba(57, 255, 20, 0.15)' }]}>
              <Ionicons name="phone-portrait-outline" size={32} color="#39FF14" />
            </View>
            <Text style={styles.actionTitle}>JOIN ROOM</Text>
            <Text style={styles.actionDesc}>
              Connect to your friend&apos;s Hotspot Wi-Fi. See your secret role & vote on this phone.
            </Text>
            <View style={styles.actionArrow}>
              <Text style={[styles.actionArrowText, { color: '#39FF14' }]}>Join Game</Text>
              <Ionicons name="arrow-forward" size={16} color="#39FF14" />
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
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
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
  },
  profileLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileInfo: {
    marginLeft: 14,
  },
  profileNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileName: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: 8,
  },
  profileSubtitle: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  editBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 229, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.2)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  infoTitle: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  infoDesc: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  actionGrid: {
    gap: 16,
  },
  actionCard: {
    backgroundColor: COLORS.card,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  hostCard: {
    borderColor: 'rgba(0, 229, 255, 0.3)',
  },
  joinCard: {
    borderColor: 'rgba(57, 255, 20, 0.3)',
  },
  iconBox: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  actionTitle: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 6,
  },
  actionDesc: {
    color: COLORS.textMuted,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 16,
  },
  actionArrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionArrowText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '800',
  },
});
