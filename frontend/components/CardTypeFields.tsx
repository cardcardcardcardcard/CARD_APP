// frontend/components/CardTypeFields.tsx
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Switch } from 'react-native';
import type { CardType, EffectType, EffectTarget } from '../types/api';

export interface CardFormState {
  card_type: CardType;
  has_minigame: boolean;
  trigger_condition: string;
  counter_condition: string;
  counters_action: boolean;
  counters_trap: boolean;
  effect_text: string;
  effect_type: EffectType;
  effect_value: number;
  effect_target: EffectTarget;
}

export const DEFAULT_CARD_FORM: CardFormState = {
  card_type: 'action',
  has_minigame: false,
  trigger_condition: '',
  counter_condition: '',
  counters_action: false,
  counters_trap: false,
  effect_text: '',
  effect_type: 'none',
  effect_value: 0,
  effect_target: 'self',
};

const CARD_TYPE_META: Record<CardType, { label: string; color: string; bg: string }> = {
  action: { label: '행동', color: '#0284c7', bg: '#e0f2fe' },
  counter: { label: '카운터', color: '#16a34a', bg: '#dcfce7' },
  trap: { label: '함정', color: '#dc2626', bg: '#fee2e2' },
};

const EFFECT_TYPE_LABEL: Record<EffectType, string> = {
  none: '없음',
  draw: '드로우',
  discard: '버리기',
  steal: '빼앗기',
  give: '주기',
};

const EFFECT_TARGET_LABEL: Record<EffectTarget, string> = {
  self: '자신',
  opponent: '상대',
  all: '모두',
  activator: '발동자',
};

interface Props {
  value: CardFormState;
  onChange: (patch: Partial<CardFormState>) => void;
}

export function CardTypeFields({ value, onChange }: Props) {
  const selectType = (t: CardType) => {
    if (t === 'trap') onChange({ card_type: t, effect_target: 'activator' });
    else if (t === 'counter') onChange({ card_type: t, effect_target: 'self' });
    else onChange({ card_type: t, effect_target: 'self' });
  };

  return (
    <View>
      <Text style={styles.label}>카드 종류</Text>
      <View style={styles.row}>
        {(Object.keys(CARD_TYPE_META) as CardType[]).map(t => {
          const meta = CARD_TYPE_META[t];
          const active = value.card_type === t;
          return (
            <TouchableOpacity
              key={t}
              style={[styles.typeChip, { backgroundColor: active ? meta.color : meta.bg }]}
              onPress={() => selectType(t)}
            >
              <Text style={[styles.typeChipText, { color: active ? '#fff' : meta.color }]}>{meta.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {value.card_type === 'action' && (
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>미니게임 포함 (카운터로 막을 수 없음)</Text>
          <Switch value={value.has_minigame} onValueChange={v => onChange({ has_minigame: v })} />
        </View>
      )}

      {value.card_type === 'trap' && (
        <>
          <Text style={styles.label}>발동 조건</Text>
          <TextInput
            style={styles.input}
            value={value.trigger_condition}
            onChangeText={t => onChange({ trigger_condition: t })}
            placeholder="예: 뭐라고? 라고 말한 사람이"
          />
          <Text style={styles.hint}>효과는 게임 중 지목한 발동자에게 적용됩니다.</Text>
        </>
      )}

      {value.card_type === 'counter' && (
        <>
          <Text style={styles.label}>사용 조건</Text>
          <TextInput
            style={styles.input}
            value={value.counter_condition}
            onChangeText={t => onChange({ counter_condition: t })}
            placeholder="예: 상대가 행동 카드를 사용했을 때"
          />
          <Text style={styles.hint}>효과는 사용한 자신에게 적용됩니다.</Text>

          <Text style={styles.label}>이 카드로 막을 수 있는 것</Text>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>행동 카드</Text>
            <Switch value={value.counters_action} onValueChange={v => onChange({ counters_action: v })} />
          </View>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>함정 카드</Text>
            <Switch value={value.counters_trap} onValueChange={v => onChange({ counters_trap: v })} />
          </View>
        </>
      )}

      <Text style={styles.label}>효과 설명</Text>
      <TextInput
        style={styles.input}
        value={value.effect_text}
        onChangeText={t => onChange({ effect_text: t })}
        placeholder="예: 카드 2장을 뽑습니다"
      />

      <Text style={styles.label}>손패 효과</Text>
      <View style={styles.row}>
        {(Object.keys(EFFECT_TYPE_LABEL) as EffectType[]).map(et => (
          <TouchableOpacity
            key={et}
            style={[styles.chip, value.effect_type === et && styles.chipActive]}
            onPress={() => onChange({ effect_type: et })}
          >
            <Text style={[styles.chipText, value.effect_type === et && styles.chipTextActive]}>{EFFECT_TYPE_LABEL[et]}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {value.effect_type !== 'none' && (
        <View style={styles.numRow}>
          <Text style={styles.numLabel}>수량</Text>
          <TextInput
            style={styles.numInput}
            value={String(value.effect_value)}
            onChangeText={t => onChange({ effect_value: Number(t) || 0 })}
            keyboardType="numeric"
          />
        </View>
      )}

      {value.effect_type !== 'none' && value.card_type === 'action' && (
        <>
          <Text style={styles.label}>대상</Text>
          <View style={styles.row}>
            {(['self', 'opponent', 'all'] as EffectTarget[]).map(opt => (
              <TouchableOpacity
                key={opt}
                style={[styles.chip, value.effect_target === opt && styles.chipActive]}
                onPress={() => onChange({ effect_target: opt })}
              >
                <Text style={[styles.chipText, value.effect_target === opt && styles.chipTextActive]}>{EFFECT_TARGET_LABEL[opt]}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginTop: 16, marginBottom: 6 },
  hint: { fontSize: 11, color: '#9ca3af', marginTop: 4 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  typeChipText: { fontSize: 13, fontWeight: '700' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14 },
  switchLabel: { fontSize: 13, color: '#374151', flex: 1, marginRight: 8 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#111827' },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, backgroundColor: '#e5e7eb' },
  chipActive: { backgroundColor: '#6366f1' },
  chipText: { fontSize: 12, color: '#374151' },
  chipTextActive: { color: '#fff' },
  numRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 10 },
  numLabel: { fontSize: 13, color: '#6b7280' },
  numInput: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6, width: 70, fontSize: 14, color: '#111827' },
});
