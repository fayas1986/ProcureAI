import React from 'react';
import { POStatus, VendorStatus, RequisitionStatus, GoodsReceiptStatus, InvoiceStatus, PaymentStatus, RFQStatus, RFQVendorResponseStatus } from '../../types';

interface StatusBadgeProps {
  status: POStatus | VendorStatus | RequisitionStatus | GoodsReceiptStatus | InvoiceStatus | PaymentStatus | RFQStatus | RFQVendorResponseStatus;
  large?: boolean;
}

const poStatusColors: Record<POStatus, string> = {
  [POStatus.Draft]: 'bg-gray-200 text-gray-800 border-transparent',
  [POStatus.PendingL1Approval]: 'bg-yellow-100 text-yellow-800 border-transparent',
  [POStatus.PendingL2Approval]: 'bg-yellow-100 text-yellow-800 border-transparent',
  [POStatus.Approved]: 'bg-green-100 text-green-800 border-transparent',
  [POStatus.Rejected]: 'bg-red-100 text-red-800 border-transparent',
  [POStatus.Invoiced]: 'bg-blue-100 text-blue-800 border-transparent',
  [POStatus.Closed]: 'bg-purple-100 text-purple-800 border-transparent',
};

const vendorStatusColors: Record<VendorStatus, string> = {
  [VendorStatus.Active]: 'bg-green-100 text-green-800 border-transparent',
  [VendorStatus.Inactive]: 'bg-gray-200 text-gray-800 border-transparent',
  [VendorStatus.Blacklisted]: 'bg-red-200 text-red-900 border-red-300',
};

const requisitionStatusColors: Record<RequisitionStatus, string> = {
  [RequisitionStatus.Draft]: 'bg-gray-200 text-gray-800 border-transparent',
  [RequisitionStatus.Pending]: 'bg-yellow-100 text-yellow-800 border-transparent',
  [RequisitionStatus.Approved]: 'bg-sky-100 text-sky-800 border-transparent',
  [RequisitionStatus.RFQ]: 'bg-orange-100 text-orange-800 border-transparent',
  [RequisitionStatus.Rejected]: 'bg-red-100 text-red-800 border-transparent',
  [RequisitionStatus.Closed]: 'bg-green-100 text-green-800 border-transparent',
};

const goodsReceiptStatusColors: Record<GoodsReceiptStatus, string> = {
  [GoodsReceiptStatus.Pending]: 'bg-gray-200 text-gray-800 border-transparent',
  [GoodsReceiptStatus.Accepted]: 'bg-green-100 text-green-800 border-transparent',
  [GoodsReceiptStatus.Rejected]: 'bg-red-100 text-red-800 border-transparent',
  [GoodsReceiptStatus.Partial]: 'bg-yellow-100 text-yellow-800 border-transparent',
};

const invoiceStatusColors: Record<InvoiceStatus, string> = {
    [InvoiceStatus.Pending]: 'bg-yellow-100 text-yellow-800 border-transparent',
    [InvoiceStatus.Approved]: 'bg-sky-100 text-sky-800 border-transparent',
    [InvoiceStatus.Paid]: 'bg-green-100 text-green-800 border-transparent',
    [InvoiceStatus.Rejected]: 'bg-red-100 text-red-800 border-transparent',
};

const paymentStatusColors: Record<PaymentStatus, string> = {
    [PaymentStatus.Initiated]: 'bg-blue-100 text-blue-800 border-transparent',
    [PaymentStatus.Completed]: 'bg-green-100 text-green-800 border-transparent',
    [PaymentStatus.Failed]: 'bg-red-100 text-red-800 border-transparent',
};

const rfqStatusColors: Record<RFQStatus, string> = {
    [RFQStatus.Open]: 'bg-blue-100 text-blue-800 border-transparent',
    [RFQStatus.Closed]: 'bg-gray-200 text-gray-800 border-transparent',
    [RFQStatus.Awarded]: 'bg-green-100 text-green-800 border-transparent',
};

const rfqVendorStatusColors: Record<RFQVendorResponseStatus, string> = {
    [RFQVendorResponseStatus.Pending]: 'bg-yellow-100 text-yellow-800 border-transparent',
    [RFQVendorResponseStatus.Submitted]: 'bg-green-100 text-green-800 border-transparent',
    [RFQVendorResponseStatus.Declined]: 'bg-red-100 text-red-800 border-transparent',
};

const statusColors = {
    ...poStatusColors, 
    ...vendorStatusColors, 
    ...requisitionStatusColors, 
    ...goodsReceiptStatusColors,
    ...invoiceStatusColors,
    ...paymentStatusColors,
    ...rfqStatusColors,
    ...rfqVendorStatusColors,
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, large = false }) => {
  const baseClasses = 'inline-flex items-center rounded-full border font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2';
  const colorClasses = statusColors[status as keyof typeof statusColors] || 'bg-secondary text-secondary-foreground border-transparent';
  const sizeClasses = large ? 'px-3 py-1 text-sm' : 'px-2.5 py-0.5 text-xs';

  return (
    <span className={`${baseClasses} ${sizeClasses} ${colorClasses}`}>
      {status}
    </span>
  );
};