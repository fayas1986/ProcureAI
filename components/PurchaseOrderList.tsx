
import React, { useRef, useEffect, useMemo } from 'react';
import type { PurchaseOrder, Vendor, User, Permission, Currency } from '../types';
import { POStatus } from '../types';
import { StatusBadge } from './common/Badge';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from './common/Card';
import Pagination from './common/Pagination';
import { convertCurrency } from '../services/currencyService';

type POSortableKey = 'poNumber' | 'vendorName' | 'orderDate' | 'totalAmount' | 'status';
interface SortConfig {
    key: POSortableKey;
    direction: 'ascending' | 'descending';
}

interface PurchaseOrderListProps {
  purchaseOrders: (PurchaseOrder & { vendorName: string })[];
  vendors: Vendor[];
  users: User[];
  selectedPOId: string | null;
  onSelectPO: (id: string | null) => void;
  selectedPOIds: string[];
  onSelectedPOIdsChange: (setter: React.SetStateAction<string[]>) => void;
  currentUser: User | null;
  currentUserPermissions: Permission[];
  sortConfig: SortConfig;
  requestSort: (key: POSortableKey) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  displayCurrency: Currency;
  rates: Record<string, number> | null;
}

const getSortIcon = (key: POSortableKey, sortConfig: SortConfig) => {
    if (sortConfig?.key !== key) {
        return <svg className="w-4 h-4 text-muted-foreground/30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" /></svg>;
    }
    if (sortConfig.direction === 'ascending') {
        return <svg className="w-4 h-4 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>;
    }
    return <svg className="w-4 h-4 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>;
};

interface SortableHeaderProps {
    sortKey: POSortableKey;
    title: string;
    className?: string;
    sortConfig: SortConfig;
    requestSort: (key: POSortableKey) => void;
}

const SortableHeader: React.FC<SortableHeaderProps> = ({ sortKey, title, className, sortConfig, requestSort }) => (
    <th className={`p-4 font-medium ${className}`}>
        <button
            type="button"
            onClick={() => requestSort(sortKey)}
            className="flex items-center gap-1 hover:text-foreground transition-colors"
        >
            {title}
            {getSortIcon(sortKey, sortConfig)}
        </button>
    </th>
);

const PurchaseOrderList: React.FC<PurchaseOrderListProps> = ({ purchaseOrders, selectedPOId, onSelectPO, selectedPOIds, onSelectedPOIdsChange, currentUser, currentUserPermissions, users, sortConfig, requestSort, currentPage, totalPages, onPageChange, displayCurrency, rates }) => {
  const checkboxRef = useRef<HTMLInputElement>(null);
  const canApprove = currentUserPermissions.includes('APPROVE_PO');

  const eligibleForSelection = useMemo(() =>
    purchaseOrders.filter(po => po.status === POStatus.PendingL1Approval || po.status === POStatus.PendingL2Approval),
    [purchaseOrders]
  );
  
  useEffect(() => {
    if (checkboxRef.current) {
        const selectedInList = selectedPOIds.filter(id => eligibleForSelection.some(po => po._id === id));
        const allSelected = eligibleForSelection.length > 0 && selectedInList.length === eligibleForSelection.length;
        
        checkboxRef.current.checked = allSelected;
        checkboxRef.current.indeterminate = selectedInList.length > 0 && !allSelected;
    }
  }, [selectedPOIds, eligibleForSelection]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pageEligibleIds = eligibleForSelection.map(po => po._id);
    if (e.target.checked) {
      // Add current page's eligible IDs to the selection
      onSelectedPOIdsChange(prev => [...new Set([...prev, ...pageEligibleIds])]);
    } else {
      // Remove current page's eligible IDs from the selection
      onSelectedPOIdsChange(prev => prev.filter(id => !pageEligibleIds.includes(id)));
    }
  };

  const handleToggleSelection = (poId: string) => {
    onSelectedPOIdsChange(prev =>
      prev.includes(poId) ? prev.filter(id => id !== poId) : [...prev, poId]
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  };
  
  const getReviewerName = (userId: string) => users.find(u => u._id === userId)?.name || 'Unknown';

  return (
    <Card className="h-full flex flex-col">
       <CardHeader className="p-4 border-b">
         <div className="flex justify-between items-center">
            <CardTitle className="text-lg">
                All Purchase Orders
            </CardTitle>
         </div>
      </CardHeader>
      <CardContent className="p-0 flex-grow overflow-y-auto">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-card-foreground">
            <thead className="bg-muted/50 sticky top-0">
              <tr>
                {canApprove && (
                  <th className="p-4 w-4">
                    <input
                      ref={checkboxRef}
                      type="checkbox"
                      onChange={handleSelectAll}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                      aria-label="Select all pending orders"
                    />
                  </th>
                )}
                <SortableHeader sortKey="poNumber" title="PO Number" sortConfig={sortConfig} requestSort={requestSort} />
                <SortableHeader sortKey="vendorName" title="Vendor" sortConfig={sortConfig} requestSort={requestSort} />
                <SortableHeader sortKey="orderDate" title="Order Date" sortConfig={sortConfig} requestSort={requestSort} />
                <SortableHeader sortKey="totalAmount" title="Total" className="text-right" sortConfig={sortConfig} requestSort={requestSort} />
                <SortableHeader sortKey="status" title="Status" className="text-center" sortConfig={sortConfig} requestSort={requestSort} />
              </tr>
            </thead>
            <tbody>
              {purchaseOrders.length > 0 ? (
                purchaseOrders.map(po => (
                  <tr
                    key={po._id}
                    className={`border-b cursor-pointer transition-colors ${
                      (selectedPOId === po._id || selectedPOIds.includes(po._id))
                        ? 'bg-primary/10'
                        : 'hover:bg-accent'
                    }`}
                    onClick={() => onSelectPO(po._id)}
                  >
                    {canApprove && (
                      <td className="p-4 w-4" onClick={(e) => e.stopPropagation()}>
                        {(po.status === POStatus.PendingL1Approval || po.status === POStatus.PendingL2Approval) ? (
                          <input
                            type="checkbox"
                            checked={selectedPOIds.includes(po._id)}
                            onChange={() => handleToggleSelection(po._id)}
                            className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                            aria-label={`Select order ${po.poNumber}`}
                          />
                        ) : (
                          <div className="h-4 w-4"></div>
                        )}
                      </td>
                    )}
                    <td className="p-4 font-mono font-medium text-primary whitespace-nowrap">
                        <div className="flex items-center gap-2">
                            {po.reviewedById && (
                                <svg 
                                    xmlns="http://www.w3.org/2000/svg" 
                                    className="h-4 w-4 text-green-600 flex-shrink-0" 
                                    viewBox="0 0 20 20" 
                                    fill="currentColor"
                                >
                                  <title>{`Reviewed by ${getReviewerName(po.reviewedById)} on ${new Date(po.reviewedAt!).toLocaleDateString()}`}</title>
                                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.03 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                </svg>
                            )}
                            <span>{po.poNumber}</span>
                        </div>
                    </td>
                    <td className="p-4 whitespace-nowrap">{po.vendorName}</td>
                    <td className="p-4 whitespace-nowrap">{formatDate(po.orderDate)}</td>
                    <td className="p-4 text-right whitespace-nowrap">
                        <div>{formatCurrency(po.totalAmount, po.currency)}</div>
                        {po.currency !== displayCurrency && rates && (
                            <div className="text-xs text-muted-foreground">
                                ~ {formatCurrency(convertCurrency(po.totalAmount, po.currency, displayCurrency, rates), displayCurrency)}
                            </div>
                        )}
                    </td>
                    <td className="p-4 text-center whitespace-nowrap"><StatusBadge status={po.status} /></td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={canApprove ? 6 : 5} className="p-6 text-center text-muted-foreground">
                    No purchase orders found for the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
       {totalPages > 1 && (
            <CardFooter className="p-2 border-t justify-center">
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={onPageChange}
                />
            </CardFooter>
       )}
    </Card>
  );
};

export default PurchaseOrderList;
