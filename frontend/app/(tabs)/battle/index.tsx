import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router, Stack } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
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
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    listPublicGames().then(setGames).finally(() => setPageLoading(false));
  }, []);

  const pickGame = async (game: GameOut) => {
    setError('');
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
    } catch {
      setError('덱 로드 실패');
    }
    setLoading(false);
  };

  const createLobby = async () => {
    if (!selectedGame || !selectedDeck) return;
    setError('');
    setLoading(true);
    try {
      const battle = await createBattle({ game_id: selectedGame.id, deck_id: selectedDeck.id });
      setBattleId(battle.id);
      setStep('lobby');
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? '방 생성 실패');
    }
    setLoading(false);
  };

  const joinLobby = async () => {
    if (!selectedDeck || !joinCode.trim()) return;
    setError('');
    setLoading(true);
    try {
      const battle = await getBattle(joinCode.trim());
      await joinBattle(battle.id, { deck_id: selectedDeck.id });
      router.push(`/(tabs)/battle/${battle.id}`);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? '배틀을 찾을 수 없습니다');
    }
    setLoading(false);
  };

  const copyBattleId = async () => {
    await Clipboard.setStringAsync(battleId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
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
                <Button key={g.id} title={g.title} onPress={() => pickGame(g)} loading={loading} variant="secondary" style={styles.item} />
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
                    title="덱 만들기"
                    onPress={() => router.push(`/(tabs)/my-decks/${selectedGame?.id}/create`)}
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
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              <Button title="← 뒤로" onPress={() => { setStep('pick_game'); setError(''); }} variant="secondary" style={{ marginTop: 12 }} />
            </>
          )}

          {step === 'lobby' && (
            <>
              <Text style={styles.heading}>상대방 대기 중</Text>
              <Text style={styles.sub}>이 배틀 ID를 공유하세요:</Text>
              <TouchableOpacity onPress={copyBattleId} style={styles.battleIdBox} activeOpacity={0.7}>
                <Text style={styles.battleId}>{battleId}</Text>
                <View style={styles.copyBtn}>
                  <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={18} color={copied ? '#22c55e' : '#6366f1'} />
                  <Text style={[styles.copyText, copied && styles.copyTextDone]}>
                    {copied ? '복사됨' : '복사'}
                  </Text>
                </View>
              </TouchableOpacity>
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              <Button title="배틀 입장" onPress={() => router.push(`/(tabs)/battle/${battleId}`)} style={{ marginTop: 24 }} />
              <Button title="← 뒤로" onPress={() => { setStep('pick_game'); setError(''); }} variant="secondary" style={{ marginTop: 8 }} />
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
  battleIdBox: {
    backgroundColor: '#eef2ff',
    borderRadius: 10,
    marginTop: 8,
    padding: 16,
    alignItems: 'center',
    gap: 10,
  },
  battleId: { fontSize: 15, fontWeight: '700', color: '#4338ca', textAlign: 'center', fontFamily: 'monospace' },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  copyText: { fontSize: 13, fontWeight: '600', color: '#6366f1' },
  copyTextDone: { color: '#22c55e' },
  errorText: { color: '#ef4444', fontSize: 13, marginTop: 12, textAlign: 'center' },
});
