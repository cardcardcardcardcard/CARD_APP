import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { listMyDecks, getGame } from '../../../../../lib/api';
import type { DeckOut, GameOut } from '../../../../../types/api';

export default function MyDecks() {
  const { gameId } = useLocalSearchParams<{ gameId: string }>();
  const [decks, setDecks] = useState<DeckOut[]>([]);
  const [game, setGame] = useState<GameOut | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([listMyDecks(gameId), getGame(gameId)])
      .then(([d, g]) => { setDecks(d); setGame(g); })
      .finally(() => setLoading(false));
  }, [gameId]);

  return (
    <>
      <Stack.Screen options={{
        title: '내 덱',
        headerRight: () => (
          <TouchableOpacity onPress={() => router.push(`/(tabs)/my-games/${gameId}/decks/create`)}>
            <Ionicons name="add" size={24} color="#6366f1" />
          </TouchableOpacity>
        ),
      }} />
      <SafeAreaView style={styles.container}>
        {loading ? <ActivityIndicator style={{ flex: 1 }} size="large" color="#6366f1" /> : (
          <FlatList
            data={decks}
            keyExtractor={d => d.id}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.meta}>{item.card_ids.length}/{game?.ruleset.deck_size ?? '?'} 장</Text>
              </View>
            )}
            ListEmptyComponent={<Text style={styles.empty}>덱이 없습니다. +를 눌러 만드세요.</Text>}
          />
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  card: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  name: { fontSize: 15, fontWeight: '500', color: '#111827' },
  meta: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 60 },
});
