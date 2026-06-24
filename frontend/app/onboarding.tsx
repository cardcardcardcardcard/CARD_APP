import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STEPS = [
  {
    icon: 'game-controller-outline' as const,
    title: '카드카드에 오신 걸 환영합니다',
    desc: '나만의 카드 게임을 만들거나\n다른 사람의 게임에 참여하세요.',
  },
  {
    icon: 'layers-outline' as const,
    title: '덱을 먼저 만드세요',
    desc: '"내 덱" 탭에서 게임별 덱을 만드세요.\n배틀 참가 시 덱이 필요합니다.',
  },
  {
    icon: 'flash-outline' as const,
    title: '배틀 시작',
    desc: '"배틀" 탭에서 방을 만들거나\nID로 친구 방에 참가하세요.',
  },
];

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const current = STEPS[step];

  const finish = async () => {
    await AsyncStorage.setItem('onboarded', 'true');
    router.replace('/(tabs)/explore');
  };

  const next = () => {
    if (step < STEPS.length - 1) setStep(s => s + 1);
    else finish();
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Ionicons name={current.icon} size={80} color="#6366f1" />
      </View>
      <Text style={styles.title}>{current.title}</Text>
      <Text style={styles.desc}>{current.desc}</Text>

      <View style={styles.dots}>
        {STEPS.map((_, i) => (
          <View key={i} style={[styles.dot, i === step && styles.dotActive]} />
        ))}
      </View>

      <TouchableOpacity style={styles.btn} onPress={next}>
        <Text style={styles.btnText}>
          {step < STEPS.length - 1 ? '다음' : '시작하기'}
        </Text>
      </TouchableOpacity>

      {step < STEPS.length - 1 && (
        <TouchableOpacity onPress={finish} style={styles.skip}>
          <Text style={styles.skipText}>건너뛰기</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const { height } = Dimensions.get('window');
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 32 },
  iconWrap: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#eef2ff', alignItems: 'center', justifyContent: 'center', marginBottom: 32 },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', textAlign: 'center', marginBottom: 16 },
  desc: { fontSize: 15, color: '#6b7280', textAlign: 'center', lineHeight: 24, marginBottom: 40 },
  dots: { flexDirection: 'row', gap: 8, marginBottom: 40 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#e5e7eb' },
  dotActive: { backgroundColor: '#6366f1', width: 24 },
  btn: { backgroundColor: '#6366f1', paddingVertical: 14, paddingHorizontal: 48, borderRadius: 12, marginBottom: 16 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  skip: { padding: 8 },
  skipText: { color: '#9ca3af', fontSize: 14 },
});
