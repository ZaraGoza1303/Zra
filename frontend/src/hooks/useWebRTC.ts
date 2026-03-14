import { useRef, useCallback } from 'react';

const ICE_SERVERS: RTCConfiguration = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        {
            urls: "turns:global.relay.metered.ca:443?transport=tcp",
            username: "8f1b0ac96813e3a9acdfafb0",
            credential: "1poW0/E3MQ3O5s4f",
        }
    ],
    iceCandidatePoolSize: 10
};

interface UseWebRTCProps {
    onRemoteStream: (stream: MediaStream) => void;
    onSignal: (type: string, payload: object, toId: number) => void;
}

export function useWebRTC({ onRemoteStream, onSignal }: UseWebRTCProps) {
    const pcRef = useRef<RTCPeerConnection | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const iceCandidateBuffer = useRef<RTCIceCandidateInit[]>([]);
    const remoteDescSet = useRef(false);

    const getLocalStream = async (video: boolean) => {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video,
        });
        localStreamRef.current = stream;
        return stream;
    };

    const flushIceCandidates = async () => {
        remoteDescSet.current = true;
        for (const c of iceCandidateBuffer.current) {
            try {
                await pcRef.current?.addIceCandidate(new RTCIceCandidate(c));
            } catch (e) {
                console.error('ICE flush error:', e);
            }
        }
        iceCandidateBuffer.current = [];
    };

    const createPeerConnection = useCallback((toId: number) => {
        const pc = new RTCPeerConnection({
            ...ICE_SERVERS,
        });
        pcRef.current = pc;

        pc.onicecandidate = (e) => {
            if (e.candidate) {
                onSignal('ice-candidate', { candidate: e.candidate }, toId);
            }
        };

        pc.ontrack = (e) => {
            if (e.streams[0]) onRemoteStream(e.streams[0]);
        };

        return pc;
    }, [onRemoteStream, onSignal]);

    const startCall = useCallback(async (toId: number, withVideo: boolean) => {
        remoteDescSet.current = false;
        iceCandidateBuffer.current = [];

        const stream = await getLocalStream(withVideo);
        const pc = createPeerConnection(toId);
        stream.getTracks().forEach(t => pc.addTrack(t, stream));

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        onSignal('call-offer', { sdp: offer, with_video: withVideo }, toId);
        return stream;
    }, [createPeerConnection, onSignal]);

    const answerCall = useCallback(async (toId: number, sdp: RTCSessionDescriptionInit, withVideo: boolean) => {
        remoteDescSet.current = false;
        iceCandidateBuffer.current = [];

        const stream = await getLocalStream(withVideo);
        const pc = createPeerConnection(toId);
        stream.getTracks().forEach(t => pc.addTrack(t, stream));

        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        await flushIceCandidates(); // flush ICE yang nyangkut

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        onSignal('call-answer', { sdp: answer }, toId);
        return stream;
    }, [createPeerConnection, onSignal]);

    const handleAnswer = useCallback(async (sdp: RTCSessionDescriptionInit) => {
        await pcRef.current?.setRemoteDescription(new RTCSessionDescription(sdp));
        await flushIceCandidates(); // flush ICE yang nyangkut
    }, []);

    const handleIceCandidate = useCallback(async (candidate: RTCIceCandidateInit) => {
        if (!remoteDescSet.current) {
            iceCandidateBuffer.current.push(candidate);
            return;
        }
        try {
            // Tambahkan check pcRef.current biar nggak crash kalau call udah end
            if (pcRef.current) {
                await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
            }
        } catch (e) {
            console.error('ICE error:', e);
        }
    }, []);

    const endCall = useCallback(() => {
        pcRef.current?.close();
        pcRef.current = null;
        localStreamRef.current?.getTracks().forEach(t => t.stop());
        localStreamRef.current = null;
        remoteDescSet.current = false;
        iceCandidateBuffer.current = [];
    }, []);

    const toggleMute = useCallback(() => {
        const audio = localStreamRef.current?.getAudioTracks()[0];
        if (audio) audio.enabled = !audio.enabled;
        return audio ? !audio.enabled : false;
    }, []);

    const toggleVideo = useCallback(() => {
        const video = localStreamRef.current?.getVideoTracks()[0];
        if (video) video.enabled = !video.enabled;
        return video ? !video.enabled : false;
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