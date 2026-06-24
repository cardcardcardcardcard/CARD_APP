// frontend/app/(tabs)/my-games/[gameId]/cards/create.tsx
import { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { Input } from '../../../../../components/ui/Input';
import { Button } from '../../../../../components/ui/Button';
import { CardTypeFields, DEFAULT_CARD_FORM, CardFormState } from '../../../../../components/CardTypeFields';
import { ScreenContainer } from '../../../../../components/ui/ScreenContainer';
import { createCard } from '../../../../../lib/api';

export default function CreateCard() {
  const { gameId } = useLocalSearchParams<{ gameId: string }>();
  const [name, setName] = useState('');
  const [form, setForm] = useState<CardFormState>(DEFAULT_CARD_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const patch = (p: Partial<CardFormState>) => setForm(f => ({ ...f, ...p }));

  const submit = async () => {
    setError('');
    if (!name.trim()) { setError('카드 이름을 입력해주세요'); return; }
    setLoading(true);
    try {
      await createCard(gameId, {
        name: name.trim(),
        card_type: form.card_type,
        has_minigame: form.has_minigame,
        trigger_condition: form.trigger_condition || null,
        counter_condition: form.counter_condition || null,
        counters_action: form.counters_action,
        counters_trap: form.counters_trap,
        effect_text: form.effect_text || null,
        effect_type: form.effect_type,
        effect_value: form.effect_value,
        effect_target: form.effect_target,
      });
      router.back();
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? '카드 생성 실패');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: '새 카드' }} />
      <ScreenContainer>
        <ScrollView contentContainerStyle={styles.form}>
          <Input label="카드 이름" value={name} onChangeText={setName} placeholder="번개 화살" />
          <CardTypeFields value={form} onChange={patch} />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <Button title="카드 생성" onPress={submit} loading={loading} style={{ marginTop: 20 }} />
        </ScrollView>
      </ScreenContainer>
    </>
  );
}

const styles = StyleSheet.create({
  form: { padding: 20 },
  errorText: { color: '#ef4444', fontSize: 13, marginTop: 16, textAlign: 'center' },
});
