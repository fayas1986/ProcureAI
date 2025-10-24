
import React from 'react';
import type { DocumentTemplate, DocumentTemplateVersion } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './common/Card';

interface DocumentPreviewProps {
  template: Partial<DocumentTemplateVersion> & { backgroundType?: 'letterhead' | 'pattern' | 'none' };
}

const mockPreviewData = {
    poNumber: 'PO-2024-PREVIEW',
    orderDate: new Date().toLocaleDateString(),
    deliveryDate: new Date(new Date().setDate(new Date().getDate() + 14)).toLocaleDateString(),
    vendor: {
        name: 'Global Tech Components',
        address: '123 Tech Way<br>Silicon Valley, CA 94043',
    },
    billTo: {
        name: 'ProcureAI Inc.',
        address: '123 Innovation Drive<br>Metropolis, USA 12345',
    },
    items: [
        { desc: 'Intel Core i9-12900K Processor', qty: 2, price: 589.99 },
        { desc: 'Corsair Vengeance 32GB DDR5 RAM', qty: 2, price: 159.99 },
        { desc: 'Samsung 980 Pro 1TB NVMe SSD', qty: 4, price: 129.99 },
    ],
    subtotal: 1999.92,
    tax: 164.99,
    total: 2164.91,
};

const DocumentPreview: React.FC<DocumentPreviewProps> = ({ template }) => {
    const { 
        accentColor = '#0b64b1',
        fontFamily = 'Inter, sans-serif',
        layout = 'classic',
        logo,
        companyAddress,
        paymentTerms,
        backgroundType,
        letterhead,
        backgroundPatternUrl,
        watermark,
        signature,
        seal
    } = template;

    const previewStyle: React.CSSProperties = { fontFamily };
    if (backgroundType === 'letterhead' && letterhead) {
        previewStyle.backgroundImage = `url(${letterhead})`;
        previewStyle.backgroundSize = 'cover';
        previewStyle.backgroundPosition = 'center';
        previewStyle.backgroundRepeat = 'no-repeat';
    } else if (backgroundType === 'pattern' && backgroundPatternUrl) {
        previewStyle.backgroundImage = `url("${backgroundPatternUrl}")`;
    }
    
    const layoutClasses = {
        header: 'flex justify-between items-start',
        poDetails: 'text-right',
        addresses: 'flex justify-between mt-8',
    };
    if (layout === 'modern-left') {
        layoutClasses.header = 'flex items-start';
        layoutClasses.poDetails = 'text-left ml-auto';
    } else if (layout === 'modern-right') {
        layoutClasses.header = 'flex flex-row-reverse items-start';
        layoutClasses.poDetails = 'text-left mr-auto';
    }

    return (
        <Card className="shadow-lg">
             <CardHeader>
                <CardTitle>Live Preview</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="p-4 bg-muted/50 rounded-md">
                    <div className="mx-auto w-full aspect-[210/297] bg-card shadow-md p-8 text-foreground text-[10px] leading-relaxed relative overflow-hidden" style={previewStyle}>
                        {watermark && <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0"><span className="text-8xl font-bold uppercase text-foreground/5 transform -rotate-45" style={{ textShadow: '1px 1px 2px hsl(var(--background))' }}>{watermark}</span></div>}
                        
                        <div className={`relative z-10 ${layoutClasses.header}`}>
                            {logo && <img src={logo} alt="Logo" className="h-12 w-auto max-w-[150px]" />}
                            <div className={layoutClasses.poDetails}>
                                <h1 className="text-2xl font-bold" style={{ color: accentColor }}>PURCHASE ORDER</h1>
                                <p><strong>PO Number:</strong> {mockPreviewData.poNumber}</p>
                                <p><strong>Order Date:</strong> {mockPreviewData.orderDate}</p>
                            </div>
                        </div>

                        <div className={`relative z-10 ${layoutClasses.addresses}`}>
                            <div>
                                <p className="font-bold text-muted-foreground">VENDOR</p>
                                <p>{mockPreviewData.vendor.name}</p>
                                <div dangerouslySetInnerHTML={{ __html: mockPreviewData.vendor.address }} />
                            </div>
                            <div className="text-right">
                                 <p className="font-bold text-muted-foreground">SHIP TO / BILL TO</p>
                                <div dangerouslySetInnerHTML={{ __html: companyAddress || mockPreviewData.billTo.address }} />
                            </div>
                        </div>
                        
                        <div className="relative z-10 mt-8">
                            <table className="w-full text-left">
                                <thead style={{ backgroundColor: accentColor }} className="text-primary-foreground">
                                    <tr><th className="p-2">DESCRIPTION</th><th className="p-2 text-center">QTY</th><th className="p-2 text-right">UNIT PRICE</th><th className="p-2 text-right">TOTAL</th></tr>
                                </thead>
                                <tbody>
                                    {mockPreviewData.items.map((item, i) => (
                                        <tr key={i} className="border-b"><td className="p-2">{item.desc}</td><td className="p-2 text-center">{item.qty}</td><td className="p-2 text-right">${item.price.toFixed(2)}</td><td className="p-2 text-right">${(item.qty * item.price).toFixed(2)}</td></tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        
                        <div className="relative z-10 flex justify-end mt-4">
                            <div className="w-1/3">
                                <div className="flex justify-between"><p>Subtotal:</p><p>${mockPreviewData.subtotal.toFixed(2)}</p></div>
                                <div className="flex justify-between"><p>Tax (8.25%):</p><p>${mockPreviewData.tax.toFixed(2)}</p></div>
                                <div className="flex justify-between font-bold border-t mt-1 pt-1"><p>Total:</p><p>${mockPreviewData.total.toFixed(2)}</p></div>
                            </div>
                        </div>

                         <div className="absolute bottom-24 left-8 right-8 flex justify-between items-end z-10">
                            <div>
                                {signature && <img src={signature} alt="Signature" className="h-12 w-auto" />}
                                <div className="border-t pt-1 mt-1 text-xs">Authorized Signature</div>
                            </div>
                            {seal && <img src={seal} alt="Seal" className="h-16 w-16" />}
                        </div>
                        
                        <div className="absolute bottom-8 left-8 right-8 text-muted-foreground text-[8px] z-10" dangerouslySetInnerHTML={{ __html: paymentTerms || '' }}></div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default DocumentPreview;
