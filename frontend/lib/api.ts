// frontend/lib/api.ts
import axios from 'axios';
import { API_BASE } from '../constants';
import * as storage from './storage';
import type { UserOut, TokenOut, GameOut, CardOut, BattleOut, CardType, EffectType, EffectTarget } from '../types/api';

const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use(async config => {
  const token = await storage.getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auth
export const register = (body: { username: string; email: string; password: string }) =>
  api.post<UserOut>('/auth/register', body).then(r => r.data);

export const login = (body: { email: string; password: string }) =>
  api.post<TokenOut>('/auth/login', body).then(r => r.data);

export const getMe = () =>
  api.get<UserOut>('/auth/me').then(r => r.data);

// Games
export const listPublicGames = () =>
  api.get<GameOut[]>('/games').then(r => r.data);

export const listMyGames = () =>
  api.get<GameOut[]>('/games/mine').then(r => r.data);

export const getGame = (id: string) =>
  api.get<GameOut>(`/games/${id}`).then(r => r.data);

export const createGame = (body: { title: string; description?: string; is_public: boolean; win_hand_size?: number }) =>
  api.post<GameOut>('/games', body).then(r => r.data);

export const updateGame = (id: string, body: { title?: string; description?: string; is_public?: boolean; win_hand_size?: number }) =>
  api.put<GameOut>(`/games/${id}`, body).then(r => r.data);

// Cards
export interface CardPayload {
  name: string;
  image_url?: string | null;
  card_type: CardType;
  has_minigame?: boolean;
  trigger_condition?: string | null;
  counter_condition?: string | null;
  counters_action?: boolean;
  counters_trap?: boolean;
  effect_text?: string | null;
  effect_type?: EffectType;
  effect_value?: number;
  effect_target?: EffectTarget;
}

export const listCards = (gameId: string) =>
  api.get<CardOut[]>(`/games/${gameId}/cards`).then(r => r.data);

export const createCard = (gameId: string, body: CardPayload) =>
  api.post<CardOut>(`/games/${gameId}/cards`, body).then(r => r.data);

export const updateCard = (gameId: string, cardId: string, body: Partial<CardPayload>) =>
  api.put<CardOut>(`/games/${gameId}/cards/${cardId}`, body).then(r => r.data);

export const deleteCard = (gameId: string, cardId: string) =>
  api.delete(`/games/${gameId}/cards/${cardId}`);

// Battles
export const createBattle = (body: { game_id: string }) =>
  api.post<BattleOut>('/battles', body).then(r => r.data);

export const getBattle = (id: string) =>
  api.get<BattleOut>(`/battles/${id}`).then(r => r.data);

export const joinBattle = (id: string) =>
  api.post<BattleOut>(`/battles/${id}/join`, {}).then(r => r.data);

export const startBattle = (id: string) =>
  api.post<BattleOut>(`/battles/${id}/start`, {}).then(r => r.data);
