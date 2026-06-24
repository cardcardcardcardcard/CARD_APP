import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, router, Stack, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../../store/auth';
import { useBattle } from '../../../hooks/useBattle';
import { getBattle, listCards } from '../../../lib/api';
import { Button } from '../../../components/ui/Button';
import { ScreenContainer } from '../../../components/ui/ScreenContainer';
import { TYPE_META, needsTarget } from '../../../components/battle/cardVisuals';
import { FeedBanner } from '../../../components/battle/FeedBanner';
import { ErrorBanner } from '../../../components/battle/ErrorBanner';
import { HandCard } from '../../../components/battle/HandCard';
import { SeatPickerModal } from '../../../components/battle/SeatPickerModal';
import { DiscardPickerModal } from '../../../components/battle/DiscardPickerModal';
import { HandProgress } from '../../../components/battle/HandProgress';
import { TrapZoneRow } from '../../../components/battle/TrapZoneRow';
import { EndScreen, EndOutcome } from '../../../components/battle/EndScreen';
import type { BattleOut, BattlePlayerOut, CardOut } from '../../../types/api';

const FALLBACK_HAND_SIZE_TO_WIN = 10;

export default function BattleScreen() {
  const { battleId } = useLocalSearchParams<{ battleId: string }>();
  const { token, user } = useAuthStore();
  const navigation = useNavigation();
  const {
    state, winner, gameEnded, forfeitedBy, error, errorId, connected, lastEvent,
    sendDraw, sendPlayAction, sendInstallTrap, sendRevealTrap, sendPlayCounter, sendPassCounter, sendSetDirection, sendForfeit,
    sendChooseDiscard,
  } = useBattle(battleId, token ?? '');

  const [actor, setActor] = useState<number | null>(null);
  const [players, setPlayers] = useState<BattlePlayerOut[]>([]);
  const [cardMap, setCardMap] = useState<Record<string, CardOut>>({});
  const [revealingTrapId, setRevealingTrapId] = useState<string | null>(null);
  const [targetPickerCard, setTargetPickerCard] = useState<CardOut | null>(null);
  const [confirmingForfeit, setConfirmingForfeit] = useState(false);

  // 배틀 중에는 하단 탭바를 숨겨 다른 탭으로 이동 못하게 함
  useEffect(() => {
    const parent = navigation.getParent?.();
    parent?.setOptions({ tabBarStyle: { display: 'none' } });
    return () => { parent?.setOptions({ tabBarStyle: undefined }); };
  }, [navigation]);

  useEffect(() => {
    getBattle(battleId).then(async (b: BattleOut) => {
      const me = b.players.find(p => p.user_id === user?.id);
      setActor(me ? me.seat_index : null);
      setPlayers(b.players);
      const cards = await listCards(b.game_id);
      setCardMap(Object.fromEntries(cards.map(c => [c.id, c])));
    });
  }, [battleId, user]);

  const usernameOf = useCallback((seat?: number) => {
    if (seat == null) return '???';
    return players.find(p => p.seat_index === seat)?.username ?? `플레이어${seat + 1}`;
  }, [players]);

  const who = useCallback((seat?: number) => {
    if (seat == null) return '???';
    return seat === actor ? '나' : usernameOf(seat);
  }, [actor, usernameOf]);

  if (!connected && !state) {
    return (
      <ScreenContainer style={{ backgroundColor: '#0f172a' }}>
        <ActivityIndicator size="large" color="#6366f1" style={{ flex: 1 }} />
        <Text style={styles.connectingText}>연결 중…</Text>
      </ScreenContainer>
    );
  }

  if (gameEnded) {
    const winThreshold = state?.win_hand_size ?? FALLBACK_HAND_SIZE_TO_WIN;
    const iWon = winner != null && winner === actor;
    let outcome: EndOutcome;
    if (forfeitedBy != null) {
      outcome = forfeitedBy === actor ? 'forfeited_self' : winner != null ? 'forfeited_won' : 'forfeited_no_winner';
    } else {
      outcome = iWon ? 'won' : 'lost';
    }
    return (
      <ScreenContainer style={{ backgroundColor: '#0f172a' }}>
        <EndScreen
          outcome={outcome}
          winnerName={winner != null ? usernameOf(winner) : undefined}
          forfeiterName={forfeitedBy != null ? usernameOf(forfeitedBy) : undefined}
          handThreshold={winThreshold}
          onReturn={() => router.replace('/(tabs)/battle')}
        />
      </ScreenContainer>
    );
  }

  if (!state || actor == null) return null;

  const numPlayers = state.num_players;
  const opponentSeats = Array.from({ length: numPlayers }, (_, i) => i).filter(i => i !== actor);
  const myHand = state.hands[actor].filter(Boolean) as string[];
  const myTraps = (state.trap_zones[actor].filter(Boolean) as string[]);
  const isMyTurn = state.active_seat === actor;
  const pending = state.pending_trigger;
  const iAmResponder = pending && pending.actor !== actor;
  const iAmWaitingOnOpponent = pending && pending.actor === actor;
  const myDiscardObligation = state.pending_discards.find(pd => pd.seat === actor);
  const othersDiscarding = state.pending_discards.filter(pd => pd.seat !== actor);
  const discardBlocking = state.pending_discards.length > 0;

  const canDraw = isMyTurn && !state.has_acted_this_turn && !pending && !discardBlocking && state.shared_deck.length > 0;
  const canInstallTrap = isMyTurn && !state.has_acted_this_turn && !state.trap_installed_this_turn && !pending && !discardBlocking;
  const canPlayAction = isMyTurn && !state.has_acted_this_turn && !pending && !discardBlocking;
  const counterEligibleNow = !!iAmResponder && !(pending?.source_type === 'action' && pending.has_minigame) && !discardBlocking;

  const counterMatchesPending = (card: CardOut) => {
    if (!pending) return false;
    return pending.source_type === 'action' ? card.counters_action : card.counters_trap;
  };

  const cardUsable = (card: CardOut) => {
    if (card.card_type === 'action') return canPlayAction;
    if (card.card_type === 'trap') return canInstallTrap;
    if (card.card_type === 'counter') return counterEligibleNow && counterMatchesPending(card);
    return false;
  };

  const handleCardPress = (card: CardOut) => {
    if (card.card_type === 'trap') { sendInstallTrap(card.id); return; }
    if (needsTarget(card)) { setTargetPickerCard(card); return; }
    if (card.card_type === 'action') sendPlayAction(card.id);
    else if (card.card_type === 'counter') sendPlayCounter(card.id);
  };

  const confirmTarget = (seat: number) => {
    if (!targetPickerCard) return;
    if (targetPickerCard.card_type === 'action') sendPlayAction(targetPickerCard.id, seat);
    else sendPlayCounter(targetPickerCard.id, seat);
    setTargetPickerCard(null);
  };

  const confirmReveal = (seat: number) => {
    if (revealingTrapId) sendRevealTrap(revealingTrapId, seat);
    setRevealingTrapId(null);
  };

  return (
    <>
      <Stack.Screen options={{ title: '배틀', headerShown: false }} />
      <ScreenContainer style={{ backgroundColor: '#0f172a' }}>
        <FeedBanner event={lastEvent} myActor={actor} turnNumber={state.turn_number} who={who} />
        <ErrorBanner message={error} errorId={errorId} />

        {/* Opponents */}
        <ScrollView style={styles.opponentArea} contentContainerStyle={{ gap: 0 }}>
          {opponentSeats.map(seat => (
            <View key={seat} style={styles.zone}>
              <View style={styles.zoneHeader}>
                <Text style={styles.zoneLabel}>
                  {usernameOf(seat)}{seat === state.active_seat ? ' · 차례' : ''}
                </Text>
                <TrapZoneRow count={(state.trap_zones[seat] ?? []).length} mine={false} />
              </View>
              <HandProgress count={(state.hands[seat] ?? []).length} target={state.win_hand_size} />
            </View>
          ))}
        </ScrollView>

        {/* Turn bar */}
        <View style={styles.turnBar}>
          <TouchableOpacity onPress={() => sendSetDirection(state.play_direction === 'cw' ? 'ccw' : 'cw')} style={styles.directionBtn}>
            <Ionicons name={state.play_direction === 'cw' ? 'refresh' : 'refresh-outline'} size={14} color="#64748b" />
            <Text style={styles.directionText}>{state.play_direction === 'cw' ? '시계방향' : '반시계방향'}</Text>
          </TouchableOpacity>
          <Text style={styles.turnText}>{state.turn_number}턴 · 더미 {state.shared_deck.length}장 · 버림 {state.discard_pile.length}장</Text>
          <View style={[styles.turnChip, isMyTurn ? styles.chipActive : styles.chipWait]}>
            <Text style={[styles.chipText, isMyTurn ? styles.chipTextActive : styles.chipTextWait]}>
              {isMyTurn ? '내 차례' : `${usernameOf(state.active_seat)} 차례`}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setConfirmingForfeit(true)} style={styles.forfeitBtn}>
            <Ionicons name="flag-outline" size={14} color="#64748b" />
          </TouchableOpacity>
        </View>

        {confirmingForfeit && (
          <View style={styles.forfeitConfirm}>
            <Text style={styles.forfeitConfirmText}>정말 기권하시겠습니까? 게임에서 즉시 패배 처리됩니다.</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <Button title="기권합니다" onPress={() => { sendForfeit(); setConfirmingForfeit(false); }} variant="danger" style={{ flex: 1 }} />
              <Button title="취소" onPress={() => setConfirmingForfeit(false)} variant="secondary" style={{ flex: 1 }} />
            </View>
          </View>
        )}

        {/* Pending decision panel */}
        {pending && (
          <View style={styles.pendingPanel}>
            {iAmWaitingOnOpponent ? (
              <>
                <ActivityIndicator size="small" color="#94a3b8" />
                <Text style={styles.pendingText}>다른 플레이어의 대응을 기다리는 중…</Text>
              </>
            ) : (
              <>
                <Text style={styles.pendingText}>
                  {usernameOf(pending.actor)}{pending.source_type === 'trap' ? '의 함정이 발동했습니다.' : '가 카드를 사용했습니다.'} 카운터로 막거나 패스하세요.
                  {pending.source_type === 'action' && pending.has_minigame ? ' (미니게임 — 카운터 불가)' : ''}
                </Text>
                {cardMap[pending.card_id] && (
                  <View style={styles.pendingCardInfo}>
                    <Text style={styles.pendingCardName}>{cardMap[pending.card_id].name}</Text>
                    {cardMap[pending.card_id].effect_text ? (
                      <Text style={styles.pendingCardEffect}>{cardMap[pending.card_id].effect_text}</Text>
                    ) : null}
                  </View>
                )}
                <Button title="패스" onPress={sendPassCounter} variant="secondary" style={{ marginTop: 8 }} />
              </>
            )}
          </View>
        )}

        {/* 다른 사람이 버릴 카드를 고르는 중 */}
        {othersDiscarding.length > 0 && (
          <View style={styles.pendingPanel}>
            <ActivityIndicator size="small" color="#94a3b8" />
            <Text style={styles.pendingText}>
              {othersDiscarding.map(pd => `${usernameOf(pd.seat)}(${pd.count}장)`).join(', ')} 버릴 카드 고르는 중…
            </Text>
          </View>
        )}

        <DiscardPickerModal
          visible={!!myDiscardObligation}
          count={myDiscardObligation?.count ?? 0}
          cards={myHand.map(id => cardMap[id]).filter(Boolean)}
          onConfirm={sendChooseDiscard}
        />

        {/* My zone */}
        <View style={styles.zone}>
          <View style={styles.zoneHeader}>
            <Text style={styles.zoneLabel}>나</Text>
            <TrapZoneRow
              count={myTraps.length}
              mine
              cardIds={myTraps}
              cardMap={cardMap}
              onPressCard={id => setRevealingTrapId(id)}
            />
          </View>
          <HandProgress count={myHand.length} target={state.win_hand_size} />
        </View>

        {/* Reveal confirmation — 발동자 선택 (전체 플레이어 중) */}
        <SeatPickerModal
          visible={!!revealingTrapId}
          title="조건을 만족한 사람은?"
          cardName={revealingTrapId ? cardMap[revealingTrapId]?.name : undefined}
          cardEffectText={revealingTrapId ? cardMap[revealingTrapId]?.effect_text : undefined}
          cardColor={TYPE_META.trap.color}
          seats={Array.from({ length: numPlayers }, (_, i) => i).map(seat => ({ seat, label: who(seat), isMe: seat === actor }))}
          onSelect={confirmReveal}
          onCancel={() => setRevealingTrapId(null)}
        />

        {/* Target picker — 행동/카운터 카드의 대상 선택 */}
        <SeatPickerModal
          visible={!!targetPickerCard}
          title="대상을 선택하세요"
          cardName={targetPickerCard?.name}
          cardEffectText={targetPickerCard?.effect_text}
          cardColor={targetPickerCard ? TYPE_META[targetPickerCard.card_type].color : undefined}
          seats={opponentSeats.map(seat => ({ seat, label: usernameOf(seat) }))}
          onSelect={confirmTarget}
          onCancel={() => setTargetPickerCard(null)}
        />

        {/* Hand */}
        <View style={styles.handSection}>
          <Text style={styles.handLabel}>손패 {myHand.length}/{state.win_hand_size}</Text>
          {myHand.length === 0 ? (
            <Text style={styles.emptyHand}>손패 없음</Text>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.handRow}
              contentContainerStyle={styles.handRowContent}
            >
              {myHand.map((cardId, i) => {
                const card = cardMap[cardId];
                if (!card) return null;
                return (
                  <HandCard
                    key={`${cardId}-${i}`}
                    card={card}
                    usable={cardUsable(card)}
                    highlight={card.card_type === 'counter' && counterEligibleNow && counterMatchesPending(card)}
                    onPress={() => handleCardPress(card)}
                  />
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {canDraw ? (
            <Button title="카드 뽑기" onPress={sendDraw} style={{ flex: 1 }} />
          ) : isMyTurn && !pending ? (
            <Text style={styles.waitText}>{state.has_acted_this_turn ? '행동 완료' : '뽑을 카드 없음'}</Text>
          ) : !pending ? (
            <Text style={styles.waitText}>{usernameOf(state.active_seat)} 턴…</Text>
          ) : null}
        </View>
      </ScreenContainer>
    </>
  );
}

const styles = StyleSheet.create({
  connectingText: { textAlign: 'center', color: '#94a3b8', marginBottom: 40 },
  opponentArea: { maxHeight: 220 },
  zone: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  zoneHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  zoneLabel: { fontSize: 10, fontWeight: '700', color: '#334155', textTransform: 'uppercase', letterSpacing: 1 },
  turnBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7, backgroundColor: '#0d1117' },
  directionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  directionText: { fontSize: 10, color: '#475569' },
  forfeitBtn: { padding: 4 },
  forfeitConfirm: { backgroundColor: '#2c0e0e', margin: 12, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#7f1d1d' },
  forfeitConfirmText: { fontSize: 13, color: '#fca5a5', textAlign: 'center' },
  turnText: { fontSize: 11, color: '#334155' },
  turnChip: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  chipActive: { backgroundColor: '#312e81' },
  chipWait: { backgroundColor: '#1e293b' },
  chipText: { fontSize: 11, fontWeight: '700' },
  chipTextActive: { color: '#a5b4fc' },
  chipTextWait: { color: '#334155' },
  pendingPanel: { backgroundColor: '#1e1b4b', margin: 12, borderRadius: 10, padding: 12, alignItems: 'center', gap: 6 },
  pendingText: { fontSize: 13, color: '#c7d2fe', textAlign: 'center' },
  pendingCardInfo: { alignItems: 'center', marginTop: 4 },
  pendingCardName: { fontSize: 13, fontWeight: '800', color: '#e2e8f0' },
  pendingCardEffect: { fontSize: 12, color: '#a5b4fc', textAlign: 'center', marginTop: 4 },
  handSection: { paddingTop: 10 },
  handLabel: { fontSize: 10, color: '#334155', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, paddingHorizontal: 16, marginBottom: 8 },
  emptyHand: { color: '#1e293b', textAlign: 'center', fontSize: 13, marginTop: 16 },
  handRow: { height: 200, flexGrow: 0, flexShrink: 0 },
  handRowContent: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingHorizontal: 16, paddingBottom: 4 },
  actions: { flexDirection: 'row', padding: 10, borderTopWidth: 1, borderTopColor: '#1e293b' },
  waitText: { flex: 1, color: '#334155', textAlign: 'center', fontSize: 12, alignSelf: 'center' },
});
