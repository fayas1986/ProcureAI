

import React, { useState, useRef, useEffect } from 'react';
import type { GoodsReceipt, PurchaseOrder, User, Vendor } from '../types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './common/Card';
import { StatusBadge } from './common/Badge';
import { Button } from './common/Button';
import QRCodeModal from './common/QRCodeModal';

// Make jspdf and autoTable available globally for TypeScript
declare global {
  interface Window {
    jspdf: any;
  }
}

const waitForPdfLib = (): Promise<void> => {
    return new Promise((resolve, reject) => {
        const timeout = 30000;
        const interval = 200;
        let elapsed = 0;

        const check = () => {
            if (window.jspdf && window.jspdf.jsPDF) {
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF();
                if (typeof doc.autoTable === 'function') {
                    resolve();
                    return;
                }
            }
            if (elapsed >= timeout) {
                reject(new Error("PDF library (jspdf-autotable) did not load in time. Please check your network connection and try again."));
            } else {
                elapsed += interval;
                setTimeout(check, interval);
            }
        };
        check();
    });
};

interface GRNDetailProps {
  goodsReceipt: GoodsReceipt | null;
  purchaseOrder: PurchaseOrder | null;
  users: User[];
  vendors: Vendor[];
}

const GRNDetail: React.FC<GRNDetailProps> = ({ goodsReceipt, purchaseOrder, users, vendors }) => {
  const [isQRCodeModalOpen, setIsQRCodeModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState<null | 'pdf' | 'csv'>(null);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
            setIsExportMenuOpen(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [exportMenuRef]);
  
  if (!goodsReceipt || !purchaseOrder) {
    return null; // Don't render if no GRN is selected
  }

  const receivedBy = users.find(u => u._id === goodsReceipt.receivedById);
  const vendor = vendors.find(v => v._id === purchaseOrder.vendorId);
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const qrCodeData = JSON.stringify({
    grnNumber: goodsReceipt.grnNumber,
    poNumber: purchaseOrder.poNumber,
    receivedDate: goodsReceipt.receivedDate,
  }, null, 2);

  const createCsvDownloader = (filename: string, headers: string[], data: any[][]) => {
      const escapeCsvCell = (cell: any) => {
          const str = String(cell ?? '');
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
              return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
      };
      const csvRows = [headers.join(','), ...data.map(row => row.map(escapeCsvCell).join(','))].join('\n');
      const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(csvRows);
      
      const link = document.createElement('a');
      link.setAttribute('href', csvContent);
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleExportPDF = async () => {
    setIsExporting('pdf');
    try {
        await waitForPdfLib();
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        doc.setFontSize(18);
        doc.text(`Goods Receipt Note: ${goodsReceipt.grnNumber}`, 14, 22);
        
        doc.setFontSize(11);
        doc.text(`Purchase Order: ${purchaseOrder.poNumber}`, 14, 32);
        doc.text(`Vendor: ${vendor?.name || 'N/A'}`, 14, 38);
        doc.text(`Received Date: ${formatDate(goodsReceipt.receivedDate)}`, 14, 44);
        doc.text(`Received By: ${receivedBy?.name || 'N/A'}`, 14, 50);
        doc.text(`Status: ${goodsReceipt.status}`, 14, 56);

        const tableColumn = ["Description", "Ordered", "Received", "Accepted", "Rejected", "Reason"];
        const tableRows = goodsReceipt.items.map(item => [
            item.description,
            item.orderedQty,
            item.receivedQty,
            item.acceptedQty,
            item.rejectedQty,
            item.rejectionReason || '',
        ]);

        doc.autoTable({ head: [tableColumn], body: tableRows, startY: 65 });

        doc.save(`GRN_${goodsReceipt.grnNumber}.pdf`);
    } catch (e) {
        console.error(e);
        alert(e instanceof Error ? e.message : "Failed to export PDF.");
    } finally {
        setIsExporting(null);
    }
  };

  const handleExportCSV = () => {
    setIsExporting('csv');
    const headers = ['Description', 'Ordered Qty', 'Received Qty', 'Accepted Qty', 'Rejected Qty', 'Rejection Reason'];
    const data = goodsReceipt.items.map(item => [
        item.description,
        item.orderedQty,
        item.receivedQty,
        item.acceptedQty,
        item.rejectedQty,
        item.rejectionReason || '',
    ]);
    createCsvDownloader(`GRN_${goodsReceipt.grnNumber}_items.csv`, headers, data);
    setIsExporting(null);
  };

  return (
    <>
      <Card>
        <CardHeader>
           <div className="flex justify-between items-start">
              <div>
                <CardTitle>{goodsReceipt.grnNumber}</CardTitle>
                <CardDescription>Details for goods receipt associated with PO <span className="font-semibold text-primary">{purchaseOrder.poNumber}</span></CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative inline-block text-left" ref={exportMenuRef}>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsExportMenuOpen(prev => !prev)}
                        disabled={isExporting !== null}
                    >
                        {isExporting ? 'Exporting...' : 'Export'}
                        <svg className="-mr-1 ml-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                    </Button>
                    {isExportMenuOpen && (
                        <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-popover ring-1 ring-black ring-opacity-5 z-10">
                            <div className="py-1">
                                <button onClick={() => { handleExportPDF(); setIsExportMenuOpen(false); }} className="text-popover-foreground block w-full text-left px-4 py-2 text-sm hover:bg-accent disabled:opacity-50" disabled={isExporting !== null}>Export as PDF</button>
                                <button onClick={() => { handleExportCSV(); setIsExportMenuOpen(false); }} className="text-popover-foreground block w-full text-left px-4 py-2 text-sm hover:bg-accent disabled:opacity-50" disabled={isExporting !== null}>Export Items (CSV)</button>
                            </div>
                        </div>
                    )}
                </div>
                <Button variant="outline" size="icon" onClick={() => setIsQRCodeModalOpen(true)} title="Show QR Code">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-1.036.84-1.875 1.875-1.875h4.5c1.036 0 1.875.84 1.875 1.875v4.5c0 1.036-.84 1.875-1.875 1.875h-4.5A1.875 1.875 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-1.036.84-1.875 1.875-1.875h4.5c1.036 0 1.875.84 1.875 1.875v4.5c0 1.036-.84 1.875-1.875 1.875h-4.5A1.875 1.875 0 0 1 3.75 19.125v-4.5ZM13.5 4.875c0-1.036.84-1.875 1.875-1.875h4.5c1.036 0 1.875.84 1.875 1.875v4.5c0 1.036-.84 1.875-1.875 1.875h-4.5A1.875 1.875 0 0 1 13.5 9.375v-4.5Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75ZM6.75 16.5h.75v.75h-.75v-.75ZM16.5 6.75h.75v.75h-.75v-.75ZM13.5 16.5h.75v.75h-.75v-.75ZM13.5 19.125v.75c0 .621.504 1.125 1.125 1.125h2.25c.621 0 1.125-.504 1.125-1.125v-.75M16.5 16.5h.75" />
                    </svg>
                </Button>
              </div>
            </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3 mb-6">
            <div>
              <h4 className="font-semibold mb-1">Vendor</h4>
              <p className="text-sm text-muted-foreground">{vendor?.name || 'Unknown'}</p>
            </div>
            <div>
              <h4 className="font-semibold mb-1">Receipt Details</h4>
              <p className="text-sm text-muted-foreground"><strong>Received Date:</strong> {formatDate(goodsReceipt.receivedDate)}</p>
              <p className="text-sm text-muted-foreground"><strong>Received By:</strong> {receivedBy?.name || 'Unknown'}</p>
            </div>
            <div>
              <h4 className="font-semibold mb-1">Status</h4>
              <StatusBadge status={goodsReceipt.status} />
            </div>
          </div>

          <h4 className="font-semibold mb-2">Received Items</h4>
          <div className="border rounded-lg">
            <table className="w-full text-sm text-card-foreground">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-3 text-left font-medium">Description</th>
                  <th className="p-3 text-center font-medium">Ordered</th>
                  <th className="p-3 text-center font-medium">Received</th>
                  <th className="p-3 text-center font-medium">Accepted</th>
                  <th className="p-3 text-center font-medium text-destructive">Rejected</th>
                </tr>
              </thead>
              <tbody>
                {goodsReceipt.items.map(item => (
                  <tr key={item._id} className="border-t">
                    <td className="p-3">
                      <p>{item.description}</p>
                      {item.rejectionReason && <p className="text-xs text-destructive italic">Reason: {item.rejectionReason}</p>}
                    </td>
                    <td className="p-3 text-center">{item.orderedQty}</td>
                    <td className="p-3 text-center">{item.receivedQty}</td>
                    <td className="p-3 text-center font-medium text-green-600">{item.acceptedQty}</td>
                    <td className="p-3 text-center font-medium text-destructive">{item.rejectedQty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {goodsReceipt.notes && (
            <div className="mt-6">
                <h4 className="font-semibold mb-1">Notes</h4>
                <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">{goodsReceipt.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>
      <QRCodeModal
        isOpen={isQRCodeModalOpen}
        onClose={() => setIsQRCodeModalOpen(false)}
        title={`QR Code for ${goodsReceipt.grnNumber}`}
        data={qrCodeData}
      />
    </>
  );
};

export default GRNDetail;
