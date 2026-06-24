// frontend/components/battle/SeatPickerModal.tsx
import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Modal, Pressable } from 'react-native';

export interface SeatOption {
  seat: number;
  label: string;
  isMe?: boolean;
}

interface Props {
  visible: boolean;
  title: string;
  cardName?: string;
  cardEffectText?: string | null;
  cardColor?: string;
  seats: SeatOption[];
  onSelect: (seat: number) => void;
  onCancel: () => void;
}

export function SeatPickerModal({
  visible, title, cardName, cardEffectText, cardColor, seats, onSelect, onCancel,
}: Props) {
  const scale = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    scale.setValue(0.9);
    opacity.setValue(0);
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, bounciness: 8, speed: 18 }),
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Animated.View style={{ opacity, transform: [{ scale }], width: '100%', alignItems: 'center' }}>
          <Pressable style={[styles.card, cardColor ? { borderTopColor: cardColor } : null]} onPress={() => {}}>
            {cardName ? (
              <View style={styles.cardHeader}>
                <Text style={[styles.cardName, cardColor ? { color: cardColor } : null]}>{cardName}</Text>
                {cardEffectText ? <Text style={styles.cardEffect}>{cardEffectText}</Text> : null}
              </View>
            ) : null}

            <Text style={styles.title}>{title}</Text>

            <View style={styles.seatGrid}>
              {seats.map(s => (
                <TouchableOpacity
                  key={s.seat}
                  style={[styles.seatChip, s.isMe && styles.seatChipMe]}
                  onPress={() => onSelect(s.seat)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.avatar, s.isMe && styles.avatarMe]}>
                    <Text style={styles.avatarText}>{s.label.charAt(0).toUpperCase()}</Text>
                  </View>
                  <Text style={styles.seatLabel} numberOfLines={1}>{s.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity onPress={onCancel} style={styles.cancelBtn} activeOpacity={0.6}>
              <Text style={styles.cancelText}>취소</Text>
            </TouchableOpacity>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  card: {
    width: '100%', maxWidth: 380,
    backgroundColor: '#161e2e', borderRadius: 16,
    borderTopWidth: 4, borderTopColor: '#334155',
    padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 16,
    elevation: 12,
  },
  cardHeader: { alignItems: 'center', marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  cardName: { fontSize: 18, fontWeight: '800', color: '#e2e8f0', textAlign: 'center' },
  cardEffect: { fontSize: 13, color: '#94a3b8', textAlign: 'center', marginTop: 6, lineHeight: 18 },
  title: { fontSize: 13, fontWeight: '600', color: '#cbd5e1', textAlign: 'center', marginBottom: 16 },
  seatGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  seatChip: { alignItems: 'center', width: 76, paddingVertical: 10, borderRadius: 12, backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155' },
  seatChipMe: { backgroundColor: '#1e1b4b', borderColor: '#6366f1' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#334155', justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  avatarMe: { backgroundColor: '#6366f1' },
  avatarText: { color: '#e2e8f0', fontSize: 16, fontWeight: '800' },
  seatLabel: { fontSize: 12, color: '#cbd5e1', fontWeight: '600', maxWidth: 70 },
  cancelBtn: { marginTop: 20, alignItems: 'center', paddingVertical: 8 },
  cancelText: { color: '#64748b', fontSize: 13, fontWeight: '600' },
});
