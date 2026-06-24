import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
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
  const [error, setError] = useState('');

  useEffect(() => {
    getGame(gameId)
      .then(setGame)
      .catch(() => setError('게임을 찾을 수 없습니다'))
      .finally(() => setLoading(false));
  }, [gameId]);

  if (loading) return <LoadingView />;
  if (!game) return (
    <>
      <Stack.Screen options={{ title: '게임' }} />
      <ScreenContainer><Text style={styles.errorText}>{error}</Text></ScreenContainer>
    </>
  );

  return (
    <>
      <Stack.Screen options={{ title: game.title }} />
      <ScreenContainer>
        <ScrollView>
          <Text style={styles.title}>{game.title}</Text>
          {game.description ? <Text style={styles.desc}>{game.description}</Text> : null}

          <View style={styles.actions}>
            <Button
              title="배틀 참가하기"
              onPress={() => router.push(`/(tabs)/battle?game_id=${game.id}`)}
            />
          </View>
        </ScrollView>
      </ScreenContainer>
    </>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '700', color: '#111827', padding: 20, paddingBottom: 4 },
  desc: { fontSize: 14, color: '#6b7280', paddingHorizontal: 20, marginBottom: 8 },
  actions: { padding: 16, marginTop: 8 },
  errorText: { color: '#ef4444', textAlign: 'center', marginTop: 40 },
});
