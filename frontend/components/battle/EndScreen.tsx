// frontend/components/battle/EndScreen.tsx
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../ui/Button';

export type EndOutcome = 'won' | 'lost' | 'forfeited_self' | 'forfeited_won' | 'forfeited_no_winner';

interface Props {
  outcome: EndOutcome;
  winnerName?: string;
  forfeiterName?: string;
  handThreshold: number;
  onReturn: () => void;
}

const META: Record<EndOutcome, { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string; headline: string }> = {
  won: { icon: 'trophy', color: '#fbbf24', bg: '#3a2e0a', headline: '승리!' },
  lost: { icon: 'shield-half', color: '#94a3b8', bg: '#1e293b', headline: '패배' },
  forfeited_self: { icon: 'flag', color: '#94a3b8', bg: '#1e293b', headline: '기권' },
  forfeited_won: { icon: 'trophy', color: '#fbbf24', bg: '#3a2e0a', headline: '승리!' },
  forfeited_no_winner: { icon: 'flag', color: '#94a3b8', bg: '#1e293b', headline: '게임 종료' },
};

function describeSubtext(outcome: EndOutcome, winnerName: string | undefined, forfeiterName: string | undefined, threshold: number): string {
  switch (outcome) {
    case 'won':
      return `손패 ${threshold}장을 모았습니다`;
    case 'lost':
      return `${winnerName ?? '상대'}님이 손패 ${threshold}장을 모아 승리했습니다`;
    case 'forfeited_self':
      return '게임을 포기했습니다';
    case 'forfeited_won':
      return `${forfeiterName ?? '상대'}님이 기권했습니다`;
    case 'forfeited_no_winner':
      return `${forfeiterName ?? '한 플레이어'}님이 기권하여 게임이 종료되었습니다`;
  }
}

export function EndScreen({ outcome, winnerName, forfeiterName, handThreshold, onReturn }: Props) {
  const meta = META[outcome];
  const subtext = describeSubtext(outcome, winnerName, forfeiterName, handThreshold);

  return (
    <View style={styles.container}>
      <View style={[styles.badge, { backgroundColor: meta.bg, borderColor: meta.color }]}>
        <Ionicons name={meta.icon} size={56} color={meta.color} />
      </View>
      <Text style={[styles.headline, { color: meta.color }]}>{meta.headline}</Text>
      <Text style={styles.subtext}>{subtext}</Text>
      <Button title="로비로 돌아가기" onPress={onReturn} style={styles.button} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  badge: {
    width: 120, height: 120, borderRadius: 60, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center', marginBottom: 24,
  },
  headline: { fontSize: 32, fontWeight: '800', textAlign: 'center', marginBottom: 10 },
  subtext: { fontSize: 14, color: '#94a3b8', textAlign: 'center', marginBottom: 36, lineHeight: 20, paddingHorizontal: 16 },
  button: { width: '100%', maxWidth: 320 },
});
