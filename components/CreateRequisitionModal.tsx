import React, { useState, useEffect, useMemo } from 'react';
import type { Requisition, RequisitionItem, User, Material, Currency } from '../types';
import { RequisitionStatus } from '../types';
import { Button } from './common/Button';
import { Input } from './common/Input';

type RequisitionItemFormData = Omit<RequisitionItem, '_id' | 'estimatedTotalCost'>;

interface CreateRequisitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (prData: Omit<Requisition, '_id' | 'prNumber' | 'requesterId'>, id: string | null) => void;
  initialData: Requisition | null;
  currentUser: User | null;
  materials: Material[];
  departments: string[];
}

interface FormErrors {
    department?: string;
    items?: ({ materialId?: string; quantity?: string; estimatedUnitCost?: string } | undefined)[];
}

const CreateRequisitionModal: React.FC<CreateRequisitionModalProps> = ({ isOpen, onClose, onSave, initialData, currentUser, materials, departments }) => {
  const isEditMode = !!initialData;

  const [department, setDepartment] = useState('');
  const [items, setItems] = useState<RequisitionItemFormData[]>([]);
  const [notes, setNotes] = useState('');
  const [currency, setCurrency] = useState<Currency>('USD');
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (isOpen) {
        setErrors({});
        if (initialData) {
            setDepartment(initialData.department || '');
            setNotes(initialData.notes || '');
            setCurrency(initialData.currency || 'USD');
            setItems(initialData.items.map(item => ({
                materialId: item.materialId,
                product_name: item.product_name,
                description: item.description,
                quantity: item.quantity,
                uom: item.uom,
                estimatedUnitCost: item.estimatedUnitCost,
            })));
        } else {
            // Reset for new PR
            setDepartment('');
            setNotes('');
            setCurrency('USD');
            setItems([{ materialId: '', product_name: '', description: '', quantity: 1, uom: 'EA', estimatedUnitCost: 0 }]);
        }
    }
  }, [isOpen, initialData]);

  const totalAmount = useMemo(() => {
    return items.reduce((acc, item) => acc + (item.quantity * item.estimatedUnitCost), 0);
  }, [items]);
  
  const handleItemChange = (index: number, field: keyof RequisitionItemFormData, value: any) => {
    const newItems = [...items];
    const item = newItems[index];
    (item as any)[field] = value;

    if (field === 'materialId') {
        const material = materials.find(m => m._id === value);
        if (material) {
            item.product_name = material.description;
            item.uom = material.uom;
            item.estimatedUnitCost = material.defaultPrice;
        } else {
            item.product_name = '';
            item.uom = '';
            item.estimatedUnitCost = 0;
        }
    }
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { materialId: '', product_name: '', description: '', quantity: 1, uom: 'EA', estimatedUnitCost: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const validate = (): boolean => {
      const newErrors: FormErrors = {};
      const itemErrors: ({ materialId?: string; quantity?: string, estimatedUnitCost?: string } | undefined)[] = [];

      if (!department.trim()) newErrors.department = 'Department is required.';

      let hasItemErrors = false;
      items.forEach((item, index) => {
          const errorsForItem: { materialId?: string; quantity?: string; estimatedUnitCost?: string } = {};
          if (!item.materialId) {
              errorsForItem.materialId = 'Material is required.';
              hasItemErrors = true;
          }
          if (!item.quantity || item.quantity <= 0) {
              errorsForItem.quantity = 'Qty must be > 0.';
              hasItemErrors = true;
          }
          if (item.estimatedUnitCost < 0) {
              errorsForItem.estimatedUnitCost = 'Cost cannot be negative.';
              hasItemErrors = true;
          }
          itemErrors[index] = Object.keys(errorsForItem).length > 0 ? errorsForItem : undefined;
      });

      if (hasItemErrors) newErrors.items = itemErrors;
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const finalItems: RequisitionItem[] = items.map(item => ({
        ...item,
        _id: `RI${Date.now()}${Math.random()}`,
        estimatedTotalCost: item.quantity * item.estimatedUnitCost,
    }));

    const prData: Omit<Requisition, '_id' | 'prNumber' | 'requesterId'> = {
        requestDate: new Date().toISOString(),
        department,
        status: initialData?.status || RequisitionStatus.Draft,
        items: finalItems,
        totalAmount,
        currency,
        notes,
    };

    onSave(prData, initialData?._id || null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-4xl rounded-lg border bg-card text-card-foreground shadow-sm m-4" onClick={e => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col space-y-1.5 p-6 border-b">
            <h3 className="text-2xl font-semibold leading-none tracking-tight">{isEditMode ? `Edit PR: ${initialData?.prNumber}` : 'Create Purchase Requisition'}</h3>
            <p className="text-sm text-muted-foreground">Fill in the details to create a new requisition.</p>
          </div>
          <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="text-sm font-medium mb-1 block">Department</label>
                    <Input
                        value={department}
                        onChange={e => setDepartment(e.target.value)}
                        required
                        placeholder="Select or type a new department"
                        list="department-list"
                    />
                    <datalist id="department-list">
                        {departments.map((dept) => (
                            <option key={dept} value={dept} />
                        ))}
                    </datalist>
                    {errors.department && <p className="text-sm text-destructive mt-1">{errors.department}</p>}
                </div>
                <div>
                    <label className="text-sm font-medium mb-1 block">Currency</label>
                     <select value={currency} onChange={e => setCurrency(e.target.value as any)} required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                        <option value="USD">USD</option><option value="EUR">EUR</option><option value="INR">INR</option><option value="AED">AED</option><option value="SAR">SAR</option><option value="QAR">QAR</option><option value="KWD">KWD</option><option value="OMR">OMR</option><option value="BHD">BHD</option><option value="JOD">JOD</option><option value="EGP">EGP</option><option value="ILS">ILS</option><option value="TRY">TRY</option>
                    </select>
                </div>
            </div>
            
            <h4 className="font-semibold text-sm pt-2">Requested Items</h4>
            <div className="space-y-3">
                {items.map((item, index) => (
                    <div key={index} className="p-3 rounded-md bg-muted/50">
                        <div className="grid grid-cols-12 gap-x-2 items-start">
                            {/* Material */}
                            <div className="col-span-4">
                                <label className="text-xs font-medium text-muted-foreground block mb-1">Material</label>
                                <select value={item.materialId} onChange={e => handleItemChange(index, 'materialId', e.target.value)} required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                                    <option value="" disabled>Select a material</option>
                                    {materials.map(m => <option key={m._id} value={m._id}>{m.sku} - {m.description}</option>)}
                                </select>
                                {errors.items?.[index]?.materialId && <p className="text-xs text-destructive mt-1">{errors.items[index]?.materialId}</p>}
                            </div>
                            {/* Description */}
                            <div className="col-span-2">
                                <label className="text-xs font-medium text-muted-foreground block mb-1">Description (Optional)</label>
                                <Input className="w-full text-sm h-10" placeholder="Notes..." value={item.description || ''} onChange={e => handleItemChange(index, 'description', e.target.value)} />
                            </div>
                            {/* Quantity */}
                            <div className="col-span-1">
                                <label className="text-xs font-medium text-muted-foreground block mb-1">Qty</label>
                                <Input className="w-full h-10" type="number" placeholder="Qty" value={item.quantity || ''} onChange={e => handleItemChange(index, 'quantity', Number(e.target.value))} required min="1" />
                                {errors.items?.[index]?.quantity && <p className="text-xs text-destructive mt-1">{errors.items[index]?.quantity}</p>}
                            </div>
                            {/* Unit Cost */}
                            <div className="col-span-2">
                                <label className="text-xs font-medium text-muted-foreground block mb-1">Est. Unit Cost</label>
                                <Input className="w-full h-10" type="number" step="0.01" placeholder="Cost" value={item.estimatedUnitCost} onChange={e => handleItemChange(index, 'estimatedUnitCost', Number(e.target.value))} required />
                                {errors.items?.[index]?.estimatedUnitCost && <p className="text-xs text-destructive mt-1">{errors.items[index]?.estimatedUnitCost}</p>}
                            </div>
                            {/* Total */}
                            <div className="col-span-2">
                                <label className="text-xs font-medium text-muted-foreground block mb-1 text-right">Est. Total</label>
                                <div className="flex items-center justify-end h-10 pr-2">
                                    <p className="text-sm font-medium whitespace-nowrap">{new Intl.NumberFormat('en-US', { style: 'currency', currency }).format((item.quantity || 0) * (item.estimatedUnitCost || 0))}</p>
                                </div>
                            </div>
                            {/* Action */}
                            <div className="col-span-1">
                                <label className="text-xs font-medium text-muted-foreground block mb-1">&nbsp;</label>
                                <div className="flex items-center h-10">
                                    <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(index)} disabled={items.length <= 1}>
                                        <svg className="w-4 h-4 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addItem}>Add Item</Button>
            </div>
            
            <div>
                <label className="text-sm font-medium mb-1 block">Notes</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Add any notes or justification for this requisition..."></textarea>
            </div>
            
             <div className="text-right pt-4">
                <p className="text-sm text-muted-foreground">Estimated Grand Total</p>
                <p className="text-2xl font-bold">{new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(totalAmount)}</p>
            </div>

          </div>
          <div className="flex items-center justify-end p-6 border-t space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">{isEditMode ? 'Save Changes' : 'Create Requisition'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateRequisitionModal;
