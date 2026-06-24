// frontend/components/battle/HandProgress.tsx
import { View, Text, StyleSheet, Animated } from 'react-native';

interface Props {
  count: number;
  target: number;
}

export function HandProgress({ count, target }: Props) {
  const pct = Math.min(100, (count / target) * 100);
  const danger = count >= target - 2;
  return (
    <View style={styles.row}>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, { width: `${pct}%` as any, backgroundColor: danger ? '#f87171' : '#6366f1' }]} />
      </View>
      <Text style={styles.num}>{count}/{target}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  track: { flex: 1, height: 8, backgroundColor: '#1e293b', borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  num: { fontSize: 13, fontWeight: '700', color: '#e2e8f0', minWidth: 40, textAlign: 'right' },
});
