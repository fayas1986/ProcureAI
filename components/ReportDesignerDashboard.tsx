
import React, { useState, useMemo, useEffect } from 'react';
import type { DocumentTemplate, Permission, DocumentTemplateVersion } from '../types';
import { Button } from './common/Button';
import { Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter } from './common/Card';
import { Input } from './common/Input';
import ConfirmationDialog from './common/ConfirmationDialog';
import RichTextInput from './common/RichTextInput';
import SignatureCaptureModal from './common/SignatureCaptureModal';
import DocumentPreview from './DocumentPreview';

interface ReportDesignerDashboardProps {
    documentTemplates: DocumentTemplate[];
    setDocumentTemplates: React.Dispatch<React.SetStateAction<DocumentTemplate[]>>;
    currentUserPermissions: Permission[];
}

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
};

const designPresets = [
    { name: 'Professional Blue', accentColor: '#0b64b1', companyAddress: '<b>Innovate Corp.</b><br>123 Innovation Drive<br>Suite 456<br>Metropolis, USA 12345', paymentTerms: 'Payment is due within <b>30 days</b> of the invoice date. A 1.5% late fee will be applied to all overdue invoices.' },
    { name: 'Modern Emerald', accentColor: '#059669', companyAddress: '<b>Eco Goods Co.</b><br>456 Green Way<br>Natura City, USA 67890', paymentTerms: 'Payment due <u>upon receipt</u>. Thank you for choosing sustainable partners!' },
    { name: 'Elegant Crimson', accentColor: '#be123c', companyAddress: '<b>Prestige Worldwide</b><br>789 Global Plaza, 100th Floor<br>Commerce City, USA 11223', paymentTerms: 'NET 60. All payments should be made via wire transfer.' },
    { name: 'Minimalist Mono', accentColor: '#171717', companyAddress: '<b>Studio Arch</b><br>555 Design Lane<br>Aesthetic, USA 44332', paymentTerms: 'Invoices are payable within 15 business days.' },
    { name: 'Friendly Orange', accentColor: '#f97316', companyAddress: '<b>Creative Sparks LLC</b><br>800 Idea Ave<br>Sparkville, USA 99887', paymentTerms: 'We appreciate your business! Payment is due in 30 days.' }
];

const patternPresets = [
    { name: 'Plus', url: "data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%239C92AC' fill-opacity='0.1' fill-rule='evenodd'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/svg%3E" },
    { name: 'Cross', url: "data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%239C92AC' fill-opacity='0.1' fill-rule='evenodd'%3E%3Cpath d='M10 0v20M0 10h20'/%3E%3C/g%3E%3C/svg%3E" },
    { name: 'Dots', url: "data:image/svg+xml,%3Csvg width='6' height='6' viewBox='0 0 6 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%239C92AC' fill-opacity='0.1' fill-rule='evenodd'%3E%3Cpath d='M5 0h1L0 6V5zM6 5v1H5z'/%3E%3C/g%3E%3C/svg%3E" },
    { name: 'Waves', url: "data:image/svg+xml,%3Csvg width='80' height='20' viewBox='0 0 80 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 10 C 20 0, 20 20, 40 10 S 60 0, 80 10' stroke='%239C92AC' fill='none' stroke-width='1' stroke-opacity='0.2'/%3E%3C/svg%3E" },
    { name: 'Herringbone', url: "data:image/svg+xml,%3Csvg width='100' height='50' viewBox='0 0 100 50' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M-50 50L0 0h50L0 50zM0 50L50 0h50L50 50z' fill='%239C92AC' fill-opacity='0.1'/%3E%3C/svg%3E" },
    { name: 'Hexagons', url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='23' viewBox='0 0 20 23'%3E%3Cpath fill='%239C92AC' fill-opacity='0.1' d='M10 23l10-5.77V5.77L10 0 0 5.77v11.46L10 23zm0-2.31L1.92 15.92V7.69L10 2.31l8.08 5.38v8.23L10 20.69z'/%3E%3C/svg%3E" }
];


const ReportDesignerDashboard: React.FC<ReportDesignerDashboardProps> = ({ documentTemplates, setDocumentTemplates, currentUserPermissions }) => {
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [viewingVersionNumber, setViewingVersionNumber] = useState<number | null>(null);
    
    // Form state
    const [name, setName] = useState('');
    const [paymentTerms, setPaymentTerms] = useState('');
    const [logo, setLogo] = useState<string | undefined>(undefined);
    const [letterhead, setLetterhead] = useState<string | undefined>(undefined);
    const [companyAddress, setCompanyAddress] = useState('');
    const [accentColor, setAccentColor] = useState('#0b64b1');
    const [backgroundPatternUrl, setBackgroundPatternUrl] = useState('');
    const [backgroundType, setBackgroundType] = useState<'letterhead' | 'pattern' | 'none'>('none');
    const [signature, setSignature] = useState<string | undefined>(undefined);
    const [seal, setSeal] = useState<string | undefined>(undefined);
    const [watermark, setWatermark] = useState('');
    const [fontFamily, setFontFamily] = useState('Inter, sans-serif');
    const [layout, setLayout] = useState<'classic' | 'modern-left' | 'modern-right'>('classic');

    const [isCaptureModalOpen, setIsCaptureModalOpen] = useState(false);
    const [templateToDelete, setTemplateToDelete] = useState<DocumentTemplate | null>(null);

    const canManage = currentUserPermissions.includes('MANAGE_PO_TEMPLATES');

    const selectedTemplate = useMemo(() => {
        return documentTemplates.find(t => t._id === selectedTemplateId);
    }, [selectedTemplateId, documentTemplates]);

    const viewingVersion = useMemo(() => {
        if (!selectedTemplate || viewingVersionNumber === null) return null;
        return selectedTemplate.versions.find(v => v.version === viewingVersionNumber);
    }, [selectedTemplate, viewingVersionNumber]);

    const setFormStateFromVersion = (version: DocumentTemplateVersion | null | undefined) => {
        if (!version) return;
        setPaymentTerms(version.paymentTerms || '');
        setLogo(version.logo);
        setLetterhead(version.letterhead);
        setCompanyAddress(version.companyAddress || '');
        setAccentColor(version.accentColor || '#0b64b1');
        setBackgroundPatternUrl(version.backgroundPatternUrl || '');
        setSignature(version.signature);
        setSeal(version.seal);
        setWatermark(version.watermark || '');
        setFontFamily(version.fontFamily || 'Inter, sans-serif');
        setLayout(version.layout || 'classic');
        if (version.letterhead) setBackgroundType('letterhead');
        else if (version.backgroundPatternUrl) setBackgroundType('pattern');
        else setBackgroundType('none');
    };

    const handleSelectTemplate = (id: string) => {
        const template = documentTemplates.find(t => t._id === id);
        if (template) {
            setSelectedTemplateId(id);
            setName(template.name);
            setViewingVersionNumber(template.currentVersion);
            const currentVersionData = template.versions.find(v => v.version === template.currentVersion);
            setFormStateFromVersion(currentVersionData);
            setIsEditing(true);
        }
    };

    const handleNewTemplate = () => {
        setSelectedTemplateId(null);
        setViewingVersionNumber(null);
        setName('New Document Template');
        setPaymentTerms('');
        setLogo(undefined);
        setLetterhead(undefined);
        setCompanyAddress('');
        setAccentColor('#0b64b1');
        setBackgroundPatternUrl('');
        setBackgroundType('none');
        setSignature(undefined);
        setSeal(undefined);
        setWatermark('');
        setFontFamily('Inter, sans-serif');
        setLayout('classic');
        setIsEditing(true);
    };

    const handleViewVersion = (versionNumber: number) => {
        setViewingVersionNumber(versionNumber);
        const versionData = selectedTemplate?.versions.find(v => v.version === versionNumber);
        setFormStateFromVersion(versionData);
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<string | undefined>>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                alert(`File is too large. Please upload an image smaller than 2MB.`);
                return;
            }
            const base64 = await fileToBase64(file);
            setter(base64);
        }
    };
    
    const handleApplyPreset = (preset: typeof designPresets[0]) => {
        setAccentColor(preset.accentColor);
        setCompanyAddress(preset.companyAddress);
        setPaymentTerms(preset.paymentTerms);
    };

    const handleSaveCurrentVersion = () => {
        if (!name.trim()) { alert('Template name is required.'); return; }
        if (!selectedTemplateId || viewingVersionNumber === null) return;

        const updatedVersionData: Partial<DocumentTemplateVersion> = { 
            paymentTerms, logo, companyAddress, accentColor, signature, seal, watermark, fontFamily, layout,
            letterhead: backgroundType === 'letterhead' ? letterhead : undefined, 
            backgroundPatternUrl: backgroundType === 'pattern' ? backgroundPatternUrl : undefined,
        };

        setDocumentTemplates(prev => prev.map(t => {
            if (t._id === selectedTemplateId) {
                const updatedVersions = t.versions.map(v => 
                    v.version === viewingVersionNumber ? { ...v, ...updatedVersionData } : v
                );
                return { ...t, name, versions: updatedVersions };
            }
            return t;
        }));
        alert(`Version ${viewingVersionNumber} has been updated.`);
    };
    
    const handleSaveAsNewVersion = () => {
        if (!name.trim()) { alert('Template name is required.'); return; }
        const notes = prompt("Enter notes for this new version (e.g., 'Updated branding for Q3'):");
        
        if (selectedTemplateId) { // Saving new version for existing template
             const newVersionNumber = Math.max(...(selectedTemplate?.versions.map(v => v.version) || [0])) + 1;
             const newVersion: DocumentTemplateVersion = {
                version: newVersionNumber,
                createdAt: new Date().toISOString(),
                notes: notes || 'No notes provided.',
                paymentTerms, logo, companyAddress, accentColor, signature, seal, watermark, fontFamily, layout,
                letterhead: backgroundType === 'letterhead' ? letterhead : undefined, 
                backgroundPatternUrl: backgroundType === 'pattern' ? backgroundPatternUrl : undefined,
             };
             setDocumentTemplates(prev => prev.map(t => t._id === selectedTemplateId ? { ...t, name, versions: [...t.versions, newVersion], currentVersion: newVersionNumber } : t));
             setViewingVersionNumber(newVersionNumber);
        } else { // Saving a brand new template
            const newTemplate: DocumentTemplate = {
                _id: `DTPL${Date.now()}`,
                name,
                isDefault: documentTemplates.length === 0,
                currentVersion: 1,
                versions: [{
                    version: 1,
                    createdAt: new Date().toISOString(),
                    notes: notes || 'Initial version.',
                    paymentTerms, logo, companyAddress, accentColor, signature, seal, watermark, fontFamily, layout,
                    letterhead: backgroundType === 'letterhead' ? letterhead : undefined, 
                    backgroundPatternUrl: backgroundType === 'pattern' ? backgroundPatternUrl : undefined,
                }]
            };
            setDocumentTemplates(prev => [...prev, newTemplate]);
            setSelectedTemplateId(newTemplate._id);
            setViewingVersionNumber(1);
        }
    };
    
    const handleSetAsCurrentVersion = () => {
        if (!selectedTemplateId || viewingVersionNumber === null) return;
        setDocumentTemplates(prev => prev.map(t => t._id === selectedTemplateId ? { ...t, currentVersion: viewingVersionNumber } : t));
        alert(`Version ${viewingVersionNumber} is now the current version.`);
    };

    const handleDeleteRequest = (template: DocumentTemplate) => {
        if (template.isDefault) {
            alert("Cannot delete the default template. Please set another template as default first.");
            return;
        }
        setTemplateToDelete(template);
    };

    const handleConfirmDelete = () => {
        if (templateToDelete) {
            setDocumentTemplates(prev => prev.filter(t => t._id !== templateToDelete._id));
            if (selectedTemplateId === templateToDelete._id) {
                setSelectedTemplateId(null);
                setIsEditing(false);
            }
        }
        setTemplateToDelete(null);
    };
    
    const handleSetDefault = () => {
        if (!selectedTemplateId) return;
        setDocumentTemplates(prev => prev.map(t => ({ ...t, isDefault: t._id === selectedTemplateId })));
    };

    return (
        <>
            <div className="flex flex-col gap-6 h-full">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Report Designer</h1>
                        <p className="text-muted-foreground">Create and manage custom templates for your documents.</p>
                    </div>
                    {canManage && <Button onClick={handleNewTemplate} size="sm">Create New Template</Button>}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 flex-grow">
                    <div className="lg:col-span-2">
                        <Card className="sticky top-6">
                            <CardHeader>
                                <CardTitle>Document Templates</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <ul className="divide-y divide-border max-h-48 overflow-y-auto">
                                    {documentTemplates.map(t => (
                                        <li key={t._id} onClick={() => handleSelectTemplate(t._id)} className={`p-3 cursor-pointer ${selectedTemplateId === t._id ? 'bg-primary/10' : 'hover:bg-accent'}`}>
                                            <p className="font-semibold text-primary">{t.name}</p>
                                            <div className="flex items-center gap-2">
                                                {t.isDefault && <span className="text-xs font-medium bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">Default</span>}
                                                <span className="text-xs text-muted-foreground">v{t.currentVersion}</span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                         {isEditing && (
                            <Card className="mt-6">
                                <CardHeader>
                                    <CardTitle>{selectedTemplateId ? 'Edit Template' : 'Create Template'}</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6 max-h-[calc(100vh-25rem)] overflow-y-auto pr-3">
                                    <details open>
                                        <summary className="font-semibold cursor-pointer">General</summary>
                                        <div className="space-y-4 mt-2 pl-4 border-l">
                                            <Input value={name} onChange={e => setName(e.target.value)} required placeholder="Template Name" />
                                            {selectedTemplate && viewingVersionNumber !== null && (
                                                <div>
                                                    <label className="text-sm font-medium mb-1 block">Version History</label>
                                                    <select value={viewingVersionNumber} onChange={e => handleViewVersion(Number(e.target.value))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                                                        {selectedTemplate.versions.sort((a,b) => b.version - a.version).map(v => (
                                                            <option key={v.version} value={v.version}>
                                                                v{v.version} {v.version === selectedTemplate.currentVersion ? '(Current)' : ''} - {new Date(v.createdAt).toLocaleDateString()}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <p className="text-xs text-muted-foreground mt-1 italic">"{viewingVersion?.notes}"</p>
                                                </div>
                                            )}
                                            <div>
                                                <label className="text-sm font-medium mb-2 block">Design Presets</label>
                                                <div className="flex flex-wrap gap-2">
                                                    {designPresets.map(p => (<Button key={p.name} type="button" variant="outline" size="sm" onClick={() => handleApplyPreset(p)} className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: p.accentColor }}></span>{p.name}</Button>))}
                                                </div>
                                            </div>
                                        </div>
                                    </details>
                                    <details>
                                        <summary className="font-semibold cursor-pointer">Branding & Style</summary>
                                        <div className="space-y-4 mt-2 pl-4 border-l">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div><label className="text-sm font-medium mb-1 block">Accent Color</label><div className="flex items-center gap-2"><Input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)} className="w-12 h-10 p-1" /><Input value={accentColor} onChange={e => setAccentColor(e.target.value)} /></div></div>
                                                <div><label className="text-sm font-medium mb-1 block">Font Family</label><select value={fontFamily} onChange={e => setFontFamily(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="Inter, sans-serif">Inter (Sans Serif)</option><option value="Georgia, serif">Georgia (Serif)</option><option value="Courier New, monospace">Courier (Monospace)</option></select></div>
                                            </div>
                                            <div><label className="text-sm font-medium mb-1 block">Company Logo</label><Input type="file" accept="image/png, image/jpeg" onChange={e => handleImageUpload(e, setLogo)} />{logo && <img src={logo} alt="Logo Preview" className="mt-2 h-10 w-auto rounded border p-1" />}</div>
                                        </div>
                                    </details>
                                    <details>
                                        <summary className="font-semibold cursor-pointer">Layout & Content</summary>
                                        <div className="space-y-4 mt-2 pl-4 border-l">
                                            <div><label className="text-sm font-medium mb-1 block">Layout</label><select value={layout} onChange={e => setLayout(e.target.value as any)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="classic">Classic</option><option value="modern-left">Modern (Info Left)</option><option value="modern-right">Modern (Info Right)</option></select></div>
                                            <RichTextInput value={companyAddress} onChange={setCompanyAddress} placeholder="Your Company Inc.&#10;123 Main St&#10;City, State 12345" />
                                            <RichTextInput value={paymentTerms} onChange={setPaymentTerms} placeholder="Payment terms, footer notes, etc." />
                                            <div><label className="text-sm font-medium mb-1 block">Watermark</label><select value={watermark} onChange={e => setWatermark(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="">None</option><option value="Draft">Draft</option><option value="Confidential">Confidential</option><option value="Urgent">Urgent</option><option value="Copy">Copy</option></select></div>
                                        </div>
                                    </details>
                                     <details>
                                        <summary className="font-semibold cursor-pointer">Background</summary>
                                        <div className="space-y-3 mt-2 pl-4 border-l">
                                            <div className="flex space-x-4"><label className="flex items-center"><input type="radio" name="bg-type" value="none" checked={backgroundType === 'none'} onChange={() => setBackgroundType('none')} className="mr-2" /> None</label><label className="flex items-center"><input type="radio" name="bg-type" value="letterhead" checked={backgroundType === 'letterhead'} onChange={() => setBackgroundType('letterhead')} className="mr-2" /> Letterhead</label><label className="flex items-center"><input type="radio" name="bg-type" value="pattern" checked={backgroundType === 'pattern'} onChange={() => setBackgroundType('pattern')} className="mr-2" /> Pattern</label></div>
                                            {backgroundType === 'letterhead' && (<div><Input type="file" accept="image/png, image/jpeg" onChange={e => handleImageUpload(e, setLetterhead)} />{letterhead && <div className="mt-2 h-10 w-20 rounded border p-1 bg-muted/50"><img src={letterhead} alt="Letterhead Preview" className="h-full w-full object-contain" /></div>}</div>)}
                                            {backgroundType === 'pattern' && (
                                                <div>
                                                    <label className="text-sm font-medium mb-1 block">Pattern</label>
                                                    <div className="flex flex-wrap gap-2">
                                                        {patternPresets.map(p => (
                                                            <button type="button" key={p.name} onClick={() => setBackgroundPatternUrl(p.url)} className={`w-10 h-10 rounded border-2 ${backgroundPatternUrl === p.url ? 'border-primary' : 'border-input'}`} style={{ backgroundImage: `url("${p.url}")` }} title={p.name}></button>
                                                        ))}
                                                        <Input value={backgroundPatternUrl} onChange={e => setBackgroundPatternUrl(e.target.value)} placeholder="Or enter custom pattern URL" className="mt-2" />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </details>
                                    <details>
                                        <summary className="font-semibold cursor-pointer">Signature & Seal</summary>
                                        <div className="space-y-4 mt-2 pl-4 border-l">
                                            <div>
                                                <label className="text-sm font-medium mb-1 block">Signature Image</label>
                                                <div className="flex items-center gap-2">
                                                    <Button type="button" variant="outline" size="sm" onClick={() => setIsCaptureModalOpen(true)}>Capture Signature</Button>
                                                    {signature && <img src={signature} alt="Signature Preview" className="h-10 w-auto rounded border p-1" />}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-sm font-medium mb-1 block">Seal/Stamp Image</label>
                                                <Input type="file" accept="image/png, image/jpeg" onChange={e => handleImageUpload(e, setSeal)} />
                                                {seal && <img src={seal} alt="Seal Preview" className="h-10 w-10 rounded border p-1" />}
                                            </div>
                                        </div>
                                    </details>
                                </CardContent>
                                <CardFooter className="flex-col items-stretch gap-2">
                                    {selectedTemplateId && viewingVersionNumber !== selectedTemplate?.currentVersion && (
                                        <Button type="button" onClick={handleSetAsCurrentVersion}>Set as Current Version</Button>
                                    )}
                                    {selectedTemplateId && !selectedTemplate?.isDefault && (
                                        <Button type="button" variant="secondary" onClick={handleSetDefault}>Set as Default</Button>
                                    )}
                                    {selectedTemplateId && viewingVersionNumber === selectedTemplate?.currentVersion ? (
                                        <Button type="button" onClick={handleSaveCurrentVersion}>Save Changes to Current Version</Button>
                                    ) : null}
                                    <Button type="button" onClick={handleSaveAsNewVersion}>
                                        {selectedTemplateId ? 'Save as New Version' : 'Save New Template'}
                                    </Button>
                                    {selectedTemplateId && selectedTemplate && (
                                        <Button type="button" variant="destructive" onClick={() => handleDeleteRequest(selectedTemplate)}>Delete Template</Button>
                                    )}
                                </CardFooter>
                            </Card>
                         )}
                    </div>
                    <div className="lg:col-span-3">
                        <DocumentPreview template={{
                            accentColor, fontFamily, layout, logo, companyAddress, paymentTerms,
                            backgroundType, letterhead, backgroundPatternUrl, watermark, signature, seal
                        }} />
                    </div>
                </div>
            </div>

            <SignatureCaptureModal
                isOpen={isCaptureModalOpen}
                onClose={() => setIsCaptureModalOpen(false)}
                onSave={setSignature}
            />

            {templateToDelete && (
                <ConfirmationDialog
                    isOpen={!!templateToDelete}
                    onClose={() => setTemplateToDelete(null)}
                    onConfirm={handleConfirmDelete}
                    title={`Delete Template: ${templateToDelete.name}?`}
                    description="This will permanently delete the template and all its versions. This action cannot be undone."
                    confirmText="Delete"
                    confirmVariant="destructive"
                />
            )}
        </>
    );
};

export default ReportDesignerDashboard;
