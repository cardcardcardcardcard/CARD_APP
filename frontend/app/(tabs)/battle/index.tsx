import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { router, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { listPublicGames, listMyDecks, createBattle, getBattle, joinBattle } from '../../../lib/api';
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
      setDecks(await listMyDecks(game.id));
      setStep('pick_deck');
    } catch { Alert.alert('Error', 'Failed to load decks'); }
    setLoading(false);
  };

  const createLobby = async () => {
    if (!selectedGame || !selectedDeck) return;
    setLoading(true);
    try {
      const battle = await createBattle({ game_id: selectedGame.id, deck_id: selectedDeck.id });
      setBattleId(battle.id);
      setStep('lobby');
    } catch (e: any) { Alert.alert('Error', e?.response?.data?.detail ?? 'Failed'); }
    setLoading(false);
  };

  const joinLobby = async () => {
    if (!selectedDeck || !joinCode.trim()) return;
    setLoading(true);
    try {
      const battle = await getBattle(joinCode.trim());
      await joinBattle(battle.id, { deck_id: selectedDeck.id });
      router.push(`/(tabs)/battle/${battle.id}`);
    } catch (e: any) { Alert.alert('Error', e?.response?.data?.detail ?? 'Battle not found'); }
    setLoading(false);
  };

  if (pageLoading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#6366f1" />;

  return (
    <>
      <Stack.Screen options={{ title: 'Battle' }} />
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          {step === 'pick_game' && (
            <>
              <Text style={styles.heading}>Choose a Game</Text>
              {games.map(g => (
                <Button key={g.id} title={g.title} onPress={() => pickGame(g)} variant="secondary" style={styles.item} />
              ))}
              {games.length === 0 && <Text style={styles.empty}>No public games. Create one first.</Text>}
            </>
          )}

          {step === 'pick_deck' && (
            <>
              <Text style={styles.heading}>Choose Your Deck</Text>
              <Text style={styles.sub}>Game: {selectedGame?.title}</Text>
              {decks.map(d => (
                <Button
                  key={d.id}
                  title={d.name}
                  onPress={() => { setSelectedDeck(d); }}
                  variant={selectedDeck?.id === d.id ? 'primary' : 'secondary'}
                  style={styles.item}
                />
              ))}
              {decks.length === 0 && <Text style={styles.empty}>No decks for this game. Build one first.</Text>}
              {selectedDeck && (
                <>
                  <Button title="Create Battle Room" onPress={createLobby} loading={loading} style={{ marginTop: 16 }} />
                  <Text style={styles.orText}>— or join existing —</Text>
                  <Input label="Battle ID to join" value={joinCode} onChangeText={setJoinCode} autoCapitalize="none" />
                  <Button title="Join Battle" onPress={joinLobby} loading={loading} variant="secondary" />
                </>
              )}
              <Button title="← Back" onPress={() => setStep('pick_game')} variant="secondary" style={{ marginTop: 12 }} />
            </>
          )}

          {step === 'lobby' && (
            <>
              <Text style={styles.heading}>Waiting for Opponent</Text>
              <Text style={styles.sub}>Share this Battle ID:</Text>
              <Text style={styles.battleId}>{battleId}</Text>
              <Button title="Enter Battle" onPress={() => router.push(`/(tabs)/battle/${battleId}`)} style={{ marginTop: 24 }} />
              <Button title="← Back" onPress={() => setStep('pick_game')} variant="secondary" style={{ marginTop: 8 }} />
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24 },
  heading: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 16 },
  sub: { fontSize: 13, color: '#6b7280', marginBottom: 12 },
  item: { marginBottom: 8 },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 24 },
  orText: { textAlign: 'center', color: '#9ca3af', marginVertical: 12 },
  battleId: { fontSize: 18, fontWeight: '700', color: '#6366f1', textAlign: 'center', padding: 16, backgroundColor: '#eef2ff', borderRadius: 8, marginTop: 8 },
});
