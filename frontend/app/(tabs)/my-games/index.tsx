// frontend/app/(tabs)/my-games/index.tsx
import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { listMyGames } from '../../../lib/api';
import { ScreenContainer } from '../../../components/ui/ScreenContainer';
import { LoadingView } from '../../../components/ui/LoadingView';
import type { GameOut } from '../../../types/api';

export default function MyGames() {
  const [games, setGames] = useState<GameOut[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try { setGames(await listMyGames()); } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.heading}>내 게임</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/my-games/create')}>
          <Ionicons name="add-circle" size={28} color="#6366f1" />
        </TouchableOpacity>
      </View>
      {loading ? (
        <LoadingView />
      ) : (
        <FlatList
          data={games}
          keyExtractor={g => g.id}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => router.push(`/(tabs)/my-games/${item.id}`)}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.meta}>{item.is_public ? '공개' : '비공개'} · Swap/{item.ruleset.swap_interval}t</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.empty}>게임이 없습니다.</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/my-games/create')}>
                <Text style={styles.createLink}>첫 게임 만들기 →</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 12 },
  heading: { fontSize: 24, fontWeight: '700', color: '#111827' },
  card: { marginHorizontal: 16, marginBottom: 10, padding: 16, backgroundColor: '#f9fafb', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb' },
  title: { fontSize: 16, fontWeight: '600', color: '#111827' },
  meta: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  emptyBox: { alignItems: 'center', marginTop: 60 },
  empty: { color: '#9ca3af', fontSize: 14 },
  createLink: { color: '#6366f1', marginTop: 8, fontSize: 14 },
});
