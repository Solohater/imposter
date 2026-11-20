import * as Haptics from 'expo-haptics';
import { useSettingsStore } from '@/core/store/use-settings-store';

export function useHaptics() {
  const hapticsEnabled = useSettingsStore((s) => s.settings.hapticsEnabled);

  const tap = async () => {
    if (!hapticsEnabled) return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Ignore unsupported platforms (web/simulator)
    }
  };

  const medium = async () => {
    if (!hapticsEnabled) return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      // Ignore
    }
  };

  const heavy = async () => {
    if (!hapticsEnabled) return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch {
      // Ignore
    }
  };

  const success = async () => {
    if (!hapticsEnabled) return;
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // Ignore
    }
  };

  const warning = async () => {
    if (!hapticsEnabled) return;
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch {
      // Ignore
    }
  };

  const error = async () => {
    if (!hapticsEnabled) return;
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch {
      // Ignore
    }
  };

  return {
    tap,
    medium,
    heavy,
    success,
    warning,
    error,
  };
}
