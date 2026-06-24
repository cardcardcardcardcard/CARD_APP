// frontend/components/battle/cardVisuals.ts
import { Ionicons } from '@expo/vector-icons';
import type { CardOut, CardType } from '../../types/api';

export const TYPE_META: Record<CardType, { color: string; bg: string; icon: keyof typeof Ionicons.glyphMap; label: string }> = {
  action: { color: '#38bdf8', bg: '#0c2436', icon: 'flash', label: '행동' },
  counter: { color: '#4ade80', bg: '#0a2818', icon: 'shield-checkmark', label: '카운터' },
  trap: { color: '#f87171', bg: '#2c0e0e', icon: 'alert-circle', label: '함정' },
};

export function needsTarget(card: CardOut): boolean {
  if (card.effect_target === 'all') return false;
  return card.effect_target === 'opponent' || card.effect_type === 'steal' || card.effect_type === 'give';
}
