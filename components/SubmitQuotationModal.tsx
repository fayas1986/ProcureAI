import React, { useState, useEffect, useMemo } from 'react';
import type { RFQ, Vendor, Quotation, QuotationItem, Currency, Material } from '../types';
import { Button } from './common/Button';
import { Input } from './common/Input';

type QuotationItemForm = Omit<QuotationItem, '_id' | 'materialId' | 'product_name' | 'quantity' | 'totalPrice'>;

interface SubmitQuotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (rfqId: string, vendorId: string, quotation: Quotation) => void;
  rfq: RFQ;
  vendor: Vendor;
  materials: Material[];
}

const SubmitQuotationModal: React.FC<SubmitQuotationModalProps> = ({ isOpen, onClose, onSave, rfq, vendor, materials }) => {
  const [validityDate, setValidityDate] = useState('');
  const [itemForms, setItemForms] = useState<Record<string, QuotationItemForm>>({});
  const [taxRate, setTaxRate] = useState(0);
  
  const { subtotal, taxAmount, totalAmount } = useMemo(() => {
    const sub = rfq.items.reduce((sum, item) => {
        const formItem = itemForms[item.materialId];
        const price = formItem?.unitPrice || 0;
        return sum + (item.quantity * price);
    }, 0);
    const tax = sub * (taxRate / 100);
    const total = sub + tax;
    return { subtotal: sub, taxAmount: tax, totalAmount: total };
  }, [rfq.items, itemForms, taxRate]);

  useEffect(() => {
    if (isOpen) {
      const today = new Date();
      today.setDate(today.getDate() + 30); // Default validity 30 days
      setValidityDate(today.toISOString().split('T')[0]);
      setTaxRate(0);

      const initialForms: Record<string, QuotationItemForm> = {};
      rfq.items.forEach(item => {
        const material = materials.find(m => m._id === item.materialId);
        initialForms[item.materialId] = { unitPrice: material?.defaultPrice || 0 };
      });
      setItemForms(initialForms);
    }
  }, [isOpen, rfq, materials]);

  const handleItemChange = (materialId: string, field: keyof QuotationItemForm, value: number) => {
    setItemForms(prev => ({
      ...prev,
      [materialId]: { ...prev[materialId], [field]: value }
    }));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const quotationItems: QuotationItem[] = rfq.items.map(item => {
        const formItem = itemForms[item.materialId];
        const unitPrice = formItem?.unitPrice || 0;
        return {
            _id: `QI${Date.now()}${Math.random()}`,
            materialId: item.materialId,
            product_name: item.product_name,
            quantity: item.quantity,
            unitPrice: unitPrice,
            totalPrice: item.quantity * unitPrice,
        }
    });

    const newQuotation: Quotation = {
        _id: `Q${Date.now()}`,
        rfqVendorId: rfq.invitedVendors.find(v => v.vendorId === vendor._id)!._id,
        vendorId: vendor._id,
        submittedDate: new Date().toISOString(),
        validityDate: new Date(validityDate).toISOString(),
        currency: rfq.currency,
        items: quotationItems,
        subtotal,
        taxRate,
        taxAmount,
        totalAmount,
    };
    
    onSave(rfq._id, vendor._id, newQuotation);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-2xl rounded-lg border bg-card text-card-foreground shadow-sm m-4" onClick={e => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col space-y-1.5 p-6 border-b">
            <h3 className="text-2xl font-semibold leading-none tracking-tight">Submit Quotation</h3>
            <p className="text-sm text-muted-foreground">For vendor: <span className="font-semibold text-primary">{vendor.name}</span> on RFQ <span className="font-semibold text-primary">{rfq.rfqNumber}</span></p>
          </div>
          <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
            <div>
              <label className="text-sm font-medium mb-1 block">Quotation Validity Date</label>
              <Input type="date" value={validityDate} onChange={e => setValidityDate(e.target.value)} required />
            </div>
            
            <h4 className="font-semibold text-sm pt-2">Item Pricing</h4>
            <div className="space-y-3">
              {rfq.items.map(item => (
                <div key={item._id} className="grid grid-cols-12 gap-4 items-center p-3 rounded-md bg-muted/50">
                    <div className="col-span-8">
                        <p className="font-medium">{item.product_name}</p>
                        <p className="text-xs text-muted-foreground">Required Quantity: {item.quantity} {item.uom}</p>
                    </div>
                    <div className="col-span-4">
                        <label className="text-xs font-medium text-muted-foreground block mb-1">Unit Price ({rfq.currency})</label>
                        <Input type="number" step="0.01" value={itemForms[item.materialId]?.unitPrice || ''} onChange={e => handleItemChange(item.materialId, 'unitPrice', Number(e.target.value))} required />
                    </div>
                </div>
              ))}
            </div>
            
             <div className="grid grid-cols-2 gap-4 items-end pt-4 border-t">
                <div>
                    <label className="text-sm font-medium mb-1 block">Tax Rate (%)</label>
                    <Input type="number" value={taxRate} onChange={e => setTaxRate(Number(e.target.value))} min="0" step="0.01" />
                </div>
                <div className="text-right space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Subtotal:</span>
                      <span className="font-medium">{new Intl.NumberFormat('en-US', { style: 'currency', currency: rfq.currency }).format(subtotal)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Tax ({taxRate}%):</span>
                      <span className="font-medium">{new Intl.NumberFormat('en-US', { style: 'currency', currency: rfq.currency }).format(taxAmount)}</span>
                    </div>
                     <div className="border-t my-1"></div>
                     <div className="flex justify-between items-center">
                        <span className="text-base font-semibold">Grand Total:</span>
                        <span className="text-xl font-bold">{new Intl.NumberFormat('en-US', { style: 'currency', currency: rfq.currency }).format(totalAmount)}</span>
                    </div>
                </div>
            </div>

          </div>
          <div className="flex items-center justify-end p-6 border-t space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">Submit Quotation</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SubmitQuotationModal;