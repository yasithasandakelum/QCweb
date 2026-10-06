import {
  AuditLogItem,
  ComponentCode,
  DailyProductionRecord,
  DeliveryRecord,
  InspectionRecord,
  NotificationItem,
  ProductionDefectEvent,
  ProductionModelCode,
  RejectedLotRecord,
  SystemConfig,
  UrgentReplenishmentRecord,
  UserAccount,
} from '../types';
import { calculatePlannedMRP } from '../services/mrpEngine';
import { getCodeLetter, getSingleSamplingPlan } from '../services/aqlEngine';

export const PRODUCTION_MODELS: { code: ProductionModelCode; name: string }[] = [
  { code: 'Model A', name: 'Model A Standard' },
  { code: 'Model B', name: 'Model B Premium' },
  { code: 'Model C', name: 'Model C Compact' },
  { code: 'Model D', name: 'Model D Heavy Duty' },
  { code: 'Model E', name: 'Model E Eco' },
  { code: 'Model F', name: 'Model F Ultra' },
];

export const INITIAL_SYSTEM_CONFIG: SystemConfig = {
  companyName: 'Apex Manufacturing Technologies',
  procurementEmail: 'procurement@apex-tech.com',
  defaultOpeningInventory: 500,
  safetyStockTarget: 50,
  reorderTrigger: 20,
  defaultAql: 2.5,
  allowedAqlValues: [1.0, 1.5, 2.5, 4.0, 6.5],
  inspectionLevel: 'General II',
  supplierName: 'Precision Polymer & Steel Ltd.',
  urgentReplacementLeadDays: 2,
  components: {
    AA: {
      code: 'AA',
      name: 'Outer Tub',
      usageMultiplier: 1,
      minDeliveryQty: 150,
      maxDeliveryQty: 300,
      normalStockMin: 1500,
      normalStockMax: 2000,
      isMinConfirmed: true,
    },
    BB: {
      code: 'BB',
      name: 'Inner Tub',
      usageMultiplier: 1,
      minDeliveryQty: 160,
      maxDeliveryQty: 160,
      normalStockMin: 500,
      normalStockMax: 640,
      isMinConfirmed: true,
    },
    CC: {
      code: 'CC',
      name: 'Ridgeform',
      usageMultiplier: 3,
      minDeliveryQty: 250,
      maxDeliveryQty: 560,
      normalStockMin: 1500,
      normalStockMax: 2000,
      isMinConfirmed: true,
    },
  },
};

export const INITIAL_USERS: UserAccount[] = [
  {
    id: 'usr-1',
    name: 'Procurement Admin',
    email: 'procurement@apex-tech.com',
    roles: ['Procurement'],
    active: true,
    avatarColor: 'bg-indigo-600',
  },
  {
    id: 'usr-2',
    name: 'Plant Manager',
    email: 'manager@apex-tech.com',
    roles: ['Manager'],
    active: true,
    avatarColor: 'bg-emerald-600',
  },
  {
    id: 'usr-3',
    name: 'Operations Supervisor',
    email: 'supervisor@apex-tech.com',
    roles: ['Supervisor'],
    active: true,
    avatarColor: 'bg-rose-600',
  },
];

export const COMPONENT_DEFECT_REASONS: Record<ComponentCode, string[]> = {
  AA: [
    'Surface damage',
    'Incorrect nut hole positions/damages',
    'Out-of-shape',
    'Leakage',
    'Color variation',
  ],
  BB: [
    'Imbalance',
    'Surface damage',
    'Out-of-round',
    'Incorrect height/depth',
  ],
  CC: [
    'Surface scratch',
    'Improper ridge fit',
    'Thickness failures',
  ],
};

// Standard planned production schedule for August 2026 (31 days)
export const AUGUST_2026_PLANNED_OUTPUTS: number[] = [
  150, 180, 200, 160, 190, 175, 140, 160, 210, 195,
  180, 170, 190, 200, 165, 185, 190, 205, 175, 180,
  190, 210, 160, 170, 185, 195, 200, 180, 170, 160, 150,
];

// Generate Initial Production Records dynamically for Day 1 matching planned output exactly
export const INITIAL_PRODUCTION_RECORDS: DailyProductionRecord[] = Array.from(
  { length: 1 },
  (_, idx) => {
    const dayNum = idx + 1;
    const dateStr = `2026-08-${String(dayNum).padStart(2, '0')}`;
    const plannedQty = AUGUST_2026_PLANNED_OUTPUTS[idx];

    // Split outputs realistically
    const qA = Math.round(plannedQty * 0.4);
    const qB = Math.round(plannedQty * 0.3);
    const qC = Math.round(plannedQty * 0.2);
    const qD = plannedQty - (qA + qB + qC);

    const outputs = [
      { model: 'Model A' as ProductionModelCode, quantity: qA },
      { model: 'Model B' as ProductionModelCode, quantity: qB },
      { model: 'Model C' as ProductionModelCode, quantity: qC },
      { model: 'Model D' as ProductionModelCode, quantity: qD },
    ].filter(o => o.quantity > 0);

    return {
      id: `prod-00${dayNum}`,
      date: dateStr,
      outputs,
      totalFinalProduction: plannedQty,
      usageAA: plannedQty,
      usageBB: plannedQty,
      usageCC: plannedQty * 3,
      safetyStockUsed: true,
      safetyStockUsageAA: 10,
      safetyStockUsageBB: 0,
      safetyStockUsageCC: 0,
      enteredBy: 'Elena Rostova',
      createdAt: `${dateStr}T17:00:00Z`,
    };
  }
);

// Dynamic generation of deliveries and inspections so they align with plan mathematically
const generateInitialDeliveriesAndInspections = () => {
  const deliveries: DeliveryRecord[] = [];
  const inspections: InspectionRecord[] = [];

  const components: ComponentCode[] = ['AA', 'BB', 'CC'];
  const monthPrefix = '2026-08';
  const daysInMonth = 31;
  const currentConfirmedDay = 1; // Day 1 is confirmed/inspected

  const bbManualDeliveries = { 2: 160, 8: 160 };

  components.forEach((code) => {
    const cfg = INITIAL_SYSTEM_CONFIG.components[code];
    const plannedOutputs = AUGUST_2026_PLANNED_OUTPUTS;

    const rawPlanned = calculatePlannedMRP(
      code,
      daysInMonth,
      monthPrefix,
      500, // openingInventory
      plannedOutputs,
      cfg,
      50, // safetyStockTarget
      code === 'BB' ? bbManualDeliveries : undefined
    );

    let orderSequence = 0;

    rawPlanned.forEach((row) => {
      const dayNum = row.day;
      const dateStr = row.date;
      const qty = row.supplierDeliveryPlan;

      if (qty > 0) {
        orderSequence++;
        const deliveryId = `del-${code.toLowerCase()}-${String(orderSequence).padStart(3, '0')}`;
        const businessDeliveryNumber = row.orderCode !== '—' ? row.orderCode : `${code}${String(orderSequence).padStart(3, '0')}`;

        const isPast = dayNum <= currentConfirmedDay;

        // Split into lorries based on lorry limits:
        const maxCapacity = cfg.maxDeliveryQty || (code === 'AA' ? 300 : code === 'BB' ? 160 : 560);
        const lorryCount = Math.ceil(qty / maxCapacity);
        const lorries = [];
        let remaining = qty;
        for (let l = 1; l <= lorryCount; l++) {
          const lQty = Math.min(remaining, maxCapacity);
          lorries.push({
            lorryNumber: l,
            quantity: lQty,
            vehicleRef: isPast ? `LORRY-${code}-${dayNum}-${l}` : undefined,
          });
          remaining -= lQty;
        }

        const delivery: DeliveryRecord = {
          id: deliveryId,
          businessDeliveryNumber,
          deliveryFamilyNumber: businessDeliveryNumber,
          replacementSequence: 0,
          componentCode: code,
          plannedDate: dateStr,
          confirmedDate: isPast ? dateStr : undefined,
          plannedQuantity: qty,
          updatedQuantity: qty,
          actualQuantity: isPast ? qty : undefined,
          lorries,
          status: isPast ? 'Inspected - Accepted' : 'Planned',
          urgentAdjustment: 0,
          notes: isPast ? `Received & inspected on ${dateStr} exactly as planned.` : `Scheduled baseline planned delivery.`,
        };

        deliveries.push(delivery);

        if (isPast) {
          const inspectionId = `insp-${code.toLowerCase()}-${String(orderSequence).padStart(3, '0')}`;
          
          const samplingMethod = 'Single';
          const aql = 2.5;
          const codeLetter = getCodeLetter(qty);
          const singlePlan = getSingleSamplingPlan(qty, aql);

          const inspection: InspectionRecord = {
            id: inspectionId,
            deliveryNumber: businessDeliveryNumber,
            deliveryFamilyNumber: businessDeliveryNumber,
            replacementSequence: 0,
            supplierName: INITIAL_SYSTEM_CONFIG.supplierName,
            componentCode: code,
            lotReceivedDate: dateStr,
            lotReceivedTime: '09:00',
            lotSize: qty,
            vehicleRef: `LORRY-${code}-${dayNum}-1`,
            notes: `Auto-generated startup inspection matching planned quantity of ${qty} exactly.`,
            samplingMethod,
            inspectionLevel: 'General II',
            aql,
            codeLetter,
            sampleSizeStage1: singlePlan.sampleSize,
            acStage1: singlePlan.ac,
            reStage1: singlePlan.re,
            stage1DefectsCount: 0,
            totalDefectCount: 0,
            defects: [],
            images: [],
            status: 'Completed',
            finalDecision: 'Accepted',
            inspectorName: 'Marcus Brody',
            supervisorName: 'James Thornton',
            supervisorSignature: `James Thornton (Signed Electronically: J.T.-${dateStr})`,
            approvedAt: `${dateStr}T11:00:00Z`,
            createdAt: `${dateStr}T09:00:00Z`,
          };

          inspections.push(inspection);
        }
      }
    });
  });

  return { deliveries, inspections };
};

const generated = generateInitialDeliveriesAndInspections();

export const INITIAL_DELIVERIES: DeliveryRecord[] = generated.deliveries;
export const INITIAL_INSPECTIONS: InspectionRecord[] = generated.inspections;

export const INITIAL_DEFECT_EVENTS: ProductionDefectEvent[] = [
  {
    id: 'pdef-001',
    date: '2026-08-01',
    timestamp: '09:45',
    componentCode: 'CC',
    defectReason: 'Improper ridge fit',
    quantity: 6,
    sourceCategory: 'Assembly Defect',
    enteredBy: 'Elena Rostova',
    notes: 'Line 2 station clamp misalignment during final assembly',
    status: 'Confirmed',
  },
  {
    id: 'pdef-002',
    date: '2026-08-01',
    timestamp: '10:30',
    componentCode: 'AA',
    defectReason: 'Surface damage',
    quantity: 3,
    sourceCategory: 'Assembly Defect',
    enteredBy: 'Elena Rostova',
    notes: 'Outer tub scratched during robotic transfer to fixture',
    status: 'Confirmed',
  },
  {
    id: 'pdef-003',
    date: '2026-08-01',
    timestamp: '11:15',
    componentCode: 'BB',
    defectReason: 'Imbalance',
    quantity: 1,
    sourceCategory: 'Assembly Defect',
    enteredBy: 'Elena Rostova',
    notes: 'High-speed spin balance tolerance exceeded on test bench',
    status: 'Confirmed',
  },
  {
    id: 'pdef-004',
    date: '2026-08-01',
    timestamp: '14:20',
    componentCode: 'AA',
    defectReason: 'Out-of-shape',
    quantity: 1,
    sourceCategory: 'Safety Stock Defect',
    enteredBy: 'Marcus Vance',
    notes: 'Flange warpage identified upon drawing from safety buffer shelf',
    status: 'Confirmed',
  },
  {
    id: 'pdef-005',
    date: '2026-08-01',
    timestamp: '15:40',
    componentCode: 'CC',
    defectReason: 'Thickness failures',
    quantity: 2,
    sourceCategory: 'Safety Stock Defect',
    enteredBy: 'Marcus Vance',
    notes: 'Thin wall section in safety reserve batch',
    status: 'Confirmed',
  },
];
export const INITIAL_REJECTED_LOTS: RejectedLotRecord[] = [];
export const INITIAL_URGENT_REPLENISHMENTS: UrgentReplenishmentRecord[] = [];
export const INITIAL_NOTIFICATIONS: NotificationItem[] = [];

export const INITIAL_AUDIT_LOGS: AuditLogItem[] = [
  {
    id: 'log-001',
    timestamp: '2026-08-01T08:00:00Z',
    userName: 'Sarah Chen',
    userRole: 'Planner / MRP User',
    action: 'SYSTEM_INITIALIZED',
    entityType: 'System',
    entityId: 'Apex',
    details: 'System started with baseline actuals exactly aligned with plan values.',
  },
];
