// frontend/app/(tabs)/my-games/[gameId]/cards/[cardId].tsx
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { Input } from '../../../../../components/ui/Input';
import { Button } from '../../../../../components/ui/Button';
import { CardTypeFields, DEFAULT_CARD_FORM, CardFormState } from '../../../../../components/CardTypeFields';
import { ScreenContainer } from '../../../../../components/ui/ScreenContainer';
import { LoadingView } from '../../../../../components/ui/LoadingView';
import { listCards, updateCard } from '../../../../../lib/api';

export default function EditCard() {
  const { gameId, cardId } = useLocalSearchParams<{ gameId: string; cardId: string }>();
  const [name, setName] = useState('');
  const [form, setForm] = useState<CardFormState>(DEFAULT_CARD_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const patch = (p: Partial<CardFormState>) => setForm(f => ({ ...f, ...p }));

  useEffect(() => {
    listCards(gameId).then(cards => {
      const card = cards.find(c => c.id === cardId);
      if (card) {
        setName(card.name);
        setForm({
          card_type: card.card_type,
          has_minigame: card.has_minigame,
          trigger_condition: card.trigger_condition ?? '',
          counter_condition: card.counter_condition ?? '',
          counters_action: card.counters_action,
          counters_trap: card.counters_trap,
          effect_text: card.effect_text ?? '',
          effect_type: card.effect_type,
          effect_value: card.effect_value,
          effect_target: card.effect_target,
        });
      }
    }).finally(() => setLoading(false));
  }, [gameId, cardId]);

  const save = async () => {
    setError('');
    if (!name.trim()) { setError('이름을 입력해주세요'); return; }
    setSaving(true);
    try {
      await updateCard(gameId, cardId, {
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
      setError(e?.response?.data?.detail ?? '저장 실패');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingView />;

  return (
    <>
      <Stack.Screen options={{ title: '카드 수정' }} />
      <ScreenContainer>
        <ScrollView contentContainerStyle={styles.form}>
          <Input label="카드 이름" value={name} onChangeText={setName} />
          <CardTypeFields value={form} onChange={patch} />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <Button title="카드 저장" onPress={save} loading={saving} style={{ marginTop: 20 }} />
        </ScrollView>
      </ScreenContainer>
    </>
  );
}

const styles = StyleSheet.create({
  form: { padding: 20 },
  errorText: { color: '#ef4444', fontSize: 13, marginTop: 16, textAlign: 'center' },
});
