// frontend/lib/api.ts
import axios from 'axios';
import { API_BASE } from '../constants';
import * as storage from './storage';
import type { UserOut, TokenOut, GameOut, CardOut, DeckOut, BattleOut, Ruleset, CardEffect } from '../types/api';

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

export const createGame = (body: { title: string; description?: string; is_public: boolean; ruleset: Ruleset }) =>
  api.post<GameOut>('/games', body).then(r => r.data);

export const updateGame = (id: string, body: { title?: string; description?: string; is_public?: boolean; ruleset?: Ruleset }) =>
  api.put<GameOut>(`/games/${id}`, body).then(r => r.data);

// Cards
export const listCards = (gameId: string) =>
  api.get<CardOut[]>(`/games/${gameId}/cards`).then(r => r.data);

export const createCard = (gameId: string, body: { name: string; attributes: Record<string, unknown>; effects: CardEffect[] }) =>
  api.post<CardOut>(`/games/${gameId}/cards`, body).then(r => r.data);

export const updateCard = (gameId: string, cardId: string, body: { name?: string; attributes?: Record<string, unknown>; effects?: CardEffect[] }) =>
  api.put<CardOut>(`/games/${gameId}/cards/${cardId}`, body).then(r => r.data);

export const deleteCard = (gameId: string, cardId: string) =>
  api.delete(`/games/${gameId}/cards/${cardId}`);

// Decks
export const listMyDecks = (gameId: string) =>
  api.get<DeckOut[]>(`/games/${gameId}/decks/mine`).then(r => r.data);

export const createDeck = (gameId: string, body: { name: string; card_ids: string[] }) =>
  api.post<DeckOut>(`/games/${gameId}/decks`, body).then(r => r.data);

export const getDeck = (deckId: string) =>
  api.get<DeckOut>(`/decks/${deckId}`).then(r => r.data);

// Battles
export const createBattle = (body: { game_id: string; deck_id: string }) =>
  api.post<BattleOut>('/battles', body).then(r => r.data);

export const getBattle = (id: string) =>
  api.get<BattleOut>(`/battles/${id}`).then(r => r.data);

export const joinBattle = (id: string, body: { deck_id: string }) =>
  api.post<BattleOut>(`/battles/${id}/join`, body).then(r => r.data);
