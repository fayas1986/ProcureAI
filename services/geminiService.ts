import { GoogleGenAI, Type } from "@google/genai";
import type { PurchaseOrder, Vendor, Material, ExtractedPOData, Requisition, GoodsReceipt, Invoice, RFQ, User, Role, AuditLog, SpendAnalytics, ExtractedRFQData, ExtractedGRNData, ExtractedInvoiceData, ChatMessage } from "../types";
import { VendorStatus } from "../types";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
    console.warn("API_KEY environment variable not set. AI Assistant will use mock data.");
}

const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

const generateReportFunctionDeclaration = {
  name: 'generateReport',
  description: 'Generates and downloads a CSV or PDF report based on user-specified data and filters.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      format: {
        type: Type.STRING,
        enum: ['csv', 'pdf'],
        description: 'The format of the report to generate.',
      },
      dataType: {
        type: Type.STRING,
        enum: ['purchaseOrders', 'requisitions', 'invoices', 'spendAnalytics', 'auditLogs'],
        description: 'The type of data to include in the report.',
      },
      filters: {
        type: Type.OBJECT,
        description: 'An object of filters to apply to the data. All filters are optional.',
        properties: {
          status: { type: Type.STRING, description: 'Filter by a specific status (e.g., "Pending", "Approved").' },
          vendorName: { type: Type.STRING, description: 'Filter by a specific vendor name.' },
          dateRange: {
              type: Type.OBJECT,
              description: "Filter by a date range. Can be relative like 'last 7 days', 'this month', or specific dates.",
              properties: {
                  from: { type: Type.STRING, description: 'Start date in YYYY-MM-DD format.' },
                  to: { type: Type.STRING, description: 'End date in YYYY-MM-DD format.' },
              }
          }
        }
      },
    },
    required: ['format', 'dataType'],
  },
};

const sendReminderEmailFunctionDeclaration = {
  name: 'sendReminderEmail',
  description: 'Sends a reminder email for a specific pending document like a Purchase Order, Invoice, or RFQ.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      entityType: {
        type: Type.STRING,
        enum: ['Purchase Order', 'Invoice', 'RFQ'],
        description: 'The type of document to send a reminder for.',
      },
      entityNumber: {
        type: Type.STRING,
        description: 'The specific number of the document (e.g., "PO-2024-00753", "GTC-INV-2024-963").',
      },
    },
    required: ['entityType', 'entityNumber'],
  },
};

const procurementContext = `
You are an expert AI co-assistant for a sophisticated MERN-stack procurement application. Your purpose is to answer questions based on the provided live data from the application. Your tone should be friendly, professional, and helpful. Use emojis where appropriate to make your responses more engaging (e.g., a greeting might include a 👋, a confirmation might include a ✅).

**Core Behavior:**
1.  **Be Concise:** Provide direct answers. Avoid verbosity unless the user asks for more detail.
2.  **Ask for Clarification:** If a user's query is vague (e.g., "show me recent orders"), ask clarifying questions (e.g., "For which vendor?" or "From the last 7 days?"). Be proactive but not presumptuous.
3.  **Remember Context:** Pay attention to the chat history to understand follow-up questions. If a user asks "which of those are for Global Tech?", you should know "those" refers to the documents from the previous turn.

**Language:** Your interaction language is English. Be flexible in your interpretation, as users may have various regional accents (e.g., American, British, Indian, Singaporean). Focus on the user's intent rather than strict grammatical correctness.

**1. Your Primary Role: Live Data Analyst**

You have access to live data from the user's dashboard, including **Purchase Orders (POs)**, **Purchase Requisitions (PRs)**, **Request for Quotations (RFQs)**, **Goods Receipt Notes (GRNs)**, **Invoices**, and lists of **Vendors**, **Materials**, **Users**, **Roles**, **Audit Logs (Audit Trail)**, and **Spend Analytics**. This data is provided in JSON format with each query. 
- A **Purchase Requisition (PR)** is an internal request.
- A **Request for Quotation (RFQ)** is a formal invitation for vendors to bid on items from a PR.
- A **Purchase Order (PO)** is a formal order to a vendor.
- A **Goods Receipt Note (GRN)** is a record of items received against a PO.
- An **Invoice** is a request for payment from a vendor.
- **Vendors** have specific **payment terms**.
- **Users** have assigned **Roles**, which contain a list of **Permissions**.
- **Audit Logs** track all significant actions performed by users.
- **Spend Analytics** provides aggregated spending data by vendor, category, and month/year.

**Crucially, whenever you mention a monetary value (like a total amount, unit price, or spend), you MUST always include the currency (e.g., '$1,200 USD', '€550 EUR').**

Your main job is to analyze this live data to answer user questions. If a question can be answered from this data, you should prioritize it.

**Advanced Document Analysis & OCR Engine:**
When a user uploads a document (e.g., PDF, image, CSV), you must act as a powerful OCR engine with analytical capabilities.
1.  **Recognize & Translate:** Automatically perform OCR on the document to read all text and numerical data, regardless of the original language (e.g., Spanish, French, German, Chinese, etc.).
2.  **Initial Analysis in English:** Your first response after a document upload MUST be in English. It should include:
    a.  **Document Identification:** Identify the type of document and its original language (e.g., "This appears to be a purchase order written in German.").
    b.  **Provide Insights:** Offer a concise summary of the document's key information, with a strong emphasis on extracting all relevant numerical data (e.g., PO number, quantities, prices, subtotals, total amounts, taxes, dates). This serves as your initial insight.
3.  **Answer User's Question:** After providing the initial insights, use the extracted and translated information to directly answer the user's specific question from their prompt (e.g., "What is the due date?", "Summarize this quote."). If the user's prompt was generic (like "analyze this"), your initial summary serves as the full answer.
4.  **Prioritize Document:** The attached document is the primary source of truth. Always prioritize its content over the live application data when answering questions related to the document.

**2. Google Search for External Information**

If a user's question cannot be answered using the provided live procurement data (e.g., it's about current events, public information, general knowledge, recent news, or up-to-date information), use the integrated Google Search tool to find an answer.

**3. Linking to Documents**

When you mention a specific document (like a PO, PR, RFQ, Invoice, or GRN), you MUST embed a special link in your response. Use the format \`[ENTITY_TYPE:ENTITY_NUMBER]\`.
- For a Purchase Order: \`[PO:PO-2024-00751]\`
- For a Requisition: \`[PR:PR-2024-001]\`
- For an RFQ: \`[RFQ:RFQ-2024-001]\`
- For an Invoice: \`[INV:GTC-INV-2024-951]\`
- For a Goods Receipt: \`[GRN:GRN-2024-001]\`

**Example Response:** "Yes, Purchase Order [PO:PO-2024-00753] is currently awaiting payment. It was generated from requisition [PR:PR003]."

**4. Advanced Query Capabilities & Data Analysis**

You are expected to perform complex data analysis by combining information from different data sources.

*   **Procurement Flow Queries:** You can answer questions about the full procure-to-pay lifecycle.
    *   **Example:** "What is the status of the invoice for [PO:PO-2024-00751]?"
    *   **Your Process:** Find the PO, then find the corresponding Invoice using the \`poId\` and report its status.

*   **Spend Analysis Queries:** For questions about spending, **prioritize using the \`spendAnalytics\` data** as it is optimized for this purpose. This data is pre-aggregated by vendor, category, month, and year.
    *   **Example:** "How much did we spend on 'Computer Components' last quarter?"
    *   **Your Process:** 
        1. Identify the current date to determine the months of the last quarter.
        2. Filter the \`spendAnalytics\` data for \`category: 'Computer Components'\`.
        3. Further filter this data for the year and months corresponding to the last quarter.
        4. Sum the \`total_spent\` from the filtered records.
        5. If the user asks about a vendor, filter by \`vendor_id\` after finding the vendor's ID from the \`Vendors\` list.
    *   **Fallback:** If \`spendAnalytics\` does not have the required granularity, you can calculate spend directly from the \`purchaseOrders\` list. Only consider POs with statuses like 'Approved', 'Invoiced', or 'Closed' as actual spend.

*   **Filtering and Aggregation:** You can answer questions that require filtering data and performing aggregations (counts, sums, averages).
    *   **Example:** "Show me all pending requisitions from the IT department."
    *   **Your Process:** 
        1. Look at the \`requisitions\` data.
        2. Filter for items where \`department\` is 'IT'.
        3. Further filter those results for items where \`status\` is 'Pending Approval'.
        4. List the \`prNumber\` of the matching requisitions.

*   **User and Role Queries:** You can inspect user roles to determine their permissions.
    *   **Example:** "Which users can approve purchase orders?"
    *   **Your Process:** Find the 'Role' with 'APPROVE_PO' in its permissions list, then find all 'Users' assigned to that role.

*   **Date-Based Queries:** You can understand relative dates like "today", "last week", "this month", "last quarter", "this year", and specific date ranges. Always use the provided data's date fields (\`orderDate\`, \`requestDate\`, \`invoiceDate\`, etc.) for filtering.
*   **Audit Trail Queries:** You can search the audit logs for actions related to a specific user or document.
    *   **Example:** "Show me the audit trail for [PO:PO-2024-00751]."

**5. Tool Usage: Report Generation & Reminders**
You have access to special tools to perform actions.

*   **Report Generation**: If the user asks to "generate a report", "create a CSV", or "download a PDF" of any data, you MUST use the \`generateReport\` function. Provide the \`format\` ('csv' or 'pdf'), the \`dataType\` (e.g., 'purchaseOrders'), and any \`filters\` mentioned by the user.

*   **Sending Reminders**: If a user asks to "send a reminder", "nudge someone", or "follow up" on a pending item (PO, Invoice, RFQ), you MUST use the \`sendReminderEmail\` function.
    *   **Logic:** Determine the entity type ('Purchase Order', 'Invoice', 'RFQ') and its specific number from the user's query and the conversation context.
    *   **Example:** User says "Please follow up on PO-2024-00753." -> Call \`sendReminderEmail\` with \`entityType: 'Purchase Order'\` and \`entityNumber: 'PO-2024-00753'\`.
    *   **Example:** User says "Remind the vendor about invoice GTC-INV-2024-963." -> Call \`sendReminderEmail\` with \`entityType: 'Invoice'\` and \`entityNumber: 'GTC-INV-2024-963'\`.
`;

export const askProcurementQuestion = async (
  query: string,
  purchaseOrders: PurchaseOrder[],
  vendors: Vendor[],
  requisitions: Requisition[],
  materials: Material[],
  goodsReceipts?: GoodsReceipt[],
  invoices?: Invoice[],
  rfqs?: RFQ[],
  users?: User[],
  roles?: Role[],
  auditLogs?: AuditLog[],
  spendAnalytics?: SpendAnalytics[],
  chatHistory?: ChatMessage[],
  file?: File | null
): Promise<{ text: string; sources?: any[]; functionCalls?: any[] }> => {
  if (!ai) {
    // Mock response if API key is not available
    await new Promise(resolve => setTimeout(resolve, 1000));
     if (file) {
        return { text: `This is a mock response demonstrating document analysis. Based on the document you uploaded (${file.name}), I can provide a summary or answer specific questions. For example, I can tell you the total amount from an invoice PDF.` };
    }
    if (query.toLowerCase().includes("latest news") || query.toLowerCase().includes("what is")) {
        return { 
            text: `This is a mock response demonstrating search grounding. Based on external information, here is an answer to your query about "${query}".`,
            sources: [
                { web: { uri: 'https://www.google.com/search?q=' + encodeURIComponent(query), title: `Search results for: ${query}` } },
                { web: { uri: 'https://en.wikipedia.org/wiki/Procurement', title: 'Procurement - Wikipedia' } }
            ]
        };
    }
     if (query.toLowerCase().includes("report") || query.toLowerCase().includes("csv") || query.toLowerCase().includes("pdf")) {
        return {
            text: '',
            functionCalls: [{
                name: 'generateReport',
                args: { format: 'csv', dataType: 'purchaseOrders', filters: { status: 'PendingL1Approval' } }
            }]
        };
    }
    if (query.toLowerCase().includes("remind") || query.toLowerCase().includes("nudge") || query.toLowerCase().includes("follow up")) {
        const poMatch = query.match(/PO-\d{4}-\d{5}/);
        if (poMatch) {
            return {
                text: '',
                functionCalls: [{
                    name: 'sendReminderEmail',
                    args: { entityType: 'Purchase Order', entityNumber: poMatch[0] }
                }]
            };
        }
    }
    return { text: `This is a mock response because the Gemini API key is not configured. With live data, I can answer questions across the entire application. For example: "Which users can approve POs?" or "What was our total spend last month?". I can also link you directly to documents like [PO:PO-2024-00751].` };
  }
  
  try {
    const liveDataContext = `
Here is the current live data. Use this to answer the user's question:

**Purchase Orders:**
${JSON.stringify(purchaseOrders, null, 2)}

**Purchase Requisitions:**
${JSON.stringify(requisitions, null, 2)}

**Request for Quotations:**
${rfqs ? JSON.stringify(rfqs, null, 2) : 'N/A'}

**Goods Receipts:**
${goodsReceipts ? JSON.stringify(goodsReceipts, null, 2) : 'N/A'}

**Invoices:**
${invoices ? JSON.stringify(invoices, null, 2) : 'N/A'}

**Vendors:**
${JSON.stringify(vendors, null, 2)}

**Materials:**
${JSON.stringify(materials, null, 2)}

**Users:**
${users ? JSON.stringify(users, null, 2) : 'N/A'}

**Roles:**
${roles ? JSON.stringify(roles, null, 2) : 'N/A'}

**Audit Trail:**
${auditLogs ? JSON.stringify(auditLogs, null, 2) : 'N/A'}

**Spend Analytics:**
${spendAnalytics ? JSON.stringify(spendAnalytics, null, 2) : 'N/A'}
`;
    
    // This maps the entire chat history, including the latest user message
    const history = (chatHistory || []).map(msg => ({
        role: msg.sender === 'user' ? 'user' as const : 'model' as const,
        parts: [{ text: msg.text.replace(/ \(File Attached: .*\)/, '') }]
    }));

    // The last message in history is the user's current query, but without the context.
    // We remove it and build a new, complete user turn that includes the live data context and any files.
    const historyWithoutLastTurn = history.length > 0 && history[history.length - 1].role === 'user'
        ? history.slice(0, -1)
        : history;

    const userParts: ({ text: string } | { inlineData: { data: string; mimeType: string; } })[] = [];
    
    // The main prompt text includes the query and the live data context.
    let promptText = `Given the live data below, answer this question: "${query}"\n\n${liveDataContext}`;

    if (file) {
        const filePart = await fileToGenerativePart(file);
        if ('text' in filePart) {
            // If the file is text-based (like a CSV), append its content to the prompt.
            promptText += `\n\nAdditionally, consider the following attached data:\n${filePart.text}`;
        } else {
            // For binary files (images, PDFs), add them as a separate inlineData part.
            userParts.push(filePart);
        }
    }

    // The main prompt text is always the first part of the user's turn.
    userParts.unshift({ text: promptText });

    const finalUserTurn = {
        role: 'user' as const,
        parts: userParts
    };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [...historyWithoutLastTurn, finalUserTurn],
      config: {
        systemInstruction: procurementContext,
        // tools: [{functionDeclarations: [generateReportFunctionDeclaration, sendReminderEmailFunctionDeclaration]}, {googleSearch: {}}],
      }
    });
    
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const functionCalls = response.functionCalls;
    
    return { text: response.text, sources, functionCalls };

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return { text: "I'm sorry, but I'm having trouble connecting to my knowledge base. Please check the API configuration and try again." };
  }
};

const fileToGenerativePart = async (file: File) => {
  if (file.type === 'text/csv') {
    const text = await file.text();
    return { text: `CSV Data:\n${text}` };
  }
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
};

export const extractPODataFromDocument = async (
  file: File,
  vendors: Vendor[],
  materials: Material[]
): Promise<ExtractedPOData | null> => {
  if (!ai) {
    console.warn("Gemini API key not configured. Cannot process document.");
    await new Promise(resolve => setTimeout(resolve, 2000));
    return {
        supplierName: "Global Tech Components",
        poNo: "QT-98765",
        issueDate: "2024-07-25",
        lines: [
            { description: "Intel Core i9-12900K Processor", sku: "CPU-I9-12900K", qty: 50, unitPrice: 550 },
        ]
    };
  }

  try {
    const filePart = await fileToGenerativePart(file);
    
    const knownDataPrompt = `
    Known Vendors: ${JSON.stringify(vendors.map(s => s.name))}
    Known Materials: ${JSON.stringify(materials.map(m => ({sku: m.sku, description: m.description})))}
    `;

    const responseSchema = {
        type: Type.OBJECT,
        properties: {
          supplierName: { type: Type.STRING, description: "The name of the supplier/vendor. Match it to the known vendors list if possible." },
          poNo: { type: Type.STRING, description: "The quote number or purchase order number from the document." },
          issueDate: { type: Type.STRING, description: "The date on the document, formatted as YYYY-MM-DD." },
          lines: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                description: { type: Type.STRING },
                sku: { type: Type.STRING, description: "The SKU or item code, if available." },
                qty: { type: Type.NUMBER },
                unitPrice: { type: Type.NUMBER },
              },
              required: ['description', 'qty', 'unitPrice']
            },
          },
        },
        required: ['supplierName', 'lines']
    };
    
    const parts: ({ text: string; } | { inlineData: { data: string; mimeType: string; }; })[] = [];
    let promptText = 'You are an expert data extraction AI. Analyze the document and extract PO data according to the schema.';
    promptText += `\n\n${knownDataPrompt}`;

    if('text' in filePart) {
        promptText += `\n\n${filePart.text}`;
    }
    parts.push({ text: promptText });
    if (!('text' in filePart)) {
        parts.push(filePart);
    }

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts },
        config: {
            responseMimeType: "application/json",
            responseSchema,
        }
    });

    const jsonText = response.text.trim();
    return JSON.parse(jsonText) as ExtractedPOData;

  } catch (error) {
    console.error("Error extracting data from document with Gemini:", error);
    return null;
  }
};

export const extractPurchaseOrdersFromDocument = async (
  file: File
): Promise<{ purchaseOrders: ExtractedPOData[] } | null> => {
  if (!ai) {
    // mock response
    return {
      purchaseOrders: [
        {
          supplierName: "Global Tech Components",
          poNo: `MOCK-PO-${Date.now()}`,
          issueDate: "2024-07-28",
          lines: [
            { description: "Intel Core i9-12900K Processor", sku: "CPU-I9-12900K", qty: 10, unitPrice: 550 },
            { description: "Corsair Vengeance 32GB DDR5 RAM", sku: "RAM-DDR5-32GB", qty: 10, unitPrice: 150 },
          ]
        },
        {
          supplierName: "Office Supply Kings",
          poNo: `MOCK-PO-${Date.now()+1}`,
          issueDate: "2024-07-29",
          lines: [
            { description: "A4 Printing Paper (500 sheets)", sku: "PAPER-A4-500", qty: 50, unitPrice: 5 },
          ]
        }
      ]
    };
  }

  try {
    const filePart = await fileToGenerativePart(file);

    const poSchema = {
      type: Type.OBJECT,
      properties: {
        supplierName: { type: Type.STRING },
        poNo: { type: Type.STRING },
        issueDate: { type: Type.STRING, description: "YYYY-MM-DD format" },
        lines: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              description: { type: Type.STRING },
              sku: { type: Type.STRING },
              qty: { type: Type.NUMBER },
              unitPrice: { type: Type.NUMBER },
            },
            required: ['description', 'qty', 'unitPrice']
          },
        },
      },
      required: ['supplierName', 'poNo', 'issueDate', 'lines']
    };

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        purchaseOrders: {
          type: Type.ARRAY,
          description: "An array of purchase orders extracted from the document.",
          items: poSchema,
        }
      }
    };

    const parts: ({ text: string; } | { inlineData: { data: string; mimeType: string; }; })[] = [];
    let promptText = 'You are an expert data extraction AI. Analyze the document (which could be a CSV or PDF containing multiple POs) and extract all purchase order data according to the schema. If it is a CSV, use headers like "PO Number", "Vendor", "Date", "Item Description", "SKU", "Quantity", "Unit Price".';
    
    if('text' in filePart) {
        promptText += `\n\n${filePart.text}`;
    }
    parts.push({ text: promptText });
    if (!('text' in filePart)) {
        parts.push(filePart);
    }

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts },
        config: {
            responseMimeType: "application/json",
            responseSchema,
        }
    });
    const jsonText = response.text.trim();
    return JSON.parse(jsonText);
  } catch (error) {
    console.error("Error extracting bulk POs from document:", error);
    return null;
  }
};

export const extractGoodsReceiptsFromDocument = async (
  file: File
): Promise<{ goodsReceipts: ExtractedGRNData[] } | null> => {
  if (!ai) {
    // mock response
    return {
      goodsReceipts: [
        {
          poNumber: "PO-2024-00751",
          grnNumber: `MOCK-GRN-${Date.now()}`,
          receivedDate: "2024-07-28",
          receivedByName: "Alice Smith",
          items: [
            { description: "Samsung 980 Pro 1TB NVMe SSD", sku: "SSD-NVME-1TB", receivedQty: 20, acceptedQty: 20, rejectedQty: 0 },
          ],
          notes: "Mocked from bulk upload."
        }
      ]
    };
  }

  try {
    const filePart = await fileToGenerativePart(file);

    const grnItemSchema = {
        type: Type.OBJECT,
        properties: {
            sku: { type: Type.STRING },
            description: { type: Type.STRING },
            receivedQty: { type: Type.NUMBER },
            acceptedQty: { type: Type.NUMBER },
            rejectedQty: { type: Type.NUMBER },
            rejectionReason: { type: Type.STRING },
        },
        required: ['description', 'receivedQty', 'acceptedQty', 'rejectedQty']
    };

    const grnSchema = {
      type: Type.OBJECT,
      properties: {
        poNumber: { type: Type.STRING },
        grnNumber: { type: Type.STRING, description: "Delivery note number from the document" },
        receivedDate: { type: Type.STRING, description: "YYYY-MM-DD format" },
        receivedByName: { type: Type.STRING, description: "Name of the person who received the goods." },
        items: {
          type: Type.ARRAY,
          items: grnItemSchema,
        },
        notes: { type: Type.STRING },
      },
      required: ['poNumber', 'receivedDate', 'receivedByName', 'items']
    };

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        goodsReceipts: {
          type: Type.ARRAY,
          description: "An array of Goods Receipt Notes extracted from the document.",
          items: grnSchema,
        }
      }
    };
    
    const parts: ({ text: string; } | { inlineData: { data: string; mimeType: string; }; })[] = [];
    let promptText = 'You are an expert data extraction AI. Analyze the delivery note (CSV or PDF) and extract all Goods Receipt Note (GRN) data items according to the schema. For CSV, use headers like "PO Number", "Delivery Note Number", "Received Date", "Received By", "Item SKU", "Item Description", "Received Qty", "Accepted Qty", "Rejected Qty", "Rejection Reason", "Notes".';

    if('text' in filePart) {
        promptText += `\n\n${filePart.text}`;
    }
    parts.push({ text: promptText });
    if (!('text' in filePart)) {
        parts.push(filePart);
    }

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts },
        config: {
            responseMimeType: "application/json",
            responseSchema,
        }
    });
    const jsonText = response.text.trim();
    return JSON.parse(jsonText);
  } catch (error) {
    console.error("Error extracting bulk GRNs from document:", error);
    return null;
  }
};

export const extractInvoicesFromDocument = async (
  file: File
): Promise<{ invoices: ExtractedInvoiceData[] } | null> => {
  if (!ai) {
    return {
      invoices: [
        {
          poNumber: "PO-2024-00753",
          invoiceNumber: `MOCK-INV-${Date.now()}`,
          invoiceDate: "2024-07-29",
          dueDate: "2024-08-28",
          subtotal: 7350.00,
          taxAmount: 606.38,
          amount: 7956.38,
          notes: "Mocked from bulk upload."
        }
      ]
    };
  }

  try {
    const filePart = await fileToGenerativePart(file);

    const invoiceSchema = {
      type: Type.OBJECT,
      properties: {
        poNumber: { type: Type.STRING },
        invoiceNumber: { type: Type.STRING },
        invoiceDate: { type: Type.STRING, description: "YYYY-MM-DD format" },
        dueDate: { type: Type.STRING, description: "YYYY-MM-DD format" },
        subtotal: { type: Type.NUMBER },
        taxAmount: { type: Type.NUMBER },
        amount: { type: Type.NUMBER, description: "Total amount" },
        notes: { type: Type.STRING },
      },
      required: ['poNumber', 'invoiceNumber', 'invoiceDate', 'dueDate', 'subtotal', 'taxAmount', 'amount']
    };

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        invoices: {
          type: Type.ARRAY,
          description: "An array of invoices extracted from the document.",
          items: invoiceSchema,
        }
      }
    };
    
    const parts: ({ text: string; } | { inlineData: { data: string; mimeType: string; }; })[] = [];
    let promptText = 'You are an expert data extraction AI. Analyze the invoice document (CSV or PDF) and extract all invoice data items according to the schema. For CSV, use headers like "PO Number", "Invoice Number", "Invoice Date", "Due Date", "Subtotal", "Tax Amount", "Total Amount", "Notes".';
    
    if('text' in filePart) {
        promptText += `\n\n${filePart.text}`;
    }
    parts.push({ text: promptText });
    if (!('text' in filePart)) {
        parts.push(filePart);
    }

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts },
        config: {
            responseMimeType: "application/json",
            responseSchema,
        }
    });
    const jsonText = response.text.trim();
    return JSON.parse(jsonText);
  } catch (error) {
    console.error("Error extracting bulk invoices from document:", error);
    return null;
  }
};

export const extractRFQsFromDocument = async (
  file: File
): Promise<{ rfqs: ExtractedRFQData[] } | null> => {
  if (!ai) {
    return {
      rfqs: [
        {
          prNumber: "PR-2024-002",
          dueDate: "2024-08-15",
          invitedVendorNames: ["Global Tech Components", "Office Supply Kings"],
        }
      ]
    };
  }

  try {
    const filePart = await fileToGenerativePart(file);

    const rfqSchema = {
      type: Type.OBJECT,
      properties: {
        prNumber: { type: Type.STRING, description: "The source Purchase Requisition number." },
        dueDate: { type: Type.STRING, description: "The submission due date in YYYY-MM-DD format." },
        invitedVendorNames: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "A list of vendor names to invite."
        },
      },
      required: ['prNumber', 'dueDate', 'invitedVendorNames']
    };

    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        rfqs: {
          type: Type.ARRAY,
          description: "An array of RFQs to be created from the document.",
          items: rfqSchema,
        }
      }
    };
    
    const parts: ({ text: string; } | { inlineData: { data: string; mimeType: string; }; })[] = [];
    let promptText = 'You are an expert data extraction AI. Analyze the document (CSV or PDF) and extract all Request for Quotation (RFQ) data items according to the schema. For CSV, use headers like "PR Number", "Due Date", and multiple "Vendor Name" columns or a comma-separated list in one column.';
    
    if('text' in filePart) {
        promptText += `\n\n${filePart.text}`;
    }
    parts.push({ text: promptText });
    if (!('text' in filePart)) {
        parts.push(filePart);
    }

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts },
        config: {
            responseMimeType: "application/json",
            responseSchema,
        }
    });
    const jsonText = response.text.trim();
    return JSON.parse(jsonText);
  } catch (error) {
    console.error("Error extracting bulk RFQs from document:", error);
    return null;
  }
};

export const extractMaterialsFromDocument = async (file: File): Promise<{ materials: Omit<Material, '_id'>[] } | null> => {
    if (!ai) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        return {
            materials: [
                { sku: 'MOCK-SKU-01', description: 'Mock Material 1 from CSV/PDF', category: 'Mock Category', uom: 'EA', defaultPrice: 99.99 },
                { sku: 'MOCK-SKU-02', description: 'Mock Material 2 from CSV/PDF', category: 'Mock Category', uom: 'BOX', defaultPrice: 125.50 },
            ]
        };
    }
    
    try {
        const filePart = await fileToGenerativePart(file);
        const responseSchema = {
            type: Type.OBJECT,
            properties: {
                materials: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            sku: { type: Type.STRING },
                            description: { type: Type.STRING },
                            category: { type: Type.STRING },
                            uom: { type: Type.STRING, description: "Unit of Measure (e.g., EA, KG, BOX)" },
                            defaultPrice: { type: Type.NUMBER },
                        },
                        required: ['sku', 'description', 'uom', 'defaultPrice']
                    }
                }
            }
        };
        
        const parts: ({ text: string; } | { inlineData: { data: string; mimeType: string; }; })[] = [];
        let promptText = 'You are an expert data extraction AI. Analyze the document (CSV or PDF) and extract all material data items. For CSV, use headers like "SKU", "Description", "Category", "UOM", "Price". For PDFs, parse text to find these fields. Return the data according to the provided JSON schema.';
        
        if('text' in filePart) {
            promptText += `\n\n${filePart.text}`;
        }
        parts.push({ text: promptText });
        if (!('text' in filePart)) {
            parts.push(filePart);
        }

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts },
            config: {
                responseMimeType: "application/json",
                responseSchema,
            }
        });
        const jsonText = response.text.trim();
        return JSON.parse(jsonText);

    } catch (error) {
        console.error("Error extracting materials from document:", error);
        return null;
    }
};

export const extractVendorsFromDocument = async (file: File): Promise<{ vendors: Omit<Vendor, '_id'>[] } | null> => {
    if (!ai) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        return {
            vendors: [
                { name: 'Mock Vendor A', supplierCode: 'MOCK-A-001', contacts: [{ name: 'John Mock', email: 'john@mock.com', phone: '111-222-3333' }], rating: 4.5, status: VendorStatus.Active, defaultCurrency: 'USD', paymentTerms: 'Net 30' },
                { name: 'Mock Vendor B', supplierCode: 'MOCK-B-002', contacts: [{ name: 'Jane Mock', email: 'jane@mock.com', phone: '444-555-6666' }], rating: 4.8, status: VendorStatus.Active, defaultCurrency: 'EUR', paymentTerms: 'Net 60' },
            ]
        };
    }

    try {
        const filePart = await fileToGenerativePart(file);
        const responseSchema = {
            type: Type.OBJECT,
            properties: {
                vendors: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING },
                            supplierCode: { type: Type.STRING },
                            contacts: {
                                type: Type.ARRAY,
                                description: 'An array of contact persons for the vendor.',
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        name: { type: Type.STRING },
                                        email: { type: Type.STRING },
                                        phone: { type: Type.STRING },
                                    },
                                },
                            },
                            rating: { type: Type.NUMBER },
                            status: { type: Type.STRING, enum: Object.values(VendorStatus) },
                            defaultCurrency: { type: Type.STRING, enum: ['USD', 'EUR', 'INR', 'AED', 'SAR', 'QAR', 'KWD', 'OMR', 'BHD', 'JOD', 'EGP', 'ILS', 'TRY'] },
                            address: { type: Type.STRING },
                            taxId: { type: Type.STRING },
                            paymentTerms: { type: Type.STRING },
                        },
                        required: ['name', 'supplierCode']
                    }
                }
            }
        };
        
        const parts: ({ text: string; } | { inlineData: { data: string; mimeType: string; }; })[] = [];
        let promptText = 'You are an expert data extraction AI. Analyze the document (CSV or PDF) and extract all vendor data items. For CSV, use headers like "Name", "Code", "Contact Name", "Contact Email", "Rating", "Status", "Currency", "Address", "Tax ID", "Payment Terms". For PDFs, parse text to find these fields. Return the data according to the provided JSON schema.';

        if('text' in filePart) {
            promptText += `\n\n${filePart.text}`;
        }
        parts.push({ text: promptText });
        if (!('text' in filePart)) {
            parts.push(filePart);
        }

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts },
            config: {
                responseMimeType: "application/json",
                responseSchema,
            }
        });
        const jsonText = response.text.trim();
        return JSON.parse(jsonText);

    } catch (error) {
        console.error("Error extracting vendors from document:", error);
        return null;
    }
};
