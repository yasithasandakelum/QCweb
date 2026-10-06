import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/common/Header';
import { Sidebar } from './components/common/Sidebar';
import { LoginView } from './components/auth/LoginView';
import {
  CalendarCheck,
  FileSpreadsheet,
  LayoutDashboard,
  Menu,
  Truck,
} from 'lucide-react';

// Quality Components
import { QualityInspectionView } from './components/quality/QualityInspectionView';
import { RejectedLotsView } from './components/quality/RejectedLotsView';
import { NewInspectionModal } from './components/quality/NewInspectionModal';
import { AqlTableExplorerModal } from './components/quality/AqlTableExplorerModal';

// Production Components
import { DailyProductionView } from './components/production/DailyProductionView';

// MRP Components
import { ActualMRPInputsView } from './components/mrp/ActualMRPInputsView';
import { DailyActualMRPView } from './components/mrp/DailyActualMRPView';
import { MonthlyPlanView } from './components/mrp/MonthlyPlanView';
import { MonthlyPlanningSetupView } from './components/mrp/MonthlyPlanningSetupView';
import { PlannedVsActualView } from './components/mrp/PlannedVsActualView';

// Deliveries Components
import { DeliveriesView } from './components/deliveries/DeliveriesView';
import { UrgentReplenishmentsView } from './components/deliveries/UrgentReplenishmentsView';

// Analytics & Reports
import { ExecutiveDashboard } from './components/dashboard/ExecutiveDashboard';
import { QualityAnalyticsView } from './components/analytics/QualityAnalyticsView';
import { ProductionAnalyticsView } from './components/analytics/ProductionAnalyticsView';
import { InventoryAnalyticsView } from './components/analytics/InventoryAnalyticsView';
import { ReportsView } from './components/analytics/ReportsView';

// Admin & Test
import { ConfigurationView } from './components/admin/ConfigurationView';
import { AuditTrailView } from './components/admin/AuditTrailView';
import { TestSuiteModal } from './components/testing/TestSuiteModal';

const MainLayout: React.FC = () => {
  const { isLoggedIn, systemConfig } = useApp();
  const [activeTab, setActiveTab] = useState<string>('executive-dashboard');
  const [isMobileNavOpen, setIsMobileNavOpen] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  const [isNewInspectionOpen, setIsNewInspectionOpen] = useState<boolean>(false);
  const [newInspectionInitialData, setNewInspectionInitialData] = useState<any>(null);
  const [isAqlExplorerOpen, setIsAqlExplorerOpen] = useState<boolean>(false);
  const [isTestSuiteOpen, setIsTestSuiteOpen] = useState<boolean>(false);

  if (!isLoggedIn) {
    return <LoginView />;
  }

  const handleNavigate = (tab: string) => {
    if (tab === 'new-inspection') {
      setNewInspectionInitialData(null);
      setIsNewInspectionOpen(true);
      setActiveTab('inspection-history');
    } else {
      setActiveTab(tab);
    }
    setIsMobileNavOpen(false);
  };

  const handleStartInspection = (deliveryData: any) => {
    setNewInspectionInitialData(deliveryData);
    setIsNewInspectionOpen(true);
    setActiveTab('inspection-history');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'executive-dashboard':
      case 'dashboard':
        return (
          <ExecutiveDashboard
            onNavigate={handleNavigate}
            onOpenTestSuite={() => setIsTestSuiteOpen(true)}
            onOpenNewInspection={() => {
              setNewInspectionInitialData(null);
              setIsNewInspectionOpen(true);
            }}
          />
        );
      case 'inspection-history':
        return (
          <QualityInspectionView
            onOpenNewModal={() => {
              setNewInspectionInitialData(null);
              setIsNewInspectionOpen(true);
            }}
            onOpenAqlExplorer={() => setIsAqlExplorerOpen(true)}
          />
        );
      case 'rejected-lots':
        return <RejectedLotsView />;
      case 'daily-production':
      case 'production-defects':
      case 'daily-confirmation':
        return <DailyProductionView />;
      case 'mrp-actual-inputs':
        return <ActualMRPInputsView initialSubTab="usage" onNavigate={handleNavigate} />;
      case 'mrp-input-usage':
        return <ActualMRPInputsView initialSubTab="usage" onNavigate={handleNavigate} />;
      case 'mrp-input-defects':
        return <ActualMRPInputsView initialSubTab="defects" onNavigate={handleNavigate} />;
      case 'mrp-input-confirmation':
        return <ActualMRPInputsView initialSubTab="confirmation" onNavigate={handleNavigate} />;
      case 'mrp-daily-actual':
        return <DailyActualMRPView onNavigate={handleNavigate} />;
      case 'mrp-monthly-plan':
      case 'mrp-planned':
        return <MonthlyPlanView onNavigate={handleNavigate} />;
      case 'mrp-monthly-input':
      case 'monthly-planning-input':
      case 'mrp-planning-setup':
        return <MonthlyPlanningSetupView onNavigate={handleNavigate} />;
      case 'mrp-planned-vs-actual':
        return <PlannedVsActualView />;
      case 'supplier-deliveries':
      case 'deliveries-plan':
      case 'actual-deliveries':
        return <DeliveriesView onStartInspection={handleStartInspection} />;
      case 'urgent-replenishments':
        return <UrgentReplenishmentsView />;
      case 'quality-analytics':
      case 'analytics-quality':
        return <QualityAnalyticsView />;
      case 'production-analytics':
      case 'analytics-production':
        return <ProductionAnalyticsView />;
      case 'inventory-analytics':
      case 'analytics-inventory':
        return <InventoryAnalyticsView />;
      case 'reports-exports':
      case 'reports-export':
        return <ReportsView />;
      case 'system-config':
        return <ConfigurationView />;
      case 'audit-trail':
        return <AuditTrailView />;
      default:
        return (
          <ExecutiveDashboard
            onNavigate={handleNavigate}
            onOpenTestSuite={() => setIsTestSuiteOpen(true)}
            onOpenNewInspection={() => setIsNewInspectionOpen(true)}
          />
        );
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#F8FAFC] font-sans text-slate-900 overflow-hidden">
      {/* Responsive Sidebar (Collapsible Desktop + Slide-over Mobile Drawer) */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={handleNavigate}
        isOpenOnMobile={isMobileNavOpen}
        onCloseMobile={() => setIsMobileNavOpen(false)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* Main Content Area */}
      <main className="flex-grow flex flex-col min-w-0 bg-[#F8FAFC] overflow-hidden">
        {/* Global Header */}
        <Header
          onOpenNewInspection={() => setIsNewInspectionOpen(true)}
          onOpenAqlExplorer={() => setIsAqlExplorerOpen(true)}
          onOpenTestSuite={() => setIsTestSuiteOpen(true)}
          onNavigate={handleNavigate}
          onToggleMobileNav={() => setIsMobileNavOpen(!isMobileNavOpen)}
        />

        {/* Dynamic Viewport with responsive padding & room for mobile bottom bar */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 sm:p-4 md:p-6 lg:p-8 pb-20 md:pb-6 bg-[#F8FAFC]">
          <div className="max-w-[1600px] mx-auto w-full">{renderContent()}</div>
        </div>

        {/* Quiet Desktop Footer Status Bar */}
        <footer className="hidden md:flex h-7 bg-white border-t border-slate-200 px-6 items-center justify-between shrink-0 select-none text-[11px] text-slate-500">
          <div className="flex items-center gap-4">
            <span className="font-medium text-slate-600">{systemConfig.companyName} MRP System</span>
            <span>·</span>
            <span>ANSI/ASQ Z1.4 Inspection Normal Level II</span>
            <span>·</span>
            <span>3-Day Demand Scheduling</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span className="font-semibold text-slate-700">Live MRP State Synchronized</span>
          </div>
        </footer>

        {/* Mobile Fixed Bottom Navigation Bar (Thumb Zone - 44px+ touch targets) */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 grid grid-cols-5 items-center h-16 pb-[max(env(safe-area-inset-bottom),0.5rem)] select-none shadow-lg">
          <button
            onClick={() => handleNavigate('executive-dashboard')}
            className={`flex flex-col items-center justify-center h-full min-h-[44px] transition-colors ${
              activeTab === 'executive-dashboard' || activeTab === 'dashboard'
                ? 'text-blue-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-[10px] mt-0.5 leading-none">Dashboard</span>
          </button>

          <button
            onClick={() => handleNavigate('mrp-monthly-plan')}
            className={`flex flex-col items-center justify-center h-full min-h-[44px] transition-colors ${
              activeTab === 'mrp-monthly-plan' || activeTab === 'mrp-planned'
                ? 'text-blue-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <CalendarCheck className="w-5 h-5" />
            <span className="text-[10px] mt-0.5 leading-none">Planned</span>
          </button>

          <button
            onClick={() => handleNavigate('mrp-daily-actual')}
            className={`flex flex-col items-center justify-center h-full min-h-[44px] transition-colors ${
              activeTab === 'mrp-daily-actual'
                ? 'text-blue-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileSpreadsheet className="w-5 h-5" />
            <span className="text-[10px] mt-0.5 leading-none">Actual</span>
          </button>

          <button
            onClick={() => handleNavigate('supplier-deliveries')}
            className={`flex flex-col items-center justify-center h-full min-h-[44px] transition-colors ${
              activeTab === 'supplier-deliveries' || activeTab === 'deliveries-plan' || activeTab === 'actual-deliveries'
                ? 'text-blue-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Truck className="w-5 h-5" />
            <span className="text-[10px] mt-0.5 leading-none">Deliveries</span>
          </button>

          <button
            onClick={() => setIsMobileNavOpen(true)}
            className="flex flex-col items-center justify-center h-full min-h-[44px] text-slate-500 hover:text-slate-800 transition-colors"
            aria-label="Open Full Navigation Menu"
          >
            <Menu className="w-5 h-5" />
            <span className="text-[10px] mt-0.5 leading-none">Menu</span>
          </button>
        </nav>
      </main>

      {/* Global Modals */}
      <NewInspectionModal
        isOpen={isNewInspectionOpen}
        onClose={() => {
          setIsNewInspectionOpen(false);
          setNewInspectionInitialData(null);
        }}
        onSuccess={() => {
          setIsNewInspectionOpen(false);
          setNewInspectionInitialData(null);
        }}
        onOpenAqlExplorer={() => setIsAqlExplorerOpen(true)}
        initialData={newInspectionInitialData}
      />

      <AqlTableExplorerModal
        isOpen={isAqlExplorerOpen}
        onClose={() => setIsAqlExplorerOpen(false)}
      />

      <TestSuiteModal
        isOpen={isTestSuiteOpen}
        onClose={() => setIsTestSuiteOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
