import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { useAuthStore } from '../store/auth';

export default function RootLayout() {
  const hydrate = useAuthStore(s => s.hydrate);

  useEffect(() => { hydrate(); }, []);

  return <Stack screenOptions={{ headerShown: false }} />;
}
