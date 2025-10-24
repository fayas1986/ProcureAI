
import React, { useState, useEffect } from 'react';
import type { ExtractedPOData, Vendor, Material } from '../types';
import { Button } from './common/Button';
import { Input } from './common/Input';

// Define internal types for managing the review form's state
type ReviewLine = {
    materialId: string;
    originalDescription: string;
    qty: number;
    unitPrice: number;
};

export type ReviewFormData = {
    supplierName: string;
    poNo: string;
    issueDate: string;
    lines: ReviewLine[];
};

interface ExtractedDataReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: ReviewFormData) => void;
  initialData: ExtractedPOData | null;
  vendors: Vendor[];
  materials: Material[];
  onCreateNewMaterial: (description: string, lineIndex: number) => void;
}


const ExtractedDataReviewModal: React.FC<ExtractedDataReviewModalProps> = ({ isOpen, onClose, onConfirm, initialData, vendors, materials, onCreateNewMaterial }) => {
  const [formData, setFormData] = useState<ReviewFormData | null>(null);

  useEffect(() => {
    if (isOpen && initialData) {
        const lowerSupplierName = initialData.supplierName.toLowerCase();
        const vendor = vendors.find(s => s.name.toLowerCase() === lowerSupplierName);

        const matchedLines: ReviewLine[] = initialData.lines.map(line => {
            const lowerDesc = line.description.toLowerCase();
            const sku = line.sku;

            // Attempt to match to an existing material, prioritizing SKU then description
            const material = materials.find(m => m.sku && m.sku === sku) || materials.find(m => m.description.toLowerCase() === lowerDesc);
            
            return {
                materialId: material?._id || '',
                originalDescription: line.description,
                qty: line.qty,
                unitPrice: line.unitPrice,
            };
        });

        setFormData({
            supplierName: vendor?.name || initialData.supplierName,
            poNo: initialData.poNo || '',
            issueDate: initialData.issueDate || '',
            lines: matchedLines,
        });
    }
  }, [isOpen, initialData, vendors, materials]);

  if (!isOpen || !formData) return null;

  const handleInputChange = (field: keyof Omit<ReviewFormData, 'lines'>, value: string) => {
    setFormData(prev => prev ? { ...prev, [field]: value } : null);
  };

  const handleLineChange = (index: number, field: keyof ReviewLine, value: string | number) => {
    setFormData(prev => {
        if (!prev) return null;
        const newLines = [...prev.lines];
        const line = newLines[index];
        (line as any)[field] = value;

        if (field === 'materialId') {
            const material = materials.find(m => m._id === value);
            if (material) {
                // When a material is selected, update the unit price to its default.
                line.unitPrice = material.defaultPrice;
            }
        }
        
        return { ...prev, lines: newLines };
    });
  };

  const addLine = () => {
    setFormData(prev => {
        if (!prev) return null;
        const newLine: ReviewLine = { materialId: '', originalDescription: '', qty: 1, unitPrice: 0 };
        return { ...prev, lines: [...prev.lines, newLine] };
    });
  };

  const removeLine = (index: number) => {
    setFormData(prev => {
        if (!prev) return null;
        return { ...prev, lines: prev.lines.filter((_, i) => i !== index) };
    });
  };

  const handleSubmit = () => {
    if (formData) {
        onConfirm(formData);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-4xl rounded-lg border bg-card text-card-foreground shadow-sm m-4" onClick={e => e.stopPropagation()}>
        <div className="flex flex-col space-y-1.5 p-6 border-b">
          <h3 className="text-2xl font-semibold leading-none tracking-tight">Review Extracted Data</h3>
          <p className="text-sm text-muted-foreground">Please review, match, and correct the data extracted by the AI before creating the PO.</p>
        </div>
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="text-sm font-medium mb-1 block">Vendor</label>
              <select value={formData.supplierName} onChange={e => handleInputChange('supplierName', e.target.value)} required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                <option value="" disabled>Select a vendor</option>
                {vendors.map(s => <option key={s._id} value={s.name}>{s.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">PO Number (from doc)</label>
              <Input type="text" value={formData.poNo} onChange={e => handleInputChange('poNo', e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Issue Date (from doc)</label>
              <Input type="date" value={formData.issueDate.split('T')[0]} onChange={e => handleInputChange('issueDate', e.target.value)} />
            </div>
          </div>
          
          <h4 className="font-semibold text-sm pt-2">Order Lines</h4>
          <div className="space-y-2">
            {formData.lines.map((line, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-center p-2 rounded-md bg-muted/50">
                <div className="col-span-6">
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Match to Material</label>
                    <select value={line.materialId} onChange={e => handleLineChange(index, 'materialId', e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        <option value="">Unmatched - Select a material</option>
                        {materials.map(m => <option key={m._id} value={m._id}>{m.sku} - {m.description}</option>)}
                    </select>
                    <p className="text-xs text-muted-foreground mt-1 truncate" title={line.originalDescription}>Extracted: {line.originalDescription}</p>
                     {!line.materialId && (
                      <button
                        type="button"
                        onClick={() => onCreateNewMaterial(line.originalDescription, index)}
                        className="text-xs text-primary hover:underline mt-1 font-medium text-left"
                      >
                        + Create new material from description
                      </button>
                    )}
                </div>
                <div className="col-span-2">
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Quantity</label>
                    <Input type="number" placeholder="Qty" value={line.qty} onChange={e => handleLineChange(index, 'qty', Number(e.target.value))} required min="1" />
                </div>
                <div className="col-span-3">
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Unit Price</label>
                    <Input type="number" placeholder="Unit Price" value={line.unitPrice} onChange={e => handleLineChange(index, 'unitPrice', Number(e.target.value))} required step="0.01" />
                </div>
                <div className="col-span-1 self-end">
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeLine(index)} disabled={formData.lines.length <= 1}>
                        <svg className="w-4 h-4 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </Button>
                </div>
              </div>
            ))}
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addLine}>Add Line</Button>
        </div>
        <div className="flex items-center justify-end p-6 border-t space-x-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="button" onClick={handleSubmit}>Confirm and Create PO</Button>
        </div>
      </div>
    </div>
  );
};

export default ExtractedDataReviewModal;
