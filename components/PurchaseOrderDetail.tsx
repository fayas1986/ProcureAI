

import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { PurchaseOrder, Vendor, User, Task, Requisition, RFQ, Permission, DocumentTemplate, GoodsReceipt, Invoice, Currency, Material } from '../types';
import { POStatus } from '../types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './common/Card';
import { StatusBadge } from './common/Badge';
import { Button } from './common/Button';
import TaskManagement from './TaskManagement';
import ApprovalActionModal from './common/ApprovalActionModal';
import ApprovalWorkflowHistory from './common/ApprovalWorkflowHistory';
import type { EntityType, EntityShortType } from '../App';
import { convertCurrency } from '../services/currencyService';
import { useToast } from '../src/hooks/useToast.tsx';
import { usePermissions } from '../src/hooks/usePermissions';
import { useParams } from 'react-router-dom';
import { useExport, formatNumber } from '../src/hooks/useExport';
import { FaSpinner } from 'react-icons/fa';

interface PurchaseOrderDetailProps {
  purchaseOrder: PurchaseOrder | null;
  vendors: Vendor[];
  currentUser: User | null;
  users: User[];
  materials: Material[];
  onEdit: (po: PurchaseOrder) => void;
  onDuplicate: (po: PurchaseOrder) => void;
  onApprovalAction: (entityType: EntityType, entityId: string, action: 'Approve' | 'Reject', comments: string) => void;
  onMarkAsReviewed: (poId: string) => void;
  onSubmitForApproval: (poId: string) => void;
  onUpdateTasks: (poId: string, tasks: Task[]) => void;
  requisitions: Requisition[];
  rfqs: RFQ[];
  onViewRFQ: (rfqId: string) => void;
  currentUserPermissions: Permission[];
  rates: Record<string, number> | null;
  documentTemplates: DocumentTemplate[];
  goodsReceipts: GoodsReceipt[];
  invoices: Invoice[];
  onViewEntity: (type: EntityShortType, entityNumber: string) => void;
  displayCurrency: Currency;
}

const PurchaseOrderDetail: React.FC<PurchaseOrderDetailProps> = ({
  purchaseOrder: initialPurchaseOrder,
  vendors,
  currentUser,
  users,
  materials,
  requisitions,
  rfqs,
  goodsReceipts,
  invoices,
  documentTemplates,
  onApprovalAction,
  onMarkAsReviewed,
  onEdit,
  onDuplicate,
  onViewEntity,
  onUpdateTasks,
  displayCurrency,
  rates,
  currentUserPermissions,
}) => {
  const { hasPermission } = usePermissions(currentUserPermissions);
  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrder | undefined>(initialPurchaseOrder);

  // const { currentUserPermissions } = usePermissions(); // Removed this line

  useEffect(() => {
    setPurchaseOrder(initialPurchaseOrder);
  }, [initialPurchaseOrder]);

  const [editedPO, setEditedPO] = useState<PurchaseOrder | null>(null);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);

  const handleCloseApprovalModal = () => {
    setIsApprovalModalOpen(false);
  };

  const handleOpenApprovalModal = (action: 'Approve' | 'Reject') => {
    setApprovalAction(action);
    setIsApprovalModalOpen(true);
  };

  const convertedTotalAmount = useMemo(() => {
    if (!purchaseOrder || !rates) return 0;
    return convertCurrency(purchaseOrder.totalAmount, purchaseOrder.currency, displayCurrency.code, rates);
  }, [purchaseOrder, rates, displayCurrency]);

  // const formatNumber = (value: number) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

  const [isEditing, setIsEditing] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'Approve' | 'Reject' | null>(null);
  const { isExporting, isExportMenuOpen, exportMenuRef, handleExportClick, handleExportPDF, handleExportWord, handleExportCSV } = useExport({
    purchaseOrder,
    documentTemplates,
    materials,
    rates,
    displayCurrency,
  });

  const handleConfirmApproval = (comments: string) => {
    if (purchaseOrder && approvalAction) {
      onApprovalAction('PurchaseOrder', purchaseOrder._id, approvalAction, comments);
      handleCloseApprovalModal();
    }
  };

  const [isReminderSent, setIsReminderSent] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState(purchaseOrder?.documentTemplateId || '');

  useEffect(() => {
    if (purchaseOrder) {
      setEditedPO({ ...purchaseOrder });
    }
  }, [purchaseOrder]);

  useEffect(() => {
    setPurchaseOrder(initialPurchaseOrder);
  }, [initialPurchaseOrder]);

  const isOwner = currentUser?._id === purchaseOrder?.requesterId;

  const shouldShowReminder = useMemo(() => {
    if (!isOwner || !purchaseOrder || (purchaseOrder.status !== POStatus.PendingL1Approval && purchaseOrder.status !== POStatus.PendingL2Approval) || !purchaseOrder.createdAt) {
        return false;
    }
    const createdDate = new Date(purchaseOrder.createdAt);
    const now = new Date();
    const hoursDifference = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60);
    return hoursDifference > 24;
  }, [purchaseOrder, isOwner]);

  const sourceRequisition = useMemo(() => {
    if (!purchaseOrder?.requisitionId) return null;
    return requisitions.find(req => req._id === purchaseOrder.requisitionId);
  }, [purchaseOrder, requisitions]);

  const sourceRFQ = useMemo(() => {
    if (!purchaseOrder?.rfqId) return null;
    return rfqs.find(rfq => rfq._id === purchaseOrder.rfqId);
  }, [purchaseOrder, rfqs]);

  const relatedGRNs = useMemo(() => {
    if (!purchaseOrder) return [];
    return goodsReceipts.filter(grn => grn.poId === purchaseOrder._id);
  }, [purchaseOrder, goodsReceipts]);

  const relatedInvoices = useMemo(() => {
    if (!purchaseOrder) return [];
    return invoices.filter(inv => inv.poId === purchaseOrder._id)
      .sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime());
  }, [purchaseOrder, invoices]);

  const selectedTemplate = documentTemplates.find(t => t._id === selectedTemplateId);
  const currentTemplateVersion = useMemo(() => {
    if (!selectedTemplate) return null;
    return selectedTemplate.versions.find(v => v.version === selectedTemplate.currentVersion);
  }, [selectedTemplate]);

  if (!purchaseOrder) {
    return (
      <Card className="h-full flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
          <p className="mt-2 text-sm">Select a purchase order to see details.</p>
        </div>
      </Card>
    );
  }
  
  const canApprove = currentUserPermissions.includes('APPROVE_PO');
  const canSubmit = isOwner && currentUserPermissions.includes('CREATE_PO') && purchaseOrder.status === POStatus.Draft;
  const canApproveOrReject = canApprove && (purchaseOrder.status === POStatus.PendingL1Approval || purchaseOrder.status === POStatus.PendingL2Approval);
  const canEdit = (isOwner || canApprove) && [POStatus.Draft, POStatus.PendingL1Approval, POStatus.PendingL2Approval, POStatus.Rejected].includes(purchaseOrder.status);
  const canDuplicate = currentUserPermissions.includes('CREATE_PO');
  const canMarkAsReviewed = 
    currentUserPermissions.includes('APPROVE_PO') &&
    (purchaseOrder.status === POStatus.PendingL1Approval || purchaseOrder.status === POStatus.PendingL2Approval) &&
    !purchaseOrder.reviewedById &&
    currentUser?._id !== purchaseOrder.requesterId;
  
  const vendor = vendors.find(s => s._id === purchaseOrder.vendorId);
  const requester = users.find(u => u._id === purchaseOrder.requesterId);
  const reviewer = purchaseOrder.reviewedById ? users.find(u => u._id === purchaseOrder.reviewedById) : null;
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const formatCurrency = (amount: number, currency: string) => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);

  const handleSendReminder = () => {
    if (!purchaseOrder) return;
    alert(`Reminder sent to approver for PO: ${purchaseOrder.poNumber}.`);
    setIsReminderSent(true);
    setTimeout(() => setIsReminderSent(false), 5000);
  };



  return (
    <div className="p-4">
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between space-x-2">
            <CardTitle className="text-2xl font-bold">PO-{purchaseOrder.poNumber}</CardTitle>
            <div className="flex items-center space-x-2">
              <StatusBadge status={purchaseOrder.status} />
              {purchaseOrder.status === POStatus.PendingL1Approval && hasPermission('APPROVE_PO') && (
                <Button onClick={() => handleOpenApprovalModal('Approve')}>Approve</Button>
              )}
              {purchaseOrder.status === POStatus.PendingL1Approval && hasPermission('REJECT_PO') && (
                <Button variant="destructive" onClick={() => handleOpenApprovalModal('Reject')}>Reject</Button>
              )}
              {purchaseOrder.status === POStatus.Approved && hasPermission('MARK_PO_REVIEWED') && !purchaseOrder.isReviewed && (
                <Button variant="secondary" onClick={() => onMarkAsReviewed(purchaseOrder._id)}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.03 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                  </svg>
                  Mark as Reviewed
                </Button>
              )}
              {hasPermission('EDIT_PO') && (
                <Button variant="outline" onClick={() => onEdit(purchaseOrder)}>Edit PO</Button>
              )}
              {hasPermission('DUPLICATE_PO') && (
                <Button variant="outline" onClick={() => onDuplicate(purchaseOrder)}>Duplicate PO</Button>
              )}
              <Button variant="outline" onClick={handleExportClick}>
                Export
                {isExportMenuOpen && (
                  <div ref={exportMenuRef} className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10">
                    <div
                      onClick={handleExportPDF}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left cursor-pointer"
                    >
                      Export as PDF {isExporting === 'pdf' && <FaSpinner className="animate-spin ml-2" />}
                    </div>
                    <div
                      onClick={handleExportWord}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left cursor-pointer"
                    >
                      Export as Word {isExporting === 'word' && <FaSpinner className="animate-spin ml-2" />}
                    </div>
                    <div
                      onClick={handleExportCSV}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left cursor-pointer"
                    >
                      Export as CSV {isExporting === 'csv' && <FaSpinner className="animate-spin ml-2" />}
                    </div>
                  </div>
                )}
              </Button>
            </div>
          </div>
          <CardDescription className="text-sm text-gray-500">Details for purchase order</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Vendor</p>
              <p className="text-base font-semibold">{vendor?.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Requester</p>
              <p className="text-base font-semibold">{requester?.name}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Dates</p>
              <p className="text-base">Order: {new Date(purchaseOrder.orderDate).toLocaleDateString()}</p>
              <p className="text-base">Delivery: {new Date(purchaseOrder.deliveryDate).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Amount</p>
              <p className="text-base font-semibold">{displayCurrency.symbol} {formatNumber(convertedTotalAmount)}</p>
            </div>
          </div>

          <h3 className="text-lg font-semibold mt-4">Items</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {purchaseOrder.lines.map((line, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{line.item}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{line.description}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{line.quantity}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{displayCurrency.symbol} {formatNumber(line.unitPrice)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{displayCurrency.symbol} {formatNumber(line.quantity * line.unitPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {purchaseOrder.notes && (
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-500">Notes</p>
              <p className="text-base text-gray-900">{purchaseOrder.notes}</p>
            </div>
          )}

          {sourceRequisition && (
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-500">Source Requisition</p>
              <Button variant="link" onClick={() => onViewEntity('Requisition', sourceRequisition.requisitionNumber)}>
                Req: {sourceRequisition.requisitionNumber}
              </Button>
            </div>
          )}

          {sourceRFQ && (
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-500">Source RFQ</p>
              <Button variant="link" onClick={() => onViewEntity('RFQ', sourceRFQ.rfqNumber)}>
                RFQ: {sourceRFQ.rfqNumber}
              </Button>
            </div>
          )}

          {relatedGRNs.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-500">Related Goods Receipts</p>
              {relatedGRNs.map(grn => <Button key={grn._id} variant="link" onClick={() => onViewEntity('GRN', grn.grnNumber)}>GRN: {grn.grnNumber}</Button>)}
            </div>
          )}

          {relatedInvoices.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-500">Related Invoices</p>
              {relatedInvoices.map(invoice => <Button key={invoice._id} variant="link" onClick={() => onViewEntity('Invoice', invoice.invoiceNumber)}>Inv: {invoice.invoiceNumber}</Button>)}
            </div>
          )}

          <TaskManagement
            tasks={purchaseOrder.tasks || []}
            onUpdateTasks={(updatedTasks) => onUpdateTasks(purchaseOrder._id, updatedTasks)}
            currentUser={currentUser}
            users={users}
            hasPermission={hasPermission}
          />

          <ApprovalWorkflowHistory
            entityId={purchaseOrder._id}
            entityType="PurchaseOrder"
            currentStatus={purchaseOrder.status}
            approvals={purchaseOrder.approvals || []}
            users={users}
          />
        </CardContent>
        <CardFooter className="flex justify-end space-x-2">
          {shouldShowReminder && (
            <Button variant="outline" onClick={handleSendReminder}>
              Send Reminder
            </Button>
          )}
        </CardFooter>
      </Card>

      {isApprovalModalOpen && purchaseOrder && approvalAction && (
        <ApprovalActionModal
          isOpen={isApprovalModalOpen}
          onClose={handleCloseApprovalModal}
          onConfirm={handleConfirmApproval}
          entityType="PurchaseOrder"
          entityId={purchaseOrder._id}
          action={approvalAction}
        />
      )}

      {isExporting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-md shadow-lg flex items-center">
            <FaSpinner className="animate-spin mr-2 text-blue-500" />
            <span>Exporting {isExporting.toUpperCase()}... Please wait.</span>
          </div>
        </div>
      )}
      </div>
  );
};

export default PurchaseOrderDetail;
