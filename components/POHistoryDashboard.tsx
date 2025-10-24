import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { AuditLog, User } from '../types';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from './common/Card';
import { Input } from './common/Input';
import useDebounce from '../hooks/useDebounce';
import Pagination from './common/Pagination';
import type { EntityShortType } from '../App';
import { Button } from './common/Button';

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


interface AuditTrailDashboardProps {
  auditLogs: AuditLog[];
  users: User[];
  onViewEntity: (type: EntityShortType, entityNumber: string) => void;
}

const ITEMS_PER_PAGE = 15;
type TimeRange = 'all' | 'hour' | 'day' | 'week' | 'month' | 'year';
type SortableKey = 'timestamp' | 'userName' | 'action' | 'entityType';

interface SortConfig {
    key: SortableKey;
    direction: 'ascending' | 'descending';
}

const getSortIcon = (key: SortableKey, sortConfig: SortConfig) => {
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
    sortConfig: SortConfig;
    requestSort: (key: SortableKey) => void;
}

const SortableHeader: React.FC<SortableHeaderProps> = ({ sortKey, title, sortConfig, requestSort }) => (
    <th className="p-3 font-medium whitespace-nowrap">
        <button type="button" onClick={() => requestSort(sortKey)} className="flex items-center gap-1 hover:text-foreground transition-colors">
            {title}
            {getSortIcon(sortKey, sortConfig)}
        </button>
    </th>
);

const AuditTrailDashboard: React.FC<AuditTrailDashboardProps> = ({ auditLogs, users, onViewEntity }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [currentPage, setCurrentPage] = useState(1);
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'timestamp', direction: 'descending' });
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
  }, []);

  const enrichedLogs = useMemo(() => {
    return auditLogs.map(log => {
        const user = users.find(u => u._id === log.userId);
        return { ...log, userName: user?.name || log.userId };
    });
  }, [auditLogs, users]);

  const filteredLogs = useMemo(() => {
    const now = new Date();
    let startTime: Date | null = null;
    switch (timeRange) {
        case 'hour': startTime = new Date(now.getTime() - 60 * 60 * 1000); break;
        case 'day': startTime = new Date(now.setHours(0, 0, 0, 0)); break;
        case 'week':
            const firstDay = new Date(now.setDate(now.getDate() - now.getDay()));
            startTime = new Date(firstDay.setHours(0, 0, 0, 0));
            break;
        case 'month': startTime = new Date(now.getFullYear(), now.getMonth(), 1); break;
        case 'year': startTime = new Date(now.getFullYear(), 0, 1); break;
    }

    const timeFiltered = startTime ? enrichedLogs.filter(log => new Date(log.timestamp) >= startTime!) : enrichedLogs;
    const lowercasedFilter = debouncedSearchTerm.toLowerCase();

    if (!lowercasedFilter) return timeFiltered;

    return timeFiltered.filter(log =>
        log.entityNumber?.toLowerCase().includes(lowercasedFilter) ||
        log.userName.toLowerCase().includes(lowercasedFilter) ||
        log.action.toLowerCase().includes(lowercasedFilter) ||
        log.details.toLowerCase().includes(lowercasedFilter) ||
        log.entityType.toLowerCase().includes(lowercasedFilter)
    );
  }, [enrichedLogs, debouncedSearchTerm, timeRange]);

  const sortedLogs = useMemo(() => {
    return [...filteredLogs].sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
    });
  }, [filteredLogs, sortConfig]);

  const totalPages = Math.ceil(sortedLogs.length / ITEMS_PER_PAGE);
  const paginatedLogs = useMemo(() => sortedLogs.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE), [sortedLogs, currentPage]);

  useEffect(() => setCurrentPage(1), [debouncedSearchTerm, timeRange]);
  useEffect(() => { if (currentPage > totalPages && totalPages > 0) setCurrentPage(totalPages) }, [currentPage, totalPages]);

  const requestSort = (key: SortableKey) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
        direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const entityTypeMap: Record<string, EntityShortType> = { 'Requisition': 'PR', 'Purchase Order': 'PO', 'RFQ': 'RFQ', 'Invoice': 'INV', 'Goods Receipt': 'GRN' };
  const formatDate = (dateString: string) => new Date(dateString).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
  
  const exportHeaders = ['Timestamp', 'User', 'Entity Type', 'Entity #', 'Action', 'Details'];
  const exportData = sortedLogs.map(log => [
      formatDate(log.timestamp),
      log.userName,
      log.entityType,
      log.entityNumber || '',
      log.action,
      log.details,
  ]);

  const handleExportPDF = async () => {
    setIsExporting('pdf');
    setIsExportMenuOpen(false);
    try {
        await waitForPdfLib();
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'landscape' });
        doc.text("Audit Trail Report", 14, 15);
        doc.autoTable({ head: [exportHeaders], body: exportData, startY: 20 });
        doc.save(`audit_trail_report_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch(e) {
        console.error("Failed to export PDF:", e);
        alert(e instanceof Error ? e.message : "An error occurred while exporting the PDF.");
    } finally {
        setIsExporting(null);
    }
  };

  const handleExportCSV = () => {
      setIsExporting('csv');
      setIsExportMenuOpen(false);
      try {
        const escapeCsvCell = (cell: any) => {
            const str = String(cell ?? '');
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        };
        const csvContent = [exportHeaders.join(','), ...exportData.map(row => row.map(escapeCsvCell).join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `audit_trail_report_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (e) {
          console.error("Failed to export CSV:", e);
          alert("An error occurred while exporting the CSV.");
      } finally {
        setIsExporting(null);
      }
  };


  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Audit Trail</CardTitle>
        <CardDescription>A detailed log of all significant actions within the application.</CardDescription>
        <div className="flex flex-col md:flex-row justify-between gap-4 pt-4">
          <div className="relative flex-grow">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            <Input type="text" placeholder="Search logs..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10" />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center space-x-1 bg-muted p-1 rounded-lg">
                {(['all', 'hour', 'day', 'week', 'month', 'year'] as TimeRange[]).map(range => (
                    <Button key={range} variant={timeRange === range ? 'default' : 'ghost'} size="sm" onClick={() => setTimeRange(range)} className="capitalize w-20">
                        {range}
                    </Button>
                ))}
            </div>
             <div className="relative inline-block text-left" ref={exportMenuRef}>
                <Button variant="outline" size="sm" onClick={() => setIsExportMenuOpen(prev => !prev)} disabled={isExporting !== null}>
                    {isExporting ? `Exporting ${isExporting.toUpperCase()}...` : 'Export'}
                    <svg className="-mr-1 ml-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                </Button>
                {isExportMenuOpen && (
                    <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-popover ring-1 ring-black ring-opacity-5 z-10">
                        <div className="py-1">
                            <button onClick={handleExportPDF} className="text-popover-foreground block w-full text-left px-4 py-2 text-sm hover:bg-accent disabled:opacity-50" disabled={isExporting !== null}>Export as PDF</button>
                            <button onClick={handleExportCSV} className="text-popover-foreground block w-full text-left px-4 py-2 text-sm hover:bg-accent disabled:opacity-50" disabled={isExporting !== null}>Export as CSV</button>
                        </div>
                    </div>
                )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-grow overflow-y-auto">
        <div className="border-t">
          <table className="w-full text-sm text-card-foreground">
            <thead className="bg-muted/50">
              <tr>
                <SortableHeader sortKey="timestamp" title="Timestamp" sortConfig={sortConfig} requestSort={requestSort} />
                <SortableHeader sortKey="userName" title="User" sortConfig={sortConfig} requestSort={requestSort} />
                <SortableHeader sortKey="entityType" title="Entity" sortConfig={sortConfig} requestSort={requestSort} />
                <SortableHeader sortKey="action" title="Action" sortConfig={sortConfig} requestSort={requestSort} />
                <th className="p-3 font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {paginatedLogs.length > 0 ? (
                paginatedLogs.map(log => {
                  const shortType = entityTypeMap[log.entityType];
                  const isLinkable = shortType && log.entityNumber;
                  return (
                    <tr key={log._id} className="border-t hover:bg-accent">
                      <td className="p-3 whitespace-nowrap">{formatDate(log.timestamp)}</td>
                      <td className="p-3 whitespace-nowrap">{log.userName}</td>
                      <td className="p-3 whitespace-nowrap">
                        <div className="flex flex-col">
                            <span>{log.entityType}</span>
                            {isLinkable ? (
                               <button onClick={() => onViewEntity(shortType, log.entityNumber!)} className="font-mono text-primary hover:underline text-left text-xs">
                                  {log.entityNumber}
                               </button>
                            ) : log.entityNumber && (
                                <span className="font-mono text-muted-foreground text-xs">{log.entityNumber}</span>
                            )}
                        </div>
                      </td>
                      <td className="p-3"><span className="font-mono text-xs bg-muted px-2 py-1 rounded">{log.action}</span></td>
                      <td className="p-3">{log.details}</td>
                    </tr>
                  );
                })
              ) : (
                 <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No history found.</td></tr>
              )}
            </tbody>
          </table>
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

export default AuditTrailDashboard;