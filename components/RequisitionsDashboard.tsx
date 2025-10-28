import React, { useState, useMemo, useEffect } from 'react';
import type { Requisition, User, Vendor, Material, PurchaseOrder, Permission, Role, RFQ, Currency } from '../types';
import { RequisitionStatus, POStatus } from '../types';
import RequisitionList from './RequisitionList';
import RequisitionDetail from './RequisitionDetail';
import CreateRequisitionModal from './CreateRequisitionModal';
import CreatePOModal from './CreatePOModal';
import { Button } from './common/Button';
import { Input } from './common/Input';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from './common/Card';
import useDebounce from '../hooks/useDebounce';
import Fuse from 'fuse.js';
import { sendRequisitionSubmittedEmail } from '../services/emailService';
import type { EntityType, EntityShortType, View } from '../App';
import CreateRFQModal from './CreateRFQModal';
import CurrencySwitcher from './common/CurrencySwitcher';

interface RequisitionsDashboardProps {
  requisitions: Requisition[];
  setRequisitions: React.Dispatch<React.SetStateAction<Requisition[]>>;
  currentUser: User | null;
  users: User[];
  roles: Role[];
  vendors: Vendor[];
  materials: Material[];
  purchaseOrders: PurchaseOrder[];
  onPOCreated: (newPO: PurchaseOrder, sourcePRId?: string) => void;
  onApprovalAction: (entityType: EntityType, entityId: string, action: 'Approve' | 'Reject', comments: string) => void;
  currentUserPermissions: Permission[];
  onViewEntity: (type: EntityShortType, entityNumber: string) => void;
  initialSelectedPRId?: string | null;
  onClearInitialPRId?: () => void;
  rates: Record<string, number> | null;
  onRFQCreated: (newRFQ: RFQ) => void;
  setActiveView: (view: View) => void;
  displayCurrency: Currency;
  setDisplayCurrency: (currency: Currency) => void;
}

type PRSortableKey = 'prNumber' | 'requesterName' | 'requestDate' | 'totalAmount' | 'department';
interface SortConfig {
    key: PRSortableKey;
    direction: 'ascending' | 'descending';
}

const ITEMS_PER_PAGE = 10;

const RequisitionsDashboard: React.FC<RequisitionsDashboardProps> = ({
  requisitions,
  setRequisitions,
  currentUser,
  users,
  roles,
  vendors,
  materials,
  purchaseOrders,
  onPOCreated,
  onApprovalAction,
  currentUserPermissions,
  onViewEntity,
  initialSelectedPRId,
  onClearInitialPRId,
  rates,
  onRFQCreated,
  setActiveView,
  displayCurrency,
  setDisplayCurrency,
}) => {
  const [selectedPRId, setSelectedPRId] = useState<string | null>(null);
  const [editingPR, setEditingPR] = useState<Requisition | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [prForPOConversion, setPrForPOConversion] = useState<Requisition | null>(null);
  const [prForRfqConversion, setPrForRfqConversion] = useState<Requisition | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'requestDate', direction: 'descending' });
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<RequisitionStatus | 'all'>('all');
  const [dateFilter, setDateFilter] = useState<{ start: string; end: string }>({ start: '', end: '' });
  
  const canCreateRequisition = currentUserPermissions.includes('CREATE_REQUISITION');
  
  useEffect(() => {
    if (initialSelectedPRId && onClearInitialPRId) {
      setSelectedPRId(initialSelectedPRId);
      onClearInitialPRId();
    }
  }, [initialSelectedPRId, onClearInitialPRId]);

  const searchableRequisitions = useMemo(() =>
    (requisitions ?? []).map(pr => ({
      ...pr,
      requesterName: (users ?? []).find(u => u._id === pr.requesterId)?.name || 'Unknown',
    })), [requisitions, users]);
  
  const fuse = useMemo(() => new Fuse(searchableRequisitions, {
    keys: [
      { name: 'prNumber', weight: 0.6 },
      { name: 'requesterName', weight: 0.3 },
      { name: 'department', weight: 0.1 },
    ],
    includeScore: true,
    threshold: 0.4,
  }), [searchableRequisitions]);

  const processedRequisitions = useMemo(() => {
    let items = debouncedSearchTerm
      ? fuse.search(debouncedSearchTerm).map(result => result.item)
      : searchableRequisitions;

    if (statusFilter !== 'all') {
        items = items.filter(pr => pr.status === statusFilter);
    }
    
    if (dateFilter.start) {
      const startDate = new Date(dateFilter.start);
      startDate.setHours(0, 0, 0, 0); // Start of day to be inclusive
      items = items.filter(pr => new Date(pr.requestDate) >= startDate);
    }
    if (dateFilter.end) {
      const endDate = new Date(dateFilter.end);
      endDate.setHours(23, 59, 59, 999); // End of day to be inclusive
      items = items.filter(pr => new Date(pr.requestDate) <= endDate);
    }
    
    if (sortConfig !== null) {
      items.sort((a, b) => {
          const aValue = a[sortConfig.key];
          const bValue = b[sortConfig.key];

          if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
          if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
          return 0;
      });
    }

    return items;
  }, [searchableRequisitions, debouncedSearchTerm, sortConfig, fuse, statusFilter, dateFilter]);

  const totalPages = Math.ceil(processedRequisitions.length / ITEMS_PER_PAGE);

  const paginatedRequisitions = useMemo(() => {
      return processedRequisitions.slice(
          (currentPage - 1) * ITEMS_PER_PAGE,
          currentPage * ITEMS_PER_PAGE
      );
  }, [processedRequisitions, currentPage]);

  useEffect(() => {
      setCurrentPage(1);
  }, [debouncedSearchTerm, statusFilter, dateFilter]);

  useEffect(() => {
      if (currentPage > totalPages && totalPages > 0) {
          setCurrentPage(totalPages);
      }
  }, [currentPage, totalPages]);


  const selectedPR = useMemo(() => {
    return (requisitions ?? []).find(pr => pr._id === selectedPRId) || null;
  }, [selectedPRId, requisitions]);

  const uniqueDepartments = useMemo(() => {
    const departments = new Set(requisitions.map(pr => pr.department));
    return Array.from(departments).sort();
  }, [requisitions]);

  const handleSelectPR = (id: string | null) => {
    setSelectedPRId(id);
  };

  const handleEdit = (pr: Requisition) => {
    setEditingPR(pr);
    setIsCreateModalOpen(true);
  };

  const handleOpenCreateModal = () => {
    setEditingPR(null);
    setIsCreateModalOpen(true);
  };

  const handleSavePR = (prData: Omit<Requisition, '_id' | 'prNumber' | 'requesterId'>, id: string | null) => {
    if (id) {
      setRequisitions(prev => prev.map(pr => pr._id === id ? { ...pr, ...prData, prNumber: pr.prNumber, requesterId: pr.requesterId } : pr));
    } else {
      if (!currentUser) return;
      const newPR: Requisition = {
        ...prData,
        _id: `PR${Date.now()}`,
        prNumber: `PR-2024-00${Math.floor(Math.random() * 100) + 10}`,
        requesterId: currentUser._id,
      };
      setRequisitions(prev => [newPR, ...prev]);
      setSelectedPRId(newPR._id);
    }
  };

  const handleSubmitForApproval = (prId: string) => {
    let updatedPR: Requisition | undefined;
    setRequisitions(prev => prev.map(pr => {
      if (pr._id === prId) {
        updatedPR = { ...pr, status: RequisitionStatus.Pending };
        return updatedPR;
      }
      return pr;
    }));

    if (updatedPR) {
      const requester = (users ?? []).find(u => u._id === updatedPR!.requesterId);
      const approverRoleIds = new Set(roles.filter(r => r.permissions.includes('APPROVE_REQUISITION')).map(r => r._id));
      const approvers = (users ?? []).filter(u => approverRoleIds.has(u.roleId));
      
      sendRequisitionSubmittedEmail(updatedPR, approvers, requester);
      alert(`Requisition submitted. Notification sent to ${approvers.length} user(s) with approval permissions.`);
    }
  };
  
  const handleCreatePOFromPR = (pr: Requisition) => {
      setPrForPOConversion(pr);
  };

  const handleCreateRFQFromPR = (pr: Requisition) => {
    setPrForRfqConversion(pr);
  };

  const handleSavePOFromPR = (poData: Omit<PurchaseOrder, '_id' | 'poNumber' | 'status' | 'requesterId'>, id: string | null) => {
      if (id) {
          console.warn('Editing PO from PR conversion flow is not a standard operation.');
          return;
      }
      
      if (!currentUser || !prForPOConversion) return;
      
      const newPO: PurchaseOrder = {
          ...poData,
          _id: `PO${Date.now()}`,
          poNumber: `PO-2024-00${Math.floor(Math.random() * 1000) + 750}`,
          status: POStatus.Draft, // Start as draft for review
          requesterId: prForPOConversion.requesterId, // Keep original requester
          createdAt: new Date().toISOString(),
      };
      
      onPOCreated(newPO, prForPOConversion?._id);
      setPrForPOConversion(null);
  };
  
  const requestSort = (key: PRSortableKey) => {
      if (sortConfig && sortConfig.key === key) {
          if (sortConfig.direction === 'ascending') {
              setSortConfig({ key, direction: 'descending' });
          } else {
              // Cycle from descending back to default
              setSortConfig({ key: 'requestDate', direction: 'descending' }); 
          }
      } else {
          // New column, start with ascending
          setSortConfig({ key, direction: 'ascending' });
      }
  };

  return (
    <div className="relative h-full">
      <div className="flex flex-col gap-6 h-full">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold tracking-tight">Requisitions</h1>
          <div className="flex items-center space-x-4">
            <CurrencySwitcher displayCurrency={displayCurrency} setDisplayCurrency={setDisplayCurrency} rates={rates} />
            {canCreateRequisition && <Button size="sm" onClick={handleOpenCreateModal}>Create New Requisition</Button>}
          </div>
        </div>
        <div className="space-y-4 flex-grow flex flex-col">
            <Card>
                <CardHeader>
                    <CardTitle>Filter Requisitions</CardTitle>
                    <CardDescription>Find requisitions by their number, status, or request date range.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
                    <div>
                        <label htmlFor="pr-search" className="text-sm font-medium mb-1 block">Search</label>
                        <Input
                            id="pr-search"
                            type="text"
                            placeholder="PR Number, Requester..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div>
                        <label htmlFor="pr-status-filter" className="text-sm font-medium mb-1 block">Status</label>
                        <select
                            id="pr-status-filter"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as any)}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                        >
                            <option value="all">All Statuses</option>
                            {Object.values(RequisitionStatus).map(status => (
                                <option key={status} value={status}>{status}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="date-start" className="text-sm font-medium mb-1 block">Request Date From</label>
                        <Input id="date-start" type="date" value={dateFilter.start} onChange={e => setDateFilter(prev => ({ ...prev, start: e.target.value }))} />
                    </div>
                    <div>
                        <label htmlFor="date-end" className="text-sm font-medium mb-1 block">Request Date To</label>
                        <Input id="date-end" type="date" value={dateFilter.end} onChange={e => setDateFilter(prev => ({ ...prev, end: e.target.value }))} />
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-grow">
              <div className="lg:col-span-1">
                <RequisitionList
                  requisitions={paginatedRequisitions}
                  users={users}
                  selectedPRId={selectedPRId}
                  onSelectPR={handleSelectPR}
                  sortConfig={sortConfig}
                  requestSort={requestSort}
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  rates={rates}
                  displayCurrency={displayCurrency}
                />
              </div>
              <div className="lg:col-span-2">
                <RequisitionDetail
                  requisition={selectedPR}
                  users={users}
                  roles={roles}
                  currentUser={currentUser}
                  currentUserPermissions={currentUserPermissions}
                  purchaseOrders={purchaseOrders}
                  onEdit={handleEdit}
                  onApprovalAction={onApprovalAction}
                  onSubmitForApproval={handleSubmitForApproval}
                  onCreatePO={handleCreatePOFromPR}
                  onCreateRFQ={handleCreateRFQFromPR}
                  rates={rates}
                  displayCurrency={displayCurrency}
                />
              </div>
            </div>
        </div>
      </div>
      
      {/* Modals */}
      <CreateRequisitionModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleSavePR}
        initialData={editingPR}
        currentUser={currentUser}
        materials={materials}
        departments={uniqueDepartments}
      />
      {prForPOConversion && (
        <CreatePOModal
            isOpen={!!prForPOConversion}
            onClose={() => setPrForPOConversion(null)}
            onSave={handleSavePOFromPR}
            vendors={vendors}
            materials={materials}
            initialDataFromPR={prForPOConversion}
            onOpenCreateMaterial={() => {}} // Not used in this flow
            newlyCreatedMaterial={null}
            setNewlyCreatedMaterial={() => {}}
            rates={rates}
            poTemplates={[]}
        />
      )}
      {prForRfqConversion && (
        <CreateRFQModal
          isOpen={!!prForRfqConversion}
          onClose={() => setPrForRfqConversion(null)}
          onSave={onRFQCreated}
          requisition={prForRfqConversion}
          vendors={vendors}
        />
      )}
    </div>
  );
};

export default RequisitionsDashboard;
