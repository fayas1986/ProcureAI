import { POStatus, VendorStatus, RequisitionStatus, TaskStatus, TaskPriority, GoodsReceiptStatus, InvoiceStatus, PaymentMethod, PaymentStatus, RFQStatus, RFQVendorResponseStatus, ApprovalStepStatus } from '../types';
import type { User, Vendor, Material, PurchaseOrder, Requisition, AuditLog, GoodsReceipt, Invoice, Payment, RFQ, RFQVendor, Quotation, Role, SpendAnalytics, POTemplate, DocumentTemplate } from '../types';

// --- Date Helper ---
// Generates dates relative to the current time to make mock data feel "live".
const relativeDate = (days: number, hours: number = 0, minutes: number = 0): string => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    date.setHours(date.getHours() + hours);
    date.setMinutes(date.getMinutes() + minutes);
    return date.toISOString();
};


// ROLES & PERMISSIONS
export const mockRoles: Role[] = [
  { 
    _id: 'R001', 
    name: 'Requester', 
    permissions: [
      'VIEW_REQUISITIONS', 'CREATE_REQUISITION', 'VIEW_POS', 'VIEW_MATERIALS', 'VIEW_VENDORS', 'VIEW_GRNS'
    ] 
  },
  { 
    _id: 'R002', 
    name: 'Approver', 
    permissions: [
      'VIEW_REQUISITIONS', 'APPROVE_REQUISITION', 'VIEW_RFQS', 'CREATE_RFQ', 'AWARD_RFQ',
      'VIEW_POS', 'CREATE_PO', 'APPROVE_PO', 'VIEW_INVOICES', 'APPROVE_INVOICE', 'RECORD_PAYMENT',
      'VIEW_MATERIALS', 'VIEW_VENDORS', 'VIEW_GRNS', 'CREATE_GRN', 'VIEW_BI_DASHBOARD'
    ] 
  },
  { 
    _id: 'R003', 
    name: 'Admin', 
    permissions: [
      'VIEW_REQUISITIONS', 'CREATE_REQUISITION', 'APPROVE_REQUISITION',
      'VIEW_RFQS', 'CREATE_RFQ', 'AWARD_RFQ', 'SUBMIT_QUOTATION',
      'VIEW_POS', 'CREATE_PO', 'APPROVE_PO', 'MANAGE_PO_TEMPLATES',
      'VIEW_GRNS', 'CREATE_GRN',
      'VIEW_INVOICES', 'CREATE_INVOICE', 'APPROVE_INVOICE', 'RECORD_PAYMENT',
      'VIEW_MATERIALS', 'MANAGE_MATERIALS',
      'VIEW_VENDORS', 'MANAGE_VENDORS',
      'VIEW_ANALYTICS', 'VIEW_AUDIT_TRAIL',
      'MANAGE_USERS', 'MANAGE_ROLES',
      'VIEW_BI_DASHBOARD'
    ] 
  },
];

// USERS
export const mockUsers: User[] = [
  { _id: 'U001', name: 'Alice Smith', email: 'alice@procure.io', roleId: 'R001', passwordHash: 'password123', passwordResetRequired: false, passwordResetRequested: false, isOnline: false },
  { _id: 'U002', name: 'Bob Johnson', email: 'bob@procure.io', roleId: 'R002', passwordHash: 'password123', passwordResetRequired: true, passwordResetRequested: false, isOnline: false },
  { _id: 'U003', name: 'Charlie Brown', email: 'charlie@procure.io', roleId: 'R003', passwordHash: 'password123', passwordResetRequired: false, passwordResetRequested: false, isOnline: false },
  { _id: 'U004', name: 'Diana Prince', email: 'diana@procure.io', roleId: 'R001', passwordHash: 'password123', passwordResetRequired: false, passwordResetRequested: true, isOnline: false },
];
export const MOCK_CURRENT_USER_ID = 'U003'; // Charlie Brown is the current user (Admin)

// VENDORS
export const vendors: Vendor[] = [
  {
    _id: 'V001', name: 'Global Tech Components', supplierCode: 'GTC-1001',
    contacts: [{ name: 'Jane Doe', email: 'jane.d@gtc.com', phone: '123-456-7890' }],
    rating: 4.8, status: VendorStatus.Active, defaultCurrency: 'USD',
    address: '123 Tech Way, Silicon Valley, CA', taxId: 'GST12345', paymentTerms: 'Net 30 Days'
  },
  {
    _id: 'V002', name: 'Office Supply Kings', supplierCode: 'OSK-2002',
    contacts: [{ name: 'John Smith', email: 'john.s@osk.com', phone: '987-654-3210' }],
    rating: 4.5, status: VendorStatus.Active, defaultCurrency: 'EUR',
    address: '456 Office Park, Dublin, Ireland', taxId: 'VAT67890', paymentTerms: 'Net 60 Days'
  },
  {
    _id: 'V003', name: 'Industrial Hardware Inc.', supplierCode: 'IHI-3003',
    contacts: [{ name: 'Peter Jones', email: 'pete@ihi.com', phone: '555-555-5555' }],
    rating: 4.2, status: VendorStatus.Inactive, defaultCurrency: 'INR',
    address: '789 Industrial Ave, Mumbai, India', taxId: 'PANABC123', paymentTerms: 'Due on Receipt'
  },
];

// MATERIALS
export const materials: Material[] = [
  { _id: 'M001', sku: 'CPU-I9-12900K', description: 'Intel Core i9-12900K Processor', category: 'Computer Components', uom: 'EA', defaultPrice: 589.99 },
  { _id: 'M002', sku: 'RAM-DDR5-32GB', description: 'Corsair Vengeance 32GB DDR5 RAM', category: 'Computer Components', uom: 'EA', defaultPrice: 159.99 },
  { _id: 'M003', sku: 'SSD-NVME-1TB', description: 'Samsung 980 Pro 1TB NVMe SSD', category: 'Storage', uom: 'EA', defaultPrice: 129.99 },
  { _id: 'M004', sku: 'MON-27-4K', description: 'Dell Ultrasharp 27" 4K Monitor', category: 'Peripherals', uom: 'EA', defaultPrice: 699.99 },
  { _id: 'M005', sku: 'PAPER-A4-500', description: 'A4 Printing Paper (500 sheets)', category: 'Office Supplies', uom: 'REAM', defaultPrice: 5.99 },
  { _id: 'M006', sku: 'CHAIR-ERGONOMIC', description: 'Ergonomic Office Chair', category: 'Furniture', uom: 'EA', defaultPrice: 350.00 },
];

// REQUISITIONS
export const mockRequisitions: Requisition[] = [
  {
    _id: 'PR001', prNumber: 'PR-2024-001', requesterId: 'U001', requestDate: relativeDate(-5, -2),
    department: 'Engineering', status: RequisitionStatus.RFQ, currency: 'USD',
    items: [{ _id: 'PRI01', materialId: 'M001', product_name: 'Intel Core i9', description: 'For new hire workstation builds', quantity: 10, uom: 'EA', estimatedUnitCost: 589.99, estimatedTotalCost: 5899.90 }],
    totalAmount: 5899.90, notes: 'For new engineering workstations', approverId: 'U002', approvedAt: relativeDate(-4), rfqId: 'RFQ001',
    approvalWorkflow: [{ _id: 'AWF-PR001-1', approverId: 'U002', status: ApprovalStepStatus.Approved, comments: 'Approved for RFQ process.', date: relativeDate(-4) }]
  },
  {
    _id: 'PR002', prNumber: 'PR-2024-002', requesterId: 'U004', requestDate: relativeDate(-3, -5),
    department: 'Marketing', status: RequisitionStatus.Approved, currency: 'USD',
    items: [{ _id: 'PRI02', materialId: 'M004', product_name: '4K Monitors', quantity: 5, uom: 'EA', estimatedUnitCost: 699.99, estimatedTotalCost: 3499.95 }],
    totalAmount: 3499.95, notes: 'For the new design team', approverId: 'U002', approvedAt: relativeDate(-2),
    approvalWorkflow: [{ _id: 'AWF-PR002-1', approverId: 'U002', status: ApprovalStepStatus.Approved, comments: 'Approved as per budget.', date: relativeDate(-2) }]
  },
  {
    _id: 'PR003', prNumber: 'PR-2024-003', requesterId: 'U001', requestDate: relativeDate(-2, -3),
    department: 'IT', status: RequisitionStatus.Closed, relatedPOId: 'PO001', currency: 'USD',
    items: [{ _id: 'PRI03', materialId: 'M003', product_name: '1TB SSDs', quantity: 20, uom: 'EA', estimatedUnitCost: 129.99, estimatedTotalCost: 2599.80 }],
    totalAmount: 2599.80, notes: 'Server storage upgrade', approverId: 'U002', approvedAt: relativeDate(-2),
    approvalWorkflow: [{ _id: 'AWF-PR003-1', approverId: 'U002', status: ApprovalStepStatus.Approved, comments: 'Standard IT hardware purchase.', date: relativeDate(-2) }]
  },
  {
    _id: 'PR004', prNumber: 'PR-2024-004', requesterId: 'U004', requestDate: relativeDate(-1, -1),
    department: 'Marketing', status: RequisitionStatus.Rejected, currency: 'USD',
    items: [{ _id: 'PRI04', materialId: 'M004', product_name: 'Dell Ultrasharp 27" 4K Monitor', quantity: 2, uom: 'EA', estimatedUnitCost: 699.99, estimatedTotalCost: 1399.98 }],
    totalAmount: 1399.98, notes: 'Budget for this quarter has been exceeded.', approverId: 'U002', approvedAt: relativeDate(-1),
    approvalWorkflow: [{ _id: 'AWF-PR004-1', approverId: 'U002', status: ApprovalStepStatus.Rejected, comments: 'Budget for this quarter has been exceeded.', date: relativeDate(-1) }]
  },
  {
    _id: 'PR005', prNumber: 'PR-2024-005', requesterId: 'U001', requestDate: relativeDate(0, -3),
    department: 'Engineering', status: RequisitionStatus.Pending, currency: 'USD',
    items: [
        { _id: 'PRI05', materialId: 'M002', product_name: 'Corsair Vengeance 32GB DDR5 RAM', quantity: 4, uom: 'EA', estimatedUnitCost: 159.99, estimatedTotalCost: 639.96 },
        { _id: 'PRI06', materialId: 'M003', product_name: 'Samsung 980 Pro 1TB NVMe SSD', quantity: 4, uom: 'EA', estimatedUnitCost: 129.99, estimatedTotalCost: 519.96 }
    ],
    totalAmount: 1159.92, notes: 'Preparing for next batch of workstations.'
  },
  {
    _id: 'PR006', prNumber: 'PR-2024-006', requesterId: 'U001', requestDate: relativeDate(-180),
    department: 'IT', status: RequisitionStatus.Closed, relatedPOId: 'PO005', currency: 'USD',
    items: [{ _id: 'PRI07', materialId: 'M003', product_name: 'Samsung 980 Pro 1TB NVMe SSD', quantity: 15, uom: 'EA', estimatedUnitCost: 135.00, estimatedTotalCost: 2025.00 }],
    totalAmount: 2025.00, notes: 'Q1 server maintenance', approverId: 'U002', approvedAt: relativeDate(-179)
  },
  {
    _id: 'PR007', prNumber: 'PR-2024-007', requesterId: 'U004', requestDate: relativeDate(-150),
    department: 'Marketing', status: RequisitionStatus.Closed, relatedPOId: 'PO006', currency: 'EUR',
    items: [{ _id: 'PRI08', materialId: 'M005', product_name: 'A4 Printing Paper (500 sheets)', quantity: 200, uom: 'REAM', estimatedUnitCost: 5.00, estimatedTotalCost: 1000.00 }],
    totalAmount: 1000.00, notes: 'Stock for Q2 marketing campaigns', approverId: 'U002', approvedAt: relativeDate(-149)
  },
  {
    _id: 'PR008', prNumber: 'PR-2024-008', requesterId: 'U001', requestDate: relativeDate(-120),
    department: 'Engineering', status: RequisitionStatus.Closed, relatedPOId: 'PO007', currency: 'USD',
    items: [{ _id: 'PRI09', materialId: 'M006', product_name: 'Ergonomic Office Chair', quantity: 10, uom: 'EA', estimatedUnitCost: 350.00, estimatedTotalCost: 3500.00 }],
    totalAmount: 3500.00, notes: 'New chairs for engineering team', approverId: 'U002', approvedAt: relativeDate(-119)
  },
  {
    _id: 'PR009', prNumber: 'PR-2024-009', requesterId: 'U001', requestDate: relativeDate(-90),
    department: 'IT', status: RequisitionStatus.Rejected, currency: 'USD',
    items: [{ _id: 'PRI10', materialId: 'M004', product_name: 'Dell Ultrasharp 27" 4K Monitor', quantity: 5, uom: 'EA', estimatedUnitCost: 720.00, estimatedTotalCost: 3600.00 }],
    totalAmount: 3600.00, notes: 'Unbudgeted expense for Q2.', approverId: 'U002', approvedAt: relativeDate(-89)
  },
  {
    _id: 'PR010', prNumber: 'PR-2024-010', requesterId: 'U004', requestDate: relativeDate(-60),
    department: 'Marketing', status: RequisitionStatus.Approved, currency: 'USD',
    items: [{ _id: 'PRI11', materialId: 'M004', product_name: 'Dell Ultrasharp 27" 4K Monitor', quantity: 3, uom: 'EA', estimatedUnitCost: 699.99, estimatedTotalCost: 2099.97 }],
    totalAmount: 2099.97, notes: 'Monitors for new graphic designers', approverId: 'U002', approvedAt: relativeDate(-59)
  },
  {
    _id: 'PR011', prNumber: 'PR-2024-011', requesterId: 'U001', requestDate: relativeDate(-10),
    department: 'Engineering', status: RequisitionStatus.Pending, currency: 'USD',
    items: [{ _id: 'PRI12', materialId: 'M002', product_name: 'Corsair Vengeance 32GB DDR5 RAM', quantity: 20, uom: 'EA', estimatedUnitCost: 159.99, estimatedTotalCost: 3199.80 }],
    totalAmount: 3199.80, notes: 'RAM for server upgrades'
  },
  {
    _id: 'PR012', prNumber: 'PR-2023-012', requesterId: 'U001', requestDate: relativeDate(-450),
    department: 'IT', status: RequisitionStatus.Closed, currency: 'USD', relatedPOId: 'PO011',
    items: [{ _id: 'PRI13', materialId: 'M002', product_name: 'Corsair Vengeance 32GB DDR5 RAM', quantity: 50, uom: 'EA', estimatedUnitCost: 150.00, estimatedTotalCost: 7500.00 }],
    totalAmount: 7500.00, approverId: 'U002', approvedAt: relativeDate(-449),
  },
  {
    _id: 'PR013', prNumber: 'PR-2023-013', requesterId: 'U004', requestDate: relativeDate(-400),
    department: 'Marketing', status: RequisitionStatus.Closed, currency: 'USD', relatedPOId: 'PO012',
    items: [{ _id: 'PRI14', materialId: 'M004', product_name: 'Dell Ultrasharp 27" 4K Monitor', quantity: 15, uom: 'EA', estimatedUnitCost: 680.00, estimatedTotalCost: 10200.00 }],
    totalAmount: 10200.00, approverId: 'U002', approvedAt: relativeDate(-392),
  },
  {
    _id: 'PR014', prNumber: 'PR-2023-014', requesterId: 'U001', requestDate: relativeDate(-350),
    department: 'Engineering', status: RequisitionStatus.Closed, currency: 'USD', relatedPOId: 'PO013',
    items: [{ _id: 'PRI15', materialId: 'M001', product_name: 'Intel Core i9-12900K Processor', quantity: 25, uom: 'EA', estimatedUnitCost: 580.00, estimatedTotalCost: 14500.00 }],
    totalAmount: 14500.00, approverId: 'U002', approvedAt: relativeDate(-349),
  },
  {
    _id: 'PR015', prNumber: 'PR-2023-015', requesterId: 'U001', requestDate: relativeDate(-300),
    department: 'IT', status: RequisitionStatus.Rejected, currency: 'USD',
    items: [{ _id: 'PRI16', materialId: 'M003', product_name: 'Samsung 980 Pro 1TB NVMe SSD', quantity: 10, uom: 'EA', estimatedUnitCost: 140.00, estimatedTotalCost: 1400.00 }],
    totalAmount: 1400.00, approverId: 'U002', approvedAt: relativeDate(-299),
    approvalWorkflow: [{ _id: 'AWF-PR015-1', approverId: 'U002', status: ApprovalStepStatus.Rejected, comments: 'Not in budget for Q4.', date: relativeDate(-299) }]
  },
  {
    _id: 'PR016', prNumber: 'PR-2023-016', requesterId: 'U004', requestDate: relativeDate(-250),
    department: 'Admin', status: RequisitionStatus.Approved, currency: 'EUR',
    items: [{ _id: 'PRI17', materialId: 'M005', product_name: 'A4 Printing Paper (500 sheets)', quantity: 300, uom: 'REAM', estimatedUnitCost: 5.20, estimatedTotalCost: 1560.00 }],
    totalAmount: 1560.00, approverId: 'U002', approvedAt: relativeDate(-249),
  },
   {
    _id: 'PR017', prNumber: 'PR-2023-017', requesterId: 'U004', requestDate: relativeDate(-450),
    department: 'Admin', status: RequisitionStatus.Closed, relatedPOId: 'PO016', currency: 'EUR',
    items: [{ _id: 'PRI18', materialId: 'M005', product_name: 'A4 Printing Paper', quantity: 150, uom: 'REAM', estimatedUnitCost: 5.50, estimatedTotalCost: 825.00 }],
    totalAmount: 825.00, approverId: 'U002', approvedAt: relativeDate(-448)
  },
  {
    _id: 'PR018', prNumber: 'PR-2023-018', requesterId: 'U001', requestDate: relativeDate(-380),
    department: 'Facilities', status: RequisitionStatus.Closed, relatedPOId: 'PO017', currency: 'INR',
    items: [{ _id: 'PRI19', materialId: 'M006', product_name: 'Ergonomic Office Chair', quantity: 15, uom: 'EA', estimatedUnitCost: 28000, estimatedTotalCost: 420000.00 }],
    totalAmount: 420000.00, approverId: 'U002', approvedAt: relativeDate(-379)
  },
  {
    _id: 'PR019', prNumber: 'PR-2023-019', requesterId: 'U001', requestDate: relativeDate(-320),
    department: 'Engineering', status: RequisitionStatus.Closed, relatedPOId: 'PO018', currency: 'USD',
    items: [{ _id: 'PRI20', materialId: 'M004', product_name: 'Dell Ultrasharp 27" 4K Monitor', quantity: 8, uom: 'EA', estimatedUnitCost: 680, estimatedTotalCost: 5440.00 }],
    totalAmount: 5440.00, approverId: 'U002', approvedAt: relativeDate(-319)
  },
  {
    _id: 'PR020', prNumber: 'PR-2024-020', requesterId: 'U001', requestDate: relativeDate(-180),
    department: 'IT', status: RequisitionStatus.Closed, relatedPOId: 'PO019', currency: 'USD',
    items: [{ _id: 'PRI21', materialId: 'M003', product_name: 'Samsung 980 Pro 1TB NVMe SSD', quantity: 30, uom: 'EA', estimatedUnitCost: 130, estimatedTotalCost: 3900.00 }],
    totalAmount: 3900.00, approverId: 'U002', approvedAt: relativeDate(-179)
  },
  {
    _id: 'PR021', prNumber: 'PR-2024-021', requesterId: 'U004', requestDate: relativeDate(-120),
    department: 'Marketing', status: RequisitionStatus.Closed, relatedPOId: 'PO020', currency: 'USD',
    items: [{ _id: 'PRI22', materialId: 'M006', product_name: 'Ergonomic Office Chair', quantity: 5, uom: 'EA', estimatedUnitCost: 350, estimatedTotalCost: 1750.00 }],
    totalAmount: 1750.00, approverId: 'U002', approvedAt: relativeDate(-119)
  },
];

// RFQs
export const mockRFQs: RFQ[] = [
    {
        _id: 'RFQ001', rfqNumber: 'RFQ-2024-001', requisitionId: 'PR001',
        issuedDate: relativeDate(-3), dueDate: relativeDate(4),
        status: RFQStatus.Open,
        currency: 'USD',
        items: mockRequisitions.find(pr => pr._id === 'PR001')?.items || [],
        invitedVendors: [
            {
                _id: 'RFQ_V001', rfqId: 'RFQ001', vendorId: 'V001', invitedDate: relativeDate(-3, 0, 5), responseStatus: RFQVendorResponseStatus.Submitted,
                quotation: {
                    _id: 'Q001', rfqVendorId: 'RFQ_V001', vendorId: 'V001', submittedDate: relativeDate(-1, -6),
                    subtotal: 5800.00, taxRate: 8.25, taxAmount: 478.50, totalAmount: 6278.50, 
                    currency: 'USD', validityDate: relativeDate(28),
                    items: [{ _id: 'QI001', materialId: 'M001', product_name: 'Intel Core i9', quantity: 10, unitPrice: 580.00, totalPrice: 5800.00 }]
                }
            },
            { _id: 'RFQ_V002', rfqId: 'RFQ001', vendorId: 'V003', invitedDate: relativeDate(-3, 0, 5), responseStatus: RFQVendorResponseStatus.Pending }
        ]
    }
];

// PURCHASE ORDERS
export const mockPurchaseOrders: PurchaseOrder[] = [
  {
    _id: 'PO001', poNumber: 'PO-2024-00751', vendorId: 'V001', requesterId: 'U001', orderDate: relativeDate(-2),
    deliveryDate: relativeDate(15), status: POStatus.Closed, currency: 'USD', grnIds: ['GRN001'], invoiceIds: ['INV001'],
    lines: [{ _id: 'L001', materialId: 'M003', description: 'Samsung 980 Pro 1TB NVMe SSD', quantity: 20, uom: 'EA', unitPrice: 129.99, totalPrice: 2599.80 }],
    subtotal: 2599.80, taxRate: 8.25, taxAmount: 214.48, totalAmount: 2814.28,
    createdAt: relativeDate(-2, -1), approvedAt: relativeDate(-2, 3), sourcePRId: 'PR003',
    tasks: [{ _id: 'T001', poId: 'PO001', description: 'Verify budget code', assigneeId: 'U002', status: TaskStatus.Completed, createdAt: relativeDate(-2, -1, 5), priority: TaskPriority.High }],
    approvalWorkflow: [{ _id: 'AWF-PO001-1', approverId: 'U002', status: ApprovalStepStatus.Approved, comments: 'Standard IT hardware purchase, approved.', date: relativeDate(-2, 3) }]
  },
  {
    _id: 'PO002', poNumber: 'PO-2024-00752', vendorId: 'V002', requesterId: 'U004', orderDate: relativeDate(-1, -2),
    deliveryDate: relativeDate(8), status: POStatus.Draft, currency: 'EUR',
    lines: [{ _id: 'L002', materialId: 'M005', description: 'A4 Printing Paper (500 sheets)', quantity: 100, uom: 'REAM', unitPrice: 5.50, totalPrice: 550.00 }],
    subtotal: 550.00, taxRate: 23, taxAmount: 126.50, totalAmount: 676.50,
    createdAt: relativeDate(-1, -2, -5)
  },
  {
    _id: 'PO003', poNumber: 'PO-2024-00753', vendorId: 'V001', requesterId: 'U001', orderDate: relativeDate(0, -2, -15),
    deliveryDate: relativeDate(20), status: POStatus.PendingL1Approval, currency: 'USD',
    lines: [
        { _id: 'L003', materialId: 'M001', description: 'Intel Core i9-12900K Processor', quantity: 10, uom: 'EA', unitPrice: 580.00, totalPrice: 5800.00 },
        { _id: 'L004', materialId: 'M002', description: 'Corsair Vengeance 32GB DDR5 RAM', quantity: 10, uom: 'EA', unitPrice: 155.00, totalPrice: 1550.00 }
    ],
    subtotal: 7350.00, taxRate: 8.25, taxAmount: 606.38, totalAmount: 7956.38,
    createdAt: relativeDate(0, -2, -20),
    tasks: [
      { _id: 'T002', poId: 'PO003', description: 'Confirm stock availability with vendor', assigneeId: 'U001', status: TaskStatus.Open, createdAt: relativeDate(0, -2, -19), priority: TaskPriority.High },
      { _id: 'T003', poId: 'PO003', description: 'Finalize shipping details', assigneeId: 'U001', status: TaskStatus.Open, createdAt: relativeDate(0, -2, -18), dependsOn: 'T002', priority: TaskPriority.Medium }
    ],
    approvalWorkflow: []
  },
  {
    _id: 'PO004', poNumber: 'PO-2024-00754', vendorId: 'V001', requesterId: 'U001', orderDate: relativeDate(-8),
    deliveryDate: relativeDate(12), status: POStatus.Approved, currency: 'USD',
    lines: [{ _id: 'L005', materialId: 'M004', description: 'Dell Ultrasharp 27" 4K Monitor', quantity: 5, uom: 'EA', unitPrice: 690.00, totalPrice: 3450.00 }],
    subtotal: 3450.00, taxRate: 8.25, taxAmount: 284.63, totalAmount: 3734.63,
    createdAt: relativeDate(-8, -1), approvedAt: relativeDate(-5),
     approvalWorkflow: [{ _id: 'AWF-PO004-1', approverId: 'U002', status: ApprovalStepStatus.Approved, comments: '', date: relativeDate(-5) }]
  },
  {
    _id: 'PO005', poNumber: 'PO-2024-00755', vendorId: 'V001', requesterId: 'U001', orderDate: relativeDate(-178),
    deliveryDate: relativeDate(-163), status: POStatus.Closed, currency: 'USD', grnIds: ['GRN002'], invoiceIds: ['INV004'],
    lines: [{ _id: 'L006', materialId: 'M003', description: 'Samsung 980 Pro 1TB NVMe SSD', quantity: 15, uom: 'EA', unitPrice: 135.00, totalPrice: 2025.00 }],
    subtotal: 2025.00, taxRate: 8.25, taxAmount: 167.06, totalAmount: 2192.06,
    createdAt: relativeDate(-179), approvedAt: relativeDate(-175), sourcePRId: 'PR006'
  },
  {
    _id: 'PO006', poNumber: 'PO-2024-00756', vendorId: 'V002', requesterId: 'U004', orderDate: relativeDate(-148),
    deliveryDate: relativeDate(-132), status: POStatus.Closed, currency: 'EUR', grnIds: ['GRN003'], invoiceIds: ['INV005'],
    lines: [{ _id: 'L007', materialId: 'M005', description: 'A4 Printing Paper (500 sheets)', quantity: 200, uom: 'REAM', unitPrice: 5.00, totalPrice: 1000.00 }],
    subtotal: 1000.00, taxRate: 23, taxAmount: 230.00, totalAmount: 1230.00,
    createdAt: relativeDate(-149), approvedAt: relativeDate(-149, 4), sourcePRId: 'PR007'
  },
  {
    _id: 'PO007', poNumber: 'PO-2024-00757', vendorId: 'V001', requesterId: 'U001', orderDate: relativeDate(-118),
    deliveryDate: relativeDate(-99), status: POStatus.Invoiced, currency: 'USD', grnIds: ['GRN004'], invoiceIds: ['INV006'],
    lines: [{ _id: 'L008', materialId: 'M006', description: 'Ergonomic Office Chair', quantity: 10, uom: 'EA', unitPrice: 345.00, totalPrice: 3450.00 }],
    subtotal: 3450.00, taxRate: 0, taxAmount: 0, totalAmount: 3450.00,
    createdAt: relativeDate(-119), approvedAt: relativeDate(-119, 4), sourcePRId: 'PR008'
  },
  {
    _id: 'PO008', poNumber: 'PO-2024-00758', vendorId: 'V002', requesterId: 'U001', orderDate: relativeDate(-30),
    deliveryDate: relativeDate(-16), status: POStatus.Approved, currency: 'EUR',
    lines: [{ _id: 'L009', materialId: 'M005', description: 'A4 Printing Paper (500 sheets)', quantity: 50, uom: 'REAM', unitPrice: 5.20, totalPrice: 260.00 }],
    subtotal: 260.00, taxRate: 23, taxAmount: 59.80, totalAmount: 319.80,
    createdAt: relativeDate(-31), approvedAt: relativeDate(-31, 4)
  },
  {
    _id: 'PO009', poNumber: 'PO-2024-00759', vendorId: 'V003', requesterId: 'U004', orderDate: relativeDate(-20),
    deliveryDate: relativeDate(1), status: POStatus.PendingL2Approval, currency: 'INR',
    lines: [{ _id: 'L010', materialId: 'M006', description: 'Ergonomic Office Chair', quantity: 25, uom: 'EA', unitPrice: 28000.00, totalPrice: 700000.00 }],
    subtotal: 700000.00, taxRate: 18, taxAmount: 126000.00, totalAmount: 826000.00,
    createdAt: relativeDate(-21)
  },
  {
    _id: 'PO010', poNumber: 'PO-2024-00760', vendorId: 'V001', requesterId: 'U001', orderDate: relativeDate(-5),
    deliveryDate: relativeDate(9), status: POStatus.Approved, currency: 'USD',
    lines: [{ _id: 'L011', materialId: 'M001', description: 'Intel Core i9-12900K Processor', quantity: 5, uom: 'EA', unitPrice: 595.00, totalPrice: 2975.00 }],
    subtotal: 2975.00, taxRate: 8.25, taxAmount: 245.44, totalAmount: 3220.44,
    createdAt: relativeDate(-6), approvedAt: relativeDate(-6, 4)
  },
  {
    _id: 'PO011', poNumber: 'PO-2023-00101', vendorId: 'V001', requesterId: 'U001', orderDate: relativeDate(-448),
    deliveryDate: relativeDate(-429), status: POStatus.Closed, currency: 'USD', grnIds: ['GRN005'], invoiceIds: ['INV008'],
    lines: [{ _id: 'L012', materialId: 'M002', description: 'Corsair Vengeance 32GB DDR5 RAM', quantity: 50, uom: 'EA', unitPrice: 148.50, totalPrice: 7425.00 }],
    subtotal: 7425.00, taxRate: 8.25, taxAmount: 612.56, totalAmount: 8037.56,
    createdAt: relativeDate(-449), approvedAt: relativeDate(-448), sourcePRId: 'PR012',
  },
  {
    _id: 'PO012', poNumber: 'PO-2023-00102', vendorId: 'V001', requesterId: 'U004', orderDate: relativeDate(-398),
    deliveryDate: relativeDate(-379), status: POStatus.Closed, currency: 'USD', grnIds: ['GRN006'], invoiceIds: ['INV009'],
    lines: [{ _id: 'L013', materialId: 'M004', description: 'Dell Ultrasharp 27" 4K Monitor', quantity: 15, uom: 'EA', unitPrice: 675.00, totalPrice: 10125.00 }],
    subtotal: 10125.00, taxRate: 8.25, taxAmount: 835.31, totalAmount: 10960.31,
    createdAt: relativeDate(-399), approvedAt: relativeDate(-399, 7), sourcePRId: 'PR013',
  },
  {
    _id: 'PO013', poNumber: 'PO-2023-00103', vendorId: 'V001', requesterId: 'U001', orderDate: relativeDate(-348),
    deliveryDate: relativeDate(-326), status: POStatus.Invoiced, currency: 'USD', invoiceIds: ['INV010'],
    lines: [{ _id: 'L014', materialId: 'M001', description: 'Intel Core i9-12900K Processor', quantity: 25, uom: 'EA', unitPrice: 575.00, totalPrice: 14375.00 }],
    subtotal: 14375.00, taxRate: 8.25, taxAmount: 1185.94, totalAmount: 15560.94,
    createdAt: relativeDate(-349), approvedAt: relativeDate(-348), sourcePRId: 'PR014',
  },
  {
    _id: 'PO014', poNumber: 'PO-2024-00104', vendorId: 'V002', requesterId: 'U004', orderDate: relativeDate(-200),
    deliveryDate: relativeDate(-185), status: POStatus.Approved, currency: 'EUR', invoiceIds: ['INV011'],
    lines: [{ _id: 'L015', materialId: 'M005', description: 'A4 Printing Paper (500 sheets)', quantity: 400, uom: 'REAM', unitPrice: 5.10, totalPrice: 2040.00 }],
    subtotal: 2040.00, taxRate: 23, taxAmount: 469.20, totalAmount: 2509.20,
    createdAt: relativeDate(-201), approvedAt: relativeDate(-201, 7),
  },
  {
    _id: 'PO015', poNumber: 'PO-2023-00105', vendorId: 'V003', requesterId: 'U001', orderDate: relativeDate(-310),
    deliveryDate: relativeDate(-284), status: POStatus.Closed, currency: 'INR', grnIds: ['GRN007'], invoiceIds: ['INV012'],
    lines: [{ _id: 'L016', materialId: 'M006', description: 'Ergonomic Office Chair', quantity: 30, uom: 'EA', unitPrice: 27500.00, totalPrice: 825000.00 }],
    subtotal: 825000.00, taxRate: 18, taxAmount: 148500.00, totalAmount: 973500.00,
    createdAt: relativeDate(-311), approvedAt: relativeDate(-310),
  },
  {
    _id: 'PO016', poNumber: 'PO-2023-00106', vendorId: 'V002', requesterId: 'U004', orderDate: relativeDate(-446),
    deliveryDate: relativeDate(-430), status: POStatus.Closed, currency: 'EUR', sourcePRId: 'PR017', grnIds: ['GRN008'], invoiceIds: ['INV013'],
    lines: [{ _id: 'L017', materialId: 'M005', description: 'A4 Printing Paper', quantity: 150, uom: 'REAM', unitPrice: 5.50, totalPrice: 825.00 }],
    subtotal: 825.00, taxRate: 23, taxAmount: 189.75, totalAmount: 1014.75,
    createdAt: relativeDate(-448), approvedAt: relativeDate(-446)
  },
  {
    _id: 'PO017', poNumber: 'PO-2023-00107', vendorId: 'V003', requesterId: 'U001', orderDate: relativeDate(-370),
    deliveryDate: relativeDate(-350), status: POStatus.Closed, currency: 'INR', sourcePRId: 'PR018', grnIds: ['GRN009'], invoiceIds: ['INV014'],
    lines: [{ _id: 'L018', materialId: 'M006', description: 'Ergonomic Office Chair', quantity: 15, uom: 'EA', unitPrice: 28000.00, totalPrice: 420000.00 }],
    subtotal: 420000.00, taxRate: 18, taxAmount: 75600.00, totalAmount: 495600.00,
    createdAt: relativeDate(-379), approvedAt: relativeDate(-370)
  },
  {
    _id: 'PO018', poNumber: 'PO-2023-00108', vendorId: 'V001', requesterId: 'U001', orderDate: relativeDate(-319),
    deliveryDate: relativeDate(-302), status: POStatus.Closed, currency: 'USD', sourcePRId: 'PR019', grnIds: ['GRN010'], invoiceIds: ['INV015'],
    lines: [{ _id: 'L019', materialId: 'M004', description: 'Dell Ultrasharp 27" 4K Monitor', quantity: 8, uom: 'EA', unitPrice: 680.00, totalPrice: 5440.00 }],
    subtotal: 5440.00, taxRate: 8.25, taxAmount: 448.80, totalAmount: 5888.80,
    createdAt: relativeDate(-320), approvedAt: relativeDate(-319)
  },
  {
    _id: 'PO019', poNumber: 'PO-2024-00761', vendorId: 'V001', requesterId: 'U001', orderDate: relativeDate(-178),
    deliveryDate: relativeDate(-160), status: POStatus.Closed, currency: 'USD', sourcePRId: 'PR020', grnIds: ['GRN011'], invoiceIds: ['INV016'],
    lines: [{ _id: 'L020', materialId: 'M003', description: 'Samsung 980 Pro 1TB NVMe SSD', quantity: 30, uom: 'EA', unitPrice: 130.00, totalPrice: 3900.00 }],
    subtotal: 3900.00, taxRate: 8.25, taxAmount: 321.75, totalAmount: 4221.75,
    createdAt: relativeDate(-179), approvedAt: relativeDate(-178)
  },
  {
    _id: 'PO020', poNumber: 'PO-2024-00762', vendorId: 'V002', requesterId: 'U004', orderDate: relativeDate(-118),
    deliveryDate: relativeDate(-94), status: POStatus.Approved, currency: 'USD', sourcePRId: 'PR021',
    lines: [{ _id: 'L021', materialId: 'M006', description: 'Ergonomic Office Chair', quantity: 5, uom: 'EA', unitPrice: 350.00, totalPrice: 1750.00 }],
    subtotal: 1750.00, taxRate: 8.25, taxAmount: 144.38, totalAmount: 1894.38,
    createdAt: relativeDate(-119), approvedAt: relativeDate(-118)
  },
];

// PO TEMPLATES
export const mockPOTemplates: POTemplate[] = [
  {
    _id: 'POTPL001',
    templateName: 'Standard IT Hardware Kit',
    templateDescription: 'For new engineering hires. Includes CPU, RAM, SSD, and Monitor.',
    vendorId: 'V001', // Global Tech Components
    currency: 'USD',
    notes: 'Standard new hire IT kit. Please verify budget code before submitting. Tax rate may vary.',
    lines: [
      { _id: 'TPL_L001', materialId: 'M001', description: 'Intel Core i9-12900K Processor', quantity: 1, uom: 'EA', unitPrice: 589.99, totalPrice: 589.99 },
      { _id: 'TPL_L002', materialId: 'M002', description: 'Corsair Vengeance 32GB DDR5 RAM', quantity: 1, uom: 'EA', unitPrice: 159.99, totalPrice: 159.99 },
      { _id: 'TPL_L003', materialId: 'M003', description: 'Samsung 980 Pro 1TB NVMe SSD', quantity: 1, uom: 'EA', unitPrice: 129.99, totalPrice: 129.99 },
      { _id: 'TPL_L004', materialId: 'M004', description: 'Dell Ultrasharp 27" 4K Monitor', quantity: 1, uom: 'EA', unitPrice: 699.99, totalPrice: 699.99 },
    ],
    subtotal: 1579.96,
    taxRate: 8.25,
    taxAmount: 130.35,
    totalAmount: 1710.31,
  },
  {
    _id: 'POTPL002',
    templateName: 'Monthly Office Supplies',
    templateDescription: 'Restock of A4 paper for the entire office.',
    vendorId: 'V002', // Office Supply Kings
    currency: 'EUR',
    notes: 'Monthly restock order for general office use.',
    lines: [
      { _id: 'TPL_L005', materialId: 'M005', description: 'A4 Printing Paper (500 sheets)', quantity: 50, uom: 'REAM', unitPrice: 5.50, totalPrice: 275.00 },
    ],
    subtotal: 275.00,
    taxRate: 23,
    taxAmount: 63.25,
    totalAmount: 338.25,
  },
];

// DOCUMENT TEMPLATES
export const mockDocumentTemplates: DocumentTemplate[] = [
    {
        _id: 'DTPL001',
        name: 'Standard Company Template',
        isDefault: true,
        currentVersion: 1,
        versions: [
            {
                version: 1,
                createdAt: relativeDate(-30),
                notes: 'Initial version created.',
                paymentTerms: 'Payment is due within <b>30 days</b> of the invoice date. A 1.5% late fee will be applied to all overdue invoices. Please reference the PO number on all correspondence.',
                companyAddress: '<b>ProcureAI Inc.</b><br>123 Innovation Drive<br>Suite 456<br>Metropolis, USA 12345',
                accentColor: '#0b64b1',
                backgroundPatternUrl: '',
                signature: undefined,
                seal: undefined,
                watermark: '',
                fontFamily: 'Inter, sans-serif',
                layout: 'classic',
            }
        ]
    },
    {
        _id: 'DTPL002',
        name: 'International Shipments',
        isDefault: false,
        currentVersion: 1,
        versions: [
            {
                version: 1,
                createdAt: relativeDate(-25),
                notes: 'Initial version for international use.',
                paymentTerms: 'Payment due <u>upon receipt</u>. All customs and duties are the responsibility of the recipient. Please allow 4-6 weeks for delivery.',
                companyAddress: '<b>ProcureAI Global</b><br>789 Export Lane<br>Docklands, USA 54321',
                accentColor: '#d97706',
                backgroundPatternUrl: "data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%239C92AC' fill-opacity='0.1' fill-rule='evenodd'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/svg%3E",
                signature: undefined,
                seal: undefined,
                watermark: 'Draft',
                fontFamily: 'Georgia, serif',
                layout: 'modern-right',
            }
        ]
    }
];


// GOODS RECEIPT NOTES
export const mockGoodsReceipts: GoodsReceipt[] = [
  { _id: 'GRN001', grnNumber: 'GRN-2024-001', poId: 'PO001', receivedDate: relativeDate(-1, -7), receivedById: 'U001', status: GoodsReceiptStatus.Accepted, notes: 'Full delivery received in good condition.', items: [{ _id: 'GRNI001', poLineId: 'L001', materialId: 'M003', description: 'Samsung 980 Pro 1TB NVMe SSD', orderedQty: 20, receivedQty: 20, acceptedQty: 20, rejectedQty: 0 }] },
  { _id: 'GRN002', grnNumber: 'GRN-2024-002', poId: 'PO005', receivedDate: relativeDate(-150), receivedById: 'U001', status: GoodsReceiptStatus.Accepted, notes: '', items: [{ _id: 'GRNI002', poLineId: 'L006', materialId: 'M003', description: 'Samsung 980 Pro 1TB NVMe SSD', orderedQty: 15, receivedQty: 15, acceptedQty: 15, rejectedQty: 0 }] },
  { _id: 'GRN003', grnNumber: 'GRN-2024-003', poId: 'PO006', receivedDate: relativeDate(-130), receivedById: 'U004', status: GoodsReceiptStatus.Accepted, notes: 'All pallets received.', items: [{ _id: 'GRNI003', poLineId: 'L007', materialId: 'M005', description: 'A4 Printing Paper (500 sheets)', orderedQty: 200, receivedQty: 200, acceptedQty: 200, rejectedQty: 0 }] },
  { _id: 'GRN004', grnNumber: 'GRN-2024-004', poId: 'PO007', receivedDate: relativeDate(-102), receivedById: 'U001', status: GoodsReceiptStatus.Partial, notes: '2 chairs damaged in transit.', items: [{ _id: 'GRNI004', poLineId: 'L008', materialId: 'M006', description: 'Ergonomic Office Chair', orderedQty: 10, receivedQty: 10, acceptedQty: 8, rejectedQty: 2, rejectionReason: 'Damaged box' }] },
  { _id: 'GRN005', grnNumber: 'GRN-2023-005', poId: 'PO011', receivedDate: relativeDate(-430), receivedById: 'U001', status: GoodsReceiptStatus.Accepted, notes: 'Full shipment received.', items: [{ _id: 'GRNI005', poLineId: 'L012', materialId: 'M002', description: 'Corsair Vengeance 32GB DDR5 RAM', orderedQty: 50, receivedQty: 50, acceptedQty: 50, rejectedQty: 0 }] },
  { _id: 'GRN006', grnNumber: 'GRN-2023-006', poId: 'PO012', receivedDate: relativeDate(-370), receivedById: 'U004', status: GoodsReceiptStatus.Partial, notes: '1 monitor damaged.', items: [{ _id: 'GRNI006', poLineId: 'L013', materialId: 'M004', description: 'Dell Ultrasharp 27" 4K Monitor', orderedQty: 15, receivedQty: 15, acceptedQty: 14, rejectedQty: 1, rejectionReason: 'Screen cracked' }] },
  { _id: 'GRN007', grnNumber: 'GRN-2023-007', poId: 'PO015', receivedDate: relativeDate(-287), receivedById: 'U001', status: GoodsReceiptStatus.Accepted, notes: '', items: [{ _id: 'GRNI007', poLineId: 'L016', materialId: 'M006', description: 'Ergonomic Office Chair', orderedQty: 30, receivedQty: 30, acceptedQty: 30, rejectedQty: 0 }] },
  { _id: 'GRN008', grnNumber: 'GRN-2023-008', poId: 'PO016', receivedDate: relativeDate(-425), receivedById: 'U004', status: GoodsReceiptStatus.Accepted, notes: 'Delivery was 5 days late.', items: [{ _id: 'GRNI008', poLineId: 'L017', materialId: 'M005', description: 'A4 Printing Paper', orderedQty: 150, receivedQty: 150, acceptedQty: 150, rejectedQty: 0 }] },
  { _id: 'GRN009', grnNumber: 'GRN-2023-009', poId: 'PO017', receivedDate: relativeDate(-351), receivedById: 'U001', status: GoodsReceiptStatus.Accepted, notes: '', items: [{ _id: 'GRNI009', poLineId: 'L018', materialId: 'M006', description: 'Ergonomic Office Chair', orderedQty: 15, receivedQty: 15, acceptedQty: 15, rejectedQty: 0 }] },
  { _id: 'GRN010', grnNumber: 'GRN-2023-010', poId: 'PO018', receivedDate: relativeDate(-304), receivedById: 'U001', status: GoodsReceiptStatus.Accepted, notes: '', items: [{ _id: 'GRNI010', poLineId: 'L019', materialId: 'M004', description: 'Dell Ultrasharp 27" 4K Monitor', orderedQty: 8, receivedQty: 8, acceptedQty: 8, rejectedQty: 0 }] },
  { _id: 'GRN011', grnNumber: 'GRN-2024-011', poId: 'PO019', receivedDate: relativeDate(-162), receivedById: 'U004', status: GoodsReceiptStatus.Accepted, notes: '', items: [{ _id: 'GRNI011', poLineId: 'L020', materialId: 'M003', description: 'Samsung 980 Pro 1TB NVMe SSD', orderedQty: 30, receivedQty: 30, acceptedQty: 30, rejectedQty: 0 }] },
];

// INVOICES & PAYMENTS
export const mockPayments: Payment[] = [
    { _id: 'PAY001', paymentDate: relativeDate(0, -2), amountPaid: 2814.28, paymentMethod: PaymentMethod.BankTransfer, status: PaymentStatus.Completed, transactionId: 'TXN_BT_987654321' },
    { _id: 'PAY002', paymentDate: relativeDate(-140), amountPaid: 2192.06, paymentMethod: PaymentMethod.BankTransfer, status: PaymentStatus.Completed, transactionId: 'TXN_BT_112233445' },
    { _id: 'PAY003', paymentDate: relativeDate(-100), amountPaid: 1230.00, paymentMethod: PaymentMethod.CreditCard, status: PaymentStatus.Completed, transactionId: 'TXN_CC_556677889' },
    { _id: 'PAY004', paymentDate: relativeDate(-400), amountPaid: 8037.56, paymentMethod: PaymentMethod.BankTransfer, status: PaymentStatus.Completed, transactionId: 'TXN_BT_223344556' },
    { _id: 'PAY005', paymentDate: relativeDate(-360), amountPaid: 10960.31, paymentMethod: PaymentMethod.BankTransfer, status: PaymentStatus.Completed, transactionId: 'TXN_BT_334455667' },
    { _id: 'PAY006', paymentDate: relativeDate(-250), amountPaid: 973500.00, paymentMethod: PaymentMethod.BankTransfer, status: PaymentStatus.Completed, transactionId: 'TXN_BT_445566778' },
    { _id: 'PAY007', paymentDate: relativeDate(-410), amountPaid: 1014.75, paymentMethod: PaymentMethod.BankTransfer, status: PaymentStatus.Completed, transactionId: 'TXN_BT_556677889' },
    { _id: 'PAY008', paymentDate: relativeDate(-340), amountPaid: 495600.00, paymentMethod: PaymentMethod.BankTransfer, status: PaymentStatus.Completed, transactionId: 'TXN_BT_667788990' },
    { _id: 'PAY009', paymentDate: relativeDate(-290), amountPaid: 5888.80, paymentMethod: PaymentMethod.BankTransfer, status: PaymentStatus.Completed, transactionId: 'TXN_BT_778899001' },
    { _id: 'PAY010', paymentDate: relativeDate(-150), amountPaid: 4221.75, paymentMethod: PaymentMethod.BankTransfer, status: PaymentStatus.Completed, transactionId: 'TXN_BT_889900112' },
];

export const mockInvoices: Invoice[] = [
    { _id: 'INV001', invoiceNumber: 'GTC-INV-2024-951', poId: 'PO001', vendorId: 'V001', invoiceDate: relativeDate(-1), dueDate: relativeDate(29), subtotal: 2599.80, taxRate: 8.25, taxAmount: 214.48, amount: 2814.28, currency: 'USD', status: InvoiceStatus.Paid, payments: [mockPayments.find(p => p._id === 'PAY001')!], notes: 'Payment for server SSDs.', approvalWorkflow: [{ _id: 'AWF-INV001-1', approverId: 'U003', status: ApprovalStepStatus.Approved, comments: 'Approved for payment.', date: relativeDate(0, -5) }] },
    { _id: 'INV002', invoiceNumber: 'GTC-INV-2024-963', poId: 'PO003', vendorId: 'V001', invoiceDate: relativeDate(-2, -1), dueDate: relativeDate(28), subtotal: 7350.00, taxRate: 8.25, taxAmount: 606.38, amount: 7956.38, currency: 'USD', status: InvoiceStatus.Approved, payments: [], notes: 'Invoice for new engineering workstations components.', approvalWorkflow: [{ _id: 'AWF-INV002-1', approverId: 'U003', status: ApprovalStepStatus.Approved, comments: 'Looks good.', date: relativeDate(-1, -5) }] },
    { _id: 'INV003', invoiceNumber: 'OSK-INV-2024-482', poId: 'PO002', vendorId: 'V002', invoiceDate: relativeDate(-4), dueDate: relativeDate(56), subtotal: 550.00, taxRate: 23, taxAmount: 126.50, amount: 676.50, currency: 'EUR', status: InvoiceStatus.Pending, payments: [], notes: '' },
    { _id: 'INV004', invoiceNumber: 'GTC-INV-2024-101', poId: 'PO005', vendorId: 'V001', invoiceDate: relativeDate(-160), dueDate: relativeDate(-130), subtotal: 2025.00, taxRate: 8.25, taxAmount: 167.06, amount: 2192.06, currency: 'USD', status: InvoiceStatus.Paid, payments: [mockPayments.find(p => p._id === 'PAY002')!] },
    { _id: 'INV005', invoiceNumber: 'OSK-INV-2024-150', poId: 'PO006', vendorId: 'V002', invoiceDate: relativeDate(-132), dueDate: relativeDate(-72), subtotal: 1000.00, taxRate: 23, taxAmount: 230.00, amount: 1230.00, currency: 'EUR', status: InvoiceStatus.Paid, payments: [mockPayments.find(p => p._id === 'PAY003')!] },
    { _id: 'INV006', invoiceNumber: 'GTC-INV-2024-333', poId: 'PO007', vendorId: 'V001', invoiceDate: relativeDate(-99), dueDate: relativeDate(-69), subtotal: 3450.00, taxRate: 0, taxAmount: 0, amount: 3450.00, currency: 'USD', status: InvoiceStatus.Approved, payments: [] },
    { _id: 'INV007', invoiceNumber: 'OSK-INV-2024-888', poId: 'PO008', vendorId: 'V002', invoiceDate: relativeDate(-15), dueDate: relativeDate(45), subtotal: 260.00, taxRate: 23, taxAmount: 59.80, amount: 319.80, currency: 'EUR', status: InvoiceStatus.Pending, payments: [] },
    { _id: 'INV008', invoiceNumber: 'GTC-INV-2023-201', poId: 'PO011', vendorId: 'V001', invoiceDate: relativeDate(-428), dueDate: relativeDate(-398), subtotal: 7425.00, taxRate: 8.25, taxAmount: 612.56, amount: 8037.56, currency: 'USD', status: InvoiceStatus.Paid, payments: [mockPayments.find(p => p._id === 'PAY004')!] },
    { _id: 'INV009', invoiceNumber: 'GTC-INV-2023-450', poId: 'PO012', vendorId: 'V001', invoiceDate: relativeDate(-377), dueDate: relativeDate(-347), subtotal: 10125.00, taxRate: 8.25, taxAmount: 835.31, amount: 10960.31, currency: 'USD', status: InvoiceStatus.Paid, payments: [mockPayments.find(p => p._id === 'PAY005')!] },
    { _id: 'INV010', invoiceNumber: 'GTC-INV-2023-789', poId: 'PO013', vendorId: 'V001', invoiceDate: relativeDate(-323), dueDate: relativeDate(-293), subtotal: 14375.00, taxRate: 8.25, taxAmount: 1185.94, amount: 15560.94, currency: 'USD', status: InvoiceStatus.Approved, payments: [] },
    { _id: 'INV011', invoiceNumber: 'OSK-INV-2024-015', poId: 'PO014', vendorId: 'V002', invoiceDate: relativeDate(-184), dueDate: relativeDate(-124), subtotal: 2040.00, taxRate: 23, taxAmount: 469.20, amount: 2509.20, currency: 'EUR', status: InvoiceStatus.Pending, payments: [] },
    { _id: 'INV012', invoiceNumber: 'IHI-INV-2023-050', poId: 'PO015', vendorId: 'V003', invoiceDate: relativeDate(-283), dueDate: relativeDate(-283), subtotal: 825000.00, taxRate: 18, taxAmount: 148500.00, amount: 973500.00, currency: 'INR', status: InvoiceStatus.Paid, payments: [mockPayments.find(p => p._id === 'PAY006')!] },
    { _id: 'INV013', invoiceNumber: 'OSK-INV-2023-101', poId: 'PO016', vendorId: 'V002', invoiceDate: relativeDate(-424), dueDate: relativeDate(-365), subtotal: 825.00, taxRate: 23, taxAmount: 189.75, amount: 1014.75, currency: 'EUR', status: InvoiceStatus.Paid, payments: [mockPayments.find(p => p._id === 'PAY007')!] },
    { _id: 'INV014', invoiceNumber: 'IHI-INV-2023-020', poId: 'PO017', vendorId: 'V003', invoiceDate: relativeDate(-350), dueDate: relativeDate(-350), subtotal: 420000.00, taxRate: 18, taxAmount: 75600.00, amount: 495600.00, currency: 'INR', status: InvoiceStatus.Paid, payments: [mockPayments.find(p => p._id === 'PAY008')!] },
    { _id: 'INV015', invoiceNumber: 'GTC-INV-2023-850', poId: 'PO018', vendorId: 'V001', invoiceDate: relativeDate(-302), dueDate: relativeDate(-273), subtotal: 5440.00, taxRate: 8.25, taxAmount: 448.80, amount: 5888.80, currency: 'USD', status: InvoiceStatus.Paid, payments: [mockPayments.find(p => p._id === 'PAY009')!] },
    { _id: 'INV016', invoiceNumber: 'GTC-INV-2024-210', poId: 'PO019', vendorId: 'V001', invoiceDate: relativeDate(-160), dueDate: relativeDate(-130), subtotal: 3900.00, taxRate: 8.25, taxAmount: 321.75, amount: 4221.75, currency: 'USD', status: InvoiceStatus.Paid, payments: [mockPayments.find(p => p._id === 'PAY010')!] },
];


// AUDIT LOGS
export const mockAuditLogs: AuditLog[] = [
  // Requisitions
  { _id: 'A001', entityType: 'Requisition', entityNumber: 'PR-2024-001', entityId: 'PR001', timestamp: relativeDate(-5, -2), userId: 'U001', action: 'CREATED', details: 'Requisition created for Engineering department.' },
  { _id: 'A002', entityType: 'Requisition', entityNumber: 'PR-2024-001', entityId: 'PR001', timestamp: relativeDate(-4), userId: 'U002', action: 'APPROVED', details: 'Approved for RFQ process.' },
  { _id: 'A003', entityType: 'Requisition', entityNumber: 'PR-2024-004', entityId: 'PR004', timestamp: relativeDate(-1), userId: 'U002', action: 'REJECTED', details: 'Budget for this quarter has been exceeded.' },
  // RFQs
  { _id: 'A004', entityType: 'RFQ', entityNumber: 'RFQ-2024-001', entityId: 'RFQ001', timestamp: relativeDate(-3), userId: 'U003', action: 'CREATED', details: 'RFQ created from PR-2024-001.' },
  { _id: 'A005', entityType: 'RFQ', entityNumber: 'RFQ-2024-001', entityId: 'RFQ001', timestamp: relativeDate(-1, -6), userId: 'U003', action: 'QUOTATION_SUBMITTED', details: 'Quotation submitted by vendor Global Tech Components.' },
  // Purchase Orders
  { _id: 'A006', entityType: 'Purchase Order', entityNumber: 'PO-2024-00751', entityId: 'PO001', timestamp: relativeDate(-2, -1), userId: 'U001', action: 'CREATED', details: 'PO created from PR-2024-003.' },
  { _id: 'A007', entityType: 'Purchase Order', entityNumber: 'PO-2024-00751', entityId: 'PO001', timestamp: relativeDate(-2, 3), userId: 'U002', action: 'APPROVED', details: 'PO was approved.' },
  { _id: 'A008', entityType: 'Purchase Order', entityNumber: 'PO-2024-00753', entityId: 'PO003', timestamp: relativeDate(0, -2, -20), userId: 'U001', action: 'CREATED', details: 'PO created manually.' },
  { _id: 'A009', entityType: 'Purchase Order', entityNumber: 'PO-2024-00753', entityId: 'PO003', timestamp: relativeDate(0, -2, -19), userId: 'U001', action: 'TASK_ADDED', details: 'Task "Confirm stock availability with vendor" added.' },
  // GRNs
  { _id: 'A010', entityType: 'Goods Receipt', entityNumber: 'GRN-2024-001', entityId: 'GRN001', timestamp: relativeDate(-1, -7), userId: 'U001', action: 'CREATED', details: 'Goods receipt created for PO-2024-00751.' },
  // Invoices
  { _id: 'A011', entityType: 'Invoice', entityNumber: 'GTC-INV-2024-951', entityId: 'INV001', timestamp: relativeDate(-1), userId: 'U003', action: 'CREATED', details: 'Invoice created for PO-2024-00751.' },
  { _id: 'A012', entityType: 'Invoice', entityNumber: 'GTC-INV-2024-951', entityId: 'INV001', timestamp: relativeDate(0, -5), userId: 'U003', action: 'APPROVED', details: 'Invoice approved for payment.' },
  { _id: 'A013', entityType: 'Invoice', entityNumber: 'GTC-INV-2024-951', entityId: 'INV001', timestamp: relativeDate(0, -2), userId: 'U003', action: 'PAYMENT_RECORDED', details: `Payment of 2814.28 USD recorded.` },
  // User Management
  { _id: 'A014', entityType: 'User', entityNumber: 'diana@procure.io', entityId: 'U004', timestamp: relativeDate(-10), userId: 'U003', action: 'CREATED', details: 'User Diana Prince created with role Requester.' },
  // System
  { _id: 'A015', entityType: 'System', timestamp: relativeDate(0, -1), userId: 'U003', action: 'LOGIN', details: 'User charlie@procure.io logged in.' },
  // More data for today to test filters
  { _id: 'A016', entityType: 'Requisition', entityNumber: 'PR-2024-011', entityId: 'PR011', timestamp: new Date().toISOString(), userId: 'U001', action: 'CREATED', details: 'Requisition created for Engineering department.' },
  { _id: 'A017', entityType: 'Vendor', entityNumber: 'Industrial Hardware Inc.', entityId: 'V003', timestamp: new Date(Date.now() - 3600000 * 2).toISOString(), userId: 'U003', action: 'UPDATED', details: 'Vendor status changed to Inactive.' },
];

export const exchangeRates = {
  USD: 1,
  EUR: 0.93,
  INR: 83.5,
  AED: 3.67,
  SAR: 3.75,
  QAR: 3.64,
  KWD: 0.31,
  OMR: 0.38,
  BHD: 0.38,
  JOD: 0.71,
  EGP: 47.5,
  ILS: 3.7,
  TRY: 32.8
};

// SPEND ANALYTICS
const generateSpendAnalytics = (purchaseOrders: PurchaseOrder[], materials: Material[]): SpendAnalytics[] => {
    const spendData: { [key: string]: SpendAnalytics } = {};
    let idCounter = 1;

    purchaseOrders.forEach(po => {
        if (po.status !== POStatus.Rejected && po.status !== POStatus.Draft) {
            const orderDate = new Date(po.orderDate);
            const year = orderDate.getFullYear();
            const month = orderDate.getMonth() + 1;

            po.lines.forEach(line => {
                const material = materials.find(m => m._id === line.materialId);
                if (material) {
                    const key = `${po.vendorId}-${material.category}-${year}-${month}`;
                    if (spendData[key]) {
                        spendData[key].total_spent += line.totalPrice;
                    } else {
                        spendData[key] = {
                            id: `SA-${idCounter++}`,
                            vendor_id: po.vendorId,
                            category: material.category,
                            total_spent: line.totalPrice,
                            year,
                            month,
                        };
                    }
                }
            });
        }
    });

    return Object.values(spendData);
};

export const mockSpendAnalytics: SpendAnalytics[] = generateSpendAnalytics(mockPurchaseOrders, materials);