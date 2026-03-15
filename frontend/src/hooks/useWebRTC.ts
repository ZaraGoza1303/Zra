import { useRef, useCallback } from 'react';

const ICE_SERVERS: RTCConfiguration = {
    iceServers: [
        {
            urls: "stun:free.expressturn.com:3478"
        },
        {
            urls: "turn:free.expressturn.com:3478",
            username: "000000002088905985",
            credential: "qouRWGJ6q6/tEI2UsabpLpZuk+8="
        }
    ],
    iceCandidatePoolSize: 10,
};

interface UseWebRTCProps {
    onRemoteStream: (stream: MediaStream) => void;
    onSignal: (type: string, payload: any, toId: number) => void;
}

export function useWebRTC({ onRemoteStream, onSignal }: UseWebRTCProps) {
    const pcRef = useRef<RTCPeerConnection | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const iceCandidateBuffer = useRef<RTCIceCandidateInit[]>([]);
    const remoteStreamRef = useRef<MediaStream | null>(null);

    const drainBuffer = useCallback(async (pc: RTCPeerConnection) => {
        if (iceCandidateBuffer.current.length === 0) return;
        const toAdd = [...iceCandidateBuffer.current];
        iceCandidateBuffer.current = [];
        for (const cand of toAdd) {
            try {
                await pc.addIceCandidate(new RTCIceCandidate(cand));
            } catch (e) {
                console.warn("Buffered ICE error:", e);
            }
        }
    }, []);

    const getLocalStream = async (video: boolean) => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video });
            localStreamRef.current = stream;
            return stream;
        } catch (err) {
            console.error("Gagal akses kamera/mic:", err);
            throw err;
        }
    };

    const createPeerConnection = useCallback((toId: number) => {
        const rtcConfig = {
            ...ICE_SERVERS,
            sdpSemantics: 'unified-plan',
        } as RTCConfiguration;

        const pc = new RTCPeerConnection(rtcConfig);
        pcRef.current = pc;

        pc.oniceconnectionstatechange = () => {
            console.log('🔵 ICE Connection State:', pc.iceConnectionState);
        };

        pc.onconnectionstatechange = () => {
            console.log('🟢 Connection State:', pc.connectionState);
        };

        pc.onicecandidate = (e) => {
            if (e.candidate) {
                onSignal('ice-candidate', { candidate: e.candidate }, toId);
            }
        };

        pc.ontrack = (e) => {
            if (!remoteStreamRef.current) {
                remoteStreamRef.current = new MediaStream();
            }
            remoteStreamRef.current.addTrack(e.track);

            // Tunggu track unmute sebelum callback
            if (e.track.muted) {
                e.track.onunmute = () => {
                    console.log(`🔊 Track unmuted: ${e.track.kind}`);
                    onRemoteStream(remoteStreamRef.current!);
                };
            } else {
                onRemoteStream(remoteStreamRef.current);
            }
        };

        return pc;
    }, [onRemoteStream, onSignal]);

    const startCall = useCallback(async (toId: number, withVideo: boolean) => {
        const stream = await getLocalStream(withVideo);
        const pc = createPeerConnection(toId);
        stream.getTracks().forEach(track => pc.addTrack(track, stream));
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        onSignal('call-offer', { sdp: offer, with_video: withVideo }, toId);
        return stream;
    }, [createPeerConnection, onSignal]);

    const answerCall = useCallback(async (toId: number, sdp: RTCSessionDescriptionInit, withVideo: boolean) => {
        const stream = await getLocalStream(withVideo);
        const pc = createPeerConnection(toId);
        stream.getTracks().forEach(track => pc.addTrack(track, stream));
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        await drainBuffer(pc);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        onSignal('call-answer', { sdp: answer }, toId);
        return stream;
    }, [createPeerConnection, onSignal, drainBuffer]);

    const handleAnswer = useCallback(async (sdp: RTCSessionDescriptionInit) => {
        const pc = pcRef.current;
        if (!pc) return;
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        await drainBuffer(pc);
    }, [drainBuffer]);

    const handleIceCandidate = useCallback(async (candidate: RTCIceCandidateInit) => {
        const pc = pcRef.current;
        if (!pc || pc.signalingState === 'closed' || !pc.remoteDescription) {
            iceCandidateBuffer.current.push(candidate);
            return;
        }
        try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
            console.warn("ICE error:", e);
        }
    }, []);

    const endCall = useCallback(() => {
        pcRef.current?.close();
        pcRef.current = null;
        localStreamRef.current?.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
        remoteStreamRef.current = null;
        iceCandidateBuffer.current = [];
    }, []);

    const toggleMute = useCallback(() => {
        const audioTrack = localStreamRef.current?.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = !audioTrack.enabled;
            return !audioTrack.enabled;
        }
        return false;
    }, []);

    const toggleVideo = useCallback(() => {
        const videoTrack = localStreamRef.current?.getVideoTracks()[0];
        if (videoTrack) {
            videoTrack.enabled = !videoTrack.enabled;
            return !videoTrack.enabled;
        }
        return false;
    }, []);

    return {
        startCall,
        answerCall,
        handleAnswer,
        handleIceCandidate,
        endCall,
        toggleMute,
        toggleVideo,
        localStreamRef,
    };
}