// frontend/components/battle/HandCard.tsx
import { useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { CardOut } from '../../types/api';
import { TYPE_META } from './cardVisuals';

interface Props {
  card: CardOut;
  usable: boolean;
  highlight: boolean;
  onPress: () => void;
}

export function HandCard({ card, usable, highlight, onPress }: Props) {
  const flip = useRef(new Animated.Value(0)).current;
  const meta = TYPE_META[card.card_type];

  const handlePress = useCallback(() => {
    if (!usable) return;
    Animated.sequence([
      Animated.timing(flip, { toValue: 1, duration: 160, useNativeDriver: true }),
      Animated.timing(flip, { toValue: 0, duration: 0, useNativeDriver: true }),
    ]).start(onPress);
  }, [usable, onPress]);

  const rotateY = flip.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['0deg', '90deg', '0deg'] });

  return (
    <TouchableOpacity onPress={handlePress} disabled={!usable} activeOpacity={0.85}>
      <Animated.View style={[
        styles.card,
        { backgroundColor: meta.bg, borderColor: meta.color },
        highlight && styles.highlight,
        !usable && styles.disabled,
        { transform: [{ perspective: 800 }, { rotateY }] },
      ]}>
        <View style={styles.topRow}>
          <Ionicons name={meta.icon} size={16} color={meta.color} />
          {card.has_minigame ? <Text style={styles.minigameIcon}>🎮</Text> : null}
        </View>
        <Text style={styles.name} numberOfLines={2}>{card.name}</Text>
        <Text style={[styles.typeLabel, { color: meta.color }]}>
          {meta.label}
          {card.card_type === 'counter' ? ` · ${[card.counters_action && '행동', card.counters_trap && '함정'].filter(Boolean).join('/') || '미설정'}` : ''}
        </Text>
        {card.effect_text ? <Text style={styles.effect}>{card.effect_text}</Text> : null}
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 150,
    height: 190,
    borderRadius: 10,
    borderWidth: 1.5,
    padding: 10,
    gap: 6,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  highlight: { borderWidth: 2.5, shadowOpacity: 0.8, shadowColor: '#4ade80' },
  disabled: { opacity: 0.35 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  minigameIcon: { fontSize: 12 },
  name: { fontSize: 12, fontWeight: '700', color: '#e2e8f0', lineHeight: 15 },
  typeLabel: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  effect: { fontSize: 9, color: '#94a3b8', lineHeight: 12 },
});
