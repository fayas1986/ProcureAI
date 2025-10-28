

import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { PurchaseOrder, Requisition, Invoice, Currency, GoodsReceipt } from '../types';
import { POStatus, RequisitionStatus } from '../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './common/Card';
import { Button } from './common/Button';
import { convertCurrency } from '../services/currencyService';
import CurrencySwitcher from './common/CurrencySwitcher';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

declare global {
  interface Window {
    Recharts?: any;
  }
}

interface OperationalBIDashboardProps {
    purchaseOrders: PurchaseOrder[];
    requisitions: Requisition[];
    invoices: Invoice[];
    goodsReceipts: GoodsReceipt[];
    onRefreshData: () => void;
    lastRefreshed: Date;
    displayCurrency: Currency;
    setDisplayCurrency: (currency: Currency) => void;
    rates: Record<string, number> | null;
}

type TimeRange = 'all' | 'day' | 'week' | 'month' | 'year';

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


const KPICard: React.FC<{ title: string; value: string | number; description: string }> = ({ title, value, description }) => (
    <Card>
        <CardHeader className="text-center">
            <CardTitle className="text-base text-muted-foreground">{title}</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
            <p className="text-3xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
        </CardContent>
    </Card>
);

const OperationalBIDashboard: React.FC<OperationalBIDashboardProps> = ({ purchaseOrders, requisitions, invoices, goodsReceipts, onRefreshData, lastRefreshed, displayCurrency, setDisplayCurrency, rates }) => {
    const [timeRange, setTimeRange] = useState<TimeRange>('all');
    const [isAutoRefreshEnabled, setIsAutoRefreshEnabled] = useState(true);
    const [countdown, setCountdown] = useState(60);
    const [isExporting, setIsExporting] = useState<null | 'pdf' | 'csv'>(null);
    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
    const exportMenuRef = useRef<HTMLDivElement>(null);

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
    
    const getDatesForRange = (range: TimeRange): { start: Date, end: Date } => {
        const now = new Date();
        let start = new Date(now);
        let end = new Date(now);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        switch (range) {
            case 'week': start.setDate(start.getDate() - start.getDay() + (start.getDay() === 0 ? -6 : 1)); end.setDate(start.getDate() + 6); break;
            case 'month': start.setDate(1); end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999); break;
            case 'year': start = new Date(now.getFullYear(), 0, 1); end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999); break;
        }
        return { start, end };
    };

    const filteredData = useMemo(() => {
        if (timeRange === 'all') return { filteredPRs: requisitions, filteredPOs: purchaseOrders, filteredInvoices: invoices };
        const { start, end } = getDatesForRange(timeRange);
        const filterByDate = (dateStr: string) => { const date = new Date(dateStr); return date >= start && date <= end; };
        return {
            filteredPRs: requisitions.filter(pr => filterByDate(pr.requestDate)),
            filteredPOs: purchaseOrders.filter(po => filterByDate(po.orderDate)),
            filteredInvoices: invoices.filter(inv => filterByDate(inv.invoiceDate)),
        };
    }, [timeRange, requisitions, purchaseOrders, invoices, lastRefreshed]);

    const onTimeDeliveryData = useMemo(() => {
        const { filteredPOs } = filteredData;
        let onTime = 0, late = 0;
        console.log("filteredPOs:", filteredPOs);
        console.log("goodsReceipts:", goodsReceipts);
        const deliveredPOs = filteredPOs.filter(po => {
            // console.log(`PO ${po.poNumber} status: ${po.status}`);
            return (
              po.status === POStatus.Closed ||
              po.status === POStatus.Invoiced
            );
          });
        // console.log("deliveredPOs:", deliveredPOs);
        deliveredPOs.forEach(po => {
            const relatedGRNs = goodsReceipts.filter(grn => grn.poId === po._id);
            if (relatedGRNs.length > 0) {
                const firstReceiptDate = new Date(relatedGRNs.sort((a, b) => new Date(a.receivedDate).getTime() - new Date(b.receivedDate).getTime())[0].receivedDate);
                const deliveryDate = new Date(po.deliveryDate);
                console.log(`PO ${po.poNumber}: Original firstReceiptDate: ${firstReceiptDate.toISOString()}, Original deliveryDate: ${deliveryDate.toISOString()}`);
                firstReceiptDate.setHours(0,0,0,0);
                deliveryDate.setHours(0,0,0,0);
                console.log(`PO ${po.poNumber}: Adjusted firstReceiptDate: ${firstReceiptDate.toISOString()}, Adjusted deliveryDate: ${deliveryDate.toISOString()}`);
                if (firstReceiptDate <= deliveryDate) {
                    onTime++;
                    console.log(`PO ${po.poNumber}: On-time delivery. onTime: ${onTime}`);
                } else {
                    late++;
                    console.log(`PO ${po.poNumber}: Late delivery. late: ${late}`);
                }
            }
        });
        const totalDeliveries = onTime + late;
        const chartData = totalDeliveries > 0 ? [{ name: 'On-Time', value: onTime }, { name: 'Late', value: late }] : [];
        console.log("onTimeDeliveryData: onTime", onTime, "late", late, "chartData", chartData);
        return { rate: totalDeliveries > 0 ? (onTime / totalDeliveries) * 100 : 0, chartData };
    }, [filteredData, goodsReceipts, lastRefreshed]);

    const kpiData = useMemo(() => {
        const { filteredPRs, filteredPOs, filteredInvoices } = filteredData;
        const totalSpend = filteredPOs.filter(po => [POStatus.Approved, POStatus.Closed, POStatus.Invoiced].includes(po.status)).reduce((sum, po) => sum + convertCurrency(po.totalAmount, po.currency, displayCurrency, rates), 0);
        return { requisitionsCreated: filteredPRs.length, posCreated: filteredPOs.length, invoicesProcessed: filteredInvoices.length, totalSpend };
    }, [filteredData, displayCurrency, rates]);
    
    const approvalStatusData = useMemo(() => {
        const { filteredPRs, filteredPOs } = filteredData;
        
        const prApproved = filteredPRs.filter(pr => pr.status === RequisitionStatus.Approved).length;
        const prRejected = filteredPRs.filter(pr => pr.status === RequisitionStatus.Rejected).length;

        const poApproved = filteredPOs.filter(po => po.status === POStatus.Approved).length;
        const poRejected = filteredPOs.filter(po => po.status === POStatus.Rejected).length;
        
        const data = [];
        if(prApproved > 0 || prRejected > 0) {
            data.push({ name: 'Requisitions', Approved: prApproved, Rejected: prRejected });
        }
        if(poApproved > 0 || poRejected > 0) {
            data.push({ name: 'Purchase Orders', Approved: poApproved, Rejected: poRejected });
        }
        
        return data;
    }, [filteredData]);

    const COLORS = ['hsl(210, 70%, 50%)', 'hsl(30, 90%, 50%)'];

    const avgApprovalTimeData = useMemo(() => {
        const { filteredPRs, filteredPOs } = filteredData;
        const calcAvgTime = (docs: (Requisition | PurchaseOrder)[], startField: 'requestDate' | 'createdAt', endField: 'approvedAt') => {
            const times = docs.filter(d => d[startField] && d[endField]).map(d => new Date(d[endField]!).getTime() - new Date(d[startField]!).getTime());
            if (times.length === 0) return 0;
            return (times.reduce((a, b) => a + b, 0) / times.length) / (1000 * 60 * 60 * 24);
        };
        const avgPrTime = calcAvgTime(filteredPRs, 'requestDate', 'approvedAt');
        const avgPoTime = calcAvgTime(filteredPOs, 'createdAt', 'approvedAt');
        return [
            { name: 'Requisitions', value: parseFloat(avgPrTime.toFixed(1)), color: COLORS[0] },
            { name: 'Purchase Orders', value: parseFloat(avgPoTime.toFixed(1)), color: COLORS[1] }
        ];
    }, [filteredData]);

    const formatCurrency = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: displayCurrency }).format(value);
    const formatCurrencyKPI = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: displayCurrency, maximumFractionDigits: 0 }).format(value);
    const formatLastRefreshed = (date: Date) => `Last updated: ${date.toLocaleTimeString()}`;
    const ChartLoader = () => <div className="flex items-center justify-center h-full"><p className="text-muted-foreground animate-pulse">Loading Chart...</p></div>;

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
            doc.text("Operational BI Report", 14, yPos);
            yPos += 10;
            doc.setFontSize(10);
            doc.text(`Time Range: ${timeRange === 'day' ? 'Today' : timeRange === 'all' ? 'All Time' : `This ${timeRange}`}`, 14, yPos);
            yPos += 15;

            doc.autoTable({
                startY: yPos,
                head: [['KPI', 'Value']],
                body: [
                    ['Total Spend', formatCurrencyKPI(kpiData.totalSpend)],
                    ['Requisitions Created', kpiData.requisitionsCreated],
                    ['Purchase Orders Created', kpiData.posCreated],
                    ['Invoices Processed', kpiData.invoicesProcessed],
                ],
            });
// Fix: Use nullish coalescing operator to provide a fallback for potentially undefined `finalY`.
            yPos = (doc.lastAutoTable.finalY ?? yPos) + 15;
            
            if (approvalStatusData.length > 0) {
                doc.setFontSize(14);
                doc.text("Approval Status", 14, yPos);
                yPos += 5;
                doc.autoTable({ startY: yPos, head: [['Document Type', 'Approved', 'Rejected']], body: approvalStatusData.map(d => [d.name, d.Approved, d.Rejected]) });
// Fix: Use nullish coalescing operator to provide a fallback for potentially undefined `finalY`.
                yPos = (doc.lastAutoTable.finalY ?? yPos) + 15;
            }

            if (avgApprovalTimeData.some(d => d.value > 0)) {
                doc.setFontSize(14);
                doc.text("Average Approval Time", 14, yPos);
                yPos += 5;
                doc.autoTable({ startY: yPos, head: [['Document Type', 'Average Time (Days)']], body: avgApprovalTimeData.map(d => [d.name, d.value]) });
// Fix: Use nullish coalescing operator to provide a fallback for potentially undefined `finalY`.
                yPos = (doc.lastAutoTable.finalY ?? yPos) + 15;
            }

            if (onTimeDeliveryData.chartData.length > 0) {
                doc.setFontSize(14);
                doc.text("On-Time Delivery Performance", 14, yPos);
                yPos += 5;
                doc.autoTable({ startY: yPos, head: [['Status', 'Deliveries']], body: onTimeDeliveryData.chartData.map(d => [d.name, d.value]) });
            }
            
            doc.save(`operational_bi_report_${new Date().toISOString().split('T')[0]}.pdf`);
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
        const escapeCsvCell = (cell: any) => `"${String(cell ?? '').replace(/"/g, '""')}"`;
        
        sections.push(`Operational BI Report - ${new Date().toLocaleString()}`);
        sections.push(`Time Range,${timeRange === 'day' ? 'Today' : timeRange === 'all' ? 'All Time' : `This ${timeRange}`}`);

        sections.push('\nKey Performance Indicators');
        sections.push('KPI,Value');
        sections.push(`Total Spend (${displayCurrency}),${kpiData.totalSpend}`);
        sections.push('Requisitions Created,' + kpiData.requisitionsCreated);
        sections.push('Purchase Orders Created,' + kpiData.posCreated);
        sections.push('Invoices Processed,' + kpiData.invoicesProcessed);

        if (approvalStatusData.length > 0) {
            sections.push('\nApproval Status');
            sections.push('Document Type,Approved,Rejected');
            approvalStatusData.forEach(d => sections.push(`${escapeCsvCell(d.name)},${d.Approved},${d.Rejected}`));
        }
        
        if (avgApprovalTimeData.some(d => d.value > 0)) {
            sections.push('\nAverage Approval Time');
            sections.push('Document Type,Average Time (Days)');
            avgApprovalTimeData.forEach(d => sections.push(`${escapeCsvCell(d.name)},${d.value}`));
        }

        if (onTimeDeliveryData.chartData.length > 0) {
            sections.push('\nOn-Time Delivery Performance');
            sections.push('Status,Deliveries');
            onTimeDeliveryData.chartData.forEach(d => sections.push(`${escapeCsvCell(d.name)},${d.value}`));
        }
        
        createCsvDownloader(`operational_bi_report_${new Date().toISOString().split('T')[0]}.csv`, sections.join('\n'));
        setIsExporting(null);
    };
    
    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">BI Dashboard</h1>
                    <p className="text-muted-foreground">Operational overview of day-to-day activities.</p>
                </div>
                <div className="flex flex-col items-end gap-3">
                    <div className="flex items-center space-x-1 bg-muted p-1 rounded-lg">
                        {(['all', 'day', 'week', 'month', 'year'] as (TimeRange | 'all')[]).map(range => (
                            <Button key={range} variant={timeRange === range ? 'default' : 'ghost'} size="sm" onClick={() => setTimeRange(range)} className="capitalize w-20">
                                {range === 'day' ? 'Today' : range === 'all' ? 'All Time' : `This ${range}`}
                            </Button>
                        ))}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <CurrencySwitcher displayCurrency={displayCurrency} setDisplayCurrency={setDisplayCurrency} rates={rates} />
                        <span>{formatLastRefreshed(lastRefreshed)}</span>
                        <div className="flex items-center gap-2">
                           <label htmlFor="auto-refresh-toggle-bi" className="text-sm font-medium">Auto-refresh</label>
                           <div onClick={() => setIsAutoRefreshEnabled(!isAutoRefreshEnabled)} className={`relative inline-flex items-center h-6 rounded-full w-11 cursor-pointer transition-colors ${isAutoRefreshEnabled ? 'bg-primary' : 'bg-input'}`}>
                                <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${isAutoRefreshEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                           </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={handleManualRefresh} className="h-8">
                             <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 16 16"><path fillRule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/><path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/></svg>
                            Refresh {isAutoRefreshEnabled ? `(${countdown}s)` : ''}
                        </Button>
                        <div className="relative inline-block text-left" ref={exportMenuRef}>
                            <Button variant="outline" size="sm" onClick={() => setIsExportMenuOpen(prev => !prev)} disabled={isExporting !== null} className="h-8">
                                {isExporting ? `Exporting ${isExporting.toUpperCase()}...` : 'Export'}
                                <svg className="-mr-1 ml-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard title="Total Spend" value={formatCurrencyKPI(kpiData.totalSpend)} description={`Value of approved POs in this period (${displayCurrency}).`} />
                <KPICard title="Requisitions Created" value={kpiData.requisitionsCreated} description="New purchase requisitions." />
                <KPICard title="Purchase Orders Created" value={kpiData.posCreated} description="New purchase orders sent to vendors." />
                <KPICard title="Invoices Processed" value={kpiData.invoicesProcessed} description="New invoices received from vendors." />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <ChartContainer title="Approval Status" description="Breakdown of approved vs. rejected documents by type.">
                     {
                        approvalStatusData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={approvalStatusData}>
                                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                                    <Tooltip cursor={{ fill: 'hsl(var(--accent))' }} content={<CustomTooltipContent formatter={(value: number) => `${value} doc(s)`} />} />
                                    <Legend />
                                    <Bar dataKey="Approved" fill="hsl(270 70% 50%)" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="Rejected" fill="hsl(180 70% 50%)" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : <div className="flex items-center justify-center h-full"><p className="text-muted-foreground">No approval data for this period.</p></div>
                    }
                </ChartContainer>

                <ChartContainer title="Average Approval Time" description="Average time taken to approve documents.">
                    {
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={avgApprovalTimeData}>
                                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip cursor={{ fill: 'hsl(var(--accent))' }} content={<CustomTooltipContent formatter={(value: number) => `${value} days`} />} />
                                <Bar dataKey="value" name="Avg Time (Days)" fill="purple" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    }
                </ChartContainer>
                
                <ChartContainer title="On-Time Delivery Performance" description="Supplier delivery performance for this period.">
                    {
                        onTimeDeliveryData.chartData.length > 0 ? (
                            <div className="w-full h-full relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Tooltip content={<CustomTooltipContent formatter={(value: number) => `${value} deliveries`} />} />
                                        <Pie data={onTimeDeliveryData.chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={80} outerRadius={120} paddingAngle={2}>
                                             {onTimeDeliveryData.chartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.name === 'On-Time' ? 'hsl(120, 70%, 50%)' : 'hsl(0, 70%, 50%)'} />
                                            ))}
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="text-center">
                                        <p className="text-3xl font-bold">{onTimeDeliveryData.rate.toFixed(1)}%</p>
                                        <p className="text-sm text-muted-foreground">On-Time</p>
                                    </div>
                                </div>
                            </div>
                        ) : <div className="flex items-center justify-center h-full"><p className="text-muted-foreground">No delivery data for this period.</p></div>
                    }
                </ChartContainer>
            </div>
        </div>
    );
};

export default OperationalBIDashboard;