import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { router, Stack, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenContainer } from '../../../components/ui/ScreenContainer';
import { LoadingView } from '../../../components/ui/LoadingView';
import { listPublicGames, listMyDecks } from '../../../lib/api';
import { getActiveDeckId, setActiveDeckId } from '../../../lib/storage';
import type { GameOut, DeckOut } from '../../../types/api';

const MAX_SLOTS = 5;

type GameWithDecks = { game: GameOut; decks: DeckOut[]; activeDeckId: string | null };

export default function MyDecks() {
  const [data, setData] = useState<GameWithDecks[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const games = await listPublicGames();
      const all = await Promise.all(
        games.map(async g => {
          const [decks, activeDeckId] = await Promise.all([
            listMyDecks(g.id),
            getActiveDeckId(g.id),
          ]);
          return { game: g, decks, activeDeckId };
        })
      );
      setData(all);
    } catch { Alert.alert('오류', '덱 로드 실패'); }
    setLoading(false);
  }, []);

  useFocusEffect(load);

  const handleSelectSlot = async (gameId: string, deck: DeckOut | null, slotIdx: number) => {
    if (!deck) {
      router.push(`/(tabs)/my-decks/${gameId}/create`);
      return;
    }
    await setActiveDeckId(gameId, deck.id);
    setData(prev => prev.map(d =>
      d.game.id === gameId ? { ...d, activeDeckId: deck.id } : d
    ));
  };

  if (loading) return <LoadingView />;

  return (
    <>
      <Stack.Screen options={{ title: '내 덱' }} />
      <ScreenContainer>
        <ScrollView contentContainerStyle={styles.content}>
          {data.length === 0 && (
            <Text style={styles.empty}>참여 가능한 게임이 없습니다.{'\n'}탐색 탭에서 게임을 찾아보세요.</Text>
          )}
          {data.map(({ game, decks, activeDeckId }) => {
            const activeDeck = decks.find(d => d.id === activeDeckId) ?? decks[0] ?? null;
            const slots = Array.from({ length: MAX_SLOTS }, (_, i) => decks[i] ?? null);

            return (
              <View key={game.id} style={styles.section}>
                <Text style={styles.gameTitle}>{game.title}</Text>

                {/* 슬롯 탭 */}
                <View style={styles.slotRow}>
                  {slots.map((deck, i) => {
                    const isActive = deck?.id === activeDeck?.id && deck !== null;
                    return (
                      <TouchableOpacity
                        key={i}
                        style={[styles.slot, isActive && styles.slotActive, !deck && styles.slotEmpty]}
                        onPress={() => handleSelectSlot(game.id, deck, i)}
                        activeOpacity={0.7}
                      >
                        {deck ? (
                          <Text style={[styles.slotNum, isActive && styles.slotNumActive]}>{i + 1}</Text>
                        ) : (
                          <Ionicons name="add" size={18} color="#9ca3af" />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* 활성 덱 상세 */}
                {activeDeck ? (
                  <View style={styles.activeDeckCard}>
                    <View style={styles.activeDeckHeader}>
                      <Text style={styles.activeDeckName}>{activeDeck.name}</Text>
                      <Text style={styles.activeDeckMeta}>{activeDeck.card_ids.length}장</Text>
                    </View>
                    <Text style={styles.activeDeckLabel}>활성 덱</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.emptyDeckCard}
                    onPress={() => router.push(`/(tabs)/my-decks/${game.id}/create`)}
                  >
                    <Ionicons name="add-circle-outline" size={24} color="#6366f1" />
                    <Text style={styles.emptyDeckText}>첫 번째 덱 만들기</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </ScrollView>
      </ScreenContainer>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16 },
  section: { backgroundColor: '#f9fafb', borderRadius: 12, padding: 16 },
  gameTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 14 },
  slotRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  slot: { width: 44, height: 44, borderRadius: 10, backgroundColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center' },
  slotActive: { backgroundColor: '#6366f1' },
  slotEmpty: { borderWidth: 2, borderColor: '#d1d5db', borderStyle: 'dashed', backgroundColor: 'transparent' },
  slotNum: { fontSize: 16, fontWeight: '700', color: '#374151' },
  slotNumActive: { color: '#fff' },
  activeDeckCard: { backgroundColor: '#fff', borderRadius: 10, padding: 14, borderWidth: 2, borderColor: '#6366f1' },
  activeDeckHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  activeDeckName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  activeDeckMeta: { fontSize: 13, color: '#6b7280' },
  activeDeckLabel: { fontSize: 11, color: '#6366f1', fontWeight: '600', marginTop: 4 },
  emptyDeckCard: { backgroundColor: '#fff', borderRadius: 10, padding: 16, borderWidth: 2, borderColor: '#e5e7eb', borderStyle: 'dashed', alignItems: 'center', flexDirection: 'row', gap: 10 },
  emptyDeckText: { fontSize: 14, color: '#6366f1', fontWeight: '500' },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 60, lineHeight: 24 },
});
