import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { getGame, listMyDecks } from '../../../lib/api';
import { Button } from '../../../components/ui/Button';
import { ScreenContainer } from '../../../components/ui/ScreenContainer';
import { LoadingView } from '../../../components/ui/LoadingView';
import type { GameOut, DeckOut } from '../../../types/api';

export default function GameDetail() {
  const { gameId } = useLocalSearchParams<{ gameId: string }>();
  const [game, setGame] = useState<GameOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [decks, setDecks] = useState<DeckOut[]>([]);
  const [decksLoading, setDecksLoading] = useState(true);

  useEffect(() => {
    getGame(gameId)
      .then(g => {
        setGame(g);
        return listMyDecks(gameId);
      })
      .then(setDecks)
      .catch(() => Alert.alert('오류', '게임을 찾을 수 없습니다'))
      .finally(() => { setLoading(false); setDecksLoading(false); });
  }, [gameId]);

  if (loading) return <LoadingView />;
  if (!game) return null;

  const rs = game.ruleset;

  return (
    <>
      <Stack.Screen options={{ title: game.title }} />
      <ScreenContainer>
        <ScrollView>
          <Text style={styles.title}>{game.title}</Text>
          {game.description ? <Text style={styles.desc}>{game.description}</Text> : null}

          <Text style={styles.sectionTitle}>룰셋</Text>
          <View style={styles.ruleGrid}>
            {([
              ['덱 크기', rs.deck_size],
              ['손패 제한', rs.hand_limit],
              ['스왑 주기', `${rs.swap_interval} 턴`],
              ['승리 조건', rs.win_condition],
              ['자원', rs.resource_system],
              ['초기 자원', rs.initial_resource],
            ] as [string, string | number][]).map(([k, v]) => (
              <View key={k} style={styles.ruleRow}>
                <Text style={styles.ruleKey}>{k}</Text>
                <Text style={styles.ruleVal}>{String(v)}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.sectionTitle}>내 덱</Text>
          {decksLoading ? (
            <ActivityIndicator color="#6366f1" style={{ marginVertical: 12 }} />
          ) : (
            <>
              {decks.map(d => (
                <View key={d.id} style={styles.deckRow}>
                  <Text style={styles.deckName}>{d.name}</Text>
                  <Text style={styles.deckMeta}>{d.card_ids.length}장</Text>
                </View>
              ))}
              {decks.length === 0 && (
                <Text style={styles.deckEmpty}>덱이 없습니다. 아래 버튼으로 만드세요.</Text>
              )}
              <Button
                title="새 덱 만들기"
                onPress={() => router.push(`/(tabs)/explore/${gameId}/decks/create`)}
                variant="secondary"
                style={{ marginHorizontal: 16, marginTop: 8 }}
              />
            </>
          )}

          <Button
            title="배틀 참가하기"
            onPress={() => router.push(`/(tabs)/battle?game_id=${game.id}`)}
            style={{ margin: 16, marginTop: 8 }}
          />
        </ScrollView>
      </ScreenContainer>
    </>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '700', color: '#111827', padding: 20, paddingBottom: 4 },
  desc: { fontSize: 14, color: '#6b7280', paddingHorizontal: 20, marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#374151', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  ruleGrid: { paddingHorizontal: 20 },
  ruleRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  ruleKey: { fontSize: 13, color: '#6b7280' },
  ruleVal: { fontSize: 13, fontWeight: '500', color: '#111827' },
  deckRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  deckName: { fontSize: 14, fontWeight: '500', color: '#111827' },
  deckMeta: { fontSize: 12, color: '#6b7280' },
  deckEmpty: { fontSize: 13, color: '#9ca3af', textAlign: 'center', paddingVertical: 12 },
});
