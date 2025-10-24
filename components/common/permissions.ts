import type { Permission } from "../../types";

type PermissionInfo = {
    id: Permission;
    name: string;
    description: string;
    category: string;
};

export const ALL_PERMISSIONS: PermissionInfo[] = [
    // Requisitions
    { id: 'VIEW_REQUISITIONS', name: 'View Requisitions', description: 'User can see the requisitions dashboard and view all requisitions.', category: 'Requisitions' },
    { id: 'CREATE_REQUISITION', name: 'Create Requisition', description: 'User can create new purchase requisitions.', category: 'Requisitions' },
    { id: 'APPROVE_REQUISITION', name: 'Approve Requisition', description: 'User can approve or reject pending requisitions.', category: 'Requisitions' },

    // RFQs
    { id: 'VIEW_RFQS', name: 'View RFQs', description: 'User can see the RFQ dashboard and view all RFQs.', category: 'RFQs' },
    { id: 'CREATE_RFQ', name: 'Create RFQ', description: 'User can create a new Request for Quotation from an approved requisition.', category: 'RFQs' },
    { id: 'AWARD_RFQ', name: 'Award RFQ', description: 'User can compare quotations and award an RFQ to a vendor, creating a PO.', category: 'RFQs' },
    { id: 'SUBMIT_QUOTATION', name: 'Submit Quotation', description: 'Allows simulating a vendor submitting a quote for an RFQ.', category: 'RFQs' },
    
    // Purchase Orders
    { id: 'VIEW_POS', name: 'View Purchase Orders', description: 'User can see the purchase order dashboard and view all POs.', category: 'Purchase Orders' },
    { id: 'CREATE_PO', name: 'Create Purchase Order', description: 'User can create new purchase orders directly.', category: 'Purchase Orders' },
    { id: 'APPROVE_PO', name: 'Approve Purchase Order', description: 'User can approve or reject pending purchase orders.', category: 'Purchase Orders' },
    { id: 'MANAGE_PO_TEMPLATES', name: 'Manage PO Templates', description: 'User can create, edit, and use purchase order templates.', category: 'Purchase Orders' },

    // Goods Receipt
    { id: 'VIEW_GRNS', name: 'View Goods Receipts', description: 'User can see the goods receipt dashboard.', category: 'Receiving' },
    { id: 'CREATE_GRN', name: 'Create Goods Receipt', description: 'User can record the receipt of goods against a PO.', category: 'Receiving' },
    
    // Invoicing
    { id: 'VIEW_INVOICES', name: 'View Invoices', description: 'User can view the invoicing dashboard.', category: 'Invoicing' },
    { id: 'CREATE_INVOICE', name: 'Create Invoice', description: 'User can create a new invoice from a PO.', category: 'Invoicing' },
    { id: 'APPROVE_INVOICE', name: 'Approve Invoice', description: 'User can approve invoices for payment.', category: 'Invoicing' },
    { id: 'RECORD_PAYMENT', name: 'Record Payment', description: 'User can record payments made against an approved invoice.', category: 'Invoicing' },

    // Master Data
    { id: 'VIEW_MATERIALS', name: 'View Materials', description: 'User can view the list of all materials.', category: 'Master Data' },
    { id: 'MANAGE_MATERIALS', name: 'Manage Materials', description: 'User can create, edit, and delete materials.', category: 'Master Data' },
    { id: 'VIEW_VENDORS', name: 'View Vendors', description: 'User can view the list of all vendors.', category: 'Master Data' },
    { id: 'MANAGE_VENDORS', name: 'Manage Vendors', description: 'User can create, edit, and delete vendors.', category: 'Master Data' },

    // Admin & Analytics
    { id: 'VIEW_ANALYTICS', name: 'View Analytics', description: 'User can access the analytics dashboard.', category: 'Reporting' },
    { id: 'VIEW_AUDIT_TRAIL', name: 'View Audit Trail', description: 'User can view the audit trail for all entities.', category: 'Reporting' },
    { id: 'MANAGE_USERS', name: 'Manage Users', description: 'User can create, edit, and delete users and assign them to roles.', category: 'Admin' },
    { id: 'MANAGE_ROLES', name: 'Manage Roles', description: 'User can create, edit, and delete roles and their permissions.', category: 'Admin' },
    { id: 'VIEW_BI_DASHBOARD', name: 'View BI Dashboard', description: 'User can access the Business Intelligence operational dashboard.', category: 'Reporting' },
];

export const groupPermissionsByCategory = (permissions: PermissionInfo[]) => {
    return permissions.reduce((acc, permission) => {
        (acc[permission.category] = acc[permission.category] || []).push(permission);
        return acc;
    }, {} as Record<string, PermissionInfo[]>);
};
