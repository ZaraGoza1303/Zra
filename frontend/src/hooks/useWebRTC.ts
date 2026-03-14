import { useRef, useCallback } from 'react';

const ICE_SERVERS: RTCConfiguration = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        {
            urls: [
                "turns:global.relay.metered.ca:443?transport=tcp",
                "turn:global.relay.metered.ca:443?transport=tcp",
                "turn:global.relay.metered.ca:80?transport=tcp",
            ],
            username: "9cdefd908df7af0e3ad7beaa",
            credential: "q05DIAh/zAdn5cMm",
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

    const drainBuffer = useCallback(async (pc: RTCPeerConnection) => {
        if (iceCandidateBuffer.current.length === 0) return;
        console.log(`🧊 Draining ${iceCandidateBuffer.current.length} buffered ICE candidates`);
        const toAdd = [...iceCandidateBuffer.current];
        iceCandidateBuffer.current = [];
        for (const cand of toAdd) {
            try {
                await pc.addIceCandidate(new RTCIceCandidate(cand));
                console.log("✅ Buffered ICE added");
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
        const pc = new RTCPeerConnection(ICE_SERVERS);
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
            if (e.streams && e.streams[0]) {
                console.log('🎬 Menerima remote stream');
                onRemoteStream(e.streams[0]);
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
        await drainBuffer(pc); // ← drain setelah remote desc siap
    }, [drainBuffer]);

    const handleIceCandidate = useCallback(async (candidate: RTCIceCandidateInit) => {
        const pc = pcRef.current;

        // pc null ATAU remote desc belum ada → buffer
        if (!pc || pc.signalingState === 'closed' || !pc.remoteDescription) {
            console.log("📦 ICE buffered", !pc ? "(pc null)" : "(no remoteDesc)");
            iceCandidateBuffer.current.push(candidate);
            return;
        }

        try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
            console.log("✅ ICE added directly");
        } catch (e) {
            console.warn("ICE error:", e);
        }
    }, []);


    const endCall = useCallback(() => {
        pcRef.current?.close();
        pcRef.current = null;
        localStreamRef.current?.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
        iceCandidateBuffer.current = [];
    }, []);

    const toggleMute = useCallback(() => {
        const audioTrack = localStreamRef.current?.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = !audioTrack.enabled;
            return !audioTrack.enabled; // true = IS muted
        }
        return false;
    }, []);

    const toggleVideo = useCallback(() => {
        const videoTrack = localStreamRef.current?.getVideoTracks()[0];
        if (videoTrack) {
            videoTrack.enabled = !videoTrack.enabled;
            return !videoTrack.enabled; // true = video OFF
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