import React, { useRef, useEffect, useMemo } from 'react';
import type { RFQ, Permission } from '../types';
import { RFQStatus } from '../types';
import { StatusBadge } from './common/Badge';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from './common/Card';
import Pagination from './common/Pagination';

type RFQSortableKey = 'rfqNumber' | 'prNumber' | 'issuedDate' | 'dueDate' | 'status';
interface SortConfig {
    key: RFQSortableKey;
    direction: 'ascending' | 'descending';
}

interface RFQListProps {
  rfqs: (RFQ & { prNumber: string })[];
  selectedRFQId: string | null;
  onSelectRFQ: (id: string | null) => void;
  selectedRfqIds: string[];
  onSelectedRfqIdsChange: (setter: React.SetStateAction<string[]>) => void;
  currentUserPermissions: Permission[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  sortConfig: SortConfig;
  requestSort: (key: RFQSortableKey) => void;
}

const getSortIcon = (key: RFQSortableKey, sortConfig: SortConfig) => {
    if (sortConfig?.key !== key) {
        return <svg className="w-4 h-4 text-muted-foreground/30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" /></svg>;
    }
    if (sortConfig.direction === 'ascending') {
        return <svg className="w-4 h-4 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>;
    }
    return <svg className="w-4 h-4 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>;
};

interface SortableHeaderProps {
    sortKey: RFQSortableKey;
    title: string;
    className?: string;
    sortConfig: SortConfig;
    requestSort: (key: RFQSortableKey) => void;
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

const RFQList: React.FC<RFQListProps> = ({ rfqs, selectedRFQId, onSelectRFQ, selectedRfqIds, onSelectedRfqIdsChange, currentUserPermissions, currentPage, totalPages, onPageChange, sortConfig, requestSort }) => {
  const checkboxRef = useRef<HTMLInputElement>(null);
  const canManage = currentUserPermissions.includes('AWARD_RFQ');

  const eligibleForSelection = useMemo(() =>
    rfqs.filter(rfq => rfq.status === RFQStatus.Open),
    [rfqs]
  );
  
  useEffect(() => {
    if (checkboxRef.current) {
        const selectedInList = selectedRfqIds.filter(id => eligibleForSelection.some(rfq => rfq._id === id));
        const allSelected = eligibleForSelection.length > 0 && selectedInList.length === eligibleForSelection.length;
        
        checkboxRef.current.checked = allSelected;
        checkboxRef.current.indeterminate = selectedInList.length > 0 && !allSelected;
    }
  }, [selectedRfqIds, eligibleForSelection]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pageEligibleIds = eligibleForSelection.map(rfq => rfq._id);
    if (e.target.checked) {
      onSelectedRfqIdsChange(prev => [...new Set([...prev, ...pageEligibleIds])]);
    } else {
      onSelectedRfqIdsChange(prev => prev.filter(id => !pageEligibleIds.includes(id)));
    }
  };

  const handleToggleSelection = (rfqId: string) => {
    onSelectedRfqIdsChange(prev =>
      prev.includes(rfqId) ? prev.filter(id => id !== rfqId) : [...prev, rfqId]
    );
  };

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="p-4 border-b">
        <CardTitle className="text-lg">All RFQs</CardTitle>
      </CardHeader>
      <CardContent className="p-0 flex-grow overflow-y-auto">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-card-foreground">
            <thead className="bg-muted/50 sticky top-0">
              <tr>
                {canManage && (
                  <th className="p-4 w-4">
                    <input
                      ref={checkboxRef}
                      type="checkbox"
                      onChange={handleSelectAll}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                      aria-label="Select all eligible RFQs"
                    />
                  </th>
                )}
                <SortableHeader sortKey="rfqNumber" title="RFQ #" sortConfig={sortConfig} requestSort={requestSort} />
                <SortableHeader sortKey="prNumber" title="From PR #" sortConfig={sortConfig} requestSort={requestSort} />
                <SortableHeader sortKey="issuedDate" title="Issued Date" sortConfig={sortConfig} requestSort={requestSort} />
                <SortableHeader sortKey="dueDate" title="Due Date" sortConfig={sortConfig} requestSort={requestSort} />
                <SortableHeader sortKey="status" title="Status" className="text-center" sortConfig={sortConfig} requestSort={requestSort} />
              </tr>
            </thead>
            <tbody>
              {rfqs.length > 0 ? (
                rfqs.map(rfq => (
                  <tr
                    key={rfq._id}
                    className={`border-b cursor-pointer transition-colors ${
                      (selectedRFQId === rfq._id || selectedRfqIds.includes(rfq._id))
                        ? 'bg-primary/10'
                        : 'hover:bg-accent'
                    }`}
                    onClick={() => onSelectRFQ(rfq._id)}
                  >
                    {canManage && (
                      <td className="p-4 w-4" onClick={(e) => e.stopPropagation()}>
                        {rfq.status === RFQStatus.Open ? (
                          <input
                            type="checkbox"
                            checked={selectedRfqIds.includes(rfq._id)}
                            onChange={() => handleToggleSelection(rfq._id)}
                            className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                            aria-label={`Select RFQ ${rfq.rfqNumber}`}
                          />
                        ) : (
                          <div className="h-4 w-4"></div>
                        )}
                      </td>
                    )}
                    <td className="p-4 font-mono font-medium text-primary whitespace-nowrap">{rfq.rfqNumber}</td>
                    <td className="p-4 whitespace-nowrap">{rfq.prNumber}</td>
                    <td className="p-4 whitespace-nowrap">{formatDate(rfq.issuedDate)}</td>
                    <td className="p-4 whitespace-nowrap">{formatDate(rfq.dueDate)}</td>
                    <td className="p-4 text-center whitespace-nowrap"><StatusBadge status={rfq.status} /></td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={canManage ? 6 : 5} className="p-6 text-center text-muted-foreground">
                    No RFQs found for the current filters.
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

export default RFQList;
