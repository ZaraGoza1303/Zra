import { useRef, useCallback } from 'react';

export interface SignalMessage {
    type: string;
    payload: object;
    toId: number;
}

interface UseSignalQueueOptions {
    getWs: () => WebSocket | null;
}

export function useSignalQueue({ getWs }: UseSignalQueueOptions) {
    const queue = useRef<SignalMessage[]>([]);

    const flushQueue = useCallback(() => {
        const ws = getWs();
        while (queue.current.length > 0 && ws?.readyState === WebSocket.OPEN) {
            const { type, payload, toId } = queue.current.shift()!;
            console.log(`Kirim sinyal ${type} ke user ${toId}`);
            ws.send(JSON.stringify({
                type,
                to_id: toId,
                ...payload
            }));
        }
    }, [getWs]);

    const sendSignal = useCallback((type: string, payload: object, toId: number) => {
        const ws = getWs();
        if (ws?.readyState === WebSocket.OPEN) {
            console.log(`📡 Kirim signal [${type}] ke user ${toId}`);
            ws.send(JSON.stringify({
                type,
                to_id: toId,
                ...payload
            }));
        } else {
            console.warn(`⚠️ WS not ready, queuing signal [${type}] for user ${toId}`);
            queue.current.push({ type, payload, toId });
        }
    }, [getWs]);

    const isQueueEmpty = useCallback(() => queue.current.length === 0, []);

    return { sendSignal, flushQueue, isQueueEmpty, queue };
}
