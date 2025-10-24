

import React, { useState, useRef, useEffect } from 'react';
import type { Quotation, Vendor, Material } from '../types';
import { Button } from './common/Button';

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

interface QuotationDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotation: Quotation | null;
  vendor: Vendor | null;
  materials: Material[];
}

const QuotationDetailModal: React.FC<QuotationDetailModalProps> = ({ isOpen, onClose, quotation, vendor, materials }) => {
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

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const formatCurrency = (amount: number, currency: string) => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  
  const getMaterialSku = (materialId: string) => {
    return materials.find(m => m._id === materialId)?.sku || 'N/A';
  };

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

  const handleExportQuotePDF = async () => {
    if (!quotation || !vendor) return;
    setIsExporting('pdf');
    try {
        await waitForPdfLib();
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        doc.setFontSize(18);
        doc.text(`Quotation from ${vendor.name}`, 14, 22);
        
        doc.setFontSize(11);
        doc.text(`Quotation ID: ${quotation._id}`, 14, 32);
        doc.text(`Submitted Date: ${formatDate(quotation.submittedDate)}`, 14, 38);
        doc.text(`Valid Until: ${formatDate(quotation.validityDate)}`, 14, 44);

        const tableColumn = ["SKU", "Description", "Quantity", "Unit Price", "Total"];
        const tableRows = quotation.items.map(item => [
            getMaterialSku(item.materialId),
            item.product_name,
            item.quantity,
            `${item.unitPrice.toFixed(2)} ${quotation.currency}`,
            `${item.totalPrice.toFixed(2)} ${quotation.currency}`
        ]);

        doc.autoTable({ head: [tableColumn], body: tableRows, startY: 55 });

        const finalY = Number(doc.lastAutoTable.finalY || 80);
        const pageWidth = doc.internal.pageSize.getWidth();
        const rightAlign = pageWidth - 14;

        doc.setFontSize(10);
        doc.text('Subtotal:', 140, finalY + 7);
        doc.text(`${quotation.subtotal.toFixed(2)} ${quotation.currency}`, rightAlign, finalY + 7, { align: 'right' });
        doc.text(`Tax (${quotation.taxRate || 0}%):`, 140, finalY + 14);
        doc.text(`${quotation.taxAmount.toFixed(2)} ${quotation.currency}`, rightAlign, finalY + 14, { align: 'right' });
        
        doc.setLineWidth(0.2);
        doc.line(140, finalY + 18, rightAlign, finalY + 18);

        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('Grand Total:', 140, finalY + 24);
        doc.text(`${quotation.totalAmount.toFixed(2)} ${quotation.currency}`, rightAlign, finalY + 24, { align: 'right' });

        doc.save(`Quotation_${vendor.supplierCode}_${quotation._id}.pdf`);
    } catch (error) {
        console.error("Failed to export PDF:", error);
        alert(error instanceof Error ? error.message : "An error occurred while exporting the PDF.");
    } finally {
        setIsExporting(null);
    }
  };

  const handleExportQuoteCSV = () => {
    if (!quotation || !vendor) return;
    setIsExporting('csv');
    const headers = ["SKU", "Description", "Quantity", "Unit Price", "Total Price", "Currency"];
    const data = quotation.items.map(item => [
        getMaterialSku(item.materialId),
        item.product_name,
        item.quantity,
        item.unitPrice,
        item.totalPrice,
        quotation.currency
    ]);
    createCsvDownloader(`Quotation_${vendor.supplierCode}_${quotation._id}.csv`, headers, data);
    setIsExporting(null);
  };

  if (!isOpen || !quotation || !vendor) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-3xl rounded-lg border bg-card text-card-foreground shadow-sm m-4" onClick={e => e.stopPropagation()}>
        <div className="flex flex-col space-y-1.5 p-6 border-b">
          <h3 className="text-2xl font-semibold leading-none tracking-tight">Quotation Details</h3>
          <p className="text-sm text-muted-foreground">From Vendor: <span className="font-semibold text-primary">{vendor.name}</span></p>
        </div>
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium">Submitted Date</p>
              <p className="text-sm text-muted-foreground">{formatDate(quotation.submittedDate)}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Valid Until</p>
              <p className="text-sm text-muted-foreground">{formatDate(quotation.validityDate)}</p>
            </div>
          </div>

          <h4 className="font-semibold text-sm pt-2">Quoted Items</h4>
          <div className="border rounded-lg">
            <table className="w-full text-sm text-card-foreground">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-3 text-left font-medium">SKU</th>
                  <th className="p-3 text-left font-medium">Description</th>
                  <th className="p-3 text-right font-medium">Qty</th>
                  <th className="p-3 text-right font-medium">Unit Price</th>
                  <th className="p-3 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {quotation.items.map(item => (
                  <tr key={item._id} className="border-t">
                    <td className="p-3 font-mono">{getMaterialSku(item.materialId)}</td>
                    <td className="p-3">{item.product_name}</td>
                    <td className="p-3 text-right">{item.quantity}</td>
                    <td className="p-3 text-right">{formatCurrency(item.unitPrice, quotation.currency)}</td>
                    <td className="p-3 text-right font-medium">{formatCurrency(item.totalPrice, quotation.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end pt-4">
            <div className="w-full max-w-xs space-y-1 text-sm">
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">{formatCurrency(quotation.subtotal, quotation.currency)}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax ({quotation.taxRate || 0}%)</span>
                    <span className="font-medium">{formatCurrency(quotation.taxAmount, quotation.currency)}</span>
                </div>
                <div className="border-t my-1"></div>
                <div className="flex justify-between items-center text-base">
                    <span className="font-semibold">Grand Total</span>
                    <span className="text-xl font-bold">{formatCurrency(quotation.totalAmount, quotation.currency)}</span>
                </div>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end p-6 border-t space-x-2">
            <div className="relative inline-block text-left" ref={exportMenuRef}>
                <Button
                    variant="outline"
                    onClick={() => setIsExportMenuOpen(prev => !prev)}
                    disabled={isExporting !== null}
                    className="flex items-center"
                >
                    {isExporting ? `Exporting ${isExporting}...` : 'Export'}
                    <svg className="-mr-1 ml-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                </Button>
                {isExportMenuOpen && (
                    <div className="origin-top-right absolute right-0 bottom-full mb-2 w-48 rounded-md shadow-lg bg-popover ring-1 ring-black ring-opacity-5 z-10">
                        <div className="py-1">
                            <button onClick={() => { handleExportQuotePDF(); setIsExportMenuOpen(false); }} className="text-popover-foreground block w-full text-left px-4 py-2 text-sm hover:bg-accent disabled:opacity-50" disabled={isExporting !== null}>Export as PDF</button>
                            <button onClick={() => { handleExportQuoteCSV(); setIsExportMenuOpen(false); }} className="text-popover-foreground block w-full text-left px-4 py-2 text-sm hover:bg-accent disabled:opacity-50" disabled={isExporting !== null}>Export as CSV</button>
                        </div>
                    </div>
                )}
            </div>
            <Button type="button" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
};
export default QuotationDetailModal;
