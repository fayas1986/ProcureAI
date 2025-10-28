import React, { useState, useEffect, useMemo } from 'react';
import type { Requisition, Vendor, RFQ, RFQVendor } from '../types';
import { RFQStatus, RFQVendorResponseStatus, VendorStatus } from '../types';
import { Button } from './common/Button';
import { Input } from './common/Input';
import { StatusBadge } from './common/Badge';
import ConfirmationDialog from './common/ConfirmationDialog';

interface CreateRFQModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newRFQ: RFQ) => void;
  requisition: Requisition;
  vendors: Vendor[];
  initialData?: RFQ | null;
}

const CreateRFQModal: React.FC<CreateRFQModalProps> = ({ isOpen, onClose, onSave, requisition, vendors, initialData }) => {
  const isEditMode = !!initialData;
  const [dueDate, setDueDate] = useState('');
  const [selectedVendorIds, setSelectedVendorIds] = useState<string[]>([]);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [vendorsToConfirm, setVendorsToConfirm] = useState<{ inactive: Vendor[], blacklisted: Vendor[] }>({ inactive: [], blacklisted: [] });
  const [vendorSortOrder, setVendorSortOrder] = useState<'asc' | 'desc'>('asc');
  
  useEffect(() => {
    if (isOpen) {
      if (isEditMode && initialData) {
        setDueDate(new Date(initialData.dueDate).toISOString().split('T')[0]);
        setSelectedVendorIds(initialData.invitedVendors.map(v => v.vendorId));
      } else {
        setSelectedVendorIds([]);
        const today = new Date();
        today.setDate(today.getDate() + 7); // Default due date 7 days from now
        setDueDate(today.toISOString().split('T')[0]);
      }
      setVendorSortOrder('asc'); // Reset sort order
    }
  }, [isOpen, isEditMode, initialData]);
  
  const sortedVendors = useMemo(() => {
    return [...vendors].sort((a, b) => {
        if (vendorSortOrder === 'asc') {
            return a.name.localeCompare(b.name);
        } else {
            return b.name.localeCompare(b.name);
        }
    });
  }, [vendors, vendorSortOrder]);

  const handleVendorToggle = (vendorId: string) => {
    setSelectedVendorIds(prev =>
      prev.includes(vendorId) ? prev.filter(id => id !== vendorId) : [...prev, vendorId]
    );
  };
  
  const formatCurrency = (amount: number, currency: string) => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);

  const proceedToCreateRFQ = () => {
    const rfqId = isEditMode ? initialData._id : `RFQ${Date.now()}`;

    const invitedVendors: RFQVendor[] = selectedVendorIds.map(vendorId => {
        const existingVendorData = isEditMode ? (initialData.invitedVendors ?? []).find(v => v.vendorId === vendorId) : undefined;
        if(existingVendorData) return existingVendorData;

        return {
            _id: `RFQ_V_${rfqId}_${vendorId}`,
            rfqId,
            vendorId,
            invitedDate: new Date().toISOString(),
            responseStatus: RFQVendorResponseStatus.Pending,
        };
    });

    const rfqData: RFQ = {
        _id: rfqId,
        rfqNumber: isEditMode ? initialData.rfqNumber : `RFQ-${new Date().getFullYear()}-00${Math.floor(Math.random() * 100) + 10}`,
        requisitionId: requisition._id,
        issuedDate: isEditMode ? initialData.issuedDate : new Date().toISOString(),
        dueDate: new Date(dueDate).toISOString(),
        status: isEditMode ? initialData.status : RFQStatus.Open,
        invitedVendors,
        items: requisition.items,
        currency: requisition.currency,
    };
    
    onSave(rfqData);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedVendorIds.length === 0) {
        alert('Please select at least one vendor to invite.');
        return;
    }

    const selectedVendors = selectedVendorIds.map(id => (vendors ?? []).find(v => v._id === id)).filter((v): v is Vendor => !!v);

    const inactiveVendors = selectedVendors.filter(v => v.status === VendorStatus.Inactive);
    const blacklistedVendors = selectedVendors.filter(v => v.status === VendorStatus.Blacklisted);

    if (inactiveVendors.length > 0 || blacklistedVendors.length > 0) {
        setVendorsToConfirm({ inactive: inactiveVendors, blacklisted: blacklistedVendors });
        setIsConfirmOpen(true);
    } else {
        proceedToCreateRFQ();
    }
  };

  if (!isOpen) return null;

  const confirmationDescription = (
    <div>
        <p className="mb-2">You are about to invite vendors with non-active statuses. Do you want to proceed?</p>
        {vendorsToConfirm.blacklisted.length > 0 && (
            <div className="mb-2">
                <p className="font-semibold text-destructive">Blacklisted:</p>
                <ul className="list-disc list-inside text-sm">
                    {vendorsToConfirm.blacklisted.map(v => <li key={v._id}>{v.name}</li>)}
                </ul>
            </div>
        )}
        {vendorsToConfirm.inactive.length > 0 && (
            <div>
                <p className="font-semibold text-yellow-600">Inactive:</p>
                <ul className="list-disc list-inside text-sm">
                    {vendorsToConfirm.inactive.map(v => <li key={v._id}>{v.name}</li>)}
                </ul>
            </div>
        )}
    </div>
  );

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
        <div className="relative w-full max-w-2xl rounded-lg border bg-card text-card-foreground shadow-sm m-4" onClick={e => e.stopPropagation()}>
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col space-y-1.5 p-6 border-b">
              <h3 className="text-2xl font-semibold leading-none tracking-tight">{isEditMode ? 'Edit RFQ' : 'Create Request for Quotation'}</h3>
              <p className="text-sm text-muted-foreground">From Requisition: <span className="font-semibold text-primary">{requisition.prNumber}</span></p>
            </div>
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                  <label className="text-sm font-medium mb-1 block">Quote Submission Due Date</label>
                  <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} required />
              </div>
              <div className="space-y-2">
                  <h4 className="text-sm font-medium">Items from Requisition</h4>
                  <div className="border rounded-md p-2 space-y-2 max-h-40 overflow-y-auto bg-muted/50">
                      {requisition.items.map(item => (
                          <div key={item._id} className="flex justify-between items-center p-2 bg-background rounded-sm shadow-sm">
                              <div>
                                  <p className="text-sm font-medium">{item.product_name}</p>
                                  {item.description && <p className="text-xs text-muted-foreground italic">"{item.description}"</p>}
                              </div>
                              <div className="text-right flex-shrink-0 ml-4">
                                  <p className="text-sm font-semibold">{item.quantity} {item.uom}</p>
                                  <p className="text-xs text-muted-foreground">Est. {formatCurrency(item.estimatedUnitCost, requisition.currency)} each</p>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
              <div>
                  <div className="flex justify-between items-center mb-2">
                      <h4 className="text-sm font-medium">Invite Vendors</h4>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setVendorSortOrder(p => p === 'asc' ? 'desc' : 'asc')} className="text-xs">
                          Sort
                          {vendorSortOrder === 'asc' ? 
                            <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"></path></svg> : 
                            <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4h13M3 8h9m-9 4h6m4 0l4 4m0 0l4-4m-4 4V4"></path></svg>
                          }
                      </Button>
                  </div>
                  <div className="max-h-48 overflow-y-auto border rounded-md p-2 space-y-1">
                      {sortedVendors.map(v => (
                              <label key={v._id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted cursor-pointer">
                                <div className="flex items-center space-x-3">
                                  <input type="checkbox" checked={selectedVendorIds.includes(v._id)} onChange={() => handleVendorToggle(v._id)} className="h-4 w-4 rounded border-border text-primary focus:ring-primary" />
                                  <span className="text-sm font-medium">{v.name}</span>
                                </div>
                                <StatusBadge status={v.status} />
                          </label>
                      ))}
                  </div>
              </div>
            </div>
            <div className="flex items-center justify-end p-6 border-t space-x-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={selectedVendorIds.length === 0}>{isEditMode ? 'Save Changes' : 'Create & Send RFQ'}</Button>
            </div>
          </form>
        </div>
      </div>
       <ConfirmationDialog
            isOpen={isConfirmOpen}
            onClose={() => setIsConfirmOpen(false)}
            onConfirm={proceedToCreateRFQ}
            title="Vendor Status Warning"
            description={confirmationDescription}
            confirmText="Yes, Proceed"
            confirmVariant="destructive"
        />
    </>
  );
};

export default CreateRFQModal;