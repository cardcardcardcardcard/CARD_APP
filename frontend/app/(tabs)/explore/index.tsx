import { useEffect, useState } from 'react';
import { Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { router, Stack } from 'expo-router';
import { listPublicGames } from '../../../lib/api';
import { ScreenContainer } from '../../../components/ui/ScreenContainer';
import { LoadingView } from '../../../components/ui/LoadingView';
import { EmptyState } from '../../../components/ui/EmptyState';
import type { GameOut } from '../../../types/api';

export default function Explore() {
  const [games, setGames] = useState<GameOut[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try { setGames(await listPublicGames()); } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <>
      <Stack.Screen options={{ title: '탐색' }} />
      <ScreenContainer>
      {loading ? (
        <LoadingView />
      ) : (
        <FlatList
          data={games}
          keyExtractor={g => g.id}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => router.push(`/(tabs)/explore/${item.id}`)}>
              <Text style={styles.title}>{item.title}</Text>
              {item.description ? <Text style={styles.meta} numberOfLines={1}>{item.description}</Text> : null}
            </TouchableOpacity>
          )}
          ListEmptyComponent={<EmptyState message="공개 게임이 없습니다." />}
        />
      )}
      </ScreenContainer>
    </>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 16, marginTop: 12, padding: 16, backgroundColor: '#f9fafb', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb' },
  title: { fontSize: 16, fontWeight: '600', color: '#111827' },
  meta: { fontSize: 12, color: '#6b7280', marginTop: 4 },
});
