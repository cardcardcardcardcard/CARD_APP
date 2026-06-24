// frontend/app/(tabs)/my-games/create.tsx
import { useState } from 'react';
import { ScrollView, Text, StyleSheet, Alert, Switch, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { ScreenContainer } from '../../../components/ui/ScreenContainer';
import { createGame } from '../../../lib/api';

export default function CreateGame() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [winHandSize, setWinHandSize] = useState('10');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!title.trim()) { Alert.alert('오류', '제목을 입력해주세요'); return; }
    setLoading(true);
    try {
      const game = await createGame({
        title: title.trim(),
        description: description.trim() || undefined,
        is_public: isPublic,
        win_hand_size: Number(winHandSize) || 10,
      });
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
          <Input
            label="승리 조건 (카드 N장 이상)"
            value={winHandSize}
            onChangeText={setWinHandSize}
            keyboardType="numeric"
          />

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
});
