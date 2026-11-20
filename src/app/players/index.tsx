import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  PanResponder,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/shared/theme/colors';
import { Avatar } from '@/shared/components/Avatar';
import { NeonButton } from '@/shared/components/NeonButton';
import { AppConfirmModal } from '@/shared/components/AppConfirmModal';
import { usePlayerStore, AVATAR_PALETTE } from '@/core/store/use-player-store';
import { useHaptics } from '@/shared/hooks/useHaptics';

interface DraggablePlayerRowProps {
  player: any;
  idx: number;
  total: number;
  onMove: (direction: 'UP' | 'DOWN') => void;
  onEditColor: () => void;
  onToggleActive: () => void;
  onRemove: () => void;
}

const DraggablePlayerRow: React.FC<DraggablePlayerRowProps> = ({
  player,
  idx,
  total,
  onMove,
  onEditColor,
  onToggleActive,
  onRemove,
}) => {
  const haptics = useHaptics();
  const accumulatedDy = useRef(0);
  const [isSliding, setIsSliding] = useState(false);

  const onMoveRef = useRef(onMove);
  useEffect(() => {
    onMoveRef.current = onMove;
  }, [onMove]);

  const [panResponder, setPanResponder] = useState<any>(null);

  useEffect(() => {
    const pr = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 4,
      onPanResponderGrant: () => {
        accumulatedDy.current = 0;
        setIsSliding(true);
        haptics.medium();
      },
      onPanResponderMove: (_, gesture) => {
        const delta = gesture.dy - accumulatedDy.current;
        const THRESHOLD = 36;
        if (delta < -THRESHOLD) {
          onMoveRef.current('UP');
          accumulatedDy.current = gesture.dy;
          haptics.tap();
        } else if (delta > THRESHOLD) {
          onMoveRef.current('DOWN');
          accumulatedDy.current = gesture.dy;
          haptics.tap();
        }
      },
      onPanResponderRelease: () => {
        setIsSliding(false);
        accumulatedDy.current = 0;
        haptics.success();
      },
      onPanResponderTerminate: () => {
        setIsSliding(false);
        accumulatedDy.current = 0;
      },
    });
    setPanResponder(pr);
  }, [haptics]);

  return (
    <View
      style={[
        styles.playerRow,
        !player.isActive && styles.playerRowInactive,
        isSliding && styles.playerRowSliding,
      ]}
    >
      {/* Slider & Quick-Tap Column */}
      <View style={styles.reorderColumn}>
        <TouchableOpacity
          disabled={idx === 0}
          onPress={() => {
            haptics.tap();
            onMove('UP');
          }}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          style={[styles.miniArrowBtn, idx === 0 && { opacity: 0.15 }]}
        >
          <Ionicons name="chevron-up" size={13} color={COLORS.text} />
        </TouchableOpacity>

        {/* Drag Slider Grip (Touch & Drag Up/Down) */}
        <View
          {...(panResponder?.panHandlers || {})}
          style={[styles.sliderGrip, isSliding && styles.sliderGripActive]}
        >
          <Ionicons
            name="reorder-two"
            size={18}
            color={isSliding ? COLORS.primary : COLORS.textMuted}
          />
        </View>

        <TouchableOpacity
          disabled={idx === total - 1}
          onPress={() => {
            haptics.tap();
            onMove('DOWN');
          }}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          style={[styles.miniArrowBtn, idx === total - 1 && { opacity: 0.15 }]}
        >
          <Ionicons name="chevron-down" size={13} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      {/* Avatar with tap to change color */}
      <TouchableOpacity onPress={onEditColor}>
        <Avatar name={player.name} color={player.avatarColor} size={42} isBot={player.isBot} />
      </TouchableOpacity>

      <View style={styles.playerInfo}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text
            style={[
              styles.playerName,
              !player.isActive && styles.playerNameInactive,
            ]}
            numberOfLines={1}
          >
            {player.name}
          </Text>
          {player.isBot && (
            <View style={styles.botRowTag}>
              <Text style={styles.botRowTagText}>BOT</Text>
            </View>
          )}
        </View>
        <Text style={styles.playerScore}>Score: {player.score} pts</Text>
      </View>

      {/* Active Toggle Switch */}
      <TouchableOpacity
        onPress={onToggleActive}
        style={[
          styles.toggleChip,
          player.isActive ? styles.toggleChipActive : styles.toggleChipInactive,
        ]}
      >
        <Text
          style={[
            styles.toggleChipText,
            player.isActive ? styles.toggleChipTextActive : styles.toggleChipTextInactive,
          ]}
        >
          {player.isActive ? 'IN' : 'OUT'}
        </Text>
      </TouchableOpacity>

      {/* Delete Button */}
      <TouchableOpacity
        onPress={onRemove}
        style={styles.deleteButton}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
      </TouchableOpacity>
    </View>
  );
};

export default function PlayersScreen() {
  const router = useRouter();
  const haptics = useHaptics();

  const {
    players,
    savedGroups,
    addPlayer,
    addBot,
    movePlayer,
    removePlayer,
    togglePlayerActive,
    updatePlayerColor,
    saveCurrentGroup,
    loadGroup,
    deleteGroup,
    resetScores,
  } = usePlayerStore();

  const [newName, setNewName] = useState('');
  const [selectedColor, setSelectedColor] = useState(AVATAR_PALETTE[0]);
  const [showGroupsModal, setShowGroupsModal] = useState(false);
  const [groupNameInput, setGroupNameInput] = useState('');
  const [savedGroupNotification, setSavedGroupNotification] = useState<string | null>(null);
  const [editingPlayerColorId, setEditingPlayerColorId] = useState<string | null>(null);

  const activePlayers = players.filter((p) => p.isActive);
  const isValidCount = activePlayers.length >= 3 && activePlayers.length <= 20;

  const handleAddPlayer = () => {
    if (!newName.trim()) return;
    haptics.tap();
    addPlayer(newName, selectedColor);
    setNewName('');
    // Cycle to next color for convenience
    const nextColorIndex = (AVATAR_PALETTE.indexOf(selectedColor) + 1) % AVATAR_PALETTE.length;
    setSelectedColor(AVATAR_PALETTE[nextColorIndex]);
  };

  const handleSaveGroup = () => {
    if (!groupNameInput.trim()) return;
    const name = groupNameInput.trim();
    haptics.success();
    saveCurrentGroup(name);
    setGroupNameInput('');
    setSavedGroupNotification(`"${name}" has been saved to your groups.`);
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
        <Text style={styles.headerTitle}>Player Roster</Text>
        <TouchableOpacity
          onPress={() => {
            haptics.tap();
            setShowGroupsModal(true);
          }}
          style={styles.groupsButton}
        >
          <Ionicons name="folder-outline" size={22} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Status & Validation Banner */}
        <View
          style={[
            styles.statusBanner,
            isValidCount ? styles.statusBannerValid : styles.statusBannerInvalid,
          ]}
        >
          <Ionicons
            name={isValidCount ? 'checkmark-circle' : 'alert-circle'}
            size={18}
            color={isValidCount ? COLORS.primary : COLORS.danger}
            style={{ marginRight: 8 }}
          />
          <Text
            style={[
              styles.statusText,
              { color: isValidCount ? COLORS.primary : COLORS.danger },
            ]}
          >
            {activePlayers.length} Active Players ({isValidCount ? 'Ready to play' : 'Need 3–20 players'})
          </Text>
        </View>

        {/* Quick Add Player Card */}
        <View style={styles.addCard}>
          <View style={styles.inputRow}>
            <TouchableOpacity
              onPress={() => {
                const next = (AVATAR_PALETTE.indexOf(selectedColor) + 1) % AVATAR_PALETTE.length;
                setSelectedColor(AVATAR_PALETTE[next]);
                haptics.tap();
              }}
              style={[styles.colorPickerTrigger, { backgroundColor: selectedColor }]}
            >
              <Ionicons name="color-palette" size={16} color="#000" />
            </TouchableOpacity>

            <TextInput
              style={styles.input}
              placeholder="Enter player name..."
              placeholderTextColor={COLORS.textMuted}
              value={newName}
              onChangeText={setNewName}
              onSubmitEditing={handleAddPlayer}
              returnKeyType="done"
              maxLength={20}
            />

            <TouchableOpacity
              style={[styles.addButton, !newName.trim() && styles.addButtonDisabled]}
              onPress={handleAddPlayer}
              disabled={!newName.trim()}
            >
              <Ionicons name="add" size={24} color="#0A0A0E" />
            </TouchableOpacity>
          </View>

          {/* Quick Add AI Bot Button */}
          <TouchableOpacity
            style={styles.addBotBtn}
            activeOpacity={0.8}
            onPress={() => {
              haptics.tap();
              addBot();
            }}
          >
            <Ionicons name="hardware-chip-outline" size={16} color="#00E5FF" style={{ marginRight: 6 }} />
            <Text style={styles.addBotBtnText}>+ Add Autonomous AI Bot</Text>
          </TouchableOpacity>
        </View>

        {/* Players List with Seating Reorder Hint */}
        <View style={styles.listHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>SEATING ORDER ({players.length})</Text>
            <Text style={styles.sectionSub}>Slide ☰ up/down or tap ▲▼ to arrange circle</Text>
          </View>
          {players.some((p) => p.score > 0) && (
            <TouchableOpacity
              onPress={() => {
                haptics.warning();
                resetScores();
              }}
            >
              <Text style={styles.resetScoresText}>Reset Scores</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.playersList}>
          {players.map((player, idx) => (
            <DraggablePlayerRow
              key={player.id}
              player={player}
              idx={idx}
              total={players.length}
              onMove={(dir) => movePlayer(idx, dir)}
              onEditColor={() => setEditingPlayerColorId(player.id)}
              onToggleActive={() => togglePlayerActive(player.id)}
              onRemove={() => removePlayer(player.id)}
            />
          ))}
        </View>
      </ScrollView>

      {/* Floating Action Button to Continue to Setup */}
      <View style={styles.bottomBar}>
        <NeonButton
          title={isValidCount ? 'Next: Setup Game' : 'Need at least 3 players'}
          icon="arrow-forward"
          disabled={!isValidCount}
          onPress={() => router.push('/setup')}
        />
      </View>

      {/* Saved Groups Modal */}
      <Modal visible={showGroupsModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Saved Player Groups</Text>
              <TouchableOpacity
                onPress={() => setShowGroupsModal(false)}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {/* Save current roster as a group */}
            <View style={styles.saveGroupSection}>
              <Text style={styles.groupSectionSub}>Save current roster ({players.length} players):</Text>
              <View style={styles.saveGroupRow}>
                <TextInput
                  style={styles.groupInput}
                  placeholder="e.g. Friday Night Crew"
                  placeholderTextColor={COLORS.textMuted}
                  value={groupNameInput}
                  onChangeText={setGroupNameInput}
                />
                <TouchableOpacity
                  style={[styles.saveGroupBtn, !groupNameInput.trim() && { opacity: 0.5 }]}
                  onPress={handleSaveGroup}
                  disabled={!groupNameInput.trim()}
                >
                  <Text style={styles.saveGroupBtnText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Existing Saved Groups */}
            <Text style={styles.groupSectionSub}>Load a saved group:</Text>
            <ScrollView style={{ maxHeight: 250 }}>
              {savedGroups.length === 0 ? (
                <Text style={styles.noGroupsText}>No saved groups yet.</Text>
              ) : (
                savedGroups.map((group) => (
                  <View key={group.id} style={styles.groupItem}>
                    <TouchableOpacity
                      style={styles.groupLoadBtn}
                      onPress={() => {
                        haptics.success();
                        loadGroup(group.id);
                        setShowGroupsModal(false);
                      }}
                    >
                      <Text style={styles.groupItemName}>{group.name}</Text>
                      <Text style={styles.groupItemCount}>{group.players.length} players</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => {
                        haptics.tap();
                        deleteGroup(group.id);
                      }}
                      style={styles.groupDeleteBtn}
                    >
                      <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Color Picker Modal */}
      <Modal visible={editingPlayerColorId !== null} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setEditingPlayerColorId(null)}
        >
          <View style={styles.colorPickerModal}>
            <Text style={styles.colorPickerTitle}>Choose Avatar Color</Text>
            <View style={styles.paletteGrid}>
              {AVATAR_PALETTE.map((color) => (
                <TouchableOpacity
                  key={color}
                  onPress={() => {
                    if (editingPlayerColorId) {
                      updatePlayerColor(editingPlayerColorId, color);
                      haptics.tap();
                    }
                    setEditingPlayerColorId(null);
                  }}
                  style={[styles.paletteCircle, { backgroundColor: color }]}
                />
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Themed Save Group Notification Modal */}
      <AppConfirmModal
        visible={!!savedGroupNotification}
        title="GROUP SAVED"
        message={savedGroupNotification || ''}
        icon="checkmark-circle"
        iconColor={COLORS.primary}
        confirmText="GREAT"
        confirmColor={COLORS.primary}
        cancelText=""
        onConfirm={() => setSavedGroupNotification(null)}
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
  groupsButton: {
    padding: 6,
  },
  container: {
    padding: 20,
    paddingBottom: 100,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
  },
  statusBannerValid: {
    backgroundColor: 'rgba(0, 230, 118, 0.1)',
    borderColor: 'rgba(0, 230, 118, 0.3)',
  },
  statusBannerInvalid: {
    backgroundColor: 'rgba(255, 61, 0, 0.1)',
    borderColor: 'rgba(255, 61, 0, 0.3)',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700',
  },
  addCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorPickerTrigger: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
    paddingVertical: 8,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  addButtonDisabled: {
    opacity: 0.4,
  },
  addBotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 229, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.25)',
  },
  addBotBtnText: {
    color: '#00E5FF',
    fontSize: 13,
    fontWeight: '700',
  },
  botRowTag: {
    backgroundColor: 'rgba(0, 229, 255, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.3)',
  },
  botRowTagText: {
    color: '#00E5FF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  sectionSub: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  reorderColumn: {
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
    width: 28,
  },
  miniArrowBtn: {
    padding: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderGrip: {
    paddingVertical: 3,
    paddingHorizontal: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 1,
  },
  sliderGripActive: {
    backgroundColor: 'rgba(0, 230, 118, 0.25)',
    borderColor: COLORS.primary,
    borderWidth: 1,
  },
  reorderBtn: {
    padding: 3,
    backgroundColor: COLORS.cardSecondary,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  resetScoresText: {
    color: COLORS.imposterLight,
    fontSize: 12,
    fontWeight: '700',
  },
  playersList: {
    gap: 10,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  playerRowSliding: {
    borderColor: COLORS.primary,
    borderWidth: 1.5,
    backgroundColor: 'rgba(0, 230, 118, 0.08)',
  },
  playerRowInactive: {
    opacity: 0.5,
  },
  playerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  playerName: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
  },
  playerNameInactive: {
    textDecorationLine: 'line-through',
  },
  playerScore: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  toggleChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginRight: 8,
  },
  toggleChipActive: {
    backgroundColor: 'rgba(0, 230, 118, 0.15)',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  toggleChipInactive: {
    backgroundColor: COLORS.cardSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  toggleChipText: {
    fontSize: 11,
    fontWeight: '800',
  },
  toggleChipTextActive: {
    color: COLORS.primary,
  },
  toggleChipTextInactive: {
    color: COLORS.textMuted,
  },
  deleteButton: {
    padding: 8,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 4,
  },
  saveGroupSection: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingBottom: 16,
  },
  groupSectionSub: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginBottom: 8,
    fontWeight: '600',
  },
  saveGroupRow: {
    flexDirection: 'row',
    gap: 8,
  },
  groupInput: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    color: COLORS.text,
  },
  saveGroupBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  saveGroupBtnText: {
    color: '#0A0A0E',
    fontWeight: '800',
    fontSize: 13,
  },
  noGroupsText: {
    color: COLORS.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 16,
  },
  groupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  groupLoadBtn: {
    flex: 1,
  },
  groupItemName: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
  },
  groupItemCount: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  groupDeleteBtn: {
    padding: 8,
  },
  colorPickerModal: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 20,
    alignItems: 'center',
  },
  colorPickerTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 16,
  },
  paletteGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
  },
  paletteCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
});
