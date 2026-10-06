import React, { useState } from 'react';
import {
  Bell,
  CheckCircle2,
  ChevronDown,
  Clock,
  Menu,
  RotateCcw,
  Shield,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ComponentCode } from '../../types';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  onOpenTestSuite: () => void;
  onOpenAqlExplorer: () => void;
  onNavigate: (view: string) => void;
  onToggleMobileNav?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenTestSuite,
  onOpenAqlExplorer,
  onNavigate,
  onToggleMobileNav,
}) => {
  const {
    currentUser,
    activeRole,
    users,
    switchUser,
    switchRole,
    logout,
    notifications,
    markNotificationRead,
    systemConfig,
    resetToDefaultData,
    currentMonth,
    setCurrentMonth,
    currentDay,
    setCurrentDay,
    activeComponent,
    setActiveComponent,
  } = useApp();

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showDateMenu, setShowDateMenu] = useState(false);

  const unreadNotifs = notifications.filter((n) => n.status === 'Unread');

  if (!currentUser) return null;

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-2.5 sm:px-4 shrink-0 shadow-xs sticky top-0 z-30">
      {/* Brand, Mobile Hamburger & Component Selector */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Mobile Hamburger Drawer Trigger */}
        <button
          onClick={onToggleMobileNav}
          className="md:hidden p-2 rounded-lg text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors shrink-0"
          aria-label="Open Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 bg-blue-600 rounded-md flex items-center justify-center font-bold text-white text-sm shadow-xs shrink-0">
            Q
          </div>
          <div className="truncate">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-tight flex items-center gap-1.5 leading-tight truncate">
              <span className="truncate max-w-[110px] xs:max-w-[140px] sm:max-w-[180px] md:max-w-[220px]">
                {systemConfig.companyName}
              </span>
              <span className="hidden md:inline-block text-[9px] font-normal text-slate-400">
                | MRP CONTROL
              </span>
            </h2>
          </div>
        </div>

        {/* Component Selector Segmented Controls */}
        <div className="flex bg-slate-100 p-0.5 rounded-md border border-slate-200/60 ml-1 sm:ml-2 shrink-0">
          {(['AA', 'BB', 'CC'] as ComponentCode[]).map((code) => {
            const isActive = activeComponent === code;
            const subtitle = code === 'AA' ? 'Outer' : code === 'BB' ? 'Inner' : 'Ridge';
            return (
              <button
                key={code}
                onClick={() => setActiveComponent(code)}
                className={`h-7 px-1.5 sm:px-2 text-[11px] font-bold rounded transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                }`}
              >
                <span>{code}</span>
                <span className="hidden sm:inline text-[9px] font-normal opacity-80 ml-1">
                  ({subtitle})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Center / Right controls */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {/* Active Working Date Selector - Full on XL+, Compact Button with Popover on Mobile/Tablet */}
        <div className="hidden xl:flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md border border-slate-200 text-xs">
          <Clock className="w-3.5 h-3.5 text-blue-600 mr-0.5" />
          <select
            value={currentMonth.split('-')[0]}
            onChange={(e) => setCurrentMonth(`${e.target.value}-${currentMonth.split('-')[1]}`)}
            className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer text-xs"
          >
            {[2024, 2025, 2026, 2027, 2028].map((y) => (
              <option key={y} value={y} className="bg-white text-slate-800">
                {y}
              </option>
            ))}
          </select>
          <span className="text-slate-400 font-bold">-</span>
          <select
            value={currentMonth.split('-')[1]}
            onChange={(e) => setCurrentMonth(`${currentMonth.split('-')[0]}-${e.target.value}`)}
            className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer text-xs"
          >
            {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map((m) => (
              <option key={m} value={m} className="bg-white text-slate-800">
                {m}
              </option>
            ))}
          </select>
          <span className="text-slate-400 font-bold">-</span>
          <select
            value={currentDay}
            onChange={(e) => setCurrentDay(Number(e.target.value))}
            className="bg-transparent font-bold text-slate-800 focus:outline-none cursor-pointer text-xs"
          >
            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d} className="bg-white text-slate-800">
                D{String(d).padStart(2, '0')}
              </option>
            ))}
          </select>
        </div>

        {/* Compact Mobile/Tablet Date Trigger Button */}
        <div className="relative xl:hidden">
          <button
            onClick={() => {
              setShowDateMenu(!showDateMenu);
              setShowNotifMenu(false);
              setShowUserMenu(false);
            }}
            className="h-8 px-2 flex items-center gap-1 rounded-md bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 transition-colors"
            title="Operating Date (Tap to change)"
          >
            <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="value-mono">D{String(currentDay).padStart(2, '0')}</span>
            <span className="text-[10px] text-slate-400 hidden xs:inline">· {currentMonth.split('-')[1]}/{currentMonth.split('-')[0].slice(2)}</span>
          </button>

          {showDateMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-lg shadow-xl p-3 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  <span>Set Operating Date</span>
                </span>
                <button
                  onClick={() => setShowDateMenu(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-2.5 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Operating Period
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={currentMonth.split('-')[0]}
                      onChange={(e) => setCurrentMonth(`${e.target.value}-${currentMonth.split('-')[1]}`)}
                      className="bg-slate-50 border border-slate-200 rounded px-2 py-1.5 font-bold text-slate-800"
                    >
                      {[2024, 2025, 2026, 2027, 2028].map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                    <select
                      value={currentMonth.split('-')[1]}
                      onChange={(e) => setCurrentMonth(`${currentMonth.split('-')[0]}-${e.target.value}`)}
                      className="bg-slate-50 border border-slate-200 rounded px-2 py-1.5 font-bold text-slate-800"
                    >
                      {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map((m) => (
                        <option key={m} value={m}>Month {m}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Operating Day
                  </label>
                  <select
                    value={currentDay}
                    onChange={(e) => {
                      setCurrentDay(Number(e.target.value));
                      setShowDateMenu(false);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1.5 font-bold text-slate-800"
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>
                        Day {d} ({currentMonth}-{String(d).padStart(2, '0')})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* AQL Explorer Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenAqlExplorer}
          className="h-8 hidden lg:flex items-center gap-1.5 text-xs text-slate-700"
        >
          <Shield className="w-3.5 h-3.5 text-blue-600" />
          <span>AQL Tables</span>
        </Button>

        {/* Reset Baseline Data */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            if (confirm('Reset system data back to the clean initial seed baseline?')) {
              resetToDefaultData();
            }
          }}
          className="h-8 w-8 text-slate-400 hover:text-slate-700 hover:bg-slate-100 hidden sm:flex"
          title="Reset Baseline Data"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>

        {/* Notifications Dropdown */}
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setShowNotifMenu(!showNotifMenu);
              setShowUserMenu(false);
            }}
            className="h-8 w-8 relative text-slate-500 hover:text-slate-800 hover:bg-slate-100"
            title="Procurement & Quality Alerts"
          >
            <Bell className="w-4 h-4" />
            {unreadNotifs.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-600 rounded-full animate-pulse" />
            )}
          </Button>

          {showNotifMenu && (
            <div className="absolute right-0 mt-2 w-72 sm:w-80 max-w-[calc(100vw-1rem)] bg-white border border-slate-200 rounded-lg shadow-xl py-2 z-50">
              <div className="px-3 sm:px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                <span className="font-bold text-xs text-slate-800 uppercase tracking-wide">
                  Alerts ({notifications.length})
                </span>
                <span className="text-[10px] font-semibold text-blue-600">
                  {unreadNotifs.length} unread
                </span>
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="p-4 text-xs text-slate-400 text-center">No active alerts</div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => {
                        markNotificationRead(n.id);
                        if (n.link) onNavigate(n.link);
                        setShowNotifMenu(false);
                      }}
                      className={`p-3 text-xs cursor-pointer hover:bg-slate-50 transition-colors ${
                        n.status === 'Unread' ? 'bg-blue-50/60' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {n.type === 'STOCK_ADDED' && (
                            <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[9px] font-bold shrink-0">
                              + STOCK ADDED
                            </span>
                          )}
                          {n.type === 'REJECTED_LOT' && (
                            <span className="px-1.5 py-0.2 rounded bg-rose-100 text-rose-800 text-[9px] font-bold shrink-0">
                              REJECTED
                            </span>
                          )}
                          {n.type === 'URGENT_REPLENISHMENT' && (
                            <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[9px] font-bold shrink-0">
                              REPLENISH
                            </span>
                          )}
                          <span className="font-bold text-slate-800 truncate">{n.title}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono shrink-0">
                          {new Date(n.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-slate-600 mt-1 line-clamp-2 text-[11px]">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Account & Role Switcher */}
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setShowUserMenu(!showUserMenu);
              setShowNotifMenu(false);
            }}
            className="h-8 flex items-center gap-1.5 sm:gap-2 px-1.5 sm:px-2 bg-slate-50 hover:bg-slate-100 border-slate-200"
          >
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 ${currentUser.avatarColor}`}
            >
              {currentUser.name[0]}
            </div>
            <div className="text-left hidden sm:block leading-none">
              <div className="text-xs font-bold text-slate-800 truncate max-w-[90px] md:max-w-[110px]">
                {currentUser.name.split(' (')[0]}
              </div>
              <div className="text-[9px] text-blue-600 font-semibold">{activeRole}</div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </Button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-64 max-w-[calc(100vw-1rem)] bg-white border border-slate-200 rounded-lg shadow-xl py-2 z-50">
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Active Role
                </p>
                <div className="mt-1 space-y-1">
                  {currentUser.roles.map((r) => (
                    <button
                      key={r}
                      onClick={() => {
                        switchRole(r);
                        setShowUserMenu(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded text-xs flex items-center justify-between font-medium ${
                        activeRole === r
                          ? 'bg-blue-50 text-blue-700 font-bold'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span>{r}</span>
                      {activeRole === r && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Switch User Account
                </p>
                <div className="mt-1 space-y-1">
                  {users.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => {
                        switchUser(u.id);
                        setShowUserMenu(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded text-xs flex items-center gap-2 ${
                        currentUser.id === u.id
                          ? 'bg-slate-100 text-slate-900 font-bold'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className={`w-2 h-2 shrink-0 rounded-full ${u.avatarColor}`} />
                      <div className="truncate">
                        <div className="truncate">{u.name.split(' (')[0]}</div>
                        <div className="text-[10px] text-slate-400 font-normal truncate">
                          {u.roles.join(', ')}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-2">
                <button
                  onClick={logout}
                  className="w-full px-2.5 py-1.5 rounded text-xs font-bold text-red-600 hover:bg-red-50 text-left transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
