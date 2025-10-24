import type { PurchaseOrder, User, Invoice, Vendor, RFQ, Requisition } from '../types';
import { RFQVendorResponseStatus } from '../types';

/**
 * Interface for the payload of a mock email.
 */
interface EmailPayload {
  to: string[];
  subject: string;
  body: string;
}

/**
 * Simulates sending an email by logging the details to the console.
 * This function mimics an asynchronous API call.
 * @param payload - The email details (to, subject, body).
 * @returns A promise that resolves to a success status.
 */
const sendEmail = async (payload: EmailPayload): Promise<{ success: boolean }> => {
  console.log('--- Mock Email Service: Sending Email ---');
  console.log(`To: ${payload.to.join(', ')}`);
  console.log(`Subject: ${payload.subject}`);
  console.log(`Body:\n${payload.body}`);
  console.log('-----------------------------------------');
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return { success: true };
};

// --- User Account Emails ---


// --- Purchase Order Emails ---

/**
 * Constructs and sends a notification to approvers for a new PO.
 * @param po - The purchase order requiring approval.
 * @param approvers - An array of users who are approvers.
 * @param vendorName - The name of the vendor for the PO.
 * @param stage - Optional description of the approval stage.
 */
export const sendApprovalRequestEmail = async (po: PurchaseOrder, approvers: User[], vendorName: string, stage?: string) => {
  if (approvers.length === 0) return { success: false };

  const approverEmails = approvers.map(a => a.email);
  const subject = `Action Required: ${stage ? stage + ' for ' : ''}Purchase Order ${po.poNumber} Pending Approval`;
  const body = `
Dear Approver,

Purchase order, ${po.poNumber}, for ${vendorName} is awaiting your approval.
Current Status: ${po.status}
Total Amount: ${po.totalAmount} ${po.currency}

Please log in to the Procure AI dashboard to review and take action.

Thank you,
Procure AI System
  `;
  
  return sendEmail({ to: approverEmails, subject, body });
};

/**
 * Constructs and sends a notification to the requester about a PO status update.
 * @param po - The updated purchase order.
 * @param requester - The user who requested the PO.
 * @param vendorName - The name of the vendor for the PO.
 * @param comments - Optional comments from the approver.
 */
export const sendPOStatusUpdateEmail = async (po: PurchaseOrder, requester: User | undefined, vendorName: string, comments?: string) => {
  if (!requester) {
    console.error(`Could not send notification for PO ${po.poNumber}: Requester not found.`);
    return { success: false };
  }

  const subject = `Update on Purchase Order ${po.poNumber}`;
  const body = `
Dear ${requester.name},

Your purchase order, ${po.poNumber}, for ${vendorName} has been ${po.status}.

${comments ? `Approver Comments: "${comments}"\n` : ''}
You can view the details in the Procure AI dashboard.

Thank you,
Procure AI System
  `;

  return sendEmail({ to: [requester.email], subject, body });
};


/**
 * Constructs and sends a reminder email to approvers for a PO that has been pending for too long.
 * @param po - The purchase order requiring approval.
 * @param approvers - An array of users who are approvers.
 * @param vendorName - The name of the vendor for the PO.
 * @param daysPending - The number of days the PO has been pending.
 */
export const sendPOApprovalReminderEmail = async (po: PurchaseOrder, approvers: User[], vendorName: string, daysPending: number) => {
  if (approvers.length === 0) return { success: false };

  const approverEmails = approvers.map(a => a.email);
  const subject = `REMINDER: Action Required for Purchase Order ${po.poNumber}`;
  const body = `
Dear Approver,

This is a reminder that Purchase Order ${po.poNumber} for ${vendorName} has been awaiting your approval for ${daysPending} days.
Current Status: ${po.status}
Total Amount: ${po.totalAmount} ${po.currency}

Please log in to the Procure AI dashboard to review and take action promptly.

Thank you,
Procure AI System
  `;
  
  return sendEmail({ to: approverEmails, subject, body });
};

/**
 * Constructs and sends a reminder for a single PO, often triggered by the AI assistant.
 * @param po - The purchase order requiring approval.
 * @param approvers - An array of users who are approvers.
 * @param vendorName - The name of the vendor for the PO.
 */
export const sendSinglePOApprovalReminder = async (po: PurchaseOrder, approvers: User[], vendorName: string) => {
  if (approvers.length === 0) return { success: false };
  const approverEmails = approvers.map(a => a.email);
  const subject = `Reminder: Approval for Purchase Order ${po.poNumber} is needed`;
  const body = `
Dear Approver,

This is a friendly reminder that Purchase Order ${po.poNumber} for ${vendorName} is awaiting your review and approval.

Total Amount: ${po.totalAmount} ${po.currency}
Status: ${po.status}

Your prompt action is appreciated.

Thank you,
Procure AI System
  `;
  return sendEmail({ to: approverEmails, subject, body });
};

// --- Requisition Emails ---

/**
 * Notifies approvers that a new requisition is awaiting their review.
 * @param pr - The requisition that was submitted.
 * @param approvers - An array of users who are approvers.
 * @param requester - The user who submitted the requisition.
 */
export const sendRequisitionSubmittedEmail = async (pr: Requisition, approvers: User[], requester: User | undefined) => {
  if (approvers.length === 0) return { success: false };

  const approverEmails = approvers.map(a => a.email);
  const subject = `Action Required: Requisition ${pr.prNumber} from ${requester?.name || 'a user'} is Pending Approval`;
  const body = `
Dear Approver,

A new purchase requisition, ${pr.prNumber}, from the ${pr.department} department is awaiting your approval.
Requester: ${requester?.name || 'N/A'}
Total Estimated Amount: ${pr.totalAmount} ${pr.currency}

Please log in to the Procure AI dashboard to review and take action.

Thank you,
Procure AI System
  `;
  
  return sendEmail({ to: approverEmails, subject, body });
};

/**
 * Notifies the requester of a status update on their requisition.
 * @param pr - The updated requisition.
 * @param requester - The user who requested the PR.
 * @param comments - Optional comments from the approver.
 */
export const sendRequisitionStatusUpdateEmail = async (pr: Requisition, requester: User | undefined, comments?: string) => {
  if (!requester) {
    console.error(`Could not send notification for PR ${pr.prNumber}: Requester not found.`);
    return { success: false };
  }

  const subject = `Update on Purchase Requisition ${pr.prNumber}`;
  const body = `
Dear ${requester.name},

Your purchase requisition, ${pr.prNumber}, for the ${pr.department} department has been ${pr.status}.

${comments ? `Approver Comments: "${comments}"\n` : ''}
You can view the details in the Procure AI dashboard.

Thank you,
Procure AI System
  `;

  return sendEmail({ to: [requester.email], subject, body });
};


// --- Invoice & RFQ Emails ---

/**
 * Sends a payment reminder to a vendor for an overdue invoice.
 * @param invoice - The overdue invoice.
 * @param vendor - The vendor to whom the email will be sent.
 */
export const sendInvoicePaymentReminderEmail = async (invoice: Invoice, vendor: Vendor) => {
  const contactEmails = vendor.contacts.map(c => c.email);
  if (contactEmails.length === 0) return { success: false };

  const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amountPaid, 0);
  const amountDue = invoice.amount - totalPaid;

  const subject = `Payment Reminder for Invoice ${invoice.invoiceNumber}`;
  const body = `
Dear ${vendor.name},

This is a friendly reminder regarding invoice ${invoice.invoiceNumber}, which was due on ${new Date(invoice.dueDate).toLocaleDateString()}.
The outstanding amount is ${amountDue.toFixed(2)} ${invoice.currency}.

Our records indicate that we are yet to receive payment. Please let us know if you have any questions.

Best regards,
Procure AI Accounts Payable
  `;
  return sendEmail({ to: contactEmails, subject, body });
};

/**
 * Sends a reminder to vendors who have not yet submitted a quotation for an RFQ.
 * @param rfq - The RFQ nearing its due date.
 * @param vendors - A list of vendors who have not yet responded.
 */
export const sendRFQQuotationReminderEmail = async (rfq: RFQ, vendors: Vendor[]) => {
  if (vendors.length === 0) return { success: false };

  const vendorEmails = vendors.flatMap(v => v.contacts.map(c => c.email));
  const subject = `Reminder: Quotation Submission for RFQ ${rfq.rfqNumber}`;
  const body = `
Dear Valued Partner,

This is a reminder that the deadline for submitting your quotation for RFQ ${rfq.rfqNumber} is approaching.
The submission deadline is ${new Date(rfq.dueDate).toLocaleDateString()}.

We look forward to receiving your proposal.

Thank you,
Procure AI Procurement Team
  `;
  return sendEmail({ to: vendorEmails, subject, body });
};

/**
 * Constructs and sends a notification about an invoice status update.
 * @param invoice - The updated invoice.
 * @param po - The related purchase order.
 * @param vendor - The vendor who submitted the invoice.
 * @param approver - The user who took the action.
 */
export const sendInvoiceStatusUpdateEmail = async (invoice: Invoice, po: PurchaseOrder | undefined, vendor: Vendor | undefined, approver: User) => {
  if (!po || !vendor) {
    console.error(`Could not send notification for Invoice ${invoice.invoiceNumber}: Missing PO or Vendor info.`);
    return { success: false };
  }

  // Notify internal accounts payable team, for this mock we'll send it to the approver and admin
  const internalTeamEmails = ['charlie@procure.io', approver.email]; // Mock AP team + approver
  const subject = `Update on Invoice ${invoice.invoiceNumber} for PO ${po.poNumber}`;
  const body = `
Dear Accounts Payable Team,

Invoice ${invoice.invoiceNumber} from ${vendor.name} has been ${invoice.status} by ${approver.name}.

PO Number: ${po.poNumber}
Invoice Amount: ${invoice.amount} ${invoice.currency}

Status: ${invoice.status}

Please proceed with the next steps as required.

Thank you,
Procure AI System
  `;

  return sendEmail({ to: internalTeamEmails, subject, body });
};