import { useCallback, useEffect, useRef, useState } from 'react';
import { X, RotateCcw, RotateCw, ZoomIn, ZoomOut, Check, RefreshCw } from 'lucide-react';

interface ImageCropModalProps {
    file: File;
    onConfirm: (croppedFile: File) => void;
    onCancel: () => void;
    aspectRatio?: number; // default 1 (square)
    outputSize?: number;  // default 512px
}

export default function ImageCropModal({
    file,
    onConfirm,
    onCancel,
    aspectRatio = 1,
    outputSize = 512,
}: ImageCropModalProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const imgRef = useRef<HTMLImageElement | null>(null);
    const [imgLoaded, setImgLoaded] = useState(false);

    // Transform state
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [offset, setOffset] = useState({ x: 0, y: 0 });

    // Drag state
    const isDragging = useRef(false);
    const lastPos = useRef({ x: 0, y: 0 });

    // Canvas/viewport dimensions
    const VIEWPORT = 320; // size of the crop circle/square preview

    // Load image
    useEffect(() => {
        const img = new Image();
        img.onload = () => {
            imgRef.current = img;
            setImgLoaded(true);
            // Auto fit: scale image to fill viewport
            const scale = Math.max(VIEWPORT / img.width, VIEWPORT / img.height);
            setZoom(scale);
            setOffset({ x: 0, y: 0 });
            setRotation(0);
        };
        img.src = URL.createObjectURL(file);
        return () => URL.revokeObjectURL(img.src);
    }, [file]);

    // Draw to canvas on every change
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        const img = imgRef.current;
        if (!canvas || !img || !imgLoaded) return;

        const ctx = canvas.getContext('2d')!;
        canvas.width = VIEWPORT;
        canvas.height = VIEWPORT;

        ctx.clearRect(0, 0, VIEWPORT, VIEWPORT);

        // Clip to circle
        ctx.save();
        ctx.beginPath();
        ctx.arc(VIEWPORT / 2, VIEWPORT / 2, VIEWPORT / 2, 0, Math.PI * 2);
        ctx.clip();

        // Transform: center → rotate → zoom → offset
        ctx.translate(VIEWPORT / 2 + offset.x, VIEWPORT / 2 + offset.y);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.scale(zoom, zoom);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);

        ctx.restore();

        // Draw circular mask overlay
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, VIEWPORT, VIEWPORT);
        ctx.arc(VIEWPORT / 2, VIEWPORT / 2, VIEWPORT / 2, 0, Math.PI * 2, true);
        ctx.fillStyle = 'rgba(13, 17, 23, 0.75)';
        ctx.fill();
        ctx.restore();

        // Draw circle border
        ctx.beginPath();
        ctx.arc(VIEWPORT / 2, VIEWPORT / 2, VIEWPORT / 2 - 1, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Crosshair guides
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(VIEWPORT / 2, 0);
        ctx.lineTo(VIEWPORT / 2, VIEWPORT);
        ctx.moveTo(0, VIEWPORT / 2);
        ctx.lineTo(VIEWPORT, VIEWPORT / 2);
        ctx.stroke();

    }, [zoom, rotation, offset, imgLoaded]);

    useEffect(() => {
        draw();
    }, [draw]);

    // Pointer drag
    const onPointerDown = (e: React.PointerEvent) => {
        isDragging.current = true;
        lastPos.current = { x: e.clientX, y: e.clientY };
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: React.PointerEvent) => {
        if (!isDragging.current) return;
        const dx = e.clientX - lastPos.current.x;
        const dy = e.clientY - lastPos.current.y;
        lastPos.current = { x: e.clientX, y: e.clientY };
        setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    };

    const onPointerUp = () => { isDragging.current = false; };

    // Wheel zoom
    const onWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        setZoom(prev => Math.max(0.1, Math.min(10, prev - e.deltaY * 0.001)));
    };

    const rotate = (deg: number) => setRotation(prev => prev + deg);

    const reset = () => {
        const img = imgRef.current;
        if (!img) return;
        const scale = Math.max(VIEWPORT / img.width, VIEWPORT / img.height);
        setZoom(scale);
        setOffset({ x: 0, y: 0 });
        setRotation(0);
    };

    // Export cropped image as File
    const handleConfirm = () => {
        const canvas = canvasRef.current;
        const img = imgRef.current;
        if (!canvas || !img) return;

        // Render to output canvas at desired output size
        const out = document.createElement('canvas');
        out.width = outputSize;
        out.height = outputSize;
        const ctx = out.getContext('2d')!;

        // Clip to circle
        ctx.beginPath();
        ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2);
        ctx.clip();

        const scale = outputSize / VIEWPORT;
        ctx.translate(outputSize / 2 + offset.x * scale, outputSize / 2 + offset.y * scale);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.scale(zoom * scale, zoom * scale);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);

        out.toBlob(blob => {
            if (!blob) return;
            const croppedFile = new File([blob], file.name.replace(/\.[^.]+$/, '.png'), { type: 'image/png' });
            onConfirm(croppedFile);
        }, 'image/png', 0.95);
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-sm mx-4 bg-[#161b22] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/5">
                    <div>
                        <h2 className="text-sm font-semibold text-[#e6edf3]">Adjust Photo</h2>
                        <p className="text-[11px] text-[#8b949e] mt-0.5">Drag · Scroll to zoom · Rotate</p>
                    </div>
                    <button
                        onClick={onCancel}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-[#8b949e] hover:bg-white/5 hover:text-white transition-all"
                    >
                        <X size={15} />
                    </button>
                </div>

                {/* Canvas area */}
                <div className="flex items-center justify-center px-5 pt-5 pb-3">
                    <div
                        ref={containerRef}
                        className="relative rounded-full overflow-hidden cursor-grab active:cursor-grabbing select-none"
                        style={{ width: VIEWPORT, height: VIEWPORT, background: '#0d1117' }}
                        onPointerDown={onPointerDown}
                        onPointerMove={onPointerMove}
                        onPointerUp={onPointerUp}
                        onPointerLeave={onPointerUp}
                        onWheel={onWheel}
                    >
                        <canvas
                            ref={canvasRef}
                            width={VIEWPORT}
                            height={VIEWPORT}
                            className="w-full h-full"
                        />
                        {!imgLoaded && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                            </div>
                        )}
                    </div>
                </div>

                {/* Zoom slider */}
                <div className="px-5 pb-3">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setZoom(z => Math.max(0.1, z - 0.1))}
                            className="text-[#8b949e] hover:text-white transition-colors flex-shrink-0"
                        >
                            <ZoomOut size={15} />
                        </button>
                        <input
                            type="range"
                            min={0.1}
                            max={5}
                            step={0.01}
                            value={zoom}
                            onChange={e => setZoom(parseFloat(e.target.value))}
                            className="flex-1 h-1 appearance-none bg-white/10 rounded-full outline-none cursor-pointer
                            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5
                            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:cursor-pointer
                            [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:rounded-full
                            [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
                        />
                        <button
                            onClick={() => setZoom(z => Math.min(10, z + 0.1))}
                            className="text-[#8b949e] hover:text-white transition-colors flex-shrink-0"
                        >
                            <ZoomIn size={15} />
                        </button>
                    </div>
                </div>

                {/* Rotate + Reset controls */}
                <div className="flex items-center justify-center gap-2 px-5 pb-4">
                    <button
                        onClick={() => rotate(-90)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-[#8b949e] bg-white/5 hover:bg-white/10 hover:text-white border border-white/5 transition-all"
                    >
                        <RotateCcw size={13} />
                        <span>-90°</span>
                    </button>
                    <button
                        onClick={() => rotate(-15)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-[#8b949e] bg-white/5 hover:bg-white/10 hover:text-white border border-white/5 transition-all"
                    >
                        <RotateCcw size={13} />
                        <span>-15°</span>
                    </button>

                    <button
                        onClick={reset}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-[#8b949e] bg-white/5 hover:bg-white/10 hover:text-white border border-white/5 transition-all"
                        title="Reset"
                    >
                        <RefreshCw size={13} />
                    </button>

                    <button
                        onClick={() => rotate(15)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-[#8b949e] bg-white/5 hover:bg-white/10 hover:text-white border border-white/5 transition-all"
                    >
                        <RotateCw size={13} />
                        <span>+15°</span>
                    </button>
                    <button
                        onClick={() => rotate(90)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-[#8b949e] bg-white/5 hover:bg-white/10 hover:text-white border border-white/5 transition-all"
                    >
                        <RotateCw size={13} />
                        <span>+90°</span>
                    </button>
                </div>

                {/* Rotation degree indicator */}
                <div className="flex justify-center pb-3">
                    <span className="text-[10px] text-[#8b949e] font-mono tabular-nums">
                        {((rotation % 360) + 360) % 360}°
                    </span>
                </div>

                {/* Action buttons */}
                <div className="flex gap-3 px-5 pb-5">
                    <button
                        onClick={onCancel}
                        className="flex-1 py-2.5 rounded-xl text-sm font-medium text-[#8b949e] bg-white/5 hover:bg-white/10 border border-white/5 transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!imgLoaded}
                        className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
                    >
                        <Check size={15} />
                        <span>Use Photo</span>
                    </button>
                </div>
            </div>
        </div>
    );
}