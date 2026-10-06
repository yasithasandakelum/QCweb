export type ComponentCode = 'AA' | 'BB' | 'CC';

export interface ComponentConfig {
  code: ComponentCode;
  name: string;
  usageMultiplier: number;
  minDeliveryQty: number | null; // BB is TBD / configurable
  maxDeliveryQty: number;
  normalStockMin: number;
  normalStockMax: number;
  isMinConfirmed: boolean;
}

export type SamplingMethod = 'Single' | 'Double';
export type AQLValue = 1.0 | 1.5 | 2.5 | 4.0 | 6.5;

export type InspectionStatus =
  | 'Draft'
  | 'Stage 1 In Progress'
  | 'Second Sample Required'
  | 'Accepted'
  | 'Rejected'
  | 'Awaiting Supervisor Approval'
  | 'Completed';

export type DefectSourceCategory =
  | 'Supplier production defect'
  | 'Transport defect — internal'
  | 'Transport defect — external'
  | 'Other'
  | 'Warehouse Defect'
  | 'Assembly Defect'
  | 'Safety Stock Defect';

export interface DefectItem {
  id: string;
  reason: string;
  count: number;
  sourceCategory?: DefectSourceCategory;
  notes?: string;
}

export interface DefectImage {
  id: string;
  url: string;
  caption: string;
  uploadedBy: string;
  uploadedAt: string;
  defectReason?: string;
}

export interface InspectionRecord {
  id: string;
  deliveryNumber: string; // e.g. DEL-025 or DEL-025-R1
  deliveryFamilyNumber: string; // e.g. DEL-025
  replacementSequence: number; // 0 = original, 1 = R1, 2 = R2...
  supplierName: string;
  componentCode: ComponentCode;
  lotReceivedDate: string; // YYYY-MM-DD
  lotReceivedTime: string; // HH:mm
  lotSize: number;
  vehicleRef?: string;
  notes?: string;
  samplingMethod: SamplingMethod;
  inspectionLevel: 'General II';
  aql: AQLValue;
  codeLetter: string;
  sampleSizeStage1: number;
  acStage1: number;
  reStage1: number;
  sampleSizeStage2?: number;
  acStage2?: number;
  reStage2?: number;
  stage1DefectsCount: number;
  stage2DefectsCount?: number;
  totalDefectCount: number;
  defects: DefectItem[];
  images: DefectImage[];
  status: InspectionStatus;
  finalDecision: 'Accepted' | 'Rejected' | 'Pending';
  inspectorName: string;
  supervisorName?: string;
  supervisorSignature?: string; // Data URL / signature string
  approvedAt?: string;
  createdAt: string;
}

export type ProductionModelCode = 'Model A' | 'Model B' | 'Model C' | 'Model D' | 'Model E' | 'Model F';

export interface DailyModelOutput {
  model: ProductionModelCode;
  quantity: number;
}

export interface DailyProductionRecord {
  id: string;
  date: string; // YYYY-MM-DD
  outputs: DailyModelOutput[];
  totalFinalProduction: number; // Sum of outputs
  usageAA: number; // total * 1
  usageBB: number; // total * 1
  usageCC: number; // total * 3
  safetyStockUsed?: boolean;
  safetyStockUsageAA?: number;
  safetyStockUsageBB?: number;
  safetyStockUsageCC?: number;
  isDraft?: boolean;
  enteredBy: string;
  createdAt: string;
}

export interface ProductionDefectEvent {
  id: string;
  date: string; // YYYY-MM-DD
  timestamp: string; // HH:mm
  componentCode: ComponentCode;
  defectReason: string;
  quantity: number;
  sourceCategory?: DefectSourceCategory;
  enteredBy: string;
  notes?: string;
  status: 'Pending Confirmation' | 'Confirmed';
}

export interface DailyProductionConfirmation {
  id: string;
  date: string;
  confirmedBy: string;
  confirmedAt: string;
  status: 'Confirmed' | 'Pending';
  notes?: string;
}

export interface PlannedMRPRow {
  day: number;
  date: string; // YYYY-MM-DD
  plannedProduction: number; // Row 1: Daily Unit Output Target
  beginningInventory: number; // Row 2: Planned Beginning Inventory
  safetyStock: number; // Row 3: Planned Safety Stock (50)
  plannedUsage: number; // Row 4: Planned Usage for the Day
  remainingInventory: number; // Row 5: Remaining Inventory After Usage
  shortage: number; // Row 6: Shortage for Today
  threeDayDemand: number; // Row 7: 3-Day Demand Capacity
  requiredReceiving: number; // Row 8: Required Receiving Amount
  supplierDeliveryPlan: number; // Row 9: Supplier Delivery Plan
  calculatedDelivery: number; // Row 9 alias
  finalDeliveryPlan: number; // Row 9 alias
  orderCode: string; // Row 10: Order Code (e.g. AA001, BB001, CC001 or —)
  plannedEndingInventory: number; // Row 12: Planned Ending Inventory
  storageWarning: boolean; // Row 13: Storage Issue Warning (> normal reference)
  storageIssueText: string; // Row 13 text: 'Yes' or '—'
  lorryCount?: number;
}

export interface ActualMRPRow {
  day: number;
  date: string; // YYYY-MM-DD
  status: 'Future' | 'Open' | 'Data Entry In Progress' | 'Pending End-of-Day Confirmation' | 'Confirmed' | 'Closed';
  beginningInventory: number | null; // Row 16
  beginningSafetyStock: number | null; // Row 17
  actualUsage: number | null; // Row 18
  fromMainStock: number | null; // Row 19
  fromSafetyStock: number | null; // Row 20
  remainingInventory: number | null; // Row 21
  inventoryShortage: number | null; // Row 22
  orderCode: string | null; // Row 23
  actualReceiving: number | null; // Row 24
  asPlannedOrder: number | null; // Row 25
  safetyStockRequirement: number | null; // Row 26
  qualityFailsTotal: number | null; // Row 27
  lotQualityFails: number | null; // Row 28
  warehouseQualityFails: number | null; // Row 29
  assemblyQualityFails: number | null; // Row 30
  safetyStockQualityFails: number | null; // Row 31
  remainingSafetyStock: number | null; // Row 32
  safetyStockShortage: number | null; // Row 33
  safetyStockCycleDay: number | null; // Row 34
  receiveShortageWithin: number | null; // Row 35
  updatedReceivingPlan: number | null; // Row 36
  actualEndingInventory: number | null; // Row 37
  storageIssue: string | null; // Row 38 ('Yes' or '—')

  // Deprecated/Legacy aliases to ensure zero compilation breaks in other views
  safetyStock: number | null;
  actualEffectiveUsage: number | null;
  incomingQualityFails: number | null;
  productionQualityFails: number | null;
  totalQualityFails: number | null;
  updatedOrderingAmount: number | null;
  safetyShortfall: number | null;
}

export interface MonthlyMRPPlan {
  id: string;
  month: string; // e.g. "2026-08"
  status: 'Draft' | 'Approved' | 'Locked' | 'Closed';
  createdBy: string;
  approvedBy?: string;
  approvedAt?: string;
  openingInventory: Record<ComponentCode, number>;
  plannedRows: Record<ComponentCode, PlannedMRPRow[]>;
  actualRows: Record<ComponentCode, ActualMRPRow[]>;
  version: number;
}

export type DeliveryStatus =
  | 'Planned'
  | 'Confirmed'
  | 'In Transit'
  | 'Arrived'
  | 'Inspected - Accepted'
  | 'Inspected - Rejected'
  | 'Cancelled';

export interface LorrySplit {
  lorryNumber: number;
  quantity: number;
  vehicleRef?: string;
}

export interface DeliveryRecord {
  id: string;
  businessDeliveryNumber: string; // e.g. DEL-025 or DEL-025-R1
  deliveryFamilyNumber: string; // e.g. DEL-025
  replacementSequence: number;
  componentCode: ComponentCode;
  plannedDate: string;
  confirmedDate?: string;
  plannedQuantity: number;
  updatedQuantity: number;
  actualQuantity?: number;
  orderCode?: string;
  arrivalTime?: string;
  receivedDate?: string;
  deliveryCondition?: 'Normal' | 'Damaged cartons' | 'Missing items' | 'Other';
  vehicleRef?: string;
  lorries: LorrySplit[];
  status: DeliveryStatus;
  urgentAdjustment: number; // e.g. +35
  adjustmentReason?: string;
  notes?: string;
}

export type UrgentReplenishmentSource = 'SAFETY_STOCK' | 'REJECTED_LOT' | 'MANUAL';
export type UrgentReplenishmentStatus =
  | 'Pending'
  | 'Awaiting Supplier Confirmation'
  | 'Confirmed'
  | 'In Transit'
  | 'Received'
  | 'Quality Inspection Pending'
  | 'Completed'
  | 'Cancelled';

export interface UrgentReplenishmentRecord {
  id: string;
  sourceType: UrgentReplenishmentSource;
  sourceId?: string; // e.g. inspectionId or date
  componentCode: ComponentCode;
  quantity: number;
  requestedAt: string;
  targetDate: string; // approximately 2-day reference
  confirmedDate?: string;
  linkedDeliveryId?: string;
  status: UrgentReplenishmentStatus;
  reason: string;
  procurementNotified: boolean;
  procurementNotifiedAt?: string;
  emailSentStatus: 'Sent' | 'Failed' | 'Pending';
}

export interface RejectedLotRecord {
  id: string;
  inspectionId: string;
  deliveryNumber: string;
  componentCode: ComponentCode;
  lotSize: number;
  defectCount: number;
  reasons: string[];
  rejectedDate: string;
  returnedToSupplier: boolean;
  returnedAt?: string;
  procurementNotified: boolean;
  procurementNotifiedAt?: string;
  urgentReplacementId?: string;
  replacementDeliveryNumber?: string;
  closureStatus: 'Open' | 'Replacement In Progress' | 'Closed';
}

export interface SystemConfig {
  companyName: string;
  procurementEmail: string;
  defaultOpeningInventory: number; // 500
  safetyStockTarget: number; // 50
  reorderTrigger: number; // 20
  defaultAql: AQLValue;
  allowedAqlValues: AQLValue[];
  inspectionLevel: 'General II';
  supplierName: string;
  urgentReplacementLeadDays: number; // 2
  components: Record<ComponentCode, ComponentConfig>;
}

export interface NotificationItem {
  id: string;
  type:
    | 'URGENT_REPLENISHMENT'
    | 'REJECTED_LOT'
    | 'SAFETY_STOCK_ALERT'
    | 'CONFIRMATION_REQUIRED'
    | 'AUDIT_NOTICE'
    | 'STOCK_SHORTAGE'
    | 'STOCK_ADDED'
    | 'info'
    | 'warning'
    | 'alert'
    | 'success';
  title: string;
  message: string;
  recipient: string;
  status: 'Unread' | 'Read';
  createdAt: string;
  link?: string;
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  userName: string;
  userRole: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  beforeData?: string;
  afterData?: string;
}

export type UserRole =
  | 'Procurement'
  | 'Manager'
  | 'Supervisor';

export interface ManualActualOverride {
  actualUsage?: number;
  fromSafetyStock?: number;
  actualReceiving?: number;
  lotQualityFails?: number;
  warehouseQualityFails?: number;
  assemblyQualityFails?: number;
  safetyStockQualityFails?: number;
  
  // legacy compatibility aliases
  actualEffectiveUsage?: number;
  productionQualityFails?: number;
  incomingQualityFails?: number;
  safetyStock?: number;
  
  reason?: string;
  updatedAt?: string;
}

export interface ManualMRPEntry {
  day: number;
  componentCode: ComponentCode;
  field: 'plannedUsage' | 'plannedOutput' | 'actualEffectiveUsage' | 'actualReceiving' | 'productionQualityFails' | 'incomingQualityFails';
  value: number;
  reason?: string;
  enteredBy: string;
  timestamp: string;
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  roles: UserRole[];
  active: boolean;
  avatarColor: string;
}

export type ActualMRPInputStatus =
  | 'Not Started'
  | 'Data Entry In Progress'
  | 'Ready for Confirmation'
  | 'Confirmed';

export interface ComponentActualMRPInput {
  actualUsage: number | null;
  safetyStockUsed: boolean;
  safetyStockQuantity: number;
  warehouseDefects: number;
  assemblyDefects: number;
  safetyStockDefects: number;
  inspectionDefects: number;
  qualityFailsTotal: number;
  status: ActualMRPInputStatus;
  defectStatus?: 'Not Entered' | 'Defect Inputs Saved';
  notes?: string;
}

export interface DailyActualMRPInputRecord {
  id: string;
  date: string; // YYYY-MM-DD
  components: {
    AA: ComponentActualMRPInput;
    BB: ComponentActualMRPInput;
    CC: ComponentActualMRPInput;
  };
  overallStatus: ActualMRPInputStatus;
  notes?: string;
  confirmedAt?: string;
  confirmedBy?: string;
}
