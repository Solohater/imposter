import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { useHaptics } from '../hooks/useHaptics';

export interface AppConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  confirmText?: string;
  confirmColor?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

export const AppConfirmModal: React.FC<AppConfirmModalProps> = ({
  visible,
  title,
  message,
  icon = 'help-circle-outline',
  iconColor = COLORS.warning,
  confirmText = 'Confirm',
  confirmColor = COLORS.primary,
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
}) => {
  const haptics = useHaptics();
  if (!visible) return null;

  const isSingleButton = !cancelText || !onCancel;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel || onConfirm}
    >
      <TouchableWithoutFeedback onPress={onCancel || onConfirm}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={styles.card}>
              {/* Header Icon */}
              <View style={[styles.iconCircle, { borderColor: `${iconColor}44`, backgroundColor: `${iconColor}15` }]}>
                <Ionicons name={icon} size={32} color={iconColor} />
              </View>

              {/* Title & Message */}
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.message}>{message}</Text>

              {/* Action Buttons */}
              <View style={styles.buttonRow}>
                {!isSingleButton && (
                  <TouchableOpacity
                    style={styles.cancelButton}
                    activeOpacity={0.7}
                    onPress={() => {
                      haptics.tap();
                      onCancel?.();
                    }}
                  >
                    <Text style={styles.cancelButtonText}>{cancelText}</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[
                    styles.confirmButton,
                    { backgroundColor: confirmColor },
                    isSingleButton && { flex: 1 },
                  ]}
                  activeOpacity={0.8}
                  onPress={() => {
                    haptics.tap();
                    onConfirm();
                  }}
                >
                  <Text
                    style={[
                      styles.confirmButtonText,
                      { color: confirmColor === COLORS.primary ? '#000000' : '#FFFFFF' },
                    ]}
                  >
                    {confirmText}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 5, 8, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: COLORS.card,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 15,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  message: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  confirmButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
