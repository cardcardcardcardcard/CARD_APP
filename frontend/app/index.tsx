import { useEffect } from 'react';
import { router } from 'expo-router';
import { useAuthStore } from '../store/auth';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Index() {
  const { token, hydrated } = useAuthStore();

  useEffect(() => {
    if (!hydrated) return;
    const check = async () => {
      if (!token) {
        router.replace('/(auth)/login');
      } else {
        const onboarded = await AsyncStorage.getItem('onboarded');
        if (!onboarded) {
          router.replace('/onboarding');
        } else {
          router.replace('/(tabs)/explore');
        }
      }
    };
    check();
  }, [hydrated, token]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" />
    </View>
  );
}
