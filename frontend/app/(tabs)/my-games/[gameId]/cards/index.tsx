// frontend/app/(tabs)/my-games/[gameId]/cards/index.tsx
import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { listCards, deleteCard } from '../../../../../lib/api';
import { ScreenContainer } from '../../../../../components/ui/ScreenContainer';
import { LoadingView } from '../../../../../components/ui/LoadingView';
import { EmptyState } from '../../../../../components/ui/EmptyState';
import type { CardOut, CardType } from '../../../../../types/api';

const CARD_TYPE_META: Record<CardType, { label: string; color: string; bg: string }> = {
  action: { label: '행동', color: '#0284c7', bg: '#e0f2fe' },
  counter: { label: '카운터', color: '#16a34a', bg: '#dcfce7' },
  trap: { label: '함정', color: '#dc2626', bg: '#fee2e2' },
};

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
      <ScreenContainer>
        {loading ? <LoadingView /> : (
          <FlatList
            data={cards}
            keyExtractor={c => c.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.card} onPress={() => router.push(`/(tabs)/my-games/${gameId}/cards/${item.id}`)}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{item.name}</Text>
                  <View style={styles.metaRow}>
                    <View style={[styles.badge, { backgroundColor: CARD_TYPE_META[item.card_type].bg }]}>
                      <Text style={[styles.badgeText, { color: CARD_TYPE_META[item.card_type].color }]}>
                        {CARD_TYPE_META[item.card_type].label}
                      </Text>
                    </View>
                    {item.has_minigame && <Text style={styles.minigameTag}>미니게임</Text>}
                    {item.card_type === 'counter' && (
                      <Text style={styles.minigameTag}>
                        {[item.counters_action && '행동', item.counters_trap && '함정'].filter(Boolean).join('/') || '미설정'} 카운터
                      </Text>
                    )}
                    {item.effect_text ? <Text style={styles.meta} numberOfLines={1}>{item.effect_text}</Text> : null}
                  </View>
                </View>
                <TouchableOpacity onPress={() => remove(item)}>
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                </TouchableOpacity>
              </TouchableOpacity>
            )}
            ListEmptyComponent={<EmptyState message="카드가 없습니다. +를 눌러 추가하세요." />}
          />
        )}
      </ScreenContainer>
    </>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  name: { fontSize: 15, fontWeight: '500', color: '#111827' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  minigameTag: { fontSize: 11, color: '#9333ea', fontWeight: '600' },
  meta: { fontSize: 12, color: '#6b7280', flex: 1 },
});
