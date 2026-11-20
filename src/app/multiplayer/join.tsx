import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/shared/theme/colors';
import { Avatar } from '@/shared/components/Avatar';
import { NeonButton } from '@/shared/components/NeonButton';
import { useProfileStore } from '@/core/store/use-profile-store';
import { useMultiplayerStore } from '@/core/store/use-multiplayer-store';
import { useHaptics } from '@/shared/hooks/useHaptics';
import { scanForLocalRooms, DiscoveredRoom } from '@/core/network/room-scanner';

export default function JoinLobbyScreen() {
  const router = useRouter();
  const haptics = useHaptics();

  const profile = useProfileStore((s) => s.profile);
  const isConnected = useMultiplayerStore((s) => s.isConnected);
  const connectionError = useMultiplayerStore((s) => s.connectionError);
  const publicState = useMultiplayerStore((s) => s.publicState);
  const joinRoom = useMultiplayerStore((s) => s.joinRoom);
  const joinByRoomKey = useMultiplayerStore((s) => s.joinByRoomKey);
  const leaveRoom = useMultiplayerStore((s) => s.leaveRoom);

  const [inputIp, setInputIp] = useState('192.168.43.1');
  const [inputKey, setInputKey] = useState('');
  const [isConnectingKey, setIsConnectingKey] = useState(false);
  const [connectingIp, setConnectingIp] = useState<string | null>(null);
  const [discoveredRooms, setDiscoveredRooms] = useState<DiscoveredRoom[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [showManualIp, setShowManualIp] = useState(false);

  // Scan for local hotspot rooms silently in the background
  const handleScan = useCallback(async () => {
    if (isConnected) return;
    setIsScanning(true);
    try {
      const rooms = await scanForLocalRooms();
      setDiscoveredRooms((prev) => {
        // Prevent re-render if room list hasn't changed
        if (prev.length !== rooms.length) return rooms;
        if (
          rooms.length > 0 &&
          (prev[0]?.hostIp !== rooms[0]?.hostIp ||
            prev[0]?.roomCode !== rooms[0]?.roomCode ||
            prev[0]?.playerCount !== rooms[0]?.playerCount)
        ) {
          return rooms;
        }
        return prev;
      });
    } catch {
      // ignore
    } finally {
      setIsScanning(false);
    }
  }, [isConnected]);

  // Initial scan + periodic discovery while disconnected
  useEffect(() => {
    if (isConnected) return;
    const timeout = setTimeout(() => {
      handleScan();
    }, 50);

    const interval = setInterval(() => {
      handleScan();
    }, 3000);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [isConnected, handleScan]);

  // If host starts round, advance to game screen
  useEffect(() => {
    if (isConnected && publicState.phase === 'REVEAL') {
      router.push('/multiplayer/game');
    }
  }, [isConnected, publicState.phase, router]);

  const handleConnectToIp = async (ipToJoin: string) => {
    haptics.tap();
    setConnectingIp(ipToJoin);
    const success = await joinRoom(ipToJoin, profile);
    setConnectingIp(null);
    if (success) {
      haptics.success();
    } else {
      haptics.error();
    }
  };

  const handleConnectByKey = async () => {
    if (!inputKey.trim()) return;
    haptics.tap();
    setIsConnectingKey(true);
    const success = await joinByRoomKey(inputKey.trim(), profile);
    setIsConnectingKey(false);
    if (success) {
      haptics.success();
    } else {
      haptics.error();
    }
  };

  const handleLeave = () => {
    haptics.tap();
    leaveRoom();
    router.back();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} bounces={false}>
        {/* Navigation Bar */}
        <View style={styles.navBar}>
          <TouchableOpacity style={styles.backBtn} onPress={handleLeave}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.navTitle}>JOIN ROOM</Text>
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={() => {
              haptics.tap();
              handleScan();
            }}
            disabled={isScanning}
          >
            {isScanning ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <Ionicons name="refresh" size={20} color={COLORS.primary} />
            )}
          </TouchableOpacity>
        </View>

        {!isConnected ? (
          <View>
            {/* Primary Action: Connect by Host Keyword */}
            <View style={styles.keywordCard}>
              <View style={styles.keywordHeaderRow}>
                <Ionicons name="key" size={18} color={COLORS.warning} style={{ marginRight: 6 }} />
                <Text style={styles.keywordHeaderTitle}>JOIN BY HOST KEYWORD</Text>
              </View>
              <Text style={styles.keywordHeaderSubtitle}>
                {"On the same Wi-Fi network or Hotspot? Enter the keyword generated by the host to connect:"}
              </Text>
              <View style={styles.keywordInputRow}>
                <TextInput
                  style={styles.keywordInput}
                  value={inputKey.toUpperCase()}
                  onChangeText={(val) => setInputKey(val.toUpperCase())}
                  placeholder="e.g. LION"
                  placeholderTextColor={COLORS.textMuted}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  onSubmitEditing={handleConnectByKey}
                />
                <TouchableOpacity
                  style={styles.keywordSubmitBtn}
                  onPress={handleConnectByKey}
                  disabled={isConnectingKey}
                >
                  {isConnectingKey ? (
                    <ActivityIndicator size="small" color="#050B14" />
                  ) : (
                    <>
                      <Text style={styles.keywordSubmitText}>CONNECT</Text>
                      <Ionicons name="arrow-forward" size={14} color="#050B14" style={{ marginLeft: 4 }} />
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Error Message */}
            {connectionError ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color={COLORS.danger} style={{ marginRight: 6 }} />
                <Text style={styles.errorText}>{connectionError}</Text>
              </View>
            ) : null}

            {/* Auto-Discovered Rooms Header */}
            <View style={styles.discoveryHeader}>
              <View>
                <Text style={styles.sectionHeaderTitle}>DISCOVERED ROOMS ON WI-FI</Text>
                <Text style={styles.sectionHeaderSubtitle}>
                  Or tap any active room below to join with 1-click
                </Text>
              </View>
            </View>

            {/* Discovered Rooms List */}
            {discoveredRooms.length > 0 ? (
              <View style={styles.roomsList}>
                {discoveredRooms.map((room) => {
                  const isThisConnecting = connectingIp === room.hostIp;
                  return (
                    <TouchableOpacity
                      key={room.hostIp}
                      style={styles.roomCard}
                      activeOpacity={0.8}
                      onPress={() => handleConnectToIp(room.hostIp)}
                      disabled={!!connectingIp}
                    >
                      <View style={styles.roomCardHeader}>
                        <View style={styles.roomBadge}>
                          <Ionicons name="wifi" size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
                          <Text style={styles.roomBadgeText}>LOCAL WI-FI</Text>
                        </View>
                        <View style={styles.keyBadge}>
                          <Ionicons name="key" size={13} color={COLORS.warning} style={{ marginRight: 4 }} />
                          <Text style={styles.keyBadgeText}>KEY: {room.roomKey?.toUpperCase() || 'LION'}</Text>
                        </View>
                        <View style={styles.playerCountBadge}>
                          <Ionicons name="people" size={14} color="#A78BFA" style={{ marginRight: 4 }} />
                          <Text style={styles.playerCountText}>{room.playerCount} Players</Text>
                        </View>
                      </View>

                      <Text style={styles.roomNameText}>{room.roomCode}</Text>

                      <View style={styles.hostRow}>
                        <Text style={styles.hostLabel}>Host: </Text>
                        <Text style={styles.hostValue}>{room.hostName}</Text>
                      </View>

                      <View style={styles.cardActionRow}>
                        <View style={styles.ipPill}>
                          <Text style={styles.ipPillText}>Auto-Discovered</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.joinBtn}
                          onPress={() => handleConnectToIp(room.hostIp)}
                          disabled={!!connectingIp}
                        >
                          {isThisConnecting ? (
                            <ActivityIndicator size="small" color="#050B14" />
                          ) : (
                            <>
                              <Text style={styles.joinBtnText}>JOIN ROOM</Text>
                              <Ionicons name="arrow-forward" size={16} color="#050B14" style={{ marginLeft: 4 }} />
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              /* No Rooms Found State */
              <View style={styles.noRoomsCard}>
                <View style={styles.scanningBox}>
                  <View style={styles.iconCircleMuted}>
                    <Ionicons name="wifi-outline" size={32} color={COLORS.primary} />
                  </View>
                  <Text style={styles.noRoomsTitle}>SCANNING LOCAL NETWORK...</Text>
                  <Text style={styles.noRoomsSubtitle}>
                    1. Connect this phone to the same Wi-Fi network or Host&apos;s Hotspot.{"\n"}
                    2. Make sure the Host is on the &quot;Hosting Room&quot; screen.
                  </Text>
                  <TouchableOpacity style={styles.retryScanBtn} onPress={handleScan}>
                    <Ionicons name="reload" size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
                    <Text style={styles.retryScanText}>SCAN NOW</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Collapsible Manual IP Entry */}
            <View style={styles.manualSection}>
              <TouchableOpacity
                style={styles.manualToggleBtn}
                onPress={() => {
                  haptics.tap();
                  setShowManualIp((prev) => !prev);
                }}
              >
                <Text style={styles.manualToggleText}>
                  {showManualIp ? 'Hide Manual IP Entry' : 'Manual IP Entry (Advanced / Fallback)'}
                </Text>
                <Ionicons
                  name={showManualIp ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={COLORS.textMuted}
                />
              </TouchableOpacity>

              {showManualIp && (
                <View style={styles.manualCard}>
                  <Text style={styles.inputLabel}>HOST IP ADDRESS</Text>
                  <TextInput
                    style={styles.ipInput}
                    value={inputIp}
                    onChangeText={setInputIp}
                    placeholder="192.168.43.1"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="numeric"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <Text style={styles.ipHelp}>
                    Default Android Hotspot IP is 192.168.43.1
                  </Text>
                  <NeonButton
                    title={connectingIp === inputIp ? 'CONNECTING...' : 'CONNECT BY IP'}
                    icon="enter"
                    size="md"
                    disabled={!!connectingIp}
                    onPress={() => handleConnectToIp(inputIp)}
                    style={{ marginTop: 12 }}
                  />
                </View>
              )}
            </View>
          </View>
        ) : (
          // Waiting Lobby (Connected)
          <View>
            <View style={styles.connectedCard}>
              <View style={styles.connectedHeader}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>CONNECTED TO ROOM</Text>
              </View>

              <Text style={styles.roomCodeText}>{publicState.roomCode}</Text>
              <Text style={styles.hostNotice}>
                Host: <Text style={{ color: COLORS.text, fontWeight: '800' }}>{publicState.hostName}</Text>
              </Text>

              <View style={styles.waitingNotice}>
                <ActivityIndicator size="small" color={COLORS.primary} style={{ marginRight: 10 }} />
                <Text style={styles.waitingText}>Waiting for Host to start game...</Text>
              </View>
            </View>

            {/* Players in Lobby */}
            <Text style={styles.rosterTitle}>
              CONNECTED PLAYERS ({publicState.players.length})
            </Text>

            <View style={styles.playerGrid}>
              {publicState.players.map((p) => {
                const isMe = p.id === profile.id;
                return (
                  <View key={p.id} style={[styles.playerItem, isMe && styles.myPlayerItem]}>
                    <Avatar
                      name={p.name}
                      color={p.avatarColor}
                      size={44}
                      avatarUri={p.avatarUri}
                      avatarIcon={p.avatarIcon}
                      isBot={p.isBot}
                    />
                    <Text style={styles.playerName} numberOfLines={1}>
                      {p.name} {isMe ? '(You)' : ''}
                    </Text>
                    {p.isHost ? (
                      <View style={styles.hostMiniBadge}>
                        <Text style={styles.hostMiniText}>HOST</Text>
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          </View>
        )}
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
  refreshBtn: {
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
  discoveryHeader: {
    marginBottom: 16,
  },
  sectionHeaderTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  sectionHeaderSubtitle: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 3,
  },
  roomsList: {
    gap: 14,
    marginBottom: 20,
  },
  roomCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 229, 255, 0.35)',
    borderRadius: 20,
    padding: 18,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  roomCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  roomBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 229, 255, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  roomBadgeText: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  keyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 145, 0, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  keyBadgeText: {
    color: COLORS.warning,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  playerCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(124, 58, 237, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  playerCountText: {
    color: '#A78BFA',
    fontSize: 11,
    fontWeight: '800',
  },
  roomNameText: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  hostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  hostLabel: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
  hostValue: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
  },
  cardActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: 12,
  },
  ipPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  ipPillText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  joinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  joinBtnText: {
    color: '#050B14',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  noRoomsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  scanningBox: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  iconCircleMuted: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  noRoomsTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  noRoomsSubtitle: {
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  retryScanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.3)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  retryScanText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '800',
  },
  keywordCard: {
    backgroundColor: 'rgba(255, 145, 0, 0.05)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 145, 0, 0.3)',
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
  },
  keywordHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  keywordHeaderTitle: {
    color: COLORS.warning,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  keywordHeaderSubtitle: {
    color: COLORS.textMuted,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 14,
  },
  keywordInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  keywordInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 145, 0, 0.4)',
    borderRadius: 14,
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '900',
    paddingHorizontal: 14,
    paddingVertical: 11,
    textAlign: 'center',
    letterSpacing: 1,
  },
  keywordSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.warning,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 14,
  },
  keywordSubmitText: {
    color: '#050B14',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,0,85,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,0,85,0.3)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 12,
    flex: 1,
  },
  manualSection: {
    marginTop: 4,
  },
  manualToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  manualToggleText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  manualCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
  },
  inputLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  ipInput: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
    paddingHorizontal: 14,
    paddingVertical: 12,
    textAlign: 'center',
  },
  ipHelp: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginTop: 6,
    textAlign: 'center',
  },
  connectedCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: 'rgba(57, 255, 20, 0.3)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
  },
  connectedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
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
  roomCodeText: {
    color: COLORS.text,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 4,
  },
  hostNotice: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginBottom: 16,
  },
  waitingNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 229, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.2)',
    borderRadius: 12,
    padding: 12,
  },
  waitingText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  rosterTitle: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  playerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  playerItem: {
    width: '48%',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
  },
  myPlayerItem: {
    borderColor: 'rgba(0, 229, 255, 0.4)',
    backgroundColor: 'rgba(0, 229, 255, 0.05)',
  },
  playerName: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 8,
  },
  hostMiniBadge: {
    backgroundColor: 'rgba(0, 229, 255, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginTop: 4,
  },
  hostMiniText: {
    color: COLORS.primary,
    fontSize: 9,
    fontWeight: '900',
  },
});
