import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ToastProvider } from './src/hooks/useToast.tsx';
import { mockPurchaseOrders, vendors as mockVendors, materials as mockMaterials, mockUsers, mockAuditLogs, mockRequisitions, mockGoodsReceipts, mockInvoices, mockRFQs, mockRoles, mockSpendAnalytics, mockPOTemplates, mockDocumentTemplates } from './data/mockData';
import type { PurchaseOrder, Vendor, Material, User, AuditLog, Requisition, GoodsReceipt, Invoice, Payment, RFQ, Quotation, ApprovalWorkflow, Role, Permission, SpendAnalytics, POTemplate, Currency, DocumentTemplate, ChatMessage } from './types';
import { RequisitionStatus, POStatus, InvoiceStatus, RFQStatus, RFQVendorResponseStatus, ApprovalStepStatus } from './types';
import PurchaseOrderDashboard from './components/PurchaseOrderDashboard';
import RequisitionsDashboard from './components/RequisitionsDashboard';
import MaterialsDashboard from './components/MaterialsDashboard';
import SuppliersDashboard from './components/SuppliersDashboard';
import AuditTrailDashboard from './components/POHistoryDashboard';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import GoodsReceiptDashboard from './components/GoodsReceiptDashboard';
import InvoicingDashboard from './components/InvoicingDashboard';
import RFQDashboard from './components/RFQDashboard';
import UserManagementDashboard from './components/UserManagementDashboard';
import RoleManagementDashboard from './components/RoleManagementDashboard';
import SpendAnalyticsDashboard from './components/SpendAnalyticsDashboard';
import OperationalBIDashboard from './components/OperationalBIDashboard';
import MasterReportDashboard from './components/MasterReportDashboard';
import POTemplatesDashboard from './components/POTemplatesDashboard';
import ReportDesignerDashboard from './components/ReportDesignerDashboard';
import ThemeSwitcher from './components/ThemeSwitcher';
import { themes } from './themes';
import type { Theme } from './themes';
import { sendPOStatusUpdateEmail, sendApprovalRequestEmail, sendRequisitionStatusUpdateEmail, sendInvoiceStatusUpdateEmail } from './services/emailService';
import { AIAssistant } from './components/AIAssistant';
import { Button } from './components/common/Button';
import { fetchExchangeRates } from './services/currencyService';
import CurrencySwitcher from './components/common/CurrencySwitcher';
import LoginScreen from './components/LoginScreen';
import ProfilePage from './components/ProfilePage';
import { Avatar } from './components/common/Avatar';
import ForcePasswordResetModal from './components/ForcePasswordResetModal';
import { GoogleGenAI, Modality } from '@google/genai';
import ConnectivityIndicator from './components/common/ConnectivityIndicator';


export type View = 'pos' | 'requisitions' | 'materials' | 'vendors' | 'analytics' | 'audit-trail' | 'grns' | 'invoices' | 'rfqs' | 'users' | 'roles' | 'spend-analytics' | 'operational-bi' | 'master-report' | 'po-templates' | 'document-templates' | 'profile';
export type EntityType = 'Requisition' | 'Purchase Order' | 'Invoice';
export type EntityShortType = 'PO' | 'PR' | 'RFQ' | 'INV' | 'GRN';

interface AppData {
    purchaseOrders: PurchaseOrder[];
    poTemplates: POTemplate[];
    documentTemplates: DocumentTemplate[];
    requisitions: Requisition[];
    vendors: Vendor[];
    materials: Material[];
    users: User[];
    roles: Role[];
    auditLogs: AuditLog[];
    goodsReceipts: GoodsReceipt[];
    invoices: Invoice[];
    rfqs: RFQ[];
    spendAnalytics: SpendAnalytics[];
}

type QueuedAction = { type: string; payload: any; timestamp: string };

interface NavButtonProps {
    view: View;
    label: string;
    activeView: View;
    onClick: (view: View) => void;
    icon: React.ReactNode;
    isSidebarOpen: boolean;
}

const NavButton: React.FC<NavButtonProps> = ({ view, label, activeView, onClick, icon, isSidebarOpen }) => (
    <button
        onClick={() => onClick(view)}
        className={`w-full flex items-center text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            activeView === view
            ? 'bg-primary text-primary-foreground'
            : 'text-slate-400 hover:bg-slate-700 hover:text-white'
        }`}
    >
        {icon}
        <span className={`ml-3 whitespace-nowrap transition-opacity duration-200 ${isSidebarOpen ? 'opacity-100' : 'opacity-0'}`}>{label}</span>
    </button>
);

const iconBaseClass = "w-5 h-5 flex-shrink-0";
const icons = {
    requisitions: <svg className={iconBaseClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>,
    rfqs: <svg className={iconBaseClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16l2.879-2.879a3 3 0 014.242 0L20 18M10 12a2 2 0 110-4 2 2 0 010 4z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h.01M21 10h.01M12 3v.01M12 21v.01M4.22 4.22l.01.01M19.78 4.22l.01.01M4.22 19.78l.01.01M19.78 19.78l.01.01" /></svg>,
    pos: <svg className={iconBaseClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
    'po-templates': <svg className={iconBaseClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>,
    'document-templates': <svg className={iconBaseClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>,
    grns: <svg className={iconBaseClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
    invoices: <svg className={iconBaseClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
    materials: <svg className={iconBaseClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>,
    vendors: <svg className={iconBaseClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m-1 4h1m-1 4h1m6-10v3m0 3v3" /></svg>,
    users: <svg className={iconBaseClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
    roles: <svg className={iconBaseClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 20.944A12.02 12.02 0 0012 22a12.02 12.02 0 009-1.056h0c1.307-1.307 1.307-3.431 0-4.738z" /></svg>,
    'operational-bi': <svg className={iconBaseClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
    analytics: <svg className={iconBaseClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>,
    'spend-analytics': <svg className={iconBaseClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>,
    'audit-trail': <svg className={iconBaseClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    'master-report': <svg className={iconBaseClass} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>,
};

const GLOBAL_ADMIN_PASSWORD = 'masterkey2024!';

const initialAppData: AppData = {
    purchaseOrders: mockPurchaseOrders,
    poTemplates: mockPOTemplates,
    documentTemplates: mockDocumentTemplates,
    requisitions: mockRequisitions,
    vendors: mockVendors,
    materials: mockMaterials,
    users: mockUsers,
    roles: mockRoles,
    auditLogs: mockAuditLogs,
    goodsReceipts: mockGoodsReceipts,
    invoices: mockInvoices,
    rfqs: mockRFQs,
    spendAnalytics: mockSpendAnalytics,
};

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}


const App: React.FC = () => {
    const [appData, setAppData] = useState<AppData>(() => {
        try {
            const saved = localStorage.getItem('appData');
            return saved ? JSON.parse(saved) : initialAppData;
        } catch {
            return initialAppData;
        }
    });

    const { purchaseOrders, poTemplates, documentTemplates, requisitions, vendors, materials, users, roles, auditLogs, goodsReceipts, invoices, rfqs, spendAnalytics } = appData;

    const [activeView, setActiveView] = useState<View>('requisitions');
    const [currentUser, setCurrentUser] = useState<User | null>(null);

    useEffect(() => {
        try {
            localStorage.setItem('appData', JSON.stringify(appData));
        } catch (error) {
            console.error("Failed to save app data to localStorage", error);
        }
    }, [appData]);

    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced'>('idle');
    
    const [actionQueue, setActionQueue] = useState<QueuedAction[]>(() => {
        try {
            const saved = localStorage.getItem('actionQueue');
            return saved ? JSON.parse(saved) : [];
        } catch { return []; }
    });

    useEffect(() => {
        localStorage.setItem('actionQueue', JSON.stringify(actionQueue));
    }, [actionQueue]);

     const updateStateAndQueue = (updater: (prev: AppData) => AppData, actionType: string, payload: any) => {
        setAppData(updater); // Optimistic UI update
        if (!isOnline) {
            setActionQueue(prev => [...prev, { type: actionType, payload, timestamp: new Date().toISOString() }]);
        }
    };
    
    useEffect(() => {
        const goOnline = () => {
            setIsOnline(true);
            if(currentUser) {
                updateStateAndQueue(prev => ({...prev, users: prev.users.map(u => u._id === currentUser._id ? {...u, isOnline: true } : u)}), 'SET_USER_ONLINE', { userId: currentUser._id });
            }
        }
        const goOffline = () => {
            setIsOnline(false);
            if(currentUser) {
                updateStateAndQueue(prev => ({...prev, users: prev.users.map(u => u._id === currentUser._id ? {...u, isOnline: false } : u)}), 'SET_USER_OFFLINE', { userId: currentUser._id });
            }
        };
        window.addEventListener('online', goOnline);
        window.addEventListener('offline', goOffline);
        return () => {
            window.removeEventListener('online', goOnline);
            window.removeEventListener('offline', goOffline);
        };
    }, [currentUser]);

    useEffect(() => {
        let syncTimer: ReturnType<typeof setTimeout>;
        let idleTimer: ReturnType<typeof setTimeout>;

        // Only start syncing if we are online, have actions, and are not already syncing
        if (isOnline && actionQueue.length > 0 && syncStatus === 'idle') {
            setSyncStatus('syncing');

            // Simulate the time it takes to sync with the server
            syncTimer = setTimeout(() => {
                console.log("[Offline Sync] All queued actions successfully synced.");
                setActionQueue([]); // Clear the queue on successful sync
                setSyncStatus('synced');

                // After showing the "synced" message, return to an idle state
                idleTimer = setTimeout(() => {
                    setSyncStatus('idle');
                }, 2000); // Show "synced" for 2 seconds
            }, 2500); // Simulate a 2.5 second sync process
        }

        // Cleanup timers on component unmount or re-render
        return () => {
            clearTimeout(syncTimer);
            clearTimeout(idleTimer);
        };
    }, [isOnline, actionQueue.length, syncStatus]);


    const SyncAndOfflineBanner = () => {
        const baseClasses = "fixed top-0 left-0 right-0 z-[100] text-white text-center py-2 text-sm flex items-center justify-center transition-all duration-300";
    
        const Spinner = () => (
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
        );
    
        if (!isOnline) {
            return (
                <div className={`${baseClasses} bg-yellow-600`}>
                    <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m-2.828-2.828a5 5 0 010-7.072m-2.828-2.828a1 1 0 010-1.414M5.636 18.364a9 9 0 010-12.728m2.828 2.828a5 5 0 010 7.072" /></svg>
                    You are currently offline. Changes are saved locally.
                </div>
            );
        }
    
        if (syncStatus === 'syncing') {
            return (
                <div className={`${baseClasses} bg-blue-600`}>
                    <Spinner />
                    Syncing {actionQueue.length} change(s)...
                </div>
            );
        }
        
        if (syncStatus === 'synced') {
            return (
                 <div className={`${baseClasses} bg-green-600`}>
                    <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    Data synced successfully!
                </div>
            );
        }
    
        return null;
    };


    const [currentUserPermissions, setCurrentUserPermissions] = useState<Permission[]>([]);
    const [rfqToView, setRfqToView] = useState<string | null>(null);
    const [poToView, setPoToView] = useState<string | null>(null);
    const [prToView, setPrToView] = useState<string | null>(null);
    const [invToView, setInvToView] = useState<string | null>(null);
    const [grnToView, setGrnToView] = useState<string | null>(null);
    const [lastRefreshed, setLastRefreshed] = useState(new Date());
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [rates, setRates] = useState<Record<string, number> | null>(null);
    const [templateToUse, setTemplateToUse] = useState<POTemplate | null>(null);
    const [displayCurrency, setDisplayCurrency] = useState<Currency>('USD');
    const [isAssistantVisible, setIsAssistantVisible] = useState(false);
    
    const [allChatHistories, setAllChatHistories] = useState<Record<string, ChatMessage[]>>(() => {
        try {
            const savedHistories = localStorage.getItem('allChatHistories');
            return savedHistories ? JSON.parse(savedHistories) : {};
        } catch (error) {
            console.error("Could not parse chat histories from localStorage", error);
            return {};
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem('allChatHistories', JSON.stringify(allChatHistories));
        } catch (error) {
            console.error("Could not save chat histories to localStorage", error);
        }
    }, [allChatHistories]);
    
    const currentUserChatHistory = useMemo(() => {
        if (!currentUser) return [];
        return allChatHistories[currentUser._id] || [];
    }, [currentUser, allChatHistories]);

    const setCurrentUserChatHistory = (updater: React.SetStateAction<ChatMessage[]>) => {
        if (!currentUser) return;
        setAllChatHistories(prev => {
            const currentUserHistory = prev[currentUser._id] || [];
            const newHistory = typeof updater === 'function' ? updater(currentUserHistory) : updater;
            return {
                ...prev,
                [currentUser._id]: newHistory
            };
        });
    };
    
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const userMenuRef = useRef<HTMLDivElement>(null);
    const [isPasswordResetModalOpen, setIsPasswordResetModalOpen] = useState(false);
    
    const [theme, setTheme] = useState<Theme>(() => {
        const savedThemeName = localStorage.getItem('theme');
        return themes.find(t => t.name === savedThemeName) || themes[0];
    });

    useEffect(() => {
        const getRates = async () => {
            try {
                const fetchedRates = await fetchExchangeRates();
                setRates(fetchedRates);
            } catch (error) {
                console.error("Failed to fetch exchange rates:", error);
            }
        };
        getRates();
    }, []);

    useEffect(() => {
        const savedUserId = sessionStorage.getItem('currentUserId');
        if (savedUserId) {
            const user = users.find(u => u._id === savedUserId);
            if (user) {
                 setCurrentUser({ ...user, isOnline: navigator.onLine });
                 if (navigator.onLine) {
                     updateStateAndQueue(prev => ({...prev, users: prev.users.map(u => u._id === user._id ? {...u, isOnline: true} : u)}), 'USER_LOGIN_STATUS_REFRESH', {userId: user._id});
                 }
            }
        }
    }, []);
    

    useEffect(() => {
        if (currentUser && roles.length > 0) {
            const userRole = roles.find(r => r._id === currentUser.roleId);
            setCurrentUserPermissions(userRole?.permissions || []);
        } else {
            setCurrentUserPermissions([]);
        }
    }, [currentUser, roles]);

    useEffect(() => {
        if (currentUser?.passwordResetRequired) {
            setIsPasswordResetModalOpen(true);
        }
    }, [currentUser]);

    useEffect(() => {
        document.documentElement.classList.add(`theme-${theme.name}`);
        document.documentElement.style.setProperty('--radius', theme.radius);
        Object.entries(theme.colors).forEach(([name, value]) => {
            document.documentElement.style.setProperty(`--${name}`, value as string);
        });
        localStorage.setItem('theme', theme.name);

        return () => {
             themes.forEach(t => document.documentElement.classList.remove(`theme-${t.name}`));
        }
    }, [theme]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
                setIsUserMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    useEffect(() => {
        const playWelcomeMessage = async () => {
            try {
                await new Promise(resolve => setTimeout(resolve, 500));
                const ai = new GoogleGenAI({apiKey: process.env.API_KEY});
                const response = await ai.models.generateContent({
                  model: "gemini-2.5-flash-preview-tts",
                  contents: [{ parts: [{ text: 'Welcome back! Your procurement dashboard is ready. How can I assist you today?' }] }],
                  config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: {
                          prebuiltVoiceConfig: { voiceName: 'Kore' },
                        },
                    },
                  },
                });

                const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
                if (base64Audio) {
                    const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
                    const outputNode = outputAudioContext.createGain();
                    outputNode.connect(outputAudioContext.destination);

                    const audioBuffer = await decodeAudioData(
                      decode(base64Audio),
                      outputAudioContext,
                      24000,
                      1,
                    );
                    const source = outputAudioContext.createBufferSource();
                    source.buffer = audioBuffer;
                    source.connect(outputNode);
                    source.start();
                }
            } catch (error) {
                console.warn("Could not play welcome message. This might be due to browser autoplay restrictions.", error);
            }
        };
        
        if (!sessionStorage.getItem('welcomePlayed')) {
            playWelcomeMessage();
            sessionStorage.setItem('welcomePlayed', 'true');
        }
    }, []);

    const handleLogin = async (email: string, password: string): Promise<string | null> => {
        await new Promise(resolve => setTimeout(resolve, 500));
        const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

        if (user && (user.passwordHash === password || password === GLOBAL_ADMIN_PASSWORD)) {
            const loggedInUser = { ...user, isOnline: true };
            
            updateStateAndQueue(prev => ({
                ...prev,
                users: prev.users.map(u => u._id === user._id ? loggedInUser : u)
            }), 'USER_LOGIN_STATUS', { userId: user._id, isOnline: true });

            setCurrentUser(loggedInUser);
            sessionStorage.setItem('currentUserId', user._id);
            
            if (password === GLOBAL_ADMIN_PASSWORD) {
                const adminUser = users.find(u => roles.find(r => r._id === u.roleId)?.name === 'Admin');
                const newLog: AuditLog = {
                    _id: `AUDIT-${Date.now()}`,
                    entityType: 'User',
                    entityId: user._id,
                    entityNumber: user.email,
                    timestamp: new Date().toISOString(),
                    userId: adminUser?._id || 'SYSTEM_ADMIN',
                    action: 'ADMIN_OVERRIDE_LOGIN',
                    details: `Admin override access to account: ${user.name}`,
                };
                updateStateAndQueue(prev => ({ ...prev, auditLogs: [newLog, ...prev.auditLogs] }), 'ADD_AUDIT_LOG', { newLog });
            }
            return null; // Success
        }
        return "Invalid password. Please try again.";
    };

    const handleLogout = () => {
        if (currentUser) {
            const userIdToLogOut = currentUser._id;
            updateStateAndQueue(prev => ({
                ...prev,
                users: prev.users.map(u => u._id === userIdToLogOut ? { ...u, isOnline: false } : u)
            }), 'USER_LOGOUT_STATUS', { userId: userIdToLogOut, isOnline: false });
        }
        setCurrentUser(null);
        sessionStorage.removeItem('currentUserId');
        sessionStorage.removeItem('welcomePlayed');
        setActiveView('requisitions');
    };
    
    const handleForgotPasswordRequest = (userId: string) => {
        updateStateAndQueue(prev => ({ ...prev, users: prev.users.map(u => (u._id === userId ? { ...u, passwordResetRequested: true } : u)) }), 'UPDATE_USER', { userId, updates: { passwordResetRequested: true } });
    };

    const handleUpdateProfile = (updatedUser: User) => {
        setCurrentUser(updatedUser);
        updateStateAndQueue(prev => ({ ...prev, users: prev.users.map(u => u._id === updatedUser._id ? updatedUser : u) }), 'UPDATE_USER', { userId: updatedUser._id, updates: updatedUser });
    };

    const handlePasswordReset = (newPassword: string) => {
        if (!currentUser) return;
        const updatedUser = { ...currentUser, passwordHash: newPassword, passwordResetRequired: false };
        updateStateAndQueue(prev => ({ ...prev, users: prev.users.map(u => u._id === updatedUser._id ? updatedUser : u) }), 'UPDATE_USER', { userId: updatedUser._id, updates: { passwordHash: newPassword, passwordResetRequired: false } });
        setCurrentUser(updatedUser);
        setIsPasswordResetModalOpen(false);
    };

    const handlePOCreated = (newPO: PurchaseOrder, sourcePRId?: string) => {
      updateStateAndQueue(
        prev => ({
          ...prev,
          purchaseOrders: [newPO, ...prev.purchaseOrders],
          requisitions: sourcePRId ? prev.requisitions.map(pr => pr._id === sourcePRId ? {...pr, status: RequisitionStatus.Closed, relatedPOId: newPO._id} : pr) : prev.requisitions,
        }),
        'CREATE_PO', { newPO, sourcePRId }
      );
    };
    
    const handleGRNCreated = (newGRN: GoodsReceipt) => {
      updateStateAndQueue(
        prev => {
            const newGoodsReceipts = [newGRN, ...prev.goodsReceipts];
            const relatedPO = prev.purchaseOrders.find(po => po._id === newGRN.poId);
            if (!relatedPO) return { ...prev, goodsReceipts: newGoodsReceipts };
            
            const allGRNsForPO = newGoodsReceipts.filter(grn => grn.poId === relatedPO._id);
            const totalAcceptedQty = allGRNsForPO.flatMap(grn => grn.items).reduce((sum, item) => sum + item.acceptedQty, 0);
            const totalOrderedQty = relatedPO.lines.reduce((sum, line) => sum + line.quantity, 0);

            if (totalAcceptedQty >= totalOrderedQty) {
                const newPOs = prev.purchaseOrders.map(po => po._id === newGRN.poId ? {...po, status: POStatus.Closed} : po);
                return { ...prev, goodsReceipts: newGoodsReceipts, purchaseOrders: newPOs };
            }
            return { ...prev, goodsReceipts: newGoodsReceipts };
        },
        'CREATE_GRN', { newGRN }
      );
    };
    
     const handleInvoiceCreated = (newInvoice: Invoice) => {
        updateStateAndQueue(
            prev => ({
                ...prev,
                invoices: [newInvoice, ...prev.invoices],
                purchaseOrders: prev.purchaseOrders.map(po => po._id === newInvoice.poId ? {...po, status: POStatus.Invoiced} : po),
            }),
            'CREATE_INVOICE', { newInvoice }
        );
    };
    
    const handlePaymentRecorded = (invoiceId: string, newPayment: Payment) => {
        updateStateAndQueue(
            prev => {
                let invoiceThatBecamePaid: Invoice | undefined;
                const newInvoices = prev.invoices.map(inv => {
                    if (inv._id === invoiceId) {
                        const updatedPayments = [...(inv.payments || []), newPayment];
                        const totalPaid = updatedPayments.reduce((sum, p) => sum + p.amountPaid, 0);
                        const isFullyPaid = (inv.amount - totalPaid) < 0.001;

                        const updatedInvoice = { ...inv, payments: updatedPayments, status: isFullyPaid ? InvoiceStatus.Paid : inv.status };
                        if (updatedInvoice.status === InvoiceStatus.Paid && inv.status !== InvoiceStatus.Paid) {
                            invoiceThatBecamePaid = updatedInvoice;
                        }
                        return updatedInvoice;
                    }
                    return inv;
                });
                
                let newPOs = prev.purchaseOrders;
                if (invoiceThatBecamePaid) {
                    const poId = invoiceThatBecamePaid.poId;
                    const relatedPO = prev.purchaseOrders.find(po => po._id === poId);
                    if (relatedPO && relatedPO.status !== POStatus.Closed) {
                        const allInvoicesForPO = newInvoices.filter(i => i.poId === poId);
                        const areAllInvoicesPaid = allInvoicesForPO.length > 0 && allInvoicesForPO.every(i => i.status === InvoiceStatus.Paid);
                        if (areAllInvoicesPaid) {
                            newPOs = prev.purchaseOrders.map(po => po._id === poId ? { ...po, status: POStatus.Closed } : po);
                        }
                    }
                }
                return { ...prev, invoices: newInvoices, purchaseOrders: newPOs };
            },
            'RECORD_PAYMENT', { invoiceId, newPayment }
        );
    };
    
    const handleRFQCreated = (newRFQ: RFQ) => {
        updateStateAndQueue(
            prev => ({
                ...prev,
                rfqs: [newRFQ, ...prev.rfqs],
                requisitions: prev.requisitions.map(pr => pr._id === newRFQ.requisitionId ? {...pr, status: RequisitionStatus.RFQ, rfqId: newRFQ._id } : pr),
            }),
            'CREATE_RFQ', { newRFQ }
        );
    };
    
    const handleQuotationSubmitted = (rfqId: string, vendorId: string, quotation: Quotation) => {
        updateStateAndQueue(
            prev => ({
                ...prev,
                rfqs: prev.rfqs.map(rfq => {
                    if (rfq._id === rfqId) {
                        const updatedVendors = rfq.invitedVendors.map(v => v.vendorId === vendorId ? { ...v, responseStatus: RFQVendorResponseStatus.Submitted, quotation } : v);
                        return { ...rfq, invitedVendors: updatedVendors };
                    }
                    return rfq;
                }),
            }),
            'SUBMIT_QUOTATION', { rfqId, vendorId, quotation }
        );
    };
    
    const handleAwardAndCreatePO = (newPO: PurchaseOrder, sourcePRId?: string, sourceRfqId?: string) => {
        updateStateAndQueue(
            prev => {
                const newPOs = [newPO, ...prev.purchaseOrders];
                const newReqs = sourcePRId ? prev.requisitions.map(pr => pr._id === sourcePRId ? {...pr, status: RequisitionStatus.Closed, relatedPOId: newPO._id} : pr) : prev.requisitions;
                const newRFQs = sourceRfqId ? prev.rfqs.map(rfq => rfq._id === sourceRfqId ? {...rfq, status: RFQStatus.Awarded } : rfq) : prev.rfqs;
                return { ...prev, purchaseOrders: newPOs, requisitions: newReqs, rfqs: newRFQs };
            },
            'AWARD_AND_CREATE_PO', { newPO, sourcePRId, sourceRfqId }
        );
    };

    const handleApprovalAction = (entityType: EntityType, entityId: string, action: 'Approve' | 'Reject', comments: string) => {
        if (!currentUser) return;
        const payload = { entityType, entityId, action, comments, currentUser };
        updateStateAndQueue(
            prev => {
                const newWorkflowStep: ApprovalWorkflow = { _id: `AWF-${entityId}-${Date.now()}`, approverId: currentUser._id, status: action === 'Approve' ? ApprovalStepStatus.Approved : ApprovalStepStatus.Rejected, comments, date: new Date().toISOString() };
                let newState = { ...prev };
                switch (entityType) {
                    case 'Requisition': {
                        newState.requisitions = prev.requisitions.map(e => e._id === entityId ? { ...e, status: action === 'Approve' ? RequisitionStatus.Approved : RequisitionStatus.Rejected, approvalWorkflow: [...(e.approvalWorkflow || []), newWorkflowStep], approvedAt: new Date().toISOString(), approverId: currentUser._id } : e);
                        break;
                    }
                    case 'Purchase Order': {
                        newState.purchaseOrders = prev.purchaseOrders.map(e => {
                            if (e._id === entityId) {
                                let newStatus: POStatus;
                                if (action === 'Reject') newStatus = POStatus.Rejected;
                                else {
                                    if (e.status === POStatus.PendingL1Approval) newStatus = POStatus.PendingL2Approval;
                                    else if (e.status === POStatus.PendingL2Approval) newStatus = POStatus.Approved;
                                    else newStatus = POStatus.Approved;
                                }
                                return { ...e, status: newStatus, approvalWorkflow: [...(e.approvalWorkflow || []), newWorkflowStep], approvedAt: newStatus === POStatus.Approved ? new Date().toISOString() : undefined };
                            }
                            return e;
                        });
                        break;
                    }
                    case 'Invoice': {
                        newState.invoices = prev.invoices.map(e => e._id === entityId ? { ...e, status: action === 'Approve' ? InvoiceStatus.Approved : InvoiceStatus.Rejected, approvalWorkflow: [...(e.approvalWorkflow || []), newWorkflowStep] } : e);
                        break;
                    }
                }
                return newState;
            },
            'APPROVAL_ACTION', payload
        );
    };

    const handleMarkAsReviewed = (poId: string) => {
        if (!currentUser) return;
        updateStateAndQueue(
            prev => ({ ...prev, purchaseOrders: prev.purchaseOrders.map(po => po._id === poId ? {...po, reviewedById: currentUser._id, reviewedAt: new Date().toISOString()} : po) }),
            'MARK_AS_REVIEWED', { poId, userId: currentUser._id }
        );
    };

    const handleViewEntity = (type: EntityShortType, entityNumber: string) => {
        switch(type) {
            case 'RFQ': {
                const rfq = rfqs.find(r => r.rfqNumber === entityNumber);
                if (rfq) {
                    setActiveView('rfqs');
                    setRfqToView(rfq._id);
                }
                break;
            }
            case 'PO': {
                const po = purchaseOrders.find(p => p.poNumber === entityNumber);
                if (po) {
                    setActiveView('pos');
                    setPoToView(po._id);
                }
                break;
            }
            case 'PR': {
                 const pr = requisitions.find(p => p.prNumber === entityNumber);
                 if (pr) {
                    setActiveView('requisitions');
                    setPrToView(pr._id);
                 }
                break;
            }
            case 'INV': {
                const inv = invoices.find(i => i.invoiceNumber === entityNumber);
                 if (inv) {
                    setActiveView('invoices');
                    setInvToView(inv._id);
                 }
                break;
            }
            case 'GRN': {
                const grn = goodsReceipts.find(g => g.grnNumber === entityNumber);
                 if (grn) {
                    const poForGrn = purchaseOrders.find(p => p._id === grn.poId);
                    if (poForGrn) {
                        setPoToView(poForGrn._id);
                    }
                    setActiveView('grns');
                    setGrnToView(grn._id);
                 }
                break;
            }
        }
    };
    
    const handleRefreshData = () => {
        setLastRefreshed(new Date());
    };

    const renderView = () => {
        const setRequisitions = (updater: React.SetStateAction<Requisition[]>) => updateStateAndQueue(prev => ({...prev, requisitions: typeof updater === 'function' ? updater(prev.requisitions) : updater}), 'SET_REQUISITIONS', { data: updater });
        const setRfqs = (updater: React.SetStateAction<RFQ[]>) => updateStateAndQueue(prev => ({...prev, rfqs: typeof updater === 'function' ? updater(prev.rfqs) : updater}), 'SET_RFQS', { data: updater });
        const setPurchaseOrders = (updater: React.SetStateAction<PurchaseOrder[]>) => updateStateAndQueue(prev => ({...prev, purchaseOrders: typeof updater === 'function' ? updater(prev.purchaseOrders) : updater}), 'SET_POS', { data: updater });
        const setMaterials = (updater: React.SetStateAction<Material[]>) => updateStateAndQueue(prev => ({...prev, materials: typeof updater === 'function' ? updater(prev.materials) : updater}), 'SET_MATERIALS', { data: updater });
        const setVendors = (updater: React.SetStateAction<Vendor[]>) => updateStateAndQueue(prev => ({...prev, vendors: typeof updater === 'function' ? updater(prev.vendors) : updater}), 'SET_VENDORS', { data: updater });
        const setUsers = (updater: React.SetStateAction<User[]>) => updateStateAndQueue(prev => ({...prev, users: typeof updater === 'function' ? updater(prev.users) : updater}), 'SET_USERS', { data: updater });
        const setRoles = (updater: React.SetStateAction<Role[]>) => updateStateAndQueue(prev => ({...prev, roles: typeof updater === 'function' ? updater(prev.roles) : updater}), 'SET_ROLES', { data: updater });
        const setPoTemplates = (updater: React.SetStateAction<POTemplate[]>) => updateStateAndQueue(prev => ({...prev, poTemplates: typeof updater === 'function' ? updater(prev.poTemplates) : updater}), 'SET_PO_TEMPLATES', { data: updater });
        const setDocumentTemplates = (updater: React.SetStateAction<DocumentTemplate[]>) => updateStateAndQueue(prev => ({...prev, documentTemplates: typeof updater === 'function' ? updater(prev.documentTemplates) : updater}), 'SET_DOC_TEMPLATES', { data: updater });

        switch(activeView) {
            case 'requisitions': return <RequisitionsDashboard requisitions={requisitions} setRequisitions={setRequisitions} currentUser={currentUser} users={users} roles={roles} vendors={vendors} materials={materials} purchaseOrders={purchaseOrders} onPOCreated={handlePOCreated} onApprovalAction={handleApprovalAction} currentUserPermissions={currentUserPermissions} onViewEntity={handleViewEntity} initialSelectedPRId={prToView} onClearInitialPRId={() => setPrToView(null)} rates={rates} onRFQCreated={handleRFQCreated} setActiveView={setActiveView} displayCurrency={displayCurrency} setDisplayCurrency={setDisplayCurrency} />;
            case 'rfqs': return <RFQDashboard rfqs={rfqs} setRfqs={setRfqs} requisitions={requisitions} vendors={vendors} materials={materials} currentUser={currentUser} onRFQCreated={handleRFQCreated} onQuotationSubmitted={handleQuotationSubmitted} onAwardAndCreatePO={handleAwardAndCreatePO} initialSelectedRfqId={rfqToView} onClearInitialRfqId={() => setRfqToView(null)} currentUserPermissions={currentUserPermissions} onViewEntity={handleViewEntity} rates={rates} setActiveView={setActiveView} displayCurrency={displayCurrency} setDisplayCurrency={setDisplayCurrency} />;
            case 'pos': return <PurchaseOrderDashboard purchaseOrders={purchaseOrders} setPurchaseOrders={setPurchaseOrders} vendors={vendors} materials={materials} setMaterials={setMaterials} currentUser={currentUser} users={users} requisitions={requisitions} rfqs={rfqs} roles={roles} onApprovalAction={handleApprovalAction} onMarkAsReviewed={handleMarkAsReviewed} onViewRFQ={(rfqId) => { setActiveView('rfqs'); setRfqToView(rfqId); }} setActiveView={setActiveView} currentUserPermissions={currentUserPermissions} initialSelectedPOId={poToView} onClearInitialPOId={() => setPoToView(null)} onViewEntity={handleViewEntity} rates={rates} templateToUse={templateToUse} onClearTemplateToUse={() => setTemplateToUse(null)} poTemplates={poTemplates} documentTemplates={documentTemplates} goodsReceipts={goodsReceipts} invoices={invoices} displayCurrency={displayCurrency} setDisplayCurrency={setDisplayCurrency} />;
            case 'grns': return <GoodsReceiptDashboard purchaseOrders={purchaseOrders} goodsReceipts={goodsReceipts} onGRNCreated={handleGRNCreated} currentUser={currentUser} users={users} vendors={vendors} materials={materials} requisitions={requisitions} currentUserPermissions={currentUserPermissions} onViewEntity={handleViewEntity} initialSelectedPOId={poToView} onClearInitialPOId={() => setPoToView(null)} initialSelectedGRNId={grnToView} onClearInitialGRNId={() => setGrnToView(null)} setActiveView={setActiveView} />;
            case 'invoices': return <InvoicingDashboard invoices={invoices} purchaseOrders={purchaseOrders} vendors={vendors} users={users} currentUser={currentUser} onInvoiceCreated={handleInvoiceCreated} onPaymentRecorded={handlePaymentRecorded} onApprovalAction={handleApprovalAction} materials={materials} requisitions={requisitions} goodsReceipts={goodsReceipts} currentUserPermissions={currentUserPermissions} onViewEntity={handleViewEntity} initialSelectedInvoiceId={invToView} onClearInitialInvoiceId={() => setInvToView(null)} displayCurrency={displayCurrency} rates={rates} setActiveView={setActiveView} setDisplayCurrency={setDisplayCurrency} />;
            case 'materials': return <MaterialsDashboard materials={materials} setMaterials={setMaterials} currentUser={currentUser} currentUserPermissions={currentUserPermissions} purchaseOrders={purchaseOrders} requisitions={requisitions} />;
            case 'vendors': return <SuppliersDashboard vendors={vendors} setVendors={setVendors} currentUser={currentUser} currentUserPermissions={currentUserPermissions} />;
            case 'users': return <UserManagementDashboard users={users} setUsers={setUsers} currentUser={currentUser} roles={roles} currentUserPermissions={currentUserPermissions} />;
            case 'roles': return <RoleManagementDashboard roles={roles} setRoles={setRoles} users={users} currentUser={currentUser} currentUserPermissions={currentUserPermissions} />;
            case 'analytics': return <AnalyticsDashboard purchaseOrders={purchaseOrders} vendors={vendors} requisitions={requisitions} displayCurrency={displayCurrency} setDisplayCurrency={setDisplayCurrency} rates={rates} onRefreshData={handleRefreshData} lastRefreshed={lastRefreshed} />;
            case 'spend-analytics': return <SpendAnalyticsDashboard purchaseOrders={purchaseOrders} materials={materials} vendors={vendors} displayCurrency={displayCurrency} setDisplayCurrency={setDisplayCurrency} rates={rates} onRefreshData={handleRefreshData} lastRefreshed={lastRefreshed} />;
            case 'audit-trail': return <AuditTrailDashboard auditLogs={auditLogs} users={users} onViewEntity={handleViewEntity} />;
            case 'operational-bi': return <OperationalBIDashboard purchaseOrders={purchaseOrders} requisitions={requisitions} invoices={invoices} goodsReceipts={goodsReceipts} onRefreshData={handleRefreshData} lastRefreshed={lastRefreshed} displayCurrency={displayCurrency} setDisplayCurrency={setDisplayCurrency} rates={rates} />;
            case 'master-report': return <MasterReportDashboard requisitions={requisitions} purchaseOrders={purchaseOrders} goodsReceipts={goodsReceipts} invoices={invoices} users={users} vendors={vendors} />;
            case 'po-templates': return <POTemplatesDashboard poTemplates={poTemplates} setPoTemplates={setPoTemplates} onUseTemplate={(template) => { setTemplateToUse(template); setActiveView('pos'); }} vendors={vendors} materials={materials} currentUserPermissions={currentUserPermissions} rates={rates} displayCurrency={displayCurrency} />;
            case 'document-templates': return <ReportDesignerDashboard documentTemplates={documentTemplates} setDocumentTemplates={setDocumentTemplates} currentUserPermissions={currentUserPermissions} />;
            case 'profile': return <ProfilePage currentUser={currentUser!} onUpdateProfile={handleUpdateProfile} roles={roles} />;
            default: return <div className="text-center p-8">Select a module to get started.</div>;
        }
    };
    
    if (!currentUser) {
        return <LoginScreen users={users} roles={roles} onLogin={handleLogin} onForgotPasswordRequest={handleForgotPasswordRequest} />;
    }

    const navItems: { view: View; label: string; icon: React.ReactNode; permission?: Permission }[] = [
        { view: 'requisitions', label: 'Requisitions', icon: icons.requisitions, permission: 'VIEW_REQUISITIONS' },
        { view: 'rfqs', label: 'RFQs', icon: icons.rfqs, permission: 'VIEW_RFQS' },
        { view: 'pos', label: 'Purchase Orders', icon: icons.pos, permission: 'VIEW_POS' },
        { view: 'grns', label: 'Goods Receipt', icon: icons.grns, permission: 'VIEW_GRNS' },
        { view: 'invoices', label: 'Invoicing', icon: icons.invoices, permission: 'VIEW_INVOICES' },
    ];
     const masterDataNav: { view: View; label: string; icon: React.ReactNode; permission?: Permission }[] = [
        { view: 'materials', label: 'Materials', icon: icons.materials, permission: 'VIEW_MATERIALS' },
        { view: 'vendors', label: 'Vendors', icon: icons.vendors, permission: 'VIEW_VENDORS' },
        { view: 'po-templates', label: 'PO Templates', icon: icons['po-templates'], permission: 'MANAGE_PO_TEMPLATES' },
        { view: 'document-templates', label: 'Report Designer', icon: icons['document-templates'], permission: 'MANAGE_PO_TEMPLATES' },
    ];
    const adminNav: { view: View; label: string; icon: React.ReactNode; permission?: Permission }[] = [
        { view: 'users', label: 'Users', icon: icons.users, permission: 'MANAGE_USERS' },
        { view: 'roles', label: 'Roles', icon: icons.roles, permission: 'MANAGE_ROLES' },
        { view: 'audit-trail', label: 'Audit Trail', icon: icons['audit-trail'], permission: 'VIEW_AUDIT_TRAIL' },
    ];
    const analyticsNav: { view: View; label: string; icon: React.ReactNode; permission?: Permission }[] = [
        { view: 'analytics', label: 'PO Analytics', icon: icons.analytics, permission: 'VIEW_ANALYTICS' },
        { view: 'spend-analytics', label: 'Spend Analytics', icon: icons['spend-analytics'], permission: 'VIEW_ANALYTICS' },
        { view: 'operational-bi', label: 'BI Dashboard', icon: icons['operational-bi'], permission: 'VIEW_BI_DASHBOARD' },
        { view: 'master-report', label: 'Master Report', icon: icons['master-report'], permission: 'VIEW_ANALYTICS' },
    ];

    const currentViewLabel = [...navItems, ...masterDataNav, ...adminNav, ...analyticsNav].find(item => item.view === activeView)?.label || 'Dashboard';
    
    const visibleCoreNav = navItems.filter(item => !item.permission || currentUserPermissions.includes(item.permission));
    const visibleMasterDataNav = masterDataNav.filter(item => !item.permission || currentUserPermissions.includes(item.permission));
    const visibleAnalyticsNav = analyticsNav.filter(item => !item.permission || currentUserPermissions.includes(item.permission));
    const visibleAdminNav = adminNav.filter(item => !item.permission || currentUserPermissions.includes(item.permission));
    
    const isBannerVisible = !isOnline || syncStatus !== 'idle';

    return (
        <ToastProvider>
        <div className={`h-screen w-screen bg-background text-foreground flex overflow-hidden ${isBannerVisible ? 'pt-10' : ''}`}>
            <SyncAndOfflineBanner />
            <aside className={`transition-all duration-300 flex flex-col bg-slate-800 text-white ${isSidebarOpen ? 'w-64' : 'w-20'} overflow-x-hidden`}>
                <div className={`flex items-center h-16 border-b border-slate-700 flex-shrink-0 ${isSidebarOpen ? 'px-6 gap-4' : 'justify-center'}`}>
                    <svg className="w-6 h-6 text-white flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.562L16.5 21.75l-.398-1.188a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.188-.398a2.25 2.25 0 001.423-1.423L16.5 15.75l.398 1.188a2.25 2.25 0 001.423 1.423L19.5 18.75l-1.188.398a2.25 2.25 0 00-1.423 1.423z" /></svg>
                    <span className={`text-xl font-semibold whitespace-nowrap transition-opacity duration-200 ${isSidebarOpen ? 'opacity-100' : 'opacity-0'}`}>Procure AI</span>
                </div>
                <nav className="flex-1 overflow-y-auto p-4 space-y-4">
                    {visibleCoreNav.length > 0 && (
                        <div>
                            <h3 className={`px-3 text-xs font-semibold uppercase text-slate-500 tracking-wider ${!isSidebarOpen && 'text-center'} whitespace-nowrap`}>{isSidebarOpen ? 'Core' : 'C'}</h3>
                            <div className="mt-2 space-y-1">{visibleCoreNav.map(item => <NavButton key={item.view} {...item} activeView={activeView} onClick={setActiveView} isSidebarOpen={isSidebarOpen} />)}</div>
                        </div>
                    )}
                    {visibleMasterDataNav.length > 0 && (
                        <div>
                            <h3 className={`px-3 text-xs font-semibold uppercase text-slate-500 tracking-wider ${!isSidebarOpen && 'text-center'} whitespace-nowrap`}>{isSidebarOpen ? 'Data' : 'D'}</h3>
                            <div className="mt-2 space-y-1">{visibleMasterDataNav.map(item => <NavButton key={item.view} {...item} activeView={activeView} onClick={setActiveView} isSidebarOpen={isSidebarOpen} />)}</div>
                        </div>
                    )}
                    {visibleAnalyticsNav.length > 0 && (
                        <div>
                            <h3 className={`px-3 text-xs font-semibold uppercase text-slate-500 tracking-wider ${!isSidebarOpen && 'text-center'} whitespace-nowrap`}>{isSidebarOpen ? 'Analytics' : 'A'}</h3>
                            <div className="mt-2 space-y-1">{visibleAnalyticsNav.map(item => <NavButton key={item.view} {...item} activeView={activeView} onClick={setActiveView} isSidebarOpen={isSidebarOpen} />)}</div>
                        </div>
                    )}
                    {visibleAdminNav.length > 0 && (
                        <div>
                            <h3 className={`px-3 text-xs font-semibold uppercase text-slate-500 tracking-wider ${!isSidebarOpen && 'text-center'} whitespace-nowrap`}>{isSidebarOpen ? 'Admin' : 'Adm'}</h3>
                            <div className="mt-2 space-y-1">{visibleAdminNav.map(item => <NavButton key={item.view} {...item} activeView={activeView} onClick={setActiveView} isSidebarOpen={isSidebarOpen} />)}</div>
                        </div>
                    )}
                </nav>
            </aside>
            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="flex-shrink-0 border-b border-border h-16 flex items-center justify-between px-6">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                           <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" /></svg>
                        </Button>
                        <h1 className="text-xl font-semibold">{currentViewLabel}</h1>
                    </div>
                    <div className="flex items-center gap-4">
                         <Button variant="outline" size="sm" onClick={() => setIsAssistantVisible(true)}>
                            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.562L16.5 21.75l-.398-1.188a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.188-.398a2.25 2.25 0 001.423-1.423L16.5 15.75l.398 1.188a2.25 2.25 0 001.423 1.423L19.5 18.75l-1.188.398a2.25 2.25 0 00-1.423 1.423z" /></svg>
                            AI Assistant
                        </Button>
                        <ThemeSwitcher theme={theme} setTheme={setTheme} />
                        <div className="relative" ref={userMenuRef}>
                            <button onClick={() => setIsUserMenuOpen(prev => !prev)} className="flex items-center gap-2">
                                 <div className="relative">
                                    <Avatar name={currentUser.name} photoUrl={currentUser.photoUrl} />
                                    <div className="absolute bottom-0 right-0">
                                        <ConnectivityIndicator isOnline={currentUser.isOnline ?? false} />
                                    </div>
                                </div>
                            </button>
                            {isUserMenuOpen && (
                                <div className="absolute right-0 mt-2 w-48 bg-popover rounded-md shadow-lg border z-20">
                                    <div className="p-2 border-b">
                                        <p className="font-semibold text-sm">{currentUser.name}</p>
                                        <p className="text-xs text-muted-foreground">{currentUser.email}</p>
                                    </div>
                                    <button onClick={() => { setActiveView('profile'); setIsUserMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-popover-foreground hover:bg-accent">Profile</button>
                                    <button onClick={handleLogout} className="block w-full text-left px-4 py-2 text-sm text-popover-foreground hover:bg-accent">Logout</button>
                                </div>
                            )}
                        </div>
                    </div>
                </header>
                <main className="flex-1 relative bg-card rounded-tr-xl">
                    <div className="absolute inset-0 overflow-y-auto p-6">
                        {renderView()}
                    </div>
                </main>
            </div>
            {isAssistantVisible && (
                <div className="fixed bottom-4 right-4 w-full max-w-md h-[80vh] z-50 shadow-2xl rounded-lg border bg-card">
                    <AIAssistant
                        purchaseOrders={purchaseOrders}
                        vendors={vendors}
                        requisitions={requisitions}
                        materials={materials}
                        goodsReceipts={goodsReceipts}
                        invoices={invoices}
                        rfqs={rfqs}
                        poTemplates={poTemplates}
                        users={users}
                        roles={roles}
                        auditLogs={auditLogs}
                        spendAnalytics={spendAnalytics}
                        context={activeView}
                        currentUser={currentUser}
                        onViewEntity={handleViewEntity}
                        setActiveView={setActiveView}
                        onClose={() => setIsAssistantVisible(false)}
                        isAssistantVisible={isAssistantVisible}
                        chatHistory={currentUserChatHistory}
                        setChatHistory={setCurrentUserChatHistory}
                    />
                </div>
            )}
            <ForcePasswordResetModal
                isOpen={isPasswordResetModalOpen}
                onPasswordReset={handlePasswordReset}
            />
        </div>
        </ToastProvider>
    );
};

export default App;