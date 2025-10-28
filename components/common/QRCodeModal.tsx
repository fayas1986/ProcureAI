import React, { useEffect, useState, useRef } from 'react';
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
  qrCodeData: string;
}

declare global {
  interface Window {
    QRCode: any; // Declare QRCode on the Window object
  }
}

const QRCodeModal: React.FC<QRCodeModalProps> = ({ isOpen, onClose, qrCodeData }) => {
  const qrCodeRef = useRef<HTMLDivElement>(null);
  const qrcodeInstanceRef = useRef<any>(null);

  const handlePrint = () => {
    if (!qrCodeRef.current) return;

    // Create print area
    const printContent = document.createElement('div');
    printContent.innerHTML = `
      <div style="text-align: center; padding: 2rem;">
        <h2>QR Code</h2>
        <p>Scan with any QR code reader</p>
        ${qrCodeRef.current.innerHTML}
      </div>
    `;

    // Replace body content temporarily
    const originalContent = document.body.innerHTML;
    document.body.innerHTML = printContent.innerHTML;

    // Trigger print
    window.print();

    // Restore original content
    document.body.innerHTML = originalContent;
    window.location.reload(); // Fixes potential state issues after print
  };

  useEffect(() => {
    if (!isOpen || !qrCodeData || !window.QRCode || !qrCodeRef.current) {
      // Cleanup existing instance and its container if conditions are not met
      if (qrcodeInstanceRef.current) {
        qrcodeInstanceRef.current.clear();
        qrcodeInstanceRef.current = null;
      }
      // Ensure the container is empty
      if (qrCodeRef.current) {
        qrCodeRef.current.innerHTML = '';
      }
      return;
    }

    // Cleanup existing instance and its container before creating a new one
    if (qrcodeInstanceRef.current) {
      qrcodeInstanceRef.current.clear();
      qrcodeInstanceRef.current = null;
    }
    if (qrCodeRef.current) {
      qrCodeRef.current.innerHTML = ''; // Clear the container
    }

    // Create a dedicated div for qrcode.js to render into
    const qrCodeContainer = document.createElement('div');
    qrCodeRef.current.appendChild(qrCodeContainer);

    // Create a new QRCode instance
    const qrcode = new window.QRCode(qrCodeContainer, { // Pass the new div here
      text: qrCodeData,
      width: 256,
      height: 256,
      colorDark: '#000000',
      colorLight: '#ffffff',
      correctLevel: window.QRCode.CorrectLevel.H // High error correction
    });

    qrcodeInstanceRef.current = qrcode; // Store the new instance

    // Cleanup function to remove the QR code when the component unmounts or data changes
    return () => {
      if (qrcodeInstanceRef.current) {
        qrcodeInstanceRef.current.clear();
        qrcodeInstanceRef.current = null;
      }
      // Remove the dedicated container div
      if (qrCodeRef.current && qrCodeContainer.parentNode === qrCodeRef.current) {
        qrCodeRef.current.removeChild(qrCodeContainer);
      }
    };
  }, [isOpen, qrCodeData]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-sm rounded-lg border bg-card text-card-foreground shadow-sm m-4" onClick={e => e.stopPropagation()}>
        <div className="flex flex-col space-y-1.5 p-6 border-b">
          <h3 className="text-xl font-semibold leading-none tracking-tight">QR Code</h3>
          <p className="text-sm text-muted-foreground">Scan with any QR code reader.</p>
        </div>
        <div className="p-6 flex flex-col items-center justify-center space-y-4">
          {/* Render QR code into this div */}
          <div ref={qrCodeRef} className="w-64 h-64 flex items-center justify-center">
            {!qrcodeInstanceRef.current && <p className="text-muted-foreground text-sm">Generating QR code...</p>}
          </div>
          <div className="w-full bg-muted/50 p-3 rounded-md">
            <p className="text-xs font-semibold mb-1">Encoded Data:</p>
            <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-all"><code>{qrCodeData}</code></pre>
          </div>
        </div>
        <div className="flex items-center justify-end p-6 border-t">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button onClick={handlePrint} className="ml-2">Print QR Code</Button>
        </div>
      </div>
    </div>
  );
};

export default QRCodeModal;
