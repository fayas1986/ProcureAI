import React, { useState, useEffect } from 'react';
import type { Material } from '../types';
import { Button } from './common/Button';
import { Input } from './common/Input';

interface MaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (materialData: Omit<Material, '_id'>, id: string | null) => void;
  initialData: Partial<Material> | null;
}

type MaterialFormErrors = Partial<Record<keyof Omit<Material, '_id'>, string>>;

const MaterialModal: React.FC<MaterialModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const isEditMode = !!(initialData && initialData._id);
  const [sku, setSku] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [uom, setUom] = useState('');
  const [defaultPrice, setDefaultPrice] = useState(0);
  const [errors, setErrors] = useState<MaterialFormErrors>({});

  useEffect(() => {
    if (isOpen) {
      setErrors({}); // Reset errors on open
      setSku(initialData?.sku || '');
      setDescription(initialData?.description || '');
      setCategory(initialData?.category || '');
      setUom(initialData?.uom || '');
      setDefaultPrice(initialData?.defaultPrice || 0);
    }
  }, [isOpen, initialData]);

  const validate = (): boolean => {
    const newErrors: MaterialFormErrors = {};
    
    if (!sku.trim()) {
        newErrors.sku = "SKU is required.";
    } else if (sku.length > 50) {
        newErrors.sku = "SKU cannot exceed 50 characters.";
    } else if (!/^[A-Z0-9-]*$/.test(sku)) {
        newErrors.sku = "SKU can only contain uppercase letters, numbers, and hyphens.";
    } else if (!/[A-Z]/.test(sku) || !/\d/.test(sku)) {
        newErrors.sku = "SKU must contain at least one uppercase letter and one number.";
    }

    if (!description.trim()) newErrors.description = "Description is required.";
    if (!category.trim()) newErrors.category = "Category is required.";
    if (!uom.trim()) newErrors.uom = "Unit of Measure is required.";
    if (defaultPrice < 0) newErrors.defaultPrice = "Default price cannot be negative.";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
        return;
    }
    const materialData = { sku, description, category, uom, defaultPrice };
    onSave(materialData, initialData?._id || null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-lg rounded-lg border bg-card text-card-foreground shadow-sm m-4" onClick={e => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col space-y-1.5 p-6 border-b">
            <h3 className="text-2xl font-semibold leading-none tracking-tight">{isEditMode ? 'Edit Material' : 'Add New Material'}</h3>
            <p className="text-sm text-muted-foreground">Fill in the material details below.</p>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label htmlFor="sku" className="text-sm font-medium mb-1 block">SKU</label>
              <Input id="sku" value={sku} onChange={e => setSku(e.target.value.toUpperCase())} required />
              {errors.sku && <p className="text-sm text-destructive mt-1">{errors.sku}</p>}
            </div>
            <div>
              <label htmlFor="description" className="text-sm font-medium mb-1 block">Description</label>
              <Input id="description" value={description} onChange={e => setDescription(e.target.value)} required />
              {errors.description && <p className="text-sm text-destructive mt-1">{errors.description}</p>}
            </div>
            <div>
              <label htmlFor="category" className="text-sm font-medium mb-1 block">Category</label>
              <Input id="category" value={category} onChange={e => setCategory(e.target.value)} required placeholder="e.g., Computer Components" />
              {errors.category && <p className="text-sm text-destructive mt-1">{errors.category}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="uom" className="text-sm font-medium mb-1 block">Unit of Measure (UOM)</label>
                <Input id="uom" value={uom} onChange={e => setUom(e.target.value)} placeholder="e.g., EA, KG, L" required />
                {errors.uom && <p className="text-sm text-destructive mt-1">{errors.uom}</p>}
              </div>
              <div>
                <label htmlFor="price" className="text-sm font-medium mb-1 block">Default Price</label>
                <Input id="price" type="number" step="0.01" value={defaultPrice} onChange={e => setDefaultPrice(Number(e.target.value))} required />
                {errors.defaultPrice && <p className="text-sm text-destructive mt-1">{errors.defaultPrice}</p>}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-end p-6 border-t space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">{isEditMode ? 'Save Changes' : 'Create Material'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MaterialModal;