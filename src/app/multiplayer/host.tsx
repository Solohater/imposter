import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/shared/theme/colors';
import { Avatar } from '@/shared/components/Avatar';
import { NeonButton } from '@/shared/components/NeonButton';
import { useProfileStore } from '@/core/store/use-profile-store';
import { useMultiplayerStore, generateRandomKeyword } from '@/core/store/use-multiplayer-store';
import { useSettingsStore } from '@/core/store/use-settings-store';
import { useHaptics } from '@/shared/hooks/useHaptics';

export default function HostLobbyScreen() {
  const router = useRouter();
  const haptics = useHaptics();

  const profile = useProfileStore((s) => s.profile);
  const settings = useSettingsStore((s) => s.settings);

  const startHosting = useMultiplayerStore((s) => s.startHosting);
  const stopHosting = useMultiplayerStore((s) => s.stopHosting);
  const setRoomName = useMultiplayerStore((s) => s.setRoomName);
  const setRoomKey = useMultiplayerStore((s) => s.setRoomKey);
  const hostIp = useMultiplayerStore((s) => s.hostIp);
  const publicState = useMultiplayerStore((s) => s.publicState);
  const addBot = useMultiplayerStore((s) => s.addBot);
  const removePlayer = useMultiplayerStore((s) => s.removePlayer);
  const startMultiplayerRound = useMultiplayerStore((s) => s.startMultiplayerRound);

  const [roomName, setLocalRoomName] = useState(`${profile.name}'s Room`);
  const [roomKey, setLocalRoomKey] = useState(generateRandomKeyword);

  const initialRoomNameRef = useRef(roomName);
  const initialRoomKeyRef = useRef(roomKey);

  useEffect(() => {
    let active = true;
    startHosting(profile, initialRoomNameRef.current, initialRoomKeyRef.current).then((success) => {
      if (!success && active) {
        Alert.alert('Server Error', 'Failed to start local Wi-Fi / Hotspot server.');
      }
    });

    return () => {
      active = false;
    };
  }, [profile, startHosting]);

  const handleRoomNameChange = (text: string) => {
    setLocalRoomName(text);
    if (text.trim().length > 0) {
      setRoomName(text.trim());
    }
  };

  const handleRoomKeyChange = (text: string) => {
    const clean = text.toUpperCase().trim();
    setLocalRoomKey(clean);
    if (clean.length > 0) {
      setRoomKey(clean.toLowerCase());
    }
  };

  const handleGenerateNewKey = () => {
    haptics.tap();
    const newKey = generateRandomKeyword();
    setLocalRoomKey(newKey);
    setRoomKey(newKey.toLowerCase());
  };

  const handleStartGame = () => {
    if (publicState.players.length < 3) {
      Alert.alert(
        'Need 3+ Players',
        'Imposter requires at least 3 players. Ask friends to connect to your Wi-Fi, or tap "+ Add AI Bot".'
      );
      return;
    }

    haptics.success();
    const success = startMultiplayerRound({
      imposterCount: settings.imposterCount,
      gameMode: settings.gameMode,
      showAmharic: settings.showAmharic,
      selectedCategories: settings.selectedCategories,
    });

    if (success) {
      router.push('/multiplayer/game');
    }
  };

  const handleExit = async () => {
    haptics.tap();
    await stopHosting();
    router.back();
  };

  const players = publicState.players;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} bounces={false}>
        {/* Navigation Bar */}
        <View style={styles.navBar}>
          <TouchableOpacity style={styles.backBtn} onPress={handleExit}>
            <Ionicons name="close" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.navTitle}>HOSTING ROOM</Text>
          <TouchableOpacity
            style={styles.settingsBtn}
            onPress={() => {
              haptics.tap();
              router.push('/setup');
            }}
          >
            <Ionicons name="options-outline" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* Hotspot & Wi-Fi Connection Info Card */}
        <View style={styles.connectionCard}>
          <View style={styles.connectionHeader}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>ROOM ACTIVE ON LOCAL WI-FI / HOTSPOT</Text>
          </View>

          {/* Editable Room Name */}
          <View style={styles.roomNameSection}>
            <View style={styles.roomNameLabelRow}>
              <Ionicons name="home-outline" size={14} color={COLORS.primary} style={{ marginRight: 6 }} />
              <Text style={styles.roomNameLabel}>ROOM NAME</Text>
            </View>
            <View style={styles.roomNameInputContainer}>
              <TextInput
                style={styles.roomNameInput}
                value={roomName}
                onChangeText={handleRoomNameChange}
                placeholder="Enter Room Name"
                placeholderTextColor={COLORS.textMuted}
                maxLength={28}
                autoCorrect={false}
              />
              <Ionicons name="pencil" size={16} color={COLORS.primary} style={styles.editIcon} />
            </View>
          </View>

          {/* Generated Room Keyword Banner */}
          <View style={styles.keywordCard}>
            <View style={styles.keywordHeaderRow}>
              <View style={styles.keywordBadge}>
                <Ionicons name="key" size={13} color={COLORS.warning} style={{ marginRight: 4 }} />
                <Text style={styles.keywordBadgeText}>ROOM KEYWORD</Text>
              </View>
              <TouchableOpacity
                style={styles.diceBtn}
                onPress={handleGenerateNewKey}
                activeOpacity={0.7}
              >
                <Ionicons name="dice-outline" size={15} color={COLORS.warning} style={{ marginRight: 4 }} />
                <Text style={styles.diceBtnText}>New Key</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.keywordInputWrapper}>
              <TextInput
                style={styles.keywordInputText}
                value={roomKey.toUpperCase()}
                onChangeText={handleRoomKeyChange}
                placeholder="KEYWORD"
                placeholderTextColor={COLORS.textMuted}
                maxLength={12}
                autoCapitalize="characters"
                autoCorrect={false}
              />
              <Ionicons name="pencil" size={15} color={COLORS.warning} style={{ marginLeft: 8 }} />
            </View>
          </View>

          <Text style={styles.instructionText}>
            {'Players on the '}
            <Text style={{ color: COLORS.primary, fontWeight: '800' }}>same Wi-Fi network</Text>
            {' or your Hotspot can enter keyword '}
            <Text style={{ color: COLORS.warning, fontWeight: '900' }}>{roomKey.toUpperCase()}</Text>
            {' to connect instantly! (Or tap '}
            <Text style={{ color: COLORS.text, fontWeight: '700' }}>&quot;{roomName}&quot;</Text>
            {' in room list)'}
          </Text>

          <View style={styles.techInfoRow}>
            <Text style={styles.techInfoText}>Network: Local Wi-Fi / Hotspot · Host IP: {hostIp}</Text>
          </View>
        </View>

        {/* Roster Header */}
        <View style={styles.rosterHeader}>
          <Text style={styles.rosterTitle}>
            PLAYERS IN ROOM ({players.length})
          </Text>
          <TouchableOpacity
            style={styles.addBotBtn}
            onPress={() => {
              haptics.tap();
              addBot();
            }}
          >
            <Ionicons name="add" size={16} color="#7C3AED" style={{ marginRight: 4 }} />
            <Text style={styles.addBotText}>Add AI Bot</Text>
          </TouchableOpacity>
        </View>

        {/* Players List */}
        <View style={styles.playerList}>
          {players.map((p) => (
            <View key={p.id} style={styles.playerRow}>
              <View style={styles.playerRowLeft}>
                <Avatar
                  name={p.name}
                  color={p.avatarColor}
                  size={46}
                  avatarUri={p.avatarUri}
                  avatarIcon={p.avatarIcon}
                  isBot={p.isBot}
                />
                <View style={styles.playerNameBox}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={styles.playerName}>{p.name}</Text>
                    {p.isHost && (
                      <View style={styles.hostBadge}>
                        <Text style={styles.hostBadgeText}>HOST</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.playerSub}>
                    {p.isHost ? 'Leader Device' : p.isBot ? 'Autonomous AI' : 'Connected via Hotspot'}
                  </Text>
                </View>
              </View>

              {!p.isHost && (
                <TouchableOpacity
                  style={styles.kickBtn}
                  onPress={() => {
                    haptics.tap();
                    removePlayer(p.id);
                  }}
                >
                  <Ionicons name="close-circle-outline" size={20} color={COLORS.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Footer Start Button */}
      <View style={styles.footer}>
        <NeonButton
          title={players.length < 3 ? `NEED ${3 - players.length} MORE PLAYERS` : 'START GAME NOW'}
          icon="play"
          size="lg"
          disabled={players.length < 3}
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
  container: {
    padding: 20,
    paddingBottom: 100,
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
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  connectionCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.3)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
  },
  connectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#39FF14',
    marginRight: 8,
  },
  statusText: {
    color: '#39FF14',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  roomNameSection: {
    marginBottom: 14,
  },
  roomNameLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  roomNameLabel: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  roomNameInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 229, 255, 0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 229, 255, 0.3)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  roomNameInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '900',
    padding: 0,
  },
  editIcon: {
    marginLeft: 8,
  },
  roomKeyRow: {
    marginBottom: 12,
  },
  keywordCard: {
    backgroundColor: 'rgba(255, 145, 0, 0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 145, 0, 0.35)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  keywordHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  keywordBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  keywordBadgeText: {
    color: COLORS.warning,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  diceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 145, 0, 0.15)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 145, 0, 0.4)',
  },
  diceBtnText: {
    color: COLORS.warning,
    fontSize: 11,
    fontWeight: '800',
  },
  keywordInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  keywordInputText: {
    flex: 1,
    color: COLORS.warning,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 2,
    padding: 0,
  },
  roomKeyInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 145, 0, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 145, 0, 0.3)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  roomKeyLabel: {
    color: COLORS.warning,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginRight: 8,
  },
  roomKeyInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '900',
    padding: 0,
  },
  ipBadgeRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  ipBox: {
    flex: 1,
    backgroundColor: 'rgba(0, 229, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.2)',
    borderRadius: 14,
    padding: 12,
  },
  portBox: {
    width: 90,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 14,
    padding: 12,
  },
  ipLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  ipValue: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: '900',
  },
  portValue: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '900',
  },
  instructionText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 10,
  },
  techInfoRow: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  techInfoText: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '700',
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
    letterSpacing: 0.8,
  },
  addBotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.3)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  addBotText: {
    color: '#A78BFA',
    fontSize: 12,
    fontWeight: '800',
  },
  playerList: {
    gap: 10,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 12,
  },
  playerRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playerNameBox: {
    marginLeft: 12,
  },
  playerName: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '800',
  },
  hostBadge: {
    backgroundColor: 'rgba(0, 229, 255, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  hostBadgeText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '900',
  },
  playerSub: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  kickBtn: {
    padding: 6,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
});
