
import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { Requisition, PurchaseOrder, GoodsReceipt, Invoice, User, Vendor } from '../types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './common/Card';
import { Button } from './common/Button';
import { Input } from './common/Input';
import Pagination from './common/Pagination';
import useDebounce from '../hooks/useDebounce';

// Make jspdf and autoTable available globally for TypeScript
declare global {
  interface Window {
    jspdf: any;
  }
}

const waitForPdfLib = (): Promise<void> => {
    return new Promise((resolve, reject) => {
        const timeout = 30000;
        const interval = 200;
        let elapsed = 0;

        const check = () => {
            if (window.jspdf && window.jspdf.jsPDF) {
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF();
                if (typeof doc.autoTable === 'function') {
                    resolve();
                    return;
                }
            }
            if (elapsed >= timeout) {
                reject(new Error("PDF library (jspdf-autotable) did not load in time. Please check your network connection and try again."));
            } else {
                elapsed += interval;
                setTimeout(check, interval);
            }
        };
        check();
    });
};

interface MasterReportDashboardProps {
    requisitions: Requisition[];
    purchaseOrders: PurchaseOrder[];
    goodsReceipts: GoodsReceipt[];
    invoices: Invoice[];
    users: User[];
    vendors: Vendor[];
}

type ReportType = 'procure-to-pay';
type TimeRangePreset = 'today' | 'week' | 'month' | 'year' | 'custom';
const ITEMS_PER_PAGE = 15;

interface CombinedReportData {
    id: string;
    prNumber: string;
    prDate: string;
    requester: string;
    department: string;
    poNumber?: string;
    poDate?: string;
    vendor?: string;
    grnNumbers?: string;
    grnDates?: string;
    invoiceNumbers?: string;
    invoiceDate?: string;
    totalAmount: number;
    currency: string;
    finalStatus: string;
}

type SortableKey = keyof CombinedReportData;
interface SortConfig {
    key: SortableKey;
    direction: 'ascending' | 'descending';
}

const getDatesForRange = (range: TimeRangePreset, customStart?: string, customEnd?: string): { start: Date, end: Date } => {
    const now = new Date();
    let start = new Date(now);
    let end = new Date(now);

    switch (range) {
        case 'today':
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            break;
        case 'week':
            const dayOfWeek = start.getDay();
            const diff = start.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
            start.setDate(diff);
            start.setHours(0, 0, 0, 0);
            end = new Date(start);
            end.setDate(start.getDate() + 6);
            end.setHours(23, 59, 59, 999);
            break;
        case 'month':
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
            break;
        case 'year':
            start = new Date(now.getFullYear(), 0, 1);
            end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
            break;
        case 'custom':
            start = customStart ? new Date(customStart) : new Date(0);
            end = customEnd ? new Date(customEnd) : new Date();
            start.setHours(0,0,0,0);
            end.setHours(23,59,59,999);
            break;
    }
    return { start, end };
};


const MasterReportDashboard: React.FC<MasterReportDashboardProps> = ({ requisitions, purchaseOrders, goodsReceipts, invoices, users, vendors }) => {
    const [reportType, setReportType] = useState<ReportType>('procure-to-pay');
    const [timeRange, setTimeRange] = useState<TimeRangePreset>('month');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [isExporting, setIsExporting] = useState<null | 'pdf' | 'csv' | 'word'>(null);
    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
    const exportMenuRef = useRef<HTMLDivElement>(null);
    
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'prDate', direction: 'descending' });

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
                setIsExportMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const processedData = useMemo<CombinedReportData[]>(() => {
        const { start, end } = getDatesForRange(timeRange, customStartDate, customEndDate);

        const filteredRequisitions = requisitions.filter(pr => {
            const prDate = new Date(pr.requestDate);
            return prDate >= start && prDate <= end;
        });

        let reportData = filteredRequisitions.map(pr => {
            const po = purchaseOrders.find(p => p.sourcePRId === pr._id || p._id === pr.relatedPOId);
            const vendor = po ? vendors.find(v => v._id === po.vendorId) : undefined;
            const relatedGRNs = po ? goodsReceipts.filter(grn => grn.poId === po._id) : [];
            const relatedInvoices = po ? invoices.filter(inv => inv.poId === po._id) : [];

            let finalStatus: string = pr.status;
            if (po) finalStatus = po.status;
            if (relatedInvoices.some(inv => inv.status === 'Paid')) finalStatus = 'Paid';

            return {
                id: pr._id,
                prNumber: pr.prNumber,
                prDate: pr.requestDate,
                requester: users.find(u => u._id === pr.requesterId)?.name || 'N/A',
                department: pr.department,
                poNumber: po?.poNumber,
                poDate: po?.orderDate,
                vendor: vendor?.name,
                grnNumbers: relatedGRNs.map(g => g.grnNumber).join(', '),
                grnDates: relatedGRNs.map(g => new Date(g.receivedDate).toLocaleDateString()).join(', '),
                invoiceNumbers: relatedInvoices.map(i => i.invoiceNumber).join(', '),
                invoiceDate: relatedInvoices[0]?.invoiceDate,
                totalAmount: po?.totalAmount || pr.totalAmount,
                currency: po?.currency || pr.currency,
                finalStatus,
            };
        });
        
        // Search filter
        if (debouncedSearchTerm) {
            const lowercasedFilter = debouncedSearchTerm.toLowerCase();
            reportData = reportData.filter(item => 
                Object.values(item).some(val => 
                    String(val).toLowerCase().includes(lowercasedFilter)
                )
            );
        }

        // Sorting
        reportData.sort((a, b) => {
            const aValue = a[sortConfig.key];
            const bValue = b[sortConfig.key];

            if (aValue === undefined || aValue === null) return 1;
            if (bValue === undefined || bValue === null) return -1;
            
            if (aValue < bValue) {
                return sortConfig.direction === 'ascending' ? -1 : 1;
            }
            if (aValue > bValue) {
                return sortConfig.direction === 'ascending' ? 1 : -1;
            }
            return 0;
        });

        return reportData;

    }, [requisitions, purchaseOrders, goodsReceipts, invoices, users, vendors, timeRange, customStartDate, customEndDate, debouncedSearchTerm, sortConfig]);

    const totalPages = Math.ceil(processedData.length / ITEMS_PER_PAGE);
    const paginatedData = useMemo(() => {
        return processedData.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
    }, [processedData, currentPage]);
    
    useEffect(() => {
        setCurrentPage(1);
    }, [timeRange, customStartDate, customEndDate, debouncedSearchTerm, sortConfig]);

    const formatDate = (dateString?: string) => dateString ? new Date(dateString).toLocaleDateString() : 'N/A';
    const formatCurrency = (amount: number, currency: string) => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
    
    const requestSort = (key: SortableKey) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key: SortableKey) => {
        if (sortConfig?.key !== key) {
            return <svg className="w-4 h-4 text-muted-foreground/30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" /></svg>;
        }
        if (sortConfig.direction === 'ascending') {
            return <svg className="w-4 h-4 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>;
        }
        return <svg className="w-4 h-4 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>;
    };

    const SortableHeader: React.FC<{ sortKey: SortableKey; title: string; }> = ({ sortKey, title }) => (
        <th className="p-3 font-medium whitespace-nowrap">
            <button type="button" onClick={() => requestSort(sortKey)} className="flex items-center gap-1 hover:text-foreground transition-colors">
                {title}
                {getSortIcon(sortKey)}
            </button>
        </th>
    );

    const exportHeaders = ['PR Number', 'PR Date', 'Requester', 'Department', 'PO Number', 'PO Date', 'Vendor', 'GRN(s)', 'Invoice(s)', 'Total Amount', 'Status'];
    const exportData = processedData.map(d => [d.prNumber, formatDate(d.prDate), d.requester, d.department, d.poNumber, formatDate(d.poDate), d.vendor, d.grnNumbers, d.invoiceNumbers, `${d.totalAmount.toFixed(2)} ${d.currency}`, d.finalStatus]);

    const handleExportPDF = async () => {
        setIsExporting('pdf');
        try {
            await waitForPdfLib();
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({ orientation: 'landscape' });
            doc.text("Procure-to-Pay Lifecycle Report", 14, 15);
            doc.autoTable({ head: [exportHeaders], body: exportData, startY: 20 });
            doc.save(`master_report_${new Date().toISOString().split('T')[0]}.pdf`);
        } catch(e) {
            console.error(e);
            alert(e instanceof Error ? e.message : "Failed to export PDF.");
        } finally {
            setIsExporting(null);
        }
    };
    
    const handleExportCSV = () => {
        setIsExporting('csv');
        const escapeCsvCell = (cell: any) => {
            const str = String(cell ?? '');
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        };
        const csvRows = [exportHeaders.join(','), ...exportData.map(row => row.map(escapeCsvCell).join(','))].join('\n');
        const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvRows);
        
        const link = document.createElement('a');
        link.setAttribute('href', csvContent);
        link.setAttribute('download', `master_report_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setIsExporting(null);
    };

    const handleExportWord = () => {
        setIsExporting('word');
        const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Export HTML to Word</title></head><body>`;
        const footer = "</body></html>";
        const tableHtml = `<h1>Procure-to-Pay Lifecycle Report</h1>
            <table border="1" style="border-collapse: collapse; width: 100%;">
                <thead><tr>${exportHeaders.map(h => `<th style="background-color: #f2f2f2; padding: 8px;">${h}</th>`).join('')}</tr></thead>
                <tbody>${exportData.map(row => `<tr>${row.map(cell => `<td style="padding: 8px;">${cell ?? ''}</td>`).join('')}</tr>`).join('')}</tbody>
            </table>`;
        
        const content = header + tableHtml + footer;
        const blob = new Blob(['\ufeff', content], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `master_report_${new Date().toISOString().split('T')[0]}.doc`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setIsExporting(null);
    };

    return (
        <Card className="h-full flex flex-col">
            <CardHeader>
                <CardTitle>Master Report</CardTitle>
                <CardDescription>A consolidated report of all procurement processes with export functionality.</CardDescription>
                
                 <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 pt-4">
                     <div className="flex flex-wrap items-end gap-4">
                        <div>
                            <label className="text-sm font-medium mb-1 block">Report Type</label>
                            <select value={reportType} onChange={e => setReportType(e.target.value as ReportType)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                                <option value="procure-to-pay">Procure-to-Pay Lifecycle</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">Date Range</label>
                            <select value={timeRange} onChange={e => setTimeRange(e.target.value as TimeRangePreset)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                                <option value="today">Today</option>
                                <option value="week">This Week</option>
                                <option value="month">This Month</option>
                                <option value="year">This Year</option>
                                <option value="custom">Custom</option>
                            </select>
                        </div>
                        {timeRange === 'custom' && (
                            <>
                                <div>
                                    <label className="text-sm font-medium mb-1 block">Start Date</label>
                                    <Input type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} />
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-1 block">End Date</label>
                                    <Input type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} />
                                </div>
                            </>
                        )}
                    </div>
                     <div className="relative inline-block text-left" ref={exportMenuRef}>
                        <Button
                            variant="outline"
                            onClick={() => setIsExportMenuOpen(prev => !prev)}
                            disabled={isExporting !== null}
                            className="flex items-center w-full md:w-auto"
                        >
                            {isExporting ? `Exporting ${isExporting.toUpperCase()}...` : 'Export'}
                            <svg className="-mr-1 ml-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                        </Button>
                        {isExportMenuOpen && (
                            <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-popover ring-1 ring-black ring-opacity-5 z-10">
                                <div className="py-1">
                                    <button onClick={() => { handleExportPDF(); setIsExportMenuOpen(false); }} className="text-popover-foreground block w-full text-left px-4 py-2 text-sm hover:bg-accent disabled:opacity-50" disabled={isExporting !== null}>Export as PDF</button>
                                    <button onClick={() => { handleExportCSV(); setIsExportMenuOpen(false); }} className="text-popover-foreground block w-full text-left px-4 py-2 text-sm hover:bg-accent disabled:opacity-50" disabled={isExporting !== null}>Export as CSV</button>
                                    <button onClick={() => { handleExportWord(); setIsExportMenuOpen(false); }} className="text-popover-foreground block w-full text-left px-4 py-2 text-sm hover:bg-accent disabled:opacity-50" disabled={isExporting !== null}>Export as Word</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                 <div className="relative pt-4">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    <Input
                        type="text"
                        placeholder="Search across all fields in the current report..."
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
                                <SortableHeader sortKey="prNumber" title="PR Number" />
                                <SortableHeader sortKey="prDate" title="PR Date" />
                                <SortableHeader sortKey="requester" title="Requester" />
                                <SortableHeader sortKey="department" title="Department" />
                                <SortableHeader sortKey="poNumber" title="PO Number" />
                                <SortableHeader sortKey="poDate" title="PO Date" />
                                <SortableHeader sortKey="vendor" title="Vendor" />
                                <SortableHeader sortKey="grnNumbers" title="GRN(s)" />
                                <SortableHeader sortKey="invoiceNumbers" title="Invoice(s)" />
                                <SortableHeader sortKey="totalAmount" title="Total Amount" />
                                <SortableHeader sortKey="finalStatus" title="Status" />
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedData.map(d => (
                                <tr key={d.id} className="border-t hover:bg-accent">
                                    <td className="p-3 font-mono text-primary whitespace-nowrap">{d.prNumber}</td>
                                    <td className="p-3 whitespace-nowrap">{formatDate(d.prDate)}</td>
                                    <td className="p-3 whitespace-nowrap">{d.requester}</td>
                                    <td className="p-3 whitespace-nowrap">{d.department}</td>
                                    <td className="p-3 font-mono whitespace-nowrap">{d.poNumber || 'N/A'}</td>
                                    <td className="p-3 whitespace-nowrap">{formatDate(d.poDate)}</td>
                                    <td className="p-3 whitespace-nowrap">{d.vendor || 'N/A'}</td>
                                    <td className="p-3 font-mono whitespace-nowrap">{d.grnNumbers || 'N/A'}</td>
                                    <td className="p-3 font-mono whitespace-nowrap">{d.invoiceNumbers || 'N/A'}</td>
                                    <td className="p-3 text-right whitespace-nowrap">{formatCurrency(d.totalAmount, d.currency)}</td>
                                    <td className="p-3 whitespace-nowrap">{d.finalStatus}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {processedData.length === 0 && (
                        <div className="p-6 text-center text-muted-foreground">
                            <p>No data found for the selected filters.</p>
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
    );
};

export default MasterReportDashboard;
