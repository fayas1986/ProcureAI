import React, { useMemo, useState, useEffect } from 'react';
import type { PurchaseOrder, Vendor, Currency, Material } from '../types';
import { POStatus } from '../types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './common/Card';
import { convertCurrency } from '../services/currencyService';
import CurrencySwitcher from './common/CurrencySwitcher';
import { Button } from './common/Button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, Line, ComposedChart, ReferenceArea, AreaChart, Area } from 'recharts';

declare global {
  interface Window {
    Recharts?: any;
  }
}

interface SpendAnalyticsDashboardProps {
    purchaseOrders: PurchaseOrder[];
    materials: Material[];
    vendors: Vendor[];
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

const ChartContainer: React.FC<{ title: string; description: string; children: React.ReactNode; }> = ({ title, description, children }) => (
    <Card>
        <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="h-[300px] w-full">
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

const SpendAnalyticsDashboard: React.FC<SpendAnalyticsDashboardProps> = ({ purchaseOrders, materials, vendors, displayCurrency, setDisplayCurrency, rates, onRefreshData, lastRefreshed }) => {
    const { Recharts } = window;
    const [isAutoRefreshEnabled, setIsAutoRefreshEnabled] = useState(true);
    const [countdown, setCountdown] = useState(60);
    const [timeRange, setTimeRange] = useState<TimeRange>('all');

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

    const filteredPOs = useMemo(() => {
        const relevantPOs = purchaseOrders.filter(po => [POStatus.Approved, POStatus.Closed, POStatus.Invoiced].includes(po.status));
        
        if (timeRange === 'all') {
            return relevantPOs;
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

        return relevantPOs.filter(po => {
            const poDate = new Date(po.orderDate);
            return poDate >= start && poDate <= end;
        });
    }, [timeRange, purchaseOrders, lastRefreshed]);

    const spendByVendor = useMemo(() => {
        const vendorSpend: { [key: string]: number } = {};
        filteredPOs.forEach(po => {
            const vendorName = vendors.find(v => v._id === po.vendorId)?.name || 'Unknown Vendor';
            const amountInDisplayCurrency = convertCurrency(po.totalAmount, po.currency, displayCurrency, rates);
            vendorSpend[vendorName] = (vendorSpend[vendorName] || 0) + amountInDisplayCurrency;
        });
        const data = Object.entries(vendorSpend).map(([name, value]) => ({ name, value: Math.round(value) })).sort((a,b) => b.value - a.value);
        console.log("Spend by Vendor Data:", data); // Add this line
        return data;
    }, [filteredPOs, vendors, displayCurrency, rates, lastRefreshed]);

    const spendByCategory = useMemo(() => {
        const categorySpend: { [key: string]: number } = {};
        filteredPOs.forEach(po => {
            po.lines.forEach(line => {
                const material = materials.find(m => m._id === line.materialId);
                if (material) {
                    const category = material.category || 'Uncategorized';
                    const amountInDisplayCurrency = convertCurrency(line.totalPrice, po.currency, displayCurrency, rates);
                    categorySpend[category] = (categorySpend[category] || 0) + amountInDisplayCurrency;
                }
            });
        });
        return Object.entries(categorySpend).map(([name, value]) => ({ name, value: Math.round(value) })).sort((a,b) => b.value - a.value);
    }, [filteredPOs, materials, displayCurrency, rates, lastRefreshed]);

    const { spendByMonth, years: monthlyYears } = useMemo(() => {
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthlyData: { [month: string]: { [year: string]: number } } = {};
        const yearSet = new Set<string>();

        filteredPOs.forEach(po => {
            const orderDate = new Date(po.orderDate);
            const monthName = monthNames[orderDate.getMonth()];
            const year = String(orderDate.getFullYear());
            yearSet.add(year);

            if (!monthlyData[monthName]) {
                monthlyData[monthName] = {};
            }

            const amountInDisplayCurrency = convertCurrency(po.totalAmount, po.currency, displayCurrency, rates);
            monthlyData[monthName][year] = (monthlyData[monthName][year] || 0) + amountInDisplayCurrency;
        });

        const sortedYears = Array.from(yearSet).sort();

        const chartData = monthNames.map(monthName => {
            const monthEntry: { month: string, [year: string]: number | string } = { month: monthName };
            sortedYears.forEach(year => {
                monthEntry[year] = Math.round(monthlyData[monthName]?.[year] || 0);
            });
            return monthEntry;
        });

        const finalChartData = chartData.filter(d => sortedYears.some(y => (d[y] as number) > 0));
        return { spendByMonth: finalChartData, years: sortedYears };
    }, [filteredPOs, displayCurrency, rates, lastRefreshed]);

    const { spendByQuarter, years: quarterlyYears } = useMemo(() => {
        const getQuarter = (month: number) => `Q${Math.ceil(month / 3)}`;
        const quarterNames = ["Q1", "Q2", "Q3", "Q4"];
        const quarterlyData: { [quarter: string]: { [year: string]: number } } = {};
        const yearSet = new Set<string>();

        filteredPOs.forEach(po => {
            const orderDate = new Date(po.orderDate);
            const quarterName = getQuarter(orderDate.getMonth() + 1);
            const year = String(orderDate.getFullYear());
            yearSet.add(year);
            if (!quarterlyData[quarterName]) {
                quarterlyData[quarterName] = {};
            }
            const amountInDisplayCurrency = convertCurrency(po.totalAmount, po.currency, displayCurrency, rates);
            quarterlyData[quarterName][year] = (quarterlyData[quarterName][year] || 0) + amountInDisplayCurrency;
        });
        
        const sortedYears = Array.from(yearSet).sort();
        const chartData = quarterNames.map(quarterName => {
            const quarterEntry: { quarter: string, [year: string]: number | string } = { quarter: quarterName };
            sortedYears.forEach(year => {
                quarterEntry[year] = Math.round(quarterlyData[quarterName]?.[year] || 0);
            });
            return quarterEntry;
        });

        const finalChartData = chartData.filter(d => sortedYears.some(y => (d[y] as number) > 0));
        
        const transformedChartData: { quarter: string; year: string; value: number; }[] = [];
        chartData.forEach(quarterEntry => {
            sortedYears.forEach(year => {
                if (quarterEntry[year]) {
                    transformedChartData.push({
                        quarter: quarterEntry.quarter,
                        year: year,
                        value: quarterEntry[year] as number,
                    });
                }
            });
        });

        return { spendByQuarter: transformedChartData, years: sortedYears };
    }, [filteredPOs, displayCurrency, rates, lastRefreshed]);

    const predictiveQuarterlySpendData = useMemo(() => {
        if (!purchaseOrders || !rates) return { combinedData: [], forecastStartName: null, lastForecastName: null };
    
        const getQuarter = (month: number) => Math.ceil(month / 3);
        const historicalData: { [key: string]: number } = {}; // key: "YYYY-Q"
        let lastYear = 0;
        let lastQuarter = 0;
        
        const relevantPOs = purchaseOrders.filter(po => [POStatus.Approved, POStatus.Closed, POStatus.Invoiced].includes(po.status));

        relevantPOs.forEach(po => {
            const orderDate = new Date(po.orderDate);
            const year = orderDate.getFullYear();
            const quarter = getQuarter(orderDate.getMonth() + 1);
            const key = `${year}-${quarter}`;
            const amount = convertCurrency(po.totalAmount, po.currency, displayCurrency, rates);
            historicalData[key] = (historicalData[key] || 0) + amount;
            if (year > lastYear) { lastYear = year; lastQuarter = quarter; }
            else if (year === lastYear && quarter > lastQuarter) { lastQuarter = quarter; }
        });
    
        const quarterlyAverages: { [q: number]: { total: number; count: number } } = { 1: {total:0, count:0}, 2: {total:0, count:0}, 3: {total:0, count:0}, 4: {total:0, count:0} };
        Object.entries(historicalData).forEach(([key, total]) => {
            const quarter = parseInt(key.split('-')[1], 10);
            quarterlyAverages[quarter].total += total;
            quarterlyAverages[quarter].count += 1;
        });
    
        const averageSpendByQuarter: { [q: number]: number } = {};
        for (let i = 1; i <= 4; i++) {
            averageSpendByQuarter[i] = quarterlyAverages[i].count > 0 ? quarterlyAverages[i].total / quarterlyAverages[i].count : 0;
        }
    
        const historicalChartData = Object.entries(historicalData).sort(([keyA], [keyB]) => keyA.localeCompare(keyB)).map(([key, total]) => ({ name: `Q${key.split('-')[1]} '${key.split('-')[0].slice(2)}`, Actual: Math.round(total) }));
    
        const forecastChartData = [];
        let currentYear = lastYear;
        let currentQuarter = lastQuarter;
        for (let i = 0; i < 12; i++) {
            currentQuarter += 1;
            if (currentQuarter > 4) { currentQuarter = 1; currentYear += 1; }
            forecastChartData.push({ name: `Q${currentQuarter} '${String(currentYear).slice(2)}`, Forecast: Math.round(averageSpendByQuarter[currentQuarter]) });
        }
    
        const lastActualDataPoint = historicalChartData[historicalChartData.length - 1];
        if (lastActualDataPoint) forecastChartData.unshift({ name: lastActualDataPoint.name, Forecast: lastActualDataPoint.Actual });
    
        const mergedDataMap = new Map<string, any>();
        [...historicalChartData, ...forecastChartData].forEach(item => mergedDataMap.set(item.name, { ...mergedDataMap.get(item.name), ...item }));
        
        const finalData = Array.from(mergedDataMap.values()).sort((a,b) => { const [qA, yA] = a.name.split(' '); const [qB, yB] = b.name.split(' '); if (yA !== yB) return yA.localeCompare(yB); return qA.localeCompare(qB); });
        
        const forecastStartIndex = finalData.findIndex(d => d.Forecast && !d.Actual);
        return { combinedData: finalData, forecastStartName: finalData[forecastStartIndex]?.name, lastForecastName: finalData[finalData.length - 1]?.name };
    }, [purchaseOrders, displayCurrency, rates, lastRefreshed]);
    
    const formatCurrencyTooltip = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: displayCurrency }).format(value);
    const currencySymbol = useMemo(() => new Intl.NumberFormat('en-US', { style: 'currency', currency: displayCurrency }).formatToParts(1).find(part => part.type === 'currency')?.value || '$', [displayCurrency]);
    const COLORS = ['#4285F4', '#34A853', '#FBBC05', '#EA4335', '#DA0C81', '#64CCC5', '#176B87', '#001C30', '#65B741', '#FFC7ED', '#C683D7', '#9B30FF', '#FF5733', '#33FF57', '#5733FF', '#33B5FF', '#FF33B5', '#B5FF33', '#33FF8D', '#FFB533', '#8D33FF', '#338DFF', '#FF338D', '#8DFF33', '#33FF8D', '#FF8D33', '#A833FF', '#33A8FF'];
    const VENDOR_COLORS = [
        "#FF5733", "#33FF57", "#3357FF", "#FF33A1", "#33FFF6", "#FF8C33", "#A133FF", "#33A1FF",
        "#FF3333", "#33FF33", "#3333FF", "#FF33F6", "#33FF8C", "#FF338C", "#8CFF33", "#8C33FF"
    ];

const QUARTERLY_COLORS = [
    "#4285F4", "#34A853", "#FBBC05", "#EA4335", "#DA0C81", "#64CCC5", "#176B87", "#001C30"
];
    const formatLastRefreshed = (date: Date) => `Last updated: ${date.toLocaleTimeString()}`;

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
                <h1 className="text-2xl font-bold tracking-tight">Spend Analytics</h1>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <CurrencySwitcher displayCurrency={displayCurrency} setDisplayCurrency={setDisplayCurrency} rates={rates} />
                    <span>{formatLastRefreshed(lastRefreshed)}</span>
                    <div className="flex items-center gap-2">
                       <label htmlFor="auto-refresh-toggle-spend" className="text-sm font-medium">Auto-refresh</label>
                       <div onClick={() => setIsAutoRefreshEnabled(!isAutoRefreshEnabled)} className={`relative inline-flex items-center h-6 rounded-full w-11 cursor-pointer transition-colors ${isAutoRefreshEnabled ? 'bg-primary' : 'bg-input'}`}>
                            <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${isAutoRefreshEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                       </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleManualRefresh} className="h-8">
                         <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 16 16"><path fillRule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/><path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/></svg>
                        Refresh {isAutoRefreshEnabled ? `(${countdown}s)` : ''}
                    </Button>
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
                 <ChartContainer title="Spend by Vendor" description={`Total spend for each vendor in ${displayCurrency}.`}>
                            <ResponsiveContainer width="100%" height="100%">
                                {console.log("COLORS array:", COLORS)}
                                {console.log("Spend by Vendor Data:", spendByVendor)}
                                <BarChart data={spendByVendor} layout="vertical">
                                <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value: number) => `${currencySymbol}${value / 1000}k`} />
                                <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} width={120} />
                                <Tooltip cursor={{ fill: 'hsl(var(--accent))' }} content={<CustomTooltipContent formatter={formatCurrencyTooltip} />} />
                                <Bar dataKey="value" name="Total Spend" radius={[0, 4, 4, 0]}>
                                    {spendByVendor.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={VENDOR_COLORS[index % VENDOR_COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                </ChartContainer>

                <ChartContainer title="Spend by Category" description="Total spend for each procurement category.">
                        <div className="w-full h-full relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Tooltip content={<CustomTooltipContent formatter={formatCurrencyTooltip} />} />
                                    <Pie data={spendByCategory} cx="50%" cy="50%" labelLine={false} innerRadius={80} outerRadius={120} fill="hsl(var(--primary))" dataKey="value" nameKey="name">
                                        {spendByCategory.map((_, index) => (
                                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                </ChartContainer>
            
                 <ChartContainer title="Monthly Spend Comparison by Year" description={`Comparing total spend per month across different years (in ${displayCurrency}).`}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={spendByMonth}>
                                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value: number) => `${currencySymbol}${value / 1000}k`} />
                                    <Tooltip cursor={{ fill: 'hsl(var(--accent))' }} content={<CustomTooltipContent formatter={formatCurrencyTooltip} />} />
                                    <Legend />
                                    {monthlyYears.map((year, index) => (
                                        <Area key={year} type="monotone" dataKey={year} name={year} stroke={COLORS[index % COLORS.length]} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </AreaChart>
                            </ResponsiveContainer>
                </ChartContainer>
            
                <ChartContainer title="Quarterly Spend Comparison by Year" description={`Comparing total spend per quarter across different years (in ${displayCurrency}).`}>
                            <ResponsiveContainer width="100%" height="100%">
                                {console.log("QUARTERLY_COLORS array:", QUARTERLY_COLORS)}
                                {console.log("Quarterly Years Data:", quarterlyYears)}
                                <BarChart data={spendByQuarter}>
                                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                                    <XAxis dataKey="quarter" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value: number) => `${currencySymbol}${value / 1000}k`} />
                                    <Tooltip cursor={{ fill: 'hsl(var(--accent))' }} content={<CustomTooltipContent formatter={formatCurrencyTooltip} />} />
                                    <Legend />
                                    <Bar dataKey="value" name="Spend" radius={[4, 4, 0, 0]}>
                                        {spendByQuarter.map((entry, index) => (
                                            <Cell key={`cell-${entry.quarter}-${entry.year}`} fill={QUARTERLY_COLORS[index % QUARTERLY_COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                </ChartContainer>

                <div className="lg:col-span-2">
                    <ChartContainer title="Predictive Spend Analysis (Quarterly)" description="Forecasted spend for the next 3 years based on historical quarterly averages.">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={predictiveQuarterlySpendData.combinedData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value: number) => `${currencySymbol}${Math.round(value / 1000)}k`} />
                                    <Tooltip content={<CustomTooltipContent formatter={formatCurrencyTooltip} />} />
                                    <Legend />
                                    {predictiveQuarterlySpendData.forecastStartName && (
                                        <ReferenceArea x1={predictiveQuarterlySpendData.forecastStartName} x2={predictiveQuarterlySpendData.lastForecastName} stroke="none" fill="hsl(var(--accent))" fillOpacity={0.2} label={{ value: 'Forecast', position: 'insideTopLeft', fill: 'hsl(var(--muted-foreground))' }} />
                                    )}
                                    <Bar dataKey="Actual" fill="#34A853" />
                                    <Line type="monotone" dataKey="Forecast" name="Forecast" stroke="#FBBC05" strokeDasharray="5 5" strokeWidth={2} dot={{ r: 3 }} connectNulls={false} />
                                </ComposedChart>
                            </ResponsiveContainer>
                    </ChartContainer>
                </div>
            </div>
        </div>
    );
};

export default SpendAnalyticsDashboard;