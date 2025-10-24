import React, { useState, useEffect } from 'react';
import type { Vendor, Material, ExtractedPOData, ExtractedRFQData, ExtractedGRNData, ExtractedInvoiceData } from '../../types';
import { Button } from './Button';
import { Input } from './Input';
import ConfirmationDialog from './ConfirmationDialog';


type Entity = Omit<Vendor, '_id'> | Omit<Material, '_id'> | ExtractedPOData | ExtractedRFQData | ExtractedGRNData | ExtractedInvoiceData;

interface Column {
    key: string;
    label: string;
    render?: (item: any) => React.ReactNode;
    editable?: boolean;
    type?: 'text' | 'number';
}

interface BulkDataReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reviewedData: Entity[]) => void;
  initialData: Entity[] | null;
  entityType: 'vendors' | 'materials' | 'purchaseOrders' | 'rfqs' | 'goodsReceipts' | 'invoices';
}


const vendorColumns: Column[] = [
    { key: 'name', label: 'Name' },
    { key: 'supplierCode', label: 'Code' },
    { key: 'status', label: 'Status' },
    { key: 'rating', label: 'Rating' },
    { key: 'contacts', label: 'Contacts', render: (item: any) => <span>{item.contacts?.length || 0}</span> },
];

const materialColumns: Column[] = [
    { key: 'sku', label: 'SKU' },
    { key: 'description', label: 'Description', editable: true },
    { key: 'category', label: 'Category', editable: true },
    { key: 'uom', label: 'UOM', editable: true },
    { key: 'defaultPrice', label: 'Price', editable: true, type: 'number', render: (item: any) => <span>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(item.defaultPrice)}</span> },
];

const poColumns: Column[] = [
    { key: 'poNo', label: 'PO Number' },
    { key: 'supplierName', label: 'Vendor' },
    { key: 'issueDate', label: 'Date' },
    { key: 'lines', label: 'Lines', render: (item: any) => <span>{item.lines?.length || 0}</span> },
];

const rfqColumns: Column[] = [
    { key: 'prNumber', label: 'Source PR' },
    { key: 'dueDate', label: 'Due Date' },
    { key: 'invitedVendorNames', label: 'Vendors', render: (item: any) => <span>{item.invitedVendorNames?.length || 0}</span> },
];

const grnColumns: Column[] = [
    { key: 'poNumber', label: 'Source PO' },
    { key: 'grnNumber', label: 'GRN Number' },
    { key: 'receivedDate', label: 'Received Date' },
    { key: 'receivedByName', label: 'Received By' },
    { key: 'items', label: 'Items', render: (item: any) => <span>{item.items?.length || 0}</span> },
];

const invoiceColumns: Column[] = [
    { key: 'poNumber', label: 'Source PO' },
    { key: 'invoiceNumber', label: 'Invoice #' },
    { key: 'invoiceDate', label: 'Date' },
    { key: 'dueDate', label: 'Due Date' },
    { key: 'amount', label: 'Amount', render: (item: any) => <span>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(item.amount)}</span> },
];


const getEntityTypeInfo = (entityType: BulkDataReviewModalProps['entityType']) => {
    switch (entityType) {
        case 'vendors': return { columns: vendorColumns, title: 'Review Vendors', identifierKey: 'name' };
        case 'materials': return { columns: materialColumns, title: 'Review Materials', identifierKey: 'description' };
        case 'purchaseOrders': return { columns: poColumns, title: 'Review Purchase Orders', identifierKey: 'poNo' };
        case 'rfqs': return { columns: rfqColumns, title: 'Review RFQs', identifierKey: 'prNumber' };
        case 'goodsReceipts': return { columns: grnColumns, title: 'Review Goods Receipts', identifierKey: 'poNumber' };
        case 'invoices': return { columns: invoiceColumns, title: 'Review Invoices', identifierKey: 'invoiceNumber' };
        default: return { columns: [], title: 'Review Data', identifierKey: '' };
    }
}

const BulkDataReviewModal: React.FC<BulkDataReviewModalProps> = ({ isOpen, onClose, onConfirm, initialData, entityType }) => {
    const [reviewedData, setReviewedData] = useState<Entity[]>([]);
    const [bulkUpdateInfo, setBulkUpdateInfo] = useState<{
        similarIndices: number[];
        columnKey: string;
        newValue: any;
        sourceIdentifier: string;
        identifierKey: string;
    } | null>(null);


    useEffect(() => {
        if (initialData) {
            setReviewedData(initialData);
        }
    }, [initialData]);

    if (!isOpen || !initialData) return null;

    const { columns, title, identifierKey } = getEntityTypeInfo(entityType);
    const description = `The AI has extracted the following ${reviewedData.length} records. You can edit the fields and use the bulk update prompt to apply changes to similar items.`;
    
    const handleCellChange = (rowIndex: number, columnKey: string, value: any) => {
        setReviewedData(prevData => {
            const newData = [...prevData];
            const item = { ...newData[rowIndex] };
            const columnDef = columns.find(c => c.key === columnKey);
            (item as any)[columnKey] = columnDef?.type === 'number' ? Number(value) || 0 : value;
            newData[rowIndex] = item;
            return newData;
        });
    };
    
    const handleCellBlur = (rowIndex: number, columnKey: string) => {
        // Feature is scoped to materials as requested. Can be expanded to other master data.
        if (entityType !== 'materials') return;

        const changedItem = reviewedData[rowIndex] as any;
        const originalItem = initialData[rowIndex] as any;
        
        const newValue = changedItem[columnKey];
        const oldValue = originalItem[columnKey];
        const sourceIdentifier = changedItem[identifierKey];

        if (newValue === oldValue || !sourceIdentifier) return;
        
        const similarIndices = reviewedData
            .map((row, index) => ({ row, index }))
            .filter(({ row, index }) => 
                index !== rowIndex && 
                (row as any)[identifierKey] === sourceIdentifier &&
                (row as any)[columnKey] !== newValue
            )
            .map(({ index }) => index);
        
        if (similarIndices.length > 0) {
            setBulkUpdateInfo({
                similarIndices,
                columnKey,
                newValue,
                sourceIdentifier,
                identifierKey,
            });
        }
    };
    
    const handleConfirmBulkUpdate = () => {
        if (!bulkUpdateInfo) return;

        setReviewedData(prevData => {
            const newData = [...prevData];
            bulkUpdateInfo.similarIndices.forEach(index => {
                const item = { ...newData[index] };
                (item as any)[bulkUpdateInfo.columnKey] = bulkUpdateInfo.newValue;
                newData[index] = item;
            });
            return newData;
        });

        setBulkUpdateInfo(null);
    };

    const handleConfirmAndClose = () => {
        onConfirm(reviewedData);
    };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
        <div className="relative w-full max-w-4xl rounded-lg border bg-card text-card-foreground shadow-sm m-4" onClick={e => e.stopPropagation()}>
          <div className="flex flex-col space-y-1.5 p-6 border-b">
            <h3 className="text-2xl font-semibold leading-none tracking-tight">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          <div className="p-6 max-h-[60vh] overflow-y-auto">
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm text-left text-card-foreground">
                <thead className="bg-muted/50">
                  <tr>
                    {columns.map(col => <th key={col.key} className="p-3 font-medium">{col.label}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {reviewedData.map((item, index) => (
                    <tr key={index} className="hover:bg-accent">
                      {columns.map(col => (
                        <td key={col.key} className="p-1">
                          {col.editable ? (
                            <Input
                                type={col.type || 'text'}
                                value={(item as any)[col.key] || ''}
                                onChange={(e) => handleCellChange(index, col.key, e.target.value)}
                                onBlur={() => handleCellBlur(index, col.key)}
                                className="h-8 border-transparent hover:border-input focus:border-ring focus:bg-background"
                             />
                          ) : col.render ? (
                            <div className="p-2 h-8 flex items-center">{col.render(item)}</div>
                           ) : (
                            <div className="p-2 h-8 flex items-center">{(item as any)[col.key] || 'N/A'}</div>
                           )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="flex items-center justify-end p-6 border-t space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="button" onClick={handleConfirmAndClose}>Confirm & Add {reviewedData.length} Records</Button>
          </div>
        </div>
      </div>
      {bulkUpdateInfo && (
        <ConfirmationDialog
            isOpen={!!bulkUpdateInfo}
            onClose={() => setBulkUpdateInfo(null)}
            onConfirm={handleConfirmBulkUpdate}
            title="Bulk Update"
            description={`Apply the value "${bulkUpdateInfo.newValue}" to the '${bulkUpdateInfo.columnKey}' field for ${bulkUpdateInfo.similarIndices.length} other item(s) where ${bulkUpdateInfo.identifierKey} is "${bulkUpdateInfo.sourceIdentifier}"?`}
            confirmText="Apply to All"
        />
      )}
    </>
  );
};

export default BulkDataReviewModal;