// frontend/hooks/useBattle.ts
import { useEffect, useRef, useState, useCallback } from 'react';
import { API_BASE } from '../constants';
import type { BattleState, WsMessage } from '../types/api';

const WS_BASE = API_BASE.replace('http', 'ws');

export type EventKind =
  | 'card_drawn'
  | 'action_played'
  | 'action_resolved'
  | 'trap_installed'
  | 'trap_revealed'
  | 'trap_resolved'
  | 'trigger_countered'
  | 'discard_required'
  | 'discard_chosen';

export interface FeedEvent {
  id: number;
  kind: EventKind;
  actor?: number;
  data: Record<string, any>;
}

interface UseBattleReturn {
  state: BattleState | null;
  winner: number | null;
  gameEnded: boolean;
  forfeitedBy: number | null;
  error: string | null;
  errorId: number;
  connected: boolean;
  lastEvent: FeedEvent | null;
  sendDraw: () => void;
  sendPlayAction: (cardId: string, targetSeat?: number) => void;
  sendInstallTrap: (cardId: string) => void;
  sendRevealTrap: (cardId: string, activator: number) => void;
  sendPlayCounter: (cardId: string, targetSeat?: number) => void;
  sendPassCounter: () => void;
  sendSetDirection: (direction: 'cw' | 'ccw') => void;
  sendForfeit: () => void;
  sendChooseDiscard: (cardIds: string[]) => void;
}

let _eventId = 0;
let _errorId = 0;

export function useBattle(battleId: string, token: string): UseBattleReturn {
  const ws = useRef<WebSocket | null>(null);
  const [state, setState] = useState<BattleState | null>(null);
  const [winner, setWinner] = useState<number | null>(null);
  const [gameEnded, setGameEnded] = useState(false);
  const [forfeitedBy, setForfeitedBy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorId, setErrorId] = useState(0);
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<FeedEvent | null>(null);

  useEffect(() => {
    if (!battleId || !token) return;
    const socket = new WebSocket(`${WS_BASE}/battles/${battleId}/ws?token=${token}`);
    ws.current = socket;

    socket.onopen = () => setConnected(true);
    socket.onclose = (event) => {
      setConnected(false);
      if (event.code === 4001) {
        setError('인증에 실패했습니다. 다시 로그인해주세요.');
        setErrorId(++_errorId);
      } else if (event.code === 4002) {
        setError('이 배틀에 참가할 수 없습니다 (아직 시작 전이거나 이미 종료됨)');
        setErrorId(++_errorId);
      }
    };

    socket.onmessage = (event) => {
      try {
        const msg: WsMessage = JSON.parse(event.data);
        if (msg.type === 'state') {
          setState(msg.data as unknown as BattleState);
        } else if (msg.type === 'game_over') {
          const d = msg.data as any;
          setWinner(d.winner ?? null);
          setForfeitedBy(d.forfeited_by ?? null);
          setGameEnded(true);
        } else if (msg.type === 'error') {
          setError(msg.detail ?? '오류가 발생했습니다');
          setErrorId(++_errorId);
        } else {
          const d = msg.data ?? {};
          setLastEvent({
            id: ++_eventId,
            kind: msg.type as EventKind,
            actor: (d.actor ?? d.owner ?? d.countered_by) as number | undefined,
            data: d,
          });
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

  const sendDraw = useCallback(() => send({ action: 'draw' }), [send]);
  const sendPlayAction = useCallback((cardId: string, targetSeat?: number) =>
    send({ action: 'play_action', card_id: cardId, target_seat: targetSeat ?? null }), [send]);
  const sendInstallTrap = useCallback((cardId: string) => send({ action: 'install_trap', card_id: cardId }), [send]);
  const sendRevealTrap = useCallback((cardId: string, activator: number) =>
    send({ action: 'reveal_trap', card_id: cardId, activator }), [send]);
  const sendPlayCounter = useCallback((cardId: string, targetSeat?: number) =>
    send({ action: 'play_counter', card_id: cardId, target_seat: targetSeat ?? null }), [send]);
  const sendPassCounter = useCallback(() => send({ action: 'pass_counter' }), [send]);
  const sendSetDirection = useCallback((direction: 'cw' | 'ccw') => send({ action: 'set_direction', direction }), [send]);
  const sendForfeit = useCallback(() => send({ action: 'forfeit' }), [send]);
  const sendChooseDiscard = useCallback((cardIds: string[]) => send({ action: 'choose_discard', card_ids: cardIds }), [send]);

  return {
    state, winner, gameEnded, forfeitedBy, error, errorId, connected, lastEvent,
    sendDraw, sendPlayAction, sendInstallTrap, sendRevealTrap, sendPlayCounter, sendPassCounter, sendSetDirection, sendForfeit,
    sendChooseDiscard,
  };
}
