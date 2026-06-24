// frontend/app/(tabs)/my-games/[gameId]/edit.tsx
import { useEffect, useState } from 'react';
import { ScrollView, Text, StyleSheet, Alert, Switch, View, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Input } from '../../../../components/ui/Input';
import { Button } from '../../../../components/ui/Button';
import { getGame, updateGame } from '../../../../lib/api';
import type { GameOut, Ruleset } from '../../../../types/api';

export default function EditGame() {
  const { gameId } = useLocalSearchParams<{ gameId: string }>();
  const [game, setGame] = useState<GameOut | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [ruleset, setRuleset] = useState<Ruleset | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getGame(gameId).then(g => {
      setGame(g);
      setTitle(g.title);
      setDescription(g.description ?? '');
      setIsPublic(g.is_public);
      setRuleset(g.ruleset);
    }).finally(() => setLoading(false));
  }, [gameId]);

  const setR = <K extends keyof Ruleset>(key: K, val: Ruleset[K]) =>
    setRuleset(r => r ? { ...r, [key]: val } : r);

  const save = async () => {
    if (!ruleset) return;
    setSaving(true);
    try {
      await updateGame(gameId, { title: title.trim(), description: description.trim() || undefined, is_public: isPublic, ruleset });
      router.back();
    } catch (e: any) {
      Alert.alert('오류', e?.response?.data?.detail ?? '저장 실패');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !ruleset) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#6366f1" />;

  return (
    <>
      <Stack.Screen options={{ title: '게임 수정' }} />
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.form}>
          <Input label="제목" value={title} onChangeText={setTitle} />
          <Input label="설명" value={description} onChangeText={setDescription} multiline numberOfLines={3} />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>공개</Text>
            <Switch value={isPublic} onValueChange={setIsPublic} trackColor={{ true: '#6366f1' }} />
          </View>

          <Text style={styles.section}>룰셋</Text>
          <Input label="덱 크기" value={String(ruleset.deck_size)} onChangeText={v => setR('deck_size', Number(v) || 20)} keyboardType="numeric" />
          <Input label="손패 제한" value={String(ruleset.hand_limit)} onChangeText={v => setR('hand_limit', Number(v) || 5)} keyboardType="numeric" />
          <Input label="스왑 주기 (턴)" value={String(ruleset.swap_interval)} onChangeText={v => setR('swap_interval', Number(v) || 3)} keyboardType="numeric" />
          <Input label="초기 자원" value={String(ruleset.initial_resource)} onChangeText={v => setR('initial_resource', Number(v) || 1)} keyboardType="numeric" />
          <Input label="턴당 자원" value={String(ruleset.resource_per_turn)} onChangeText={v => setR('resource_per_turn', Number(v) || 1)} keyboardType="numeric" />

          <Button title="변경 저장" onPress={save} loading={saving} style={{ marginTop: 16 }} />
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
