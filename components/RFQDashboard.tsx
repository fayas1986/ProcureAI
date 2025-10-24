import React, { useState, useMemo, useEffect } from 'react';
import type { RFQ, Requisition, Vendor, Material, User, Quotation, PurchaseOrder, Permission, ExtractedRFQData, Currency } from '../types';
import { RFQStatus, RequisitionStatus, POStatus, RFQVendorResponseStatus } from '../types';
import RFQList from './RFQList';
import RFQDetail from './RFQDetail';
import CreatePOModal from './CreatePOModal';
import SubmitQuotationModal from './SubmitQuotationModal';
import ConfirmationDialog from './common/ConfirmationDialog';
import { Button } from './common/Button';
import { Input } from './common/Input';
import useDebounce from '../hooks/useDebounce';
import Fuse from 'fuse.js';
import type { EntityShortType, View } from '../App';
// Fix: Changed default import to named import for UploadDocumentModal to resolve module resolution error.
import { UploadDocumentModal } from './UploadDocumentModal';
import BulkDataReviewModal from './common/BulkDataReviewModal';
import { extractRFQsFromDocument } from '../services/geminiService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './common/Card';
import CurrencySwitcher from './common/CurrencySwitcher';
import CreateRFQModal from './CreateRFQModal';

interface RFQDashboardProps {
  rfqs: RFQ[];
  setRfqs: React.Dispatch<React.SetStateAction<RFQ[]>>;
  requisitions: Requisition[];
  vendors: Vendor[];
  materials: Material[];
  currentUser: User | null;
  onRFQCreated: (newRFQ: RFQ) => void;
  onQuotationSubmitted: (rfqId: string, vendorId: string, quotation: Quotation) => void;
  onAwardAndCreatePO: (newPO: PurchaseOrder, sourcePRId?: string, sourceRfqId?: string) => void;
  initialSelectedRfqId?: string | null;
  onClearInitialRfqId?: () => void;
  currentUserPermissions: Permission[];
  onViewEntity: (type: EntityShortType, entityNumber: string) => void;
  rates: Record<string, number> | null;
  setActiveView: (view: View) => void;
  displayCurrency: Currency;
  setDisplayCurrency: (currency: Currency) => void;
}

const ITEMS_PER_PAGE = 10;
type RFQSortableKey = 'rfqNumber' | 'prNumber' | 'issuedDate' | 'dueDate' | 'status';
interface SortConfig {
    key: RFQSortableKey;
    direction: 'ascending' | 'descending';
}

const RFQDashboard: React.FC<RFQDashboardProps> = (props) => {
  const { rfqs, setRfqs, requisitions, vendors, materials, currentUser, onRFQCreated, onQuotationSubmitted, onAwardAndCreatePO, initialSelectedRfqId, onClearInitialRfqId, currentUserPermissions, onViewEntity, rates, setActiveView, displayCurrency, setDisplayCurrency } = props;

  const [selectedRFQId, setSelectedRFQId] = useState<string | null>(null);
  const [selectedRfqIds, setSelectedRfqIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<RFQStatus | 'all'>('all');
  const [dateFilter, setDateFilter] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [vendorStatusFilter, setVendorStatusFilter] = useState<RFQVendorResponseStatus | 'all'>('all');
  const [isSubmitQuoteModalOpen, setIsSubmitQuoteModalOpen] = useState(false);
  const [quoteVendorInfo, setQuoteVendorInfo] = useState<{ rfq: RFQ; vendorId: string } | null>(null);
  const [rfqToAward, setRfqToAward] = useState<{ rfq: RFQ, winningQuote: Quotation } | null>(null);
  const [isConfirmCloseOpen, setIsConfirmCloseOpen] = useState(false);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'issuedDate', direction: 'descending' });

  const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
  const [isBulkReviewModalOpen, setIsBulkReviewModalOpen] = useState(false);
  const [bulkDataToReview, setBulkDataToReview] = useState<ExtractedRFQData[] | null>(null);
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);
  
  const [editingRFQ, setEditingRFQ] = useState<RFQ | null>(null);
  const [isRFQModalOpen, setIsRFQModalOpen] = useState(false);

  const handleEditRFQ = (rfq: RFQ) => {
    setEditingRFQ(rfq);
    setIsRFQModalOpen(true);
  };

  const handleSaveEditedRFQ = (updatedRFQ: RFQ) => {
    setRfqs(prevRfqs => prevRfqs.map(r => r._id === updatedRFQ._id ? updatedRFQ : r));
    setIsRFQModalOpen(false);
    setEditingRFQ(null);
  };


  useEffect(() => {
    if (initialSelectedRfqId && onClearInitialRfqId) {
      setSelectedRFQId(initialSelectedRfqId);
      onClearInitialRfqId();
    }
  }, [initialSelectedRfqId, onClearInitialRfqId]);

  const searchableRFQs = useMemo(() =>
    rfqs.map(rfq => ({
      ...rfq,
      prNumber: requisitions.find(pr => pr._id === rfq.requisitionId)?.prNumber || 'N/A',
    })), [rfqs, requisitions]);

  const fuse = useMemo(() => new Fuse(searchableRFQs, {
    keys: ['rfqNumber', 'prNumber'],
    includeScore: true,
    threshold: 0.4,
  }), [searchableRFQs]);
  
  const filteredRFQs = useMemo(() => {
    let items = debouncedSearchTerm
      ? fuse.search(debouncedSearchTerm).map(result => result.item)
      : searchableRFQs;
    
    if (statusFilter !== 'all') {
      items = items.filter(rfq => rfq.status === statusFilter);
    }

    if (dateFilter.start) {
        const startDate = new Date(dateFilter.start);
        startDate.setHours(0, 0, 0, 0);
        items = items.filter(rfq => new Date(rfq.issuedDate) >= startDate);
    }
    if (dateFilter.end) {
        const endDate = new Date(dateFilter.end);
        endDate.setHours(23, 59, 59, 999);
        items = items.filter(rfq => new Date(rfq.issuedDate) <= endDate);
    }
    
    return [...items].sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
    });
  }, [searchableRFQs, debouncedSearchTerm, statusFilter, dateFilter, sortConfig, fuse]);
  
  const totalPages = Math.ceil(filteredRFQs.length / ITEMS_PER_PAGE);

  const paginatedRFQs = useMemo(() => {
      return filteredRFQs.slice(
          (currentPage - 1) * ITEMS_PER_PAGE,
          currentPage * ITEMS_PER_PAGE
      );
  }, [filteredRFQs, currentPage]);
  
  const requestSort = (key: RFQSortableKey) => {
      if (sortConfig && sortConfig.key === key) {
          if (sortConfig.direction === 'ascending') {
              setSortConfig({ key, direction: 'descending' });
          } else {
              setSortConfig({ key: 'issuedDate', direction: 'descending' }); 
          }
      } else {
          setSortConfig({ key, direction: 'ascending' });
      }
  };

  useEffect(() => {
      setCurrentPage(1);
      setSelectedRfqIds([]);
  }, [debouncedSearchTerm, statusFilter, dateFilter]);
  
  useEffect(() => {
      if (currentPage > totalPages && totalPages > 0) {
          setCurrentPage(totalPages);
      }
  }, [currentPage, totalPages]);


  const selectedRFQ = useMemo(() => {
    return rfqs.find(rfq => rfq._id === selectedRFQId) || null;
  }, [selectedRFQId, rfqs]);

  const handleSelectRFQ = (id: string | null) => {
      setSelectedRFQId(id);
      setVendorStatusFilter('all'); // Reset vendor filter on new RFQ selection
  };
  
  const handleOpenSubmitQuoteModal = (rfq: RFQ, vendorId: string) => {
      setQuoteVendorInfo({ rfq, vendorId });
      setIsSubmitQuoteModalOpen(true);
  };
  
  const handleAwardRFQ = (rfq: RFQ, winningQuote: Quotation) => {
      setRfqToAward({ rfq, winningQuote });
  };

  const handleBulkClose = () => {
    setRfqs(prevRfqs =>
      prevRfqs.map(rfq =>
        selectedRfqIds.includes(rfq._id) ? { ...rfq, status: RFQStatus.Closed } : rfq
      )
    );
    alert(`${selectedRfqIds.length} RFQ(s) have been closed.`);
    setSelectedRfqIds([]);
    setIsConfirmCloseOpen(false);
  };
  
  const handleCreatePOFromAward = (poData: Omit<PurchaseOrder, '_id' | 'poNumber' | 'status' | 'requesterId'>, id: string | null) => {
      if (!currentUser || !rfqToAward) return;
      const { rfq } = rfqToAward;
      
      const newPO: PurchaseOrder = {
          ...poData,
          _id: `PO${Date.now()}`,
          poNumber: `PO-2024-00${Math.floor(Math.random() * 1000) + 750}`,
          status: POStatus.Approved, // Or PendingApproval if it needs another check
          requesterId: currentUser._id, // Or from original PR
          sourcePRId: rfq.requisitionId,
          sourceRfqId: rfq._id,
      };
      
      onAwardAndCreatePO(newPO, rfq.requisitionId, rfq._id);
      setRfqToAward(null);
  };

  const poInitialData = useMemo(() => {
    if (!rfqToAward) return null;
    const { rfq, winningQuote } = rfqToAward;
    const vendorName = vendors.find(v => v._id === winningQuote.vendorId)?.name || 'Unknown Vendor';
    return {
      vendorId: winningQuote.vendorId,
      deliveryDate: new Date(new Date().setDate(new Date().getDate() + 14)).toISOString(),
      currency: winningQuote.currency,
      totalAmount: winningQuote.totalAmount,
      notes: `Source: RFQ ${rfq.rfqNumber}, Quotation ${winningQuote._id} from ${vendorName}.`,
      lines: winningQuote.items.map(item => ({
        _id: `L${Date.now()}${Math.random()}`,
        materialId: item.materialId,
        description: item.product_name,
        quantity: item.quantity,
        uom: materials.find(m => m._id === item.materialId)?.uom || 'EA',
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
      }))
    };
  }, [rfqToAward, vendors, materials]);
  
  const handleProcessBulkDocument = async (files: File[]) => {
    setIsProcessingBulk(true);
    const allExtractedRFQs: ExtractedRFQData[] = [];
    for (const file of files) {
        const result = await extractRFQsFromDocument(file);
        if (result?.rfqs) {
            allExtractedRFQs.push(...result.rfqs);
        }
    }
    setIsProcessingBulk(false);
    setIsBulkUploadModalOpen(false);

    if (allExtractedRFQs.length > 0) {
        setBulkDataToReview(allExtractedRFQs);
        setIsBulkReviewModalOpen(true);
    } else {
        alert('Failed to extract any RFQs from the document(s). Please check the file format and try again.');
    }
  };

  const handleConfirmBulkUpload = (reviewedData: ExtractedRFQData[]) => {
    if (!reviewedData) return;
    
    const newRfqs: RFQ[] = [];
    const skippedPrNumbers: string[] = [];

    reviewedData.forEach(extractedRfq => {
        const requisition = requisitions.find(r => r.prNumber === extractedRfq.prNumber);
        if (!requisition) {
            skippedPrNumbers.push(extractedRfq.prNumber);
            return;
        }

        const invitedVendorIds = extractedRfq.invitedVendorNames
            .map(name => vendors.find(v => v.name.toLowerCase() === name.toLowerCase())?._id)
            .filter((id): id is string => !!id);

        if (invitedVendorIds.length === 0) return;

        const newRfqId = `RFQ${Date.now()}${Math.random()}`;
        newRfqs.push({
            _id: newRfqId,
            rfqNumber: `RFQ-BULK-${Date.now()}`,
            requisitionId: requisition._id,
            issuedDate: new Date().toISOString(),
            dueDate: new Date(extractedRfq.dueDate).toISOString(),
            status: RFQStatus.Open,
            currency: requisition.currency,
            items: requisition.items,
            invitedVendors: invitedVendorIds.map(vendorId => ({
                _id: `RFQ_V_${newRfqId}_${vendorId}`,
                rfqId: newRfqId,
                vendorId,
                invitedDate: new Date().toISOString(),
                responseStatus: RFQVendorResponseStatus.Pending,
            }))
        });
    });
    
    if (skippedPrNumbers.length > 0) {
        alert(`Skipped creating RFQs for the following PR numbers as they could not be found: ${[...new Set(skippedPrNumbers)].join(', ')}`);
    }

    newRfqs.forEach(onRFQCreated);
    setIsBulkReviewModalOpen(false);
    setBulkDataToReview(null);
  };
  
  return (
    <div className="relative h-full">
      <div className="flex flex-col gap-6 h-full">
        <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold tracking-tight">Request for Quotations</h1>
            <div className="flex items-center space-x-4">
              <CurrencySwitcher displayCurrency={displayCurrency} setDisplayCurrency={setDisplayCurrency} rates={rates} />
              {currentUserPermissions.includes('CREATE_RFQ') && (
                <Button size="sm" variant="outline" onClick={() => setIsBulkUploadModalOpen(true)}>Bulk Create RFQs</Button>
              )}
            </div>
        </div>
         <Card>
            <CardHeader>
                <CardTitle>Filter RFQs</CardTitle>
                <CardDescription>Find RFQs by number, status, or date range.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
                <div>
                    <label className="text-sm font-medium mb-1 block">Search</label>
                    <Input placeholder="RFQ # or PR #" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                </div>
                <div>
                    <label className="text-sm font-medium mb-1 block">Status</label>
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                        <option value="all">All Statuses</option>
                        {Object.values(RFQStatus).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-sm font-medium mb-1 block">Issued Date From</label>
                    <Input type="date" value={dateFilter.start} onChange={e => setDateFilter(prev => ({...prev, start: e.target.value}))} />
                </div>
                <div>
                    <label className="text-sm font-medium mb-1 block">Issued Date To</label>
                    <Input type="date" value={dateFilter.end} onChange={e => setDateFilter(prev => ({...prev, end: e.target.value}))} />
                </div>
            </CardContent>
        </Card>

        {selectedRfqIds.length > 0 && (
            <div className="flex items-center justify-end gap-2">
                <span className="text-sm font-medium text-muted-foreground">{selectedRfqIds.length} RFQ(s) selected</span>
                <Button size="sm" variant="destructive" onClick={() => setIsConfirmCloseOpen(true)}>Close Selected</Button>
                <Button size="sm" variant="outline" onClick={() => setSelectedRfqIds([])}>Cancel</Button>
            </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-grow">
          <div className="lg:col-span-1">
            <RFQList 
                rfqs={paginatedRFQs}
                selectedRFQId={selectedRFQId}
                onSelectRFQ={handleSelectRFQ}
                selectedRfqIds={selectedRfqIds}
                onSelectedRfqIdsChange={setSelectedRfqIds}
                currentUserPermissions={currentUserPermissions}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                sortConfig={sortConfig}
                requestSort={requestSort}
            />
          </div>
          <div className="lg:col-span-2">
            <RFQDetail
                rfq={selectedRFQ}
                requisition={requisitions.find(pr => pr._id === selectedRFQ?.requisitionId)}
                vendors={vendors}
                materials={materials}
                currentUser={currentUser}
                onSubmitQuotation={handleOpenSubmitQuoteModal}
                onAwardRFQ={handleAwardRFQ}
                vendorStatusFilter={vendorStatusFilter}
                setVendorStatusFilter={setVendorStatusFilter}
                currentUserPermissions={currentUserPermissions}
                rates={rates}
                displayCurrency={displayCurrency}
            />
          </div>
        </div>
      </div>
      
      {quoteVendorInfo && (
        <SubmitQuotationModal
            isOpen={isSubmitQuoteModalOpen}
            onClose={() => setIsSubmitQuoteModalOpen(false)}
            onSave={onQuotationSubmitted}
            rfq={quoteVendorInfo.rfq}
            vendor={vendors.find(v => v._id === quoteVendorInfo.vendorId)!}
            materials={materials}
        />
      )}
       {rfqToAward && poInitialData && (
        <CreatePOModal
            isOpen={!!rfqToAward}
            onClose={() => setRfqToAward(null)}
            onSave={handleCreatePOFromAward}
            vendors={vendors}
            materials={materials}
            initialData={poInitialData}
            onOpenCreateMaterial={() => {}}
            newlyCreatedMaterial={null}
            setNewlyCreatedMaterial={() => {}}
            rates={rates}
            poTemplates={[]}
            isAwardFlow={true}
        />
      )}
       <ConfirmationDialog
        isOpen={isConfirmCloseOpen}
        onClose={() => setIsConfirmCloseOpen(false)}
        onConfirm={handleBulkClose}
        title={`Close ${selectedRfqIds.length} RFQ(s)?`}
        description="This will change the status of the selected RFQs to 'Closed'. This action can be reversed by an admin."
        confirmText="Yes, Close RFQs"
        confirmVariant="destructive"
      />
      <UploadDocumentModal
        isOpen={isBulkUploadModalOpen}
        onClose={() => setIsBulkUploadModalOpen(false)}
        onProcess={handleProcessBulkDocument}
        isProcessing={isProcessingBulk}
        multiple={true}
        title="Bulk Create RFQs"
        description="Upload a CSV or PDF with PR numbers, due dates, and vendor names."
    />
    <BulkDataReviewModal
        isOpen={isBulkReviewModalOpen}
        onClose={() => setIsBulkReviewModalOpen(false)}
        onConfirm={handleConfirmBulkUpload}
        initialData={bulkDataToReview}
        entityType="rfqs"
    />
    {isRFQModalOpen && editingRFQ && (
        <CreateRFQModal
            isOpen={isRFQModalOpen}
            onClose={() => { setIsRFQModalOpen(false); setEditingRFQ(null); }}
            onSave={(editedRFQ) => handleSaveEditedRFQ(editedRFQ)}
            requisition={requisitions.find(r => r._id === editingRFQ.requisitionId)!}
            vendors={vendors}
            initialData={editingRFQ}
        />
    )}
    </div>
  );
};

export default RFQDashboard;