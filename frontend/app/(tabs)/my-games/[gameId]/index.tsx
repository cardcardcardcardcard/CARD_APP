// frontend/app/(tabs)/my-games/[gameId]/index.tsx
import { useEffect, useState } from 'react';
import { Text, StyleSheet, ScrollView, View } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { getGame } from '../../../../lib/api';
import { ScreenContainer } from '../../../../components/ui/ScreenContainer';
import { LoadingView } from '../../../../components/ui/LoadingView';
import { ActionRow } from '../../../../components/ui/ActionRow';
import type { GameOut } from '../../../../types/api';

export default function GameOverview() {
  const { gameId } = useLocalSearchParams<{ gameId: string }>();
  const [game, setGame] = useState<GameOut | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getGame(gameId).then(setGame).finally(() => setLoading(false));
  }, [gameId]);

  if (loading) return <LoadingView />;
  if (!game) return null;

  return (
    <>
      <Stack.Screen options={{ title: game.title }} />
      <ScreenContainer>
        <ScrollView>
          <Text style={styles.title}>{game.title}</Text>
          {game.description ? <Text style={styles.desc}>{game.description}</Text> : null}

          <View style={styles.actions}>
            <ActionRow
              icon="create-outline"
              label="룰셋 수정"
              onPress={() => router.push(`/(tabs)/my-games/${gameId}/edit`)}
            />
            <ActionRow
              icon="albums-outline"
              label="카드 관리"
              onPress={() => router.push(`/(tabs)/my-games/${gameId}/cards`)}
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
  actions: { marginTop: 16, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
});
