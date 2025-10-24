import React, { useState, useMemo, useEffect } from 'react';
import type { PurchaseOrder, GoodsReceipt, User, Vendor, Material, Requisition, Permission, ExtractedGRNData } from '../types';
import { POStatus, GoodsReceiptStatus } from '../types';
import POListForGRN from './POListForGRN';
import GRNDetail from './GRNDetail';
import CreateGRNModal from './CreateGRNModal';
import { Button } from './common/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './common/Card';
import { Input } from './common/Input';
import useDebounce from '../hooks/useDebounce';
import type { EntityShortType, View } from '../App';
// Fix: Changed default import to named import for UploadDocumentModal to resolve module resolution error.
import { UploadDocumentModal } from './UploadDocumentModal';
import BulkDataReviewModal from './common/BulkDataReviewModal';
import { extractGoodsReceiptsFromDocument } from '../services/geminiService';

interface GoodsReceiptDashboardProps {
  purchaseOrders: PurchaseOrder[];
  goodsReceipts: GoodsReceipt[];
  onGRNCreated: (newGRN: GoodsReceipt) => void;
  currentUser: User | null;
  users: User[];
  vendors: Vendor[];
  materials: Material[];
  requisitions: Requisition[];
  currentUserPermissions: Permission[];
  onViewEntity: (type: EntityShortType, entityNumber: string) => void;
  initialSelectedPOId?: string | null;
  onClearInitialPOId?: () => void;
  initialSelectedGRNId?: string | null;
  onClearInitialGRNId?: () => void;
  setActiveView: (view: View) => void;
}

const ITEMS_PER_PAGE = 8;

interface GRNStatusFilterButtonProps {
    value: GoodsReceiptStatus | 'all';
    label: string;
    currentFilter: GoodsReceiptStatus | 'all';
    onClick: (value: GoodsReceiptStatus | 'all') => void;
}

const GRNStatusFilterButton: React.FC<GRNStatusFilterButtonProps> = ({ value, label, currentFilter, onClick }) => (
    <Button
        variant={currentFilter === value ? 'default' : 'outline'}
        size="sm"
        onClick={() => onClick(value)}
        className="capitalize text-xs h-8"
    >
        {label}
    </Button>
);

const GoodsReceiptDashboard: React.FC<GoodsReceiptDashboardProps> = ({
  purchaseOrders,
  goodsReceipts,
  onGRNCreated,
  currentUser,
  users,
  vendors,
  materials,
  requisitions,
  currentUserPermissions,
  onViewEntity,
  initialSelectedPOId,
  onClearInitialPOId,
  initialSelectedGRNId,
  onClearInitialGRNId,
  setActiveView,
}) => {
  const [selectedPOId, setSelectedPOId] = useState<string | null>(null);
  const [selectedGRNId, setSelectedGRNId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  // Filters for the PO List
  const [poSearchTerm, setPoSearchTerm] = useState('');
  const debouncedPoSearchTerm = useDebounce(poSearchTerm, 300);
  const [dateFilter, setDateFilter] = useState<{ start: string, end: string }>({ start: '', end: '' });
  const [poListGrnStatusFilter, setPoListGrnStatusFilter] = useState<GoodsReceiptStatus | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Filter for GRNs within a selected PO
  const [grnStatusFilter, setGrnStatusFilter] = useState<GoodsReceiptStatus | 'all'>('all');

  const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
  const [isBulkReviewModalOpen, setIsBulkReviewModalOpen] = useState(false);
  const [bulkDataToReview, setBulkDataToReview] = useState<ExtractedGRNData[] | null>(null);
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);

  // Effect for handling direct navigation to a PO
  useEffect(() => {
    if (initialSelectedPOId && onClearInitialPOId) {
      setSelectedPOId(initialSelectedPOId);
      onClearInitialPOId();
    }
  }, [initialSelectedPOId, onClearInitialPOId]);

  // Effect for handling direct navigation to a GRN, which depends on the PO being selected first
  useEffect(() => {
    if (initialSelectedGRNId && onClearInitialGRNId && selectedPOId) {
        const grn = goodsReceipts.find(g => g._id === initialSelectedGRNId);
        if (grn && grn.poId === selectedPOId) {
            setSelectedGRNId(initialSelectedGRNId);
            onClearInitialGRNId();
        }
    }
  }, [initialSelectedGRNId, onClearInitialGRNId, selectedPOId, goodsReceipts]);

  const eligiblePOs = useMemo(() => {
    let filteredPOs = purchaseOrders.filter(po => 
      [POStatus.Approved, POStatus.Invoiced, POStatus.Closed].includes(po.status)
    );

    if (debouncedPoSearchTerm) {
        filteredPOs = filteredPOs.filter(po => 
            po.poNumber.toLowerCase().includes(debouncedPoSearchTerm.toLowerCase())
        );
    }

    if (poListGrnStatusFilter !== 'all') {
        const poIdsWithMatchingGrns = new Set(
            goodsReceipts
                .filter(grn => grn.status === poListGrnStatusFilter)
                .map(grn => grn.poId)
        );
        filteredPOs = filteredPOs.filter(po => poIdsWithMatchingGrns.has(po._id));
    }

    if (dateFilter.start && dateFilter.end) {
        const startDate = new Date(dateFilter.start);
        const endDate = new Date(dateFilter.end);
        endDate.setHours(23, 59, 59, 999);

        const poIdsWithMatchingGrns = new Set(
            goodsReceipts
                .filter(grn => {
                    const receivedDate = new Date(grn.receivedDate);
                    return receivedDate >= startDate && receivedDate <= endDate;
                })
                .map(grn => grn.poId)
        );
        filteredPOs = filteredPOs.filter(po => poIdsWithMatchingGrns.has(po._id));
    }
    
    return filteredPOs.sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
  }, [purchaseOrders, goodsReceipts, debouncedPoSearchTerm, poListGrnStatusFilter, dateFilter]);
  
  const totalPages = Math.ceil(eligiblePOs.length / ITEMS_PER_PAGE);
  const paginatedPOs = useMemo(() => {
      return eligiblePOs.slice(
          (currentPage - 1) * ITEMS_PER_PAGE,
          currentPage * ITEMS_PER_PAGE
      );
  }, [eligiblePOs, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedPoSearchTerm, poListGrnStatusFilter, dateFilter]);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
        setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);


  const selectedPO = useMemo(() => {
    return purchaseOrders.find(po => po._id === selectedPOId) || null;
  }, [selectedPOId, purchaseOrders]);

  const grnsForSelectedPO = useMemo(() => {
    if (!selectedPOId) return [];
    const filtered = goodsReceipts.filter(grn => {
        if (grn.poId !== selectedPOId) return false;
        if (grnStatusFilter === 'all') return true;
        return grn.status === grnStatusFilter;
    });
    return filtered.sort((a, b) => new Date(b.receivedDate).getTime() - new Date(a.receivedDate).getTime());
  }, [selectedPOId, goodsReceipts, grnStatusFilter]);

  const selectedGRN = useMemo(() => {
    return goodsReceipts.find(grn => grn._id === selectedGRNId) || null;
  }, [selectedGRNId, goodsReceipts]);
  
  const handleSelectPO = (id: string | null) => {
    setSelectedPOId(id);
    setSelectedGRNId(null); // Clear GRN selection when PO changes
  };
  
  const handleCreateGRN = () => {
      if(selectedPO) {
          setIsCreateModalOpen(true);
      }
  }

  const handleProcessBulkDocument = async (files: File[]) => {
    setIsProcessingBulk(true);
    const allExtractedGRNs: ExtractedGRNData[] = [];
    for (const file of files) {
        const result = await extractGoodsReceiptsFromDocument(file);
        if (result?.goodsReceipts) {
            allExtractedGRNs.push(...result.goodsReceipts);
        }
    }
    setIsProcessingBulk(false);
    setIsBulkUploadModalOpen(false);

    if (allExtractedGRNs.length > 0) {
        setBulkDataToReview(allExtractedGRNs);
        setIsBulkReviewModalOpen(true);
    } else {
        alert('Failed to extract any Goods Receipts from the document(s). Please check the file format and try again.');
    }
  };

  const handleConfirmBulkUpload = (reviewedData: ExtractedGRNData[]) => {
    if (!reviewedData) return;

    let skippedCount = 0;
    reviewedData.forEach(extractedGRN => {
        const po = purchaseOrders.find(p => p.poNumber === extractedGRN.poNumber);
        const receivedBy = users.find(u => u.name.toLowerCase() === extractedGRN.receivedByName.toLowerCase());
        if (!po || !receivedBy) {
            skippedCount++;
            return;
        }

        const itemsForNewGRN = extractedGRN.items.map(item => {
            const poLine = po.lines.find(l => l.description === item.description || materials.find(m => m._id === l.materialId)?.sku === item.sku);
            return {
                _id: `GRNI-BULK-${Date.now()}${Math.random()}`,
                poLineId: poLine?._id || 'UNKNOWN',
                materialId: poLine?.materialId || 'UNKNOWN',
                description: poLine?.description || item.description,
                orderedQty: poLine?.quantity || 0,
                receivedQty: item.receivedQty,
                acceptedQty: item.acceptedQty,
                rejectedQty: item.rejectedQty,
                rejectionReason: item.rejectionReason,
            };
        });

        const totalAccepted = itemsForNewGRN.reduce((sum, item) => sum + item.acceptedQty, 0);
        const totalRejected = itemsForNewGRN.reduce((sum, item) => sum + item.rejectedQty, 0);
        let grnStatus: GoodsReceiptStatus = totalRejected > 0 ? GoodsReceiptStatus.Partial : GoodsReceiptStatus.Accepted;
        if (totalAccepted === 0 && totalRejected > 0) grnStatus = GoodsReceiptStatus.Rejected;

        const newGRN: GoodsReceipt = {
            _id: `GRN-BULK-${Date.now()}${Math.random()}`,
            grnNumber: extractedGRN.grnNumber || `GRN-BULK-${Date.now()}`,
            poId: po._id,
            receivedDate: new Date(extractedGRN.receivedDate).toISOString(),
            receivedById: receivedBy._id,
            status: grnStatus,
            notes: extractedGRN.notes || '',
            items: itemsForNewGRN,
        };
        onGRNCreated(newGRN);
    });

    if (skippedCount > 0) {
        alert(`${skippedCount} GRN(s) were skipped due to missing PO or User references.`);
    }

    setIsBulkReviewModalOpen(false);
    setBulkDataToReview(null);
  };


  return (
    <div className="relative h-full">
      <div className="flex flex-col gap-6 h-full">
        <div className="flex justify-between items-center">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Goods Receipt</h1>
                <p className="text-muted-foreground">Receive items against approved purchase orders.</p>
            </div>
            <div className="flex items-center space-x-2">
                {currentUserPermissions.includes('CREATE_GRN') && (
                    <>
                        <Button variant="outline" size="sm" onClick={() => setIsBulkUploadModalOpen(true)}>Bulk Upload</Button>
                        {selectedPO && <Button size="sm" onClick={handleCreateGRN}>Create Goods Receipt</Button>}
                    </>
                )}
            </div>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filter Purchase Orders</CardTitle>
            <CardDescription className="text-sm">Find POs by their number or by properties of their associated goods receipts.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-end gap-4">
            <div className="flex-grow min-w-[200px]">
              <label htmlFor="po-search" className="text-sm font-medium mb-1 block">PO Number</label>
              <Input id="po-search" placeholder="Search PO..." value={poSearchTerm} onChange={e => setPoSearchTerm(e.target.value)} />
            </div>
            <div>
              <label htmlFor="grn-status-filter" className="text-sm font-medium mb-1 block">GRN Status</label>
              <select id="grn-status-filter" value={poListGrnStatusFilter} onChange={e => setPoListGrnStatusFilter(e.target.value as any)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background">
                <option value="all">All Statuses</option>
                {Object.values(GoodsReceiptStatus).map(status => <option key={status} value={status}>{status}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="date-start" className="text-sm font-medium mb-1 block">Received From</label>
              <Input id="date-start" type="date" value={dateFilter.start} onChange={e => setDateFilter(prev => ({ ...prev, start: e.target.value }))} />
            </div>
            <div>
              <label htmlFor="date-end" className="text-sm font-medium mb-1 block">Received To</label>
              <Input id="date-end" type="date" value={dateFilter.end} onChange={e => setDateFilter(prev => ({ ...prev, end: e.target.value }))} />
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-grow">
            <div className="lg:col-span-1">
                <POListForGRN
                  purchaseOrders={paginatedPOs}
                  vendors={vendors}
                  selectedPOId={selectedPOId}
                  onSelectPO={handleSelectPO}
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
            </div>
            <div className="lg:col-span-2 flex flex-col gap-6">
                <Card>
                   <CardHeader>
                    <CardTitle>Receipts for {selectedPO ? selectedPO.poNumber : '...'}</CardTitle>
                     {selectedPO ? (
                        <div className="flex flex-wrap items-center gap-2 pt-2">
                            <GRNStatusFilterButton value="all" label="All" currentFilter={grnStatusFilter} onClick={setGrnStatusFilter} />
                            <GRNStatusFilterButton value={GoodsReceiptStatus.Accepted} label="Accepted" currentFilter={grnStatusFilter} onClick={setGrnStatusFilter} />
                            <GRNStatusFilterButton value={GoodsReceiptStatus.Rejected} label="Rejected" currentFilter={grnStatusFilter} onClick={setGrnStatusFilter} />
                            <GRNStatusFilterButton value={GoodsReceiptStatus.Partial} label="Partial" currentFilter={grnStatusFilter} onClick={setGrnStatusFilter} />
                        </div>
                    ) : (
                        <CardDescription>Select a PO to view associated receipts.</CardDescription>
                    )}
                   </CardHeader>
                   <CardContent>
                    {selectedPO ? (
                        <div>
                            {grnsForSelectedPO.length > 0 ? (
                                <ul className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                                   {grnsForSelectedPO.map(grn => (
                                       <li key={grn._id} 
                                           onClick={() => setSelectedGRNId(grn._id)}
                                           className={`p-3 rounded-md border cursor-pointer ${selectedGRNId === grn._id ? 'bg-primary/10 border-primary' : 'bg-muted/50 hover:bg-accent'}`}
                                        >
                                           <p className="font-semibold text-primary">{grn.grnNumber}</p>
                                           <p className="text-sm text-muted-foreground">Received on: {new Date(grn.receivedDate).toLocaleDateString()}</p>
                                       </li>
                                   ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-md">No goods receipts found for the current filter.</p>
                            )}
                        </div>
                    ) : (
                         <div className="flex items-center justify-center h-48">
                            <p className="text-muted-foreground">Select a Purchase Order to begin.</p>
                        </div>
                    )}
                   </CardContent>
                </Card>
                
                {selectedGRN && (
                    <GRNDetail
                        goodsReceipt={selectedGRN}
                        purchaseOrder={selectedPO}
                        users={users}
                        vendors={vendors}
                    />
                )}
            </div>
        </div>
      </div>

      {selectedPO && (
        <CreateGRNModal 
            isOpen={isCreateModalOpen}
            onClose={() => setIsCreateModalOpen(false)}
            purchaseOrder={selectedPO}
            existingGRNs={grnsForSelectedPO}
            currentUser={currentUser}
            users={users}
            onSave={onGRNCreated}
        />
      )}
       <UploadDocumentModal
          isOpen={isBulkUploadModalOpen}
          onClose={() => setIsBulkUploadModalOpen(false)}
          onProcess={handleProcessBulkDocument}
          isProcessing={isProcessingBulk}
          multiple={true}
          title="Bulk Upload Goods Receipts"
          description="Upload one or more CSV or PDF delivery notes."
      />
      <BulkDataReviewModal
          isOpen={isBulkReviewModalOpen}
          onClose={() => setIsBulkReviewModalOpen(false)}
          onConfirm={handleConfirmBulkUpload}
          initialData={bulkDataToReview}
          entityType="goodsReceipts"
      />
    </div>
  );
};

export default GoodsReceiptDashboard;