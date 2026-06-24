// frontend/lib/storage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'cardcard_token';

export const getToken = () => AsyncStorage.getItem(TOKEN_KEY);
export const setToken = (token: string) => AsyncStorage.setItem(TOKEN_KEY, token);
export const removeToken = () => AsyncStorage.removeItem(TOKEN_KEY);

export const getActiveDeckId = (gameId: string) =>
  AsyncStorage.getItem(`active_deck_${gameId}`);
export const setActiveDeckId = (gameId: string, deckId: string) =>
  AsyncStorage.setItem(`active_deck_${gameId}`, deckId);
