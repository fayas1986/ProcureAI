import React, { useState, useEffect, useMemo } from 'react';
import type { PurchaseOrder, Vendor, Material, PurchaseOrderLine, Currency, Requisition, RequisitionItem, POTemplate } from '../types';
import { Button } from './common/Button';
import { Input } from './common/Input';
import { convertCurrency } from '../services/currencyService';
import { SearchableSelect } from './common/SearchableSelect';

// Internal state type for lines when converting from a PR
type POLineFromPR = Omit<PurchaseOrderLine, '_id'> & {
    sourcePRItem: RequisitionItem;
};

type POLineFormData = Omit<PurchaseOrderLine, '_id'>;

interface CreatePOModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (poData: Omit<PurchaseOrder, '_id' | 'poNumber' | 'status' | 'requesterId'>, id: string | null) => void;
  vendors: Vendor[];
  materials: Material[];
  initialData?: Partial<PurchaseOrder> | null;
  initialDataFromPR?: Requisition | null;
  onOpenCreateMaterial: (lineIndex: number) => void;
  newlyCreatedMaterial: { id: string; lineIndex: number } | null;
  setNewlyCreatedMaterial: (data: { id: string; lineIndex: number } | null) => void;
  rates: Record<string, number> | null;
  poTemplates: POTemplate[];
  isAwardFlow?: boolean;
}

interface FormErrors {
    vendorId?: string;
    deliveryDate?: string;
    lines?: ({ materialId?: string; quantity?: string; unitPrice?: string } | undefined)[];
}


const CreatePOModal: React.FC<CreatePOModalProps> = ({ isOpen, onClose, onSave, vendors, materials, initialData, initialDataFromPR, onOpenCreateMaterial, newlyCreatedMaterial, setNewlyCreatedMaterial, rates, poTemplates, isAwardFlow = false }) => {
  const isEditMode = !!(initialData && '_id' in initialData);
  const isPRConversionMode = !!initialDataFromPR;

  const [vendorId, setVendorId] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [lines, setLines] = useState<POLineFormData[]>([]);
  const [prConversionLines, setPRConversionLines] = useState<POLineFromPR[]>([]);
  const [notes, setNotes] = useState('');
  const [currency, setCurrency] = useState<Currency>('USD');
  const [taxRate, setTaxRate] = useState(0);
  const [errors, setErrors] = useState<FormErrors>({});
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const isRatesLoading = rates === null;

  const sortedVendors = useMemo(() => {
    return [...vendors].sort((a, b) => a.name.localeCompare(b.name));
  }, [vendors]);

  const vendorOptions = useMemo(() => {
    return sortedVendors.map(v => ({ value: v._id, label: v.name }));
  }, [sortedVendors]);

  const modalTitle = isEditMode 
    ? `Edit PO: ${initialData.poNumber}` 
    : isAwardFlow 
    ? 'Confirm Purchase Order from RFQ' 
    : isPRConversionMode
    ? 'Create Purchase Order from PR'
    : 'Create Purchase Order';

  const modalDescription = isPRConversionMode 
    ? `Converting PR #${initialDataFromPR?.prNumber} to a new Purchase Order.` 
    : isAwardFlow
    ? 'Review the details from the awarded quotation. Delivery date and notes can be adjusted.'
    : 'Fill in the details to create a new PO.';

  const submitButtonText = isEditMode 
    ? 'Save Changes' 
    : isAwardFlow 
    ? 'Confirm & Create PO' 
    : 'Create PO';

  const resetForm = () => {
    const today = new Date();
    today.setDate(today.getDate() + 14);
    const defaultDeliveryDate = today.toISOString().split('T')[0];
    
    setVendorId('');
    setDeliveryDate(defaultDeliveryDate);
    setNotes('');
    setLines([{ materialId: '', description: '', quantity: 1, uom: 'EA', unitPrice: 0, totalPrice: 0 }]);
    setCurrency('USD');
    setTaxRate(0);
    setPRConversionLines([]);
    setErrors({});
  };

  useEffect(() => {
    if (isOpen) {
        setErrors({});
        setSelectedTemplateId('');
        const today = new Date();
        today.setDate(today.getDate() + 14);
        const defaultDeliveryDate = today.toISOString().split('T')[0];

        if (initialDataFromPR) {
            setVendorId('');
            setDeliveryDate(defaultDeliveryDate);
            
            const itemNotes = initialDataFromPR.items
                .filter(item => item.description)
                .map(item => `- ${item.product_name}: ${item.description}`)
                .join('\n');

            let combinedNotes = `PO created from PR #${initialDataFromPR.prNumber}.`;
            if (initialDataFromPR.notes) {
                combinedNotes += `\n\n--- PR Notes ---\n${initialDataFromPR.notes}`;
            }
            if (itemNotes) {
                combinedNotes += `\n\n--- Item-Specific Notes ---\n${itemNotes}`;
            }
            setNotes(combinedNotes);
            setTaxRate(0);
            setCurrency(initialDataFromPR.currency || 'USD');
            const mappedLines = initialDataFromPR.items.map(item => {
                const material = materials.find(m => m._id === item.materialId);
                return {
                    sourcePRItem: item,
                    materialId: item.materialId,
                    description: material?.description || item.product_name,
                    quantity: item.quantity,
                    uom: material?.uom || item.uom,
                    unitPrice: item.estimatedUnitCost,
                    totalPrice: item.estimatedTotalCost,
                };
            });
            setPRConversionLines(mappedLines);
            setLines([]); // Ensure regular lines are empty
        } else if (initialData) {
            setVendorId(initialData.vendorId || '');
            setDeliveryDate(initialData.deliveryDate?.split('T')[0] || '');
            setNotes(initialData.notes || '');
            setLines(initialData.lines || [{ materialId: '', description: '', quantity: 1, uom: '', unitPrice: 0, totalPrice: 0 }]);
            setCurrency(initialData.currency || 'USD');
            setTaxRate(initialData.taxRate || 0);
            setPRConversionLines([]); // Ensure PR lines are empty
        } else {
            resetForm();
        }
    }
  }, [isOpen, initialData, initialDataFromPR, materials]);
  
  useEffect(() => {
    if (selectedTemplateId) {
        const template = poTemplates.find(t => t._id === selectedTemplateId);
        if (template) {
            const { _id, templateName, templateDescription, ...poData } = template;
            setVendorId(poData.vendorId || '');
            setNotes(poData.notes || '');
            setLines(poData.lines?.map(l => ({...l})) || [{ materialId: '', description: '', quantity: 1, uom: 'EA', unitPrice: 0, totalPrice: 0 }]);
            setCurrency(poData.currency || 'USD');
            setTaxRate(poData.taxRate || 0);
            setPRConversionLines([]);
        }
    } else {
        if (!isEditMode && !isPRConversionMode && !isAwardFlow) {
            resetForm();
        }
    }
  }, [selectedTemplateId, poTemplates, isEditMode, isPRConversionMode, isAwardFlow]);

  useEffect(() => {
    // This effect should not run if a template is being used, to preserve template currency.
    if (!selectedTemplateId) {
        const vendor = vendors.find(s => s._id === vendorId);
        if (vendor && !isPRConversionMode) {
            setCurrency(vendor.defaultCurrency);
        }
    }
  }, [vendorId, vendors, isPRConversionMode, selectedTemplateId]);

  useEffect(() => {
    if (!rates || isRatesLoading || isPRConversionMode) return;

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

  }, [currency, rates, isRatesLoading, materials, isPRConversionMode]);
  
  useEffect(() => {
    if (newlyCreatedMaterial && newlyCreatedMaterial.lineIndex !== null) {
      const newLines = [...lines];
      const lineToUpdate = newLines[newlyCreatedMaterial.lineIndex];

      if (lineToUpdate) {
        const newMaterial = materials.find(m => m._id === newlyCreatedMaterial.id);
        lineToUpdate.materialId = newlyCreatedMaterial.id;

        if (newMaterial && rates) {
          lineToUpdate.description = newMaterial.description;
          lineToUpdate.uom = newMaterial.uom;
          const newUnitPrice = convertCurrency(newMaterial.defaultPrice, 'USD', currency, rates);
          lineToUpdate.unitPrice = parseFloat(newUnitPrice.toFixed(2));
          lineToUpdate.totalPrice = (lineToUpdate.quantity || 0) * newUnitPrice;
        }
        setLines(newLines);
      }
      setNewlyCreatedMaterial(null);
    }
  }, [newlyCreatedMaterial, setNewlyCreatedMaterial, lines, materials, currency, rates]);


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
  
  const handlePRLineChange = (index: number, field: keyof Omit<POLineFromPR, 'materialId'>, value: any) => {
    const newLines = [...prConversionLines];
    const line = newLines[index];
    
    (line as any)[field] = value;
    line.totalPrice = (line.quantity || 0) * (line.unitPrice || 0);
    setPRConversionLines(newLines);
  };

  const handleMaterialSelect = (index: number, value: string) => {
      if (value === '--create-new--') {
          onOpenCreateMaterial(index);
          // Set materialId back to empty string to prevent the select showing the "create" option
          const newLines = [...lines];
          newLines[index].materialId = '';
          setLines(newLines);
      } else {
          handleLineChange(index, 'materialId', value);
      }
  };

  const addLine = () => setLines([...lines, { materialId: '', description: '', quantity: 1, uom: 'EA', unitPrice: 0, totalPrice: 0 }]);
  const removeLine = (index: number) => setLines(lines.filter((_, i) => i !== index));
  
  const { subtotal, taxAmount, totalAmount } = useMemo(() => {
    const linesToSum = isPRConversionMode ? prConversionLines : lines;
    const sub = linesToSum.reduce((acc, l) => acc + (l.totalPrice || 0), 0);
    const tax = sub * (taxRate / 100);
    const total = sub + tax;
    return { subtotal: sub, taxAmount: tax, totalAmount: total };
  }, [lines, prConversionLines, isPRConversionMode, taxRate]);

  const validate = (): boolean => {
      const newErrors: FormErrors = {};
      const lineErrors: ({ materialId?: string; quantity?: string; unitPrice?: string } | undefined)[] = [];

      if (!vendorId) newErrors.vendorId = 'Vendor is required.';
      if (!deliveryDate) newErrors.deliveryDate = 'Delivery date is required.';

      let hasLineErrors = false;
      const linesToValidate = isPRConversionMode ? prConversionLines : lines;

      linesToValidate.forEach((line, index) => {
          const errorsForLine: { materialId?: string; quantity?: string; unitPrice?: string } = {};
          if (!line.materialId) {
              errorsForLine.materialId = 'Material must be selected.';
              hasLineErrors = true;
          }
          if (!line.quantity || line.quantity <= 0) {
              errorsForLine.quantity = 'Qty must be > 0.';
              hasLineErrors = true;
          }
          if (line.unitPrice < 0) {
              errorsForLine.unitPrice = 'Price cannot be negative.';
              hasLineErrors = true;
          }
          lineErrors[index] = Object.keys(errorsForLine).length > 0 ? errorsForLine : undefined;
      });

      if (hasLineErrors) newErrors.lines = lineErrors;
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!validate()) return;
      
      const finalLines = (isPRConversionMode ? prConversionLines : lines).map(l => ({
          _id: `L${Date.now()}${Math.random()}`,
          materialId: l.materialId,
          description: l.description,
          quantity: l.quantity,
          uom: l.uom,
          unitPrice: l.unitPrice,
          totalPrice: l.totalPrice,
      }));

      const poData: Omit<PurchaseOrder, '_id' | 'poNumber' | 'status' | 'requesterId'> = {
          vendorId,
          orderDate: new Date().toISOString(),
          deliveryDate: new Date(deliveryDate).toISOString(),
          lines: finalLines,
          subtotal,
          taxRate,
          taxAmount,
          totalAmount,
          currency,
          notes,
          ...(isPRConversionMode && { sourcePRId: initialDataFromPR?._id })
      };

      onSave(poData, isEditMode ? initialData._id! : null);
      onClose();
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-4xl rounded-lg border bg-card text-card-foreground shadow-sm m-4" onClick={e => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col space-y-1.5 p-6 border-b">
            <h3 className="text-2xl font-semibold leading-none tracking-tight">{modalTitle}</h3>
            <p className="text-sm text-muted-foreground">{modalDescription}</p>
          </div>
          <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
             { !isAwardFlow && !isPRConversionMode && (
                 <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium mb-1 block">Use Template</label>
                        <select
                            value={selectedTemplateId}
                            onChange={e => setSelectedTemplateId(e.target.value)}
                            disabled={isEditMode || isPRConversionMode}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background disabled:opacity-50"
                        >
                            <option value="">None - Create from scratch</option>
                            {poTemplates.map(t => <option key={t._id} value={t._id}>{t.templateName}</option>)}
                        </select>
                    </div>
                 </div>
             )}
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                    <label className="text-sm font-medium mb-1 block">Vendor</label>
                    <SearchableSelect
                        value={vendorId}
                        onChange={setVendorId}
                        options={vendorOptions}
                        placeholder="Select a vendor"
                        disabled={isAwardFlow}
                    />
                    {errors.vendorId && <p className="text-sm text-destructive mt-1">{errors.vendorId}</p>}
                </div>
                <div>
                    <label className="text-sm font-medium mb-1 block">Currency</label>
                     <select value={currency} onChange={e => setCurrency(e.target.value as any)} required disabled={isRatesLoading || isAwardFlow} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-wait">
                        {isRatesLoading ? (
                            <option>Loading rates...</option>
                        ) : (
                            <><option value="USD">USD</option><option value="EUR">EUR</option><option value="INR">INR</option><option value="AED">AED</option><option value="SAR">SAR</option><option value="QAR">QAR</option><option value="KWD">KWD</option><option value="OMR">OMR</option><option value="BHD">BHD</option><option value="JOD">JOD</option><option value="EGP">EGP</option><option value="ILS">ILS</option><option value="TRY">TRY</option></>
                        )}
                    </select>
                </div>
                <div>
                    <label className="text-sm font-medium mb-1 block">Delivery Date</label>
                    <Input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} required />
                     {errors.deliveryDate && <p className="text-sm text-destructive mt-1">{errors.deliveryDate}</p>}
                </div>
            </div>
            
            <h4 className="font-semibold text-sm pt-2">Order Lines</h4>
            {isPRConversionMode ? (
                <div className="space-y-2">
                    {prConversionLines.map((line, index) => (
                        <div key={index} className="grid grid-cols-12 gap-2 items-start p-2 rounded-md bg-muted/50">
                             <div className="col-span-6">
                                <label className="text-xs font-medium text-muted-foreground block mb-1">Material (from PR)</label>
                                <div className="flex items-center h-10 px-3 rounded-md border border-input bg-background/50 text-sm">
                                    <p className="truncate" title={line.description}>{line.description}</p>
                                </div>
                                {errors.lines?.[index]?.materialId && <p className="text-sm text-destructive mt-1">{errors.lines[index]?.materialId}</p>}
                            </div>
                            <div className="col-span-2">
                                <label className="text-xs font-medium text-muted-foreground block mb-1">Quantity</label>
                                <Input className="w-full" type="number" placeholder="Qty" value={line.quantity || ''} onChange={e => handlePRLineChange(index, 'quantity', Number(e.target.value))} required min="1" />
                                {errors.lines?.[index]?.quantity && <p className="text-sm text-destructive mt-1">{errors.lines[index]?.quantity}</p>}
                            </div>
                            <div className="col-span-2">
                                 <label className="text-xs font-medium text-muted-foreground block mb-1">Unit Price</label>
                                <Input className="w-full" type="number" placeholder="Unit Price" value={line.unitPrice || ''} onChange={e => handlePRLineChange(index, 'unitPrice', Number(e.target.value))} required step="0.01" />
                                {errors.lines?.[index]?.unitPrice && <p className="text-sm text-destructive mt-1">{errors.lines[index]?.unitPrice}</p>}
                            </div>
                            <div className="col-span-2 text-right font-medium pr-2 pt-2 self-center">{new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(line.totalPrice || 0)}</div>
                        </div>
                    ))}
                </div>
            ) : (
                 <div className="space-y-2">
                    {lines.map((line, index) => (
                        <div key={index} className="grid grid-cols-12 gap-2 items-start p-2 rounded-md bg-muted/50">
                            <div className={isAwardFlow ? "col-span-6" : "col-span-5"}>
                                <select value={line.materialId} onChange={e => handleMaterialSelect(index, e.target.value)} required disabled={isAwardFlow} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50">
                                     <option value="" disabled>Select a material</option>
                                     {materials.map(m => <option key={m._id} value={m._id}>{m.sku} - {m.description}</option>)}
                                     {!isAwardFlow && (
                                        <option value="--create-new--" className="font-semibold border-t mt-1 pt-1 text-primary bg-primary/5">
                                            + Create New Material...
                                        </option>
                                     )}
                                </select>
                                 {errors.lines?.[index]?.materialId && <p className="text-sm text-destructive mt-1">{errors.lines[index]?.materialId}</p>}
                            </div>
                            <div className="col-span-2">
                                <Input className="w-full" type="number" placeholder="Qty" value={line.quantity || ''} onChange={e => handleLineChange(index, 'quantity', Number(e.target.value))} required min="1" disabled={isAwardFlow} />
                                {errors.lines?.[index]?.quantity && <p className="text-sm text-destructive mt-1">{errors.lines[index]?.quantity}</p>}
                            </div>
                            <div className="col-span-2">
                                <Input className="w-full" type="number" placeholder="Unit Price" value={line.unitPrice || ''} onChange={e => handleLineChange(index, 'unitPrice', Number(e.target.value))} required step="0.01" disabled={isAwardFlow} />
                                {errors.lines?.[index]?.unitPrice && <p className="text-sm text-destructive mt-1">{errors.lines[index]?.unitPrice}</p>}
                            </div>
                            <div className={isAwardFlow ? "col-span-2 text-right font-medium pr-2 pt-2" : "col-span-2 text-right font-medium pr-2 pt-2"}>{new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(line.totalPrice || 0)}</div>
                            {!isAwardFlow && (
                                <Button type="button" variant="ghost" size="icon" onClick={() => removeLine(index)} disabled={lines.length <= 1}>
                                    <svg className="w-4 h-4 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </Button>
                            )}
                        </div>
                    ))}
                    {!isAwardFlow && <Button type="button" variant="outline" size="sm" onClick={addLine}>Add Line</Button>}
                </div>
            )}
            
            <div>
                <label className="text-sm font-medium mb-1 block">Notes</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Add any notes for this PO..."></textarea>
            </div>
            
             <div className="grid grid-cols-2 gap-4 items-end pt-4 border-t">
                <div>
                    <label className="text-sm font-medium mb-1 block">Tax Rate (%)</label>
                    <Input type="number" value={taxRate} onChange={e => setTaxRate(Number(e.target.value))} min="0" step="0.01" disabled={isAwardFlow} />
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
                    {currency !== 'USD' && rates && (
                        <p className="text-sm text-muted-foreground">
                            ~ {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(convertCurrency(totalAmount, currency, 'USD', rates))}
                        </p>
                    )}
                </div>
            </div>

          </div>
          <div className="flex items-center justify-end p-6 border-t space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">{submitButtonText}</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePOModal;
