

import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { Invoice, PurchaseOrder, Vendor, User, Permission, Currency } from '../types';
import { InvoiceStatus, PaymentStatus, UserRole } from '../types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './common/Card';
import { StatusBadge } from './common/Badge';
import { Button } from './common/Button';
import ApprovalActionModal from './common/ApprovalActionModal';
import ApprovalWorkflowHistory from './common/ApprovalWorkflowHistory';
import type { EntityType } from '../App';
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

interface InvoiceDetailProps {
  invoice: Invoice | null;
  purchaseOrder: PurchaseOrder | null | undefined;
  vendor: Vendor | null | undefined;
  currentUser: User | null;
  users: User[];
  onApprovalAction: (entityType: EntityType, entityId: string, action: 'Approve' | 'Reject', comments: string) => void;
  onRecordPayment: (invoice: Invoice) => void;
  currentUserPermissions: Permission[];
  rates: Record<string, number> | null;
  displayCurrency: Currency;
}

const InvoiceDetail: React.FC<InvoiceDetailProps> = ({ invoice, purchaseOrder, vendor, currentUser, users, onApprovalAction, onRecordPayment, currentUserPermissions, rates, displayCurrency }) => {
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'Approve' | 'Reject' | null>(null);
  const [isExporting, setIsExporting] = useState<null | 'pdf' | 'csv'>(null);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  
  const potentialApprovers = useMemo(() => {
    if (!invoice) return [];
    return users.filter(u => u.roleId === UserRole.Approver || u.roleId === UserRole.Admin);
  }, [invoice, users]);

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

  const handleOpenApprovalModal = (action: 'Approve' | 'Reject') => {
    setApprovalAction(action);
    setIsApprovalModalOpen(true);
  };

  const handleSubmitApproval = (comments: string) => {
    if (invoice && approvalAction) {
        onApprovalAction('Invoice', invoice._id, approvalAction, comments);
    }
  };
  
  if (!invoice) {
    return (
      <Card className="h-full flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3h2m-4 3h2m-4 3h2" /></svg>
          <p className="mt-2 text-sm">Select an invoice to see details.</p>
        </div>
      </Card>
    );
  }

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const formatCurrency = (amount: number, currency: string) => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  
  const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amountPaid, 0);
  const amountDue = invoice.amount - totalPaid;
  
  const canApproveOrReject = currentUserPermissions.includes('APPROVE_INVOICE') && invoice.status === InvoiceStatus.Pending;
  const canRecordPayment = currentUserPermissions.includes('RECORD_PAYMENT') && invoice.status === InvoiceStatus.Approved && amountDue > 0;

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
    if (!purchaseOrder || !vendor) return;
    setIsExporting('pdf');
    try {
        await waitForPdfLib();
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        doc.setFontSize(18);
        doc.text(`Invoice: ${invoice.invoiceNumber}`, 14, 22);
        
        doc.setFontSize(11);
        doc.text(`Vendor: ${vendor.name}`, 14, 32);
        doc.text(`Purchase Order: ${purchaseOrder.poNumber}`, 14, 38);
        doc.text(`Invoice Date: ${formatDate(invoice.invoiceDate)}`, 14, 44);
        doc.text(`Due Date: ${formatDate(invoice.dueDate)}`, 14, 50);
        doc.text(`Status: ${invoice.status}`, 14, 56);
        
        const tableColumn = ["Description", "Quantity", "Unit Price", "Line Total"];
        const tableRows = purchaseOrder.lines.map(line => [
            line.description,
            `${line.quantity}`,
            `${line.unitPrice.toFixed(2)} ${purchaseOrder.currency}`,
            `${line.totalPrice.toFixed(2)} ${purchaseOrder.currency}`
        ]);

        doc.autoTable({ head: [tableColumn], body: tableRows, startY: 65 });
        let finalY = Number(doc.lastAutoTable.finalY || 80);

        const pageWidth = doc.internal.pageSize.getWidth();
        const rightAlign = pageWidth - 14;

        doc.setFontSize(10);
        doc.text('Subtotal:', 140, finalY + 7);
        doc.text(`${invoice.subtotal.toFixed(2)} ${invoice.currency}`, rightAlign, finalY + 7, { align: 'right' });
        doc.text(`Tax (${invoice.taxRate || 0}%):`, 140, finalY + 14);
        doc.text(`${invoice.taxAmount.toFixed(2)} ${invoice.currency}`, rightAlign, finalY + 14, { align: 'right' });
        
        doc.setLineWidth(0.2);
        doc.line(140, finalY + 18, rightAlign, finalY + 18);
        
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('Invoice Total:', 140, finalY + 24);
        doc.text(`${invoice.amount.toFixed(2)} ${invoice.currency}`, rightAlign, finalY + 24, { align: 'right' });

        finalY += 30;
        
        if (invoice.payments.length > 0) {
            doc.text("Payment History", 14, finalY + 10);
            doc.autoTable({
                head: [['Date', 'Method', 'Amount Paid']],
                body: invoice.payments.map(p => [formatDate(p.paymentDate), p.paymentMethod, `${p.amountPaid.toFixed(2)} ${invoice.currency}`]),
                startY: finalY + 15,
            });
            finalY = Number(doc.lastAutoTable.finalY || finalY + 30);
        }

        doc.setFontSize(12);
        doc.text(`Total Amount: ${invoice.amount.toFixed(2)} ${invoice.currency}`, 14, finalY + 15);
        doc.text(`Amount Paid: ${totalPaid.toFixed(2)} ${invoice.currency}`, 14, finalY + 22);
        doc.setFont(undefined, 'bold');
        doc.text(`Amount Due: ${amountDue.toFixed(2)} ${invoice.currency}`, 14, finalY + 29);
        
        doc.save(`Invoice_${invoice.invoiceNumber}.pdf`);
    } catch(e) {
        console.error(e);
        alert(e instanceof Error ? e.message : "Failed to export PDF.");
    } finally {
        setIsExporting(null);
    }
  };

  const handleExportCSV = () => {
    setIsExporting('csv');
    const headers = ['Payment Date', 'Amount Paid', 'Currency', 'Payment Method', 'Transaction ID'];
    const data = invoice.payments.map(p => [
        p.paymentDate,
        p.amountPaid,
        invoice.currency,
        p.paymentMethod,
        p.transactionId || ''
    ]);
    createCsvDownloader(`Invoice_${invoice.invoiceNumber}_payments.csv`, headers, data);
    setIsExporting(null);
  };

  return (
    <>
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle>{invoice.invoiceNumber}</CardTitle>
                <CardDescription>From: {vendor?.name || 'Unknown'}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={invoice.status} large />
              <div className="relative inline-block text-left" ref={exportMenuRef}>
                  <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsExportMenuOpen(prev => !prev)}
                      disabled={isExporting !== null}
                  >
                      {isExporting ? 'Exporting...' : 'Export'}
                      <svg className="-mr-1 ml-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                  </Button>
                  {isExportMenuOpen && (
                      <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-popover ring-1 ring-black ring-opacity-5 z-10">
                          <div className="py-1">
                              <button onClick={() => { handleExportPDF(); setIsExportMenuOpen(false); }} className="text-popover-foreground block w-full text-left px-4 py-2 text-sm hover:bg-accent disabled:opacity-50" disabled={isExporting !== null}>Export as PDF</button>
                              <button onClick={() => { handleExportCSV(); setIsExportMenuOpen(false); }} className="text-popover-foreground block w-full text-left px-4 py-2 text-sm hover:bg-accent disabled:opacity-50" disabled={isExporting !== null}>Export Payment History (CSV)</button>
                          </div>
                      </div>
                  )}
              </div>
            </div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow overflow-y-auto">
        <div className="flex flex-wrap gap-2 mb-4">
            {canApproveOrReject && (
                <>
                    <Button onClick={() => handleOpenApprovalModal('Approve')}>Approve</Button>
                    <Button variant="destructive" onClick={() => handleOpenApprovalModal('Reject')}>Reject</Button>
                </>
            )}
            {canRecordPayment && (
                <Button onClick={() => onRecordPayment(invoice)}>Record Payment</Button>
            )}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
            <div>
                <h4 className="font-semibold mb-1">Dates</h4>
                <p className="text-sm text-muted-foreground"><strong>Invoice Date:</strong> {formatDate(invoice.invoiceDate)}</p>
                <p className="text-sm text-muted-foreground"><strong>Due Date:</strong> {formatDate(invoice.dueDate)}</p>
            </div>
             <div>
                <h4 className="font-semibold mb-1">Related PO</h4>
                <p className="text-sm font-medium text-primary">{purchaseOrder?.poNumber || 'N/A'}</p>
            </div>
        </div>
        
        {invoice.status === InvoiceStatus.Pending && (
            <div className="mt-6">
                <h4 className="font-semibold mb-1">Pending Action</h4>
                <div className="text-sm text-muted-foreground bg-yellow-100/50 p-3 rounded-md border border-yellow-200">
                    <p>Awaiting approval for payment from an <span className="font-semibold text-yellow-800">Approver</span> or <span className="font-semibold text-yellow-800">Admin</span>.</p>
                    <p className="text-xs mt-1">
                        Potential Approvers: {potentialApprovers.map(u => u.name).join(', ')}
                    </p>
                </div>
            </div>
        )}

        <div className="mt-6">
            <h4 className="font-semibold mb-2">Invoice Details</h4>
            {purchaseOrder ? (
                 <div className="border rounded-lg">
                    <table className="w-full text-sm text-card-foreground">
                        <thead className="bg-muted/50">
                            <tr>
                                <th className="p-3 text-left font-medium">Description</th>
                                <th className="p-3 text-right font-medium">Qty</th>
                                <th className="p-3 text-right font-medium">Unit Price</th>
                                <th className="p-3 text-right font-medium">Line Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {purchaseOrder.lines.map(line => (
                                <tr key={line._id} className="border-t">
                                    <td className="p-3">{line.description}</td>
                                    <td className="p-3 text-right">{line.quantity}</td>
                                    <td className="p-3 text-right">{formatCurrency(line.unitPrice, purchaseOrder.currency)}</td>
                                    <td className="p-3 text-right font-medium">{formatCurrency(line.totalPrice, purchaseOrder.currency)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="border-t font-medium">
                            <tr>
                                <td colSpan={3} className="p-3 text-right">Subtotal</td>
                                <td className="p-3 text-right">{formatCurrency(invoice.subtotal, invoice.currency)}</td>
                            </tr>
                            <tr>
                                <td colSpan={3} className="p-3 text-right">Tax ({invoice.taxRate || 0}%)</td>
                                <td className="p-3 text-right">{formatCurrency(invoice.taxAmount, invoice.currency)}</td>
                            </tr>
                            <tr className="bg-muted/50 text-base">
                                <td colSpan={3} className="p-3 text-right font-semibold">Invoice Total</td>
                                <td className="p-3 text-right font-bold">{formatCurrency(invoice.amount, invoice.currency)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            ) : <p className="text-sm text-muted-foreground">Could not load PO details.</p>}
        </div>

        <div className="mt-6">
            <h4 className="font-semibold mb-2">Payment History</h4>
            {invoice.payments.length > 0 ? (
                 <div className="border rounded-lg">
                    <table className="w-full text-sm text-card-foreground">
                        <thead className="bg-muted/50">
                            <tr>
                                <th className="p-3 text-left font-medium">Date</th>
                                <th className="p-3 text-left font-medium">Method</th>
                                <th className="p-3 text-right font-medium">Amount Paid</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoice.payments.map(p => (
                                <tr key={p._id} className="border-t">
                                    <td className="p-3">{formatDate(p.paymentDate)}</td>
                                    <td className="p-3">{p.paymentMethod}</td>
                                    <td className="p-3 text-right">{formatCurrency(p.amountPaid, invoice.currency)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : <p className="text-sm text-muted-foreground">No payments recorded for this invoice.</p>}
        </div>
        
        <ApprovalWorkflowHistory workflow={invoice.approvalWorkflow} users={users} />

      </CardContent>
      <CardFooter className="border-t mt-auto grid grid-cols-3 gap-2 text-right">
        <div>
            <p className="text-sm text-muted-foreground">Total Amount</p>
            <p className="text-lg font-bold">{formatCurrency(invoice.amount, invoice.currency)}</p>
            {invoice.currency !== displayCurrency && rates && (
                <p className="text-xs text-muted-foreground">~ {formatCurrency(convertCurrency(invoice.amount, invoice.currency, displayCurrency, rates), displayCurrency)}</p>
            )}
        </div>
        <div>
            <p className="text-sm text-muted-foreground">Amount Paid</p>
            <p className="text-lg font-bold text-green-600">{formatCurrency(totalPaid, invoice.currency)}</p>
             {invoice.currency !== displayCurrency && rates && (
                <p className="text-xs text-muted-foreground">~ {formatCurrency(convertCurrency(totalPaid, invoice.currency, displayCurrency, rates), displayCurrency)}</p>
            )}
        </div>
        <div>
            <p className="text-sm text-muted-foreground">Amount Due</p>
            <p className="text-lg font-bold text-destructive">{formatCurrency(amountDue, invoice.currency)}</p>
             {invoice.currency !== displayCurrency && rates && (
                <p className="text-xs text-muted-foreground">~ {formatCurrency(convertCurrency(amountDue, invoice.currency, displayCurrency, rates), displayCurrency)}</p>
            )}
        </div>
      </CardFooter>
    </Card>
    {approvalAction && (
        <ApprovalActionModal
            isOpen={isApprovalModalOpen}
            onClose={() => setIsApprovalModalOpen(false)}
            onSubmit={handleSubmitApproval}
            action={approvalAction}
        />
    )}
    </>
  );
};

export default InvoiceDetail;
