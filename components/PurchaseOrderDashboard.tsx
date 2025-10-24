

import React, { useState, useMemo, useEffect } from 'react';
import type { PurchaseOrder, Vendor, Material, ExtractedPOData, User, Task, Requisition, RFQ, Permission, Role, POTemplate, DocumentTemplate, GoodsReceipt, Invoice, Currency } from '../types';
import { POStatus, ApprovalStepStatus } from '../types';
import PurchaseOrderList from './PurchaseOrderList';
import PurchaseOrderDetail from './PurchaseOrderDetail';
import CreatePOModal from './CreatePOModal';
// Fix: Changed default import to named import for UploadDocumentModal to resolve module resolution error.
import { UploadDocumentModal } from './UploadDocumentModal';
import ExtractedDataReviewModal from './ExtractedDataReviewModal';
import type { ReviewFormData } from './ExtractedDataReviewModal';
import MaterialModal from './MaterialModal';
import { Button } from './common/Button';
import { Input } from './common/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './common/Card';
import { extractPODataFromDocument, extractPurchaseOrdersFromDocument } from '../services/geminiService';
import { sendApprovalRequestEmail, sendPOApprovalReminderEmail } from '../services/emailService';
import useDebounce from '../hooks/useDebounce';
import Fuse from 'fuse.js';
import type { EntityType, View, EntityShortType } from '../App';
import BulkDataReviewModal from './common/BulkDataReviewModal';
import ApprovalActionModal from './common/ApprovalActionModal';
import CurrencySwitcher from './common/CurrencySwitcher';

interface PurchaseOrderDashboardProps {
  purchaseOrders: PurchaseOrder[];
  setPurchaseOrders: React.Dispatch<React.SetStateAction<PurchaseOrder[]>>;
  vendors: Vendor[];
  materials: Material[];
  setMaterials: React.Dispatch<React.SetStateAction<Material[]>>;
  currentUser: User | null;
  users: User[];
  requisitions: Requisition[];
  rfqs: RFQ[];
  roles: Role[];
  onApprovalAction: (entityType: EntityType, entityId: string, action: 'Approve' | 'Reject', comments: string) => void;
  onMarkAsReviewed: (poId: string) => void;
  onViewRFQ: (rfqId: string) => void;
  setActiveView: (view: View) => void;
  currentUserPermissions: Permission[];
  initialSelectedPOId?: string | null;
  onClearInitialPOId?: () => void;
  onViewEntity: (type: EntityShortType, entityNumber: string) => void;
  rates: Record<string, number> | null;
  templateToUse: POTemplate | null;
  onClearTemplateToUse: () => void;
  poTemplates: POTemplate[];
  documentTemplates: DocumentTemplate[];
  goodsReceipts: GoodsReceipt[];
  invoices: Invoice[];
  displayCurrency: Currency;
  setDisplayCurrency: (currency: Currency) => void;
}

type POSortableKey = 'poNumber' | 'vendorName' | 'orderDate' | 'totalAmount' | 'status';
interface SortConfig {
    key: POSortableKey;
    direction: 'ascending' | 'descending';
}

const ITEMS_PER_PAGE = 10;

const PurchaseOrderDashboard: React.FC<PurchaseOrderDashboardProps> = ({ purchaseOrders, setPurchaseOrders, vendors, materials, setMaterials, currentUser, users, requisitions, rfqs, roles, onApprovalAction, onMarkAsReviewed, onViewRFQ, setActiveView, currentUserPermissions, initialSelectedPOId, onClearInitialPOId, onViewEntity, rates, templateToUse, onClearTemplateToUse, poTemplates, documentTemplates, goodsReceipts, invoices, displayCurrency, setDisplayCurrency }) => {
  const [selectedPOId, setSelectedPOId] = useState<string | null>(null);
  const [editingPO, setEditingPO] = useState<Partial<PurchaseOrder> | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isBulkReviewModalOpen, setIsBulkReviewModalOpen] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedPOData | null>(null);
  const [bulkExtractedData, setBulkExtractedData] = useState<ExtractedPOData[] | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [newlyCreatedMaterial, setNewlyCreatedMaterial] = useState<{ id: string, lineIndex: number } | null>(null);
  const [materialModalLineIndex, setMaterialModalLineIndex] = useState<number | null>(null);
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'orderDate', direction: 'descending' });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPOIds, setSelectedPOIds] = useState<string[]>([]);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'Approve' | 'Reject' | null>(null);
  const [filterAwaitingReview, setFilterAwaitingReview] = useState(false);
  const [statusFilter, setStatusFilter] = useState<POStatus | 'all'>('all');
  const [dateFilter, setDateFilter] = useState<{ start: string; end: string }>({ start: '', end: '' });

  const canCreatePO = currentUserPermissions.includes('CREATE_PO');

  useEffect(() => {
    if (templateToUse) {
      setEditingPO(templateToUse);
      setIsCreateModalOpen(true);
      onClearTemplateToUse();
    }
  }, [templateToUse, onClearTemplateToUse]);
  
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  useEffect(() => {
    if (initialSelectedPOId && onClearInitialPOId) {
      setSelectedPOId(initialSelectedPOId);
      onClearInitialPOId();
    }
  }, [initialSelectedPOId, onClearInitialPOId]);
  
  const searchablePOs = useMemo(() =>
    purchaseOrders.map(po => ({
      ...po,
      vendorName: vendors.find(s => s._id === po.vendorId)?.name || 'Unknown',
    })), [purchaseOrders, vendors]);
  
  const fuse = useMemo(() => new Fuse(searchablePOs, {
    keys: ['poNumber', 'vendorName', 'status'],
    includeScore: true,
    threshold: 0.4,
  }), [searchablePOs]);

  const sortedPOs = useMemo(() => {
    let items = debouncedSearchTerm
      ? fuse.search(debouncedSearchTerm).map(result => result.item)
      : searchablePOs;
    
    if (statusFilter !== 'all') {
        items = items.filter(po => po.status === statusFilter);
    }

    if (dateFilter.start) {
        const startDate = new Date(dateFilter.start);
        startDate.setHours(0, 0, 0, 0);
        items = items.filter(po => new Date(po.orderDate) >= startDate);
    }
    if (dateFilter.end) {
        const endDate = new Date(dateFilter.end);
        endDate.setHours(23, 59, 59, 999);
        items = items.filter(po => new Date(po.orderDate) <= endDate);
    }
    
    if (filterAwaitingReview) {
        items = items.filter(po => {
            // If the current user is a Requester (roleId 'R001'), they should see all their own POs.
            if (currentUser && currentUser.roleId === 'R001') {
                return po.requesterId === currentUser?._id;
            }
            // For other roles, or if not the requester's PO, apply the standard 'awaiting review' filter
            return (po.status === POStatus.PendingL1Approval || po.status === POStatus.PendingL2Approval) &&
                   !po.reviewedById &&
                   po.requesterId !== currentUser?._id;
        });
    }
    
    const sortedItems = [...items];
    if (sortConfig) {
      sortedItems.sort((a, b) => {
          const aValue = a[sortConfig.key];
          const bValue = b[sortConfig.key];
          if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
          if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
          return 0;
      });
    } else {
      // Default sort if sortConfig is null
      sortedItems.sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
    }
    return sortedItems;
  }, [searchablePOs, debouncedSearchTerm, sortConfig, fuse, filterAwaitingReview, currentUser, statusFilter, dateFilter]);

  const totalPages = Math.ceil(sortedPOs.length / ITEMS_PER_PAGE);

  const paginatedPOs = useMemo(() => {
      return sortedPOs.slice(
          (currentPage - 1) * ITEMS_PER_PAGE,
          currentPage * ITEMS_PER_PAGE
      );
  }, [sortedPOs, currentPage]);
  
  useEffect(() => {
    setCurrentPage(1);
    setSelectedPOIds([]);
  }, [debouncedSearchTerm, sortConfig, filterAwaitingReview, statusFilter, dateFilter]);

  useEffect(() => {
      if (currentPage > totalPages && totalPages > 0) {
          setCurrentPage(totalPages);
      }
  }, [currentPage, totalPages]);


  const selectedPO = useMemo(() => {
    return purchaseOrders.find(po => po._id === selectedPOId) || null;
  }, [selectedPOId, purchaseOrders]);

  const handleSelectPO = (id: string | null) => {
    setSelectedPOId(id);
  };

  const handleEdit = (po: PurchaseOrder) => {
    setEditingPO(po);
    setIsCreateModalOpen(true);
  };

  const handleDuplicate = (po: PurchaseOrder) => {
    const { _id, poNumber, status, createdAt, approvedAt, approvalWorkflow, tasks, ...duplicatableData } = po;
    setEditingPO({ ...duplicatableData, notes: `Duplicate of ${poNumber}\n\n${duplicatableData.notes || ''}` });
    setIsCreateModalOpen(true);
  };

  const handleSavePO = (poData: Omit<PurchaseOrder, '_id' | 'poNumber' | 'status' | 'requesterId'>, id: string | null) => {
    if (id) { // Editing
      setPurchaseOrders(prevPOs =>
        prevPOs.map(po => (po._id === id ? { ...po, ...poData } : po))
      );
    } else { // Creating
      if (!currentUser) return;
      const newPO: PurchaseOrder = {
        ...poData,
        _id: `PO${Date.now()}`,
        poNumber: `PO-2024-00${Math.floor(Math.random() * 1000) + 750}`,
        status: POStatus.Draft,
        requesterId: currentUser._id,
        createdAt: new Date().toISOString(),
      };
      setPurchaseOrders(prevPOs => [newPO, ...prevPOs]);
      setSelectedPOId(newPO._id);
    }
    setIsCreateModalOpen(false);
  };

  const handleSubmitForApproval = (poId: string) => {
    let poToSubmit: PurchaseOrder | undefined;
    
    setPurchaseOrders(prevPOs =>
      prevPOs.map(po => {
        if (po._id === poId) {
            poToSubmit = { ...po, status: POStatus.PendingL1Approval };
            return poToSubmit;
        }
        return po;
      })
    );
    
    if (poToSubmit) {
      const l1Approvers = users.filter(u => {
          const userRole = roles.find(r => r._id === u.roleId);
          return userRole?.permissions.includes('APPROVE_PO');
      });
      const vendorName = vendors.find(s => s._id === poToSubmit!.vendorId)?.name || 'N/A';
      sendApprovalRequestEmail(poToSubmit, l1Approvers, vendorName, 'L1 Approval Required');
      alert('PO submitted for Level 1 approval.');
    }
  };

  const handleUpdateTasks = (poId: string, tasks: Task[]) => {
      setPurchaseOrders(prevPOs =>
        prevPOs.map(po => (po._id === poId ? { ...po, tasks } : po))
      );
  };

  const handleProcessDocument = async (files: File[]) => {
      const file = files[0];
      if (!file) return;
      setIsProcessing(true);
      const data = await extractPODataFromDocument(file, vendors, materials);
      setIsProcessing(false);
      setIsUploadModalOpen(false);
      if (data) {
          setExtractedData(data);
          setIsReviewModalOpen(true);
      } else {
          alert("Failed to extract data from the document. Please ensure it's a clear PO and try again.");
      }
  };

   const handleProcessBulkDocument = async (files: File[]) => {
      const file = files[0];
      if (!file) return;
      setIsProcessing(true);
      const data = await extractPurchaseOrdersFromDocument(file);
      setIsProcessing(false);
      setIsBulkUploadModalOpen(false);
      if (data && data.purchaseOrders.length > 0) {
          setBulkExtractedData(data.purchaseOrders);
          setIsBulkReviewModalOpen(true);
      } else {
          alert("Failed to extract any Purchase Orders from the document. Please check the file format and try again.");
      }
  };

  const handleConfirmExtraction = (data: ReviewFormData) => {
    if (!currentUser) return;
    const { supplierName, lines, poNo, issueDate } = data;
    const vendor = vendors.find(s => s.name === supplierName);

    const newPO: PurchaseOrder = {
      _id: `PO-EXT-${Date.now()}`,
      poNumber: poNo || `DRAFT-PO-${Date.now()}`,
      vendorId: vendor?._id || '',
      requesterId: currentUser._id,
      orderDate: issueDate ? new Date(issueDate).toISOString() : new Date().toISOString(),
      deliveryDate: new Date(new Date().setDate(new Date().getDate() + 14)).toISOString(),
      status: POStatus.Draft,
      currency: vendor?.defaultCurrency || 'USD',
      lines: lines.map((line, i) => {
        const material = materials.find(m => m._id === line.materialId);
        return {
          _id: `L-EXT-${Date.now()}-${i}`,
          materialId: line.materialId,
          description: material?.description || line.originalDescription,
          quantity: line.qty,
          uom: material?.uom || 'EA',
          unitPrice: line.unitPrice,
          totalPrice: line.qty * line.unitPrice,
        };
      }),
      subtotal: 0, taxRate: 0, taxAmount: 0, totalAmount: 0, // These will be recalculated
    };

    const subtotal = newPO.lines.reduce((sum, line) => sum + line.totalPrice, 0);
    const taxRate = 8.25; // Example tax rate
    const taxAmount = subtotal * (taxRate / 100);
    newPO.subtotal = subtotal;
    newPO.taxRate = taxRate;
    newPO.taxAmount = taxAmount;
    newPO.totalAmount = subtotal + taxAmount;

    setPurchaseOrders(prev => [newPO, ...prev]);
    setSelectedPOId(newPO._id);
    setIsReviewModalOpen(false);
    setExtractedData(null);
  };
  
  const handleConfirmBulkExtraction = (data: ExtractedPOData[]) => {
    if (!currentUser) return;
    const newPOs: PurchaseOrder[] = data.map(poData => {
        const vendor = vendors.find(v => v.name.toLowerCase() === poData.supplierName.toLowerCase());
        const subtotal = poData.lines.reduce((sum, line) => sum + (line.qty * line.unitPrice), 0);
        const taxRate = 8.25; // Example tax rate
        const taxAmount = subtotal * (taxRate / 100);
        const totalAmount = subtotal + taxAmount;

        return {
            _id: `PO-BULK-${Date.now()}${Math.random()}`,
            poNumber: poData.poNo || `DRAFT-PO-${Date.now()}${Math.random()}`,
            vendorId: vendor?._id || 'UNKNOWN',
            requesterId: currentUser._id,
            orderDate: new Date(poData.issueDate).toISOString(),
            deliveryDate: new Date(new Date(poData.issueDate).setDate(new Date(poData.issueDate).getDate() + 14)).toISOString(),
            status: POStatus.Draft,
            currency: vendor?.defaultCurrency || 'USD',
            lines: poData.lines.map((line, i) => {
                const material = materials.find(m => m.sku === line.sku || m.description.toLowerCase() === line.description.toLowerCase());
                return {
                    _id: `L-BULK-${Date.now()}-${i}-${Math.random()}`,
                    materialId: material?._id || 'UNKNOWN',
                    description: material?.description || line.description,
                    quantity: line.qty,
                    uom: material?.uom || 'EA',
                    unitPrice: line.unitPrice,
                    totalPrice: line.qty * line.unitPrice,
                };
            }),
            subtotal, taxRate, taxAmount, totalAmount,
        };
    });
    setPurchaseOrders(prev => [...newPOs, ...prev]);
    setIsBulkReviewModalOpen(false);
    setBulkExtractedData(null);
  };

  const handleOpenMaterialModal = (lineIndex: number) => {
    setMaterialModalLineIndex(lineIndex);
    setIsMaterialModalOpen(true);
  };

  const handleSaveMaterial = (materialData: Omit<Material, '_id'>, id: string | null) => {
    const newMaterial: Material = { ...materialData, _id: `M${Date.now()}` };
    setMaterials(prev => [newMaterial, ...prev]);
    if (materialModalLineIndex !== null) {
        setNewlyCreatedMaterial({ id: newMaterial._id, lineIndex: materialModalLineIndex });
    }
    setIsMaterialModalOpen(false);
    setMaterialModalLineIndex(null);
  };
  
  const requestSort = (key: POSortableKey) => {
      if (sortConfig && sortConfig.key === key) {
          if (sortConfig.direction === 'ascending') {
              setSortConfig({ key, direction: 'descending' });
          } else {
              setSortConfig(null); 
          }
      } else {
          setSortConfig({ key, direction: 'ascending' });
      }
  };

  const handleBulkApproveReject = (action: 'Approve' | 'Reject') => {
      setApprovalAction(action);
      setIsApprovalModalOpen(true);
  };

  const handleSubmitBulkApproval = (comments: string) => {
      if (approvalAction) {
          selectedPOIds.forEach(poId => {
              onApprovalAction('Purchase Order', poId, approvalAction, comments);
          });
      }
      setSelectedPOIds([]); // Clear selection
  };
  
  return (
    <div className="relative h-full">
      <div className="flex flex-col gap-6 h-full">
        <div className="flex justify-between items-center">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Purchase Orders</h1>
            </div>
            <div className="flex items-center space-x-4">
                <CurrencySwitcher displayCurrency={displayCurrency} setDisplayCurrency={setDisplayCurrency} rates={rates} />
                {canCreatePO && (
                    <div className="flex items-center space-x-2">
                        <Button size="sm" variant="outline" onClick={() => setIsBulkUploadModalOpen(true)}>Bulk Upload</Button>
                        <Button size="sm" variant="outline" onClick={() => setIsUploadModalOpen(true)}>Create from Doc</Button>
                        <Button size="sm" onClick={() => setIsCreateModalOpen(true)}>Create New PO</Button>
                    </div>
                )}
            </div>
        </div>
        <div className="space-y-4 flex-grow flex flex-col">
          <Card>
            <CardHeader>
                <CardTitle>Filter & Find Purchase Orders</CardTitle>
                <CardDescription>Search, filter by status or date, or use the bulk approval feature.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
                    <div className="sm:col-span-2 md:col-span-1">
                        <label htmlFor="po-search" className="text-sm font-medium mb-1 block">Search</label>
                        <div className="relative">
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            <Input
                                id="po-search"
                                type="text"
                                placeholder="PO #, Vendor..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="po-status-filter" className="text-sm font-medium mb-1 block">Status</label>
                        <select
                            id="po-status-filter"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as any)}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                        >
                            <option value="all">All Statuses</option>
                            {Object.values(POStatus).map(status => (
                                <option key={status} value={status}>{status}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="po-date-start" className="text-sm font-medium mb-1 block">Order Date From</label>
                        <Input id="po-date-start" type="date" value={dateFilter.start} onChange={e => setDateFilter(prev => ({ ...prev, start: e.target.value }))} />
                    </div>
                    <div>
                        <label htmlFor="po-date-end" className="text-sm font-medium mb-1 block">Order Date To</label>
                        <Input id="po-date-end" type="date" value={dateFilter.end} onChange={e => setDateFilter(prev => ({ ...prev, end: e.target.value }))} />
                    </div>
                </div>
                 <div className="flex justify-between items-center flex-wrap gap-4 pt-4 border-t">
                    <div className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            id="awaiting-review-filter"
                            checked={filterAwaitingReview}
                            onChange={(e) => setFilterAwaitingReview(e.target.checked)}
                            className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                        />
                        <label htmlFor="awaiting-review-filter" className="text-sm font-medium">
                            Awaiting my review
                        </label>
                    </div>
                    {selectedPOIds.length > 0 && (
                        <div className="flex items-center gap-4">
                            <span className="text-sm font-medium">{selectedPOIds.length} PO(s) selected</span>
                            <div className="flex items-center gap-2">
                               <Button size="sm" onClick={() => handleBulkApproveReject('Approve')}>Approve</Button>
                               <Button size="sm" variant="destructive" onClick={() => handleBulkApproveReject('Reject')}>Reject</Button>
                               <Button size="sm" variant="outline" onClick={() => setSelectedPOIds([])}>Cancel</Button>
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
          </Card>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-grow">
            <div className="lg:col-span-1">
              <PurchaseOrderList
                purchaseOrders={paginatedPOs}
                vendors={vendors}
                users={users}
                selectedPOId={selectedPOId}
                onSelectPO={handleSelectPO}
                selectedPOIds={selectedPOIds}
                onSelectedPOIdsChange={setSelectedPOIds}
                currentUser={currentUser}
                currentUserPermissions={currentUserPermissions}
                sortConfig={sortConfig!}
                requestSort={requestSort}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                displayCurrency={displayCurrency}
                rates={rates}
              />
            </div>
            <div className="lg:col-span-2">
              {selectedPO && (
                <PurchaseOrderDetail
                  purchaseOrder={selectedPO}
                  vendors={vendors}
                  currentUser={currentUser}
                  users={users}
                  materials={materials}
                  onEdit={handleEdit}
                  onDuplicate={handleDuplicate}
                  onApprovalAction={onApprovalAction}
                  onMarkAsReviewed={onMarkAsReviewed}
                  onSubmitForApproval={handleSubmitForApproval}
                  onUpdateTasks={handleUpdateTasks}
                  requisitions={requisitions}
                  rfqs={rfqs}
                  onViewRFQ={onViewRFQ}
                  currentUserPermissions={currentUserPermissions}
                  rates={rates}
                  documentTemplates={documentTemplates}
                  goodsReceipts={goodsReceipts}
                  invoices={invoices}
                  onViewEntity={onViewEntity}
                  displayCurrency={displayCurrency}
                />
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Modals */}
      <CreatePOModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleSavePO}
        vendors={vendors}
        materials={materials}
        initialData={editingPO}
        onOpenCreateMaterial={handleOpenMaterialModal}
        newlyCreatedMaterial={newlyCreatedMaterial}
        setNewlyCreatedMaterial={setNewlyCreatedMaterial}
        rates={rates}
        poTemplates={poTemplates}
      />
       <UploadDocumentModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onProcess={handleProcessDocument}
        isProcessing={isProcessing}
        title="Create PO from Document"
        description="Upload a PDF, JPG, or PNG of a quote or PO to automatically extract data."
      />
       <UploadDocumentModal
        isOpen={isBulkUploadModalOpen}
        onClose={() => setIsBulkUploadModalOpen(false)}
        onProcess={handleProcessBulkDocument}
        isProcessing={isProcessing}
        title="Bulk Upload Purchase Orders"
        description="Upload a CSV or a multi-page PDF containing PO data."
      />
      {extractedData && (
        <ExtractedDataReviewModal
          isOpen={isReviewModalOpen}
          onClose={() => setIsReviewModalOpen(false)}
          onConfirm={handleConfirmExtraction}
          initialData={extractedData}
          vendors={vendors}
          materials={materials}
          onCreateNewMaterial={(desc, lineIndex) => {
            setMaterialModalLineIndex(lineIndex);
            setIsMaterialModalOpen(true);
            setIsReviewModalOpen(false); // Close review modal while creating material
          }}
        />
      )}
      {bulkExtractedData && (
        <BulkDataReviewModal
            isOpen={isBulkReviewModalOpen}
            onClose={() => setIsBulkReviewModalOpen(false)}
            onConfirm={handleConfirmBulkExtraction}
            initialData={bulkExtractedData}
            entityType="purchaseOrders"
        />
      )}
       <MaterialModal
        isOpen={isMaterialModalOpen}
        onClose={() => {
          setIsMaterialModalOpen(false);
          setIsReviewModalOpen(true); // Re-open review modal
        }}
        onSave={handleSaveMaterial}
        initialData={null}
      />
       {approvalAction && selectedPOIds.length > 0 && (
          <ApprovalActionModal
              isOpen={isApprovalModalOpen}
              onClose={() => setIsApprovalModalOpen(false)}
              onSubmit={handleSubmitBulkApproval}
              action={approvalAction}
          />
       )}
    </div>
  );
};

export default PurchaseOrderDashboard;