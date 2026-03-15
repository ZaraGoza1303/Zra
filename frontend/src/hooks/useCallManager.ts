import { useState, useCallback, useRef } from 'react';
import { useWebRTC } from './useWebRTC';
import { useToastStore } from '../store/toastStore'; // ← tambah import

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
    const callStateRef = useRef<CallState>('idle'); // ← tambah ref untuk callState
    const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);

    // ← Sync callStateRef setiap kali callState berubah
    const setCallStateSync = useCallback((state: CallState) => {
        callStateRef.current = state;
        setCallState(state);
    }, []);

    const { startCall, answerCall, handleAnswer, handleIceCandidate, endCall, toggleMute, toggleVideo, localStreamRef } = useWebRTC({
        onRemoteStream: (stream) => {
            const hasLiveAudio = stream.getAudioTracks().some(t => !t.muted && t.readyState === 'live');
            console.log('📥 onRemoteStream called, hasLiveAudio:', hasLiveAudio);
            setRemoteStream(stream);
        },
        onSignal: sendSignal,
    });

    const resetCall = useCallback(() => {
        endCall();
        setCallStateSync('idle');
        setCallInfo(null);
        setLocalStream(null);
        setRemoteStream(null);
        callInfoRef.current = null;
        pendingOfferRef.current = null;
    }, [endCall, setCallStateSync]);

    const initiateCall = useCallback(async (info: Omit<CallInfo, 'isCaller'>) => {
        if (callStateRef.current !== 'idle') return; // ← pakai ref biar tidak stale
        const fullInfo: CallInfo = { ...info, isCaller: true };
        callInfoRef.current = fullInfo;
        setCallInfo(fullInfo);
        setCallStateSync('calling');

        try {
            const stream = await startCall(info.partnerId, info.withVideo);
            setLocalStream(stream);
        } catch (e) {
            console.error('Failed to start call:', e);
            setCallStateSync('idle');
            setCallInfo(null);
        }
    }, [startCall, setCallStateSync]);

    const handleIncomingOffer = useCallback((msg: {
        user_id: number;
        username: string;
        profile_picture?: string;
        room_id: string;
        sdp: RTCSessionDescriptionInit;
        with_video: boolean;
    }) => {
        // ← Pakai ref supaya tidak stale di dalam handleCallSignal
        if (callStateRef.current !== 'idle') {
            // Kirim call-busy (bukan call-rejected) supaya caller bisa bedain
            sendSignal('call-busy', {}, msg.user_id);
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
        setCallStateSync('incoming');
        pendingOfferRef.current = msg.sdp;
    }, [sendSignal, setCallStateSync]); // ← hapus callState dari deps, pakai ref

    const handleEndCall = useCallback(() => {
        const info = callInfoRef.current;
        if (info) sendSignal('call-ended', {}, info.partnerId);
        resetCall();
    }, [sendSignal, resetCall]);

    const acceptCall = useCallback(async () => {
        const info = callInfoRef.current;
        const sdp = pendingOfferRef.current;
        if (!info || !sdp) return;

        setCallStateSync('active');
        try {
            const stream = await answerCall(info.partnerId, sdp, info.withVideo);
            setLocalStream(stream);
        } catch (e) {
            console.error('Failed to answer call:', e);
            handleEndCall();
        }
    }, [answerCall, handleEndCall, setCallStateSync]);

    const rejectCall = useCallback(() => {
        const info = callInfoRef.current;
        if (info) sendSignal('call-rejected', {}, info.partnerId);
        resetCall();
    }, [sendSignal, resetCall]);

    const handleCallAnswer = useCallback(async (sdp: RTCSessionDescriptionInit) => {
        console.log('📨 Menerima call-answer, set remote desc...');
        await handleAnswer(sdp);
        console.log('✅ Remote desc set, state active');
        setCallStateSync('active');
    }, [handleAnswer, setCallStateSync]);

    const handleIncomingOfferRef = useRef(handleIncomingOffer);
    const handleCallAnswerRef = useRef(handleCallAnswer);
    const handleIceCandidateRef = useRef(handleIceCandidate);
    const resetCallRef = useRef(resetCall);

    handleIncomingOfferRef.current = handleIncomingOffer;
    handleCallAnswerRef.current = handleCallAnswer;
    handleIceCandidateRef.current = handleIceCandidate;
    resetCallRef.current = resetCall;

    const handleCallSignal = useCallback((msg: any) => {
        switch (msg.type) {
            case 'call-offer':
                handleIncomingOfferRef.current(msg);
                break;
            case 'call-answer':
                console.log('🎯 call-answer diterima');
                handleCallAnswerRef.current(msg.sdp);
                break;
            case 'ice-candidate':
                console.log('🧊 ice-candidate → forward ke handleIceCandidate');
                handleIceCandidateRef.current(msg.candidate);
                break;
            case 'call-rejected':
                // Ditolak manual oleh callee
                useToastStore.getState().showToast('Call was declined', 'error');
                resetCallRef.current();
                break;
            case 'call-busy':
                // ← case baru: lawan lagi dalam panggilan lain
                useToastStore.getState().showToast(
                    `${callInfoRef.current?.partnerName ?? 'User'} is busy in another call`,
                    'error'
                );
                resetCallRef.current();
                break;
            case 'call-ended':
                resetCallRef.current();
                break;
        }
    }, []); // deps tetap kosong, semua via ref

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