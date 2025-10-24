
import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { Requisition, User, PurchaseOrder, Role, Permission, Currency } from '../types';
import { RequisitionStatus } from '../types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './common/Card';
import { StatusBadge } from './common/Badge';
import { Button } from './common/Button';
import { convertCurrency } from '../services/currencyService';
import ApprovalActionModal from './common/ApprovalActionModal';
import ApprovalWorkflowHistory from './common/ApprovalWorkflowHistory';
import type { EntityType } from '../App';

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

interface RequisitionDetailProps {
  requisition: Requisition | null;
  users: User[];
  roles: Role[];
  currentUser: User | null;
  currentUserPermissions: Permission[];
  purchaseOrders: PurchaseOrder[];
  onEdit: (pr: Requisition) => void;
  onApprovalAction: (entityType: EntityType, entityId: string, action: 'Approve' | 'Reject', comments: string) => void;
  onSubmitForApproval: (prId: string) => void;
  onCreatePO: (pr: Requisition) => void;
  onCreateRFQ: (pr: Requisition) => void;
  rates: Record<string, number> | null;
  displayCurrency: Currency;
}

const RequisitionDetail: React.FC<RequisitionDetailProps> = ({ requisition, users, roles, currentUser, currentUserPermissions, purchaseOrders, onEdit, onApprovalAction, onSubmitForApproval, onCreatePO, onCreateRFQ, rates, displayCurrency }) => {
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'Approve' | 'Reject' | null>(null);
  const [isExporting, setIsExporting] = useState<null | 'pdf' | 'csv' | 'word'>(null);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  
  const potentialApprovers = useMemo(() => {
    if (!requisition) return [];
    const approverRoleIds = new Set(roles.filter(r => r.permissions.includes('APPROVE_REQUISITION')).map(r => r._id));
    return users.filter(u => approverRoleIds.has(u.roleId));
  }, [requisition, users, roles]);

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
    if (requisition && approvalAction) {
        onApprovalAction('Requisition', requisition._id, approvalAction, comments);
    }
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

  const handleExportPDF = async () => {
    if (!requisition) return;
    setIsExporting('pdf');
    try {
        await waitForPdfLib();
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        doc.setFontSize(18);
        doc.text(`Purchase Requisition: ${requisition.prNumber}`, 14, 22);
        
        doc.setFontSize(11);
        doc.text(`Requester: ${requester?.name || 'N/A'}`, 14, 32);
        doc.text(`Department: ${requisition.department}`, 14, 38);
        doc.text(`Request Date: ${formatDate(requisition.requestDate)}`, 14, 44);
        doc.text(`Status: ${requisition.status}`, 14, 50);

        const tableColumn = ["Description", "Quantity", "UOM", "Est. Unit Cost", "Est. Total"];
        const tableRows = requisition.items.map(item => [
            item.product_name,
            item.quantity,
            item.uom,
            `${item.estimatedUnitCost.toFixed(2)} ${requisition.currency}`,
            `${item.estimatedTotalCost.toFixed(2)} ${requisition.currency}`
        ]);

        doc.autoTable({ head: [tableColumn], body: tableRows, startY: 60 });

        const finalY = doc.lastAutoTable.finalY || 80;
        doc.setFontSize(14);
        doc.text(`Total: ${requisition.totalAmount.toFixed(2)} ${requisition.currency}`, 14, finalY + 15);

        doc.save(`PR_${requisition.prNumber}.pdf`);
    } catch (e) {
        console.error(e);
        alert(e instanceof Error ? e.message : "Failed to export PDF.");
    } finally {
        setIsExporting(null);
    }
  };
  
  const handleExportCSV = () => {
    if (!requisition) return;
    setIsExporting('csv');
    const headers = ['Description', 'Quantity', 'UOM', 'Estimated Unit Cost', 'Estimated Total Cost', 'Currency'];
    const data = requisition.items.map(item => [
        item.product_name,
        item.quantity,
        item.uom,
        item.estimatedUnitCost,
        item.estimatedTotalCost,
        requisition.currency
    ]);
    createCsvDownloader(`PR_${requisition.prNumber}_items.csv`, headers, data);
    setIsExporting(null);
  };

  const handleExportWord = () => {
    if (!requisition) return;
    setIsExporting('word');
    try {
        const content = `
            <html xmlns:w="urn:schemas-microsoft-com:office:word">
            <head><title>Purchase Requisition</title></head>
            <body>
                <h1>Purchase Requisition: ${requisition.prNumber}</h1>
                <p><strong>Requester:</strong> ${requester?.name || 'N/A'}</p>
                <p><strong>Department:</strong> ${requisition.department}</p>
                <p><strong>Request Date:</strong> ${formatDate(requisition.requestDate)}</p>
                <p><strong>Status:</strong> ${requisition.status}</p>
                <br/>
                <table border="1" style="border-collapse: collapse; width: 100%;">
                    <thead>
                        <tr style="background-color: #f2f2f2;">
                            <th style="padding: 8px;">Description</th>
                            <th style="padding: 8px;">Quantity</th>
                            <th style="padding: 8px;">UOM</th>
                            <th style="padding: 8px;">Est. Unit Cost</th>
                            <th style="padding: 8px;">Est. Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${requisition.items.map(item => `
                            <tr>
                                <td style="padding: 8px;">${item.product_name}</td>
                                <td style="padding: 8px;">${item.quantity}</td>
                                <td style="padding: 8px;">${item.uom}</td>
                                <td style="padding: 8px;">${formatCurrency(item.estimatedUnitCost, requisition.currency)}</td>
                                <td style="padding: 8px;">${formatCurrency(item.estimatedTotalCost, requisition.currency)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <br/>
                <p style="text-align: right; font-size: 1.2em; font-weight: bold;">
                    Total: ${formatCurrency(requisition.totalAmount, requisition.currency)}
                </p>
            </body>
            </html>
        `;

        const blob = new Blob(['\ufeff', content], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `PR_${requisition.prNumber}.doc`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (error) {
        console.error("Failed to export Word doc:", error);
        alert("An error occurred while exporting to Word.");
    } finally {
        setIsExporting(null);
    }
  };

  if (!requisition) {
    return (
      <Card className="h-full flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
          <p className="mt-2 text-sm">Select a requisition to see details.</p>
        </div>
      </Card>
    );
  }

  const requester = users.find(u => u._id === requisition.requesterId);
  const approver = users.find(u => u._id === requisition.approverId);
  const relatedPO = purchaseOrders.find(po => po._id === requisition.relatedPOId);
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const formatCurrency = (amount: number, currency: string) => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  
  const isOwner = currentUser?._id === requisition.requesterId;

  const canEdit = isOwner && [RequisitionStatus.Draft, RequisitionStatus.Rejected].includes(requisition.status);
  const canSubmit = isOwner && requisition.status === RequisitionStatus.Draft;
  const canApproveOrReject = currentUserPermissions.includes('APPROVE_REQUISITION') && requisition.status === RequisitionStatus.Pending;
  const canCreatePO = currentUserPermissions.includes('CREATE_PO') && requisition.status === RequisitionStatus.Approved && !requisition.relatedPOId && !requisition.rfqId;
  const canCreateRFQ = currentUserPermissions.includes('CREATE_RFQ') && requisition.status === RequisitionStatus.Approved && !requisition.relatedPOId && !requisition.rfqId;


  const workflowDescriptions: Record<RequisitionStatus, string> = {
    [RequisitionStatus.Draft]: 'This is a draft. You can edit it or submit it for approval.',
    [RequisitionStatus.Pending]: 'Awaiting approval from a user with approval permissions.',
    [RequisitionStatus.Approved]: 'This requisition has been approved. You can now create a Purchase Order or an RFQ.',
    [RequisitionStatus.Rejected]: 'This requisition was rejected. You may edit and resubmit if necessary.',
    [RequisitionStatus.RFQ]: 'This requisition is out for quotation. Awaiting vendor responses before a PO can be created.',
    [RequisitionStatus.Closed]: 'This requisition is closed and has been converted to a Purchase Order.',
  };

  return (
    <>
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-start">
            <div>
                <CardTitle>{requisition.prNumber}</CardTitle>
                <CardDescription>{workflowDescriptions[requisition.status]}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
                <StatusBadge status={requisition.status} large />
                <div className="relative inline-block text-left" ref={exportMenuRef}>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsExportMenuOpen(prev => !prev)}
                        disabled={isExporting !== null}
                    >
                        {isExporting ? `Exporting ${isExporting.toUpperCase()}...` : 'Export'}
                        <svg className="-mr-1 ml-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    </Button>
                    {isExportMenuOpen && (
                        <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-popover ring-1 ring-black ring-opacity-5 z-10">
                            <div className="py-1">
                                <button onClick={() => { handleExportPDF(); setIsExportMenuOpen(false); }} className="text-popover-foreground block w-full text-left px-4 py-2 text-sm hover:bg-accent disabled:opacity-50" disabled={isExporting !== null}>Export as PDF</button>
                                <button onClick={() => { handleExportWord(); setIsExportMenuOpen(false); }} className="text-popover-foreground block w-full text-left px-4 py-2 text-sm hover:bg-accent disabled:opacity-50" disabled={isExporting !== null}>Export as Word</button>
                                <button onClick={() => { handleExportCSV(); setIsExportMenuOpen(false); }} className="text-popover-foreground block w-full text-left px-4 py-2 text-sm hover:bg-accent disabled:opacity-50" disabled={isExporting !== null}>Export Items (CSV)</button>
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
            {canSubmit && (
                <Button onClick={() => onSubmitForApproval(requisition._id)}>Submit for Approval</Button>
            )}
            {canEdit && <Button variant="outline" onClick={() => onEdit(requisition)}>Edit PR</Button>}
            {canCreateRFQ && <Button variant="secondary" onClick={() => onCreateRFQ(requisition)}>Create RFQ</Button>}
            {canCreatePO && <Button onClick={() => onCreatePO(requisition)}>Create Purchase Order</Button>}
        </div>
        
        <div className="grid gap-4 md:grid-cols-2">
            <div>
                <h4 className="font-semibold mb-1">Requester</h4>
                <p className="text-sm text-muted-foreground">{requester?.name || 'Unknown'}</p>
                <p className="text-sm text-muted-foreground">Department: {requisition.department}</p>
            </div>
            <div>
                <h4 className="font-semibold mb-1">Dates & Approver</h4>
                <p className="text-sm text-muted-foreground"><strong>Requested:</strong> {formatDate(requisition.requestDate)}</p>
                {requisition.approvedAt && <p className="text-sm text-muted-foreground"><strong>{requisition.status === RequisitionStatus.Rejected ? 'Action on' : 'Approved'}:</strong> {formatDate(requisition.approvedAt)} by {approver?.name || 'N/A'}</p>}
            </div>
        </div>

        {requisition.status === RequisitionStatus.Pending && (
            <div className="mt-6">
                <h4 className="font-semibold mb-1">Pending Action</h4>
                <div className="text-sm text-muted-foreground bg-yellow-100/50 p-3 rounded-md border border-yellow-200">
                    <p>Awaiting approval from a user with the <span className="font-semibold text-yellow-800">'APPROVE_REQUISITION'</span> permission.</p>
                    <p className="text-xs mt-1">
                        Potential Approvers: {potentialApprovers.map(u => u.name).join(', ')}
                    </p>
                </div>
            </div>
        )}
        
        {relatedPO && (
             <div className="mt-4">
                <h4 className="font-semibold mb-1">Related Purchase Order</h4>
                <p className="text-sm text-primary font-medium bg-muted/50 p-2 rounded-md">
                    This requisition was fulfilled by PO: {relatedPO.poNumber}
                </p>
            </div>
        )}

        <div className="mt-6">
            <h4 className="font-semibold mb-2">Requested Items</h4>
            <div className="border rounded-lg">
                <table className="w-full text-sm text-card-foreground">
                    <thead className="bg-muted/50">
                        <tr>
                            <th className="p-3 text-left font-medium">Description</th>
                            <th className="p-3 text-right font-medium">Quantity</th>
                            <th className="p-3 text-right font-medium">Est. Unit Cost</th>
                            <th className="p-3 text-right font-medium">Est. Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {requisition.items.map(item => (
                            <tr key={item._id} className="border-t">
                                <td className="p-3">
                                    <p className="font-medium">{item.product_name}</p>
                                    {item.description && <p className="text-xs text-muted-foreground italic">"{item.description}"</p>}
                                </td>
                                <td className="p-3 text-right">{item.quantity} {item.uom}</td>
                                <td className="p-3 text-right">{formatCurrency(item.estimatedUnitCost, requisition.currency)}</td>
                                <td className="p-3 text-right font-medium">{formatCurrency(item.estimatedTotalCost, requisition.currency)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>

        {requisition.notes && (
            <div className="mt-6">
                <h4 className="font-semibold mb-1">Notes</h4>
                <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">{requisition.notes}</p>
            </div>
        )}

        <ApprovalWorkflowHistory workflow={requisition.approvalWorkflow} users={users} />
      </CardContent>
       <CardFooter className="justify-end border-t mt-auto">
        <div className="text-right">
            <p className="text-sm text-muted-foreground">Estimated Grand Total</p>
            <p className="text-2xl font-bold">{formatCurrency(requisition.totalAmount, requisition.currency)}</p>
            {requisition.currency !== displayCurrency && rates && (
                <p className="text-sm text-muted-foreground">
                    ~ {formatCurrency(convertCurrency(requisition.totalAmount, requisition.currency, displayCurrency, rates), displayCurrency)}
                </p>
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

export default RequisitionDetail;
