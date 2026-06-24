import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { ScreenContainer } from '../../../components/ui/ScreenContainer';
import { LoadingView } from '../../../components/ui/LoadingView';
import { listPublicGames, listMyDecks, getGame, createBattle, getBattle, joinBattle } from '../../../lib/api';
import { getActiveDeckId } from '../../../lib/storage';
import type { GameOut, DeckOut, BattleOut } from '../../../types/api';

type Step = 'home' | 'pick_game' | 'pick_deck' | 'lobby';
type Mode = 'create' | 'join';

export default function BattleLobby() {
  const { game_id } = useLocalSearchParams<{ game_id?: string }>();

  const [step, setStep] = useState<Step>('home');
  const [mode, setMode] = useState<Mode>('create');
  const [games, setGames] = useState<GameOut[]>([]);
  const [selectedGame, setSelectedGame] = useState<GameOut | null>(null);
  const [decks, setDecks] = useState<DeckOut[]>([]);
  const [selectedDeck, setSelectedDeck] = useState<DeckOut | null>(null);
  const [pendingBattle, setPendingBattle] = useState<BattleOut | null>(null);
  const [battleId, setBattleId] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // game_id 파라미터로 진입 시 pick_deck 바로 이동
  useEffect(() => {
    if (!game_id) return;
    setMode('create');
    loadDecksForGame(game_id);
  }, [game_id]);

  const loadDecksForGame = async (gid: string, targetGame?: GameOut) => {
    setPageLoading(true);
    setError('');
    try {
      const [fetchedDecks, activeDeckId, gameData] = await Promise.all([
        listMyDecks(gid),
        getActiveDeckId(gid),
        targetGame ? Promise.resolve(targetGame) : getGame(gid),
      ]);
      setSelectedGame(gameData);
      setDecks(fetchedDecks);
      const active = fetchedDecks.find(d => d.id === activeDeckId) ?? fetchedDecks[0] ?? null;
      setSelectedDeck(active);
      setStep('pick_deck');
    } catch {
      setError('게임 정보를 불러올 수 없습니다');
    }
    setPageLoading(false);
  };

  const startJoin = async () => {
    if (!joinCode.trim()) return;
    setError('');
    setLoading(true);
    try {
      const battle = await getBattle(joinCode.trim());
      if (battle.status !== 'waiting') { setError('이미 시작된 배틀입니다'); setLoading(false); return; }
      setPendingBattle(battle);
      setMode('join');
      await loadDecksForGame(battle.game_id);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? '배틀을 찾을 수 없습니다');
    }
    setLoading(false);
  };

  const goPickGame = async () => {
    setError('');
    setMode('create');
    if (games.length === 0) {
      setLoading(true);
      try { setGames(await listPublicGames()); } catch { setError('게임 목록 로드 실패'); }
      setLoading(false);
    }
    setStep('pick_game');
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

  const confirmJoin = async () => {
    if (!selectedDeck || !pendingBattle) return;
    setError('');
    setLoading(true);
    try {
      await joinBattle(pendingBattle.id, { deck_id: selectedDeck.id });
      router.push(`/(tabs)/battle/${pendingBattle.id}`);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? '참가 실패');
    }
    setLoading(false);
  };

  const copyBattleId = async () => {
    await Clipboard.setStringAsync(battleId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const reset = () => { setStep('home'); setError(''); setSelectedGame(null); setSelectedDeck(null); setPendingBattle(null); };

  if (pageLoading) return <LoadingView />;

  return (
    <>
      <Stack.Screen options={{ title: '배틀' }} />
      <ScreenContainer>
        <ScrollView contentContainerStyle={styles.content}>

          {/* ── HOME ── */}
          {step === 'home' && (
            <>
              <Text style={styles.heading}>배틀 참가</Text>
              <Text style={styles.label}>배틀 코드 입력</Text>
              <Input
                value={joinCode}
                onChangeText={setJoinCode}
                placeholder="배틀 ID를 붙여넣으세요"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Button title="코드로 참가" onPress={startJoin} loading={loading} style={{ marginBottom: 8 }} />

              <View style={styles.divider}><View style={styles.dividerLine} /><Text style={styles.dividerText}>또는</Text><View style={styles.dividerLine} /></View>

              <Button title="새 배틀 방 만들기" onPress={goPickGame} variant="secondary" loading={loading} />
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
            </>
          )}

          {/* ── PICK GAME (방 만들기 전용) ── */}
          {step === 'pick_game' && (
            <>
              <Text style={styles.heading}>게임 선택</Text>
              {games.map(g => (
                <Button key={g.id} title={g.title} onPress={() => loadDecksForGame(g.id, g)} variant="secondary" style={styles.item} />
              ))}
              {games.length === 0 && <Text style={styles.empty}>공개 게임이 없습니다.</Text>}
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              <Button title="← 뒤로" onPress={reset} variant="secondary" style={{ marginTop: 12 }} />
            </>
          )}

          {/* ── PICK DECK ── */}
          {step === 'pick_deck' && (
            <>
              <Text style={styles.heading}>{mode === 'join' ? '참가할 덱 선택' : '덱 선택'}</Text>
              <Text style={styles.sub}>게임: {selectedGame?.title}</Text>
              {decks.map(d => (
                <Button
                  key={d.id}
                  title={`${d.name} (${d.card_ids?.length ?? '?'}장)`}
                  onPress={() => setSelectedDeck(d)}
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
                <Button
                  title={mode === 'join' ? '배틀 참가' : '배틀 방 만들기'}
                  onPress={mode === 'join' ? confirmJoin : createLobby}
                  loading={loading}
                  style={{ marginTop: 16 }}
                />
              )}
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              <Button title="← 뒤로" onPress={reset} variant="secondary" style={{ marginTop: 8 }} />
            </>
          )}

          {/* ── LOBBY ── */}
          {step === 'lobby' && (
            <>
              <Text style={styles.heading}>상대방 대기 중</Text>
              <Text style={styles.sub}>배틀 ID를 상대방에게 공유하세요</Text>
              <TouchableOpacity onPress={copyBattleId} style={styles.battleIdBox} activeOpacity={0.7}>
                <Text style={styles.battleId}>{battleId}</Text>
                <View style={styles.copyBtn}>
                  <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={18} color={copied ? '#22c55e' : '#6366f1'} />
                  <Text style={[styles.copyText, copied && styles.copyTextDone]}>{copied ? '복사됨' : '복사'}</Text>
                </View>
              </TouchableOpacity>
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              <Button title="배틀 입장" onPress={() => router.push(`/(tabs)/battle/${battleId}`)} style={{ marginTop: 24 }} />
              <Button title="← 취소" onPress={reset} variant="secondary" style={{ marginTop: 8 }} />
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
  label: { fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 6 },
  item: { marginBottom: 8 },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 24 },
  noDecks: { alignItems: 'center', marginTop: 24 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20, gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e5e7eb' },
  dividerText: { fontSize: 12, color: '#9ca3af' },
  battleIdBox: { backgroundColor: '#eef2ff', borderRadius: 10, marginTop: 8, padding: 16, alignItems: 'center', gap: 10 },
  battleId: { fontSize: 15, fontWeight: '700', color: '#4338ca', textAlign: 'center', fontFamily: 'monospace' },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  copyText: { fontSize: 13, fontWeight: '600', color: '#6366f1' },
  copyTextDone: { color: '#22c55e' },
  errorText: { color: '#ef4444', fontSize: 13, marginTop: 12, textAlign: 'center' },
});
