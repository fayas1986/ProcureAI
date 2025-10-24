import React from 'react';
import type { Requisition, User, Currency } from '../types';
import { StatusBadge } from './common/Badge';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from './common/Card';
import Pagination from './common/Pagination';
import { convertCurrency } from '../services/currencyService';

type PRSortableKey = 'prNumber' | 'requesterName' | 'requestDate' | 'totalAmount' | 'department';
interface SortConfig {
    key: PRSortableKey;
    direction: 'ascending' | 'descending';
}

interface RequisitionListProps {
  requisitions: (Requisition & { requesterName: string })[];
  users: User[];
  selectedPRId: string | null;
  onSelectPR: (id: string | null) => void;
  sortConfig: SortConfig;
  requestSort: (key: PRSortableKey) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  displayCurrency: Currency;
  rates: Record<string, number> | null;
}

const getSortIcon = (key: PRSortableKey, sortConfig: SortConfig) => {
    if (sortConfig?.key !== key) {
        return <svg className="w-4 h-4 text-muted-foreground/30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" /></svg>;
    }
    if (sortConfig.direction === 'ascending') {
        return <svg className="w-4 h-4 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>;
    }
    return <svg className="w-4 h-4 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>;
};

interface SortableHeaderProps {
    sortKey: PRSortableKey;
    title: string;
    className?: string;
    sortConfig: SortConfig;
    requestSort: (key: PRSortableKey) => void;
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

const RequisitionList: React.FC<RequisitionListProps> = ({ requisitions, selectedPRId, onSelectPR, sortConfig, requestSort, currentPage, totalPages, onPageChange, displayCurrency, rates }) => {
  
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

  return (
    <Card className="h-full flex flex-col">
       <CardHeader className="p-4 border-b">
         <div className="flex justify-between items-center">
            <CardTitle className="text-lg">
                All Requisitions
            </CardTitle>
         </div>
      </CardHeader>
      <CardContent className="p-0 flex-grow overflow-y-auto">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-card-foreground">
            <thead className="bg-muted/50 sticky top-0">
              <tr>
                <SortableHeader sortKey="prNumber" title="PR Number" sortConfig={sortConfig} requestSort={requestSort} />
                <SortableHeader sortKey="requesterName" title="Requester" sortConfig={sortConfig} requestSort={requestSort} />
                <SortableHeader sortKey="department" title="Department" sortConfig={sortConfig} requestSort={requestSort} />
                <SortableHeader sortKey="requestDate" title="Request Date" sortConfig={sortConfig} requestSort={requestSort} />
                <SortableHeader sortKey="totalAmount" title="Est. Total" className="text-right" sortConfig={sortConfig} requestSort={requestSort} />
                <th className="p-4 font-medium text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {requisitions.length > 0 ? (
                requisitions.map(pr => (
                  <tr
                    key={pr._id}
                    className={`border-b cursor-pointer transition-colors ${
                      selectedPRId === pr._id
                        ? 'bg-primary/10'
                        : 'hover:bg-accent'
                    }`}
                    onClick={() => onSelectPR(pr._id)}
                  >
                    <td className="p-4 font-mono font-medium text-primary whitespace-nowrap">{pr.prNumber}</td>
                    <td className="p-4 whitespace-nowrap">{pr.requesterName}</td>
                    <td className="p-4 whitespace-nowrap">{pr.department}</td>
                    <td className="p-4 whitespace-nowrap">{formatDate(pr.requestDate)}</td>
                    <td className="p-4 text-right whitespace-nowrap">
                        <div>{formatCurrency(pr.totalAmount, pr.currency)}</div>
                        {pr.currency !== displayCurrency && rates && (
                            <div className="text-xs text-muted-foreground">
                                ~ {formatCurrency(convertCurrency(pr.totalAmount, pr.currency, displayCurrency, rates), displayCurrency)}
                            </div>
                        )}
                    </td>
                    <td className="p-4 text-center whitespace-nowrap"><StatusBadge status={pr.status} /></td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-muted-foreground">
                    No requisitions found for the current search criteria.
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

export default RequisitionList;
