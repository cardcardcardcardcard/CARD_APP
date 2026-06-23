import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getGame } from '../../../lib/api';
import { Button } from '../../../components/ui/Button';
import type { GameOut } from '../../../types/api';

export default function GameDetail() {
  const { gameId } = useLocalSearchParams<{ gameId: string }>();
  const [game, setGame] = useState<GameOut | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getGame(gameId).then(setGame).catch(() => Alert.alert('Error', 'Game not found')).finally(() => setLoading(false));
  }, [gameId]);

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#6366f1" />;
  if (!game) return null;

  const rs = game.ruleset;

  return (
    <>
      <Stack.Screen options={{ title: game.title }} />
      <SafeAreaView style={styles.container}>
        <ScrollView>
          <Text style={styles.title}>{game.title}</Text>
          {game.description ? <Text style={styles.desc}>{game.description}</Text> : null}

          <Text style={styles.sectionTitle}>Ruleset</Text>
          <View style={styles.ruleGrid}>
            {([
              ['Deck size', rs.deck_size],
              ['Hand limit', rs.hand_limit],
              ['Swap every', `${rs.swap_interval} turns`],
              ['Win condition', rs.win_condition],
              ['Resource', rs.resource_system],
              ['Start resource', rs.initial_resource],
            ] as [string, string | number][]).map(([k, v]) => (
              <View key={k} style={styles.ruleRow}>
                <Text style={styles.ruleKey}>{k}</Text>
                <Text style={styles.ruleVal}>{String(v)}</Text>
              </View>
            ))}
          </View>

          <Button
            title="Build a Deck & Battle"
            onPress={() => router.push(`/(tabs)/battle?game_id=${game.id}`)}
            style={{ margin: 16 }}
          />
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', padding: 20, paddingBottom: 4 },
  desc: { fontSize: 14, color: '#6b7280', paddingHorizontal: 20, marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#374151', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  ruleGrid: { paddingHorizontal: 20 },
  ruleRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  ruleKey: { fontSize: 13, color: '#6b7280' },
  ruleVal: { fontSize: 13, fontWeight: '500', color: '#111827' },
});
