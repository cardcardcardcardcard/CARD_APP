// frontend/app/(tabs)/battle/[battleId].tsx
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../../store/auth';
import { useBattle } from '../../../hooks/useBattle';
import { getBattle } from '../../../lib/api';
import { Button } from '../../../components/ui/Button';
import type { BattleOut } from '../../../types/api';

export default function BattleScreen() {
  const { battleId } = useLocalSearchParams<{ battleId: string }>();
  const { token, user } = useAuthStore();
  const { state, swapped, winner, error, connected, sendAttack, sendEndTurn } = useBattle(battleId, token ?? '');

  const [actor, setActor] = useState<'a' | 'b' | null>(null);

  useEffect(() => {
    getBattle(battleId).then((b: BattleOut) => {
      setActor(b.player_a_id === user?.id ? 'a' : 'b');
    });
  }, [battleId, user]);

  if (!connected && !state) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#6366f1" style={{ flex: 1 }} />
        <Text style={styles.connectingText}>Connecting…</Text>
      </SafeAreaView>
    );
  }

  if (winner) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.winnerText}>{winner === 'a' ? 'Player A' : 'Player B'} wins!</Text>
        <Button title="Back to Lobby" onPress={() => router.replace('/(tabs)/battle')} style={{ margin: 24 }} />
      </SafeAreaView>
    );
  }

  if (!state) return null;

  const myHp = actor === 'a' ? state.hp_a : state.hp_b;
  const opHp = actor === 'a' ? state.hp_b : state.hp_a;
  const myHand = actor === 'a' ? state.hand_a : state.hand_b;
  const opHand = actor === 'a' ? state.hand_b : state.hand_a;
  const myDeckLabel = actor === 'a' ? state.deck_for_a : state.deck_for_b;
  const opDeckLabel = actor === 'a' ? state.deck_for_b : state.deck_for_a;
  const myResources = actor === 'a' ? state.resources_a : state.resources_b;
  const myDeckRemaining = actor === 'a' ? state.deck_remaining_a : state.deck_remaining_b;
  const opDeckRemaining = actor === 'a' ? state.deck_remaining_b : state.deck_remaining_a;

  const isMyTurn = state.active_player === actor;

  return (
    <>
      <Stack.Screen options={{ title: 'Battle', headerShown: false }} />
      <SafeAreaView style={styles.container}>
        {swapped && (
          <View style={styles.swapBanner}>
            <Text style={styles.swapText}>🔄 Decks Swapped!</Text>
          </View>
        )}

        {/* Opponent */}
        <View style={styles.playerZone}>
          <Text style={styles.playerLabel}>Opponent</Text>
          <View style={styles.hpBar}>
            <View style={[styles.hpFill, { width: `${(opHp / state.initial_hp) * 100}%`, backgroundColor: '#ef4444' }]} />
          </View>
          <Text style={styles.hpText}>HP: {opHp}/{state.initial_hp}</Text>
          <Text style={styles.deckText}>Deck ({opDeckLabel.toUpperCase()}): {opDeckRemaining.length} cards</Text>
          <Text style={styles.handText}>Hand: {opHand.length} cards</Text>
        </View>

        {/* Turn info */}
        <View style={styles.turnBar}>
          <Text style={styles.turnText}>Turn {state.turn_number}</Text>
          <Text style={styles.activeText}>{isMyTurn ? 'Your turn' : "Opponent's turn"}</Text>
          <Text style={styles.phaseText}>Phase: {state.phase}</Text>
        </View>

        {/* Your zone */}
        <View style={styles.playerZone}>
          <Text style={styles.playerLabel}>You</Text>
          <View style={styles.hpBar}>
            <View style={[styles.hpFill, { width: `${(myHp / state.initial_hp) * 100}%`, backgroundColor: '#22c55e' }]} />
          </View>
          <Text style={styles.hpText}>HP: {myHp}/{state.initial_hp}</Text>
          <Text style={styles.deckText}>Deck ({myDeckLabel.toUpperCase()}): {myDeckRemaining.length} cards</Text>
          <Text style={styles.handText}>Hand: {myHand.length} cards</Text>
          <Text style={styles.resourceText}>Resources: {myResources}</Text>
        </View>

        {/* Actions */}
        {isMyTurn && (
          <View style={styles.actions}>
            <Button title="Attack (10)" onPress={() => sendAttack(10)} style={styles.actionBtn} />
            <Button title="Attack (20)" onPress={() => sendAttack(20)} style={styles.actionBtn} />
            <Button title="End Turn" onPress={sendEndTurn} variant="secondary" style={styles.actionBtn} />
          </View>
        )}

        {!isMyTurn && (
          <View style={styles.waiting}>
            <Text style={styles.waitingText}>Waiting for opponent…</Text>
          </View>
        )}

        {error && <Text style={styles.errorText}>{error}</Text>}
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  connectingText: { textAlign: 'center', color: '#94a3b8', marginBottom: 40 },
  winnerText: { fontSize: 28, fontWeight: '800', color: '#fbbf24', textAlign: 'center', marginTop: 120 },
  swapBanner: { backgroundColor: '#fbbf24', padding: 10 },
  swapText: { textAlign: 'center', fontWeight: '700', color: '#111827' },
  playerZone: { flex: 1, padding: 16, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  playerLabel: { fontSize: 12, fontWeight: '600', color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase' },
  hpBar: { height: 8, backgroundColor: '#1e293b', borderRadius: 4, overflow: 'hidden', marginBottom: 4 },
  hpFill: { height: '100%', borderRadius: 4 },
  hpText: { fontSize: 14, color: '#e2e8f0', fontWeight: '600' },
  deckText: { fontSize: 12, color: '#64748b', marginTop: 2 },
  handText: { fontSize: 12, color: '#64748b', marginTop: 2 },
  resourceText: { fontSize: 12, color: '#818cf8', marginTop: 2 },
  turnBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: '#1e293b' },
  turnText: { fontSize: 13, color: '#94a3b8' },
  activeText: { fontSize: 13, fontWeight: '700', color: '#818cf8' },
  phaseText: { fontSize: 11, color: '#64748b' },
  actions: { flexDirection: 'row', padding: 12, gap: 8, backgroundColor: '#0f172a' },
  actionBtn: { flex: 1 },
  waiting: { padding: 16, alignItems: 'center' },
  waitingText: { color: '#94a3b8', fontSize: 14 },
  errorText: { color: '#ef4444', textAlign: 'center', padding: 8 },
});
