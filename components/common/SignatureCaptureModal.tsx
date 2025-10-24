import React, { useState, useRef, useEffect } from 'react';
import { Button } from './Button';

interface SignatureCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (signature: string) => void;
}

const SignatureCaptureModal: React.FC<SignatureCaptureModalProps> = ({ isOpen, onClose, onSave }) => {
  const [mode, setMode] = useState<'draw' | 'camera'>('draw');
  
  // Camera state
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  // Drawing state
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawing, setHasDrawing] = useState(false);

  const stopCamera = () => {
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
    }
  };

  useEffect(() => {
    const startCamera = async () => {
      if (isOpen && mode === 'camera') {
        setCameraError(null);
        setCapturedImage(null);

        if (navigator.permissions && navigator.permissions.query) {
            try {
                const permissionStatus = await navigator.permissions.query({ name: 'camera' as PermissionName });
                if (permissionStatus.state === 'denied') {
                    setCameraError("Camera access denied. Please allow access in your browser's site settings and try again.");
                    return;
                }
            } catch (err) {
                console.warn("Could not query camera permission status:", err);
            }
        }

        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (err) {
            console.error("Error accessing camera:", err);
            let errorMessage = "Could not access the camera. Please ensure it is not in use and that you have granted permission.";
             if (err instanceof DOMException) {
                if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') errorMessage = "Camera access was not granted. Please allow camera access in your browser settings and try again.";
                else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') errorMessage = "No camera found on this device.";
            }
            setCameraError(errorMessage);
        }
      }
    };

    if (isOpen) {
      if (mode === 'camera') {
        startCamera();
      } else {
        stopCamera();
        setHasDrawing(false);
      }
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, mode]);
  
   const getCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e.nativeEvent) {
      return { x: e.nativeEvent.touches[0].clientX - rect.left, y: e.nativeEvent.touches[0].clientY - rect.top };
    }
    return { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const context = canvasRef.current?.getContext('2d');
    if (!context) return;
    const { x, y } = getCoords(e);
    context.beginPath();
    context.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const context = canvasRef.current?.getContext('2d');
    if (!context) return;
    const { x, y } = getCoords(e);
    context.lineTo(x, y);
    context.stroke();
  };

  const stopDrawing = () => {
    const context = canvasRef.current?.getContext('2d');
    if (!context) return;
    context.closePath();
    setIsDrawing(false);
  };
  
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (canvas && context) {
        context.clearRect(0, 0, canvas.width, canvas.height);
        setHasDrawing(false);
    }
  };

  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    if (video) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        setCapturedImage(canvas.toDataURL('image/png'));
      }
    }
  };

  const handleSave = () => {
    if (mode === 'camera' && capturedImage) {
      onSave(capturedImage);
    } else if (mode === 'draw' && canvasRef.current && hasDrawing) {
      onSave(canvasRef.current.toDataURL('image/png'));
    }
    onClose();
  };
  
  const handleRetake = () => setCapturedImage(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-lg rounded-lg border bg-card text-card-foreground shadow-sm m-4" onClick={e => e.stopPropagation()}>
        <div className="flex flex-col space-y-1.5 p-6 border-b">
            <h3 className="text-xl font-semibold leading-none tracking-tight">Capture Signature</h3>
             <div className="border-b border-border mt-2">
                <nav className="-mb-px flex space-x-4" aria-label="Tabs">
                    <button onClick={() => setMode('draw')} className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${mode === 'draw' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>Draw</button>
                    <button onClick={() => setMode('camera')} className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${mode === 'camera' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>Camera</button>
                </nav>
            </div>
        </div>
        <div className="p-6">
          {mode === 'draw' && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Draw your signature in the box below.</p>
              <canvas
                ref={canvasRef}
                width={450}
                height={200}
                className="w-full aspect-[9/4] bg-muted rounded-md cursor-crosshair touch-none"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
            </div>
          )}
          {mode === 'camera' && (
             <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Position signature on a white background in front of the camera.</p>
              {cameraError ? (
                <div className="text-center text-destructive p-4 bg-destructive/10 rounded-md">
                  <p>{cameraError}</p>
                </div>
              ) : (
                <div className="relative aspect-video bg-muted rounded-md overflow-hidden">
                    {capturedImage ? (
                        <img src={capturedImage} alt="Captured signature" className="w-full h-full object-contain" />
                    ) : (
                        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover"></video>
                    )}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center justify-end p-6 border-t space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            {mode === 'draw' && <Button type="button" variant="secondary" onClick={clearCanvas} disabled={!hasDrawing}>Clear</Button>}
            {mode === 'camera' && capturedImage && <Button type="button" variant="secondary" onClick={handleRetake}>Retake</Button>}
            
            {mode === 'camera' && !capturedImage && <Button type="button" onClick={handleCapture} disabled={!!cameraError}>Capture</Button>}
            
            <Button type="button" onClick={handleSave} disabled={(mode === 'draw' && !hasDrawing) || (mode === 'camera' && !capturedImage)}>Save Signature</Button>
        </div>
      </div>
    </div>
  );
};

export default SignatureCaptureModal;