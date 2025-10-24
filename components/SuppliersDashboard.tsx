import React, { useState, useMemo, useEffect } from 'react';
import type { Vendor, User, Permission } from '../types';
import { VendorStatus } from '../types';
import { Button } from './common/Button';
import { Card, CardHeader, CardContent, CardFooter } from './common/Card';
import { Input } from './common/Input';
import VendorModal from './SupplierModal';
import useDebounce from '../hooks/useDebounce';
import { StatusBadge } from './common/Badge';
import ConfirmationDialog from './common/ConfirmationDialog';
import Pagination from './common/Pagination';
// Fix: Changed default import to named import for UploadDocumentModal to resolve module resolution error.
import { UploadDocumentModal } from './UploadDocumentModal';
import BulkDataReviewModal from './common/BulkDataReviewModal';
import { extractVendorsFromDocument } from '../services/geminiService';

const levenshteinDistance = (a: string = '', b: string = ''): number => {
    const m = a.length;
    const n = b.length;
    const d = Array.from(Array(m + 1), () => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) d[i][0] = i;
    for (let j = 0; j <= n; j++) d[0][j] = j;
    for (let j = 1; j <= n; j++) {
      for (let i = 1; i <= m; i++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        d[i][j] = Math.min(
          d[i - 1][j] + 1,
          d[i][j - 1] + 1,
          d[i - 1][j - 1] + cost,
        );
      }
    }
    return d[m][n];
};

interface VendorsDashboardProps {
    vendors: Vendor[];
    setVendors: React.Dispatch<React.SetStateAction<Vendor[]>>;
    currentUser: User | null;
    currentUserPermissions: Permission[];
}

const ITEMS_PER_PAGE = 10;

interface FilterButtonProps {
    value: VendorStatus | 'all';
    label: string;
    currentFilter: VendorStatus | 'all';
    onClick: (value: VendorStatus | 'all') => void;
}

const FilterButton: React.FC<FilterButtonProps> = ({ value, label, currentFilter, onClick }) => (
    <Button
        variant={currentFilter === value ? 'default' : 'outline'}
        size="sm"
        onClick={() => onClick(value)}
        className="capitalize"
    >
        {label}
    </Button>
);

const SuppliersDashboard: React.FC<VendorsDashboardProps> = ({ vendors, setVendors, currentUser, currentUserPermissions }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<VendorStatus | 'all'>('all');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
    const [vendorToDelete, setVendorToDelete] = useState<Vendor | null>(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [dataToReview, setDataToReview] = useState<Omit<Vendor, '_id'>[] | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    const canManage = currentUserPermissions.includes('MANAGE_VENDORS');

    const filteredVendors = useMemo(() => {
        const lowerSearchTerm = debouncedSearchTerm.toLowerCase();
        
        let vendorsToFilter = [...vendors];

        if (lowerSearchTerm) {
            const scoredVendors = vendors.map(vendor => {
                let score = 0;
                const name = vendor.name.toLowerCase();
                const code = vendor.supplierCode.toLowerCase();
                
                if (code === lowerSearchTerm) score += 100;
                else if (code.startsWith(lowerSearchTerm)) score += 50;
                else if (code.includes(lowerSearchTerm)) score += 10;
                
                if (name.startsWith(lowerSearchTerm)) score += 40;
                else if (name.includes(lowerSearchTerm)) score += 20;
        
                const distance = levenshteinDistance(name, lowerSearchTerm);
                const similarity = 1 - distance / Math.max(name.length, lowerSearchTerm.length || 1);
                if (similarity > 0.7) {
                    score += Math.round(similarity * 30);
                }
                
                return { vendor, score };
            });
            
            vendorsToFilter = scoredVendors
                .filter(item => item.score > 0)
                .sort((a, b) => b.score - a.score)
                .map(item => item.vendor);
        }

        if (statusFilter !== 'all') {
            return vendorsToFilter.filter(vendor => vendor.status === statusFilter);
        }

        return vendorsToFilter;
    
    }, [vendors, debouncedSearchTerm, statusFilter]);

    const totalPages = Math.ceil(filteredVendors.length / ITEMS_PER_PAGE);
    const paginatedVendors = useMemo(() => {
        return filteredVendors.slice(
            (currentPage - 1) * ITEMS_PER_PAGE,
            currentPage * ITEMS_PER_PAGE
        );
    }, [filteredVendors, currentPage]);

    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearchTerm, statusFilter]);

    useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);


    const handleOpenAddModal = () => {
        setEditingVendor(null);
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (vendor: Vendor) => {
        setEditingVendor(vendor);
        setIsModalOpen(true);
    };

    const handleSaveVendor = (vendorData: Omit<Vendor, '_id'>, id: string | null) => {
        if (id) { // Editing
            setVendors(prev =>
                prev.map(s => (s._id === id ? { ...vendorData, _id: id } : s))
            );
        } else { // Creating
            const newVendor: Vendor = {
                ...vendorData,
                _id: `S${Date.now()}`,
            };
            setVendors(prev => [newVendor, ...prev]);
        }
        setIsModalOpen(false);
    };

    const handleDeleteRequest = (vendor: Vendor) => {
        setVendorToDelete(vendor);
        setIsConfirmOpen(true);
    };
    
    const handleConfirmDelete = () => {
        if (vendorToDelete) {
            setVendors(prev => prev.filter(s => s._id !== vendorToDelete._id));
        }
        setIsConfirmOpen(false);
        setVendorToDelete(null);
    };

    const handleProcessFile = async (files: File[]) => {
        setIsProcessing(true);
        const allVendors: Omit<Vendor, '_id'>[] = [];
        for (const file of files) {
            const result = await extractVendorsFromDocument(file);
            if (result?.vendors) {
                allVendors.push(...result.vendors);
            }
        }
        setIsProcessing(false);
        setIsUploadModalOpen(false);
        if (allVendors.length > 0) {
            setDataToReview(allVendors);
            setIsReviewModalOpen(true);
        } else {
            alert('Failed to extract any vendors from the document(s). Please check the file format and try again.');
        }
    };

    const handleConfirmUpload = (reviewedData: Omit<Vendor, '_id'>[]) => {
        if (!reviewedData) return;
        const newVendors: Vendor[] = reviewedData.map(v => ({ ...v, _id: `V${Date.now()}${Math.random()}` }));
        const uniqueNewVendors = newVendors.filter(newVendor => !vendors.some(existing => existing.supplierCode.toLowerCase() === newVendor.supplierCode.toLowerCase()));
        const duplicates = newVendors.length - uniqueNewVendors.length;
        if (duplicates > 0) {
            alert(`${duplicates} duplicate vendor(s) based on Supplier Code were ignored.`);
        }
        setVendors(prev => [...uniqueNewVendors, ...prev]);
        setIsReviewModalOpen(false);
        setDataToReview(null);
    };

    return (
        <>
            <Card className="h-full flex flex-col">
                <CardHeader className="p-4 border-b space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-semibold tracking-tight">Manage Vendors</h2>
                        {canManage && 
                          <div className="flex items-center gap-2">
                            <Button onClick={() => setIsUploadModalOpen(true)} size="sm" variant="outline">Bulk Upload</Button>
                            <Button onClick={handleOpenAddModal} size="sm">Add New Vendor</Button>
                          </div>
                        }
                    </div>
                    <div className="relative">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        <Input
                            type="text"
                            placeholder="Search Name, Code..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10"
                        />
                    </div>
                    <div className="flex items-center space-x-2">
                        <FilterButton value="all" label="All" currentFilter={statusFilter} onClick={setStatusFilter} />
                        <FilterButton value={VendorStatus.Active} label={VendorStatus.Active} currentFilter={statusFilter} onClick={setStatusFilter} />
                        <FilterButton value={VendorStatus.Inactive} label={VendorStatus.Inactive} currentFilter={statusFilter} onClick={setStatusFilter} />
                        <FilterButton value={VendorStatus.Blacklisted} label={VendorStatus.Blacklisted} currentFilter={statusFilter} onClick={setStatusFilter} />
                    </div>
                </CardHeader>
                <CardContent className="p-0 flex-grow overflow-y-auto">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-card-foreground">
                            <thead className="bg-muted/50">
                                <tr>
                                    <th className="p-4 font-medium">Vendor Name</th>
                                    <th className="p-4 font-medium">Vendor Code</th>
                                    <th className="p-4 font-medium">Payment Terms</th>
                                    <th className="p-4 font-medium">Status</th>
                                    <th className="p-4 font-medium text-right">Rating</th>
                                    {canManage && <th className="p-4 font-medium text-right">Actions</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedVendors.map(vendor => (
                                    <tr key={vendor._id} className="border-b hover:bg-accent">
                                        <td className="p-4 font-medium whitespace-nowrap">{vendor.name}</td>
                                        <td className="p-4 font-mono whitespace-nowrap">{vendor.supplierCode}</td>
                                        <td className="p-4 whitespace-nowrap">{vendor.paymentTerms || 'N/A'}</td>
                                        <td className="p-4 whitespace-nowrap"><StatusBadge status={vendor.status} /></td>
                                        <td className="p-4 text-right whitespace-nowrap">{vendor.rating.toFixed(1)} ★</td>
                                        {canManage && (
                                            <td className="p-4 text-right whitespace-nowrap">
                                                <div className="flex justify-end space-x-2">
                                                    <Button variant="outline" size="sm" onClick={() => handleOpenEditModal(vendor)}>Edit</Button>
                                                    <Button variant="destructive" size="sm" onClick={() => handleDeleteRequest(vendor)}>Delete</Button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                         {filteredVendors.length === 0 && (
                            <div className="p-6 text-center text-muted-foreground">
                                <p>No vendors found for the current filters.</p>
                            </div>
                        )}
                    </div>
                </CardContent>
                {totalPages > 1 && (
                  <CardFooter className="p-2 border-t justify-center">
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                    />
                  </CardFooter>
                )}
            </Card>

            <VendorModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveVendor}
                initialData={editingVendor}
                currentUserPermissions={currentUserPermissions}
            />

            <ConfirmationDialog
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={handleConfirmDelete}
                title={`Delete Vendor: ${vendorToDelete?.name || ''}?`}
                description="This action cannot be undone. This will permanently delete the vendor."
                confirmText="Delete"
                confirmVariant="destructive"
            />
             <UploadDocumentModal
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                onProcess={handleProcessFile}
                isProcessing={isProcessing}
                multiple={true}
                title="Bulk Upload Vendors"
                description="Upload one or more CSV or PDF files containing vendor data."
            />

            <BulkDataReviewModal
                isOpen={isReviewModalOpen}
                onClose={() => setIsReviewModalOpen(false)}
                onConfirm={handleConfirmUpload}
                initialData={dataToReview}
                entityType="vendors"
            />
        </>
    );
};

export default SuppliersDashboard;
