import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { router, Stack } from 'expo-router';
import { Button } from '../../../components/ui/Button';
import { ScreenContainer } from '../../../components/ui/ScreenContainer';
import { LoadingView } from '../../../components/ui/LoadingView';
import { listPublicGames, listMyDecks } from '../../../lib/api';
import type { GameOut, DeckOut } from '../../../types/api';

type GameWithDecks = { game: GameOut; decks: DeckOut[] };

export default function MyDecks() {
  const [data, setData] = useState<GameWithDecks[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const games = await listPublicGames();
      const all = await Promise.all(
        games.map(async g => ({ game: g, decks: await listMyDecks(g.id) }))
      );
      setData(all.filter(x => x.decks.length > 0 || true)); // 덱 없어도 게임 표시
    } catch { Alert.alert('오류', '덱 로드 실패'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) return <LoadingView />;

  return (
    <>
      <Stack.Screen options={{ title: '내 덱' }} />
      <ScreenContainer>
        <ScrollView contentContainerStyle={styles.content}>
          {data.length === 0 && (
            <Text style={styles.empty}>참여 가능한 게임이 없습니다.{'\n'}탐색 탭에서 게임을 찾아보세요.</Text>
          )}
          {data.map(({ game, decks }) => (
            <View key={game.id} style={styles.section}>
              <Text style={styles.gameTitle}>{game.title}</Text>
              {decks.length === 0 && (
                <Text style={styles.deckEmpty}>덱 없음</Text>
              )}
              {decks.map(d => (
                <View key={d.id} style={styles.deckRow}>
                  <Text style={styles.deckName}>{d.name}</Text>
                  <Text style={styles.deckMeta}>{d.card_ids.length}장</Text>
                </View>
              ))}
              <Button
                title="새 덱 만들기"
                onPress={() => router.push(`/(tabs)/my-decks/${game.id}/create`)}
                variant="secondary"
                style={styles.createBtn}
              />
            </View>
          ))}
        </ScrollView>
      </ScreenContainer>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16 },
  section: { backgroundColor: '#f9fafb', borderRadius: 12, padding: 16 },
  gameTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  deckRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  deckName: { fontSize: 14, fontWeight: '500', color: '#111827' },
  deckMeta: { fontSize: 12, color: '#6b7280' },
  deckEmpty: { fontSize: 13, color: '#9ca3af', marginBottom: 8 },
  createBtn: { marginTop: 12 },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 60, lineHeight: 24 },
});
