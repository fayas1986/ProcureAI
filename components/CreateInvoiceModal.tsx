
import React, { useState, useEffect } from 'react';
import type { PurchaseOrder, Vendor, Invoice } from '../types';
import { InvoiceStatus } from '../types';
import { Button } from './common/Button';
import { Input } from './common/Input';

interface CreateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newInvoice: Invoice) => void;
  purchaseOrders: PurchaseOrder[];
  vendors: Vendor[];
}

const CreateInvoiceModal: React.FC<CreateInvoiceModalProps> = ({ isOpen, onClose, onSave, purchaseOrders, vendors }) => {
  const [poId, setPoId] = useState<string>('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  
  const selectedPO = poId ? purchaseOrders.find(po => po._id === poId) : null;
  const vendor = selectedPO ? vendors.find(v => v._id === selectedPO.vendorId) : null;

  useEffect(() => {
    if (isOpen) {
      // Reset form
      setPoId('');
      setInvoiceNumber('');
      setNotes('');
      setInvoiceDate(new Date().toISOString().split('T')[0]);
      setDueDate('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedPO && vendor && invoiceDate) {
        const vendorCode = vendor.supplierCode.split('-')[0] || 'GEN';
        const newInvoiceNumber = `${vendorCode}-INV-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000) + 1000}`;
        setInvoiceNumber(newInvoiceNumber);
        
        // Auto-calculate due date based on payment terms
        const baseDate = new Date(invoiceDate);
        if (isNaN(baseDate.getTime())) return; // Don't calculate if invoice date is invalid

        let daysToAdd = 30; // Default to 30 days
        if (vendor.paymentTerms) {
            const terms = vendor.paymentTerms.toLowerCase();
            if (terms.includes('net')) {
                const daysMatch = terms.match(/net (\d+)/);
                if (daysMatch && daysMatch[1]) {
                    daysToAdd = parseInt(daysMatch[1], 10);
                }
            } else if (terms.includes('due on receipt')) {
                daysToAdd = 0;
            }
        }
        
        baseDate.setDate(baseDate.getDate() + daysToAdd);
        setDueDate(baseDate.toISOString().split('T')[0]);

    } else {
        setInvoiceNumber('');
        setDueDate('');
    }
  }, [selectedPO, vendor, invoiceDate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPO || !vendor) {
        alert('Please select a valid Purchase Order.');
        return;
    }
    
    if (!invoiceNumber) {
        alert('An invoice number could not be generated. Please try again.');
        return;
    }

    const newInvoice: Invoice = {
        _id: `INV${Date.now()}`,
        invoiceNumber,
        poId: selectedPO._id,
        vendorId: vendor._id,
        invoiceDate: new Date(invoiceDate).toISOString(),
        dueDate: new Date(dueDate).toISOString(),
        subtotal: selectedPO.subtotal,
        taxRate: selectedPO.taxRate,
        taxAmount: selectedPO.taxAmount,
        amount: selectedPO.totalAmount,
        currency: selectedPO.currency,
        status: InvoiceStatus.Pending,
        payments: [],
        notes,
    };
    
    onSave(newInvoice);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-2xl rounded-lg border bg-card text-card-foreground shadow-sm m-4" onClick={e => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col space-y-1.5 p-6 border-b">
            <h3 className="text-2xl font-semibold leading-none tracking-tight">Create Invoice</h3>
            <p className="text-sm text-muted-foreground">Generate a new invoice from an approved Purchase Order.</p>
          </div>
          <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
            <div>
              <label className="text-sm font-medium mb-1 block">Select Purchase Order</label>
              <select value={poId} onChange={e => setPoId(e.target.value)} required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="" disabled>Select a PO</option>
                {purchaseOrders.map(po => <option key={po._id} value={po._id}>{po.poNumber} - {vendors.find(v => v._id === po.vendorId)?.name}</option>)}
              </select>
            </div>

            {selectedPO && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm font-medium mb-1 block">Invoice Number</label>
                        <Input value={invoiceNumber} readOnly disabled className="bg-muted/50 font-mono"/>
                    </div>
                    <div>
                        <label className="text-sm font-medium mb-1 block">Invoice Amount (Inc. Tax)</label>
                        <Input value={`${selectedPO.totalAmount.toFixed(2)} ${selectedPO.currency}`} readOnly disabled className="bg-muted/50"/>
                    </div>
                </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm font-medium mb-1 block">Invoice Date</label>
                        <Input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} required />
                    </div>
                    <div>
                        <label className="text-sm font-medium mb-1 block">Due Date</label>
                        <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} required />
                    </div>
                </div>
              </>
            )}
            <div>
              <label className="text-sm font-medium mb-1 block">Notes</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Add any notes for this invoice..."></textarea>
            </div>
          </div>
          <div className="flex items-center justify-end p-6 border-t space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={!selectedPO}>Create Invoice</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateInvoiceModal;
