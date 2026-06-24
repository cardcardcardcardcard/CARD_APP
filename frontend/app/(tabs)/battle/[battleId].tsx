import { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, ScrollView,
  TouchableOpacity, FlatList, Animated,
} from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { useAuthStore } from '../../../store/auth';
import { useBattle } from '../../../hooks/useBattle';
import { getBattle, listCards } from '../../../lib/api';
import { Button } from '../../../components/ui/Button';
import { ScreenContainer } from '../../../components/ui/ScreenContainer';
import type { BattleOut, CardOut } from '../../../types/api';

// ── effect type → visual ──────────────────────────────────────────────────
const EFFECT_STYLE: Record<string, { color: string; bg: string; icon: string; label: (v: number) => string }> = {
  deal_damage: { color: '#fca5a5', bg: '#450a0a', icon: '⚔️', label: v => `${v} 피해` },
  heal:        { color: '#86efac', bg: '#052e16', icon: '💚', label: v => `${v} 회복` },
  draw_card:   { color: '#93c5fd', bg: '#0c1a2e', icon: '🃏', label: v => `${v}장 드로우` },
  buff_stat:   { color: '#c4b5fd', bg: '#1e0a3c', icon: '✨', label: v => `+${v} 버프` },
  debuff_stat: { color: '#fdba74', bg: '#2c0e00', icon: '🔻', label: v => `-${v} 디버프` },
  skip_turn:   { color: '#94a3b8', bg: '#0f172a', icon: '⏭️', label: () => '턴 스킵' },
};

function getCardVisual(effects: any[]): { icon: string; color: string; bg: string; summary: string } {
  for (const ef of effects) {
    for (const act of (ef.actions ?? [])) {
      const s = EFFECT_STYLE[act.type];
      if (s) return { icon: s.icon, color: s.color, bg: s.bg, summary: s.label(act.value ?? 0) };
    }
  }
  return { icon: '🂠', color: '#64748b', bg: '#0f172a', summary: '효과 없음' };
}

// ── FlipCard component ────────────────────────────────────────────────────
function FlipCard({ card, onPlay, disabled }: { card: CardOut; onPlay: () => void; disabled: boolean }) {
  const flip = useRef(new Animated.Value(0)).current;
  const lift = useRef(new Animated.Value(0)).current;

  const handlePress = useCallback(() => {
    if (disabled) return;
    Animated.parallel([
      Animated.sequence([
        Animated.timing(flip, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.timing(flip, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.timing(lift, { toValue: -12, duration: 100, useNativeDriver: true }),
        Animated.timing(lift, { toValue: 0, duration: 100, useNativeDriver: true }),
      ]),
    ]).start(onPlay);
  }, [disabled, onPlay]);

  const rotateY = flip.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['0deg', '90deg', '0deg'] });
  const vis = getCardVisual(card.effects ?? []);

  return (
    <TouchableOpacity onPress={handlePress} disabled={disabled} activeOpacity={0.85}>
      <Animated.View style={[
        styles.card,
        { backgroundColor: vis.bg, borderColor: vis.color + '55', transform: [{ perspective: 800 }, { rotateY }, { translateY: lift }] },
        disabled && styles.cardDisabled,
      ]}>
        <Text style={styles.cardIcon}>{vis.icon}</Text>
        <Text style={styles.cardName} numberOfLines={2}>{card.name}</Text>
        <Text style={[styles.cardSummary, { color: vis.color }]}>{vis.summary}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ── main screen ───────────────────────────────────────────────────────────
export default function BattleScreen() {
  const { battleId } = useLocalSearchParams<{ battleId: string }>();
  const { token, user } = useAuthStore();
  const { state, swapped, winner, error, connected, actionLog, sendPlayCard, sendEndTurn } = useBattle(battleId, token ?? '');

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
          {iWon ? '🏆 승리!' : '패배'}
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
            <Text style={styles.swapText}>🔄 덱 교체!</Text>
          </View>
        )}

        {/* Opponent */}
        <View style={styles.zone}>
          <Text style={styles.zoneLabel}>상대방</Text>
          <HpBar hp={opHp} maxHp={state.initial_hp} color="#ef4444" />
          <Text style={styles.subInfo}>덱 ({opDeckRemaining.length}) · 손패 {opHand.length}장</Text>
        </View>

        {/* Action feed */}
        <View style={styles.feedArea}>
          {actionLog.slice(0, 4).map(entry => (
            <View key={entry.id} style={[styles.feedRow, entry.actor === actor ? styles.feedMine : styles.feedOpponent]}>
              <Text style={styles.feedText} numberOfLines={1}>
                {entry.actor === actor ? '나' : '상대방'}: <Text style={styles.feedCard}>{entry.cardName}</Text>
                {entry.effectsSummary.length > 0 ? `  ${entry.effectsSummary[0]}` : ''}
              </Text>
            </View>
          ))}
          {actionLog.length === 0 && (
            <Text style={styles.feedEmpty}>게임 시작. 카드를 제출하세요.</Text>
          )}
        </View>

        {/* Turn bar */}
        <View style={styles.turnBar}>
          <Text style={styles.turnText}>{state.turn_number}턴 · 덱 {myDeckLabel.toUpperCase()} · 자원 {myResources}</Text>
          <View style={[styles.turnChip, isMyTurn ? styles.chipActive : styles.chipWait]}>
            <Text style={[styles.chipText, isMyTurn ? styles.chipTextActive : styles.chipTextWait]}>
              {isMyTurn ? '내 차례' : '대기 중'}
            </Text>
          </View>
        </View>

        {/* My HP */}
        <View style={styles.zone}>
          <Text style={styles.zoneLabel}>나</Text>
          <HpBar hp={myHp} maxHp={state.initial_hp} color="#22c55e" />
          <Text style={styles.subInfo}>덱 ({myDeckRemaining.length})</Text>
        </View>

        {/* Hand */}
        <View style={styles.handSection}>
          <Text style={styles.handLabel}>손패 {myHand.length}장</Text>
          {myHand.length === 0 ? (
            <Text style={styles.emptyHand}>손패 없음</Text>
          ) : (
            <FlatList
              data={myHand}
              horizontal
              keyExtractor={(id, i) => `${id}-${i}`}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingBottom: 4 }}
              renderItem={({ item: cardId }) => {
                const card = cardMap[cardId];
                if (!card) return <View style={[styles.card, { backgroundColor: '#1e293b' }]}><Text style={styles.cardIcon}>?</Text></View>;
                return (
                  <FlipCard
                    card={card}
                    disabled={!isMyTurn}
                    onPlay={() => sendPlayCard(cardId)}
                  />
                );
              }}
            />
          )}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {isMyTurn
            ? <Button title="턴 종료" onPress={sendEndTurn} variant="secondary" style={{ flex: 1 }} />
            : <Text style={styles.waitText}>상대방 턴…</Text>
          }
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}
      </ScreenContainer>
    </>
  );
}

function HpBar({ hp, maxHp, color }: { hp: number; maxHp: number; color: string }) {
  const pct = Math.max(0, Math.min(100, (hp / maxHp) * 100));
  return (
    <View style={styles.hpRow}>
      <View style={styles.hpTrack}>
        <Animated.View style={[styles.hpFill, { width: `${pct}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={styles.hpNum}>{hp}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  connectingText: { textAlign: 'center', color: '#94a3b8', marginBottom: 40 },
  winnerText: { fontSize: 36, fontWeight: '800', textAlign: 'center', marginTop: 100 },
  swapBanner: { backgroundColor: '#fbbf24', paddingVertical: 6 },
  swapText: { textAlign: 'center', fontWeight: '700', color: '#111827', fontSize: 13 },
  zone: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  zoneLabel: { fontSize: 10, fontWeight: '700', color: '#334155', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  hpRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 3 },
  hpTrack: { flex: 1, height: 5, backgroundColor: '#1e293b', borderRadius: 3, overflow: 'hidden' },
  hpFill: { height: '100%', borderRadius: 3 },
  hpNum: { fontSize: 12, fontWeight: '700', color: '#e2e8f0', minWidth: 26, textAlign: 'right' },
  subInfo: { fontSize: 11, color: '#334155' },
  feedArea: { minHeight: 72, backgroundColor: '#0a0f1a', paddingHorizontal: 14, paddingVertical: 8, gap: 4 },
  feedRow: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  feedMine: { backgroundColor: '#1e1b4b' },
  feedOpponent: { backgroundColor: '#1c1010' },
  feedText: { fontSize: 12, color: '#94a3b8' },
  feedCard: { color: '#e2e8f0', fontWeight: '700' },
  feedEmpty: { color: '#1e293b', textAlign: 'center', fontSize: 12, marginTop: 6 },
  turnBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 7, backgroundColor: '#0d1117' },
  turnText: { fontSize: 11, color: '#334155' },
  turnChip: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  chipActive: { backgroundColor: '#312e81' },
  chipWait: { backgroundColor: '#1e293b' },
  chipText: { fontSize: 11, fontWeight: '700' },
  chipTextActive: { color: '#a5b4fc' },
  chipTextWait: { color: '#334155' },
  handSection: { flex: 1, paddingTop: 10 },
  handLabel: { fontSize: 10, color: '#334155', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, paddingHorizontal: 16, marginBottom: 8 },
  emptyHand: { color: '#1e293b', textAlign: 'center', fontSize: 13, marginTop: 16 },
  card: {
    width: 86,
    height: 118,
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    justifyContent: 'space-between',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  cardDisabled: { opacity: 0.35 },
  cardIcon: { fontSize: 22 },
  cardName: { fontSize: 11, fontWeight: '700', color: '#e2e8f0', lineHeight: 15 },
  cardSummary: { fontSize: 10, fontWeight: '600' },
  actions: { flexDirection: 'row', padding: 10, borderTopWidth: 1, borderTopColor: '#1e293b' },
  waitText: { flex: 1, color: '#334155', textAlign: 'center', fontSize: 12, alignSelf: 'center' },
  errorText: { color: '#ef4444', textAlign: 'center', padding: 6, fontSize: 11 },
});
