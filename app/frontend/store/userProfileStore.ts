import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UserProfile {
  hasCompletedOnboarding: boolean;
  age: number;
  hasAsthma: boolean;
  allergies: string[]; // 'pollen', 'dust', 'pollution'
  respiratoryConditions: string[]; // 'asthma', 'copd', 'bronchitis'
  otherConditions: string[]; // 'heart_disease', 'diabetes'
  medications: string[]; // Types of medications
  updatedAt: string;
}

interface UserProfileState {
  profile: UserProfile | null;
  isLoading: boolean;
  initializeProfile: () => Promise<void>;
  updateProfile: (profile: UserProfile) => Promise<void>;
  completeOnboarding: (profile: Partial<UserProfile>) => Promise<void>;
}

const DEFAULT_PROFILE: UserProfile = {
  hasCompletedOnboarding: false,
  age: 30,
  hasAsthma: false,
  allergies: [],
  respiratoryConditions: [],
  otherConditions: [],
  medications: [],
  updatedAt: new Date().toISOString(),
};

export const useUserProfileStore = create<UserProfileState>((set) => ({
  profile: null,
  isLoading: true,

  initializeProfile: async () => {
    try {
      const stored = await AsyncStorage.getItem('userProfile');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Force onboarding to run every app launch by resetting the flag while keeping saved health data.
        set({ profile: { ...parsed, hasCompletedOnboarding: false }, isLoading: false });
      } else {
        set({ profile: DEFAULT_PROFILE, isLoading: false });
      }
    } catch (error) {
      console.error('Error initializing profile:', error);
      set({ profile: DEFAULT_PROFILE, isLoading: false });
    }
  },

  updateProfile: async (profile: UserProfile) => {
    try {
      await AsyncStorage.setItem('userProfile', JSON.stringify(profile));
      set({ profile });
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  },

  completeOnboarding: async (updates: Partial<UserProfile>) => {
    try {
      const profile: UserProfile = {
        ...DEFAULT_PROFILE,
        ...updates,
        hasCompletedOnboarding: true,
        updatedAt: new Date().toISOString(),
      };
      await AsyncStorage.setItem('userProfile', JSON.stringify(profile));
      set({ profile });
    } catch (error) {
      console.error('Error completing onboarding:', error);
    }
  },
}));
