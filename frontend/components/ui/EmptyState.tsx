// frontend/components/ui/EmptyState.tsx
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  message: string;
}

export function EmptyState({ message }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  text: { fontSize: 14, color: '#9ca3af', textAlign: 'center' },
});
