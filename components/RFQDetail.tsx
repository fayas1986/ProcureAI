
import React, { useMemo, useState, useRef, useEffect } from 'react';
import type { RFQ, Requisition, Vendor, User, Quotation, Permission, Material, Currency } from '../types';
import { RFQStatus, RFQVendorResponseStatus } from '../types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './common/Card';
import { StatusBadge } from './common/Badge';
import { Button } from './common/Button';
import QuotationDetailModal from './QuotationDetailModal';
import { convertCurrency } from '../services/currencyService';

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

interface RFQDetailProps {
  rfq: RFQ | null;
  requisition: Requisition | null | undefined;
  vendors: Vendor[];
  materials: Material[];
  currentUser: User | null;
  onSubmitQuotation: (rfq: RFQ, vendorId: string) => void;
  onAwardRFQ: (rfq: RFQ, winningQuote: Quotation) => void;
  vendorStatusFilter: RFQVendorResponseStatus | 'all';
  setVendorStatusFilter: (status: RFQVendorResponseStatus | 'all') => void;
  currentUserPermissions: Permission[];
  rates: Record<string, number> | null;
  displayCurrency: Currency;
}

interface VendorFilterButtonProps {
    value: RFQVendorResponseStatus | 'all';
    label: string;
    currentFilter: RFQVendorResponseStatus | 'all';
    onClick: (value: RFQVendorResponseStatus | 'all') => void;
}

const VendorFilterButton: React.FC<VendorFilterButtonProps> = ({ value, label, currentFilter, onClick }) => (
    <Button
        variant={currentFilter === value ? 'default' : 'outline'}
        size="sm"
        onClick={() => onClick(value)}
        className="capitalize text-xs h-8"
    >
        {label}
    </Button>
);

const RFQDetail: React.FC<RFQDetailProps> = ({ rfq, requisition, vendors, materials, currentUser, onSubmitQuotation, onAwardRFQ, vendorStatusFilter, setVendorStatusFilter, currentUserPermissions, rates, displayCurrency }) => {
  const [viewingQuotationInfo, setViewingQuotationInfo] = useState<{ quotation: Quotation, vendor: Vendor } | null>(null);
  const [isExporting, setIsExporting] = useState<null | 'pdf' | 'csv_items' | 'csv_vendors' | 'word'>(null);
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

  const filteredInvitedVendors = useMemo(() => {
    if (!rfq) return [];
    if (vendorStatusFilter === 'all') return rfq.invitedVendors;
    return rfq.invitedVendors.filter(v => v.responseStatus === vendorStatusFilter);
  }, [rfq, vendorStatusFilter]);
  
  const submittedQuotes = useMemo(() => {
    if (!rfq) return [];
    return rfq.invitedVendors
        .filter(v => v.responseStatus === RFQVendorResponseStatus.Submitted && v.quotation)
        .map(v => v.quotation!)
  }, [rfq]);

  const winningQuote = useMemo(() => {
    if (submittedQuotes.length < 1 || !rates) return null;
    return submittedQuotes.reduce((best, current) => {
        const bestValue = convertCurrency(best.totalAmount, best.currency, 'USD', rates);
        const currentValue = convertCurrency(current.totalAmount, current.currency, 'USD', rates);
        return currentValue < bestValue ? current : best;
    });
  }, [submittedQuotes, rates]);

  const bestPricesByMaterial = useMemo(() => {
    const priceMap = new Map<string, number>();
    if (!rfq || !rates) return priceMap;
    rfq.items.forEach(item => {
        const pricesInUSD = submittedQuotes
            .map(q => {
                const quoteItem = q.items.find(qi => qi.materialId === item.materialId);
                if (!quoteItem) return null;
                return convertCurrency(quoteItem.unitPrice, q.currency, 'USD', rates);
            })
            .filter((price): price is number => typeof price === 'number');
        if (pricesInUSD.length > 0) {
            priceMap.set(item.materialId, Math.min(...pricesInUSD));
        }
    });
    return priceMap;
  }, [rfq, submittedQuotes, rates]);

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const formatDateTime = (dateString: string) => new Date(dateString).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const formatCurrency = (amount: number, currency: string) => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  const canManage = currentUserPermissions.includes('AWARD_RFQ') || currentUserPermissions.includes('SUBMIT_QUOTATION');

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

  const handleExportRfqPDF = async () => {
    if (!rfq) return;
    setIsExporting('pdf');
    try {
        await waitForPdfLib();
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        doc.setFontSize(18);
        doc.text(`Request for Quotation: ${rfq.rfqNumber}`, 14, 22);
        
        doc.setFontSize(11);
        doc.text(`From Requisition: ${requisition?.prNumber || 'N/A'}`, 14, 32);
        doc.text(`Issued Date: ${formatDate(rfq.issuedDate)}`, 14, 38);
        doc.text(`Due Date: ${formatDate(rfq.dueDate)}`, 14, 44);
        doc.text(`Status: ${rfq.status}`, 14, 50);

        doc.setFontSize(14);
        doc.text("Requested Items", 14, 60);
        const itemColumns = ["Description", "Quantity", "UOM"];
        const itemRows = rfq.items.map(item => [item.product_name, item.quantity, item.uom]);
        doc.autoTable({ head: [itemColumns], body: itemRows, startY: 65 });

        let finalY = Number(doc.lastAutoTable.finalY || 80);

        doc.setFontSize(14);
        doc.text("Invited Vendors", 14, finalY + 10);
        const vendorColumns = ["Vendor", "Response Status", "Quoted Total"];
        const vendorRows = rfq.invitedVendors.map(v => {
            const vendor = vendors.find(vend => vend._id === v.vendorId);
            const quotedAmount = v.quotation ? formatCurrency(v.quotation.totalAmount, v.quotation.currency) : 'N/A';
            return [vendor?.name || 'Unknown', v.responseStatus, quotedAmount];
        });
        doc.autoTable({ head: [vendorColumns], body: vendorRows, startY: finalY + 15 });

        doc.save(`RFQ_${rfq.rfqNumber}.pdf`);
    } catch (error) {
        console.error("Failed to export PDF:", error);
        alert(error instanceof Error ? error.message : "An error occurred while exporting the PDF.");
    } finally {
        setIsExporting(null);
    }
  };

  const handleExportRfqWord = () => {
    if (!rfq) return;
    setIsExporting('word');
    try {
        const content = `
            <html xmlns:w="urn:schemas-microsoft-com:office:word">
            <head><title>Request for Quotation</title></head>
            <body>
                <h1>Request for Quotation: ${rfq.rfqNumber}</h1>
                <p><strong>From Requisition:</strong> ${requisition?.prNumber || 'N/A'}</p>
                <p><strong>Issued Date:</strong> ${formatDate(rfq.issuedDate)}</p>
                <p><strong>Due Date:</strong> ${formatDate(rfq.dueDate)}</p>
                <p><strong>Status:</strong> ${rfq.status}</p>
                <br/>
                <h3>Requested Items</h3>
                <table border="1" style="border-collapse: collapse; width: 100%;">
                    <thead><tr style="background-color: #f2f2f2;"><th>Description</th><th>Quantity</th><th>UOM</th></tr></thead>
                    <tbody>${rfq.items.map(item => `<tr><td>${item.product_name}</td><td>${item.quantity}</td><td>${item.uom}</td></tr>`).join('')}</tbody>
                </table>
                <br/>
                <h3>Invited Vendors</h3>
                <table border="1" style="border-collapse: collapse; width: 100%;">
                    <thead><tr style="background-color: #f2f2f2;"><th>Vendor</th><th>Response</th><th>Quoted Total</th></tr></thead>
                    <tbody>${rfq.invitedVendors.map(v => {
                        const vendor = vendors.find(vend => vend._id === v.vendorId);
                        const quotedAmount = v.quotation ? formatCurrency(v.quotation.totalAmount, v.quotation.currency) : 'N/A';
                        return `<tr><td>${vendor?.name || 'Unknown'}</td><td>${v.responseStatus}</td><td>${quotedAmount}</td></tr>`;
                    }).join('')}</tbody>
                </table>
            </body></html>`;

        const blob = new Blob(['\ufeff', content], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `RFQ_${rfq.rfqNumber}.doc`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch(e) {
        console.error("Failed to export Word doc:", e);
        alert("An error occurred while exporting to Word.");
    } finally {
        setIsExporting(null);
    }
  };

  const handleExportRfqItemsCSV = () => {
    if (!rfq) return;
    setIsExporting('csv_items');
    const headers = ["SKU", "Description", "Quantity", "UOM"];
    const data = rfq.items.map(item => {
        const material = materials.find(m => m._id === item.materialId);
        return [material?.sku || 'N/A', item.product_name, item.quantity, item.uom];
    });
    createCsvDownloader(`RFQ_${rfq.rfqNumber}_Items.csv`, headers, data);
    setIsExporting(null);
  };

  const handleExportRfqVendorsCSV = () => {
    if (!rfq) return;
    setIsExporting('csv_vendors');
    const headers = ["Vendor", "Response Status", "Quoted Total", "Currency", "Submitted Date", "Validity Date"];
    const data = rfq.invitedVendors.map(v => {
        const vendor = vendors.find(vend => vend._id === v.vendorId);
        return [
            vendor?.name || 'Unknown',
            v.responseStatus,
            v.quotation?.totalAmount || '',
            v.quotation?.currency || '',
            v.quotation ? formatDate(v.quotation.submittedDate) : '',
            v.quotation ? formatDate(v.quotation.validityDate) : '',
        ];
    });
    createCsvDownloader(`RFQ_${rfq.rfqNumber}_Vendor_Responses.csv`, headers, data);
    setIsExporting(null);
  };

  if (!rfq) {
    return (
      <Card className="h-full flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <p className="mt-2 text-sm">Select an RFQ to see details.</p>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="h-full flex flex-col">
        <CardHeader>
          <div className="flex justify-between items-start">
              <div>
                  <CardTitle>{rfq.rfqNumber}</CardTitle>
                  <CardDescription>For Requisition: {requisition?.prNumber || 'N/A'}</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={rfq.status} large />
                <div className="relative inline-block text-left" ref={exportMenuRef}>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsExportMenuOpen(prev => !prev)}
                        disabled={isExporting !== null}
                    >
                        {isExporting ? 'Exporting...' : 'Export'}
                        <svg className="-mr-1 ml-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    </Button>
                    {isExportMenuOpen && (
                        <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-popover ring-1 ring-black ring-opacity-5 z-10">
                            <div className="py-1">
                                <button onClick={() => { handleExportRfqPDF(); setIsExportMenuOpen(false); }} className="text-popover-foreground block w-full text-left px-4 py-2 text-sm hover:bg-accent disabled:opacity-50" disabled={isExporting !== null}>Export as PDF</button>
                                <button onClick={() => { handleExportRfqWord(); setIsExportMenuOpen(false); }} className="text-popover-foreground block w-full text-left px-4 py-2 text-sm hover:bg-accent disabled:opacity-50" disabled={isExporting !== null}>Export as Word</button>
                                <button onClick={() => { handleExportRfqItemsCSV(); setIsExportMenuOpen(false); }} className="text-popover-foreground block w-full text-left px-4 py-2 text-sm hover:bg-accent disabled:opacity-50" disabled={isExporting !== null}>Export Items (CSV)</button>
                                <button onClick={() => { handleExportRfqVendorsCSV(); setIsExportMenuOpen(false); }} className="text-popover-foreground block w-full text-left px-4 py-2 text-sm hover:bg-accent disabled:opacity-50" disabled={isExporting !== null}>Export Vendor Responses (CSV)</button>
                            </div>
                        </div>
                    )}
                </div>
              </div>
          </div>
        </CardHeader>
        <CardContent className="flex-grow overflow-y-auto">
          <div className="grid gap-4 md:grid-cols-2 mb-6">
              <div>
                  <h4 className="font-semibold mb-1">Dates</h4>
                  <p className="text-sm text-muted-foreground"><strong>Issued:</strong> {formatDate(rfq.issuedDate)}</p>
                  <p className="text-sm text-muted-foreground"><strong>Due:</strong> {formatDate(rfq.dueDate)}</p>
              </div>
          </div>
          
          <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                  <h4 className="font-semibold">Invited Vendors</h4>
                  <div className="flex flex-wrap items-center gap-2">
                      <VendorFilterButton value="all" label="All" currentFilter={vendorStatusFilter} onClick={setVendorStatusFilter} />
                      <VendorFilterButton value={RFQVendorResponseStatus.Pending} label="Pending" currentFilter={vendorStatusFilter} onClick={setVendorStatusFilter} />
                      <VendorFilterButton value={RFQVendorResponseStatus.Submitted} label="Submitted" currentFilter={vendorStatusFilter} onClick={setVendorStatusFilter} />
                      <VendorFilterButton value={RFQVendorResponseStatus.Declined} label="Declined" currentFilter={vendorStatusFilter} onClick={setVendorStatusFilter} />
                  </div>
              </div>
              <div className="border rounded-lg overflow-x-auto">
                <table className="w-full text-sm text-left text-card-foreground">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="p-3 text-left font-medium">Vendor</th>
                      <th className="p-3 text-left font-medium">Invited Date</th>
                      <th className="p-3 text-center font-medium">Response Status</th>
                      <th className="p-3 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvitedVendors.length > 0 ? (
                      filteredInvitedVendors.map(v => {
                        const vendor = vendors.find(vend => vend._id === v.vendorId);
                        return (
                          <tr key={v._id} className="border-b last:border-b-0">
                            <td className="p-3 font-medium">{vendor?.name || 'Unknown Vendor'}</td>
                            <td className="p-3 text-muted-foreground">{formatDateTime(v.invitedDate)}</td>
                            <td className="p-3 text-center"><StatusBadge status={v.responseStatus} /></td>
                            <td className="p-3 text-right">
                              {v.responseStatus === RFQVendorResponseStatus.Pending && canManage && rfq.status === RFQStatus.Open && (
                                <Button size="sm" onClick={() => onSubmitQuotation(rfq, v.vendorId)}>Submit Quotation</Button>
                              )}
                              {v.responseStatus === RFQVendorResponseStatus.Submitted && v.quotation && vendor && (
                                <Button variant="outline" size="sm" onClick={() => setViewingQuotationInfo({ quotation: v.quotation!, vendor: vendor })}>View Quotation</Button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={4} className="p-4 text-center text-muted-foreground">
                          No vendors match the current filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
          </div>
          
          {submittedQuotes.length > 0 && (
              <div>
                  <h4 className="font-semibold mb-2">Quotation Comparison</h4>
                  <div className="overflow-x-auto border rounded-lg">
                      <table className="w-full text-sm text-left text-card-foreground">
                          <thead className="bg-muted/50">
                              <tr>
                                  <th className="p-3 font-medium">Item</th>
                                  {submittedQuotes.map(q => {
                                      const isWinning = q._id === winningQuote?._id;
                                      return (
                                          <th key={q._id} className={`p-3 font-medium text-center border-l ${isWinning ? 'bg-primary/10' : ''}`}>
                                              {vendors.find(v => v._id === q.vendorId)?.name}
                                          </th>
                                      );
                                  })}
                              </tr>
                          </thead>
                          <tbody>
                            {rfq.items.map(item => (
                                <tr key={item.materialId} className="border-t">
                                    <td className="p-3 font-medium">{item.product_name} <span className="text-xs text-muted-foreground">({item.quantity} {item.uom})</span></td>
                                    {submittedQuotes.map(q => {
                                        const quoteItem = q.items.find(qi => qi.materialId === item.materialId);
                                        const isBestPrice = rates && quoteItem ? convertCurrency(quoteItem.unitPrice, q.currency, 'USD', rates) === bestPricesByMaterial.get(item.materialId) : false;
                                        return (
                                            <td key={q._id} className={`p-3 text-center border-l ${isBestPrice ? 'bg-green-100/50' : ''}`}>
                                                {quoteItem ? formatCurrency(quoteItem.unitPrice, q.currency) : 'N/A'}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                          </tbody>
                           <tfoot className="border-t font-bold bg-muted/50">
                              <tr>
                                  <td className="p-3">Total</td>
                                  {submittedQuotes.map(q => {
                                      const isWinning = q._id === winningQuote?._id;
                                      return (
                                          <td key={q._id} className={`p-3 text-center border-l ${isWinning ? 'bg-primary/10' : ''}`}>
                                              {formatCurrency(q.totalAmount, q.currency)}
                                          </td>
                                      );
                                  })}
                              </tr>
                              <tr>
                                  <td className="p-3"></td>
                                  {submittedQuotes.map(q => {
                                      const isWinning = q._id === winningQuote?._id;
                                      return (
                                          <td key={q._id} className={`p-3 text-center border-l ${isWinning ? 'bg-primary/10' : ''}`}>
                                              {canManage && rfq.status === RFQStatus.Open && (
                                                  <Button
                                                      size="sm"
                                                      variant={isWinning ? 'default' : 'secondary'}
                                                      onClick={() => onAwardRFQ(rfq, q)}
                                                  >
                                                      {isWinning ? 'Award (Best)' : 'Award'}
                                                  </Button>
                                              )}
                                          </td>
                                      );
                                  })}
                              </tr>
                          </tfoot>
                      </table>
                  </div>
              </div>
          )}
        </CardContent>
      </Card>
      {viewingQuotationInfo && (
        <QuotationDetailModal
          isOpen={!!viewingQuotationInfo}
          onClose={() => setViewingQuotationInfo(null)}
          quotation={viewingQuotationInfo.quotation}
          vendor={viewingQuotationInfo.vendor}
          materials={materials}
        />
      )}
    </>
  );
};

export default RFQDetail;
