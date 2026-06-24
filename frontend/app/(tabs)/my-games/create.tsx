// frontend/app/(tabs)/my-games/create.tsx
import { useState } from 'react';
import { ScrollView, Text, StyleSheet, Alert, Switch, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { ScreenContainer } from '../../../components/ui/ScreenContainer';
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
    if (!title.trim()) { Alert.alert('오류', '제목을 입력해주세요'); return; }
    setLoading(true);
    try {
      const game = await createGame({ title: title.trim(), description: description.trim() || undefined, is_public: isPublic, ruleset });
      router.replace(`/(tabs)/my-games/${game.id}`);
    } catch (e: any) {
      Alert.alert('오류', e?.response?.data?.detail ?? '게임 생성 실패');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: '새 게임' }} />
      <ScreenContainer>
        <ScrollView contentContainerStyle={styles.form}>
          <Input label="제목" value={title} onChangeText={setTitle} placeholder="나만의 카드 게임" />
          <Input label="설명 (선택)" value={description} onChangeText={setDescription} multiline numberOfLines={3} />
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

          <Button title="게임 생성" onPress={submit} loading={loading} style={{ marginTop: 16 }} />
        </ScrollView>
      </ScreenContainer>
    </>
  );
}

const styles = StyleSheet.create({
  form: { padding: 20 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  rowLabel: { fontSize: 14, fontWeight: '500', color: '#374151' },
  section: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 12, marginTop: 8 },
});
