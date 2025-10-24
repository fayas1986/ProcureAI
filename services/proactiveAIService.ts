import type { Requisition, PurchaseOrder, Invoice, POTemplate, Vendor, RFQ, ChatMessage, User, GoodsReceipt } from '../types';
import { RequisitionStatus, POStatus, InvoiceStatus, RFQStatus, RFQVendorResponseStatus, VendorStatus } from '../types';
import type { View, EntityShortType } from '../App';

export interface Suggestion {
    id: string;
    text: string;
    subtext: string;
    actionType: 'NAVIGATE_ENTITY' | 'NAVIGATE_VIEW' | 'SEND_COMMUNICATION' | 'ASK_ASSISTANT';
    payload: {
        type?: EntityShortType | 'email' | 'whatsapp';
        number?: string; 
        view?: View;
        entityType?: 'Invoice' | 'RFQ' | 'Purchase Order';
        entityNumber?: string;
        vendorName?: string;
        prompt?: string; // For ASK_ASSISTANT
    };
}

interface ProactiveData {
    requisitions: Requisition[];
    purchaseOrders: PurchaseOrder[];
    invoices: Invoice[];
    poTemplates: POTemplate[];
    vendors: Vendor[];
    rfqs: RFQ[];
    goodsReceipts: GoodsReceipt[];
    currentUser: User | null;
    context?: View;
}

export const generateProactiveReportSummary = (data: ProactiveData): ChatMessage | null => {
    const now = new Date();
    // In a real app, you might store the last report date to avoid showing this every time on a Monday.
    // For this stateless app, we'll just show it on Mondays if the chat is empty.
    const isMonday = now.getDay() === 1;

    if (!isMonday) {
        return null;
    }

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(now.getDate() - 7);
    oneWeekAgo.setHours(0, 0, 0, 0);

    let summaryText = '';

    switch (data.context) {
        case 'pos': {
            const recentPOs = data.purchaseOrders.filter(po => new Date(po.orderDate) >= oneWeekAgo);
            if (recentPOs.length === 0) return null;
            
            const totalSpend = recentPOs.reduce((sum, po) => sum + po.totalAmount, 0); // Simplified, no currency conversion
            const pendingCount = recentPOs.filter(po => po.status === POStatus.PendingL1Approval || po.status === POStatus.PendingL2Approval).length;
            
            summaryText = `**Good morning! ☀️ Here's your Weekly PO Summary:**\n\n` +
                          `Looking back at the last 7 days: 🗓️\n` +
                          `• **${recentPOs.length}** new PO(s) created.\n` +
                          `• Total Value: **${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalSpend)}**.\n` +
                          (pendingCount > 0 ? `• **${pendingCount}** are still pending approval. ⏳\n\n` : `\n`) +
                          `Would you like me to "generate a weekly PO report in PDF" for more details?`;
            break;
        }
        
        case 'requisitions': {
            const recentPRs = data.requisitions.filter(pr => new Date(pr.requestDate) >= oneWeekAgo);
            if (recentPRs.length === 0) return null;

            const statusCounts = recentPRs.reduce((acc, pr) => {
                acc[pr.status] = (acc[pr.status] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

            summaryText = `**Happy Monday! Here is your Weekly Requisition Summary:** 📝\n\n` +
                          `Here's a look at the past 7 days: 🗓️\n` +
                          `• **${recentPRs.length}** new requisition(s) were created.\n` +
                          `• **Status Breakdown:**\n` +
                          Object.entries(statusCounts).map(([status, count]) => `    • ${status}: **${count}**`).join('\n') + `\n\n` +
                          `Just ask me to "show requisitions pending approval" to take action.`;
            break;
        }

        case 'invoices': {
            const recentInvoices = data.invoices.filter(inv => new Date(inv.invoiceDate) >= oneWeekAgo);
            if (recentInvoices.length === 0) return null;

            const paidInvoices = recentInvoices.filter(inv => inv.status === InvoiceStatus.Paid);
            const totalPaid = paidInvoices.reduce((sum, inv) => sum + inv.amount, 0);
            const overdueInvoices = data.invoices.filter(inv => inv.status !== InvoiceStatus.Paid && new Date(inv.dueDate) < now).length;

            summaryText = `**Good morning! Here's your Weekly Invoicing Summary:** 🧾\n\n` +
                          `Here's what happened in the last 7 days: 🗓️\n` +
                          `• **${recentInvoices.length}** new invoice(s) received.\n` +
                          `• **${paidInvoices.length}** invoice(s) paid, totaling **${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalPaid)}**. ✅\n` +
                          (overdueInvoices > 0 ? `• **Heads up:** You have **${overdueInvoices}** overdue invoice(s) needing attention. ❗️\n\n` : `\n`) +
                          `You can ask me to "show me overdue invoices" for a detailed list.`;
            break;
        }
        
        case 'rfqs': {
            const openRfqs = data.rfqs.filter(rfq => rfq.status === RFQStatus.Open);
            if (openRfqs.length === 0) return null;
            
            const dueSoonCount = openRfqs.filter(rfq => {
                const dueDate = new Date(rfq.dueDate);
                const daysUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 3600 * 24);
                return daysUntilDue >= 0 && daysUntilDue < 3;
            }).length;

            summaryText = `**Rise and shine! Here is your Weekly RFQ Summary:** 📬\n\n` +
                          `Here is the current status of your open RFQs:\n` +
                          `• You have **${openRfqs.length}** RFQ(s) currently open.\n` +
                          (dueSoonCount > 0 ? `• **${dueSoonCount}** of them are due for submission within the next 3 days. ⏰\n\n` : `\n`) +
                          `You can ask me to "send a reminder for RFQ [number]" to follow up with vendors.`;
            break;
        }


        default: { // Generic summary for other dashboards
            const recentPRs = data.requisitions.filter(pr => new Date(pr.requestDate) >= oneWeekAgo);
            const recentPOs = data.purchaseOrders.filter(po => new Date(po.orderDate) >= oneWeekAgo);
            
            if (recentPOs.length === 0 && recentPRs.length === 0) return null;

            const totalSpend = recentPOs.reduce((sum, po) => sum + po.totalAmount, 0);

            summaryText = `**Weekly Activity Summary** ✨\n\n` +
                          `Here's a look at your activity from the past 7 days: 🗓️\n` +
                          `• **${recentPRs.length}** new requisition(s) were created.\n` +
                          `• **${recentPOs.length}** new purchase order(s) were created.\n` +
                          `• Total value of new POs: **${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totalSpend)}**.\n\n` +
                          `Ask me to "generate a detailed weekly report as a CSV" for more details. 📄`;
            break;
        }
    }

    if (summaryText) {
        return {
            sender: 'ai',
            text: summaryText,
            timestamp: new Date().toISOString()
        };
    }
    
    return null;
}

export const generateProactiveSuggestions = (data: ProactiveData, currentUser: User | null): Suggestion[] => {
    const suggestions: Suggestion[] = [];
    if (!currentUser) return [];
    
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    // --- User-Specific High-Priority Tasks ---

    // 1. My Stale Draft Requisitions
    const myStaleDrafts = data.requisitions.filter(pr => 
        pr.requesterId === currentUser._id &&
        pr.status === RequisitionStatus.Draft &&
        new Date(pr.requestDate) < threeDaysAgo
    );
    if (myStaleDrafts.length > 0) {
        const pr = myStaleDrafts[0];
        suggestions.push({
            id: `stale-draft-${pr._id}`,
            text: `Resume your draft PR from ${new Date(pr.requestDate).toLocaleDateString()}?`,
            subtext: `Finish your requisition for the ${pr.department} department.`,
            actionType: 'NAVIGATE_ENTITY',
            payload: { type: 'PR', number: pr.prNumber },
        });
    }

    // --- Context-Specific Suggestions ---
    switch (data.context) {
        case 'pos':
            const pendingPOs = data.purchaseOrders.filter(po => po.status === POStatus.PendingL1Approval || po.status === POStatus.PendingL2Approval);
            if (pendingPOs.length > 0) {
                suggestions.push({
                    id: 'review-pending-pos',
                    text: `You have ${pendingPOs.length} PO(s) awaiting approval.`,
                    subtext: 'Do you want to review them?',
                    actionType: 'ASK_ASSISTANT',
                    payload: { prompt: 'Show me pending purchase orders' },
                });
            }

            const deliveredPOs = data.purchaseOrders.filter(po => 
                po.status === POStatus.Approved && 
                new Date(po.deliveryDate) <= now &&
                !data.goodsReceipts.some(grn => grn.poId === po._id)
            );
            if (deliveredPOs.length > 0) {
                const po = deliveredPOs[0];
                suggestions.push({
                    id: `grn-suggestion-${po._id}`,
                    text: `PO ${po.poNumber} was due on ${new Date(po.deliveryDate).toLocaleDateString()}.`,
                    subtext: 'Have the items been received? Create a Goods Receipt Note.',
                    actionType: 'NAVIGATE_ENTITY',
                    payload: { type: 'PO', number: po.poNumber },
                });
            }
            // Use a PO Template
            if (data.poTemplates.length > 0) {
                const officeTemplate = data.poTemplates.find(t => t.templateName.toLowerCase().includes('office'));
                if(officeTemplate) {
                    suggestions.push({
                        id: `use-template-${officeTemplate._id}`,
                        text: 'Need to order office supplies?',
                        subtext: `Use the "${officeTemplate.templateName}" template.`,
                        actionType: 'NAVIGATE_VIEW',
                        payload: { view: 'po-templates' },
                    });
                }
            }
            break;
        
        case 'invoices':
            const overdueInvoices = data.invoices.filter(inv => inv.status !== InvoiceStatus.Paid && new Date(inv.dueDate) < now);
            if(overdueInvoices.length > 0) {
                 suggestions.push({
                    id: 'show-overdue-invoices',
                    text: `You have ${overdueInvoices.length} overdue invoice(s).`,
                    subtext: `Show me overdue invoices`,
                    actionType: 'ASK_ASSISTANT',
                    payload: { prompt: 'Show me overdue invoices' },
                });
            }

            const approvedInvoices = data.invoices.filter(inv => {
                const totalPaid = inv.payments.reduce((sum, p) => sum + p.amountPaid, 0);
                return inv.status === InvoiceStatus.Approved && (inv.amount - totalPaid > 0.01);
            });
            if(approvedInvoices.length > 0) {
                const inv = approvedInvoices[0];
                suggestions.push({
                    id: `pay-invoice-${inv._id}`,
                    text: `Invoice ${inv.invoiceNumber} is approved for payment.`,
                    subtext: 'Ready to record a payment transaction.',
                    actionType: 'NAVIGATE_ENTITY',
                    payload: { type: 'INV', number: inv.invoiceNumber },
                });
            }
            break;
        
        case 'rfqs':
            const overdueRfqs = data.rfqs.filter(rfq => rfq.status === RFQStatus.Open && new Date(rfq.dueDate) < now);
            if(overdueRfqs.length > 0) {
                const rfq = overdueRfqs[0];
                suggestions.push({
                    id: `close-rfq-${rfq._id}`,
                    text: `Submissions for RFQ ${rfq.rfqNumber} are now closed.`,
                    subtext: 'Ready to compare quotations and award a vendor.',
                    actionType: 'NAVIGATE_ENTITY',
                    payload: { type: 'RFQ', number: rfq.rfqNumber },
                });
            }
            break;
    }

    // --- General Workflow Suggestions ---
    
    // Suggest creating PO/RFQ from Approved PR
    const approvedPRs = data.requisitions.filter(pr => pr.status === RequisitionStatus.Approved && !pr.relatedPOId && !pr.rfqId);
    if (approvedPRs.length > 0) {
        const pr = approvedPRs[0];
        suggestions.push({
            id: `pr-action-${pr._id}`,
            text: `Requisition ${pr.prNumber} is approved.`,
            subtext: 'Create a Purchase Order or send an RFQ to vendors.',
            actionType: 'NAVIGATE_ENTITY',
            payload: { type: 'PR', number: pr.prNumber },
        });
    }

    // Stale PO waiting for approval
    const oldPendingPOs = data.purchaseOrders.filter(po => 
        (po.status === POStatus.PendingL1Approval || po.status === POStatus.PendingL2Approval) && 
        po.createdAt && new Date(po.createdAt) < threeDaysAgo
    );
    if(oldPendingPOs.length > 0) {
        const po = oldPendingPOs[0];
        suggestions.push({
            id: `po-stale-${po._id}`,
            text: `${po.poNumber} has been pending approval for a while.`,
            subtext: 'View details to follow up or send a reminder.',
            actionType: 'NAVIGATE_ENTITY',
            payload: { type: 'PO', number: po.poNumber },
        });
    }

    // Deduplicate and return top suggestions
    return Array.from(new Map(suggestions.map(s => [s.id, s])).values()).slice(0, 3);
};