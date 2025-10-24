import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { PurchaseOrder, DocumentTemplate, Material, Currency } from '../types';
import { convertCurrency } from '../../services/currencyService';
import { useToast } from './useToast';

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

const formatHtmlForPdf = (html: string): string => {
  if (!html) return "";
  
  let formattedText = html.replace(/<li>/gi, '\n• ').replace(/<\/li>/gi, '');
  formattedText = formattedText.replace(/<\/(ul|ol)>/gi, '\n');
  formattedText = formattedText.replace(/<(ul|ol).*?>/gi, '');
  formattedText = formattedText.replace(/<br\s*\/?>/gi, '\n');
  formattedText = formattedText.replace(/<\/p>/gi, '\n');
  
  const doc = new DOMParser().parseFromString(formattedText, 'text/html');
  return doc.body.textContent?.split('\n').map(line => line.trim()).filter(line => line).join('\n') || "";
};

export const formatNumber = (value: number) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

interface UseExportProps {
  purchaseOrder: PurchaseOrder | null;
  documentTemplates: DocumentTemplate[];
  materials: Material[];
  rates: Record<string, number> | null;
  displayCurrency: Currency;
}

export const useExport = ({ purchaseOrder, documentTemplates, materials, rates, displayCurrency }: UseExportProps) => {
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const selectedTemplate = documentTemplates.find(t => t._id === purchaseOrder?.documentTemplateId);
  const currentTemplateVersion = useMemo(() => {
    if (!selectedTemplate) return null;
    return selectedTemplate.versions.find(v => v.version === selectedTemplate.currentVersion);
  }, [selectedTemplate]);

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

  const handleExportClick = () => {
    setIsExportMenuOpen(!isExportMenuOpen);
  };

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const formatCurrency = (amount: number, currency: string) => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);

  const handleExportPDF = async () => {
    if (!purchaseOrder) return;
    setIsExporting('pdf');
    try {
      await waitForPdfLib();
      
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      const pageHeight = doc.internal.pageSize.getHeight();
      const pageWidth = doc.internal.pageSize.getWidth();
      const rightAlign = pageWidth - 14;
      let yPos = 15;

      const addWatermark = (doc: any, text: string) => {
        const pageCount = doc.internal.getNumberOfPages();
        doc.setFontSize(100);
        doc.setTextColor(220, 220, 220); // Light gray color
        doc.setFont(undefined, 'bold');
        
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.text(text, pageWidth / 2, pageHeight / 2, {
                angle: -45,
                align: 'center',
                baseline: 'middle'
            });
        }
      };

      if (currentTemplateVersion?.letterhead) {
        doc.addImage(currentTemplateVersion.letterhead, 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
      } else if (currentTemplateVersion?.backgroundPatternUrl) {
          try {
              const patternImage = await new Promise<HTMLImageElement>((resolve, reject) => {
                  const img = new Image();
                  img.crossOrigin = "anonymous";
                  img.onload = () => resolve(img);
                  img.onerror = reject;
                  img.src = currentTemplateVersion.backgroundPatternUrl!;
              });

              const canvas = document.createElement('canvas');
              canvas.width = pageWidth;
              canvas.height = pageHeight;
              const ctx = canvas.getContext('2d');

              if (ctx) {
                  const pattern = ctx.createPattern(patternImage, 'repeat');
                  if (pattern) {
                      ctx.fillStyle = pattern;
                      ctx.fillRect(0, 0, pageWidth, pageHeight);
                      doc.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
                  }
              }
          } catch (e) {
              console.error("Could not load or apply background pattern. Continuing without it.", e);
          }
      }

      if (currentTemplateVersion?.logo) {
        doc.addImage(currentTemplateVersion.logo, 'PNG', 14, yPos, 50, 20);
      }

      yPos += 25;
      doc.setFontSize(18);
      doc.setTextColor(0, 0, 0);
      doc.text(`Purchase Order: ${purchaseOrder.poNumber}`, 14, yPos);
      yPos += 10;

      doc.setFontSize(10);
      doc.text(`Order Date: ${formatDate(purchaseOrder.orderDate)}`, 14, yPos);
      doc.text(`Delivery Date: ${formatDate(purchaseOrder.deliveryDate)}`, rightAlign, yPos, { align: 'right' });
      yPos += 5;
      doc.text(`Status: ${purchaseOrder.status}`, 14, yPos);
      yPos += 10;

      doc.setFontSize(12);
      doc.text('Vendor Details:', 14, yPos);
      yPos += 7;
      doc.setFontSize(10);
      doc.text(`Name: ${purchaseOrder.vendorName}`, 14, yPos);
      yPos += 5;
      doc.text(`Address: ${purchaseOrder.vendorAddress}`, 14, yPos);
      yPos += 5;
      doc.text(`Contact: ${purchaseOrder.vendorContact}`, 14, yPos);
      yPos += 10;

      const tableColumn = ["Item", "Description", "Quantity", "UOM", "Unit Price", "Total"];
      const tableRows: any[] = [];

      for (const line of purchaseOrder.lines) {
        const material = materials.find(m => m._id === line.materialId);
        const convertedUnitPrice = rates ? await convertCurrency(line.unitPrice, purchaseOrder.currency, displayCurrency.code, rates) : line.unitPrice;
        const convertedTotalPrice = rates ? await convertCurrency(line.totalPrice, purchaseOrder.currency, displayCurrency.code, rates) : line.totalPrice;

        tableRows.push([
          material?.sku || 'N/A',
          line.description,
          `${line.quantity} ${line.uom}`,
          formatNumber(convertedUnitPrice),
          formatNumber(convertedTotalPrice),
        ]);
      }

      (doc as any).autoTable({
        startY: yPos,
        head: [tableColumn],
        body: tableRows,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
        headStyles: { fillColor: [200, 200, 200], textColor: [0, 0, 0] },
        didDrawPage: (data: any) => {
          if (currentTemplateVersion?.letterhead) {
            doc.addImage(currentTemplateVersion.letterhead, 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
          } else if (currentTemplateVersion?.backgroundPatternUrl) {
            // Re-apply background pattern on each new page if it was loaded
            // This part is tricky with autoTable, usually done by redrawing on each page
          }
          addWatermark(doc, 'CONFIDENTIAL');
        }
      });

      yPos = (doc as any).autoTable.previous.finalY + 10;

      const convertedSubtotal = rates ? await convertCurrency(purchaseOrder.subtotal, purchaseOrder.currency, displayCurrency.code, rates) : purchaseOrder.subtotal;
      const convertedTaxAmount = rates ? await convertCurrency(purchaseOrder.taxAmount, purchaseOrder.currency, displayCurrency.code, rates) : purchaseOrder.taxAmount;
      const convertedTotalAmount = rates ? await convertCurrency(purchaseOrder.totalAmount, purchaseOrder.currency, displayCurrency.code, rates) : purchaseOrder.totalAmount;

      doc.setFontSize(10);
      doc.text(`Subtotal: ${displayCurrency.symbol} ${formatNumber(convertedSubtotal)}`, rightAlign, yPos, { align: 'right' });
      yPos += 5;
      doc.text(`Tax (${purchaseOrder.taxRate || 0}%): ${displayCurrency.symbol} ${formatNumber(convertedTaxAmount)}`, rightAlign, yPos, { align: 'right' });
      yPos += 5;
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text(`Grand Total: ${displayCurrency.symbol} ${formatNumber(convertedTotalAmount)}`, rightAlign, yPos, { align: 'right' });

      if (purchaseOrder.notes) {
        yPos += 10;
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text('Notes:', 14, yPos);
        yPos += 5;
        const notesText = formatHtmlForPdf(purchaseOrder.notes);
        doc.text(notesText, 14, yPos, { maxWidth: pageWidth - 28 });
      }

      addWatermark(doc, 'CONFIDENTIAL');

      doc.save(`PO_${purchaseOrder.poNumber}.pdf`);
      toast({ title: "Export Successful", description: "Purchase Order exported to PDF." });
    } catch (error: any) {
      console.error("Failed to export PDF:", error);
      toast({ title: "Export Failed", description: error.message || "An error occurred while exporting to PDF.", variant: "destructive" });
    } finally {
      setIsExporting(null);
    }
  };
  
  const handleExportWord = () => {
    if (!purchaseOrder) return;
    setIsExporting('word');
    try {
        const content = `
            <html xmlns:w="urn:schemas-microsoft-com:office:word">
            <head><title>Purchase Order</title></head>
            <body>
                <h1>Purchase Order: ${purchaseOrder.poNumber}</h1>
                <p><strong>Vendor:</strong> ${purchaseOrder.vendorName || 'N/A'}</p>
                <p><strong>Order Date:</strong> ${formatDate(purchaseOrder.orderDate)}</p>
                <p><strong>Delivery Date:</strong> ${formatDate(purchaseOrder.deliveryDate)}</p>
                <p><strong>Status:</strong> ${purchaseOrder.status}</p>
                <br/>
                <table border="1" style="border-collapse: collapse; width: 100%;">
                    <thead>
                        <tr style="background-color: #f2f2f2;">
                            <th style="padding: 8px;">Description</th>
                            <th style="padding: 8px;">Quantity</th>
                            <th style="padding: 8px;">Unit Price</th>
                            <th style="padding: 8px;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${purchaseOrder.lines.map(line => `
                            <tr>
                                <td style="padding: 8px;">${line.description}</td>
                                <td style="padding: 8px;">${line.quantity} ${line.uom}</td>
                                <td style="padding: 8px;">${formatCurrency(line.unitPrice, purchaseOrder.currency)}</td>
                                <td style="padding: 8px;">${formatCurrency(line.totalPrice, purchaseOrder.currency)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <br/>
                <table style="width: 300px; margin-left: auto; border: none; font-family: sans-serif;">
                    <tr>
                        <td style="text-align: left; padding: 4px;">Subtotal:</td>
                        <td style="text-align: right; padding: 4px;">${formatCurrency(purchaseOrder.subtotal, purchaseOrder.currency)}</td>
                    </tr>
                     <tr>
                        <td style="text-align: left; padding: 4px;">Tax (${purchaseOrder.taxRate || 0}%):</td>
                        <td style="text-align: right; padding: 4px;">${formatCurrency(purchaseOrder.taxAmount, purchaseOrder.currency)}</td>
                    </tr>
                     <tr style="font-weight: bold; border-top: 1px solid #ccc;">
                        <td style="text-align: left; padding: 8px 4px;">Grand Total:</td>
                        <td style="text-align: right; padding: 8px 4px;">${formatCurrency(purchaseOrder.totalAmount, purchaseOrder.currency)}</td>
                    </tr>
                </table>
            </body>
            </html>
        `;

        const blob = new Blob(['\ufeff', content], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `PO_${purchaseOrder.poNumber}.doc`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({ title: "Export Successful", description: "Purchase Order exported to Word." });
    } catch (error: any) {
        console.error("Failed to export Word doc:", error);
        toast({ title: "Export Failed", description: error.message || "An error occurred while exporting to Word.", variant: "destructive" });
    } finally {
        setIsExporting(null);
    }
  };

  const handleExportCSV = () => {
    if (!purchaseOrder) return;
    setIsExporting('csv');
    try {
        const headers = ["SKU", "Description", "Quantity", "UOM", "Unit Price", "Total Price", "Currency"];

        const escapeCsvCell = (cell: any) => {
            const str = String(cell ?? '');
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        };

        const data = purchaseOrder.lines.map(line => {
            const material = materials.find(m => m._id === line.materialId);
            return [
                material?.sku || 'N/A',
                line.description,
                line.quantity,
                line.uom,
                line.unitPrice,
                line.totalPrice,
                purchaseOrder.currency
            ];
        });

        const csvRows = [headers.join(','), ...data.map(row => row.map(escapeCsvCell).join(','))].join('\n');
        const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvRows);
        
        const link = document.createElement('a');
        link.setAttribute('href', csvContent);
        link.setAttribute('download', `PO_${purchaseOrder.poNumber}_items.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast({ title: "Export Successful", description: "Purchase Order exported to CSV." });
    } catch (error: any) {
        console.error("Failed to export CSV:", error);
        toast({ title: "Export Failed", description: error.message || "An error occurred while exporting to CSV.", variant: "destructive" });
    } finally {
        setIsExporting(null);
    }
  };

  return {
    isExporting,
    isExportMenuOpen,
    exportMenuRef,
    handleExportClick,
    handleExportPDF,
    handleExportWord,
    handleExportCSV,
  };
};