// frontend/components/battle/DiscardPickerModal.tsx
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { CardOut } from '../../types/api';
import { TYPE_META } from './cardVisuals';

interface Props {
  visible: boolean;
  count: number;
  cards: CardOut[];
  onConfirm: (cardIds: string[]) => void;
}

export function DiscardPickerModal({ visible, count, cards, onConfirm }: Props) {
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    if (visible) setSelected([]);
  }, [visible]);

  const toggle = (id: string) => {
    setSelected(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= count) return prev;
      return [...prev, id];
    });
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>버릴 카드 {count}장을 선택하세요</Text>
          <Text style={styles.subtitle}>{selected.length}/{count} 선택됨</Text>

          <ScrollView style={styles.list} contentContainerStyle={{ gap: 8 }}>
            {cards.map(card => {
              const meta = TYPE_META[card.card_type];
              const isSelected = selected.includes(card.id);
              return (
                <TouchableOpacity
                  key={card.id}
                  style={[styles.row, isSelected && styles.rowSelected, { borderLeftColor: meta.color }]}
                  onPress={() => toggle(card.id)}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardName}>{card.name}</Text>
                    {card.effect_text ? <Text style={styles.cardEffect} numberOfLines={1}>{card.effect_text}</Text> : null}
                  </View>
                  <View style={[styles.checkbox, isSelected && styles.checkboxOn]}>
                    {isSelected ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <TouchableOpacity
            style={[styles.confirmBtn, selected.length !== count && styles.confirmBtnDisabled]}
            onPress={() => onConfirm(selected)}
            disabled={selected.length !== count}
          >
            <Text style={styles.confirmText}>버리기</Text>
          </TouchableOpacity>
        </View>
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
    width: '100%', maxWidth: 380, maxHeight: '70%',
    backgroundColor: '#161e2e', borderRadius: 16,
    borderTopWidth: 4, borderTopColor: '#f87171',
    padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 16,
    elevation: 12,
  },
  title: { fontSize: 16, fontWeight: '800', color: '#e2e8f0', textAlign: 'center' },
  subtitle: { fontSize: 12, color: '#94a3b8', textAlign: 'center', marginTop: 4, marginBottom: 14 },
  list: { maxHeight: 320 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#1e293b', borderRadius: 10, borderLeftWidth: 3,
    paddingVertical: 10, paddingHorizontal: 12,
  },
  rowSelected: { backgroundColor: '#312e1e', borderColor: '#f87171' },
  cardName: { fontSize: 13, fontWeight: '700', color: '#e2e8f0' },
  cardEffect: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: '#475569',
    justifyContent: 'center', alignItems: 'center',
  },
  checkboxOn: { backgroundColor: '#f87171', borderColor: '#f87171' },
  confirmBtn: { marginTop: 16, backgroundColor: '#ef4444', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  confirmBtnDisabled: { opacity: 0.4 },
  confirmText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
