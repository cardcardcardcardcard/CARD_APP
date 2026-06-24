// frontend/components/BlockBuilder.tsx
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { CardEffect, EffectCondition, EffectAction } from '../types/api';

const TRIGGERS = ['on_attack', 'on_defend', 'on_play', 'on_turn_start', 'on_turn_end', 'on_swap'];
const STATS = ['self.hp', 'self.resources', 'opponent.hp', 'opponent.resources'];
const OPS = ['<', '>', '<=', '>=', '==', '!='];
const ACTION_TYPES = ['deal_damage', 'heal', 'buff_stat', 'debuff_stat', 'draw_card', 'discard_card', 'skip_turn'];
const TARGETS = ['opponent', 'self'];

interface Props {
  effects: CardEffect[];
  onChange: (effects: CardEffect[]) => void;
}

function Picker({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerRow}>
      {options.map(o => (
        <TouchableOpacity
          key={o}
          style={[styles.chip, value === o && styles.chipActive]}
          onPress={() => onChange(o)}
        >
          <Text style={[styles.chipText, value === o && styles.chipTextActive]}>{o}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

function NumberInput({ value, onChange, label }: { value: number; onChange: (n: number) => void; label: string }) {
  return (
    <View style={styles.numRow}>
      <Text style={styles.numLabel}>{label}</Text>
      <TextInput
        style={styles.numInput}
        value={String(value)}
        onChangeText={t => onChange(Number(t) || 0)}
        keyboardType="numeric"
      />
    </View>
  );
}

export function BlockBuilder({ effects, onChange }: Props) {
  const addEffect = () =>
    onChange([...effects, { trigger: 'on_attack', conditions: [], actions: [] }]);

  const removeEffect = (i: number) =>
    onChange(effects.filter((_, j) => j !== i));

  const updateEffect = (i: number, patch: Partial<CardEffect>) =>
    onChange(effects.map((e, j) => j === i ? { ...e, ...patch } : e));

  const addCondition = (i: number) =>
    updateEffect(i, { conditions: [...effects[i].conditions, { stat: 'self.hp', op: '<', value: 30 }] });

  const updateCondition = (ei: number, ci: number, patch: Partial<EffectCondition>) =>
    updateEffect(ei, { conditions: effects[ei].conditions.map((c, j) => j === ci ? { ...c, ...patch } : c) });

  const removeCondition = (ei: number, ci: number) =>
    updateEffect(ei, { conditions: effects[ei].conditions.filter((_, j) => j !== ci) });

  const addAction = (i: number) =>
    updateEffect(i, { actions: [...effects[i].actions, { type: 'deal_damage', target: 'opponent', value: 10 }] });

  const updateAction = (ei: number, ai: number, patch: Partial<EffectAction>) =>
    updateEffect(ei, { actions: effects[ei].actions.map((a, j) => j === ai ? { ...a, ...patch } : a) });

  const removeAction = (ei: number, ai: number) =>
    updateEffect(ei, { actions: effects[ei].actions.filter((_, j) => j !== ai) });

  return (
    <View>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>효과 ({effects.length})</Text>
        <TouchableOpacity onPress={addEffect} style={styles.addBtn}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.addBtnText}>효과 추가</Text>
        </TouchableOpacity>
      </View>

      {effects.map((effect, ei) => (
        <View key={ei} style={styles.effectCard}>
          <View style={styles.effectHeader}>
            <Text style={styles.effectTitle}>효과 {ei + 1}</Text>
            <TouchableOpacity onPress={() => removeEffect(ei)}>
              <Ionicons name="trash-outline" size={18} color="#ef4444" />
            </TouchableOpacity>
          </View>

          <Text style={styles.subLabel}>발동 조건</Text>
          <Picker value={effect.trigger} options={TRIGGERS} onChange={v => updateEffect(ei, { trigger: v })} />

          <Text style={styles.subLabel}>조건</Text>
          {effect.conditions.map((cond, ci) => (
            <View key={ci} style={styles.block}>
              <Picker value={cond.stat} options={STATS} onChange={v => updateCondition(ei, ci, { stat: v })} />
              <Picker value={cond.op} options={OPS} onChange={v => updateCondition(ei, ci, { op: v })} />
              <NumberInput value={cond.value} onChange={v => updateCondition(ei, ci, { value: v })} label="값" />
              <TouchableOpacity onPress={() => removeCondition(ei, ci)} style={styles.removeRow}>
                <Text style={styles.removeText}>조건 삭제</Text>
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity onPress={() => addCondition(ei)} style={styles.addRowBtn}>
            <Text style={styles.addRowText}>+ 조건 추가</Text>
          </TouchableOpacity>

          <Text style={styles.subLabel}>행동</Text>
          {effect.actions.map((action, ai) => (
            <View key={ai} style={styles.block}>
              <Picker value={action.type} options={ACTION_TYPES} onChange={v => updateAction(ei, ai, { type: v })} />
              {['deal_damage', 'heal', 'buff_stat', 'debuff_stat', 'draw_card', 'discard_card'].includes(action.type) && (
                <NumberInput value={action.value ?? 0} onChange={v => updateAction(ei, ai, { value: v })} label="수량" />
              )}
              {['deal_damage', 'heal', 'buff_stat', 'debuff_stat'].includes(action.type) && (
                <Picker value={action.target ?? 'opponent'} options={TARGETS} onChange={v => updateAction(ei, ai, { target: v })} />
              )}
              <TouchableOpacity onPress={() => removeAction(ei, ai)} style={styles.removeRow}>
                <Text style={styles.removeText}>행동 삭제</Text>
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity onPress={() => addAction(ei)} style={styles.addRowBtn}>
            <Text style={styles.addRowText}>+ 행동 추가</Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: '#374151' },
  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#6366f1', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, gap: 4 },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  effectCard: { backgroundColor: '#f9fafb', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', padding: 12, marginBottom: 12 },
  effectHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  effectTitle: { fontSize: 14, fontWeight: '600', color: '#111827' },
  subLabel: { fontSize: 12, fontWeight: '500', color: '#6b7280', marginTop: 8, marginBottom: 4 },
  pickerRow: { flexDirection: 'row', marginBottom: 4 },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, backgroundColor: '#e5e7eb', marginRight: 6 },
  chipActive: { backgroundColor: '#6366f1' },
  chipText: { fontSize: 12, color: '#374151' },
  chipTextActive: { color: '#fff' },
  block: { backgroundColor: '#fff', borderRadius: 6, borderWidth: 1, borderColor: '#e5e7eb', padding: 8, marginBottom: 6 },
  numRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  numLabel: { fontSize: 12, color: '#6b7280', marginRight: 8, width: 60 },
  numInput: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, width: 70, fontSize: 14, color: '#111827' },
  removeRow: { marginTop: 4 },
  removeText: { fontSize: 11, color: '#ef4444' },
  addRowBtn: { paddingVertical: 6 },
  addRowText: { fontSize: 12, color: '#6366f1' },
});
