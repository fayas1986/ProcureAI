import React, { useState, useMemo, useEffect } from 'react';
import type { Invoice, PurchaseOrder, Vendor, User, Material, Requisition, GoodsReceipt, Payment, Permission, Currency, ExtractedInvoiceData } from '../types';
import { InvoiceStatus, POStatus, UserRole } from '../types';
import InvoiceList from './InvoiceList';
import InvoiceDetail from './InvoiceDetail';
import CreateInvoiceModal from './CreateInvoiceModal';
import RecordPaymentModal from './RecordPaymentModal';
import { Button } from './common/Button';
import { Input } from './common/Input';
import useDebounce from '../hooks/useDebounce';
import Fuse from 'fuse.js';
import type { EntityType, EntityShortType, View } from '../App';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './common/Card';
// Fix: Changed default import to named import for UploadDocumentModal to resolve module resolution error.
import { UploadDocumentModal } from './UploadDocumentModal';
import BulkDataReviewModal from './common/BulkDataReviewModal';
import { extractInvoicesFromDocument } from '../services/geminiService';
import CurrencySwitcher from './common/CurrencySwitcher';

interface InvoicingDashboardProps {
  invoices: Invoice[];
  purchaseOrders: PurchaseOrder[];
  vendors: Vendor[];
  users: User[];
  currentUser: User | null;
  onInvoiceCreated: (newInvoice: Invoice) => void;
  onPaymentRecorded: (invoiceId: string, newPayment: Payment) => void;
  onApprovalAction: (entityType: EntityType, entityId: string, action: 'Approve' | 'Reject', comments: string) => void;
  materials: Material[];
  requisitions: Requisition[];
  goodsReceipts: GoodsReceipt[];
  currentUserPermissions: Permission[];
  onViewEntity: (type: EntityShortType, entityNumber: string) => void;
  initialSelectedInvoiceId?: string | null;
  onClearInitialInvoiceId?: () => void;
  displayCurrency: Currency;
  rates: Record<string, number> | null;
  setActiveView: (view: View) => void;
  setDisplayCurrency: (currency: Currency) => void;
}

const ITEMS_PER_PAGE = 10;

interface FilterButtonProps {
    value: InvoiceStatus | 'all';
    label: string;
    currentFilter: InvoiceStatus | 'all';
    onClick: (value: InvoiceStatus | 'all') => void;
}

const FilterButton: React.FC<FilterButtonProps> = ({ value, label, currentFilter, onClick }) => (
    <Button
        variant={currentFilter === value ? 'default' : 'outline'}
        size="sm"
        onClick={() => onClick(value)}
        className="capitalize"
    >
        {label}
    </Button>
);


const InvoicingDashboard: React.FC<InvoicingDashboardProps> = (props) => {
  const { invoices, purchaseOrders, vendors, users, currentUser, onInvoiceCreated, onPaymentRecorded, onApprovalAction, materials, requisitions, goodsReceipts, currentUserPermissions, onViewEntity, initialSelectedInvoiceId, onClearInitialInvoiceId, displayCurrency, rates, setActiveView, setDisplayCurrency } = props;

  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all');
  const [dateFilter, setDateFilter] = useState<{ start: string; end: string }>({ start: '', end: '' });
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isRecordPaymentModalOpen, setIsRecordPaymentModalOpen] = useState(false);
  const [invoiceForPayment, setInvoiceForPayment] = useState<Invoice | null>(null);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [currentPage, setCurrentPage] = useState(1);
  
  const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
  const [isBulkReviewModalOpen, setIsBulkReviewModalOpen] = useState(false);
  const [bulkDataToReview, setBulkDataToReview] = useState<ExtractedInvoiceData[] | null>(null);
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);

  const canCreateInvoice = currentUserPermissions.includes('CREATE_INVOICE');

  useEffect(() => {
    if (initialSelectedInvoiceId && onClearInitialInvoiceId) {
      setSelectedInvoiceId(initialSelectedInvoiceId);
      onClearInitialInvoiceId();
    }
  }, [initialSelectedInvoiceId, onClearInitialInvoiceId]);

  const searchableInvoices = useMemo(() =>
    invoices.map(inv => ({
      ...inv,
      vendorName: vendors.find(v => v._id === inv.vendorId)?.name || 'Unknown',
      poNumber: purchaseOrders.find(po => po._id === inv.poId)?.poNumber || 'N/A',
    })), [invoices, vendors, purchaseOrders]);

  const fuse = useMemo(() => new Fuse(searchableInvoices, {
    keys: ['invoiceNumber', 'vendorName', 'poNumber'],
    includeScore: true,
    threshold: 0.4,
  }), [searchableInvoices]);

  const filteredInvoices = useMemo(() => {
    let items = debouncedSearchTerm
      ? fuse.search(debouncedSearchTerm).map(result => result.item)
      : searchableInvoices;
    
    if (statusFilter !== 'all') {
      items = items.filter(inv => inv.status === statusFilter);
    }
    
    if (dateFilter.start) {
      const startDate = new Date(dateFilter.start);
      startDate.setHours(0, 0, 0, 0); // Start of day to be inclusive
      items = items.filter(inv => new Date(inv.invoiceDate) >= startDate);
    }
    if (dateFilter.end) {
      const endDate = new Date(dateFilter.end);
      endDate.setHours(23, 59, 59, 999); // End of day to be inclusive
      items = items.filter(inv => new Date(inv.invoiceDate) <= endDate);
    }
    
    return items.sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime());
  }, [searchableInvoices, debouncedSearchTerm, statusFilter, dateFilter, fuse]);

  const totalPages = Math.ceil(filteredInvoices.length / ITEMS_PER_PAGE);

  const paginatedInvoices = useMemo(() => {
      return filteredInvoices.slice(
          (currentPage - 1) * ITEMS_PER_PAGE,
          currentPage * ITEMS_PER_PAGE
      );
  }, [filteredInvoices, currentPage]);

  useEffect(() => {
      setCurrentPage(1);
  }, [debouncedSearchTerm, statusFilter, dateFilter]);

  useEffect(() => {
      if (currentPage > totalPages && totalPages > 0) {
          setCurrentPage(totalPages);
      }
  }, [currentPage, totalPages]);

  const selectedInvoice = useMemo(() => {
    return invoices.find(inv => inv._id === selectedInvoiceId) || null;
  }, [selectedInvoiceId, invoices]);
  
  const eligiblePOsForInvoice = useMemo(() => {
    const invoicedPOIds = new Set(invoices.map(inv => inv.poId));
    return purchaseOrders.filter(po => 
      (po.status === POStatus.Approved || po.status === POStatus.Closed || po.status === POStatus.Invoiced) && !invoicedPOIds.has(po._id)
    );
  }, [purchaseOrders, invoices]);

  const handleOpenRecordPaymentModal = (invoice: Invoice) => {
      setInvoiceForPayment(invoice);
      setIsRecordPaymentModalOpen(true);
  };
  
  const handleProcessBulkDocument = async (files: File[]) => {
    setIsProcessingBulk(true);
    const allExtractedInvoices: ExtractedInvoiceData[] = [];
    for (const file of files) {
        const result = await extractInvoicesFromDocument(file);
        if (result?.invoices) {
            allExtractedInvoices.push(...result.invoices);
        }
    }
    setIsProcessingBulk(false);
    setIsBulkUploadModalOpen(false);

    if (allExtractedInvoices.length > 0) {
        setBulkDataToReview(allExtractedInvoices);
        setIsBulkReviewModalOpen(true);
    } else {
        alert('Failed to extract any Invoices from the document(s). Please check the file format and try again.');
    }
  };
  
  const handleConfirmBulkUpload = (reviewedData: ExtractedInvoiceData[]) => {
    if (!reviewedData) return;

    let skippedCount = 0;
    reviewedData.forEach(extractedInv => {
        const po = purchaseOrders.find(p => p.poNumber === extractedInv.poNumber);
        if (!po) {
            skippedCount++;
            return;
        }
        if (invoices.some(i => i.invoiceNumber === extractedInv.invoiceNumber && i.vendorId === po.vendorId)) {
            skippedCount++;
            return;
        }

        const newInvoice: Invoice = {
            _id: `INV-BULK-${Date.now()}${Math.random()}`,
            invoiceNumber: extractedInv.invoiceNumber,
            poId: po._id,
            vendorId: po.vendorId,
            invoiceDate: new Date(extractedInv.invoiceDate).toISOString(),
            dueDate: new Date(extractedInv.dueDate).toISOString(),
            subtotal: extractedInv.subtotal,
            taxAmount: extractedInv.taxAmount,
            taxRate: po.taxRate, // Assume same tax rate as PO for simplicity
            amount: extractedInv.amount,
            currency: po.currency,
            status: InvoiceStatus.Pending,
            payments: [],
            notes: extractedInv.notes,
        };
        onInvoiceCreated(newInvoice);
    });

    if (skippedCount > 0) {
        alert(`${skippedCount} invoice(s) were skipped due to missing PO references or duplicate invoice numbers.`);
    }

    setIsBulkReviewModalOpen(false);
    setBulkDataToReview(null);
  };

  return (
    <div className="relative h-full">
      <div className="flex flex-col gap-6 h-full">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold tracking-tight">Invoicing</h1>
           <div className="flex items-center space-x-4">
            <CurrencySwitcher displayCurrency={displayCurrency} setDisplayCurrency={setDisplayCurrency} rates={rates} />
            {canCreateInvoice && (
              <div className="flex items-center space-x-2">
                <Button size="sm" variant="outline" onClick={() => setIsBulkUploadModalOpen(true)}>Bulk Upload</Button>
                <Button size="sm" onClick={() => setIsCreateModalOpen(true)}>Create Invoice</Button>
              </div>
            )}
          </div>
        </div>
        <div className="space-y-4 flex-grow flex flex-col">
          <Card>
              <CardHeader>
                  <CardTitle>Filter Invoices</CardTitle>
                  <CardDescription>Find invoices by their number, status, or date range.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-end">
                      <div className="sm:col-span-2 md:col-span-1">
                          <label htmlFor="inv-search" className="text-sm font-medium mb-1 block">Invoice #, PO #, or Vendor</label>
                          <Input
                              id="inv-search"
                              type="text"
                              placeholder="Search..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                          />
                      </div>
                      <div>
                          <label htmlFor="date-start" className="text-sm font-medium mb-1 block">Invoice Date From</label>
                          <Input id="date-start" type="date" value={dateFilter.start} onChange={e => setDateFilter(prev => ({ ...prev, start: e.target.value }))} />
                      </div>
                      <div>
                          <label htmlFor="date-end" className="text-sm font-medium mb-1 block">Invoice Date To</label>
                          <Input id="date-end" type="date" value={dateFilter.end} onChange={e => setDateFilter(prev => ({ ...prev, end: e.target.value }))} />
                      </div>
                  </div>
                  <div className="flex items-center space-x-2 flex-wrap gap-y-2">
                      <span className="text-sm font-medium text-muted-foreground mr-2">Status:</span>
                      <FilterButton value="all" label="All" currentFilter={statusFilter} onClick={setStatusFilter} />
                      <FilterButton value={InvoiceStatus.Pending} label="Pending" currentFilter={statusFilter} onClick={setStatusFilter} />
                      <FilterButton value={InvoiceStatus.Approved} label="Approved" currentFilter={statusFilter} onClick={setStatusFilter} />
                      <FilterButton value={InvoiceStatus.Paid} label="Paid" currentFilter={statusFilter} onClick={setStatusFilter} />
                      <FilterButton value={InvoiceStatus.Rejected} label="Rejected" currentFilter={statusFilter} onClick={setStatusFilter} />
                  </div>
              </CardContent>
          </Card>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-grow">
            <div className="lg:col-span-1">
              <InvoiceList
                invoices={paginatedInvoices}
                selectedInvoiceId={selectedInvoiceId}
                onSelectInvoice={setSelectedInvoiceId}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                rates={rates}
                displayCurrency={displayCurrency}
              />
            </div>
            <div className="lg:col-span-2">
              <InvoiceDetail
                invoice={selectedInvoice}
                purchaseOrder={purchaseOrders.find(po => po._id === selectedInvoice?.poId)}
                vendor={vendors.find(v => v._id === selectedInvoice?.vendorId)}
                currentUser={currentUser}
                users={users}
                onApprovalAction={onApprovalAction}
                onRecordPayment={handleOpenRecordPaymentModal}
                currentUserPermissions={currentUserPermissions}
                rates={rates}
                displayCurrency={displayCurrency}
              />
            </div>
          </div>
        </div>
      </div>
      
      <CreateInvoiceModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={onInvoiceCreated}
        purchaseOrders={eligiblePOsForInvoice}
        vendors={vendors}
      />
      {invoiceForPayment && (
        <RecordPaymentModal
            isOpen={isRecordPaymentModalOpen}
            onClose={() => setIsRecordPaymentModalOpen(false)}
            onSave={(payment) => onPaymentRecorded(invoiceForPayment._id, payment)}
            invoice={invoiceForPayment}
        />
      )}
      <UploadDocumentModal
          isOpen={isBulkUploadModalOpen}
          onClose={() => setIsBulkUploadModalOpen(false)}
          onProcess={handleProcessBulkDocument}
          isProcessing={isProcessingBulk}
          multiple={true}
          title="Bulk Upload Invoices"
          description="Upload one or more CSV or PDF files containing invoice data."
      />
      <BulkDataReviewModal
          isOpen={isBulkReviewModalOpen}
          onClose={() => setIsBulkReviewModalOpen(false)}
          onConfirm={handleConfirmBulkUpload}
          initialData={bulkDataToReview}
          entityType="invoices"
      />
    </div>
  );
};

export default InvoicingDashboard;