

import React, { useMemo, useState, useEffect, useRef } from 'react';
import type { PurchaseOrder, Vendor, Currency, Requisition } from '../types';
import { POStatus } from '../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './common/Card';
import { convertCurrency } from '../services/currencyService';
import { Button } from './common/Button';
import CurrencySwitcher from './common/CurrencySwitcher';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface AnalyticsDashboardProps {
    purchaseOrders: PurchaseOrder[];
    vendors: Vendor[];
    requisitions: Requisition[];
    displayCurrency: Currency;
    setDisplayCurrency: (currency: Currency) => void;
    rates: Record<string, number> | null;
    onRefreshData: () => void;
    lastRefreshed: Date;
}

type TimeRange = 'all' | 'today' | 'week' | 'month' | 'year';

const ChartLoader = () => (
    <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground animate-pulse">Loading Chart...</p>
    </div>
);

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

const ChartContainer: React.FC<{ title: string; description: string; children: React.ReactNode; }> = ({ title, description, children }) => (
    <Card>
        <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="h-[300px]">
                {children}
            </div>
        </CardContent>
    </Card>
);

const CustomTooltipContent: React.FC<any> = ({ active, payload, label, formatter }) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border bg-background p-2 shadow-sm">
          <div className="grid grid-cols-1 gap-1.5">
            <p className="text-sm font-medium">{label}</p>
            {payload.map((entry: any, index: number) => (
                <div key={`item-${index}`} className="flex items-center">
                    <div className="w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: entry.fill || entry.stroke }} />
                    <p className="text-sm text-muted-foreground">{entry.name}: <span className="font-bold text-foreground">{formatter(entry.value)}</span></p>
                </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
};

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ purchaseOrders, vendors, requisitions, displayCurrency, setDisplayCurrency, rates, onRefreshData, lastRefreshed }) => {
    
    const [isAutoRefreshEnabled, setIsAutoRefreshEnabled] = useState(true);
    const [countdown, setCountdown] = useState(60);
    const [isExporting, setIsExporting] = useState<null | 'pdf' | 'csv'>(null);
    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
    const exportMenuRef = useRef<HTMLDivElement>(null);
    const [timeRange, setTimeRange] = useState<TimeRange>('all');

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
    }, [exportMenuRef]);
    
    useEffect(() => {
        if (!isAutoRefreshEnabled) return;
        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    onRefreshData();
                    return 60;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [isAutoRefreshEnabled, onRefreshData]);

    const handleManualRefresh = () => {
        onRefreshData();
        setCountdown(60);
    };
    
    const formatLastRefreshed = (date: Date) => `Last updated: ${date.toLocaleTimeString()}`;

    const { filteredPOs, filteredRequisitions } = useMemo(() => {
        if (timeRange === 'all') {
            return { filteredPOs: purchaseOrders, filteredRequisitions: requisitions };
        }
        
        const now = new Date();
        let start = new Date(now);
        let end = new Date(now);

        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);

        switch (timeRange) {
            case 'today':
                break;
            case 'week':
                const day = start.getDay();
                const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Monday as start of week
                start.setDate(diff);
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
        }

        const fPOs = purchaseOrders.filter(po => {
            const poDate = new Date(po.orderDate);
            return poDate >= start && poDate <= end;
        });

        const fReqs = requisitions.filter(req => {
            const reqDate = new Date(req.requestDate);
            return reqDate >= start && reqDate <= end;
        });

        return { filteredPOs: fPOs, filteredRequisitions: fReqs };

    }, [timeRange, purchaseOrders, requisitions, lastRefreshed]);

    const poValueByStatus = useMemo(() => {
        const statusMap: { [key in POStatus]?: number } = {};
        for (const po of filteredPOs) {
            const amountInDisplayCurrency = convertCurrency(po.totalAmount, po.currency, displayCurrency, rates);
            statusMap[po.status] = (statusMap[po.status] || 0) + amountInDisplayCurrency;
        }
        return Object.entries(statusMap).map(([name, value]) => ({ name, value: Math.round(value) }));
    }, [filteredPOs, displayCurrency, rates, lastRefreshed]);

    const posPerVendor = useMemo(() => {
        const vendorMap: { [key: string]: number } = {};
        for (const po of filteredPOs) {
            vendorMap[po.vendorId] = (vendorMap[po.vendorId] || 0) + 1;
        }
        return Object.entries(vendorMap).map(([vendorId, count]) => ({
            name: vendors.find(s => s._id === vendorId)?.name || 'Unknown',
            value: count,
        }));
    }, [filteredPOs, vendors, lastRefreshed]);

    const approvalTimes = useMemo(() => {
        const buckets = { '0-1 Day': 0, '2-3 Days': 0, '4-6 Days': 0, '7+ Days': 0 };
        filteredPOs.forEach(po => {
            if (po.createdAt && po.approvedAt && (po.status === POStatus.Approved || po.status === POStatus.Rejected)) {
                const created = new Date(po.createdAt);
                const approved = new Date(po.approvedAt);
                if (!isNaN(created.getTime()) && !isNaN(approved.getTime())) {
                    const diffDays = (approved.getTime() - created.getTime()) / (1000 * 3600 * 24);
                    if (diffDays <= 1) buckets['0-1 Day']++;
                    else if (diffDays <= 3) buckets['2-3 Days']++;
                    else if (diffDays <= 6) buckets['4-6 Days']++;
                    else buckets['7+ Days']++;
                }
            }
        });
        return Object.entries(buckets).map(([name, value]) => ({ name, value }));
    }, [filteredPOs, lastRefreshed]);
    
     const cycleTimeByDepartment = useMemo(() => {
        const departmentTimes: { [department: string]: number[] } = {};
        filteredPOs.forEach(po => {
            if (po.sourcePRId && po.approvedAt) {
                const pr = filteredRequisitions.find(r => r._id === po.sourcePRId);
                if (pr && pr.requestDate) {
                    const prDate = new Date(pr.requestDate);
                    const poApprovedDate = new Date(po.approvedAt);
                    if (!isNaN(prDate.getTime()) && !isNaN(poApprovedDate.getTime())) {
                        const diffDays = (poApprovedDate.getTime() - prDate.getTime()) / (1000 * 3600 * 24);
                        if (!departmentTimes[pr.department]) {
                            departmentTimes[pr.department] = [];
                        }
                        departmentTimes[pr.department].push(diffDays);
                    }
                }
            }
        });
        return Object.entries(departmentTimes).map(([name, times]) => ({
            name,
            value: parseFloat((times.reduce((a, b) => a + b, 0) / times.length).toFixed(1)),
        }));
    }, [filteredPOs, filteredRequisitions, lastRefreshed]);

    const formatCurrencyTooltip = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: displayCurrency }).format(value);
    const currencySymbol = useMemo(() => new Intl.NumberFormat('en-US', { style: 'currency', currency: displayCurrency }).formatToParts(1).find(part => part.type === 'currency')?.value || '$', [displayCurrency]);
    const COLORS = ['#A78BFA', '#6EE7B7', '#FCD34D', '#FB923C', '#60A5FA', '#34D399', '#FBBF24', '#A7F3D0', '#D1FAE5', '#BFDBFE', '#93C5FD', '#60A5FA', '#3B82F6', '#2563EB', '#1D4ED8', '#1E3A8A', '#0C4A6E', '#083344', '#062E3E', '#042C3C'];
    const PO_STATUS_COLORS = ['#4285F4', '#34A853', '#FBBC05', '#EA4335', '#9E69EE', '#00BCD4'];
    const VENDOR_COLORS = ['#4285F4', '#FBBC05', '#34A853', '#EA4335', '#9E69EE', '#00BCD4', '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0'];
    const APPROVAL_TIME_COLORS = ['#FF6384', '#4BC0C0', '#FFCE56', '#9966FF', '#36A2EB', '#FF9F40'];
    const CYCLE_TIME_COLORS = ['#673AB7', '#FFC107', '#00BCD4', '#FF5722', '#4CAF50', '#2196F3'];
const PO_APPROVAL_COLORS = ['#4285F4', '#34A853', '#FBBC05', '#EA4335'];
    
    const totalVendors = useMemo(() => posPerVendor.length, [posPerVendor]);
    
    const createCsvDownloader = (filename: string, content: string) => {
        const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(content);
        const link = document.createElement('a');
        link.setAttribute('href', csvContent);
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    
    const handleExportPDF = async () => {
        setIsExporting('pdf');
        try {
            await waitForPdfLib();
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            let yPos = 20;

            doc.setFontSize(18);
            doc.text("PO Analytics Report", 14, yPos);
            yPos += 10;
            doc.setFontSize(10);
            doc.text(`Report generated on: ${new Date().toLocaleString()}`, 14, yPos);
            yPos += 15;

            doc.setFontSize(14);
            doc.text("Total PO Value by Status", 14, yPos);
            yPos += 5;
            doc.autoTable({
                startY: yPos,
                head: [['Status', `Total Value (${displayCurrency})`]],
                body: poValueByStatus.map(d => [d.name, formatCurrencyTooltip(d.value)]),
            });
            // Fix: Use nullish coalescing operator to provide a fallback for potentially undefined `finalY`.
            yPos = (doc.lastAutoTable.finalY ?? yPos) + 15;

            doc.setFontSize(14);
            doc.text("Purchase Orders per Vendor", 14, yPos);
            yPos += 5;
            doc.autoTable({ startY: yPos, head: [['Vendor', 'PO Count']], body: posPerVendor.map(d => [d.name, d.value]) });
            // Fix: Use nullish coalescing operator to provide a fallback for potentially undefined `finalY`.
            yPos = (doc.lastAutoTable.finalY ?? yPos) + 15;

            doc.setFontSize(14);
            doc.text("PO Approval Time Distribution", 14, yPos);
            yPos += 5;
            doc.autoTable({ startY: yPos, head: [['Time Range', 'Number of POs']], body: approvalTimes.map(d => [d.name, d.value]) });
            // Fix: Use nullish coalescing operator to provide a fallback for potentially undefined `finalY`.
            yPos = (doc.lastAutoTable.finalY ?? yPos) + 15;

            doc.setFontSize(14);
            doc.text("Procurement Cycle Time by Department", 14, yPos);
            yPos += 5;
            doc.autoTable({ startY: yPos, head: [['Department', 'Average Cycle Time (Days)']], body: cycleTimeByDepartment.map(d => [d.name, d.value]) });

            doc.save(`po_analytics_report_${new Date().toISOString().split('T')[0]}.pdf`);
        } catch (e) {
            console.error(e);
            alert(e instanceof Error ? e.message : "Failed to export PDF.");
        } finally {
            setIsExporting(null);
        }
    };

    const handleExportCSV = () => {
        setIsExporting('csv');
        const sections: string[] = [];
        const escapeCsvCell = (cell: any) => {
            const str = String(cell ?? '');
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        };

        sections.push('Total PO Value by Status');
        sections.push(`Status,Total Value (${displayCurrency})`);
        poValueByStatus.forEach(d => sections.push(`${d.name},${d.value}`));

        sections.push('\nPurchase Orders per Vendor');
        sections.push('Vendor,PO Count');
        posPerVendor.forEach(d => sections.push(`${escapeCsvCell(d.name)},${d.value}`));

        sections.push('\nPO Approval Time Distribution');
        sections.push('Time Range,Number of POs');
        approvalTimes.forEach(d => sections.push(`${d.name},${d.value}`));

        sections.push('\nProcurement Cycle Time by Department');
        sections.push('Department,Average Cycle Time (Days)');
        cycleTimeByDepartment.forEach(d => sections.push(`${escapeCsvCell(d.name)},${d.value}`));

        createCsvDownloader(`po_analytics_report_${new Date().toISOString().split('T')[0]}.csv`, sections.join('\n'));
        setIsExporting(null);
    };
    
    const timeRanges: { value: TimeRange; label: string }[] = [
        { value: 'all', label: 'All Time' },
        { value: 'today', label: 'Today' },
        { value: 'week', label: 'This Week' },
        { value: 'month', label: 'This Month' },
        { value: 'year', label: 'This Year' },
    ];

    return (
        <div className="space-y-6">
             <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold tracking-tight">PO Analytics</h1>
                 <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <CurrencySwitcher displayCurrency={displayCurrency} setDisplayCurrency={setDisplayCurrency} rates={rates} />
                    <span>{formatLastRefreshed(lastRefreshed)}</span>
                    <div className="flex items-center gap-2">
                       <label htmlFor="auto-refresh-toggle-analytics" className="text-sm font-medium">Auto-refresh</label>
                       <div onClick={() => setIsAutoRefreshEnabled(!isAutoRefreshEnabled)} className={`relative inline-flex items-center h-6 rounded-full w-11 cursor-pointer transition-colors ${isAutoRefreshEnabled ? 'bg-primary' : 'bg-input'}`}>
                            <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${isAutoRefreshEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                       </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleManualRefresh} className="h-8">
                         <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 16 16"><path fillRule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/><path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/></svg>
                        Refresh {isAutoRefreshEnabled ? `(${countdown}s)` : ''}
                    </Button>
                     <div className="relative inline-block text-left" ref={exportMenuRef}>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsExportMenuOpen(prev => !prev)}
                            disabled={isExporting !== null}
                            className="h-8"
                        >
                            {isExporting ? `Exporting ${isExporting.toUpperCase()}...` : 'Export'}
                            <svg className="-mr-1 ml-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </Button>
                        {isExportMenuOpen && (
                            <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-popover ring-1 ring-black ring-opacity-5 z-10">
                                <div className="py-1">
                                    <button onClick={() => { handleExportPDF(); setIsExportMenuOpen(false); }} className="text-popover-foreground block w-full text-left px-4 py-2 text-sm hover:bg-accent disabled:opacity-50" disabled={isExporting !== null}>Export as PDF</button>
                                    <button onClick={() => { handleExportCSV(); setIsExportMenuOpen(false); }} className="text-popover-foreground block w-full text-left px-4 py-2 text-sm hover:bg-accent disabled:opacity-50" disabled={isExporting !== null}>Export as CSV</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
            <div className="p-1.5 bg-muted rounded-lg flex items-center space-x-1 flex-wrap">
                {timeRanges.map(range => (
                    <Button
                        key={range.value}
                        variant={timeRange === range.value ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setTimeRange(range.value)}
                        className="flex-grow md:flex-grow-0"
                    >
                        {range.label}
                    </Button>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChartContainer title="Total PO Value by Status" description={`Total monetary value of purchase orders in each status (in ${displayCurrency}).`}>
                    <ResponsiveContainer width="100%" height="100%">
                             <BarChart data={poValueByStatus}>
                                 <CartesianGrid vertical={false} strokeDasharray="3 3" />
                                 <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                                 <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value: number) => `${currencySymbol}${value / 1000}k`} />
                                 <Tooltip cursor={{ fill: 'hsl(var(--accent))' }} content={<CustomTooltipContent formatter={formatCurrencyTooltip} />} />
                             <Bar dataKey="value" name="Total Value" radius={[4, 4, 0, 0]}>
                                 {poValueByStatus.map((entry, index) => (
                                     <Cell key={`cell-${index}`} fill={PO_STATUS_COLORS[index % PO_STATUS_COLORS.length]} />
                                 ))}
                             </Bar>
                             </BarChart>
                         </ResponsiveContainer>
                 </ChartContainer>

                 <ChartContainer title="Purchase Orders per Vendor" description="Distribution of purchase orders among vendors.">
                     <div className="w-full h-full relative">
                             <ResponsiveContainer width="100%" height="100%">
                                 <PieChart>
                                     <Tooltip content={<CustomTooltipContent formatter={(value: number) => `${value} POs`} />} />
                                     <Pie data={posPerVendor} cx="50%" cy="50%" labelLine={false} innerRadius={80} outerRadius={120} fill="hsl(var(--primary))" dataKey="value" nameKey="name">
                                         {posPerVendor.map((_, index) => (
                                           <Cell key={`cell-${index}`} fill={VENDOR_COLORS[index % VENDOR_COLORS.length]} />
                                         ))}
                                     </Pie>
                                 </PieChart>
                             </ResponsiveContainer>
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                 <div className="text-center">
                                     <p className="text-3xl font-bold">{totalVendors}</p>
                                     <p className="text-sm text-muted-foreground">Vendors</p>
                                 </div>
                             </div>
                         </div>
                 </ChartContainer>

                 <ChartContainer title="PO Approval Time Distribution" description="How long it takes for POs to get approved or rejected.">
                     <ResponsiveContainer width="100%" height="100%">
                             <BarChart data={approvalTimes}>
                                 <CartesianGrid vertical={false} strokeDasharray="3 3" />
                                 <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                                 <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                                 <Tooltip cursor={{ fill: 'hsl(var(--accent))' }} content={<CustomTooltipContent formatter={(value: number) => `${value} POs`} />} />
                                 <Bar dataKey="value" name="Number of POs" radius={[4, 4, 0, 0]}>
                                     {approvalTimes.map((entry, index) => (
                                         <Cell key={`cell-${index}`} fill={PO_APPROVAL_COLORS[index % PO_APPROVAL_COLORS.length]} />
                                     ))}
                                 </Bar>
                             </BarChart>
                         </ResponsiveContainer>
                 </ChartContainer>

                  <ChartContainer title="Procurement Cycle Time" description="Average days from PR creation to PO approval by department.">
                     <ResponsiveContainer width="100%" height="100%">
                             <BarChart data={cycleTimeByDepartment}>
                                 <CartesianGrid vertical={false} strokeDasharray="3 3" />
                                 <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                                 <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                                 <Tooltip cursor={{ fill: 'hsl(var(--accent))' }} content={<CustomTooltipContent formatter={(value: number) => `${value} days`} />} />
                                 <Bar dataKey="value" name="Avg Cycle Time (Days)" radius={[4, 4, 0, 0]}>
                                     {cycleTimeByDepartment.map((entry, index) => (
                                         <Cell key={`cell-${index}`} fill={CYCLE_TIME_COLORS[index % CYCLE_TIME_COLORS.length]} />
                                     ))}
                                 </Bar>
                             </BarChart>
                         </ResponsiveContainer>
                 </ChartContainer>
            </div>
        </div>
    );
};

export default AnalyticsDashboard;
