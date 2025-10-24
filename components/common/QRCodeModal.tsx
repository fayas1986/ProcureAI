import React, { useEffect, useState } from 'react';
import { Button } from './Button';

// Add QRCode to the global window interface for TypeScript
declare global {
  interface Window {
    QRCode: any;
  }
}

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  data: string; // The data to encode, as a string
}

const QRCodeModal: React.FC<QRCodeModalProps> = ({ isOpen, onClose, title, data }) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);

  useEffect(() => {
    const generateQrCode = async () => {
      // Reset QR code on each open
      setQrCodeUrl(null);
      if (isOpen && data && window.QRCode) {
        try {
          const url = await window.QRCode.toDataURL(data, { 
              width: 256, 
              margin: 2, 
              color: { dark: '#000000', light: '#FFFFFF' } 
          });
          setQrCodeUrl(url);
        } catch (error) {
          console.error('Error generating QR Code:', error);
          setQrCodeUrl(null);
        }
      }
    };

    generateQrCode();
  }, [isOpen, data]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-sm rounded-lg border bg-card text-card-foreground shadow-sm m-4" onClick={e => e.stopPropagation()}>
        <div className="flex flex-col space-y-1.5 p-6 border-b">
          <h3 className="text-xl font-semibold leading-none tracking-tight">{title}</h3>
          <p className="text-sm text-muted-foreground">Scan with any QR code reader.</p>
        </div>
        <div className="p-6 flex flex-col items-center justify-center space-y-4">
          {qrCodeUrl ? (
            <img src={qrCodeUrl} alt="Generated QR Code" className="rounded-md w-64 h-64" />
          ) : (
            <div className="w-64 h-64 bg-muted/50 rounded-md flex items-center justify-center">
              <p className="text-muted-foreground text-sm">Generating QR code...</p>
            </div>
          )}
          <div className="w-full bg-muted/50 p-3 rounded-md">
            <p className="text-xs font-semibold mb-1">Encoded Data:</p>
            <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-all"><code>{data}</code></pre>
          </div>
        </div>
        <div className="flex items-center justify-end p-6 border-t">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
};

export default QRCodeModal;
