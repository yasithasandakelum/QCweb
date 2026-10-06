import React, { useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Calendar,
  CalendarCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Factory,
  FileCheck,
  FileSpreadsheet,
  FileText,
  History,
  Layers,
  LayoutDashboard,
  LogOut,
  Package,
  RotateCcw,
  Settings,
  ShieldCheck,
  TrendingUp,
  Truck,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface SidebarProps {
  activeTab?: string;
  currentTab?: string;
  setActiveTab?: (tab: string) => void;
  onSelectTab?: (tab: string) => void;
  isOpenOnMobile?: boolean;
  onCloseMobile?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  currentTab,
  setActiveTab,
  onSelectTab,
  isOpenOnMobile = false,
  onCloseMobile,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const { rejectedLots, urgentReplenishments, defectEvents, currentUser, activeRole, logout } = useApp();

  const [isMRPInputsExpanded, setIsMRPInputsExpanded] = useState<boolean>(true);

  if (!currentUser) return null;

  const currentActive = activeTab || currentTab || 'executive-dashboard';
  const handleSelect = (tab: string) => {
    if (setActiveTab) setActiveTab(tab);
    if (onSelectTab) onSelectTab(tab);
    if (onCloseMobile) onCloseMobile();
  };

  const openRejectedCount = rejectedLots.filter((r) => r.closureStatus !== 'Closed').length;
  const activeUrgentCount = urgentReplenishments.filter(
    (u) => u.status !== 'Completed' && u.status !== 'Cancelled'
  ).length;
  const pendingDefectsCount = defectEvents.filter((d) => d.status === 'Pending Confirmation').length;

  const isManager = activeRole === 'Manager';
  const isProcurement = activeRole === 'Procurement' || isManager;
  const isSupervisor = activeRole === 'Supervisor' || isManager;

  interface NavItem {
    id: string;
    label: string;
    icon: React.ElementType;
    show: boolean;
    badge?: string;
    badgeColor?: string;
    children?: { id: string; label: string; icon?: React.ElementType; show: boolean }[];
  }

  const navGroups: { title: string; items: NavItem[] }[] = [
    {
      title: 'OPERATIONAL',
      items: [
        { id: 'executive-dashboard', label: 'Dashboard', icon: LayoutDashboard, show: true },
      ],
    },
    {
      title: 'QUALITY',
      items: [
        { id: 'new-inspection', label: 'New Inspection', icon: FileSpreadsheet, show: isSupervisor },
        { id: 'inspection-history', label: 'Inspection History', icon: ShieldCheck, show: isSupervisor },
        {
          id: 'rejected-lots',
          label: 'Rejected Lots',
          icon: ShieldCheck,
          badge: openRejectedCount > 0 ? `${openRejectedCount}` : undefined,
          badgeColor: 'bg-red-500 text-white',
          show: isSupervisor,
        },
      ],
    },
    {
      title: 'PRODUCTION',
      items: [
        { id: 'daily-production', label: 'Daily Production', icon: Factory, show: isSupervisor },
        {
          id: 'production-defects',
          label: 'Production Defects',
          icon: Factory,
          badge: pendingDefectsCount > 0 ? `${pendingDefectsCount}` : undefined,
          badgeColor: 'bg-amber-500 text-white',
          show: isSupervisor,
        },
      ],
    },
    {
      title: 'MRP',
      items: [
        { id: 'mrp-monthly-input', label: 'Monthly Plan', icon: Calendar, show: isProcurement },
        { id: 'mrp-monthly-plan', label: 'Planned MRP', icon: CalendarCheck, show: isProcurement },
        {
          id: 'mrp-actual-inputs',
          label: 'Actual MRP Inputs',
          icon: FileCheck,
          show: isProcurement || isSupervisor,
          children: [
            { id: 'mrp-input-usage', label: 'Daily Usage & Safety Stock', icon: Factory, show: true },
            { id: 'mrp-input-defects', label: 'Defect Inputs', icon: ShieldCheck, show: true },
            { id: 'mrp-input-confirmation', label: 'Daily Input Confirmation', icon: CalendarCheck, show: true },
          ],
        },
        { id: 'mrp-daily-actual', label: 'Daily Actual MRP', icon: FileSpreadsheet, show: isProcurement },
        { id: 'mrp-planned-vs-actual', label: 'Planned vs Actual', icon: Layers, show: isProcurement },
      ],
    },
    {
      title: 'DELIVERIES',
      items: [
        { id: 'supplier-deliveries', label: 'Supplier Deliveries', icon: Truck, show: isProcurement },
        {
          id: 'urgent-replenishments',
          label: 'Urgent Replenishments',
          icon: RotateCcw,
          badge: activeUrgentCount > 0 ? `${activeUrgentCount}` : undefined,
          badgeColor: 'bg-red-600 text-white',
          show: isProcurement,
        },
      ],
    },
    {
      title: 'ANALYTICS',
      items: [
        { id: 'quality-analytics', label: 'Quality Dashboard', icon: BarChart3, show: isSupervisor },
        { id: 'production-analytics', label: 'Production Dashboard', icon: TrendingUp, show: isSupervisor },
        { id: 'inventory-analytics', label: 'Inventory Dashboard', icon: Package, show: isProcurement },
      ],
    },
    {
      title: 'REPORTS & ADMIN',
      items: [
        { id: 'reports-exports', label: 'Reports & Exports', icon: FileText, show: isManager },
        { id: 'system-config', label: 'Administration', icon: Settings, show: isManager },
        { id: 'audit-trail', label: 'Audit Trail', icon: ClipboardList, show: isManager },
      ],
    },
  ];

  const renderNavContent = (isDrawer: boolean = false) => (
    <div className="flex flex-col h-full select-none">
      {/* Brand Header */}
      <div className={`p-3.5 sm:p-4 flex items-center justify-between border-b border-slate-800 shrink-0 ${!isDrawer && isCollapsed ? 'justify-center' : ''}`}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 bg-blue-600 rounded-md flex items-center justify-center font-bold text-white shadow-xs shrink-0">
            Q
          </div>
          {(isDrawer || !isCollapsed) && (
            <div className="truncate">
              <div className="text-sm font-bold text-white tracking-tight leading-none">QUADRA MRP</div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">Control Center</div>
            </div>
          )}
        </div>

        {isDrawer && (
          <button
            onClick={onCloseMobile}
            className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Groups */}
      <nav className="p-2 sm:p-3 space-y-4 flex-grow overflow-y-auto overflow-x-hidden">
        {navGroups.map((group) => {
          const visibleItems = group.items.filter((item) => item.show);
          if (visibleItems.length === 0) return null;

          return (
            <div key={group.title}>
              {(isDrawer || !isCollapsed) && (
                <div className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-1 px-2.5">
                  {group.title}
                </div>
              )}
              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const hasChildren = item.children && item.children.length > 0;
                  const isChildActive = hasChildren && item.children?.some((c) => currentActive === c.id);
                  const isActive = currentActive === item.id || isChildActive;

                  return (
                    <div key={item.id} className="space-y-0.5">
                      <div
                        className={`w-full flex items-center ${
                          !isDrawer && isCollapsed ? 'justify-center px-2 py-2' : 'justify-between px-2.5 py-1.5'
                        } rounded-md text-xs font-medium transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-blue-600 text-white font-semibold shadow-xs'
                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                        onClick={() => {
                          handleSelect(item.id);
                          if (hasChildren && !isMRPInputsExpanded) {
                            setIsMRPInputsExpanded(true);
                          }
                        }}
                        title={!isDrawer && isCollapsed ? item.label : undefined}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <Icon
                            className={`w-4 h-4 shrink-0 ${
                              isActive ? 'text-white' : 'text-slate-400'
                            }`}
                          />
                          {(isDrawer || !isCollapsed) && (
                            <span className="truncate">{item.label}</span>
                          )}
                        </div>

                        {(isDrawer || !isCollapsed) && (
                          <div className="flex items-center gap-1">
                            {item.badge !== undefined && (
                              <span
                                className={`px-1.5 py-0.2 text-[9px] font-bold rounded-full shrink-0 ${
                                  item.badgeColor || 'bg-blue-600 text-white'
                                }`}
                              >
                                {item.badge}
                              </span>
                            )}
                            {hasChildren && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setIsMRPInputsExpanded(!isMRPInputsExpanded);
                                }}
                                className="p-0.5 hover:bg-white/20 rounded transition-colors text-slate-300"
                              >
                                <ChevronDown
                                  className={`w-3.5 h-3.5 transition-transform ${
                                    isMRPInputsExpanded ? '' : '-rotate-90'
                                  }`}
                                />
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Cascaded Sub-menu Children */}
                      {hasChildren && isMRPInputsExpanded && (isDrawer || !isCollapsed) && (
                        <div className="ml-4 pl-2.5 border-l border-slate-700/70 space-y-0.5 py-0.5">
                          {item.children?.map((child) => {
                            const isSubActive = currentActive === child.id;
                            const SubIcon = child.icon || FileSpreadsheet;
                            return (
                              <button
                                key={child.id}
                                onClick={() => handleSelect(child.id)}
                                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-[11px] font-medium transition-colors text-left ${
                                  isSubActive
                                    ? 'bg-blue-500/30 text-blue-300 font-bold border border-blue-500/50'
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                                }`}
                              >
                                <SubIcon className="w-3 h-3 shrink-0 text-slate-400" />
                                <span className="truncate">{child.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Footer User Info & Collapse Toggle */}
      <div className="p-2.5 border-t border-slate-800 shrink-0 bg-slate-900/80">
        <div className={`flex items-center ${!isDrawer && isCollapsed ? 'justify-center flex-col gap-2' : 'justify-between'} px-1`}>
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white shrink-0">
              {currentUser.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
            </div>
            {(isDrawer || !isCollapsed) && (
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-white truncate">{currentUser.name}</span>
                <span className="text-[10px] text-slate-400 truncate">{activeRole}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            {!isDrawer && onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </button>
            )}
            <button
              onClick={logout}
              className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-red-400 transition-colors"
              title="Log Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex flex-col shrink-0 bg-[#0F172A] text-slate-300 border-r border-slate-800 transition-all duration-200 z-20 ${
          isCollapsed ? 'w-16' : 'w-56'
        }`}
      >
        {renderNavContent(false)}
      </aside>

      {/* Mobile Slide-Over Drawer with Backdrop */}
      <div
        className={`fixed inset-0 z-50 md:hidden transition-opacity duration-200 ${
          isOpenOnMobile ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
          onClick={onCloseMobile}
        />

        {/* Drawer panel */}
        <aside
          className={`fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-[#0F172A] text-slate-300 shadow-2xl z-50 transition-transform duration-200 ${
            isOpenOnMobile ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {renderNavContent(true)}
        </aside>
      </div>
    </>
  );
};
