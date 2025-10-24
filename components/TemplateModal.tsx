import React, { useState, useEffect, useMemo } from 'react';
import type { POTemplate, Vendor, Material, PurchaseOrderLine, Currency } from '../types';
import { Button } from './common/Button';
import { Input } from './common/Input';
import { convertCurrency } from '../services/currencyService';
import { SearchableSelect } from './common/SearchableSelect';

type POLineFormData = Omit<PurchaseOrderLine, '_id'>;

interface TemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (templateData: Omit<POTemplate, '_id'>, id: string | null) => void;
  vendors: Vendor[];
  materials: Material[];
  initialData?: POTemplate | null;
  rates: Record<string, number> | null;
}

const TemplateModal: React.FC<TemplateModalProps> = ({ isOpen, onClose, onSave, vendors, materials, initialData, rates }) => {
  const isEditMode = !!(initialData && '_id' in initialData);

  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [lines, setLines] = useState<POLineFormData[]>([]);
  const [notes, setNotes] = useState('');
  const [currency, setCurrency] = useState<Currency>('USD');
  const [taxRate, setTaxRate] = useState(0);
  const isRatesLoading = rates === null;

  const sortedVendors = useMemo(() => {
    return [...vendors].sort((a, b) => a.name.localeCompare(b.name));
  }, [vendors]);
  
  const vendorOptions = useMemo(() => {
    return sortedVendors.map(v => ({ value: v._id, label: v.name }));
  }, [sortedVendors]);

  useEffect(() => {
    if (isOpen) {
        if (initialData) {
            setTemplateName(initialData.templateName || '');
            setTemplateDescription(initialData.templateDescription || '');
            setVendorId(initialData.vendorId || '');
            setNotes(initialData.notes || '');
            setLines(initialData.lines || [{ materialId: '', description: '', quantity: 1, uom: '', unitPrice: 0, totalPrice: 0 }]);
            setCurrency(initialData.currency || 'USD');
            setTaxRate(initialData.taxRate || 0);
        } else {
            setTemplateName('');
            setTemplateDescription('');
            setVendorId('');
            setNotes('');
            setLines([{ materialId: '', description: '', quantity: 1, uom: 'EA', unitPrice: 0, totalPrice: 0 }]);
            setCurrency('USD');
            setTaxRate(0);
        }
    }
  }, [isOpen, initialData]);
  
  useEffect(() => {
    const vendor = vendors.find(s => s._id === vendorId);
    if (vendor) {
        setCurrency(vendor.defaultCurrency);
    }
  }, [vendorId, vendors]);

  useEffect(() => {
    if (!rates || isRatesLoading) return;

    setLines(prevLines => prevLines.map(line => {
        const material = materials.find(m => m._id === line.materialId);
        if (material) {
            const newUnitPrice = convertCurrency(material.defaultPrice, 'USD', currency, rates);
            const finalPrice = parseFloat(newUnitPrice.toFixed(2));
            return {
                ...line,
                unitPrice: finalPrice,
                totalPrice: (line.quantity || 0) * finalPrice,
            };
        }
        return line;
    }));

  }, [currency, rates, isRatesLoading, materials]);

  const handleLineChange = (index: number, field: keyof POLineFormData, value: any) => {
    const newLines = [...lines];
    const line = newLines[index];
    (line as any)[field] = value;

    if (field === 'materialId' && rates) {
        const material = materials.find(m => m._id === value);
        if (material) {
            line.description = material.description;
            line.uom = material.uom;
            const newUnitPrice = convertCurrency(material.defaultPrice, 'USD', currency, rates);
            line.unitPrice = parseFloat(newUnitPrice.toFixed(2));
        }
    }

    line.totalPrice = (line.quantity || 0) * (line.unitPrice || 0);
    setLines(newLines);
  };

  const addLine = () => setLines([...lines, { materialId: '', description: '', quantity: 1, uom: 'EA', unitPrice: 0, totalPrice: 0 }]);
  const removeLine = (index: number) => setLines(lines.filter((_, i) => i !== index));
  
  const { subtotal, taxAmount, totalAmount } = useMemo(() => {
      const sub = lines.reduce((acc, l) => acc + (l.totalPrice || 0), 0);
      const tax = sub * (taxRate / 100);
      const total = sub + tax;
      return { subtotal: sub, taxAmount: tax, totalAmount: total };
  }, [lines, taxRate]);

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!templateName) {
          alert('Template Name is required.');
          return;
      }
      
      const templateData: Omit<POTemplate, '_id'> = {
          templateName,
          templateDescription,
          vendorId,
          lines: lines.map(l => ({...l, _id: `TPL_L${Date.now()}${Math.random()}`})),
          subtotal,
          taxRate,
          taxAmount,
          totalAmount,
          currency,
          notes,
      };

      onSave(templateData, isEditMode ? initialData._id! : null);
      onClose();
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-4xl rounded-lg border bg-card text-card-foreground shadow-sm m-4" onClick={e => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col space-y-1.5 p-6 border-b">
            <h3 className="text-2xl font-semibold leading-none tracking-tight">{isEditMode ? 'Edit PO Template' : 'Create New PO Template'}</h3>
            <p className="text-sm text-muted-foreground">Fill in the details to create a reusable PO template.</p>
          </div>
          <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="text-sm font-medium mb-1 block">Template Name</label>
                    <Input value={templateName} onChange={e => setTemplateName(e.target.value)} required />
                </div>
                 <div>
                    <label className="text-sm font-medium mb-1 block">Template Description</label>
                    <Input value={templateDescription} onChange={e => setTemplateDescription(e.target.value)} />
                </div>
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="text-sm font-medium mb-1 block">Default Vendor</label>
                    <SearchableSelect
                        value={vendorId}
                        onChange={setVendorId}
                        options={vendorOptions}
                        placeholder="(Optional) Select a vendor"
                    />
                </div>
                <div>
                    <label className="text-sm font-medium mb-1 block">Currency</label>
                     <select value={currency} onChange={e => setCurrency(e.target.value as any)} required disabled={isRatesLoading} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50 disabled:cursor-wait">
                        {isRatesLoading ? (
                            <option>Loading rates...</option>
                        ) : (
                            <><option value="USD">USD</option><option value="EUR">EUR</option><option value="INR">INR</option><option value="AED">AED</option><option value="SAR">SAR</option><option value="QAR">QAR</option><option value="KWD">KWD</option><option value="OMR">OMR</option><option value="BHD">BHD</option><option value="JOD">JOD</option><option value="EGP">EGP</option><option value="ILS">ILS</option><option value="TRY">TRY</option></>
                        )}
                    </select>
                </div>
            </div>
            
            <h4 className="font-semibold text-sm pt-2">Template Lines</h4>
             <div className="space-y-2">
                {lines.map((line, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-start p-2 rounded-md bg-muted/50">
                        <div className="col-span-5">
                            <select value={line.materialId} onChange={e => handleLineChange(index, 'materialId', e.target.value)} required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                                    <option value="" disabled>Select a material</option>
                                    {materials.map(m => <option key={m._id} value={m._id}>{m.sku} - {m.description}</option>)}
                            </select>
                        </div>
                        <div className="col-span-2">
                            <Input className="w-full" type="number" placeholder="Qty" value={line.quantity || ''} onChange={e => handleLineChange(index, 'quantity', Number(e.target.value))} required min="1" />
                        </div>
                        <div className="col-span-2">
                            <Input className="w-full" type="number" placeholder="Unit Price" value={line.unitPrice || ''} onChange={e => handleLineChange(index, 'unitPrice', Number(e.target.value))} required step="0.01" />
                        </div>
                        <div className="col-span-2 text-right font-medium pr-2 pt-2">{new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(line.totalPrice || 0)}</div>
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeLine(index)} disabled={lines.length <= 1}>
                                <svg className="w-4 h-4 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </Button>
                    </div>
                ))}
                    <Button type="button" variant="outline" size="sm" onClick={addLine}>Add Line</Button>
            </div>
            
            <div>
                <label className="text-sm font-medium mb-1 block">Default Notes</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Add any default notes for POs created from this template..."></textarea>
            </div>
            
            <div className="grid grid-cols-2 gap-4 items-end pt-4 border-t">
                <div>
                    <label className="text-sm font-medium mb-1 block">Default Tax Rate (%)</label>
                    <Input type="number" value={taxRate} onChange={e => setTaxRate(Number(e.target.value))} min="0" step="0.01" />
                </div>
                <div className="text-right space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Subtotal:</span>
                      <span className="font-medium">{new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(subtotal)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Tax ({taxRate}%):</span>
                      <span className="font-medium">{new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(taxAmount)}</span>
                    </div>
                     <div className="border-t my-1"></div>
                     <div className="flex justify-between items-center">
                        <span className="text-base font-semibold">Grand Total:</span>
                        <span className="text-xl font-bold">{new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(totalAmount)}</span>
                    </div>
                </div>
            </div>

          </div>
          <div className="flex items-center justify-end p-6 border-t space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">{isEditMode ? 'Save Changes' : 'Create Template'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TemplateModal;
