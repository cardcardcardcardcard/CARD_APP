// frontend/app/(tabs)/my-games/create.tsx
import { useState } from 'react';
import { ScrollView, Text, StyleSheet, Alert, Switch, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { createGame } from '../../../lib/api';
import type { Ruleset } from '../../../types/api';

const DEFAULT_RULESET: Ruleset = {
  deck_size: 20,
  hand_limit: 5,
  swap_interval: 3,
  win_condition: 'hp_zero',
  turn_phases: ['draw', 'main', 'battle', 'end'],
  resource_system: 'mana',
  initial_resource: 1,
  resource_per_turn: 1,
};

export default function CreateGame() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [ruleset, setRuleset] = useState<Ruleset>(DEFAULT_RULESET);
  const [loading, setLoading] = useState(false);

  const setR = <K extends keyof Ruleset>(key: K, val: Ruleset[K]) =>
    setRuleset(r => ({ ...r, [key]: val }));

  const submit = async () => {
    if (!title.trim()) { Alert.alert('Error', 'Title required'); return; }
    setLoading(true);
    try {
      const game = await createGame({ title: title.trim(), description: description.trim() || undefined, is_public: isPublic, ruleset });
      router.replace(`/(tabs)/my-games/${game.id}`);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail ?? 'Failed to create game');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'New Game' }} />
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.form}>
          <Input label="Title" value={title} onChangeText={setTitle} placeholder="My awesome card game" />
          <Input label="Description (optional)" value={description} onChangeText={setDescription} multiline numberOfLines={3} />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Public</Text>
            <Switch value={isPublic} onValueChange={setIsPublic} trackColor={{ true: '#6366f1' }} />
          </View>

          <Text style={styles.section}>Ruleset</Text>
          <Input label="Deck size" value={String(ruleset.deck_size)} onChangeText={v => setR('deck_size', Number(v) || 20)} keyboardType="numeric" />
          <Input label="Hand limit" value={String(ruleset.hand_limit)} onChangeText={v => setR('hand_limit', Number(v) || 5)} keyboardType="numeric" />
          <Input label="Swap interval (turns)" value={String(ruleset.swap_interval)} onChangeText={v => setR('swap_interval', Number(v) || 3)} keyboardType="numeric" />
          <Input label="Initial resource" value={String(ruleset.initial_resource)} onChangeText={v => setR('initial_resource', Number(v) || 1)} keyboardType="numeric" />
          <Input label="Resource per turn" value={String(ruleset.resource_per_turn)} onChangeText={v => setR('resource_per_turn', Number(v) || 1)} keyboardType="numeric" />

          <Button title="Create Game" onPress={submit} loading={loading} style={{ marginTop: 16 }} />
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  form: { padding: 20 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  rowLabel: { fontSize: 14, fontWeight: '500', color: '#374151' },
  section: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 12, marginTop: 8 },
});
