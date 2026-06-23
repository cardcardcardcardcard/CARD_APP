// frontend/hooks/useBattle.ts
import { useEffect, useRef, useState, useCallback } from 'react';
import { API_BASE } from '../constants';
import type { BattleState, WsMessage } from '../types/api';

const WS_BASE = API_BASE.replace('http', 'ws');

interface UseBattleReturn {
  state: BattleState | null;
  swapped: boolean;
  winner: string | null;
  error: string | null;
  connected: boolean;
  sendAttack: (value: number, cardId?: string) => void;
  sendEndTurn: () => void;
}

export function useBattle(battleId: string, token: string): UseBattleReturn {
  const ws = useRef<WebSocket | null>(null);
  const [state, setState] = useState<BattleState | null>(null);
  const [swapped, setSwapped] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = new WebSocket(`${WS_BASE}/battles/${battleId}/ws?token=${token}`);
    ws.current = socket;

    socket.onopen = () => setConnected(true);
    socket.onclose = () => setConnected(false);
    socket.onerror = () => setError('Connection error');

    socket.onmessage = (event) => {
      try {
        const msg: WsMessage = JSON.parse(event.data);
        if (msg.type === 'state') {
          setState(msg.data as unknown as BattleState);
          setSwapped(false);
        } else if (msg.type === 'swap') {
          setSwapped(true);
          setState(prev => prev ? { ...prev, ...(msg.data as Partial<BattleState>) } : prev);
        } else if (msg.type === 'game_over') {
          setWinner((msg.data as any).winner as string);
        } else if (msg.type === 'error') {
          setError((msg.data as any).detail as string);
        }
      } catch {}
    };

    return () => { socket.close(); };
  }, [battleId, token]);

  const send = useCallback((payload: object) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(payload));
    }
  }, []);

  const sendAttack = useCallback((value: number, cardId?: string) => {
    send({ action: 'attack', value, card_id: cardId ?? null });
  }, [send]);

  const sendEndTurn = useCallback(() => {
    send({ action: 'end_turn' });
  }, [send]);

  return { state, swapped, winner, error, connected, sendAttack, sendEndTurn };
}
