// frontend/components/battle/FeedBanner.tsx
import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { FeedEvent } from '../../hooks/useBattle';

function describeEvent(
  ev: FeedEvent, myActor: number, who: (seat?: number) => string,
): { color: string; title: string; subtitle?: string } {
  const d = ev.data;
  switch (ev.kind) {
    case 'card_drawn':
      return { color: '#93c5fd', title: `${who(d.actor)} 카드 뽑음` };
    case 'action_played':
      return {
        color: '#38bdf8', title: `${who(d.actor)}: ${d.card_name}${d.target_seat != null ? ` → ${who(d.target_seat)}` : ''}`,
        subtitle: d.effect_text || d.effect_summary,
      };
    case 'action_resolved':
      return { color: '#4ade80', title: `${who(d.actor)}: ${d.card_name} 효과 적용`, subtitle: d.effect_text || d.effect_summary };
    case 'trigger_countered':
      return {
        color: '#4ade80', title: `${who(d.countered_by)} 카운터!`,
        subtitle: `${d.counter_card_name} → ${d.original_card_name} 무효화 (${d.source_type === 'trap' ? '함정' : '행동'})${d.counter_effect_text ? `\n${d.counter_effect_text}` : ''}`,
      };
    case 'trap_installed':
      return { color: '#f87171', title: `${who(d.actor)} 함정 설치` };
    case 'trap_revealed':
      return { color: '#f87171', title: `${who(d.owner)}의 함정 발동! ${d.card_name}`, subtitle: d.effect_text || d.effect_summary };
    case 'trap_resolved':
      return { color: '#f87171', title: `${who(d.owner)}의 함정 적용 — ${d.card_name}`, subtitle: `${who(d.activator)}에게 적용: ${d.effect_text || d.effect_summary || ''}` };
    case 'discard_required': {
      const obligations = (d.obligations as { seat: number; count: number }[]) ?? [];
      return {
        color: '#f87171', title: '버릴 카드 선택 필요',
        subtitle: obligations.map(o => `${who(o.seat)} ${o.count}장`).join(', '),
      };
    }
    case 'discard_chosen':
      return { color: '#4ade80', title: `${who(d.seat)} 카드 ${d.count}장 버림` };
    default:
      return { color: '#94a3b8', title: '이벤트' };
  }
}

interface Props {
  event: FeedEvent | null;
  myActor: number;
  turnNumber: number;
  who: (seat?: number) => string;
}

export function FeedBanner({ event, myActor, turnNumber, who }: Props) {
  const insets = useSafeAreaInsets();
  const slideY = useRef(new Animated.Value(-80)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const prevTurnRef = useRef(turnNumber);

  // 새 이벤트 도착 시 슬라이드 인 — 턴이 넘어가기 전까지 유지
  useEffect(() => {
    if (!event) return;
    slideY.setValue(-80);
    opacity.setValue(0);
    Animated.parallel([
      Animated.spring(slideY, { toValue: 0, useNativeDriver: true, bounciness: 6 }),
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [event]);

  // 턴이 바뀌면 슬라이드 아웃
  useEffect(() => {
    if (prevTurnRef.current === turnNumber) return;
    prevTurnRef.current = turnNumber;
    Animated.parallel([
      Animated.timing(slideY, { toValue: -80, duration: 300, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [turnNumber]);

  if (!event) return null;
  const d = describeEvent(event, myActor, who);

  return (
    <Animated.View style={[styles.banner, { top: insets.top + 8, opacity, transform: [{ translateY: slideY }] }]}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: d.color }]}>{d.title}</Text>
        {d.subtitle ? <Text style={styles.subtitle}>{d.subtitle}</Text> : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute', left: 16, right: 16, zIndex: 100,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#1e293b', borderRadius: 12, borderWidth: 1, borderColor: '#334155',
    padding: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 8, elevation: 10,
  },
  title: { fontSize: 14, fontWeight: '800' },
  subtitle: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
});
