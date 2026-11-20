import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { COLORS } from '../theme/colors';

interface AvatarProps {
  name: string;
  color: string;
  size?: number;
  avatarUri?: string | null;
  avatarIcon?: string;
  isSpeaker?: boolean;
  isEliminated?: boolean;
  isBot?: boolean;
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  color,
  size = 48,
  avatarUri,
  avatarIcon,
  isSpeaker = false,
  isEliminated = false,
  isBot = false,
}) => {
  const [hasError, setHasError] = useState(false);
  const [prevUri, setPrevUri] = useState(avatarUri);
  if (avatarUri !== prevUri) {
    setPrevUri(avatarUri);
    setHasError(false);
  }

  const initials = name
    .trim()
    .split(' ')
    .map((part) => part[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const fontSize = Math.round(size * 0.4);
  const iconSize = Math.round(size * 0.52);

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color + '22',
          borderColor: isSpeaker ? COLORS.primary : color,
          borderWidth: isSpeaker ? 3 : 2,
        },
        isEliminated && styles.eliminated,
      ]}
    >
      {isBot ? (
        <Ionicons
          name="hardware-chip-outline"
          size={iconSize}
          color={isEliminated ? COLORS.textMuted : color}
        />
      ) : avatarUri && !hasError ? (
        <Image
          source={{ uri: avatarUri }}
          style={{
            width: size - 4,
            height: size - 4,
            borderRadius: (size - 4) / 2,
          }}
          contentFit="cover"
          onError={() => setHasError(true)}
        />
      ) : avatarIcon && avatarIcon !== 'initials' ? (
        <Ionicons
          name={avatarIcon as any}
          size={iconSize}
          color={isEliminated ? COLORS.textMuted : color}
        />
      ) : (
        <Text
          style={[
            styles.text,
            {
              color: isEliminated ? COLORS.textMuted : color,
              fontSize,
            },
          ]}
        >
          {initials || '?'}
        </Text>
      )}
      {isSpeaker && <View style={styles.speakerDot} />}
      {isBot && !isEliminated && (
        <View style={styles.botBadge}>
          <Text style={styles.botBadgeText}>AI</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  text: {
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  eliminated: {
    opacity: 0.4,
    borderColor: COLORS.border,
  },
  speakerDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
    borderWidth: 2,
    borderColor: COLORS.background,
    zIndex: 10,
  },
  botBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#7C3AED',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A78BFA',
    zIndex: 10,
  },
  botBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
});
