import React, { useState, useEffect } from 'react';
import type { Vendor, VendorContact, Currency, Permission } from '../types';
import { VendorStatus } from '../types';
import { Button } from './common/Button';
import { Input } from './common/Input';

interface VendorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (vendorData: Omit<Vendor, '_id'>, id: string | null) => void;
  initialData: Vendor | null;
  currentUserPermissions: Permission[];
}

interface FormErrors {
    name?: string;
}

const VendorModal: React.FC<VendorModalProps> = ({ isOpen, onClose, onSave, initialData, currentUserPermissions }) => {
  const isEditMode = !!initialData;
  const isVendorAdmin = currentUserPermissions.includes('MANAGE_VENDORS');
  
  const [name, setName] = useState('');
  const [supplierCode, setSupplierCode] = useState('');
  const [rating, setRating] = useState(0);
  const [contacts, setContacts] = useState<VendorContact[]>([]);
  const [defaultCurrency, setDefaultCurrency] = useState<Currency>('USD');
  const [address, setAddress] = useState('');
  const [taxId, setTaxId] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [status, setStatus] = useState<VendorStatus>(VendorStatus.Active);
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (isOpen) {
      setErrors({});
      if (isEditMode && initialData) {
        setName(initialData.name);
        setSupplierCode(initialData.supplierCode);
        setRating(initialData.rating);
        setContacts(initialData.contacts);
        setDefaultCurrency(initialData.defaultCurrency);
        setAddress(initialData.address || '');
        setTaxId(initialData.taxId || '');
        setPaymentTerms(initialData.paymentTerms || '');
        setStatus(initialData.status || VendorStatus.Active);
      } else {
        // Reset for create mode
        setName('');
        setSupplierCode('');
        setRating(0);
        setContacts([{ name: '', email: '', phone: '' }]);
        setDefaultCurrency('USD');
        setAddress('');
        setTaxId('');
        setPaymentTerms('');
        setStatus(VendorStatus.Active);
      }
    }
  }, [isOpen, isEditMode, initialData]);
  
  const validate = (): boolean => {
      const newErrors: FormErrors = {};
      if (!name.trim()) {
          newErrors.name = "Vendor name is required.";
      } else if (/\d/.test(name)) {
          newErrors.name = "Vendor name cannot contain numeric characters.";
      }
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
  };

  const handleContactChange = (index: number, field: keyof VendorContact, value: string) => {
    const newContacts = [...contacts];
    newContacts[index][field] = value;
    setContacts(newContacts);
  };

  const addContact = () => {
    setContacts([...contacts, { name: '', email: '', phone: '' }]);
  };
  
  const removeContact = (index: number) => {
      setContacts(contacts.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
        return;
    }
    
    let finalSupplierCode: string;

    if (isEditMode) {
        finalSupplierCode = supplierCode;
    } else {
        const acronym = name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .substring(0, 3);
        const randomNumber = Math.floor(Math.random() * 90000) + 10000;
        finalSupplierCode = `${acronym}-${randomNumber}`;
    }

    const vendorData = { name, supplierCode: finalSupplierCode, rating, contacts, defaultCurrency, address, taxId, paymentTerms, status };
    onSave(vendorData, initialData?._id || null);
  };

  if (!isOpen) return null;

  const isCodeEditable = isEditMode && isVendorAdmin;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-2xl rounded-lg border bg-card text-card-foreground shadow-sm m-4" onClick={e => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col space-y-1.5 p-6 border-b">
            <h3 className="text-2xl font-semibold leading-none tracking-tight">{isEditMode ? 'Edit Vendor' : 'Add New Vendor'}</h3>
            <p className="text-sm text-muted-foreground">Fill in the vendor details below.</p>
          </div>
          <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="name" className="text-sm font-medium mb-1 block">Vendor Name</label>
                <Input id="name" value={name} onChange={e => setName(e.target.value)} required />
                {errors.name && <p className="text-sm text-destructive mt-1">{errors.name}</p>}
              </div>
              <div>
                <label htmlFor="supplierCode" className="text-sm font-medium mb-1 block">Vendor Code</label>
                 {isEditMode ? (
                    <Input
                        id="supplierCode"
                        value={supplierCode}
                        onChange={isCodeEditable ? e => setSupplierCode(e.target.value) : undefined}
                        readOnly={!isCodeEditable}
                        className={`font-mono ${!isCodeEditable ? 'bg-muted/50 cursor-not-allowed' : ''}`}
                    />
                ) : (
                    <Input
                        id="supplierCode"
                        readOnly
                        disabled
                        placeholder="Auto-generated on save"
                        className="bg-muted/50 font-mono cursor-not-allowed"
                    />
                )}
                {isEditMode && !isVendorAdmin && <p className="text-xs text-muted-foreground mt-1">Only an administrator can change the vendor code.</p>}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="rating" className="text-sm font-medium mb-1 block">Rating (0-5)</label>
                <Input id="rating" type="number" step="0.1" min="0" max="5" value={rating} onChange={e => setRating(Number(e.target.value))} required />
              </div>
              <div>
                <label htmlFor="currency" className="text-sm font-medium mb-1 block">Default Currency</label>
                <select id="currency" value={defaultCurrency} onChange={e => setDefaultCurrency(e.target.value as any)} required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                    <option value="USD">USD - United States Dollar</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="INR">INR - Indian Rupee</option>
                    <option value="AED">AED - UAE Dirham</option>
                    <option value="SAR">SAR - Saudi Riyal</option>
                    <option value="QAR">QAR - Qatari Riyal</option>
                    <option value="KWD">KWD - Kuwaiti Dinar</option>
                    <option value="OMR">OMR - Omani Rial</option>
                    <option value="BHD">BHD - Bahraini Dinar</option>
                    <option value="JOD">JOD - Jordanian Dinar</option>
                    <option value="EGP">EGP - Egyptian Pound</option>
                    <option value="ILS">ILS - Israeli New Shekel</option>
                    <option value="TRY">TRY - Turkish Lira</option>
                </select>
              </div>
            </div>
             <div>
                <label htmlFor="address" className="text-sm font-medium mb-1 block">Address</label>
                <textarea id="address" value={address} onChange={e => setAddress(e.target.value)} className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="taxId" className="text-sm font-medium mb-1 block">Tax ID</label>
                <Input id="taxId" value={taxId} onChange={e => setTaxId(e.target.value)} />
              </div>
              <div>
                <label htmlFor="paymentTerms" className="text-sm font-medium mb-1 block">Payment Terms</label>
                <Input id="paymentTerms" value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)} placeholder="e.g., Net 30 Days" />
              </div>
            </div>
             <div>
                <label htmlFor="status" className="text-sm font-medium mb-1 block">Status</label>
                <select id="status" value={status} onChange={e => setStatus(e.target.value as VendorStatus)} required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                    {Object.values(VendorStatus).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-2">Contacts</h4>
              <div className="space-y-3">
                {contacts.map((contact, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-2 border p-3 rounded-md relative">
                    <Input placeholder="Name" value={contact.name} onChange={e => handleContactChange(index, 'name', e.target.value)} />
                    <Input placeholder="Email" type="email" value={contact.email} onChange={e => handleContactChange(index, 'email', e.target.value)} />
                    <Input placeholder="Phone" value={contact.phone} onChange={e => handleContactChange(index, 'phone', e.target.value)} />
                    {contacts.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" className="absolute -top-2 -right-2 bg-background" onClick={() => removeContact(index)}>
                        <svg className="w-4 h-4 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addContact} className="mt-3">
                Add Contact
              </Button>
            </div>
          </div>
          <div className="flex items-center justify-end p-6 border-t space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">{isEditMode ? 'Save Changes' : 'Create Vendor'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VendorModal;