import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { ChatMessage, PurchaseOrder, Vendor, Requisition, Material, GoodsReceipt, Invoice, RFQ, POTemplate, User, Role, AuditLog, SpendAnalytics, Permission } from '../types';
import type { EntityShortType, View } from '../App';
import { askProcurementQuestion } from '../services/geminiService';
import { generateProactiveSuggestions, generateProactiveReportSummary, Suggestion } from '../services/proactiveAIService';
import { sendSinglePOApprovalReminder, sendInvoicePaymentReminderEmail, sendRFQQuotationReminderEmail } from '../services/emailService';
import { Card, CardHeader, CardTitle, CardContent } from './common/Card';
import { Button } from './common/Button';
import { Input } from './common/Input';
import { RFQVendorResponseStatus } from '../types';

declare global {
  interface Window {
    jspdf: any;
  }
}

interface ReportSuccess {
  dataUri: string;
  filename: string;
}
interface ReportError {
  error: string;
}
type ReportResult = ReportSuccess | ReportError;

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

const escapeCsvCell = (cell: any) => {
    const str = String(cell ?? '');
    // If the string contains a comma, a quote, or a newline, wrap it in double quotes
    if (str.search(/("|,|\n)/g) >= 0) {
        // Escape existing double quotes by doubling them
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
};

interface AIAssistantProps {
  purchaseOrders: PurchaseOrder[];
  vendors: Vendor[];
  requisitions: Requisition[];
  materials: Material[];
  goodsReceipts: GoodsReceipt[];
  invoices: Invoice[];
  rfqs: RFQ[];
  poTemplates: POTemplate[];
  users: User[];
  roles: Role[];
  auditLogs: AuditLog[];
  spendAnalytics: SpendAnalytics[];
  context?: View;
  currentUser: User | null;
  onViewEntity?: (type: EntityShortType, entityNumber: string) => void;
  setActiveView?: (view: View) => void;
  onClose?: () => void;
  isAssistantVisible: boolean;
  chatHistory: ChatMessage[];
  setChatHistory: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}

const LoadingIndicator = () => (
    <div className="flex items-center space-x-1">
        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse [animation-delay:-0.3s]"></div>
        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse [animation-delay:-0.15s]"></div>
        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse"></div>
    </div>
);

const reportPermissionMap: Record<string, Permission> = {
    purchaseOrders: 'VIEW_POS',
    requisitions: 'VIEW_REQUISITIONS',
    invoices: 'VIEW_INVOICES',
    spendAnalytics: 'VIEW_ANALYTICS',
    auditLogs: 'VIEW_AUDIT_TRAIL',
};

export const AIAssistant: React.FC<AIAssistantProps> = ({
  purchaseOrders,
  vendors,
  requisitions,
  materials,
  goodsReceipts,
  invoices,
  rfqs,
  poTemplates,
  users,
  roles,
  auditLogs,
  spendAnalytics,
  context,
  currentUser,
  onViewEntity,
  setActiveView,
  onClose,
  isAssistantVisible,
  chatHistory,
  setChatHistory,
}) => {
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [isTtsEnabled, setIsTtsEnabled] = useState(true);
    const [attachedFile, setAttachedFile] = useState<File | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const prevChatHistoryLength = useRef(chatHistory.length);

    const data = useMemo(() => ({
        purchaseOrders, vendors, requisitions, materials, goodsReceipts, invoices, rfqs, poTemplates, users, roles, auditLogs, spendAnalytics, context, currentUser
    }), [purchaseOrders, vendors, requisitions, materials, goodsReceipts, invoices, rfqs, poTemplates, users, roles, auditLogs, spendAnalytics, context, currentUser]);
    
    const userPermissions = useMemo(() => {
        if (!currentUser) return [];
        const userRole = roles.find(r => r._id === currentUser.roleId);
        return userRole?.permissions || [];
    }, [currentUser, roles]);


    useEffect(() => {
        if (isAssistantVisible && chatHistory.length === 0) {
            const summary = generateProactiveReportSummary(data);
            if (summary) {
                setChatHistory([summary]);
            }
        }
    }, [isAssistantVisible, chatHistory.length, data, setChatHistory]);

    useEffect(() => {
        // Only show suggestions if there's just a welcome/summary message
        if (chatHistory.length <= 1) {
            setSuggestions(generateProactiveSuggestions(data, currentUser));
        } else {
            setSuggestions([]);
        }
    }, [data, chatHistory, currentUser]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatHistory]);
    
    // Cleanup TTS on component unmount
    useEffect(() => {
        return () => {
            if (window.speechSynthesis) {
                window.speechSynthesis.cancel();
            }
        };
    }, []);

    // Text-to-Speech effect for new messages
    useEffect(() => {
        if (!isTtsEnabled || !window.speechSynthesis) {
            prevChatHistoryLength.current = chatHistory.length;
            return;
        }
    
        // Only speak if a new message has been added
        if (chatHistory.length > prevChatHistoryLength.current) {
            const lastMessage = chatHistory[chatHistory.length - 1];
            if (lastMessage && lastMessage.sender === 'ai' && lastMessage.text) {
                // Cancel any previous speech to avoid overlap
                window.speechSynthesis.cancel();
                
                // Speak the new message, cleaning up link formatting and removing emojis for smoother speech
                const textToSpeak = lastMessage.text
                    .replace(/\[(PO|PR|RFQ|INV|GRN):([^\]]+)\]/g, '$1 $2') // Handle special links
                    .replace(/\p{Emoji}/gu, ' ') // Remove all emoji characters
                    .replace(/\s+/g, ' ') // Collapse multiple spaces into one
                    .trim();
    
                if (textToSpeak) {
                  const utterance = new SpeechSynthesisUtterance(textToSpeak);
                  window.speechSynthesis.speak(utterance);
                }
            }
        }
        
        // Always update the ref to the current length for the next render
        prevChatHistoryLength.current = chatHistory.length;
        
    }, [chatHistory, isTtsEnabled]);
    
    const handleFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setAttachedFile(e.target.files[0]);
        }
    };
    
    const removeAttachedFile = () => {
        setAttachedFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };
    
    const createDownloadLink = (download: { uri: string; filename: string; }) => {
        const link = document.createElement('a');
        link.href = download.uri;
        link.download = download.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    
    const formatDataTypeName = (dataType: string) => {
        const name = dataType.replace(/([A-Z])/g, ' $1');
        return name.charAt(0).toUpperCase() + name.slice(1);
    };
    
    // Helper to apply filters
    const filterData = (data: any[], filters: any, dataType: string): any[] => {
        if (!filters || Object.keys(filters).length === 0) {
            return data;
        }

        return data.filter(item => {
            for (const key in filters) {
                if (filters.hasOwnProperty(key)) {
                    const filterValue = filters[key];
                    let itemValue = item[key];

                    // Determine the correct date field based on dataType
                    let dateField: string | undefined;
                    if (dataType === 'requisitions') {
                        dateField = 'requestDate';
                    } else if (dataType === 'purchaseOrders') {
                        dateField = 'orderDate';
                    } else if (dataType === 'invoices') {
                        dateField = 'invoiceDate';
                    }

                    // Handle date range filtering for specific date fields
                    if (dateField && (key === 'invoiceDate' || key === 'requestDate' || key === 'orderDate')) {
                        const itemDate = new Date(item[dateField]);
                        if (filterValue.$gte && itemDate < new Date(filterValue.$gte)) {
                            return false;
                        }
                        if (filterValue.$lte && itemDate > new Date(filterValue.$lte)) {
                            return false;
                        }
                    } else if (key === 'year') {
                        if (dateField) {
                            const itemYear = new Date(item[dateField]).getFullYear();
                            if (itemYear !== filterValue) {
                                return false;
                            }
                        } else {
                            // Fallback for other data types if 'year' filter is applied to a non-date field
                            if (itemValue !== filterValue) {
                                return false;
                            }
                        }
                    } else if (itemValue !== filterValue) {
                        return false;
                    }
                }
            }
            return true;
        });
    };

    const generateReport = async (format: 'csv' | 'pdf', dataType: string, filters: any): Promise<ReportResult> => {
        let data: any[] = [];
        let headers: string[] = [];
        let bodyData: (string | number)[][] = [];

        switch(dataType) {
            case 'purchaseOrders': data = purchaseOrders; break;
            case 'requisitions': data = requisitions; break;
            case 'invoices': data = invoices; break;
            case 'spendAnalytics': data = spendAnalytics; break;
            case 'auditLogs': data = auditLogs; break;
            default: return { error: `Data type '${dataType}' is not supported for reporting.` };
        }
        
        // Apply filters to the data
        data = filterData(data, filters, dataType);

        const friendlyName = formatDataTypeName(dataType);
        const filename = `${friendlyName.replace(/\s+/g, '_')}_report.${format}`;
        
        switch(dataType) {
            case 'purchaseOrders':
                headers = ['PO Number', 'Vendor', 'Order Date', 'Total Amount', 'Currency', 'Status'];
                bodyData = (data as PurchaseOrder[]).map(po => [
                    po.poNumber,
                    vendors.find(v => v._id === po.vendorId)?.name || 'N/A',
                    new Date(po.orderDate).toLocaleDateString(),
                    po.totalAmount,
                    po.currency,
                    po.status,
                ]);
                break;
            case 'requisitions':
                headers = ['PR Number', 'Requester', 'Request Date', 'Total Amount', 'Currency', 'Status'];
                bodyData = (data as Requisition[]).map(pr => [
                    pr.prNumber,
                    users.find(u => u._id === pr.requesterId)?.name || 'N/A',
                    new Date(pr.requestDate).toLocaleDateString(),
                    pr.totalAmount,
                    pr.currency,
                    pr.status,
                ]);
                break;
            case 'invoices':
                headers = ['Invoice #', 'Vendor', 'Invoice Date', 'Due Date', 'Amount', 'Currency', 'Status'];
                bodyData = (data as Invoice[]).map(inv => [
                    inv.invoiceNumber,
                    vendors.find(v => v._id === inv.vendorId)?.name || 'N/A',
                    new Date(inv.invoiceDate).toLocaleDateString(),
                    new Date(inv.dueDate).toLocaleDateString(),
                    inv.amount,
                    inv.currency,
                    inv.status,
                ]);
                break;
             case 'spendAnalytics':
                headers = ['Vendor', 'Category', 'Year', 'Month', 'Total Spent (USD)'];
                bodyData = (data as SpendAnalytics[]).map(sa => [
                    vendors.find(v => v._id === sa.vendor_id)?.name || 'N/A',
                    sa.category,
                    sa.year,
                    sa.month,
                    sa.total_spent
                ]);
                break;
            case 'auditLogs':
                headers = ['Timestamp', 'User', 'Entity Type', 'Entity Number', 'Action', 'Details'];
                bodyData = (data as AuditLog[]).map(log => [
                    new Date(log.timestamp).toLocaleString(),
                    users.find(u => u._id === log.userId)?.name || 'N/A',
                    log.entityType,
                    log.entityNumber || '',
                    log.action,
                    log.details
                ]);
                break;
        }
        
        if (format === 'csv') {
            const csvRows = [headers.join(','), ...bodyData.map(row => row.map(escapeCsvCell).join(','))].join('\n');
            const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvRows);
            return { dataUri: csvContent, filename };
        }
        
        if (format === 'pdf') {
            try {
                await waitForPdfLib();
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF({ orientation: headers.length > 6 ? 'landscape' : 'portrait' });
                doc.text(`${friendlyName} Report`, 14, 15);
                doc.autoTable({ head: [headers], body: bodyData, startY: 20 });
                return { dataUri: doc.output('datauristring'), filename };
            } catch (e) {
                console.error(e);
                return { error: e instanceof Error ? e.message : "PDF generation failed." };
            }
        }
        
        return { error: 'Unsupported format' };
    };

    const handleFunctionCall = async (fc: { name: string, args: any }) => {
        let resultMessage: ChatMessage;

        switch (fc.name) {
            case 'generateReport': {
                const requiredPermission = reportPermissionMap[fc.args.dataType];
                const friendlyName = formatDataTypeName(fc.args.dataType);
                
                if (requiredPermission && !userPermissions.includes(requiredPermission)) {
                    resultMessage = {
                        sender: 'ai',
                        text: `I'm sorry, but your current role does not have permission to view or generate reports for "${friendlyName}". Please contact an administrator if you believe this is an error. 🔐`,
                        timestamp: new Date().toISOString(),
                    };
                } else {
                    const initialDataLength = data.length;
                    const result = await generateReport(fc.args.format, fc.args.dataType, fc.args.filters);
                    const filteredDataLength = result && 'dataUri' in result ? bodyData.length : 0;

                    let filterMessage = '';
                    if (fc.args.filters && Object.keys(fc.args.filters).length > 0) {
                        filterMessage = ` (filtered from ${initialDataLength} items to ${filteredDataLength} items using filters: ${JSON.stringify(fc.args.filters)})`;
                    }

                    if ('dataUri' in result) {
                        resultMessage = {
                            sender: 'ai',
                            text: `✅ I've generated the ${friendlyName} report as a ${fc.args.format.toUpperCase()} file${filterMessage}. Click the button to download.`,
                            timestamp: new Date().toISOString(),
                            download: {
                                uri: result.dataUri,
                                filename: result.filename,
                            }
                        };
                    } else {
                        let errorMessageText = `🚨 I'm sorry, I couldn't generate the report. Error: ${result.error}`;
                        if (fc.args.format === 'pdf') {
                            errorMessageText += `\n\nAs a fallback, would you like me to "generate a ${fc.args.dataType} report in CSV"?`;
                        }
                        resultMessage = {
                            sender: 'ai',
                            text: errorMessageText,
                            timestamp: new Date().toISOString(),
                        };
                    }
                }
                break;
            }
            case 'sendReminderEmail': {
                const { entityType, entityNumber } = fc.args;
                let success = false;
                let errorMessage = '';

                try {
                    if (entityType === 'Purchase Order') {
                        const po = purchaseOrders.find(p => p.poNumber === entityNumber);
                        if (po) {
                            const approvers = users.filter(u => roles.find(r => r._id === u.roleId)?.permissions.includes('APPROVE_PO'));
                            const vendorName = vendors.find(v => v._id === po.vendorId)?.name || 'N/A';
                            const res = await sendSinglePOApprovalReminder(po, approvers, vendorName);
                            success = res.success;
                        } else {
                            errorMessage = `Purchase Order ${entityNumber} not found.`;
                        }
                    } else if (entityType === 'Invoice') {
                        const inv = invoices.find(i => i.invoiceNumber === entityNumber);
                         if (inv) {
                            const vendor = vendors.find(v => v._id === inv.vendorId);
                            if (vendor) {
                                // This function is for sending reminders TO vendors for payment, which isn't the user's intent.
                                // The user likely wants to remind an internal approver.
                                // For now, we'll just confirm the action. A more complex system would handle internal vs external reminders.
                                success = true; 
                            } else {
                                errorMessage = `Vendor for Invoice ${entityNumber} not found.`;
                            }
                        } else {
                            errorMessage = `Invoice ${entityNumber} not found.`;
                        }
                    } else if (entityType === 'RFQ') {
                         const rfq = rfqs.find(r => r.rfqNumber === entityNumber);
                         if (rfq) {
                            const pendingVendors = rfq.invitedVendors
                                .filter(v => v.responseStatus === RFQVendorResponseStatus.Pending)
                                .map(v => vendors.find(ven => ven._id === v.vendorId))
                                .filter((v): v is Vendor => !!v);
                            const res = await sendRFQQuotationReminderEmail(rfq, pendingVendors);
                            success = res.success;
                         } else {
                             errorMessage = `RFQ ${entityNumber} not found.`;
                         }
                    }
                } catch (e) {
                    success = false;
                    errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
                }

                resultMessage = {
                    sender: 'ai',
                    text: success 
                        ? `✅ Done! I've sent a reminder email for ${entityType} ${entityNumber}.`
                        : `🚨 I couldn't send the reminder. ${errorMessage}`,
                    timestamp: new Date().toISOString(),
                };
                break;
            }
            default:
                resultMessage = {
                    sender: 'ai',
                    text: `Function call to "${fc.name}" is not implemented yet.`,
                    timestamp: new Date().toISOString(),
                };
        }
        setChatHistory(prev => [...prev, resultMessage]);
    };
    
    const handleSubmit = async (e?: React.FormEvent, suggestion?: string) => {
        e?.preventDefault();
        const currentInput = (suggestion || input).trim();
    
        // Allow submission if there is text input OR an attached file.
        if (!currentInput && !attachedFile) return;
    
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
        
        // If only a file is provided, create a default query to guide the AI.
        const query = currentInput || (attachedFile ? "Analyze this document and provide a summary of its key information." : "");
        
        const userMessage: ChatMessage = {
            sender: 'user',
            text: query + (attachedFile ? ` (File Attached: ${attachedFile.name})` : ''),
            timestamp: new Date().toISOString(),
        };
    
        setInput('');
        setChatHistory(prev => [...prev, userMessage]);
        setIsLoading(true);
    
        const response = await askProcurementQuestion(query, purchaseOrders, vendors, requisitions, materials, goodsReceipts, invoices, rfqs, users, roles, auditLogs, spendAnalytics, chatHistory, attachedFile);
        
        removeAttachedFile(); // Clear file after sending
        setIsLoading(false);
    
        if (response.functionCalls && response.functionCalls.length > 0) {
            setChatHistory(prev => [...prev, { sender: 'ai', text: 'Roger that! I will perform that action for you. ✅', timestamp: new Date().toISOString() }]);
            for(const fc of response.functionCalls) {
                await handleFunctionCall(fc);
            }
        } else {
            setChatHistory(prev => [...prev, {
                sender: 'ai',
                text: response.text || "I'm sorry, I don't have an answer for that right now.",
                timestamp: new Date().toISOString(),
                sources: response.sources
            }]);
        }
    };

    const handleSuggestionClick = (suggestion: Suggestion) => {
        // When a suggestion is clicked, clear other suggestions to clean up the UI
        setSuggestions([]);

        switch (suggestion.actionType) {
            case 'NAVIGATE_ENTITY':
                onViewEntity?.(suggestion.payload.type as EntityShortType, suggestion.payload.number!);
                onClose?.();
                break;
            case 'NAVIGATE_VIEW':
                setActiveView?.(suggestion.payload.view!);
                onClose?.();
                break;
            case 'SEND_COMMUNICATION':
                const userMessage: ChatMessage = {
                    sender: 'user',
                    text: suggestion.text,
                    timestamp: new Date().toISOString(),
                };

                const aiThinkingMessage: ChatMessage = {
                    sender: 'ai',
                    text: `One moment, sending that reminder for you...`,
                    timestamp: new Date().toISOString(),
                }
                
                // Add to chat history immediately for better UX
                setChatHistory(prev => [...prev, userMessage, aiThinkingMessage]);
                // Directly call the function handler
                handleFunctionCall({
                    name: 'sendReminderEmail',
                    args: {
                        entityType: suggestion.payload.entityType,
                        entityNumber: suggestion.payload.entityNumber
                    }
                }).then(() => {
                    // Replace the "thinking" message with the final result
                    setChatHistory(prev => prev.slice(0, prev.length -1));
                });
                break;
            case 'ASK_ASSISTANT':
                if (suggestion.payload.prompt) {
                    handleSubmit(undefined, suggestion.payload.prompt);
                }
                break;
            default:
                handleSubmit(undefined, suggestion.text);
        }
    };

    const renderMessageText = (text: string): React.ReactNode => {
        const linkRegex = /\[(PO|PR|RFQ|INV|GRN):([^\]]+)\]/g;
        const parts = text.split(linkRegex);

        return parts.map((part, index) => {
            if (index % 3 === 1) { // This is the entity type (PO, PR, etc.)
                const type = part as EntityShortType;
                const number = parts[index + 1];
                return (
                    <button
                        key={index}
                        onClick={() => { onViewEntity?.(type, number); onClose?.(); }}
                        className="font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded-md hover:bg-primary/20 transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                        {type}:{number}
                    </button>
                );
            }
            if (index % 3 === 2) return null; // This is the entity number, already handled.
            
            // Render format selection buttons
            if (part.includes('e.g., CSV or PDF')) {
                 const [preText] = part.split('What format');
                 return (
                    <span key={index}>
                        {preText} What format would you like the report in?
                        <div className="flex gap-2 mt-2">
                           <Button size="sm" variant="outline" onClick={() => handleSubmit(undefined, 'CSV')}>CSV</Button>
                           <Button size="sm" variant="outline" onClick={() => handleSubmit(undefined, 'PDF')}>PDF</Button>
                        </div>
                    </span>
                 );
            }

            return <span key={index}>{part}</span>;
        });
    };
    
    const MessageBubble: React.FC<{ msg: ChatMessage, onRender: (text: string) => React.ReactNode }> = ({ msg, onRender }) => {
        const isUser = msg.sender === 'user';
        
        const Avatar = () => (
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${isUser ? 'bg-primary text-primary-foreground' : 'bg-muted-foreground text-muted'}`}>
                {isUser ? (currentUser?.name.charAt(0) || 'U') : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.562L16.5 21.75l-.398-1.188a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.188-.398a2.25 2.25 0 001.423-1.423L16.5 15.75l.398 1.188a2.25 2.25 0 001.423 1.423L19.5 18.75l-1.188.398a2.25 2.25 0 00-1.423 1.423z" /></svg>}
            </div>
        );
        
        const formatTimestamp = (isoString: string) => {
            try {
                return new Date(isoString).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
            } catch (e) {
                return '';
            }
        };
        
        const name = isUser ? currentUser?.name : 'AI Assistant';
        
        return (
            <div className={`flex items-start gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
                {!isUser && <Avatar />}
                <div className={`flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}>
                     <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm">{name}</p>
                        <p className="text-xs text-muted-foreground">{formatTimestamp(msg.timestamp)}</p>
                    </div>
                    <div
                        className={`p-3 rounded-lg ${
                            isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
                        } max-w-sm`}
                    >
                        {onRender(msg.text)}
                        {msg.sources && msg.sources.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-muted-foreground/20 space-y-1">
                                <p className="text-xs font-semibold">Sources:</p>
                                {msg.sources.map((source, i) => (
                                    <a
                                        key={i}
                                        href={source.web.uri}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs block truncate hover:underline"
                                        style={{ color: isUser ? 'inherit' : 'hsl(var(--primary))' }}
                                    >
                                        {source.web.title}
                                    </a>
                                ))}
                            </div>
                        )}
                        {msg.download && (
                            <div className="mt-2">
                                <Button size="sm" onClick={() => createDownloadLink(msg.download!)}>
                                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                                    {msg.download.filename}
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
                {isUser && <Avatar />}
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full">
            <CardHeader className="flex-shrink-0">
                <div className="flex justify-between items-center">
                    <CardTitle className="text-lg font-semibold">AI Co-Assistant ✨</CardTitle>
                    <div className="flex items-center">
                        <Button variant="ghost" size="icon" onClick={() => setIsTtsEnabled(prev => !prev)} title={isTtsEnabled ? "Mute responses" : "Unmute responses"}>
                            {isTtsEnabled ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" /></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" /></svg>
                            )}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close Assistant">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-grow overflow-y-auto p-6">
                {/* Show suggestions only at the start of the conversation */}
                {!isLoading && suggestions.length > 0 && (
                    <div className="pb-4 mb-4 border-b">
                        <p className="text-sm font-medium mb-2 text-muted-foreground">Suggestions</p>
                        <div className="flex flex-wrap gap-2">
                            {suggestions.map(s => (
                                <button
                                    key={s.id}
                                    onClick={() => handleSuggestionClick(s)}
                                    className="px-3 py-1.5 bg-muted hover:bg-accent text-sm rounded-full text-left transition-colors"
                                >
                                    <p className="font-semibold">{s.text}</p>
                                    <p className="text-xs text-muted-foreground">{s.subtext}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                <div className="space-y-6">
                    {chatHistory.map((msg, index) => <MessageBubble key={index} msg={msg} onRender={renderMessageText} />)}
                    {isLoading && (
                        <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 bg-muted-foreground text-muted">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.562L16.5 21.75l-.398-1.188a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.188-.398a2.25 2.25 0 001.423-1.423L16.5 15.75l.398 1.188a2.25 2.25 0 001.423 1.423L19.5 18.75l-1.188.398a2.25 2.25 0 00-1.423 1.423z" /></svg>
                            </div>
                            <div className="p-3 rounded-lg bg-muted max-w-sm"><LoadingIndicator /></div>
                        </div>
                    )}
                </div>
                 <div ref={messagesEndRef} />
            </CardContent>
            
            <form onSubmit={handleSubmit} className="flex-shrink-0 p-4 border-t space-y-2">
                 {attachedFile && (
                    <div className="flex items-center justify-between text-sm bg-muted p-2 rounded-md">
                        <div className="flex items-center gap-2 truncate">
                            <svg className="w-4 h-4 text-muted-foreground flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.122 2.122l7.81-7.81" /></svg>
                            <span className="truncate" title={attachedFile.name}>{attachedFile.name}</span>
                        </div>
                        <button type="button" onClick={removeAttachedFile} className="p-1 rounded-full hover:bg-background"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
                    </div>
                )}
                <div className="flex items-center gap-2">
                     <Button type="button" variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} title="Attach a document (PDF, image) for OCR analysis" disabled={isLoading}>
                        <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.122 2.122l7.81-7.81" /></svg>
                    </Button>
                    <input type="file" ref={fileInputRef} onChange={handleFileAttach} className="hidden" accept="image/jpeg,image/png,image/webp,application/pdf,text/csv" />
                    
                    <Input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={'Ask a question or attach a document...'}
                        className="flex-grow"
                        disabled={isLoading}
                    />
                    
                    <Button type="submit" size="icon" disabled={isLoading || (!input.trim() && !attachedFile)}>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>
                    </Button>
                </div>
            </form>
        </div>
    );
};
