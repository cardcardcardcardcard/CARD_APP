import { Redirect } from 'expo-router';
import { useAuthStore } from '../store/auth';
import { View, ActivityIndicator } from 'react-native';

export default function Index() {
  const { token, hydrated } = useAuthStore();

  if (!hydrated) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return token ? <Redirect href="/(tabs)/explore" /> : <Redirect href="/(auth)/login" />;
}
