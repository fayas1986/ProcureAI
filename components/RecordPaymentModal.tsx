import React, { useState, useEffect } from 'react';
import type { Invoice, Payment } from '../types';
import { PaymentMethod, PaymentStatus } from '../types';
import { Button } from './common/Button';
import { Input } from './common/Input';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payment: Payment) => void;
  invoice: Invoice;
}

const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({ isOpen, onClose, onSave, invoice }) => {
  const [paymentDate, setPaymentDate] = useState('');
  const [amountPaid, setAmountPaid] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.BankTransfer);
  const [transactionId, setTransactionId] = useState('');
  const [error, setError] = useState('');
  
  const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amountPaid, 0);
  const amountDue = invoice.amount - totalPaid;

  useEffect(() => {
    if (isOpen) {
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setAmountPaid(amountDue);
      setPaymentMethod(PaymentMethod.BankTransfer);
      setTransactionId('');
      setError('');
    }
  }, [isOpen, amountDue]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amountPaid <= 0) {
      setError('Payment amount must be greater than zero.');
      return;
    }
    if (amountPaid > amountDue) {
      setError(`Payment amount cannot exceed the amount due (${amountDue.toFixed(2)}).`);
      return;
    }

    const newPayment: Payment = {
        _id: `PAY${Date.now()}`,
        paymentDate: new Date(paymentDate).toISOString(),
        amountPaid: Number(amountPaid),
        paymentMethod,
        status: PaymentStatus.Completed,
        transactionId,
    };
    
    onSave(newPayment);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-lg rounded-lg border bg-card text-card-foreground shadow-sm m-4" onClick={e => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col space-y-1.5 p-6 border-b">
            <h3 className="text-2xl font-semibold leading-none tracking-tight">Record Payment</h3>
            <p className="text-sm text-muted-foreground">For Invoice: <span className="font-semibold text-primary">{invoice.invoiceNumber}</span></p>
          </div>
          <div className="p-6 space-y-4">
            <div className="p-3 bg-muted/50 rounded-md text-center">
                <p className="text-sm text-muted-foreground">Amount Due</p>
                <p className="text-2xl font-bold">{new Intl.NumberFormat('en-US', { style: 'currency', currency: invoice.currency }).format(amountDue)}</p>
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="text-sm font-medium mb-1 block">Payment Date</label>
                    <Input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} required />
                </div>
                <div>
                    <label className="text-sm font-medium mb-1 block">Amount Paid</label>
                    <Input type="number" step="0.01" value={amountPaid} onChange={e => setAmountPaid(Number(e.target.value))} required />
                </div>
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                    <label className="text-sm font-medium mb-1 block">Payment Method</label>
                    <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as PaymentMethod)} required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                        {Object.values(PaymentMethod).map(method => <option key={method} value={method}>{method}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-sm font-medium mb-1 block">Transaction ID (Optional)</label>
                    <Input value={transactionId} onChange={e => setTransactionId(e.target.value)} />
                </div>
            </div>
            {error && <p className="text-sm text-destructive text-center">{error}</p>}
          </div>
          <div className="flex items-center justify-end p-6 border-t space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">Save Payment</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RecordPaymentModal;