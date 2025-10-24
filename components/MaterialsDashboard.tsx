import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { Material, User, Permission, PurchaseOrder, Requisition } from '../types';
import { UserRole } from '../types';
import { Button } from './common/Button';
import { Card, CardHeader, CardContent, CardFooter } from './common/Card';
import { Input } from './common/Input';
import MaterialModal from './MaterialModal';
import useDebounce from '../hooks/useDebounce';
import Fuse from 'fuse.js';
import ConfirmationDialog from './common/ConfirmationDialog';
import Pagination from './common/Pagination';
// Fix: Changed default import to named import for UploadDocumentModal to resolve module resolution error.
import { UploadDocumentModal } from './UploadDocumentModal';
import BulkDataReviewModal from './common/BulkDataReviewModal';
import { extractMaterialsFromDocument } from '../services/geminiService';

type SortableKey = 'sku' | 'description' | 'category' | 'defaultPrice';

interface SortConfig {
    key: SortableKey;
    direction: 'ascending' | 'descending';
}

interface MaterialsDashboardProps {
    materials: Material[];
    setMaterials: React.Dispatch<React.SetStateAction<Material[]>>;
    currentUser: User | null;
    currentUserPermissions: Permission[];
    purchaseOrders: PurchaseOrder[];
    requisitions: Requisition[];
}

const ITEMS_PER_PAGE = 10;

const getSortIcon = (key: SortableKey, sortConfig: SortConfig | null) => {
    if (sortConfig?.key !== key) {
        return <svg className="w-4 h-4 text-muted-foreground/30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" /></svg>;
    }
    if (sortConfig.direction === 'ascending') {
        return <svg className="w-4 h-4 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>;
    }
    return <svg className="w-4 h-4 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>;
};

interface SortableHeaderProps {
    sortKey: SortableKey;
    title: string;
    className?: string;
    sortConfig: SortConfig | null;
    requestSort: (key: SortableKey) => void;
}

const SortableHeader: React.FC<SortableHeaderProps> = ({ sortKey, title, className, sortConfig, requestSort }) => (
    <th className={`p-4 font-medium ${className}`}>
        <button
            type="button"
            onClick={() => requestSort(sortKey)}
            className="flex items-center gap-1 hover:text-foreground transition-colors"
        >
            {title}
            {getSortIcon(sortKey, sortConfig)}
        </button>
    </th>
);

const MaterialsDashboard: React.FC<MaterialsDashboardProps> = ({ materials, setMaterials, currentUser, currentUserPermissions, purchaseOrders, requisitions }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
    const [selectedMaterialIds, setSelectedMaterialIds] = useState<string[]>([]);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [materialToDelete, setMaterialToDelete] = useState<Material | null>(null);
    const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const selectAllCheckboxRef = useRef<HTMLInputElement>(null);

    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [dataToReview, setDataToReview] = useState<Omit<Material, '_id'>[] | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    const canManage = currentUserPermissions.includes('MANAGE_MATERIALS');

    const fuse = useMemo(() => new Fuse(materials, {
        keys: [
            { name: 'sku', weight: 0.5 },
            { name: 'description', weight: 0.3 },
            { name: 'category', weight: 0.2 },
        ],
        includeScore: true,
        threshold: 0.4,
    }), [materials]);

    const filteredMaterials = useMemo(() => {
        if (!debouncedSearchTerm) {
            return materials;
        }
        return fuse.search(debouncedSearchTerm).map(result => result.item);
    }, [debouncedSearchTerm, fuse, materials]);

    const sortedMaterials = useMemo(() => {
        let sortableItems = [...filteredMaterials];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];

                if (aValue < bValue) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [filteredMaterials, sortConfig]);

    const totalPages = Math.ceil(sortedMaterials.length / ITEMS_PER_PAGE);

    const paginatedMaterials = useMemo(() => {
        return sortedMaterials.slice(
            (currentPage - 1) * ITEMS_PER_PAGE,
            currentPage * ITEMS_PER_PAGE
        );
    }, [sortedMaterials, currentPage]);
    
    useEffect(() => {
      setCurrentPage(1);
      setSelectedMaterialIds([]);
    }, [debouncedSearchTerm]);

    useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(totalPages);
        }
    }, [currentPage, totalPages]);
    
    useEffect(() => {
        if (selectAllCheckboxRef.current) {
            const currentPaginatedIds = paginatedMaterials.map(m => m._id);
            const selectedInPage = selectedMaterialIds.filter(id => currentPaginatedIds.includes(id));
            const allSelected = currentPaginatedIds.length > 0 && selectedInPage.length === currentPaginatedIds.length;
            
            selectAllCheckboxRef.current.checked = allSelected;
            selectAllCheckboxRef.current.indeterminate = selectedInPage.length > 0 && !allSelected;
        }
    }, [selectedMaterialIds, paginatedMaterials]);

    const handleOpenAddModal = () => {
        setEditingMaterial(null);
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (material: Material) => {
        setEditingMaterial(material);
        setIsModalOpen(true);
    };

    const handleSaveMaterial = (materialData: Omit<Material, '_id'>, id: string | null) => {
        if (id) { // Editing
            setMaterials(prev =>
                prev.map(m => (m._id === id ? { ...materialData, _id: id } : m))
            );
        } else { // Creating
            const newMaterial: Material = {
                ...materialData,
                _id: `M${Date.now()}`,
            };
            setMaterials(prev => [newMaterial, ...prev]);
        }
        setIsModalOpen(false);
    };

    const handleDeleteRequest = (material: Material) => {
        const isUsedInPO = purchaseOrders.some(po => po.lines.some(line => line.materialId === material._id));
        const isUsedInRequisition = requisitions.some(pr => pr.items.some(item => item.materialId === material._id));

        if (isUsedInPO || isUsedInRequisition) {
            alert("This material cannot be deleted because it is currently used in one or more purchase orders or requisitions.");
            return;
        }
        
        setMaterialToDelete(material);
        setIsConfirmOpen(true);
    };
    
    const handleConfirmDelete = () => {
        if (materialToDelete) {
            setMaterials(prev => prev.filter(m => m._id !== materialToDelete._id));
        }
        setIsConfirmOpen(false);
        setMaterialToDelete(null);
    };
    
    const handleToggleSelection = (materialId: string) => {
        setSelectedMaterialIds(prev =>
            prev.includes(materialId) ? prev.filter(id => id !== materialId) : [...prev, materialId]
        );
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        const pageIds = paginatedMaterials.map(m => m._id);
        if (e.target.checked) {
            setSelectedMaterialIds(prev => [...new Set([...prev, ...pageIds])]);
        } else {
            setSelectedMaterialIds(prev => prev.filter(id => !pageIds.includes(id)));
        }
    };
    
    const handleBulkDelete = () => {
        const materialsToDelete = selectedMaterialIds.map(id => materials.find(m => m._id === id)).filter((m): m is Material => !!m);

        const usedMaterials: string[] = [];

        materialsToDelete.forEach(material => {
            const isUsedInPO = purchaseOrders.some(po => po.lines.some(line => line.materialId === material._id));
            const isUsedInRequisition = requisitions.some(pr => pr.items.some(item => item.materialId === material._id));

            if (isUsedInPO || isUsedInRequisition) {
                usedMaterials.push(material.sku);
            }
        });

        if (usedMaterials.length > 0) {
            alert(`The following materials cannot be deleted because they are in use:\n- ${usedMaterials.join('\n- ')}`);
            const usedMaterialIds = materialsToDelete.filter(m => usedMaterials.includes(m.sku)).map(m => m._id);
            setSelectedMaterialIds(prev => prev.filter(id => !usedMaterialIds.includes(id)));
            return;
        }

        if (window.confirm(`Are you sure you want to delete the selected ${selectedMaterialIds.length} materials? This action cannot be undone.`)) {
            setMaterials(prev => prev.filter(m => !selectedMaterialIds.includes(m._id)));
            setSelectedMaterialIds([]);
        }
    };

    const requestSort = (key: SortableKey) => {
        if (sortConfig && sortConfig.key === key) {
            if (sortConfig.direction === 'ascending') {
                setSortConfig({ key, direction: 'descending' });
            } else {
                setSortConfig(null);
            }
        } else {
            setSortConfig({ key, direction: 'ascending' });
        }
    };

    const handleProcessFile = async (files: File[]) => {
        setIsProcessing(true);
        const allMaterials: Omit<Material, '_id'>[] = [];
        for (const file of files) {
            const result = await extractMaterialsFromDocument(file);
            if (result?.materials) {
                allMaterials.push(...result.materials);
            }
        }
        setIsProcessing(false);
        setIsUploadModalOpen(false);
        if (allMaterials.length > 0) {
            setDataToReview(allMaterials);
            setIsReviewModalOpen(true);
        } else {
            alert('Failed to extract any materials from the document(s). Please check the file format and try again.');
        }
    };

    const handleConfirmUpload = (reviewedData: Omit<Material, '_id'>[]) => {
        if (!reviewedData) return;
        const newMaterials: Material[] = reviewedData.map(m => ({ ...m, _id: `M${Date.now()}${Math.random()}` }));
        const uniqueNewMaterials = newMaterials.filter(newMat => !materials.some(existing => existing.sku.toLowerCase() === newMat.sku.toLowerCase()));
        const duplicates = newMaterials.length - uniqueNewMaterials.length;
        if (duplicates > 0) {
            alert(`${duplicates} duplicate material(s) based on SKU were ignored.`);
        }
        setMaterials(prev => [...uniqueNewMaterials, ...prev]);
        setIsReviewModalOpen(false);
        setDataToReview(null);
    };

    return (
        <>
            <Card className="h-full flex flex-col">
                <CardHeader className="p-4 border-b">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold tracking-tight">Manage Materials</h2>
                        {canManage && selectedMaterialIds.length > 0 ? (
                             <div className="flex items-center gap-4">
                                <span className="text-sm font-medium text-muted-foreground">{selectedMaterialIds.length} selected</span>
                                <div className="flex items-center gap-2">
                                   <Button size="sm" variant="destructive" onClick={handleBulkDelete}>Bulk Delete</Button>
                                   <Button size="sm" variant="outline" onClick={() => setSelectedMaterialIds([])}>Cancel</Button>
                                </div>
                            </div>
                        ) : (
                            canManage && 
                            <div className="flex items-center gap-2">
                                <Button onClick={() => setIsUploadModalOpen(true)} size="sm" variant="outline">Bulk Upload</Button>
                                <Button onClick={handleOpenAddModal} size="sm">Add New Material</Button>
                            </div>
                        )}
                    </div>
                    <div className="relative">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        <Input
                            type="text"
                            placeholder="Search SKU, Description, Category..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10"
                        />
                    </div>
                </CardHeader>
                <CardContent className="p-0 flex-grow overflow-y-auto">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-card-foreground">
                            <thead className="bg-muted/50">
                                <tr>
                                    <th className="p-4 w-4">
                                        <input
                                            ref={selectAllCheckboxRef}
                                            type="checkbox"
                                            onChange={handleSelectAll}
                                            className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                                            aria-label="Select all materials"
                                            disabled={!canManage}
                                        />
                                    </th>
                                    <SortableHeader sortKey="sku" title="SKU" sortConfig={sortConfig} requestSort={requestSort} />
                                    <SortableHeader sortKey="description" title="Description" sortConfig={sortConfig} requestSort={requestSort} />
                                    <SortableHeader sortKey="category" title="Category" sortConfig={sortConfig} requestSort={requestSort} />
                                    <th className="p-4 font-medium">UOM</th>
                                    <SortableHeader sortKey="defaultPrice" title="Default Price" className="text-right" sortConfig={sortConfig} requestSort={requestSort} />
                                    {canManage && <th className="p-4 font-medium text-right">Actions</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedMaterials.map(material => (
                                    <tr key={material._id} className={`border-b transition-colors ${
                                        selectedMaterialIds.includes(material._id)
                                        ? 'bg-primary/10'
                                        : 'hover:bg-accent'
                                    }`}>
                                        <td className="p-4 w-4">
                                            <input
                                                type="checkbox"
                                                checked={selectedMaterialIds.includes(material._id)}
                                                onChange={() => handleToggleSelection(material._id)}
                                                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                                                aria-label={`Select material ${material.sku}`}
                                                disabled={!canManage}
                                            />
                                        </td>
                                        <td className="p-4 font-mono whitespace-nowrap">{material.sku}</td>
                                        <td className="p-4">{material.description}</td>
                                        <td className="p-4 whitespace-nowrap">{material.category}</td>
                                        <td className="p-4 whitespace-nowrap">{material.uom}</td>
                                        <td className="p-4 text-right whitespace-nowrap">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(material.defaultPrice)}</td>
                                        {canManage && (
                                            <td className="p-4 text-right whitespace-nowrap">
                                                <div className="flex justify-end space-x-2">
                                                    <Button variant="outline" size="sm" onClick={() => handleOpenEditModal(material)}>Edit</Button>
                                                    <Button variant="destructive" size="sm" onClick={() => handleDeleteRequest(material)}>Delete</Button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                         {paginatedMaterials.length === 0 && (
                            <div className="p-6 text-center text-muted-foreground">
                                <p>No materials found.</p>
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

            <MaterialModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveMaterial}
                initialData={editingMaterial}
            />

            <ConfirmationDialog
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={handleConfirmDelete}
                title={`Delete Material: ${materialToDelete?.sku || ''}?`}
                description="This action cannot be undone. This will permanently delete the material."
                confirmText="Delete"
                confirmVariant="destructive"
            />

            <UploadDocumentModal
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                onProcess={handleProcessFile}
                isProcessing={isProcessing}
                multiple={true}
                title="Bulk Upload Materials"
                description="Upload one or more CSV or PDF files containing material data."
            />

            <BulkDataReviewModal
                isOpen={isReviewModalOpen}
                onClose={() => setIsReviewModalOpen(false)}
                onConfirm={handleConfirmUpload}
                initialData={dataToReview}
                entityType="materials"
            />
        </>
    );
};

export default MaterialsDashboard;