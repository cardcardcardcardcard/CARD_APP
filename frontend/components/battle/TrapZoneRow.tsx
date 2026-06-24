// frontend/components/battle/TrapZoneRow.tsx
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { CardOut } from '../../types/api';

interface Props {
  count: number;
  mine: boolean;
  cardIds?: string[];
  cardMap?: Record<string, CardOut>;
  onPressCard?: (id: string) => void;
}

export function TrapZoneRow({ count, mine, cardIds, cardMap, onPressCard }: Props) {
  if (count === 0) return <Text style={styles.empty}>함정 없음</Text>;
  if (!mine) {
    return (
      <View style={styles.row}>
        {Array.from({ length: count }).map((_, i) => (
          <View key={i} style={styles.faceDown}><Text style={styles.faceDownText}>?</Text></View>
        ))}
      </View>
    );
  }
  return (
    <View style={styles.row}>
      {(cardIds ?? []).map(id => (
        <TouchableOpacity key={id} style={styles.mine} onPress={() => onPressCard?.(id)}>
          <Text style={styles.mineText} numberOfLines={1}>{cardMap?.[id]?.name ?? '?'}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { fontSize: 11, color: '#1e293b' },
  row: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  faceDown: { width: 28, height: 38, borderRadius: 4, backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155', justifyContent: 'center', alignItems: 'center' },
  faceDownText: { color: '#475569', fontSize: 14, fontWeight: '700' },
  mine: { backgroundColor: '#2c0e0e', borderWidth: 1, borderColor: '#f87171', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 6, maxWidth: 90 },
  mineText: { color: '#fca5a5', fontSize: 11, fontWeight: '600' },
});
