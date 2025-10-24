
import React, { useState, useMemo, useEffect } from 'react';
import type { POTemplate, Vendor, Material, Permission, Currency } from '../types';
import { Button } from './common/Button';
import { Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter } from './common/Card';
import { Input } from './common/Input';
import TemplateModal from './TemplateModal';
import ConfirmationDialog from './common/ConfirmationDialog';
import useDebounce from '../hooks/useDebounce';
import Fuse from 'fuse.js';
import Pagination from './common/Pagination';

interface POTemplatesDashboardProps {
    poTemplates: POTemplate[];
    setPoTemplates: React.Dispatch<React.SetStateAction<POTemplate[]>>;
    onUseTemplate: (template: POTemplate) => void;
    vendors: Vendor[];
    materials: Material[];
    currentUserPermissions: Permission[];
    rates: Record<string, number> | null;
    displayCurrency: Currency;
}

const ITEMS_PER_PAGE = 10;

const POTemplatesDashboard: React.FC<POTemplatesDashboardProps> = ({ poTemplates, setPoTemplates, onUseTemplate, vendors, materials, currentUserPermissions, rates }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<POTemplate | null>(null);
    const [templateToDelete, setTemplateToDelete] = useState<POTemplate | null>(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    
    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    const canManage = currentUserPermissions.includes('MANAGE_PO_TEMPLATES');

    const fuse = useMemo(() => new Fuse(poTemplates, {
        keys: ['templateName', 'templateDescription'],
        threshold: 0.4,
    }), [poTemplates]);

    const filteredTemplates = useMemo(() => {
        if (!debouncedSearchTerm) return poTemplates;
        return fuse.search(debouncedSearchTerm).map(result => result.item);
    }, [debouncedSearchTerm, fuse, poTemplates]);

    const totalPages = Math.ceil(filteredTemplates.length / ITEMS_PER_PAGE);
    const paginatedTemplates = useMemo(() => {
        return filteredTemplates.slice(
            (currentPage - 1) * ITEMS_PER_PAGE,
            currentPage * ITEMS_PER_PAGE
        );
    }, [filteredTemplates, currentPage]);

    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearchTerm]);

    const handleOpenAddModal = () => {
        setEditingTemplate(null);
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (template: POTemplate) => {
        setEditingTemplate(template);
        setIsModalOpen(true);
    };

    const handleSaveTemplate = (templateData: Omit<POTemplate, '_id'>, id: string | null) => {
        if (id) { // Editing
            setPoTemplates(prev => prev.map(t => (t._id === id ? { ...templateData, _id: id } : t)));
        } else { // Creating
            const newTemplate: POTemplate = { ...templateData, _id: `TPL${Date.now()}` };
            setPoTemplates(prev => [newTemplate, ...prev]);
        }
        setIsModalOpen(false);
    };

    const handleDeleteRequest = (template: POTemplate) => {
        setTemplateToDelete(template);
        setIsConfirmOpen(true);
    };

    const handleConfirmDelete = () => {
        if (templateToDelete) {
            setPoTemplates(prev => prev.filter(t => t._id !== templateToDelete._id));
        }
        setIsConfirmOpen(false);
        setTemplateToDelete(null);
    };

    return (
        <>
            <Card className="h-full flex flex-col">
                <CardHeader className="p-4 border-b">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <CardTitle className="text-lg font-semibold tracking-tight">PO Templates</CardTitle>
                            <CardDescription>Create, manage, and use templates for recurring purchases.</CardDescription>
                        </div>
                        {canManage && <Button onClick={handleOpenAddModal} size="sm">Create New Template</Button>}
                    </div>
                    <div className="relative">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        <Input
                            type="text"
                            placeholder="Search by template name or description..."
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
                                    <th className="p-4 font-medium">Template Name</th>
                                    <th className="p-4 font-medium">Description</th>
                                    <th className="p-4 font-medium">Default Vendor</th>
                                    <th className="p-4 font-medium text-center">Lines</th>
                                    <th className="p-4 font-medium text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedTemplates.map(template => (
                                    <tr key={template._id} className="border-b hover:bg-accent">
                                        <td className="p-4 font-medium text-primary whitespace-nowrap">{template.templateName}</td>
                                        <td className="p-4 text-muted-foreground">{template.templateDescription}</td>
                                        <td className="p-4 whitespace-nowrap">{vendors.find(v => v._id === template.vendorId)?.name || 'N/A'}</td>
                                        <td className="p-4 text-center whitespace-nowrap">{template.lines?.length || 0}</td>
                                        <td className="p-4 text-right whitespace-nowrap">
                                            <div className="flex justify-end space-x-2">
                                                <Button variant="default" size="sm" onClick={() => onUseTemplate(template)}>Use Template</Button>
                                                {canManage && (
                                                    <>
                                                        <Button variant="outline" size="sm" onClick={() => handleOpenEditModal(template)}>Edit</Button>
                                                        <Button variant="destructive" size="sm" onClick={() => handleDeleteRequest(template)}>Delete</Button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                         {paginatedTemplates.length === 0 && (
                            <div className="p-6 text-center text-muted-foreground">
                                <p>No templates found. Click "Create New Template" to get started.</p>
                            </div>
                        )}
                    </div>
                </CardContent>
                 {totalPages > 1 && (
                  <CardFooter className="p-2 border-t justify-center">
                    <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                  </CardFooter>
                )}
            </Card>

            <TemplateModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveTemplate}
                initialData={editingTemplate}
                vendors={vendors}
                materials={materials}
                rates={rates}
            />

            <ConfirmationDialog
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={handleConfirmDelete}
                title={`Delete Template: ${templateToDelete?.templateName || ''}?`}
                description="This action cannot be undone. This will permanently delete the PO template."
                confirmText="Delete"
                confirmVariant="destructive"
            />
        </>
    );
};

export default POTemplatesDashboard;
