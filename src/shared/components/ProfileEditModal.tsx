import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../theme/colors';
import { Avatar } from './Avatar';
import { NeonButton } from './NeonButton';
import { useProfileStore } from '@/core/store/use-profile-store';
import { AVATAR_COLORS, AVATAR_ICONS } from '@/core/types/profile.types';
import { useHaptics } from '../hooks/useHaptics';

interface ProfileEditModalProps {
  visible: boolean;
  onClose: () => void;
}

export const ProfileEditModal: React.FC<ProfileEditModalProps> = ({
  visible,
  onClose,
}) => {
  const haptics = useHaptics();
  const profile = useProfileStore((s) => s.profile);
  const setProfile = useProfileStore((s) => s.setProfile);

  const [name, setName] = useState(profile.name);
  const [avatarUri, setAvatarUri] = useState<string | null>(profile.avatarUri || null);
  const [selectedColor, setSelectedColor] = useState(profile.avatarColor);
  const [selectedIcon, setSelectedIcon] = useState(profile.avatarIcon);

  const handlePickPhoto = async () => {
    try {
      haptics.tap();
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.35,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const uri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
        setAvatarUri(uri);
      }
    } catch {
      Alert.alert('Permission Error', 'Could not open photo gallery.');
    }
  };

  const handleClearPhoto = () => {
    haptics.tap();
    setAvatarUri(null);
  };

  const handleSave = async () => {
    haptics.success();
    let finalUri = avatarUri;
    if (finalUri && finalUri.startsWith('file://')) {
      try {
        const res = await fetch(finalUri);
        const blob = await res.blob();
        const b64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = () => resolve('');
          reader.readAsDataURL(blob);
        });
        if (b64 && b64.startsWith('data:')) {
          finalUri = b64;
        }
      } catch {}
    }

    setProfile({
      name: name.trim() || 'Player',
      avatarUri: finalUri,
      avatarColor: selectedColor,
      avatarIcon: selectedIcon,
    });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>PLAYER PROFILE</Text>
              <Text style={styles.subtitle}>Customize how others see you in multiplayer</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            {/* Live Avatar Preview */}
            <View style={styles.previewContainer}>
              <Avatar
                name={name || 'Player'}
                color={selectedColor}
                size={84}
                avatarUri={avatarUri}
                avatarIcon={selectedIcon}
              />
              <View style={styles.photoActions}>
                <TouchableOpacity style={styles.pickPhotoBtn} onPress={handlePickPhoto}>
                  <Ionicons name="camera" size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
                  <Text style={styles.pickPhotoText}>
                    {avatarUri ? 'Change Photo' : 'Upload Photo'}
                  </Text>
                </TouchableOpacity>
                {avatarUri ? (
                  <TouchableOpacity style={styles.clearPhotoBtn} onPress={handleClearPhoto}>
                    <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            {/* Name Input */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>YOUR DISPLAY NAME</Text>
              <TextInput
                style={styles.nameInput}
                value={name}
                onChangeText={setName}
                placeholder="Enter player name..."
                placeholderTextColor={COLORS.textMuted}
                maxLength={18}
                autoCorrect={false}
              />
            </View>

            {/* Neon Accent Color Selector */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>NEON ACCENT COLOR</Text>
              <View style={styles.colorRow}>
                {AVATAR_COLORS.map((col) => (
                  <TouchableOpacity
                    key={col}
                    style={[
                      styles.colorDot,
                      { backgroundColor: col },
                      selectedColor === col && styles.colorDotSelected,
                    ]}
                    onPress={() => {
                      haptics.tap();
                      setSelectedColor(col);
                    }}
                  />
                ))}
              </View>
            </View>

            {/* Avatar Icon (if no photo uploaded) */}
            {!avatarUri ? (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>CHOOSE AVATAR ICON</Text>
                <View style={styles.iconGrid}>
                  {AVATAR_ICONS.map((iconName) => (
                    <TouchableOpacity
                      key={iconName}
                      style={[
                        styles.iconItem,
                        selectedIcon === iconName && {
                          borderColor: selectedColor,
                          backgroundColor: selectedColor + '22',
                        },
                      ]}
                      onPress={() => {
                        haptics.tap();
                        setSelectedIcon(iconName);
                      }}
                    >
                      <Ionicons
                        name={iconName as any}
                        size={22}
                        color={selectedIcon === iconName ? selectedColor : COLORS.textSecondary}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : null}
          </ScrollView>

          {/* Save Button */}
          <View style={styles.footer}>
            <NeonButton title="SAVE PROFILE" icon="checkmark-circle" onPress={handleSave} />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    maxHeight: '90%',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  title: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    padding: 20,
  },
  previewContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  photoActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  pickPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,229,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0,229,255,0.3)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  pickPhotoText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  clearPhotoBtn: {
    backgroundColor: 'rgba(255,0,85,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,0,85,0.3)',
    borderRadius: 12,
    padding: 8,
  },
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  nameInput: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14,
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  colorDotSelected: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
    transform: [{ scale: 1.15 }],
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  iconItem: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
});
