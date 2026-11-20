import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile, AVATAR_COLORS } from '../types/profile.types';

interface ProfileState {
  profile: UserProfile;
  setProfile: (profile: Partial<UserProfile>) => void;
  setName: (name: string) => void;
  setAvatarUri: (uri: string | null) => void;
  setAvatarColor: (color: string) => void;
  setAvatarIcon: (icon: string) => void;
  resetProfile: () => void;
}

const DEFAULT_PROFILE: UserProfile = {
  id: 'user_' + Math.random().toString(36).substring(2, 9),
  name: 'Agent ' + Math.floor(10 + Math.random() * 90),
  avatarUri: null,
  avatarColor: AVATAR_COLORS[0],
  avatarIcon: 'person',
};

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      profile: DEFAULT_PROFILE,

      setProfile: (updates) =>
        set((state) => ({
          profile: { ...state.profile, ...updates },
        })),

      setName: (name) =>
        set((state) => ({
          profile: { ...state.profile, name: name.trim() || 'Player' },
        })),

      setAvatarUri: (uri) =>
        set((state) => ({
          profile: { ...state.profile, avatarUri: uri },
        })),

      setAvatarColor: (color) =>
        set((state) => ({
          profile: { ...state.profile, avatarColor: color },
        })),

      setAvatarIcon: (icon) =>
        set((state) => ({
          profile: { ...state.profile, avatarIcon: icon },
        })),

      resetProfile: () =>
        set({
          profile: {
            ...DEFAULT_PROFILE,
            id: 'user_' + Math.random().toString(36).substring(2, 9),
          },
        }),
    }),
    {
      name: 'imposter-user-profile-v1',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
