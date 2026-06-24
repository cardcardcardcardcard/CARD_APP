import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { getGame } from '../../../lib/api';
import { Button } from '../../../components/ui/Button';
import { ScreenContainer } from '../../../components/ui/ScreenContainer';
import { LoadingView } from '../../../components/ui/LoadingView';
import type { GameOut } from '../../../types/api';

export default function GameDetail() {
  const { gameId } = useLocalSearchParams<{ gameId: string }>();
  const [game, setGame] = useState<GameOut | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getGame(gameId).then(setGame).catch(() => Alert.alert('오류', '게임을 찾을 수 없습니다')).finally(() => setLoading(false));
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

          <Button
            title="덱 만들고 배틀하기"
            onPress={() => router.push(`/(tabs)/battle?game_id=${game.id}`)}
            style={{ margin: 16 }}
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
});
