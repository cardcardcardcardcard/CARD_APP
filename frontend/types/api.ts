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

export interface Ruleset {
  deck_size: number;
  hand_limit: number;
  swap_interval: number;
  win_condition: string;
  turn_phases: string[];
  resource_system: string;
  initial_resource: number;
  resource_per_turn: number;
}

export interface GameOut {
  id: string;
  creator_id: string;
  title: string;
  description: string | null;
  is_public: boolean;
  invite_code: string | null;
  ruleset: Ruleset;
  created_at: string;
}

export interface EffectCondition {
  stat: string;   // "self.hp" | "self.resources" | "opponent.hp" | "opponent.resources"
  op: string;     // "<" | ">" | "<=" | ">=" | "==" | "!="
  value: number;
}

export interface EffectAction {
  type: string;   // "deal_damage" | "heal" | "buff_stat" | "debuff_stat" | "draw_card" | "discard_card" | "skip_turn"
  target?: string; // "self" | "opponent"
  value?: number;
  stat?: string;  // for buff_stat/debuff_stat
}

export interface CardEffect {
  trigger: string; // "on_attack" | "on_defend" | "on_play" | "on_turn_start" | "on_turn_end" | "on_swap"
  conditions: EffectCondition[];
  actions: EffectAction[];
}

export interface CardOut {
  id: string;
  game_id: string;
  name: string;
  image_url: string | null;
  attributes: Record<string, unknown>;
  effects: CardEffect[];
  created_at: string;
}

export interface DeckOut {
  id: string;
  owner_id: string;
  game_id: string;
  name: string;
  card_ids: string[];
  created_at: string;
}

export interface BattleOut {
  id: string;
  game_id: string;
  player_a_id: string;
  player_b_id: string | null;
  deck_a_id: string;
  deck_b_id: string | null;
  status: 'waiting' | 'playing' | 'done';
  winner_id: string | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
}

export interface BattleState {
  battle_id: string;
  turn_number: number;
  active_player: 'a' | 'b';
  deck_for_a: 'a' | 'b';
  deck_for_b: 'a' | 'b';
  phase: string;
  hp_a: number;
  hp_b: number;
  hand_a: string[];
  hand_b: string[];
  field_a: string[];
  field_b: string[];
  resources_a: number;
  resources_b: number;
  deck_remaining_a: string[];
  deck_remaining_b: string[];
  swap_interval: number;
  initial_hp: number;
}

export interface WsMessage {
  type: 'state' | 'swap' | 'game_over' | 'error';
  data: Record<string, unknown>;
}
