import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { ScreenContainer } from '../../../components/ui/ScreenContainer';
import { LoadingView } from '../../../components/ui/LoadingView';
import { listPublicGames, createBattle, getBattle, joinBattle, startBattle } from '../../../lib/api';
import { useAuthStore } from '../../../store/auth';
import type { GameOut, BattleOut } from '../../../types/api';

type Step = 'home' | 'pick_game' | 'lobby';

export default function BattleLobby() {
  const { game_id } = useLocalSearchParams<{ game_id?: string }>();
  const user = useAuthStore(s => s.user);

  const [step, setStep] = useState<Step>('home');
  const [games, setGames] = useState<GameOut[]>([]);
  const [battle, setBattle] = useState<BattleOut | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // game_id 파라미터로 진입 시 바로 방 생성
  useEffect(() => {
    if (!game_id) return;
    createLobbyForGame(game_id);
  }, [game_id]);

  // lobby 단계: 참가자 목록 + 시작 여부 폴링
  useEffect(() => {
    if (step !== 'lobby' || !battle) return;
    pollRef.current = setInterval(async () => {
      try {
        const b = await getBattle(battle.id);
        setBattle(b);
        if (b.status === 'playing') {
          if (pollRef.current) clearInterval(pollRef.current);
          router.replace(`/(tabs)/battle/${b.id}`);
        }
      } catch {}
    }, 2000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [step, battle?.id]);

  const createLobbyForGame = async (gid: string) => {
    setError('');
    setPageLoading(true);
    try {
      const b = await createBattle({ game_id: gid });
      setBattle(b);
      setStep('lobby');
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? '방 생성 실패');
    }
    setPageLoading(false);
  };

  const startJoin = async () => {
    if (!joinCode.trim()) return;
    setError('');
    setLoading(true);
    try {
      const b = await getBattle(joinCode.trim());
      if (b.status !== 'waiting') { setError('이미 시작된 배틀입니다'); setLoading(false); return; }
      const joined = await joinBattle(b.id);
      setBattle(joined);
      setStep('lobby');
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? '배틀을 찾을 수 없습니다');
    }
    setLoading(false);
  };

  const handleStart = async () => {
    if (!battle) return;
    setError('');
    setLoading(true);
    try {
      const started = await startBattle(battle.id);
      router.replace(`/(tabs)/battle/${started.id}`);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? '시작 실패');
    }
    setLoading(false);
  };

  const goPickGame = async () => {
    setError('');
    if (games.length === 0) {
      setLoading(true);
      try { setGames(await listPublicGames()); } catch { setError('게임 목록 로드 실패'); }
      setLoading(false);
    }
    setStep('pick_game');
  };

  const copyBattleId = async () => {
    if (!battle) return;
    await Clipboard.setStringAsync(battle.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const reset = () => { setStep('home'); setError(''); setBattle(null); };

  if (pageLoading) return <LoadingView />;

  const isHost = !!battle && !!user && battle.players[0]?.user_id === user.id;

  return (
    <>
      <Stack.Screen options={{ title: '배틀' }} />
      <ScreenContainer>
        <ScrollView contentContainerStyle={styles.content}>

          {/* ── HOME ── */}
          {step === 'home' && (
            <>
              <Text style={styles.heading}>배틀 참가</Text>
              <Input
                label="배틀 코드 입력"
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
                <Button key={g.id} title={g.title} onPress={() => createLobbyForGame(g.id)} variant="secondary" style={styles.item} />
              ))}
              {games.length === 0 && <Text style={styles.empty}>공개 게임이 없습니다.</Text>}
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              <Button title="← 뒤로" onPress={reset} variant="secondary" style={{ marginTop: 12 }} />
            </>
          )}

          {/* ── LOBBY ── */}
          {step === 'lobby' && battle && (
            <>
              <Text style={styles.heading}>{isHost ? '참가자 대기 중' : '방장이 시작하길 기다리는 중'}</Text>
              <Text style={styles.sub}>배틀 ID를 다른 참가자에게 공유하세요</Text>
              <TouchableOpacity onPress={copyBattleId} style={styles.battleIdBox} activeOpacity={0.7}>
                <Text style={styles.battleId}>{battle.id}</Text>
                <View style={styles.copyBtn}>
                  <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={18} color={copied ? '#22c55e' : '#6366f1'} />
                  <Text style={[styles.copyText, copied && styles.copyTextDone]}>{copied ? '복사됨' : '복사'}</Text>
                </View>
              </TouchableOpacity>

              <Text style={styles.playersLabel}>참가자 ({battle.players.length}명)</Text>
              <View style={styles.playersList}>
                {battle.players.map((p, i) => (
                  <View key={p.user_id} style={styles.playerRow}>
                    <Text style={styles.playerName}>{p.username}{i === 0 ? ' (방장)' : ''}</Text>
                  </View>
                ))}
              </View>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              {isHost ? (
                <Button
                  title={battle.players.length < 2 ? '2명 이상 모여야 시작 가능' : '배틀 시작'}
                  onPress={handleStart}
                  loading={loading}
                  disabled={battle.players.length < 2}
                  style={{ marginTop: 24 }}
                />
              ) : (
                <Text style={styles.waitingText}>방장이 시작하면 자동으로 입장합니다…</Text>
              )}
              <Button title="← 나가기" onPress={reset} variant="secondary" style={{ marginTop: 8 }} />
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
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20, gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e5e7eb' },
  dividerText: { fontSize: 12, color: '#9ca3af' },
  battleIdBox: { backgroundColor: '#eef2ff', borderRadius: 10, marginTop: 8, padding: 16, alignItems: 'center', gap: 10 },
  battleId: { fontSize: 15, fontWeight: '700', color: '#4338ca', textAlign: 'center', fontFamily: 'monospace' },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  copyText: { fontSize: 13, fontWeight: '600', color: '#6366f1' },
  copyTextDone: { color: '#22c55e' },
  errorText: { color: '#ef4444', fontSize: 13, marginTop: 12, textAlign: 'center' },
  playersLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginTop: 24, marginBottom: 8 },
  playersList: { gap: 6 },
  playerRow: { backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 12 },
  playerName: { fontSize: 14, color: '#111827', fontWeight: '500' },
  waitingText: { textAlign: 'center', color: '#9ca3af', fontSize: 13, marginTop: 24 },
});
