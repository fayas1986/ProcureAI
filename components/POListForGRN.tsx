import React from 'react';
import type { PurchaseOrder, Vendor } from '../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from './common/Card';
import Pagination from './common/Pagination';

interface POListForGRNProps {
  purchaseOrders: PurchaseOrder[];
  vendors: Vendor[];
  selectedPOId: string | null;
  onSelectPO: (id: string | null) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const POListForGRN: React.FC<POListForGRNProps> = ({ purchaseOrders, vendors, selectedPOId, onSelectPO, currentPage, totalPages, onPageChange }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="p-4 border-b">
        <CardTitle className="text-lg">POs Ready for Receipt</CardTitle>
        <CardDescription>Select a PO to record a goods receipt.</CardDescription>
      </CardHeader>
      <CardContent className="p-0 flex-grow overflow-y-auto">
        {purchaseOrders.length > 0 ? (
          <ul className="divide-y divide-border">
            {purchaseOrders.map(po => {
              const vendor = vendors.find(v => v._id === po.vendorId);
              return (
                <li
                  key={po._id}
                  className={`p-3 cursor-pointer transition-colors ${selectedPOId === po._id ? 'bg-primary/10' : 'hover:bg-accent'}`}
                  onClick={() => onSelectPO(po._id)}
                >
                  <div className="flex justify-between items-center">
                    <p className="font-semibold text-primary">{po.poNumber}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(po.orderDate)}</p>
                  </div>
                  <p className="text-sm text-card-foreground">{vendor?.name || 'Unknown Vendor'}</p>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="p-6 text-center text-muted-foreground">
            No approved purchase orders match the current filters.
          </div>
        )}
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

export default POListForGRN;