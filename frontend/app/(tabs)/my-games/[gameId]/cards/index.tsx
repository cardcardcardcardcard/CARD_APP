// frontend/app/(tabs)/my-games/[gameId]/cards/index.tsx
import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { listCards, deleteCard } from '../../../../../lib/api';
import type { CardOut } from '../../../../../types/api';

export default function CardList() {
  const { gameId } = useLocalSearchParams<{ gameId: string }>();
  const [cards, setCards] = useState<CardOut[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    listCards(gameId).then(setCards).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [gameId]);

  const remove = (card: CardOut) =>
    Alert.alert('카드 삭제', `"${card.name}"을(를) 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: async () => {
        await deleteCard(gameId, card.id);
        load();
      }},
    ]);

  return (
    <>
      <Stack.Screen options={{
        title: '카드',
        headerRight: () => (
          <TouchableOpacity onPress={() => router.push(`/(tabs)/my-games/${gameId}/cards/create`)}>
            <Ionicons name="add" size={24} color="#6366f1" />
          </TouchableOpacity>
        ),
      }} />
      <SafeAreaView style={styles.container}>
        {loading ? <ActivityIndicator style={{ flex: 1 }} size="large" color="#6366f1" /> : (
          <FlatList
            data={cards}
            keyExtractor={c => c.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.card} onPress={() => router.push(`/(tabs)/my-games/${gameId}/cards/${item.id}`)}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.meta}>{item.effects.length} 효과</Text>
                </View>
                <TouchableOpacity onPress={() => remove(item)}>
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                </TouchableOpacity>
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={styles.empty}>카드가 없습니다. +를 눌러 추가하세요.</Text>}
          />
        )}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  card: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  name: { fontSize: 15, fontWeight: '500', color: '#111827' },
  meta: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 60 },
});
