import React, { useState, useEffect, useMemo } from 'react';
import type { PurchaseOrder, GoodsReceipt, GoodsReceiptItem, User } from '../types';
import { GoodsReceiptStatus } from '../types';
import { Button } from './common/Button';
import { Input } from './common/Input';

type GRNItemForm = Omit<GoodsReceiptItem, '_id' | 'poLineId' | 'materialId' | 'description' | 'orderedQty'> & {
    lineError?: string;
};

interface CreateGRNModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newGRN: GoodsReceipt) => void;
  purchaseOrder: PurchaseOrder;
  existingGRNs: GoodsReceipt[];
  currentUser: User | null;
  users: User[];
}

const CreateGRNModal: React.FC<CreateGRNModalProps> = ({ isOpen, onClose, onSave, purchaseOrder, existingGRNs, currentUser, users }) => {
  const [receivedDate, setReceivedDate] = useState('');
  const [receivedById, setReceivedById] = useState('');
  const [notes, setNotes] = useState('');
  const [itemForms, setItemForms] = useState<Record<string, GRNItemForm>>({});

  const previouslyReceivedQuantities = useMemo(() => {
    const quantities: Record<string, number> = {};
    for (const line of purchaseOrder.lines) {
      quantities[line._id] = existingGRNs
        .flatMap(grn => grn.items)
        .filter(item => item.poLineId === line._id)
        .reduce((sum: number, item) => sum + item.acceptedQty, 0);
    }
    return quantities;
  }, [purchaseOrder.lines, existingGRNs]);

  useEffect(() => {
    if (isOpen) {
      setReceivedDate(new Date().toISOString().split('T')[0]);
      setReceivedById(currentUser?._id || '');
      setNotes('');

      const initialForms: Record<string, GRNItemForm> = {};
      purchaseOrder.lines.forEach(line => {
        initialForms[line._id] = { receivedQty: 0, acceptedQty: 0, rejectedQty: 0, rejectionReason: '' };
      });
      setItemForms(initialForms);
    }
  }, [isOpen, purchaseOrder, currentUser]);

  const handleItemChange = (lineId: string, field: keyof GRNItemForm, value: string) => {
    const isNumericField = field === 'receivedQty' || field === 'acceptedQty' || field === 'rejectedQty';
    const processedValue = isNumericField ? (parseInt(value, 10) || 0) : value;

    setItemForms(prev => ({
      ...prev,
      [lineId]: { ...prev[lineId], [field]: processedValue }
    }));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const updatedItemForms = { ...itemForms };
    let isValid = true;
    const itemsForNewGRN: GoodsReceiptItem[] = [];

    // Step 1: Validate and process each line
    for (const poLine of purchaseOrder.lines) {
        const formInput = itemForms[poLine._id] || { receivedQty: 0, acceptedQty: 0, rejectedQty: 0, rejectionReason: '' };
        
        // Sanitize all numeric inputs IMMEDIATELY. Default to 0 if invalid/empty.
        const receivedQty = Number(formInput.receivedQty) || 0;
        const acceptedQty = Number(formInput.acceptedQty) || 0;
        const rejectedQty = Number(formInput.rejectedQty) || 0;
        const rejectionReason = (formInput.rejectionReason || '').trim();

        const alreadyAccepted = previouslyReceivedQuantities[poLine._id] || 0;
        const remainingToReceive = poLine.quantity - alreadyAccepted;
        
        let lineError = '';
        if (receivedQty < 0 || acceptedQty < 0 || rejectedQty < 0) {
            lineError = 'Quantities cannot be negative.';
        } else if (receivedQty > remainingToReceive) {
            lineError = `Cannot receive more than the remaining ${remainingToReceive}.`;
        } else if (receivedQty !== acceptedQty + rejectedQty) {
            lineError = 'Accepted + Rejected must equal Received quantity.';
        } else if (rejectedQty > 0 && !rejectionReason) {
            lineError = 'Rejection reason is required for rejected items.';
        }
        
        updatedItemForms[poLine._id] = { ...formInput, receivedQty, acceptedQty, rejectedQty, lineError };
        if (lineError) {
            isValid = false;
        }

        // Only add items to the final GRN if they were actually received
        if (receivedQty > 0) {
            itemsForNewGRN.push({
                _id: `GRNI-${poLine._id}-${Date.now()}`,
                poLineId: poLine._id,
                materialId: poLine.materialId,
                description: poLine.description,
                orderedQty: poLine.quantity,
                receivedQty,
                acceptedQty,
                rejectedQty,
                rejectionReason: rejectionReason || undefined,
            });
        }
    }

    // Update state to show errors, then stop if invalid
    setItemForms(updatedItemForms);
    if (!isValid) {
        return;
    }

    // Step 2: Check if the GRN is empty
    if (itemsForNewGRN.length === 0) {
        alert("Cannot create an empty goods receipt. Please enter a 'Received Qty' for at least one item.");
        return;
    }

    // Step 3: Determine GRN status
    const totalAccepted = itemsForNewGRN.reduce((sum, item) => sum + item.acceptedQty, 0);
    const totalRejected = itemsForNewGRN.reduce((sum, item) => sum + item.rejectedQty, 0);

    let grnStatus: GoodsReceiptStatus;
    if (totalRejected > 0 && totalAccepted === 0) {
        grnStatus = GoodsReceiptStatus.Rejected;
    } else if (totalAccepted > 0 && totalRejected > 0) {
        grnStatus = GoodsReceiptStatus.Partial;
    } else { // totalAccepted > 0 and totalRejected === 0
        grnStatus = GoodsReceiptStatus.Accepted;
    }
    
    // Step 4: Create and save the new GRN object
    const newGRN: GoodsReceipt = {
        _id: `GRN-${Date.now()}`,
        grnNumber: `GRN-${new Date().getFullYear()}-00${Math.floor(Math.random() * 900) + 100}`,
        poId: purchaseOrder._id,
        receivedDate: new Date(receivedDate).toISOString(),
        receivedById,
        status: grnStatus,
        notes: notes.trim(),
        items: itemsForNewGRN,
    };

    onSave(newGRN);
    onClose();
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-4xl rounded-lg border bg-card text-card-foreground shadow-sm m-4" onClick={e => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col space-y-1.5 p-6 border-b">
            <h3 className="text-2xl font-semibold leading-none tracking-tight">Create Goods Receipt Note</h3>
            <p className="text-sm text-muted-foreground">For Purchase Order: <span className="font-semibold text-primary">{purchaseOrder.poNumber}</span></p>
          </div>
          <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Received Date</label>
                <Input type="date" value={receivedDate} onChange={e => setReceivedDate(e.target.value)} required />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Received By</label>
                <select value={receivedById} onChange={e => setReceivedById(e.target.value)} required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  {users.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
                </select>
              </div>
            </div>
            
            <h4 className="font-semibold text-sm pt-2">Items</h4>
            <div className="space-y-3">
              {purchaseOrder.lines.map(line => {
                const formInput = itemForms[line._id] || { lineError: '' };
                return (
                    <div key={line._id} className={`p-3 rounded-md bg-muted/50 border ${formInput.lineError ? 'border-destructive' : 'border-transparent'}`}>
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-x-4 gap-y-2 items-center">
                        <div className="md:col-span-12">
                          <p className="font-medium">{line.description}</p>
                          <p className="text-xs text-muted-foreground">
                            Ordered: {line.quantity} | Previously Received: {previouslyReceivedQuantities[line._id]} | <span className="font-semibold">Remaining: {line.quantity - previouslyReceivedQuantities[line._id]}</span>
                          </p>
                        </div>
                        <div className="md:col-span-3">
                          <label className="text-xs font-medium text-muted-foreground block mb-1">Received Qty</label>
                          <Input type="number" min="0" value={itemForms[line._id]?.receivedQty || ''} onChange={e => handleItemChange(line._id, 'receivedQty', e.target.value)} />
                        </div>
                         <div className="md:col-span-3">
                          <label className="text-xs font-medium text-muted-foreground block mb-1">Accepted Qty</label>
                          <Input type="number" min="0" value={itemForms[line._id]?.acceptedQty || ''} onChange={e => handleItemChange(line._id, 'acceptedQty', e.target.value)} />
                        </div>
                         <div className="md:col-span-3">
                          <label className="text-xs font-medium text-muted-foreground block mb-1">Rejected Qty</label>
                          <Input type="number" min="0" value={itemForms[line._id]?.rejectedQty || ''} onChange={e => handleItemChange(line._id, 'rejectedQty', e.target.value)} />
                        </div>
                         <div className="md:col-span-3">
                          <label className="text-xs font-medium text-muted-foreground block mb-1">Rejection Reason</label>
                          <Input value={itemForms[line._id]?.rejectionReason || ''} onChange={e => handleItemChange(line._id, 'rejectionReason', e.target.value)} disabled={(itemForms[line._id]?.rejectedQty || 0) === 0} />
                        </div>
                        {formInput.lineError && <p className="text-sm text-destructive md:col-span-12 mt-1">{formInput.lineError}</p>}
                      </div>
                    </div>
                );
              })}
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Notes</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Add any notes for this goods receipt..."></textarea>
            </div>
          </div>
          <div className="flex items-center justify-end p-6 border-t space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">Save GRN</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateGRNModal;
