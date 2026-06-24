// frontend/app/(tabs)/my-games/[gameId]/edit.tsx
import { useEffect, useState } from 'react';
import { ScrollView, Text, StyleSheet, Alert, Switch, View } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { Input } from '../../../../components/ui/Input';
import { Button } from '../../../../components/ui/Button';
import { ScreenContainer } from '../../../../components/ui/ScreenContainer';
import { LoadingView } from '../../../../components/ui/LoadingView';
import { getGame, updateGame } from '../../../../lib/api';
import type { GameOut } from '../../../../types/api';

export default function EditGame() {
  const { gameId } = useLocalSearchParams<{ gameId: string }>();
  const [game, setGame] = useState<GameOut | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [winHandSize, setWinHandSize] = useState('10');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getGame(gameId).then(g => {
      setGame(g);
      setTitle(g.title);
      setDescription(g.description ?? '');
      setIsPublic(g.is_public);
      setWinHandSize(String(g.win_hand_size));
    }).finally(() => setLoading(false));
  }, [gameId]);

  const save = async () => {
    setSaving(true);
    try {
      await updateGame(gameId, {
        title: title.trim(),
        description: description.trim() || undefined,
        is_public: isPublic,
        win_hand_size: Number(winHandSize) || 10,
      });
      router.back();
    } catch (e: any) {
      Alert.alert('오류', e?.response?.data?.detail ?? '저장 실패');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !game) return <LoadingView />;

  return (
    <>
      <Stack.Screen options={{ title: '게임 수정' }} />
      <ScreenContainer>
        <ScrollView contentContainerStyle={styles.form}>
          <Input label="제목" value={title} onChangeText={setTitle} />
          <Input label="설명" value={description} onChangeText={setDescription} multiline numberOfLines={3} />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>공개</Text>
            <Switch value={isPublic} onValueChange={setIsPublic} trackColor={{ true: '#6366f1' }} />
          </View>
          <Input
            label="승리 조건 (카드 N장 이상)"
            value={winHandSize}
            onChangeText={setWinHandSize}
            keyboardType="numeric"
          />

          <Button title="변경 저장" onPress={save} loading={saving} style={{ marginTop: 16 }} />
        </ScrollView>
      </ScreenContainer>
    </>
  );
}

const styles = StyleSheet.create({
  form: { padding: 20 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  rowLabel: { fontSize: 14, fontWeight: '500', color: '#374151' },
});
