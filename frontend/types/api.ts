// frontend/types/api.ts

export interface UserOut {
  id: string;
  username: string;
  email: string;
  created_at: string;
}

export interface TokenOut {
  access_token: string;
  token_type: string;
}

export interface GameOut {
  id: string;
  creator_id: string;
  title: string;
  description: string | null;
  is_public: boolean;
  invite_code: string | null;
  win_hand_size: number;
  created_at: string;
}

export type CardType = 'action' | 'counter' | 'trap';
export type EffectType = 'draw' | 'discard' | 'steal' | 'give' | 'none';
export type EffectTarget = 'self' | 'opponent' | 'all' | 'activator';

export interface CardOut {
  id: string;
  game_id: string;
  name: string;
  image_url: string | null;
  card_type: CardType;
  has_minigame: boolean;
  trigger_condition: string | null;
  counter_condition: string | null;
  counters_action: boolean;
  counters_trap: boolean;
  effect_text: string | null;
  effect_type: EffectType;
  effect_value: number;
  effect_target: EffectTarget;
  created_at: string;
}

export interface BattlePlayerOut {
  user_id: string;
  username: string;
  seat_index: number;
}

export interface BattleOut {
  id: string;
  game_id: string;
  status: 'waiting' | 'playing' | 'done';
  winner_id: string | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  players: BattlePlayerOut[];
}

export type TriggerSourceType = 'action' | 'trap';

export interface PendingTrigger {
  source_type: TriggerSourceType;
  actor: number;
  card_id: string;
  has_minigame: boolean;
  activator: number | null;
  target_seat: number | null;
}

export interface PendingDiscard {
  seat: number;
  count: number;
}

export interface BattleState {
  battle_id: string;
  num_players: number;
  shared_deck: (string | null)[];
  discard_pile: string[];
  hands: (string | null)[][];
  trap_zones: (string | null)[][];
  play_direction: 'cw' | 'ccw';
  active_seat: number;
  turn_number: number;
  has_acted_this_turn: boolean;
  trap_installed_this_turn: boolean;
  pending_trigger: PendingTrigger | null;
  pending_discards: PendingDiscard[];
  win_hand_size: number;
}

export interface WsMessage {
  type:
    | 'state'
    | 'card_drawn'
    | 'action_played'
    | 'action_resolved'
    | 'trap_installed'
    | 'trap_revealed'
    | 'trap_resolved'
    | 'trigger_countered'
    | 'game_over'
    | 'error';
  data?: Record<string, unknown>;
  detail?: string;
}
