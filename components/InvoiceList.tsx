import React from 'react';
import type { Invoice, Currency } from '../types';
import { StatusBadge } from './common/Badge';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from './common/Card';
import { InvoiceStatus } from '../types';
import Pagination from './common/Pagination';
import { convertCurrency } from '../services/currencyService';

interface InvoiceListProps {
  invoices: (Invoice & { vendorName: string; poNumber: string })[];
  selectedInvoiceId: string | null;
  onSelectInvoice: (id: string | null) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  displayCurrency: Currency;
  rates: Record<string, number> | null;
}

const InvoiceList: React.FC<InvoiceListProps> = ({ invoices, selectedInvoiceId, onSelectInvoice, currentPage, totalPages, onPageChange, displayCurrency, rates }) => {
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  const formatCurrency = (amount: number, currency: string) => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);

  const getDueDateStatus = (invoice: Invoice): { status: 'none' | 'dueSoon' | 'overdue'; days: number | null } => {
    if (invoice.status === InvoiceStatus.Paid || invoice.status === InvoiceStatus.Rejected) {
      return { status: 'none', days: null };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize today's date
    const dueDate = new Date(invoice.dueDate);
    dueDate.setHours(0, 0, 0, 0); // Normalize due date

    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { status: 'overdue', days: diffDays };
    }
    if (diffDays <= 7) {
      return { status: 'dueSoon', days: diffDays };
    }
    return { status: 'none', days: diffDays };
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="p-4 border-b">
        <CardTitle className="text-lg">All Invoices</CardTitle>
      </CardHeader>
      <CardContent className="p-0 flex-grow overflow-y-auto">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-card-foreground">
            <thead className="bg-muted/50 sticky top-0">
              <tr>
                <th className="p-4 font-medium">Invoice #</th>
                <th className="p-4 font-medium">Vendor</th>
                <th className="p-4 font-medium">Due Date</th>
                <th className="p-4 font-medium text-right">Amount</th>
                <th className="p-4 font-medium text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length > 0 ? (
                invoices.map(inv => {
                  const { status: dueDateStatus, days: daysDiff } = getDueDateStatus(inv);
                  let rowClass = `border-b cursor-pointer transition-colors`;
                  let title = '';

                  if (selectedInvoiceId === inv._id) {
                      rowClass += ' bg-primary/10';
                  } else if (dueDateStatus === 'overdue') {
                      rowClass += ' bg-destructive/10 hover:bg-destructive/20';
                      title = `Overdue by ${Math.abs(daysDiff!)} days`;
                  } else if (dueDateStatus === 'dueSoon') {
                      rowClass += ' bg-yellow-400/10 hover:bg-yellow-400/20';
                       if (daysDiff === 0) {
                           title = 'Due today';
                       } else if (daysDiff === 1) {
                           title = 'Due in 1 day';
                       } else {
                           title = `Due in ${daysDiff} days`;
                       }
                  } else {
                      rowClass += ' hover:bg-accent';
                  }

                  return (
                    <tr
                      key={inv._id}
                      className={rowClass}
                      onClick={() => onSelectInvoice(inv._id)}
                      title={title}
                    >
                      <td className="p-4 font-mono font-medium text-primary whitespace-nowrap">{inv.invoiceNumber}</td>
                      <td className="p-4 whitespace-nowrap">{inv.vendorName}</td>
                      <td className="p-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                           {dueDateStatus === 'overdue' && <div className="w-2 h-2 flex-shrink-0 rounded-full bg-destructive" title="Overdue"></div>}
                           {dueDateStatus === 'dueSoon' && <div className="w-2 h-2 flex-shrink-0 rounded-full bg-yellow-500" title="Due Soon"></div>}
                           <span>{formatDate(inv.dueDate)}</span>
                        </div>
                      </td>
                      <td className="p-4 text-right whitespace-nowrap">
                        <div>{formatCurrency(inv.amount, inv.currency)}</div>
                        {inv.currency !== displayCurrency && rates && (
                            <div className="text-xs text-muted-foreground">
                                ~ {formatCurrency(convertCurrency(inv.amount, inv.currency, displayCurrency, rates), displayCurrency)}
                            </div>
                        )}
                      </td>
                      <td className="p-4 text-center whitespace-nowrap"><StatusBadge status={inv.status} /></td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-muted-foreground">
                    No invoices found for the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
      {totalPages > 1 && (
        <CardFooter className="p-2 border-t justify-center">
            <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={onPageChange}
            />
        </CardFooter>
      )}
    </Card>
  );
};

export default InvoiceList;
