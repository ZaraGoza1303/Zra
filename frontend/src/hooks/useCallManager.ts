import { useState, useCallback, useRef } from 'react';
import { useWebRTC } from './useWebRTC';

export type CallState = 'idle' | 'calling' | 'incoming' | 'active';

export interface CallInfo {
    roomId: string;
    partnerId: number;
    partnerName: string;
    partnerPicture?: string;
    withVideo: boolean;
    isCaller: boolean;
}

interface UseCallManagerProps {
    sendSignal: (type: string, payload: object, toId: number) => void;
    currentUserId?: number;
}

export function useCallManager({ sendSignal, currentUserId }: UseCallManagerProps) {
    const [callState, setCallState] = useState<CallState>('idle');
    const [callInfo, setCallInfo] = useState<CallInfo | null>(null);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

    const callInfoRef = useRef<CallInfo | null>(null);
    const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null); // ✅

    const { startCall, answerCall, handleAnswer, handleIceCandidate, endCall, toggleMute, toggleVideo, localStreamRef } = useWebRTC({
        onRemoteStream: (stream) => setRemoteStream(stream),
        onSignal: sendSignal,
    });

    // ✅ deklarasi resetCall duluan, dan pakai useCallback
    const resetCall = useCallback(() => {
        endCall();
        setCallState('idle');
        setCallInfo(null);
        setLocalStream(null);
        setRemoteStream(null);
        callInfoRef.current = null;
        pendingOfferRef.current = null; // ✅
    }, [endCall]);

    const initiateCall = useCallback(async (info: Omit<CallInfo, 'isCaller'>) => {
        if (callState !== 'idle') return;
        const fullInfo: CallInfo = { ...info, isCaller: true };
        callInfoRef.current = fullInfo;
        setCallInfo(fullInfo);
        setCallState('calling');

        try {
            const stream = await startCall(info.partnerId, info.withVideo);
            setLocalStream(stream);
        } catch (e) {
            console.error('Failed to start call:', e);
            setCallState('idle');
            setCallInfo(null);
        }
    }, [callState, startCall]);

    const handleIncomingOffer = useCallback((msg: {
        user_id: number;
        username: string;
        profile_picture?: string;
        room_id: string;
        sdp: RTCSessionDescriptionInit;
        with_video: boolean;
    }) => {
        if (callState !== 'idle') {
            sendSignal('call-rejected', { reason: 'busy' }, msg.user_id);
            return;
        }

        const info: CallInfo = {
            roomId: msg.room_id,
            partnerId: msg.user_id,
            partnerName: msg.username,
            partnerPicture: msg.profile_picture,
            withVideo: msg.with_video,
            isCaller: false,
        };
        callInfoRef.current = info;
        setCallInfo(info);
        setCallState('incoming');

        pendingOfferRef.current = msg.sdp; // ✅
    }, [callState, sendSignal]);

    // ✅ deklarasi handleEndCall sebelum acceptCall
    const handleEndCall = useCallback(() => {
        const info = callInfoRef.current;
        if (info) sendSignal('call-ended', {}, info.partnerId);
        resetCall(); // ✅ hapus double endCall
    }, [sendSignal, resetCall]);

    const acceptCall = useCallback(async () => {
        const info = callInfoRef.current;
        const sdp = pendingOfferRef.current; // ✅
        if (!info || !sdp) return;

        setCallState('active');
        try {
            const stream = await answerCall(info.partnerId, sdp, info.withVideo);
            setLocalStream(stream);
        } catch (e) {
            console.error('Failed to answer call:', e);
            handleEndCall();
        }
    }, [answerCall, handleEndCall]); // ✅ dependency lengkap

    const rejectCall = useCallback(() => {
        const info = callInfoRef.current;
        if (info) sendSignal('call-rejected', {}, info.partnerId);
        resetCall();
    }, [sendSignal, resetCall]);

    const handleCallAnswer = useCallback(async (sdp: RTCSessionDescriptionInit) => {
        await handleAnswer(sdp);
        setCallState('active');
    }, [handleAnswer]);

    const handleCallSignal = useCallback((msg: any) => {
        switch (msg.type) {
            case 'call-offer':
                handleIncomingOffer(msg);
                break;
            case 'call-answer':
                handleCallAnswer(msg.sdp);
                break;
            case 'ice-candidate':
                handleIceCandidate(msg.candidate);
                break;
            case 'call-rejected':
            case 'call-ended':
                resetCall(); // ✅ cukup resetCall saja
                break;
        }
    }, [handleIncomingOffer, handleCallAnswer, handleIceCandidate, resetCall]);

    return {
        callState,
        callInfo,
        localStream,
        remoteStream,
        initiateCall,
        acceptCall,
        rejectCall,
        handleEndCall,
        handleCallSignal,
        toggleMute,
        toggleVideo,
    };
}