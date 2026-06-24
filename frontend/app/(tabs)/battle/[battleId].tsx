import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { useAuthStore } from '../../../store/auth';
import { useBattle } from '../../../hooks/useBattle';
import { getBattle, listCards } from '../../../lib/api';
import { Button } from '../../../components/ui/Button';
import { ScreenContainer } from '../../../components/ui/ScreenContainer';
import type { BattleOut, CardOut } from '../../../types/api';

export default function BattleScreen() {
  const { battleId } = useLocalSearchParams<{ battleId: string }>();
  const { token, user } = useAuthStore();
  const { state, swapped, winner, error, connected, sendPlayCard, sendEndTurn } = useBattle(battleId, token ?? '');

  const [actor, setActor] = useState<'a' | 'b' | null>(null);
  const [cardMap, setCardMap] = useState<Record<string, CardOut>>({});

  useEffect(() => {
    getBattle(battleId).then(async (b: BattleOut) => {
      const role = b.player_a_id === user?.id ? 'a' : 'b';
      setActor(role);
      const cards = await listCards(b.game_id);
      setCardMap(Object.fromEntries(cards.map(c => [c.id, c])));
    });
  }, [battleId, user]);

  if (!connected && !state) {
    return (
      <ScreenContainer style={{ backgroundColor: '#0f172a' }}>
        <ActivityIndicator size="large" color="#6366f1" style={{ flex: 1 }} />
        <Text style={styles.connectingText}>연결 중…</Text>
      </ScreenContainer>
    );
  }

  if (winner) {
    const iWon = winner === actor;
    return (
      <ScreenContainer style={{ backgroundColor: '#0f172a' }}>
        <Text style={[styles.winnerText, { color: iWon ? '#fbbf24' : '#94a3b8' }]}>
          {iWon ? '승리!' : '패배'}
        </Text>
        <Button title="로비로 돌아가기" onPress={() => router.replace('/(tabs)/battle')} style={{ margin: 24 }} />
      </ScreenContainer>
    );
  }

  if (!state || !actor) return null;

  const myHp = actor === 'a' ? state.hp_a : state.hp_b;
  const opHp = actor === 'a' ? state.hp_b : state.hp_a;
  const myHand: string[] = actor === 'a' ? state.hand_a : state.hand_b;
  const opHand = actor === 'a' ? state.hand_b : state.hand_a;
  const myDeckLabel = actor === 'a' ? state.deck_for_a : state.deck_for_b;
  const opDeckLabel = actor === 'a' ? state.deck_for_b : state.deck_for_a;
  const myResources = actor === 'a' ? state.resources_a : state.resources_b;
  const myDeckRemaining = actor === 'a' ? state.deck_remaining_a : state.deck_remaining_b;
  const opDeckRemaining = actor === 'a' ? state.deck_remaining_b : state.deck_remaining_a;

  const isMyTurn = state.active_player === actor;

  return (
    <>
      <Stack.Screen options={{ title: '배틀', headerShown: false }} />
      <ScreenContainer style={{ backgroundColor: '#0f172a' }}>
        {swapped && (
          <View style={styles.swapBanner}>
            <Text style={styles.swapText}>덱이 교체됐습니다!</Text>
          </View>
        )}

        {/* Opponent zone */}
        <View style={styles.playerZone}>
          <Text style={styles.playerLabel}>상대방</Text>
          <View style={styles.hpRow}>
            <View style={styles.hpBarWrap}>
              <View style={[styles.hpFill, { width: `${(opHp / state.initial_hp) * 100}%`, backgroundColor: '#ef4444' }]} />
            </View>
            <Text style={styles.hpNum}>{opHp}</Text>
          </View>
          <Text style={styles.subInfo}>덱 ({opDeckLabel.toUpperCase()}): {opDeckRemaining.length}장 · 손패: {opHand.length}장</Text>
        </View>

        {/* Turn bar */}
        <View style={styles.turnBar}>
          <Text style={styles.turnText}>{state.turn_number}턴</Text>
          <View style={[styles.turnChip, isMyTurn ? styles.turnChipActive : styles.turnChipWait]}>
            <Text style={[styles.turnChipText, isMyTurn ? styles.turnChipTextActive : styles.turnChipTextWait]}>
              {isMyTurn ? '내 차례' : '대기 중'}
            </Text>
          </View>
          <Text style={styles.phaseText}>{state.phase}</Text>
        </View>

        {/* My zone */}
        <View style={styles.playerZone}>
          <Text style={styles.playerLabel}>나</Text>
          <View style={styles.hpRow}>
            <View style={styles.hpBarWrap}>
              <View style={[styles.hpFill, { width: `${(myHp / state.initial_hp) * 100}%`, backgroundColor: '#22c55e' }]} />
            </View>
            <Text style={styles.hpNum}>{myHp}</Text>
          </View>
          <Text style={styles.subInfo}>덱 ({myDeckLabel.toUpperCase()}): {myDeckRemaining.length}장 · 자원: {myResources}</Text>
        </View>

        {/* Hand */}
        <View style={styles.handSection}>
          <Text style={styles.handLabel}>손패 ({myHand.length}장)</Text>
          {myHand.length === 0 ? (
            <Text style={styles.emptyHand}>손패가 없습니다</Text>
          ) : (
            <FlatList
              data={myHand}
              horizontal
              keyExtractor={(id, i) => `${id}-${i}`}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}
              renderItem={({ item: cardId }) => {
                const card = cardMap[cardId];
                return (
                  <TouchableOpacity
                    style={[styles.card, !isMyTurn && styles.cardDisabled]}
                    onPress={() => isMyTurn && sendPlayCard(cardId)}
                    disabled={!isMyTurn}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.cardName} numberOfLines={2}>{card?.name ?? '???'}</Text>
                    <Text style={styles.cardEffects}>{card?.effects?.length ?? 0}개 효과</Text>
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {isMyTurn ? (
            <Button title="턴 종료" onPress={sendEndTurn} variant="secondary" style={{ flex: 1 }} />
          ) : (
            <Text style={styles.waitingText}>상대방 턴…</Text>
          )}
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}
      </ScreenContainer>
    </>
  );
}

const styles = StyleSheet.create({
  connectingText: { textAlign: 'center', color: '#94a3b8', marginBottom: 40 },
  winnerText: { fontSize: 32, fontWeight: '800', textAlign: 'center', marginTop: 120 },
  swapBanner: { backgroundColor: '#fbbf24', padding: 10 },
  swapText: { textAlign: 'center', fontWeight: '700', color: '#111827' },
  playerZone: { padding: 14, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  playerLabel: { fontSize: 11, fontWeight: '600', color: '#475569', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 },
  hpRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  hpBarWrap: { flex: 1, height: 6, backgroundColor: '#1e293b', borderRadius: 3, overflow: 'hidden' },
  hpFill: { height: '100%', borderRadius: 3 },
  hpNum: { fontSize: 13, fontWeight: '700', color: '#e2e8f0', minWidth: 28, textAlign: 'right' },
  subInfo: { fontSize: 11, color: '#475569' },
  turnBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#1e293b' },
  turnText: { fontSize: 12, color: '#64748b' },
  turnChip: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  turnChipActive: { backgroundColor: '#312e81' },
  turnChipWait: { backgroundColor: '#1e293b' },
  turnChipText: { fontSize: 12, fontWeight: '700' },
  turnChipTextActive: { color: '#818cf8' },
  turnChipTextWait: { color: '#475569' },
  phaseText: { fontSize: 11, color: '#475569' },
  handSection: { flex: 1, paddingTop: 12 },
  handLabel: { fontSize: 11, color: '#475569', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, paddingHorizontal: 16, marginBottom: 10 },
  emptyHand: { color: '#334155', textAlign: 'center', marginTop: 20, fontSize: 13 },
  card: {
    width: 90,
    minHeight: 110,
    backgroundColor: '#1e293b',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 10,
    justifyContent: 'space-between',
  },
  cardDisabled: { opacity: 0.4 },
  cardName: { fontSize: 13, fontWeight: '700', color: '#e2e8f0', lineHeight: 18 },
  cardEffects: { fontSize: 10, color: '#64748b', marginTop: 6 },
  actions: { flexDirection: 'row', padding: 12, gap: 8, borderTopWidth: 1, borderTopColor: '#1e293b' },
  waitingText: { flex: 1, color: '#475569', textAlign: 'center', fontSize: 13, alignSelf: 'center' },
  errorText: { color: '#ef4444', textAlign: 'center', padding: 8, fontSize: 12 },
});
