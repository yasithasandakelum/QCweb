import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  AUGUST_2026_PLANNED_OUTPUTS,
  INITIAL_AUDIT_LOGS,
  INITIAL_DEFECT_EVENTS,
  INITIAL_DELIVERIES,
  INITIAL_INSPECTIONS,
  INITIAL_NOTIFICATIONS,
  INITIAL_PRODUCTION_RECORDS,
  INITIAL_REJECTED_LOTS,
  INITIAL_SYSTEM_CONFIG,
  INITIAL_URGENT_REPLENISHMENTS,
  INITIAL_USERS,
} from '../data/seedData';
import {
  evaluateDoubleStage1,
  evaluateDoubleStage2,
  evaluateSingleInspection,
  getDoubleSamplingPlan,
  getSingleSamplingPlan,
} from '../services/aqlEngine';
import { calculateTargetDate, generateNextDeliveryNumber, splitLorries } from '../services/deliveryEngine';
import { calculateActualMRP, calculatePlannedMRP, consolidateDeliveryPlans } from '../services/mrpEngine';
import {
  ActualMRPRow,
  ActualMRPInputStatus,
  AuditLogItem,
  ComponentActualMRPInput,
  ComponentCode,
  DailyActualMRPInputRecord,
  DailyModelOutput,
  DailyProductionConfirmation,
  DailyProductionRecord,
  DefectImage,
  DefectItem,
  DefectSourceCategory,
  DeliveryRecord,
  InspectionRecord,
  MonthlyMRPPlan,
  ManualActualOverride,
  NotificationItem,
  PlannedMRPRow,
  ProductionDefectEvent,
  RejectedLotRecord,
  SystemConfig,
  UrgentReplenishmentRecord,
  UserAccount,
  UserRole,
} from '../types';

interface AppContextType {
  // User & Auth
  currentUser: UserAccount | null;
  activeRole: UserRole | null;
  users: UserAccount[];
  isLoggedIn: boolean;
  login: (userId: string) => void;
  logout: () => void;
  switchUser: (userId: string) => void;
  switchRole: (role: UserRole) => void;
  fastSwitchLogin: (role: 'Procurement Admin' | 'Supervisor') => void;

  // System Configuration
  systemConfig: SystemConfig;
  updateSystemConfig: (newConfig: Partial<SystemConfig>) => void;
  updateComponentConfig: (code: ComponentCode, minDelivery: number | null, maxDelivery?: number) => void;

  // Inspections
  inspections: InspectionRecord[];
  createInspection: (data: Omit<InspectionRecord, 'id' | 'createdAt' | 'status' | 'finalDecision'>) => InspectionRecord;
  updateInspectionStage2: (id: string, stage2Defects: number, newDefectItems?: DefectItem[]) => void;
  updateInspection: (id: string, updates: Partial<InspectionRecord>) => void;
  approveInspection: (id: string, supervisorName: string, signature: string) => void;
  addInspectionImage: (inspectionId: string, image: Omit<DefectImage, 'id' | 'uploadedAt'>) => void;

  // Production
  productionRecords: DailyProductionRecord[];
  recordDailyProduction: (
    date: string,
    outputs: DailyModelOutput[],
    safetyStockUsage?: { used: boolean; AA: number; BB: number; CC: number }
  ) => void;
  recordActualMRPInputs: (
    date: string,
    usageData: {
      AA: { actualUsage: number; safetyStockUsed: boolean; safetyStockQuantity: number };
      BB: { actualUsage: number; safetyStockUsed: boolean; safetyStockQuantity: number };
      CC: { actualUsage: number; safetyStockUsed: boolean; safetyStockQuantity: number };
    },
    status?: 'Draft' | 'Confirmed',
    notes?: string
  ) => void;
  actualMRPInputs: Record<string, DailyActualMRPInputRecord>;
  saveActualMRPInputDraft: (
    date: string,
    inputs: Record<ComponentCode, ComponentActualMRPInput>,
    notes?: string
  ) => void;
  confirmActualMRPInputs: (
    date: string,
    inputs: Record<ComponentCode, ComponentActualMRPInput>,
    notes?: string
  ) => void;
  saveComponentDefectInputs: (
    date: string,
    componentCode: ComponentCode,
    defects: {
      warehouseDefects: number;
      assemblyDefects: number;
      safetyStockDefects: number;
    },
    notes?: string
  ) => void;
  addDefectLogEntry: (
    date: string,
    componentCode: ComponentCode,
    category: DefectSourceCategory,
    quantity: number,
    reason: string,
    notes?: string
  ) => void;
  defectEvents: ProductionDefectEvent[];
  addDefectEvent: (date: string, componentCode: ComponentCode, reason: string, quantity: number, notes?: string, sourceCategory?: DefectSourceCategory) => void;
  deleteDefectEvent: (id: string) => void;
  confirmProductionDay: (date: string, notes?: string) => void;
  dayConfirmations: DailyProductionConfirmation[];

  // MRP & Manual Data Entry
  currentMonth: string; // "2026-08"
  setCurrentMonth: (month: string) => void;
  currentDay: number; // 8 (current working day of August 2026)
  setCurrentDay: (day: number) => void;
  monthlyPlans: Record<string, MonthlyMRPPlan>;
  activeComponent: ComponentCode;
  setActiveComponent: (code: ComponentCode) => void;
  plannedOutputs: number[];
  updatePlannedDayOutput: (day: number, quantity: number) => void;
  updateAllPlannedOutputs: (outputs: number[]) => void;
  openingInventory: Record<ComponentCode, number>;
  updateOpeningInventory: (code: ComponentCode, qty: number) => void;
  getComponentStock: (code: ComponentCode) => number;
  manualActualOverrides: Record<ComponentCode, Record<number, ManualActualOverride>>;
  updateManualActualMRPRow: (day: number, code: ComponentCode, updates: ManualActualOverride, reason?: string) => void;
  clearManualActualOverride: (day: number, code: ComponentCode) => void;
  manualPlannedDeliveries: Record<ComponentCode, Record<number, number>>;
  updateManualPlannedDelivery: (code: ComponentCode, day: number, quantity: number) => void;
  updateAllManualPlannedDeliveries: (code: ComponentCode, deliveries: Record<number, number>) => void;
  clearManualPlannedDeliveries: (code: ComponentCode) => void;

  // Deliveries & Urgent
  deliveries: DeliveryRecord[];
  updateDeliveryQuantity: (id: string, newQty: number, reason: string) => void;
  createDelivery: (delivery: Omit<DeliveryRecord, 'id' | 'businessDeliveryNumber' | 'deliveryFamilyNumber' | 'replacementSequence'>) => void;
  receiveSupplierDelivery: (
    orderCode: string,
    componentCode: ComponentCode,
    actualQuantity: number,
    lorryNo: string,
    arrivalTime: string,
    notes?: string,
    deliveryCondition?: 'Normal' | 'Damaged cartons' | 'Missing items' | 'Other',
    receivedDate?: string
  ) => DeliveryRecord;
  urgentReplenishments: UrgentReplenishmentRecord[];
  updateUrgentStatus: (id: string, status: UrgentReplenishmentRecord['status'], confirmedDate?: string) => void;
  rejectedLots: RejectedLotRecord[];

  // Notifications & Audit
  notifications: NotificationItem[];
  addNotification: (notification: {
    title: string;
    message: string;
    type: 'info' | 'warning' | 'alert' | 'success';
  }) => void;
  markNotificationRead: (id: string) => void;
  auditLogs: AuditLogItem[];
  addAuditLog: (action: string, entityType: string, entityId: string, details: string) => void;

  // Helper / Reset
  resetToDefaultData: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Auth & Users State
  const [users] = useState<UserAccount[]>(INITIAL_USERS);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    const saved = localStorage.getItem('mrp_current_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [activeRole, setActiveRole] = useState<UserRole | null>(() => {
    const saved = localStorage.getItem('mrp_active_role');
    return saved ? JSON.parse(saved) : null;
  });
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(!!currentUser);

  // 2. Configuration State
  const [systemConfig, setSystemConfig] = useState<SystemConfig>(() => {
    const saved = localStorage.getItem('mrp_system_config');
    return saved ? JSON.parse(saved) : INITIAL_SYSTEM_CONFIG;
  });

  // 3. Inspections & Quality
  const [inspections, setInspections] = useState<InspectionRecord[]>(() => {
    const saved = localStorage.getItem('mrp_inspections');
    return saved ? JSON.parse(saved) : INITIAL_INSPECTIONS;
  });

  // 4. Production & Defects
  const [productionRecords, setProductionRecords] = useState<DailyProductionRecord[]>(() => {
    const saved = localStorage.getItem('mrp_production_records');
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTION_RECORDS;
  });

  const [defectEvents, setDefectEvents] = useState<ProductionDefectEvent[]>(() => {
    const saved = localStorage.getItem('mrp_defect_events');
    return saved ? JSON.parse(saved) : INITIAL_DEFECT_EVENTS;
  });

  const [dayConfirmations, setDayConfirmations] = useState<DailyProductionConfirmation[]>(() => {
    const saved = localStorage.getItem('mrp_day_confirmations');
    return saved ? JSON.parse(saved) : [
      {
        id: 'conf-1',
        date: '2026-08-01',
        confirmedBy: 'James Thornton',
        confirmedAt: '2026-08-01T17:30:00Z',
        status: 'Confirmed',
      },
    ];
  });

  const [actualMRPInputs, setActualMRPInputs] = useState<Record<string, DailyActualMRPInputRecord>>(() => {
    const saved = localStorage.getItem('mrp_actual_inputs');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return {
      '2026-08-01': {
        id: 'mrp-in-2026-08-01',
        date: '2026-08-01',
        components: {
          AA: {
            actualUsage: 380,
            safetyStockUsed: true,
            safetyStockQuantity: 10,
            warehouseDefects: 0,
            assemblyDefects: 3,
            safetyStockDefects: 1,
            inspectionDefects: 0,
            qualityFailsTotal: 4,
            status: 'Confirmed',
            defectStatus: 'Defect Inputs Saved',
          },
          BB: {
            actualUsage: 380,
            safetyStockUsed: false,
            safetyStockQuantity: 0,
            warehouseDefects: 0,
            assemblyDefects: 1,
            safetyStockDefects: 0,
            inspectionDefects: 0,
            qualityFailsTotal: 1,
            status: 'Confirmed',
            defectStatus: 'Defect Inputs Saved',
          },
          CC: {
            actualUsage: 1140,
            safetyStockUsed: false,
            safetyStockQuantity: 0,
            warehouseDefects: 0,
            assemblyDefects: 6,
            safetyStockDefects: 2,
            inspectionDefects: 0,
            qualityFailsTotal: 8,
            status: 'Confirmed',
            defectStatus: 'Defect Inputs Saved',
          },
        },
        overallStatus: 'Confirmed',
        confirmedAt: '2026-08-01T17:30:00Z',
        confirmedBy: 'James Thornton',
        notes: 'Initial Day 1 inputs verified and confirmed',
      },
    };
  });

  // 5. Deliveries, Replenishments, Rejected Lots
  const [deliveries, setDeliveries] = useState<DeliveryRecord[]>(() => {
    const saved = localStorage.getItem('mrp_deliveries');
    return saved ? JSON.parse(saved) : INITIAL_DELIVERIES;
  });

  const [urgentReplenishments, setUrgentReplenishments] = useState<UrgentReplenishmentRecord[]>(() => {
    const saved = localStorage.getItem('mrp_urgent_replenishments');
    return saved ? JSON.parse(saved) : INITIAL_URGENT_REPLENISHMENTS;
  });

  const [rejectedLots, setRejectedLots] = useState<RejectedLotRecord[]>(() => {
    const saved = localStorage.getItem('mrp_rejected_lots');
    return saved ? JSON.parse(saved) : INITIAL_REJECTED_LOTS;
  });

  // 6. Notifications & Audit
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    const saved = localStorage.getItem('mrp_notifications');
    return saved ? JSON.parse(saved) : INITIAL_NOTIFICATIONS;
  });

  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>(() => {
    const saved = localStorage.getItem('mrp_audit_logs');
    return saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
  });

  // 7. Navigation / View selectors & MRP Customizations
  const [currentMonth, setCurrentMonth] = useState<string>('2026-08');
  const [currentDay, setCurrentDay] = useState<number>(1); // Confirmed through day 1
  const [activeComponent, setActiveComponent] = useState<ComponentCode>('AA');

  const [plannedOutputs, setPlannedOutputs] = useState<number[]>(() => {
    const saved = localStorage.getItem('mrp_planned_outputs');
    return saved ? JSON.parse(saved) : AUGUST_2026_PLANNED_OUTPUTS;
  });

  const [openingInventory, setOpeningInventory] = useState<Record<ComponentCode, number>>(() => {
    try {
      const saved = localStorage.getItem('mrp_opening_inventory');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return {
            AA: typeof parsed.AA === 'number' ? parsed.AA : 500,
            BB: typeof parsed.BB === 'number' ? parsed.BB : 500,
            CC: typeof parsed.CC === 'number' ? parsed.CC : 500,
          };
        }
      }
    } catch {
      // fallback
    }
    return { AA: 500, BB: 500, CC: 500 };
  });

  const [manualActualOverrides, setManualActualOverrides] = useState<
    Record<ComponentCode, Record<number, ManualActualOverride>>
  >(() => {
    try {
      const saved = localStorage.getItem('mrp_manual_actual_overrides');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return {
            AA: parsed.AA || {},
            BB: parsed.BB || {},
            CC: parsed.CC || {},
          };
        }
      }
    } catch {
      // fallback
    }
    return { AA: {}, BB: {}, CC: {} };
  });

  const [manualPlannedDeliveries, setManualPlannedDeliveries] = useState<
    Record<ComponentCode, Record<number, number>>
  >(() => {
    try {
      const saved = localStorage.getItem('mrp_manual_planned_deliveries');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return {
            AA: parsed.AA || {},
            BB: parsed.BB || {},
            CC: parsed.CC || {},
          };
        }
      }
    } catch {
      // fallback
    }
    return { AA: {}, BB: { 2: 160, 8: 160 }, CC: {} };
  });

  useEffect(() => {
    localStorage.setItem('mrp_manual_planned_deliveries', JSON.stringify(manualPlannedDeliveries));
  }, [manualPlannedDeliveries]);

  // Migrate users to fresh seed data where actuals exactly match plans
  useEffect(() => {
    const initialized = localStorage.getItem('mrp_seed_v6');
    if (!initialized) {
      localStorage.clear();
      localStorage.setItem('mrp_seed_v6', 'true');
      setSystemConfig(INITIAL_SYSTEM_CONFIG);
      setInspections(INITIAL_INSPECTIONS);
      setProductionRecords(INITIAL_PRODUCTION_RECORDS);
      setDefectEvents(INITIAL_DEFECT_EVENTS);
      setDeliveries(INITIAL_DELIVERIES);
      setUrgentReplenishments(INITIAL_URGENT_REPLENISHMENTS);
      setRejectedLots(INITIAL_REJECTED_LOTS);
      setNotifications(INITIAL_NOTIFICATIONS);
      setAuditLogs(INITIAL_AUDIT_LOGS);
      setPlannedOutputs(AUGUST_2026_PLANNED_OUTPUTS);
      setOpeningInventory({ AA: 500, BB: 500, CC: 500 });
      setManualActualOverrides({ AA: {}, BB: {}, CC: {} });
      setManualPlannedDeliveries({
        AA: {},
        BB: { 2: 160, 8: 160 },
        CC: {}
      });
      setCurrentDay(1);
      setDayConfirmations([
        {
          id: 'conf-1',
          date: '2026-08-01',
          confirmedBy: 'James Thornton',
          confirmedAt: '2026-08-01T17:30:00Z',
          status: 'Confirmed',
        },
      ]);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('mrp_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('mrp_current_user');
    }
  }, [currentUser]);

  useEffect(() => {
    if (activeRole) {
      localStorage.setItem('mrp_active_role', JSON.stringify(activeRole));
    } else {
      localStorage.removeItem('mrp_active_role');
    }
  }, [activeRole]);

  // Helper to persist state
  useEffect(() => {
    localStorage.setItem('mrp_system_config', JSON.stringify(systemConfig));
  }, [systemConfig]);

  useEffect(() => {
    localStorage.setItem('mrp_inspections', JSON.stringify(inspections));
  }, [inspections]);

  useEffect(() => {
    localStorage.setItem('mrp_production_records', JSON.stringify(productionRecords));
  }, [productionRecords]);

  useEffect(() => {
    localStorage.setItem('mrp_actual_inputs', JSON.stringify(actualMRPInputs));
  }, [actualMRPInputs]);

  useEffect(() => {
    localStorage.setItem('mrp_defect_events', JSON.stringify(defectEvents));
  }, [defectEvents]);

  useEffect(() => {
    localStorage.setItem('mrp_deliveries', JSON.stringify(deliveries));
  }, [deliveries]);

  useEffect(() => {
    localStorage.setItem('mrp_urgent_replenishments', JSON.stringify(urgentReplenishments));
  }, [urgentReplenishments]);

  useEffect(() => {
    localStorage.setItem('mrp_rejected_lots', JSON.stringify(rejectedLots));
  }, [rejectedLots]);

  useEffect(() => {
    localStorage.setItem('mrp_notifications', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem('mrp_audit_logs', JSON.stringify(auditLogs));
  }, [auditLogs]);

  useEffect(() => {
    localStorage.setItem('mrp_planned_outputs', JSON.stringify(plannedOutputs));
  }, [plannedOutputs]);

  useEffect(() => {
    localStorage.setItem('mrp_opening_inventory', JSON.stringify(openingInventory));
  }, [openingInventory]);

  useEffect(() => {
    localStorage.setItem('mrp_manual_actual_overrides', JSON.stringify(manualActualOverrides));
  }, [manualActualOverrides]);

  useEffect(() => {
    localStorage.setItem('mrp_day_confirmations', JSON.stringify(dayConfirmations));
  }, [dayConfirmations]);

  // Audit logger helper
  const addAuditLog = (action: string, entityType: string, entityId: string, details: string) => {
    const log: AuditLogItem = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      timestamp: new Date().toISOString(),
      userName: currentUser?.name || 'System',
      userRole: activeRole || 'System',
      action,
      entityType,
      entityId,
      details,
    };
    setAuditLogs((prev) => [log, ...prev]);
  };

  // 8. Reactive MRP Calculation Engine
  const monthlyPlans = useMemo(() => {
    const components: ComponentCode[] = ['AA', 'BB', 'CC'];

    const openInv = {
      AA: openingInventory?.AA ?? systemConfig?.defaultOpeningInventory ?? 500,
      BB: openingInventory?.BB ?? systemConfig?.defaultOpeningInventory ?? 500,
      CC: openingInventory?.CC ?? systemConfig?.defaultOpeningInventory ?? 500,
    };

    const buildPlanForMonth = (targetMonth: string): MonthlyMRPPlan => {
      const [yearStr, monthNumStr] = targetMonth.split('-');
      const year = parseInt(yearStr, 10) || 2026;
      const monthNum = parseInt(monthNumStr, 10) || 8;
      const daysInMonth = new Date(year, monthNum, 0).getDate();

      const plannedRowsObj: Record<ComponentCode, PlannedMRPRow[]> = {
        AA: [],
        BB: [],
        CC: [],
      };

      const actualRowsObj: Record<ComponentCode, ActualMRPRow[]> = {
        AA: [],
        BB: [],
        CC: [],
      };

      const monthPlannedOutputs = Array.from(
        { length: daysInMonth },
        (_, i) => plannedOutputs[i] ?? 70
      );

      components.forEach((code) => {
        const cfg = systemConfig?.components?.[code] ?? INITIAL_SYSTEM_CONFIG.components[code];

        // Calculate Planned Baseline (Locked, re-computes on planned output changes)
        const rawPlanned = calculatePlannedMRP(
          code,
          daysInMonth,
          targetMonth,
          openInv[code],
          monthPlannedOutputs,
          cfg,
          systemConfig?.safetyStockTarget ?? 50,
          manualPlannedDeliveries?.[code]
        );
        const consolidatedPlanned = consolidateDeliveryPlans(rawPlanned, cfg);
        plannedRowsObj[code] = consolidatedPlanned;

        // Calculate Actual MRP Rows
        actualRowsObj[code] = calculateActualMRP(
          code,
          daysInMonth,
          targetMonth,
          openInv[code],
          productionRecords,
          defectEvents,
          inspections,
          consolidatedPlanned,
          cfg,
          systemConfig,
          currentDay,
          targetMonth === currentMonth ? manualActualOverrides?.[code] : undefined
        );
      });

      return {
        id: `mrp-${targetMonth}`,
        month: targetMonth,
        status: 'Locked',
        createdBy: 'Sarah Chen',
        approvedBy: 'Sarah Chen',
        approvedAt: `${targetMonth}-01T08:00:00Z`,
        openingInventory: openInv,
        plannedRows: plannedRowsObj,
        actualRows: actualRowsObj,
        version: 1,
      };
    };

    const plansCache: Record<string, MonthlyMRPPlan> = {};
    plansCache['2026-08'] = buildPlanForMonth('2026-08');
    if (currentMonth && currentMonth !== '2026-08') {
      plansCache[currentMonth] = buildPlanForMonth(currentMonth);
    }

    return new Proxy(plansCache, {
      get(target, prop: string | symbol) {
        if (typeof prop === 'string') {
          if (prop in target) {
            return target[prop];
          }
          if (prop.match(/^\d{4}-\d{2}$/)) {
            target[prop] = buildPlanForMonth(prop);
            return target[prop];
          }
        }
        return (target as any)[prop];
      },
    });
  }, [systemConfig, productionRecords, defectEvents, inspections, currentDay, plannedOutputs, openingInventory, currentMonth, manualActualOverrides, manualPlannedDeliveries]);

  // Actions
  const login = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (user) {
      setCurrentUser(user);
      setActiveRole(user.roles[0]);
      setIsLoggedIn(true);
      addAuditLog('USER_LOGIN', 'UserAccount', user.id, `User logged in: ${user.name}`);
    }
  };

  const logout = () => {
    if (currentUser) {
      addAuditLog('USER_LOGOUT', 'UserAccount', currentUser.id, `User logged out: ${currentUser?.name || 'System'}`);
    }
    setCurrentUser(null);
    setActiveRole(null);
    setIsLoggedIn(false);
  };

  const switchUser = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (user) {
      setCurrentUser(user);
      setActiveRole(user.roles[0]);
    }
  };

  const switchRole = (role: UserRole) => {
    setActiveRole(role);
  };

  const updateSystemConfig = (newConfig: Partial<SystemConfig>) => {
    setSystemConfig((prev) => {
      const updated = { ...prev, ...newConfig };
      addAuditLog('UPDATE_SYSTEM_CONFIG', 'SystemConfig', 'global', 'Updated system parameters.');
      return updated;
    });
  };

  const updateComponentConfig = (
    code: ComponentCode,
    minDelivery: number | null,
    maxDelivery?: number
  ) => {
    setSystemConfig((prev) => {
      const comp = prev.components[code];
      const updatedComp = {
        ...comp,
        minDeliveryQty: minDelivery,
        isMinConfirmed: minDelivery !== null && minDelivery > 0,
        maxDeliveryQty: maxDelivery ?? comp.maxDeliveryQty,
      };

      addAuditLog(
        'UPDATE_COMPONENT_CONFIG',
        'ComponentConfig',
        code,
        `Updated ${code} config: Min Delivery = ${minDelivery ?? 'Not Confirmed'}, Max = ${updatedComp.maxDeliveryQty}`
      );

      return {
        ...prev,
        components: {
          ...prev.components,
          [code]: updatedComp,
        },
      };
    });
  };

  const handleRejectedLot = (data: InspectionRecord) => {
    const rejectedLotId = `rej-${Date.now()}`;
    const urgId = `urg-${Date.now()}`;
    const replacementDelCode = `${data.deliveryFamilyNumber}-R${data.replacementSequence + 1}`;

    const newRejectedLot: RejectedLotRecord = {
      id: rejectedLotId,
      inspectionId: data.id,
      deliveryNumber: data.deliveryNumber,
      componentCode: data.componentCode,
      lotSize: data.lotSize,
      defectCount: data.totalDefectCount,
      reasons: data.defects.map((d) => `${d.reason} (${d.count})`),
      rejectedDate: data.lotReceivedDate,
      returnedToSupplier: true,
      returnedAt: new Date().toISOString(),
      procurementNotified: true,
      procurementNotifiedAt: new Date().toISOString(),
      urgentReplacementId: urgId,
      replacementDeliveryNumber: replacementDelCode,
      closureStatus: 'Replacement In Progress',
    };
    setRejectedLots((prev) => [newRejectedLot, ...prev]);

    // Create Urgent Replenishment record
    const targetDate = calculateTargetDate(data.lotReceivedDate, systemConfig.urgentReplacementLeadDays);
    const newUrgent: UrgentReplenishmentRecord = {
      id: urgId,
      sourceType: 'REJECTED_LOT',
      sourceId: data.id,
      componentCode: data.componentCode,
      quantity: data.lotSize,
      requestedAt: new Date().toISOString(),
      targetDate,
      status: 'Awaiting Supplier Confirmation',
      reason: `Rejected Lot ${data.deliveryNumber} Replacement (${data.totalDefectCount} defects)`,
      procurementNotified: true,
      procurementNotifiedAt: new Date().toISOString(),
      emailSentStatus: 'Sent',
    };
    setUrgentReplenishments((prev) => [newUrgent, ...prev]);

    // Add Notification
    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      type: 'REJECTED_LOT',
      title: `Rejected Lot: ${data.deliveryNumber} (${data.lotSize} ${data.componentCode})`,
      message: `Lot ${data.deliveryNumber} was rejected with ${data.totalDefectCount} defects. Urgent replacement ${replacementDelCode} requested for target arrival ${targetDate}.`,
      recipient: systemConfig.procurementEmail,
      status: 'Unread',
      createdAt: new Date().toISOString(),
      link: 'rejected-lots',
    };
    setNotifications((prev) => [newNotif, ...prev]);

    // Create Planned Replacement Delivery record
    const newDel: DeliveryRecord = {
      id: `del-${Date.now()}`,
      businessDeliveryNumber: replacementDelCode,
      deliveryFamilyNumber: data.deliveryFamilyNumber,
      replacementSequence: data.replacementSequence + 1,
      componentCode: data.componentCode,
      plannedDate: targetDate,
      plannedQuantity: data.lotSize,
      updatedQuantity: data.lotSize,
      lorries: splitLorries(data.lotSize, systemConfig.components[data.componentCode]),
      status: 'Planned',
      urgentAdjustment: 0,
      notes: `Urgent replacement for rejected lot ${data.deliveryNumber}`,
    };
    setDeliveries((prev) => [newDel, ...prev]);
  };

  const createInspection = (
    data: Omit<InspectionRecord, 'id' | 'createdAt' | 'status' | 'finalDecision'>
  ): InspectionRecord => {
    let finalDecision: 'Accepted' | 'Rejected' | 'Pending' = 'Pending';
    let status: InspectionRecord['status'] = 'Completed';

    if (data.samplingMethod === 'Single') {
      finalDecision = evaluateSingleInspection(
        data.totalDefectCount,
        data.acStage1,
        data.reStage1
      );
      status = 'Awaiting Supervisor Approval';
    } else {
      // Double Sampling
      if (data.stage2DefectsCount !== undefined) {
        finalDecision = evaluateDoubleStage2(
          data.stage1DefectsCount,
          data.stage2DefectsCount,
          data.acStage2 ?? 4,
          data.reStage2 ?? 5
        );
        status = 'Awaiting Supervisor Approval';
      } else {
        // Double Sampling Stage 1 only
        const stage1Eval = evaluateDoubleStage1(
          data.stage1DefectsCount,
          data.acStage1,
          data.reStage1
        );
        if (stage1Eval === 'Second Sample Required') {
          status = 'Second Sample Required';
          finalDecision = 'Pending';
        } else {
          finalDecision = stage1Eval;
          status = 'Awaiting Supervisor Approval';
        }
      }
    }

    const newRecord: InspectionRecord = {
      ...data,
      id: `insp-${Date.now()}`,
      finalDecision,
      status,
      createdAt: new Date().toISOString(),
    };

    setInspections((prev) => [newRecord, ...prev]);

    // Handle Stock & Delivery Update upon Inspection Decision
    if (finalDecision === 'Accepted') {
      // 1. Advance currentDay if inspection lot date is beyond currentDay
      const dayNum = parseInt(data.lotReceivedDate.split('-')[2], 10);
      if (!isNaN(dayNum) && dayNum > currentDay) {
        setCurrentDay(dayNum);
      }

      // 2. Update deliveries ledger: mark delivery as Inspected - Accepted with actual quantity
      setDeliveries((prev) => {
        const matchingIdx = prev.findIndex(
          (d) => d.businessDeliveryNumber.toLowerCase() === data.deliveryNumber.toLowerCase()
        );
        if (matchingIdx >= 0) {
          return prev.map((d, idx) =>
            idx === matchingIdx
              ? {
                  ...d,
                  status: 'Inspected - Accepted',
                  actualQuantity: data.lotSize,
                  confirmedDate: data.lotReceivedDate,
                  lorries:
                    d.lorries && d.lorries.length > 0
                      ? d.lorries
                      : [{ lorryNumber: 1, quantity: data.lotSize, vehicleRef: data.vehicleRef || 'LORRY-7742' }],
                }
              : d
          );
        } else {
          const newDel: DeliveryRecord = {
            id: `del-${Date.now()}`,
            businessDeliveryNumber: data.deliveryNumber,
            deliveryFamilyNumber: data.deliveryFamilyNumber,
            replacementSequence: data.replacementSequence,
            componentCode: data.componentCode,
            plannedDate: data.lotReceivedDate,
            confirmedDate: data.lotReceivedDate,
            plannedQuantity: data.lotSize,
            updatedQuantity: data.lotSize,
            actualQuantity: data.lotSize,
            lorries: [{ lorryNumber: 1, quantity: data.lotSize, vehicleRef: data.vehicleRef || 'LORRY-7742' }],
            status: 'Inspected - Accepted',
            urgentAdjustment: 0,
            notes: data.notes || `Received & inspected on ${data.lotReceivedDate}`,
          };
          return [newDel, ...prev];
        }
      });

      // 3. Add in-app notification confirming stock addition
      const newNotif: NotificationItem = {
        id: `notif-${Date.now()}`,
        type: 'STOCK_ADDED',
        title: `Stock Added: +${data.lotSize} ${data.componentCode} (${data.deliveryNumber})`,
        message: `Delivery ${data.deliveryNumber} accepted: +${data.lotSize} units received into inventory on ${data.lotReceivedDate}. Incoming sample defects (${data.totalDefectCount}) tracked in Quality Scrap. Net usable inventory effect: +${data.lotSize - data.totalDefectCount} units.`,
        recipient: currentUser?.name || 'Warehouse / MRP',
        status: 'Unread',
        createdAt: new Date().toISOString(),
        link: 'mrp-daily-actual',
      };
      setNotifications((prev) => [newNotif, ...prev]);
    } else if (finalDecision === 'Rejected') {
      handleRejectedLot(newRecord);
      setDeliveries((prev) =>
        prev.map((d) =>
          d.businessDeliveryNumber.toLowerCase() === data.deliveryNumber.toLowerCase()
            ? {
                ...d,
                status: 'Inspected - Rejected',
                actualQuantity: 0,
                confirmedDate: data.lotReceivedDate,
              }
            : d
        )
      );
    }

    addAuditLog(
      finalDecision === 'Accepted' ? 'INSPECTION_ACCEPTED' : 'INSPECTION_REJECTED',
      'Inspection',
      newRecord.id,
      `Inspected ${data.deliveryNumber} (${data.lotSize} ${data.componentCode}): Result = ${finalDecision} (${data.totalDefectCount} defects). +${finalDecision === 'Accepted' ? data.lotSize : 0} units added to stock.`
    );

    return newRecord;
  };

  const updateInspectionStage2 = (
    id: string,
    stage2Defects: number,
    newDefectItems?: DefectItem[]
  ) => {
    const inspIndex = inspections.findIndex((i) => i.id === id);
    if (inspIndex === -1) return;

    const insp = inspections[inspIndex];
    const totalDefects = insp.stage1DefectsCount + stage2Defects;
    const ac2 = insp.acStage2 ?? 4;
    const re2 = insp.reStage2 ?? 5;
    const decision = evaluateDoubleStage2(insp.stage1DefectsCount, stage2Defects, ac2, re2);

    let updatedDefects: DefectItem[] = [...insp.defects];
    if (newDefectItems && newDefectItems.length > 0) {
      const mergedMap: Record<string, DefectItem> = {};
      insp.defects.forEach((d) => {
        mergedMap[d.reason] = { ...d };
      });

      newDefectItems.forEach((d) => {
        if (d.count > 0) {
          if (mergedMap[d.reason]) {
            mergedMap[d.reason].count += d.count;
            if (d.notes) {
              mergedMap[d.reason].notes = mergedMap[d.reason].notes
                ? `${mergedMap[d.reason].notes} | Stage 2: ${d.notes}`
                : `Stage 2: ${d.notes}`;
            }
          } else {
            mergedMap[d.reason] = { ...d, notes: d.notes ? `Stage 2: ${d.notes}` : '' };
          }
        }
      });
      updatedDefects = Object.values(mergedMap).filter((d) => d.count > 0);
    }

    const updatedInsp: InspectionRecord = {
      ...insp,
      stage2DefectsCount: stage2Defects,
      totalDefectCount: totalDefects,
      defects: updatedDefects,
      finalDecision: decision,
      status: 'Awaiting Supervisor Approval' as const,
    };

    setInspections((prev) =>
      prev.map((i) => (i.id === id ? updatedInsp : i))
    );

    addAuditLog(
      'INSPECTION_STAGE_2_EVALUATED',
      'Inspection',
      id,
      `Stage 2 completed: Stage 2 Defects = ${stage2Defects}, Cumulative = ${totalDefects}. Decision = ${decision}`
    );

    if (decision === 'Accepted') {
      const dayNum = parseInt(insp.lotReceivedDate.split('-')[2], 10);
      if (!isNaN(dayNum) && dayNum > currentDay) {
        setCurrentDay(dayNum);
      }
      setDeliveries((prev) =>
        prev.map((d) =>
          d.businessDeliveryNumber.toLowerCase() === insp.deliveryNumber.toLowerCase()
            ? {
                ...d,
                status: 'Inspected - Accepted',
                actualQuantity: insp.lotSize,
                confirmedDate: insp.lotReceivedDate,
              }
            : d
        )
      );
      const newNotif: NotificationItem = {
        id: `notif-${Date.now()}`,
        type: 'STOCK_ADDED',
        title: `Stock Added: +${insp.lotSize} ${insp.componentCode} (${insp.deliveryNumber})`,
        message: `Stage 2 completed for ${insp.deliveryNumber}: Lot ACCEPTED. +${insp.lotSize} units added to inventory. Cumulative defects: ${totalDefects}.`,
        recipient: currentUser?.name || 'Warehouse / MRP',
        status: 'Unread',
        createdAt: new Date().toISOString(),
        link: 'mrp-daily-actual',
      };
      setNotifications((prev) => [newNotif, ...prev]);
    } else if (decision === 'Rejected') {
      handleRejectedLot(updatedInsp);
      setDeliveries((prev) =>
        prev.map((d) =>
          d.businessDeliveryNumber.toLowerCase() === insp.deliveryNumber.toLowerCase()
            ? {
                ...d,
                status: 'Inspected - Rejected',
                actualQuantity: 0,
                confirmedDate: insp.lotReceivedDate,
              }
            : d
        )
      );
    }
  };

  const updateInspection = (
    id: string,
    updates: Partial<InspectionRecord>
  ) => {
    setInspections((prev) =>
      prev.map((insp) => {
        if (insp.id !== id) return insp;

        let newDefects = updates.defects ?? insp.defects;
        let newStage1Count = updates.stage1DefectsCount ?? insp.stage1DefectsCount;
        let newStage2Count = updates.stage2DefectsCount ?? insp.stage2DefectsCount;
        let newTotalCount = updates.totalDefectCount;

        if (updates.defects && updates.totalDefectCount === undefined) {
          newTotalCount = updates.defects.reduce((sum, d) => sum + (Number(d.count) || 0), 0);
          if (newStage2Count !== undefined) {
            newTotalCount += newStage2Count;
          } else {
            newStage1Count = newTotalCount;
          }
        } else if (newTotalCount === undefined) {
          newTotalCount = insp.totalDefectCount;
        }

        let newDecision = updates.finalDecision ?? insp.finalDecision;
        if (!updates.finalDecision && updates.defects) {
          if (insp.samplingMethod === 'Single') {
            newDecision = evaluateSingleInspection(newTotalCount, insp.acStage1, insp.reStage1);
          } else if (newStage2Count !== undefined) {
            newDecision = evaluateDoubleStage2(
              newStage1Count,
              newStage2Count,
              insp.acStage2 ?? 4,
              insp.reStage2 ?? 5
            );
          } else {
            const eval1 = evaluateDoubleStage1(newStage1Count, insp.acStage1, insp.reStage1);
            newDecision = eval1 === 'Second Sample Required' ? 'Pending' : eval1;
          }
        }

        const updatedInsp: InspectionRecord = {
          ...insp,
          ...updates,
          defects: newDefects,
          stage1DefectsCount: newStage1Count,
          stage2DefectsCount: newStage2Count,
          totalDefectCount: newTotalCount,
          finalDecision: newDecision,
        };

        addAuditLog(
          'INSPECTION_UPDATED',
          'Inspection',
          id,
          `Inspection ${insp.deliveryNumber} updated/corrected. Total defects: ${newTotalCount}, Decision: ${newDecision}.`
        );

        if (newDecision === 'Accepted') {
          setDeliveries((prev) =>
            prev.map((d) =>
              d.businessDeliveryNumber.toLowerCase() === insp.deliveryNumber.toLowerCase()
                ? {
                    ...d,
                    status: 'Inspected - Accepted',
                    actualQuantity: updatedInsp.lotSize,
                    confirmedDate: updatedInsp.lotReceivedDate,
                  }
                : d
            )
          );
        } else if (newDecision === 'Rejected' && insp.finalDecision !== 'Rejected') {
          handleRejectedLot(updatedInsp);
          setDeliveries((prev) =>
            prev.map((d) =>
              d.businessDeliveryNumber.toLowerCase() === insp.deliveryNumber.toLowerCase()
                ? {
                    ...d,
                    status: 'Inspected - Rejected',
                    actualQuantity: 0,
                    confirmedDate: updatedInsp.lotReceivedDate,
                  }
                : d
            )
          );
        }

        return updatedInsp;
      })
    );
  };

  const getComponentStock = (code: ComponentCode): number => {
    const plan = monthlyPlans[currentMonth];
    const actualRows = plan?.actualRows?.[code] || [];
    if (currentDay > 0 && currentDay <= actualRows.length) {
      const row = actualRows[currentDay - 1];
      if (row?.actualEndingInventory !== null && row?.actualEndingInventory !== undefined) {
        return row.actualEndingInventory;
      }
    }
    for (let i = actualRows.length - 1; i >= 0; i--) {
      if (actualRows[i]?.actualEndingInventory !== null && actualRows[i]?.actualEndingInventory !== undefined) {
        return actualRows[i].actualEndingInventory;
      }
    }
    return openingInventory?.[code] ?? systemConfig?.defaultOpeningInventory ?? 500;
  };

  const approveInspection = (id: string, supervisorName: string, signature: string) => {
    const target = inspections.find((i) => i.id === id);
    if (target && target.finalDecision === 'Accepted') {
      const dayNum = parseInt(target.lotReceivedDate.split('-')[2], 10);
      if (!isNaN(dayNum) && dayNum > currentDay) {
        setCurrentDay(dayNum);
      }
      setDeliveries((prev) =>
        prev.map((d) =>
          d.businessDeliveryNumber.toLowerCase() === target.deliveryNumber.toLowerCase()
            ? {
                ...d,
                status: 'Inspected - Accepted',
                actualQuantity: target.lotSize,
                confirmedDate: target.lotReceivedDate,
              }
            : d
        )
      );
    }

    setInspections((prev) =>
      prev.map((insp) => {
        if (insp.id !== id) return insp;
        addAuditLog(
          'INSPECTION_SUPERVISOR_SIGNED',
          'Inspection',
          id,
          `Inspection ${insp.deliveryNumber} formally signed & approved by ${supervisorName}. Status: Completed.`
        );
        return {
          ...insp,
          supervisorName,
          supervisorSignature: signature,
          approvedAt: new Date().toISOString(),
          status: 'Completed',
        };
      })
    );
  };

  const addInspectionImage = (
    inspectionId: string,
    image: Omit<DefectImage, 'id' | 'uploadedAt'>
  ) => {
    const newImg: DefectImage = {
      ...image,
      id: `img-${Date.now()}`,
      uploadedAt: new Date().toISOString(),
    };
    setInspections((prev) =>
      prev.map((insp) => {
        if (insp.id !== inspectionId) return insp;
        return {
          ...insp,
          images: [...insp.images, newImg],
        };
      })
    );
  };

  const recordDailyProduction = (
    date: string,
    outputs: DailyModelOutput[],
    safetyStockUsage?: { used: boolean; AA: number; BB: number; CC: number }
  ) => {
    const total = outputs.reduce((sum, o) => sum + o.quantity, 0);
    const newRecord: DailyProductionRecord = {
      id: `prod-${Date.now()}`,
      date,
      outputs,
      totalFinalProduction: total,
      usageAA: total * 1,
      usageBB: total * 1,
      usageCC: total * 3,
      safetyStockUsed: safetyStockUsage?.used ?? false,
      safetyStockUsageAA: safetyStockUsage?.AA ?? 0,
      safetyStockUsageBB: safetyStockUsage?.BB ?? 0,
      safetyStockUsageCC: safetyStockUsage?.CC ?? 0,
      enteredBy: currentUser?.name || 'System',
      createdAt: new Date().toISOString(),
    };

    setProductionRecords((prev) => {
      const filtered = prev.filter((p) => p.date !== date);
      return [...filtered, newRecord].sort((a, b) => a.date.localeCompare(b.date));
    });

    addAuditLog(
      'RECORD_DAILY_PRODUCTION',
      'DailyProduction',
      date,
      `Recorded production for ${date}: Total Output = ${total} units (AA: ${total}, BB: ${total}, CC: ${total * 3})${safetyStockUsage?.used ? ` with Safety Stock used (AA: ${safetyStockUsage.AA}, BB: ${safetyStockUsage.BB}, CC: ${safetyStockUsage.CC})` : ''}.`
    );
  };

  const recordActualMRPInputs = (
    date: string,
    usageData: {
      AA: { actualUsage: number; safetyStockUsed: boolean; safetyStockQuantity: number };
      BB: { actualUsage: number; safetyStockUsed: boolean; safetyStockQuantity: number };
      CC: { actualUsage: number; safetyStockUsed: boolean; safetyStockQuantity: number };
    },
    status: 'Draft' | 'Confirmed' = 'Confirmed',
    notes?: string
  ) => {
    const isDraft = status === 'Draft';
    const totalOut = usageData.AA.actualUsage;

    const newRecord: DailyProductionRecord = {
      id: `prod-${Date.now()}`,
      date,
      outputs: [
        { model: 'Model A', quantity: Math.round(totalOut * 0.4) },
        { model: 'Model B', quantity: Math.round(totalOut * 0.3) },
        { model: 'Model C', quantity: Math.round(totalOut * 0.2) },
        { model: 'Model D', quantity: Math.max(0, totalOut - Math.round(totalOut * 0.9)) },
      ],
      totalFinalProduction: totalOut,
      usageAA: usageData.AA.actualUsage,
      usageBB: usageData.BB.actualUsage,
      usageCC: usageData.CC.actualUsage,
      safetyStockUsed: usageData.AA.safetyStockUsed || usageData.BB.safetyStockUsed || usageData.CC.safetyStockUsed,
      safetyStockUsageAA: usageData.AA.safetyStockUsed ? usageData.AA.safetyStockQuantity : 0,
      safetyStockUsageBB: usageData.BB.safetyStockUsed ? usageData.BB.safetyStockQuantity : 0,
      safetyStockUsageCC: usageData.CC.safetyStockUsed ? usageData.CC.safetyStockQuantity : 0,
      isDraft,
      enteredBy: currentUser?.name || 'System Operator',
      createdAt: new Date().toISOString(),
    };

    setProductionRecords((prev) => {
      const filtered = prev.filter((p) => p.date !== date);
      return [...filtered, newRecord].sort((a, b) => a.date.localeCompare(b.date));
    });

    if (status === 'Confirmed') {
      setDefectEvents((prev) =>
        prev.map((ev) => (ev.date === date ? { ...ev, status: 'Confirmed' } : ev))
      );

      const conf: DailyProductionConfirmation = {
        id: `conf-${Date.now()}`,
        date,
        confirmedBy: currentUser?.name || 'System Operator',
        confirmedAt: new Date().toISOString(),
        status: 'Confirmed',
        notes: notes || 'Confirmed from Actual MRP Inputs module',
      };

      setDayConfirmations((prev) => {
        const filtered = prev.filter((c) => c.date !== date);
        return [...filtered, conf];
      });

      addAuditLog(
        'CONFIRM_ACTUAL_MRP_INPUTS',
        'ActualMRPInputs',
        date,
        `Confirmed Actual MRP inputs on ${date}: AA=${usageData.AA.actualUsage} (SS: ${usageData.AA.safetyStockUsed ? usageData.AA.safetyStockQuantity : 0}), BB=${usageData.BB.actualUsage} (SS: ${usageData.BB.safetyStockUsed ? usageData.BB.safetyStockQuantity : 0}), CC=${usageData.CC.actualUsage} (SS: ${usageData.CC.safetyStockUsed ? usageData.CC.safetyStockQuantity : 0}).`
      );
    } else {
      addAuditLog(
        'SAVE_ACTUAL_MRP_INPUTS_DRAFT',
        'ActualMRPInputs',
        date,
        `Saved draft Actual MRP inputs on ${date}.`
      );
    }
  };

  const saveActualMRPInputDraft = (
    date: string,
    inputs: Record<ComponentCode, ComponentActualMRPInput>,
    notes?: string
  ) => {
    const totalOut = inputs.AA.actualUsage ?? inputs.BB.actualUsage ?? 0;
    const newRecord: DailyProductionRecord = {
      id: `prod-${Date.now()}`,
      date,
      outputs: [
        { model: 'Model A', quantity: Math.round(totalOut * 0.4) },
        { model: 'Model B', quantity: Math.round(totalOut * 0.3) },
        { model: 'Model C', quantity: Math.round(totalOut * 0.2) },
        { model: 'Model D', quantity: Math.max(0, totalOut - Math.round(totalOut * 0.9)) },
      ],
      totalFinalProduction: totalOut,
      usageAA: inputs.AA.actualUsage ?? 0,
      usageBB: inputs.BB.actualUsage ?? 0,
      usageCC: inputs.CC.actualUsage ?? 0,
      safetyStockUsed: inputs.AA.safetyStockUsed || inputs.BB.safetyStockUsed || inputs.CC.safetyStockUsed,
      safetyStockUsageAA: inputs.AA.safetyStockUsed ? inputs.AA.safetyStockQuantity : 0,
      safetyStockUsageBB: inputs.BB.safetyStockUsed ? inputs.BB.safetyStockQuantity : 0,
      safetyStockUsageCC: inputs.CC.safetyStockUsed ? inputs.CC.safetyStockQuantity : 0,
      isDraft: true,
      enteredBy: currentUser?.name || 'System Operator',
      createdAt: new Date().toISOString(),
    };

    setProductionRecords((prev) => {
      const filtered = prev.filter((p) => p.date !== date);
      return [...filtered, newRecord].sort((a, b) => a.date.localeCompare(b.date));
    });

    const dayRecord: DailyActualMRPInputRecord = {
      id: `mrp-in-${date}`,
      date,
      components: {
        AA: { ...inputs.AA, status: 'Data Entry In Progress' },
        BB: { ...inputs.BB, status: 'Data Entry In Progress' },
        CC: { ...inputs.CC, status: 'Data Entry In Progress' },
      },
      overallStatus: 'Data Entry In Progress',
      notes: notes || 'Draft saved from Actual MRP Inputs',
    };

    setActualMRPInputs((prev) => ({
      ...prev,
      [date]: dayRecord,
    }));

    addAuditLog(
      'SAVE_ACTUAL_MRP_INPUTS_DRAFT',
      'ActualMRPInputs',
      date,
      `Saved draft Actual MRP inputs on ${date}.`
    );

    addNotification({
      title: 'Draft Inputs Saved',
      message: `Draft inputs for ${date} saved successfully.`,
      type: 'info',
    });
  };

  const confirmActualMRPInputs = (
    date: string,
    inputs: Record<ComponentCode, ComponentActualMRPInput>,
    notes?: string
  ) => {
    const totalOut = inputs.AA.actualUsage ?? inputs.BB.actualUsage ?? 0;
    const newRecord: DailyProductionRecord = {
      id: `prod-${Date.now()}`,
      date,
      outputs: [
        { model: 'Model A', quantity: Math.round(totalOut * 0.4) },
        { model: 'Model B', quantity: Math.round(totalOut * 0.3) },
        { model: 'Model C', quantity: Math.round(totalOut * 0.2) },
        { model: 'Model D', quantity: Math.max(0, totalOut - Math.round(totalOut * 0.9)) },
      ],
      totalFinalProduction: totalOut,
      usageAA: inputs.AA.actualUsage ?? 0,
      usageBB: inputs.BB.actualUsage ?? 0,
      usageCC: inputs.CC.actualUsage ?? 0,
      safetyStockUsed: inputs.AA.safetyStockUsed || inputs.BB.safetyStockUsed || inputs.CC.safetyStockUsed,
      safetyStockUsageAA: inputs.AA.safetyStockUsed ? inputs.AA.safetyStockQuantity : 0,
      safetyStockUsageBB: inputs.BB.safetyStockUsed ? inputs.BB.safetyStockQuantity : 0,
      safetyStockUsageCC: inputs.CC.safetyStockUsed ? inputs.CC.safetyStockQuantity : 0,
      isDraft: false,
      enteredBy: currentUser?.name || 'System Operator',
      createdAt: new Date().toISOString(),
    };

    setProductionRecords((prev) => {
      const filtered = prev.filter((p) => p.date !== date);
      return [...filtered, newRecord].sort((a, b) => a.date.localeCompare(b.date));
    });

    // Sync defect events for date
    setDefectEvents((prev) => {
      const otherEvents = prev.filter((e) => e.date !== date);
      const dayEvents = prev.filter((e) => e.date === date);
      const updatedDay: ProductionDefectEvent[] = [...dayEvents];
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      const comps: ComponentCode[] = ['AA', 'BB', 'CC'];
      comps.forEach((code) => {
        const inp = inputs[code];
        const cats: { cat: DefectSourceCategory; qty: number; reason: string }[] = [
          { cat: 'Warehouse Defect', qty: inp.warehouseDefects, reason: 'Warehouse handling damage' },
          { cat: 'Assembly Defect', qty: inp.assemblyDefects, reason: 'Assembly line reject' },
          { cat: 'Safety Stock Defect', qty: inp.safetyStockDefects, reason: 'Safety stock reserve defect' },
        ];

        cats.forEach(({ cat, qty, reason }) => {
          const catEvents = updatedDay.filter((e) => e.componentCode === code && e.sourceCategory === cat);
          const currentSum = catEvents.reduce((s, e) => s + e.quantity, 0);

          if (catEvents.length === 0 && qty > 0) {
            updatedDay.push({
              id: `pdef-${Date.now()}-${code}-${cat.replace(/\s+/g, '')}`,
              date,
              timestamp: timeStr,
              componentCode: code,
              defectReason: reason,
              quantity: qty,
              sourceCategory: cat,
              enteredBy: currentUser?.name || 'System Operator',
              notes: 'Recorded in Actual MRP Inputs',
              status: 'Confirmed',
            });
          } else if (catEvents.length === 1) {
            catEvents[0].quantity = qty;
            catEvents[0].status = 'Confirmed';
          } else if (catEvents.length > 1) {
            const diff = qty - currentSum;
            if (diff !== 0) {
              updatedDay.push({
                id: `pdef-${Date.now()}-${code}-${cat.replace(/\s+/g, '')}-adj`,
                date,
                timestamp: timeStr,
                componentCode: code,
                defectReason: `${reason} (Reconciled Adjustment)`,
                quantity: diff,
                sourceCategory: cat,
                enteredBy: currentUser?.name || 'System Operator',
                notes: `Adjustment to match confirmed total ${qty}`,
                status: 'Confirmed',
              });
            }
            catEvents.forEach((e) => (e.status = 'Confirmed'));
          }
        });
      });

      return [...otherEvents, ...updatedDay];
    });

    const conf: DailyProductionConfirmation = {
      id: `conf-${Date.now()}`,
      date,
      confirmedBy: currentUser?.name || 'System Operator',
      confirmedAt: new Date().toISOString(),
      status: 'Confirmed',
      notes: notes || 'Confirmed from Actual MRP Inputs module',
    };

    setDayConfirmations((prev) => {
      const filtered = prev.filter((c) => c.date !== date);
      return [...filtered, conf];
    });

    const dayRecord: DailyActualMRPInputRecord = {
      id: `mrp-in-${date}`,
      date,
      components: {
        AA: { ...inputs.AA, status: 'Confirmed' },
        BB: { ...inputs.BB, status: 'Confirmed' },
        CC: { ...inputs.CC, status: 'Confirmed' },
      },
      overallStatus: 'Confirmed',
      confirmedAt: new Date().toISOString(),
      confirmedBy: currentUser?.name || 'System Operator',
      notes: notes || 'Confirmed and linked to Actual MRP',
    };

    setActualMRPInputs((prev) => ({
      ...prev,
      [date]: dayRecord,
    }));

    addAuditLog(
      'CONFIRM_ACTUAL_MRP_INPUTS',
      'ActualMRPInputs',
      date,
      `Confirmed Actual MRP inputs for ${date}: AA (Usage: ${inputs.AA.actualUsage}, SS: ${inputs.AA.safetyStockQuantity}, Fails: ${inputs.AA.qualityFailsTotal}), BB (Usage: ${inputs.BB.actualUsage}, SS: ${inputs.BB.safetyStockQuantity}, Fails: ${inputs.BB.qualityFailsTotal}), CC (Usage: ${inputs.CC.actualUsage}, SS: ${inputs.CC.safetyStockQuantity}, Fails: ${inputs.CC.qualityFailsTotal}). Recalculated Actual MRP rows immediately.`
    );

    addNotification({
      title: 'Actual MRP Inputs Confirmed',
      message: `Operational inputs for ${date} confirmed. Actual MRP recalculated immediately using authoritative Excel formulas.`,
      type: 'success',
    });
  };

  const saveComponentDefectInputs = (
    date: string,
    componentCode: ComponentCode,
    defects: {
      warehouseDefects: number;
      assemblyDefects: number;
      safetyStockDefects: number;
    },
    notes?: string
  ) => {
    // 1. Sync defect events ONLY for this date and componentCode
    setDefectEvents((prev) => {
      const otherEvents = prev.filter(
        (e) => !(e.date === date && e.componentCode === componentCode)
      );
      const thisCompEvents = prev.filter(
        (e) => e.date === date && e.componentCode === componentCode
      );

      const updatedThisComp: ProductionDefectEvent[] = [...thisCompEvents];
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      const categories: { cat: DefectSourceCategory; qty: number; reason: string }[] = [
        { cat: 'Warehouse Defect', qty: defects.warehouseDefects, reason: 'Warehouse storage handling damage' },
        { cat: 'Assembly Defect', qty: defects.assemblyDefects, reason: 'Assembly line station reject' },
        { cat: 'Safety Stock Defect', qty: defects.safetyStockDefects, reason: 'Safety stock reserve defect' },
      ];

      categories.forEach(({ cat, qty, reason }) => {
        const catEvents = updatedThisComp.filter((e) => e.sourceCategory === cat);
        const currentSum = catEvents.reduce((s, e) => s + e.quantity, 0);

        if (catEvents.length === 0 && qty > 0) {
          updatedThisComp.push({
            id: `pdef-${Date.now()}-${componentCode}-${cat.replace(/\s+/g, '')}`,
            date,
            timestamp: timeStr,
            componentCode,
            defectReason: reason,
            quantity: qty,
            sourceCategory: cat,
            enteredBy: currentUser?.name || 'System Operator',
            notes: notes || 'Saved from Actual MRP Defect Inputs',
            status: 'Confirmed',
          });
        } else if (catEvents.length === 1) {
          catEvents[0].quantity = qty;
          catEvents[0].status = 'Confirmed';
        } else if (catEvents.length > 1) {
          const diff = qty - currentSum;
          if (diff !== 0) {
            updatedThisComp.push({
              id: `pdef-${Date.now()}-${componentCode}-${cat.replace(/\s+/g, '')}-adj`,
              date,
              timestamp: timeStr,
              componentCode,
              defectReason: `${reason} (Adjustment)`,
              quantity: diff,
              sourceCategory: cat,
              enteredBy: currentUser?.name || 'System Operator',
              notes: `Adjustment to match saved total ${qty}`,
              status: 'Confirmed',
            });
          }
          catEvents.forEach((e) => (e.status = 'Confirmed'));
        }
      });

      return [...otherEvents, ...updatedThisComp];
    });

    // 2. Compute inspection defect count for this date + componentCode
    const matchingAcceptedInsps = inspections.filter(
      (i) => i.lotReceivedDate === date && i.componentCode === componentCode && i.finalDecision === 'Accepted'
    );
    const inspDefectCount = matchingAcceptedInsps.reduce((s, i) => s + (i.totalDefectCount || 0), 0);
    const totalQualityFails =
      inspDefectCount +
      defects.warehouseDefects +
      defects.assemblyDefects +
      defects.safetyStockDefects;

    // 3. Update actualMRPInputs state for this component only
    setActualMRPInputs((prev) => {
      const existingDay = prev[date] || {
        id: `mrp-in-${date}`,
        date,
        components: {
          AA: {
            actualUsage: null,
            safetyStockUsed: false,
            safetyStockQuantity: 0,
            warehouseDefects: 0,
            assemblyDefects: 0,
            safetyStockDefects: 0,
            inspectionDefects: 0,
            qualityFailsTotal: 0,
            status: 'Not Started',
            defectStatus: 'Not Entered',
          },
          BB: {
            actualUsage: null,
            safetyStockUsed: false,
            safetyStockQuantity: 0,
            warehouseDefects: 0,
            assemblyDefects: 0,
            safetyStockDefects: 0,
            inspectionDefects: 0,
            qualityFailsTotal: 0,
            status: 'Not Started',
            defectStatus: 'Not Entered',
          },
          CC: {
            actualUsage: null,
            safetyStockUsed: false,
            safetyStockQuantity: 0,
            warehouseDefects: 0,
            assemblyDefects: 0,
            safetyStockDefects: 0,
            inspectionDefects: 0,
            qualityFailsTotal: 0,
            status: 'Not Started',
            defectStatus: 'Not Entered',
          },
        },
        overallStatus: 'Data Entry In Progress',
      };

      const currentComp = existingDay.components[componentCode];

      return {
        ...prev,
        [date]: {
          ...existingDay,
          components: {
            ...existingDay.components,
            [componentCode]: {
              ...currentComp,
              warehouseDefects: defects.warehouseDefects,
              assemblyDefects: defects.assemblyDefects,
              safetyStockDefects: defects.safetyStockDefects,
              inspectionDefects: inspDefectCount,
              qualityFailsTotal: totalQualityFails,
              status: currentComp.actualUsage !== null ? 'Ready for Confirmation' : 'Data Entry In Progress',
              defectStatus: 'Defect Inputs Saved',
            },
          },
        },
      };
    });

    addAuditLog(
      'SAVE_COMPONENT_DEFECT_INPUTS',
      'ActualMRPInputs',
      `${date}-${componentCode}`,
      `Saved defect inputs for ${componentCode} on ${date}: Inspection=${inspDefectCount}, Warehouse=${defects.warehouseDefects}, Assembly=${defects.assemblyDefects}, SafetyStock=${defects.safetyStockDefects}, Quality Fails Total=${totalQualityFails}. Recalculated ${componentCode} Actual MRP record.`
    );

    addNotification({
      title: 'Defect Inputs Saved',
      message: `Defect inputs saved for ${componentCode} on ${date} (Quality Fails Total: ${totalQualityFails}). Matching Actual MRP recalculated.`,
      type: 'success',
    });
  };

  const addDefectLogEntry = (
    date: string,
    componentCode: ComponentCode,
    category: DefectSourceCategory,
    quantity: number,
    reason: string,
    notes?: string
  ) => {
    addDefectEvent(date, componentCode, reason, quantity, notes, category);
  };

  const addDefectEvent = (
    date: string,
    componentCode: ComponentCode,
    reason: string,
    quantity: number,
    notes?: string,
    sourceCategory?: DefectSourceCategory
  ) => {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const newEvent: ProductionDefectEvent = {
      id: `pdef-${Date.now()}`,
      date,
      timestamp: timeStr,
      componentCode,
      defectReason: reason,
      quantity,
      sourceCategory,
      enteredBy: currentUser?.name || 'System',
      notes,
      status: 'Pending Confirmation',
    };

    setDefectEvents((prev) => [...prev, newEvent]);

    addAuditLog(
      'ADD_PRODUCTION_DEFECT_EVENT',
      'ProductionDefectEvent',
      newEvent.id,
      `Logged defect event on ${date} (${timeStr}): ${quantity}x ${componentCode} [${reason}].`
    );
  };

  const deleteDefectEvent = (id: string) => {
    const toDelete = defectEvents.find((d) => d.id === id);
    if (!toDelete) return;

    setDefectEvents((prev) => prev.filter((d) => d.id !== id));

    addAuditLog(
      'DELETE_PRODUCTION_DEFECT_EVENT',
      'ProductionDefectEvent',
      id,
      `Deleted defect event: ${toDelete.quantity}x ${toDelete.componentCode} (${toDelete.defectReason}) on ${toDelete.date}.`
    );
  };

  const confirmProductionDay = (date: string, notes?: string) => {
    setDefectEvents((prev) =>
      prev.map((ev) => (ev.date === date ? { ...ev, status: 'Confirmed' } : ev))
    );

    const conf: DailyProductionConfirmation = {
      id: `conf-${Date.now()}`,
      date,
      confirmedBy: currentUser?.name || 'System',
      confirmedAt: new Date().toISOString(),
      status: 'Confirmed',
      notes,
    };

    setDayConfirmations((prev) => {
      const filtered = prev.filter((c) => c.date !== date);
      return [...filtered, conf];
    });

    addAuditLog(
      'CONFIRM_DAILY_PRODUCTION',
      'DailyProductionConfirmation',
      date,
      `End-of-day production and defect events for ${date} confirmed by ${currentUser?.name || 'System'}.`
    );
  };

  const updateDeliveryQuantity = (id: string, newQty: number, reason: string) => {
    setDeliveries((prev) =>
      prev.map((d) => {
        if (d.id !== id) return d;
        const diff = newQty - d.plannedQuantity;
        addAuditLog(
          'UPDATE_DELIVERY_QUANTITY',
          'Delivery',
          id,
          `Adjusted delivery ${d.businessDeliveryNumber}: ${d.plannedQuantity} -> ${newQty} (${reason}).`
        );
        return {
          ...d,
          updatedQuantity: newQty,
          urgentAdjustment: diff,
          adjustmentReason: reason,
          lorries: splitLorries(newQty, systemConfig.components[d.componentCode]),
        };
      })
    );
  };

  const createDelivery = (
    data: Omit<
      DeliveryRecord,
      'id' | 'businessDeliveryNumber' | 'deliveryFamilyNumber' | 'replacementSequence'
    >
  ) => {
    const { businessDeliveryNumber, deliveryFamilyNumber, replacementSequence } =
      generateNextDeliveryNumber(deliveries);

    const newDelivery: DeliveryRecord = {
      ...data,
      id: `del-${Date.now()}`,
      businessDeliveryNumber,
      deliveryFamilyNumber,
      replacementSequence,
      lorries: splitLorries(data.plannedQuantity, systemConfig.components[data.componentCode]),
    };

    setDeliveries((prev) => [newDelivery, ...prev]);
    addAuditLog(
      'CREATE_DELIVERY',
      'Delivery',
      newDelivery.id,
      `Created delivery order ${businessDeliveryNumber} for ${data.plannedQuantity} ${data.componentCode} on ${data.plannedDate}.`
    );
  };

  const receiveSupplierDelivery = (
    orderCode: string,
    componentCode: ComponentCode,
    actualQuantity: number,
    lorryNo: string,
    arrivalTime: string,
    notes?: string,
    deliveryCondition?: 'Normal' | 'Damaged cartons' | 'Missing items' | 'Other',
    receivedDate?: string
  ): DeliveryRecord => {
    const { businessDeliveryNumber, deliveryFamilyNumber, replacementSequence } =
      generateNextDeliveryNumber(deliveries);
    const dateStr = receivedDate || `${currentMonth}-${String(currentDay).padStart(2, '0')}`;

    const newDelivery: DeliveryRecord = {
      id: `del-${Date.now()}`,
      businessDeliveryNumber,
      deliveryFamilyNumber,
      replacementSequence,
      componentCode,
      plannedDate: dateStr,
      confirmedDate: dateStr,
      receivedDate: dateStr,
      deliveryCondition: deliveryCondition || 'Normal',
      plannedQuantity: actualQuantity,
      updatedQuantity: actualQuantity,
      actualQuantity,
      orderCode,
      vehicleRef: lorryNo,
      arrivalTime,
      lorries: splitLorries(actualQuantity, systemConfig.components[componentCode]),
      status: 'Arrived',
      urgentAdjustment: 0,
      notes,
    };

    setDeliveries((prev) => [newDelivery, ...prev]);
    addAuditLog(
      'RECEIVE_SUPPLIER_DELIVERY',
      'Delivery',
      newDelivery.id,
      `Received supplier delivery order ${orderCode} (${businessDeliveryNumber}) for ${actualQuantity} units of ${componentCode} via lorry ${lorryNo} at ${arrivalTime}. Quality inspection required.`
    );
    addNotification({
      title: 'Delivery Arrived - Inspection Required',
      message: `Delivery ${orderCode} with ${actualQuantity} units of ${componentCode} has arrived. Quality lot inspection is required before stock can be released to MRP.`,
      type: 'warning',
    });
    return newDelivery;
  };

  const updateUrgentStatus = (
    id: string,
    status: UrgentReplenishmentRecord['status'],
    confirmedDate?: string
  ) => {
    setUrgentReplenishments((prev) =>
      prev.map((u) => {
        if (u.id !== id) return u;
        addAuditLog(
          'UPDATE_URGENT_REPLENISHMENT_STATUS',
          'UrgentReplenishment',
          id,
          `Updated urgent replenishment status to ${status}${confirmedDate ? ` (Confirmed for ${confirmedDate})` : ''}.`
        );
        return {
          ...u,
          status,
          confirmedDate: confirmedDate || u.confirmedDate,
        };
      })
    );
  };

  const fastSwitchLogin = (role: 'Procurement Admin' | 'Supervisor') => {
    if (role === 'Procurement Admin') {
      const user = users.find((u) => u.name.includes('Procurement Admin') || u.roles.includes('Procurement Admin')) || users[0];
      setCurrentUser(user);
      setActiveRole('Procurement Admin');
      addAuditLog('USER_SWITCH', 'UserAccount', user.id, `Fast-switched session to Procurement Admin (${user.name}).`);
    } else {
      const user = users.find((u) => u.name.includes('Supervisor') || u.roles.includes('Supervisor')) || users[1] || users[0];
      setCurrentUser(user);
      setActiveRole('Supervisor');
      addAuditLog('USER_SWITCH', 'UserAccount', user.id, `Fast-switched session to Operations Supervisor (${user.name}).`);
    }
  };

  const updatePlannedDayOutput = (day: number, quantity: number) => {
    if (day < 1 || day > 31) return;
    setPlannedOutputs((prev) => {
      const updated = [...prev];
      updated[day - 1] = Math.max(0, quantity);
      return updated;
    });
    addAuditLog(
      'UPDATE_PLANNED_OUTPUT',
      'MRPPlannedSchedule',
      `Day-${day}`,
      `Updated planned production output for Day ${day} to ${quantity} units (recalculated baseline MRP requirements).`
    );
  };

  const updateAllPlannedOutputs = (outputs: number[]) => {
    if (outputs.length !== 31) return;
    setPlannedOutputs(outputs);
    addAuditLog(
      'UPDATE_PLANNED_SCHEDULE',
      'MRPPlannedSchedule',
      'August-2026',
      'Updated complete 31-day planned output schedule.'
    );
  };

  const updateOpeningInventory = (code: ComponentCode, qty: number) => {
    setOpeningInventory((prev) => {
      const updated = { ...prev, [code]: Math.max(0, qty) };
      return updated;
    });
    addAuditLog(
      'UPDATE_OPENING_INVENTORY',
      'OpeningInventory',
      code,
      `Adjusted Day 1 Opening Inventory for ${code} to ${qty} units.`
    );
  };

  const updateManualActualMRPRow = (
    day: number,
    code: ComponentCode,
    updates: ManualActualOverride,
    reason?: string
  ) => {
    setManualActualOverrides((prev) => ({
      ...prev,
      [code]: {
        ...(prev?.[code] || {}),
        [day]: {
          ...(prev?.[code]?.[day] || {}),
          ...updates,
          reason: reason || 'Manual floor adjustment',
          updatedAt: new Date().toISOString(),
        },
      },
    }));

    addAuditLog(
      'UPDATE_MANUAL_MRP_OVERRIDE',
      'MRP_ACTUAL_OVERRIDE',
      `${code}-Day${day}`,
      `Manual override applied for ${code} on Day ${day}: ${JSON.stringify(updates)}${
        reason ? ` (Reason: ${reason})` : ''
      }`
    );
  };

  const clearManualActualOverride = (day: number, code: ComponentCode) => {
    setManualActualOverrides((prev) => {
      const nextComp = { ...(prev?.[code] || {}) };
      delete nextComp[day];
      return {
        ...prev,
        [code]: nextComp,
      };
    });

    addAuditLog(
      'CLEAR_MANUAL_MRP_OVERRIDE',
      'MRP_ACTUAL_OVERRIDE',
      `${code}-Day${day}`,
      `Cleared manual override for ${code} on Day ${day}`
    );
  };

  const updateManualPlannedDelivery = (code: ComponentCode, day: number, quantity: number) => {
    setManualPlannedDeliveries((prev) => ({
      ...prev,
      [code]: {
        ...(prev?.[code] || {}),
        [day]: Math.max(0, quantity),
      },
    }));

    addAuditLog(
      'UPDATE_MANUAL_PLANNED_DELIVERY',
      'MRP_PLANNED_DELIVERY',
      `${code}-Day${day}`,
      `Updated manual planned delivery for ${code} on Day ${day} to ${quantity}`
    );
  };

  const updateAllManualPlannedDeliveries = (code: ComponentCode, deliveries: Record<number, number>) => {
    setManualPlannedDeliveries((prev) => ({
      ...prev,
      [code]: { ...deliveries },
    }));

    addAuditLog(
      'UPDATE_ALL_MANUAL_PLANNED_DELIVERIES',
      'MRP_PLANNED_DELIVERY',
      `${code}`,
      `Updated all manual planned deliveries for ${code}`
    );
  };

  const clearManualPlannedDeliveries = (code: ComponentCode) => {
    setManualPlannedDeliveries((prev) => ({
      ...prev,
      [code]: {},
    }));

    addAuditLog(
      'CLEAR_ALL_MANUAL_PLANNED_DELIVERIES',
      'MRP_PLANNED_DELIVERY',
      `${code}`,
      `Cleared all manual planned deliveries for ${code}`
    );
  };

  const addNotification = (n: {
    title: string;
    message: string;
    type: 'info' | 'warning' | 'alert' | 'success';
  }) => {
    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      title: n.title,
      message: n.message,
      type: n.type,
      recipient: currentUser?.name || 'All',
      createdAt: new Date().toISOString(),
      status: 'Unread',
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  const markNotificationRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, status: 'Read' } : n))
    );
  };

  const resetToDefaultData = () => {
    localStorage.clear();
    localStorage.setItem('mrp_seed_v6', 'true');
    setSystemConfig(INITIAL_SYSTEM_CONFIG);
    setInspections(INITIAL_INSPECTIONS);
    setProductionRecords(INITIAL_PRODUCTION_RECORDS);
    setDefectEvents(INITIAL_DEFECT_EVENTS);
    setDeliveries(INITIAL_DELIVERIES);
    setUrgentReplenishments(INITIAL_URGENT_REPLENISHMENTS);
    setRejectedLots(INITIAL_REJECTED_LOTS);
    setNotifications(INITIAL_NOTIFICATIONS);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    setPlannedOutputs(AUGUST_2026_PLANNED_OUTPUTS);
    setOpeningInventory({ AA: 500, BB: 500, CC: 500 });
    setManualActualOverrides({ AA: {}, BB: {}, CC: {} });
    setManualPlannedDeliveries({ AA: {}, BB: { 2: 160, 8: 160 }, CC: {} });
    setCurrentDay(1);
    setDayConfirmations([
      {
        id: 'conf-1',
        date: '2026-08-01',
        confirmedBy: 'James Thornton',
        confirmedAt: '2026-08-01T17:30:00Z',
        status: 'Confirmed',
      },
    ]);
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        activeRole,
        users,
        isLoggedIn,
        login,
        logout,
        switchUser,
        switchRole,
        fastSwitchLogin,
        systemConfig,
        updateSystemConfig,
        updateComponentConfig,
        inspections,
        createInspection,
        updateInspectionStage2,
        updateInspection,
        approveInspection,
        addInspectionImage,
        productionRecords,
        recordDailyProduction,
        recordActualMRPInputs,
        actualMRPInputs,
        saveActualMRPInputDraft,
        confirmActualMRPInputs,
        saveComponentDefectInputs,
        addDefectLogEntry,
        defectEvents,
        addDefectEvent,
        deleteDefectEvent,
        confirmProductionDay,
        dayConfirmations,
        currentMonth,
        setCurrentMonth,
        currentDay,
        setCurrentDay,
        monthlyPlans,
        activeComponent,
        setActiveComponent,
        plannedOutputs,
        updatePlannedDayOutput,
        updateAllPlannedOutputs,
        openingInventory,
        updateOpeningInventory,
        getComponentStock,
        manualActualOverrides,
        updateManualActualMRPRow,
        clearManualActualOverride,
        manualPlannedDeliveries,
        updateManualPlannedDelivery,
        updateAllManualPlannedDeliveries,
        clearManualPlannedDeliveries,
        deliveries,
        updateDeliveryQuantity,
        createDelivery,
        receiveSupplierDelivery,
        urgentReplenishments,
        updateUrgentStatus,
        rejectedLots,
        notifications,
        addNotification,
        markNotificationRead,
        auditLogs,
        addAuditLog,
        resetToDefaultData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
