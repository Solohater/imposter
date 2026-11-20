import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, StyleSheet } from 'react-native';
import { COLORS } from '@/shared/theme/colors';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: COLORS.background },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="index" options={{ title: 'Home' }} />
          <Stack.Screen name="players/index" options={{ title: 'Players' }} />
          <Stack.Screen name="setup/index" options={{ title: 'Setup' }} />
          <Stack.Screen name="custom/index" options={{ title: 'Custom Packs' }} />
          <Stack.Screen name="game/reveal" options={{ title: 'Role Reveal', gestureEnabled: false }} />
          <Stack.Screen name="game/clues" options={{ title: 'Clue Phase', gestureEnabled: false }} />
          <Stack.Screen name="game/voting" options={{ title: 'Voting', gestureEnabled: false }} />
          <Stack.Screen name="game/results" options={{ title: 'Results', gestureEnabled: false }} />
          <Stack.Screen name="stats/index" options={{ title: 'Fairness Stats' }} />
        </Stack>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
});
