// frontend/app/(tabs)/my-games/[gameId]/index.tsx
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getGame } from '../../../../lib/api';
import { Button } from '../../../../components/ui/Button';
import type { GameOut } from '../../../../types/api';

export default function GameOverview() {
  const { gameId } = useLocalSearchParams<{ gameId: string }>();
  const [game, setGame] = useState<GameOut | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getGame(gameId).then(setGame).finally(() => setLoading(false));
  }, [gameId]);

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#6366f1" />;
  if (!game) return null;

  return (
    <>
      <Stack.Screen options={{ title: game.title }} />
      <SafeAreaView style={styles.container}>
        <ScrollView>
          <Text style={styles.title}>{game.title}</Text>
          {game.description ? <Text style={styles.desc}>{game.description}</Text> : null}

          <View style={styles.actions}>
            <ActionRow
              icon="create-outline"
              label="Edit Ruleset"
              onPress={() => router.push(`/(tabs)/my-games/${gameId}/edit`)}
            />
            <ActionRow
              icon="albums-outline"
              label="Manage Cards"
              onPress={() => router.push(`/(tabs)/my-games/${gameId}/cards`)}
            />
            <ActionRow
              icon="layers-outline"
              label="My Decks"
              onPress={() => router.push(`/(tabs)/my-games/${gameId}/decks`)}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

function ActionRow({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress}>
      <Ionicons name={icon as any} size={22} color="#6366f1" />
      <Text style={styles.rowLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', padding: 20, paddingBottom: 4 },
  desc: { fontSize: 14, color: '#6b7280', paddingHorizontal: 20, marginBottom: 8 },
  actions: { marginTop: 16, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  row: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', gap: 12 },
  rowLabel: { flex: 1, fontSize: 15, color: '#111827' },
});
