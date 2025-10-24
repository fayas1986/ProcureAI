import type { Requisition, User } from '../types';

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
 * @param payload - The email details (to, subject, body).
 */
const sendEmail = async (payload: EmailPayload): Promise<{ success: boolean }> => {
  console.log('--- Mock Email Service: Sending Requisition Email ---');
  console.log(`To: ${payload.to.join(', ')}`);
  console.log(`Subject: ${payload.subject}`);
  console.log(`Body:\n${payload.body}`);
  console.log('----------------------------------------------------');
  await new Promise(resolve => setTimeout(resolve, 500));
  return { success: true };
};

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

Please log in to the ProcureFlow dashboard to review and take action.

Thank you,
ProcureFlow System
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
You can view the details in the ProcureFlow dashboard.

Thank you,
ProcureFlow System
  `;

  return sendEmail({ to: [requester.email], subject, body });
};