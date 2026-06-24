import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { router, Stack } from 'expo-router';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { ScreenContainer } from '../../../components/ui/ScreenContainer';
import { LoadingView } from '../../../components/ui/LoadingView';
import { listPublicGames, listMyDecks, createBattle, getBattle, joinBattle } from '../../../lib/api';
import { getActiveDeckId } from '../../../lib/storage';
import type { GameOut, DeckOut } from '../../../types/api';

type Step = 'pick_game' | 'pick_deck' | 'lobby' | 'join';

export default function BattleLobby() {
  const [step, setStep] = useState<Step>('pick_game');
  const [games, setGames] = useState<GameOut[]>([]);
  const [selectedGame, setSelectedGame] = useState<GameOut | null>(null);
  const [decks, setDecks] = useState<DeckOut[]>([]);
  const [selectedDeck, setSelectedDeck] = useState<DeckOut | null>(null);
  const [battleId, setBattleId] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    listPublicGames().then(setGames).finally(() => setPageLoading(false));
  }, []);

  const pickGame = async (game: GameOut) => {
    setSelectedGame(game);
    setLoading(true);
    try {
      const [fetchedDecks, activeDeckId] = await Promise.all([
        listMyDecks(game.id),
        getActiveDeckId(game.id),
      ]);
      setDecks(fetchedDecks);
      const active = fetchedDecks.find(d => d.id === activeDeckId) ?? fetchedDecks[0] ?? null;
      setSelectedDeck(active);
      setStep('pick_deck');
    } catch { Alert.alert('오류', '덱 로드 실패'); }
    setLoading(false);
  };

  const createLobby = async () => {
    if (!selectedGame || !selectedDeck) return;
    setLoading(true);
    try {
      const battle = await createBattle({ game_id: selectedGame.id, deck_id: selectedDeck.id });
      setBattleId(battle.id);
      setStep('lobby');
    } catch (e: any) { Alert.alert('오류', e?.response?.data?.detail ?? '실패'); }
    setLoading(false);
  };

  const joinLobby = async () => {
    if (!selectedDeck || !joinCode.trim()) return;
    setLoading(true);
    try {
      const battle = await getBattle(joinCode.trim());
      await joinBattle(battle.id, { deck_id: selectedDeck.id });
      router.push(`/(tabs)/battle/${battle.id}`);
    } catch (e: any) { Alert.alert('오류', e?.response?.data?.detail ?? '배틀을 찾을 수 없습니다'); }
    setLoading(false);
  };

  if (pageLoading) return <LoadingView />;

  return (
    <>
      <Stack.Screen options={{ title: '배틀' }} />
      <ScreenContainer>
        <ScrollView contentContainerStyle={styles.content}>
          {step === 'pick_game' && (
            <>
              <Text style={styles.heading}>게임 선택</Text>
              {games.map(g => (
                <Button key={g.id} title={g.title} onPress={() => pickGame(g)} variant="secondary" style={styles.item} />
              ))}
              {games.length === 0 && <Text style={styles.empty}>공개 게임이 없습니다. 먼저 게임을 만드세요.</Text>}
            </>
          )}

          {step === 'pick_deck' && (
            <>
              <Text style={styles.heading}>덱 선택</Text>
              <Text style={styles.sub}>게임: {selectedGame?.title}</Text>
              {decks.map(d => (
                <Button
                  key={d.id}
                  title={d.name}
                  onPress={() => { setSelectedDeck(d); }}
                  variant={selectedDeck?.id === d.id ? 'primary' : 'secondary'}
                  style={styles.item}
                />
              ))}
              {decks.length === 0 && (
                <View style={styles.noDecks}>
                  <Text style={styles.empty}>이 게임에 덱이 없습니다.</Text>
                  <Button
                    title="탐색 탭에서 덱 만들기"
                    onPress={() => router.push(`/(tabs)/explore/${selectedGame?.id}`)}
                    variant="secondary"
                    style={{ marginTop: 8 }}
                  />
                </View>
              )}
              {selectedDeck && (
                <>
                  <Button title="배틀 방 만들기" onPress={createLobby} loading={loading} style={{ marginTop: 16 }} />
                  <Text style={styles.orText}>— 또는 기존 방 참가 —</Text>
                  <Input label="참가할 배틀 ID" value={joinCode} onChangeText={setJoinCode} autoCapitalize="none" />
                  <Button title="배틀 참가" onPress={joinLobby} loading={loading} variant="secondary" />
                </>
              )}
              <Button title="← 뒤로" onPress={() => setStep('pick_game')} variant="secondary" style={{ marginTop: 12 }} />
            </>
          )}

          {step === 'lobby' && (
            <>
              <Text style={styles.heading}>상대방 대기 중</Text>
              <Text style={styles.sub}>이 배틀 ID를 공유하세요:</Text>
              <Text style={styles.battleId}>{battleId}</Text>
              <Button title="배틀 입장" onPress={() => router.push(`/(tabs)/battle/${battleId}`)} style={{ marginTop: 24 }} />
              <Button title="← 뒤로" onPress={() => setStep('pick_game')} variant="secondary" style={{ marginTop: 8 }} />
            </>
          )}
        </ScrollView>
      </ScreenContainer>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: 24 },
  heading: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 16 },
  sub: { fontSize: 13, color: '#6b7280', marginBottom: 12 },
  item: { marginBottom: 8 },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 24 },
  noDecks: { alignItems: 'center', marginTop: 24 },
  orText: { textAlign: 'center', color: '#9ca3af', marginVertical: 12 },
  battleId: { fontSize: 18, fontWeight: '700', color: '#6366f1', textAlign: 'center', padding: 16, backgroundColor: '#eef2ff', borderRadius: 8, marginTop: 8 },
});
