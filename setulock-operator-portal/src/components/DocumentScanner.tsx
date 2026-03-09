import { useState, useRef, useCallback, useEffect } from 'react';

interface DocumentScannerProps {
    onCapture: (file: File) => void;
    onClose: () => void;
}

export default function DocumentScanner({ onCapture, onClose }: DocumentScannerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [captured, setCaptured] = useState<string | null>(null);
    const [enhanceMode, setEnhanceMode] = useState<'original' | 'enhanced' | 'bw'>('enhanced');
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
    const [error, setError] = useState('');

    const startCamera = useCallback(async () => {
        try {
            setError('');
            setCaptured(null);
            // Stop existing stream
            if (stream) {
                stream.getTracks().forEach(t => t.stop());
            }
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode,
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                },
            });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
        } catch {
            setError('Camera access denied. Please allow camera permissions or use the file upload option.');
        }
    }, [facingMode]);

    useEffect(() => {
        startCamera();
        return () => {
            if (stream) stream.getTracks().forEach(t => t.stop());
        };
    }, [facingMode]);

    const captureImage = () => {
        if (!videoRef.current || !canvasRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Draw the video frame
        ctx.drawImage(video, 0, 0);

        // Apply enhancement
        if (enhanceMode !== 'original') {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            for (let i = 0; i < data.length; i += 4) {
                let r = data[i], g = data[i + 1], b = data[i + 2];

                if (enhanceMode === 'enhanced') {
                    // Increase contrast and brightness for document readability
                    const factor = 1.4; // contrast
                    r = Math.min(255, Math.max(0, factor * (r - 128) + 128 + 15));
                    g = Math.min(255, Math.max(0, factor * (g - 128) + 128 + 15));
                    b = Math.min(255, Math.max(0, factor * (b - 128) + 128 + 15));
                } else if (enhanceMode === 'bw') {
                    // Black & white with threshold for scanned look
                    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
                    const threshold = gray > 140 ? 255 : 0;
                    r = g = b = threshold;
                }

                data[i] = r;
                data[i + 1] = g;
                data[i + 2] = b;
            }

            ctx.putImageData(imageData, 0, 0);
        }

        setCaptured(canvas.toDataURL('image/jpeg', 0.92));
    };

    const retake = () => {
        setCaptured(null);
        startCamera();
    };

    const confirmCapture = () => {
        if (!canvasRef.current) return;
        canvasRef.current.toBlob((blob) => {
            if (blob) {
                const filename = `scan_${Date.now()}.jpg`;
                const file = new File([blob], filename, { type: 'image/jpeg' });
                onCapture(file);
            }
        }, 'image/jpeg', 0.92);
    };

    const toggleCamera = () => {
        setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" style={{ maxWidth: 700 }} onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>📷 Scan Document</h3>
                    <button className="close-btn" onClick={onClose}>✕</button>
                </div>

                <div className="modal-body" style={{ padding: 0 }}>
                    {error ? (
                        <div style={{ padding: 28 }}>
                            <div className="alert alert-danger">⚠️ {error}</div>
                            <button className="btn btn-primary" onClick={startCamera}>Retry Camera</button>
                        </div>
                    ) : !captured ? (
                        <>
                            {/* Live Camera View */}
                            <div style={{ position: 'relative', background: '#000', borderRadius: '0' }}>
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    style={{ width: '100%', display: 'block', maxHeight: 420, objectFit: 'cover' }}
                                />
                                {/* Document alignment guide */}
                                <div style={{
                                    position: 'absolute', inset: '10%',
                                    border: '2px dashed rgba(212, 160, 23, 0.6)',
                                    borderRadius: 12, pointerEvents: 'none',
                                }} />
                                <div style={{
                                    position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
                                    background: 'rgba(0,0,0,0.6)', color: '#fff', padding: '6px 16px',
                                    borderRadius: 20, fontSize: '0.78rem', fontWeight: 500,
                                }}>
                                    Align document within the guide
                                </div>
                            </div>

                            {/* Controls */}
                            <div style={{ padding: '16px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <button className="btn btn-sm btn-outline" onClick={toggleCamera}>🔄 Flip</button>

                                <button
                                    className="btn btn-gold btn-lg"
                                    onClick={captureImage}
                                    style={{ borderRadius: '50%', width: 64, height: 64, padding: 0, fontSize: '1.5rem' }}
                                >
                                    📷
                                </button>

                                <div style={{ display: 'flex', gap: 4 }}>
                                    {(['original', 'enhanced', 'bw'] as const).map(mode => (
                                        <button
                                            key={mode}
                                            className={`btn btn-sm ${enhanceMode === mode ? 'btn-primary' : 'btn-outline'}`}
                                            onClick={() => setEnhanceMode(mode)}
                                            style={{ fontSize: '0.7rem' }}
                                        >
                                            {mode === 'original' ? '🎨' : mode === 'enhanced' ? '✨' : '⬛'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Preview captured image */}
                            <div style={{ background: '#000' }}>
                                <img src={captured} alt="Scanned document" style={{ width: '100%', display: 'block', maxHeight: 420, objectFit: 'contain' }} />
                            </div>

                            <div style={{ padding: '20px 28px', textAlign: 'center' }}>
                                <p style={{ color: '#64748b', fontSize: '0.88rem', marginBottom: 16 }}>
                                    Review the scan. You can retake or use this image.
                                </p>
                                <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                                    <button className="btn btn-outline" onClick={retake}>🔄 Retake</button>
                                    <button className="btn btn-gold" onClick={confirmCapture}>✅ Use This Scan</button>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <canvas ref={canvasRef} style={{ display: 'none' }} />
            </div>
        </div>
    );
}
