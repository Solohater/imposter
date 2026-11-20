import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { useHaptics } from '../hooks/useHaptics';

interface NeonButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'danger' | 'secondary' | 'outline';
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  size?: 'sm' | 'md' | 'lg';
}

export const NeonButton: React.FC<NeonButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  icon,
  disabled = false,
  loading = false,
  style,
  textStyle,
  size = 'md',
}) => {
  const haptics = useHaptics();

  const handlePress = () => {
    if (disabled || loading) return;
    haptics.tap();
    onPress();
  };

  const getContainerStyle = () => {
    switch (variant) {
      case 'primary':
        return [
          styles.primary,
          { shadowColor: COLORS.primary, shadowOpacity: 0.35, shadowRadius: 10 },
        ];
      case 'danger':
        return [
          styles.danger,
          { shadowColor: COLORS.danger, shadowOpacity: 0.35, shadowRadius: 10 },
        ];
      case 'secondary':
        return styles.secondary;
      case 'outline':
        return styles.outline;
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case 'primary':
        return '#0A0A0E';
      case 'danger':
        return '#FFFFFF';
      case 'secondary':
        return COLORS.text;
      case 'outline':
        return COLORS.primary;
    }
  };

  const sizePadding = {
    sm: { paddingVertical: 10, paddingHorizontal: 16 },
    md: { paddingVertical: 14, paddingHorizontal: 20 },
    lg: { paddingVertical: 18, paddingHorizontal: 24 },
  }[size];

  const fontSize = {
    sm: 14,
    md: 16,
    lg: 18,
  }[size];

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handlePress}
      disabled={disabled || loading}
      style={[
        styles.base,
        sizePadding,
        getContainerStyle(),
        disabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} />
      ) : (
        <View style={styles.content}>
          {icon && (
            <Ionicons
              name={icon}
              size={fontSize + 2}
              color={getTextColor()}
              style={styles.icon}
            />
          )}
          <Text
            style={[
              styles.text,
              { color: getTextColor(), fontSize },
              textStyle,
            ]}
          >
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: 8,
  },
  text: {
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  primary: {
    backgroundColor: COLORS.primary,
  },
  danger: {
    backgroundColor: COLORS.danger,
  },
  secondary: {
    backgroundColor: COLORS.cardSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  disabled: {
    opacity: 0.45,
  },
});
