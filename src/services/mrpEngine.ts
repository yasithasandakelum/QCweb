import {
  ActualMRPRow,
  ComponentCode,
  ComponentConfig,
  DailyProductionRecord,
  InspectionRecord,
  PlannedMRPRow,
  ProductionDefectEvent,
  SystemConfig,
} from '../types';

export function calculatePlannedMRP(
  componentCode: ComponentCode,
  daysInMonth: number,
  monthPrefix: string, // "2026-08"
  openingInventory: number,
  dailyPlannedOutputs: number[], // index 0 = day 1
  componentConfig: ComponentConfig,
  safetyStockTarget: number = 50,
  manualPlannedDeliveries?: Record<number, number>
): PlannedMRPRow[] {
  // Usage multipliers:
  // AA: Finished Production × 1
  // BB: Finished Production × 1
  // CC: Finished Production × 3
  const multiplier =
    componentCode === 'CC'
      ? 3
      : componentCode === 'AA' || componentCode === 'BB'
      ? 1
      : componentConfig.usageMultiplier ?? 1;

  // Row 4: Planned Usage for the Day
  const plannedUsages = dailyPlannedOutputs.map((out) => (out ?? 0) * multiplier);

  // Row 7: 3-Day Demand Capacity
  // Tomorrow's Usage + Usage 2 Days Ahead + Usage 3 Days Ahead
  // Day 29 -> Day 30 + Day 31
  // Day 30 -> Day 31
  // Day 31 -> 0
  const threeDayDemands: number[] = [];
  for (let i = 0; i < daysInMonth; i++) {
    let demand = 0;
    if (i + 1 < daysInMonth) demand += plannedUsages[i + 1] ?? 0;
    if (i + 2 < daysInMonth) demand += plannedUsages[i + 2] ?? 0;
    if (i + 3 < daysInMonth) demand += plannedUsages[i + 3] ?? 0;
    threeDayDemands.push(demand);
  }

  // Normal Stock Reference for Row 13 Storage Warning:
  // AA: up to about 2,000
  // BB: about 640
  // CC: about 2,000
  const normalStockRef =
    componentConfig.normalStockMax ||
    (componentCode === 'BB' ? 640 : 2000);

  // Minimum delivery quantity:
  // AA: 150
  // CC: 250
  // BB: unconfirmed / manual
  const minDelivery =
    componentCode === 'AA'
      ? 150
      : componentCode === 'CC'
      ? 250
      : componentConfig.minDeliveryQty;

  const rows: PlannedMRPRow[] = [];
  let pendingQty = 0;
  let orderSequence = 0;
  let prevEnding = openingInventory;

  // Sequential Day-by-Day pass
  for (let d = 0; d < daysInMonth; d++) {
    const dayNum = d + 1;
    const dateStr = `${monthPrefix}-${String(dayNum).padStart(2, '0')}`;
    const plannedProduction = dailyPlannedOutputs[d] ?? 0;

    // Row 3: Planned Safety Stock (50 units)
    const safetyStock = safetyStockTarget;

    // Row 2: Planned Beginning Inventory
    // Day 1: monthly opening inventory
    // Day 2 onward: Today's Beginning Inventory = Yesterday's Ending Inventory - Yesterday's Safety Stock
    let beginningInventory: number;
    if (d === 0) {
      beginningInventory = openingInventory;
    } else {
      beginningInventory = prevEnding - safetyStock;
    }

    // Row 4: Planned Usage for the Day
    const plannedUsage = plannedUsages[d] ?? 0;

    // Row 5: Remaining Inventory After Usage = MAX(Beginning Inventory - Planned Usage, 0)
    const remainingInventory = Math.max(beginningInventory - plannedUsage, 0);

    // Row 6: Shortage for Today = MAX(Planned Usage - Beginning Inventory, 0)
    const shortage = Math.max(plannedUsage - beginningInventory, 0);

    // Row 7: 3-Day Demand Capacity
    const threeDayDemand = threeDayDemands[d] ?? 0;

    // Row 8: Required Receiving Amount = MAX(3-Day Demand - Remaining Inventory + Today's Shortage, 0)
    const requiredReceiving = Math.max(threeDayDemand - remainingInventory + shortage, 0);

    // Row 9: Supplier Delivery Plan
    let supplierDeliveryPlan = 0;
    if (componentCode === 'BB') {
      // 🟡 BB special case: BB minimum delivery quantity is not yet confirmed.
      // BB Supplier Delivery Plan is entered manually until confirmed. The system does not invent a value.
      if (manualPlannedDeliveries && manualPlannedDeliveries[dayNum] !== undefined) {
        supplierDeliveryPlan = manualPlannedDeliveries[dayNum];
      } else {
        supplierDeliveryPlan = 0;
      }
    } else {
      // AA & CC automated delivery plan with pending accumulation & emergency trigger
      pendingQty += requiredReceiving;
      const minQty = minDelivery ?? (componentCode === 'AA' ? 150 : 250);
      const tomorrowUsage = d + 1 < daysInMonth ? (plannedUsages[d + 1] ?? 0) : 0;
      // Emergency trigger: Today's Remaining Inventory < Tomorrow's Usage or current shortage
      const isEmergency = pendingQty > 0 && (shortage > 0 || (tomorrowUsage > 0 && remainingInventory < tomorrowUsage));

      if (pendingQty >= minQty || isEmergency) {
        supplierDeliveryPlan = pendingQty;
        pendingQty = 0;
      } else {
        supplierDeliveryPlan = 0;
      }
    }

    // Row 10: Order Code
    // When Row 9 has a delivery greater than zero, generate sequential code: AA001, BB001, CC001...
    // If no delivery: '—'
    let orderCode = '—';
    if (supplierDeliveryPlan > 0) {
      orderSequence++;
      orderCode = `${componentCode}${String(orderSequence).padStart(3, '0')}`;
    }

    // Row 12: Planned Ending Inventory
    // Planned Ending Inventory = Remaining Inventory + Safety Stock + Supplier Delivery Plan
    // Row 12 = Row 5 + Row 3 + Row 9
    const plannedEndingInventory = remainingInventory + safetyStock + supplierDeliveryPlan;

    // Row 13: Storage Issue
    // Is planned ending inventory above normal stock reference?
    const storageWarning = plannedEndingInventory > normalStockRef;
    const storageIssueText = storageWarning ? 'Yes' : '—';

    // Lorries needed calculation
    const maxCapacity = componentConfig.maxDeliveryQty || (componentCode === 'AA' ? 300 : componentCode === 'BB' ? 160 : 560);
    const lorryCount = supplierDeliveryPlan > 0 ? Math.ceil(supplierDeliveryPlan / maxCapacity) : 0;

    rows.push({
      day: dayNum,
      date: dateStr,
      plannedProduction,
      beginningInventory,
      safetyStock,
      plannedUsage,
      remainingInventory,
      shortage,
      threeDayDemand,
      requiredReceiving,
      supplierDeliveryPlan,
      calculatedDelivery: supplierDeliveryPlan,
      finalDeliveryPlan: supplierDeliveryPlan,
      orderCode,
      plannedEndingInventory,
      storageWarning,
      storageIssueText,
      lorryCount,
    });

    prevEnding = plannedEndingInventory;
  }

  return rows;
}

export function consolidateDeliveryPlans(
  rows: PlannedMRPRow[],
  _componentConfig?: ComponentConfig
): PlannedMRPRow[] {
  // Planned delivery planning is now calculated sequentially in calculatePlannedMRP per authoritative rules.
  return rows;
}

// Corrected Actual MRP Baseline Quality Failures as defined in Excel workbook
const BASELINE_LOT_FAILS: Record<ComponentCode, number[]> = {
  AA: [5, 10, 3, 2, 6, 0, 3, 0, 0, 5, 8, 3, 2, 4, 5, 0, 4, 5, 8, 0, 7, 5, 0, 4, 2, 1, 0, 0, 0, 0, 0],
  BB: [2,  4, 1, 1, 3, 0, 1, 0, 0, 2, 3, 1, 1, 2, 2, 0, 1, 2, 3, 0, 3, 2, 0, 1, 1, 0, 0, 0, 0, 0, 0],
  CC: [10,20, 6, 4,12, 0, 6, 0, 0,10,16, 6, 4, 8,10, 0, 8,10,16, 0,14,10, 0, 8, 4, 2, 0, 0, 0, 0, 0],
};

const BASELINE_WH_FAILS: Record<ComponentCode, number[]> = {
  AA: [0, 5, 0, 7, 0, 0, 1, 0, 0, 0, 0, 2, 0, 0, 1, 0, 1, 0, 2, 0, 2, 1, 0, 1, 0, 1, 1, 2, 1, 0, 1],
  BB: [0, 2, 0, 3, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
  CC: [0,10, 0,14, 0, 0, 2, 0, 0, 0, 0, 4, 0, 0, 2, 0, 2, 0, 4, 0, 4, 2, 0, 2, 0, 2, 2, 4, 2, 0, 2],
};

const BASELINE_ASSY_FAILS: Record<ComponentCode, number[]> = {
  AA: [3, 0, 2, 1, 0, 5, 5, 6, 4, 0, 0, 5, 1, 0, 0, 1, 2, 0, 1, 1, 0, 0, 1, 2, 0, 1, 0, 0, 1, 1, 2],
  BB: [1, 0, 1, 0, 0, 2, 2, 2, 1, 0, 0, 2, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1],
  CC: [6, 0, 4, 2, 0,10,10,12, 8, 0, 0,10, 2, 0, 0, 2, 4, 0, 2, 2, 0, 0, 2, 4, 0, 2, 0, 0, 2, 2, 4],
};

const BASELINE_SAFETY_FAILS: Record<ComponentCode, number[]> = {
  AA: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  BB: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  CC: [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
};

export function calculateActualMRP(
  componentCode: ComponentCode,
  daysInMonth: number,
  monthPrefix: string,
  openingInventory: number,
  productionRecords: DailyProductionRecord[],
  defectEvents: ProductionDefectEvent[],
  inspections: InspectionRecord[],
  plannedRows: PlannedMRPRow[],
  componentConfig: ComponentConfig,
  systemConfig: SystemConfig,
  currentConfirmedDay: number,
  manualOverrides?: Record<number, any>
): ActualMRPRow[] {
  const rows: ActualMRPRow[] = [];

  let prevEndingInventory = openingInventory;
  let prevRemainingSafetyStock = systemConfig.safetyStockTarget || 50;
  let prevShortage = 0;
  let prevCycleDay = 0;

  for (let d = 0; d < daysInMonth; d++) {
    const dayNum = d + 1;
    const dateStr = `${monthPrefix}-${String(dayNum).padStart(2, '0')}`;
    const dayOverride = manualOverrides ? manualOverrides[dayNum] : undefined;

    // Check if there is active data or it is in the future
    const dayInspections = inspections.filter(
      (insp) => insp.lotReceivedDate === dateStr && insp.componentCode === componentCode
    );
    const acceptedInspections = dayInspections.filter((insp) => insp.finalDecision === 'Accepted');
    const hasAcceptedInspections = acceptedInspections.length > 0;
    const dayProd = productionRecords.find((p) => p.date === dateStr);
    const dayDefectsCheck = defectEvents.filter(
      (ev) => ev.date === dateStr && ev.componentCode === componentCode
    );
    const hasRecordedDefectsForDay = dayDefectsCheck.length > 0;
    const hasDayActivity = hasAcceptedInspections || (dayProd && !dayProd.isDraft) || hasRecordedDefectsForDay || !!dayOverride;

    if (dayNum > currentConfirmedDay && !hasDayActivity) {
      rows.push({
        day: dayNum,
        date: dateStr,
        status: 'Future',
        beginningInventory: null,
        beginningSafetyStock: null,
        actualUsage: null,
        fromMainStock: null,
        fromSafetyStock: null,
        remainingInventory: null,
        inventoryShortage: null,
        orderCode: null,
        actualReceiving: null,
        asPlannedOrder: null,
        safetyStockRequirement: null,
        qualityFailsTotal: null,
        lotQualityFails: null,
        warehouseQualityFails: null,
        assemblyQualityFails: null,
        safetyStockQualityFails: null,
        remainingSafetyStock: null,
        safetyStockShortage: null,
        safetyStockCycleDay: null,
        receiveShortageWithin: null,
        updatedReceivingPlan: null,
        actualEndingInventory: null,
        storageIssue: null,

        // Legacy compatibility properties
        safetyStock: null,
        actualEffectiveUsage: null,
        incomingQualityFails: null,
        productionQualityFails: null,
        totalQualityFails: null,
        updatedOrderingAmount: null,
        safetyShortfall: null,
      });
      continue;
    }

    // Row 16: Actual Beginning Inventory
    let beginningInventory = 1500;
    if (d > 0) {
      beginningInventory = Math.max(prevEndingInventory - prevRemainingSafetyStock, 0);
    }

    // Row 17: Actual Beginning Safety Stock
    const beginningSafetyStock = d === 0 ? 50 : prevRemainingSafetyStock;

    // Row 18: Actual Effective Usage
    let actualUsage = 0;
    if (dayOverride?.actualUsage !== undefined) {
      actualUsage = dayOverride.actualUsage;
    } else if (dayOverride?.actualEffectiveUsage !== undefined) {
      actualUsage = dayOverride.actualEffectiveUsage;
    } else {
      const rec = productionRecords.find((p) => p.date === dateStr);
      if (rec) {
        actualUsage = componentCode === 'AA' ? rec.usageAA : componentCode === 'BB' ? rec.usageBB : rec.usageCC;
      } else {
        actualUsage = plannedRows[d]?.plannedUsage || 0;
      }
    }

    // Row 20: From the Safety Stock
    let fromSafetyStock = 0;
    if (dayOverride?.fromSafetyStock !== undefined) {
      fromSafetyStock = dayOverride.fromSafetyStock;
    } else {
      const rec = productionRecords.find((p) => p.date === dateStr);
      if (rec?.safetyStockUsed) {
        fromSafetyStock = componentCode === 'AA' ? (rec.safetyStockUsageAA ?? 0) : componentCode === 'BB' ? (rec.safetyStockUsageBB ?? 0) : (rec.safetyStockUsageCC ?? 0);
      } else {
        fromSafetyStock = dayNum === 1 && componentCode === 'AA' ? 10 : 0;
      }
    }

    // Row 19: From the Main Stock
    const fromMainStock = Math.max(actualUsage - fromSafetyStock, 0);

    // Row 21: Remaining Inventory After Usage
    const remainingInventory = Math.max(beginningInventory - actualUsage, 0);

    // Row 22: Inventory Shortage for Today
    const inventoryShortage = Math.max(actualUsage - beginningInventory, 0);

    // Row 23: Order Code
    const orderCode = dayOverride?.orderCode !== undefined ? dayOverride.orderCode : (plannedRows[d]?.orderCode || '—');

    // Row 25: As the Planned Order
    let asPlannedOrder = 0;
    if (orderCode && orderCode !== '—') {
      const prMatch = plannedRows.find((pr) => pr.orderCode === orderCode);
      if (prMatch) {
        asPlannedOrder = prMatch.supplierDeliveryPlan;
      }
    }

    // Row 26: As the Safety Stock Requirement (Theoretical baseline calculated from previous shortages)
    let safetyStockRequirement = 0;
    for (let sIdx = 0; sIdx < d; sIdx++) {
      const prevSShortage = rows[sIdx].safetyStockShortage || 0;
      const prevP = rows[sIdx].receiveShortageWithin || 0;
      if (prevSShortage > 0 && prevP > 0) {
        let receivingDaysFound = 0;
        let todayPartIndex = -1;

        // Search starts at index sIdx + 2 for lead time
        for (let rDay = sIdx + 2; rDay < daysInMonth; rDay++) {
          const prRow = plannedRows[rDay];
          if (prRow && prRow.supplierDeliveryPlan > 0) {
            if (rDay === d) {
              todayPartIndex = receivingDaysFound;
            }
            receivingDaysFound++;
            if (receivingDaysFound === prevP) {
              break;
            }
          }
        }

        if (todayPartIndex !== -1) {
          const base = Math.floor(prevSShortage / prevP);
          const remainder = prevSShortage % prevP;
          const partVal = todayPartIndex < remainder ? base + 1 : base;
          safetyStockRequirement += partVal;
        }
      }
    }

    // Row 36: Updated Receiving Plan
    const updatedReceivingPlan = (plannedRows[d]?.supplierDeliveryPlan || 0) + safetyStockRequirement;

    // Row 24: Actual Receiving Amount
    let actualReceiving = updatedReceivingPlan;
    if (dayOverride?.actualReceiving !== undefined) {
      actualReceiving = dayOverride.actualReceiving;
    } else {
      const dayInsps = inspections.filter(
        (insp) => insp.lotReceivedDate === dateStr && insp.componentCode === componentCode
      );
      const acceptedInsps = dayInsps.filter((insp) => insp.finalDecision === 'Accepted');
      if (acceptedInsps.length > 0) {
        actualReceiving = acceptedInsps.reduce((sum, insp) => sum + insp.lotSize, 0);
      }
    }

    // Row 26 Received portion (taking manual overrides into account if they exist)
    const safetyStockReqReceived = dayOverride?.actualReceiving !== undefined ? Math.max(actualReceiving - asPlannedOrder, 0) : safetyStockRequirement;

    // Row 28: Lot Quality Failures
    let lotQualityFails = BASELINE_LOT_FAILS[componentCode]?.[d] ?? 0;
    if (dayOverride?.lotQualityFails !== undefined) {
      lotQualityFails = dayOverride.lotQualityFails;
    } else if (dayOverride?.incomingQualityFails !== undefined) {
      lotQualityFails = dayOverride.incomingQualityFails;
    } else {
      const dayInsps = inspections.filter(
        (insp) => insp.lotReceivedDate === dateStr && insp.componentCode === componentCode
      );
      const acceptedInsps = dayInsps.filter((insp) => insp.finalDecision === 'Accepted');
      if (acceptedInsps.length > 0) {
        lotQualityFails = acceptedInsps.reduce((sum, insp) => sum + insp.totalDefectCount, 0);
      }
    }

    // Sum up logged production defect events for today by category
    const dayDefects = defectEvents.filter(
      (ev) => ev.date === dateStr && ev.componentCode === componentCode
    );

    const loggedWarehouseDefects = dayDefects
      .filter((ev) => ev.sourceCategory === 'Warehouse Defect')
      .reduce((sum, ev) => sum + ev.quantity, 0);

    const loggedAssemblyDefects = dayDefects
      .filter((ev) => ev.sourceCategory === 'Assembly Defect' || !ev.sourceCategory)
      .reduce((sum, ev) => sum + ev.quantity, 0);

    const loggedSafetyStockDefects = dayDefects
      .filter((ev) => ev.sourceCategory === 'Safety Stock Defect')
      .reduce((sum, ev) => sum + ev.quantity, 0);

    // If day has operational defect events recorded, use the real operational counts.
    // Otherwise fallback to baseline simulation for unrecorded/future days.
    const hasRecordedDefects = dayDefects.length > 0;

    // Row 29: Warehouse Quality Failures
    let warehouseQualityFails = hasRecordedDefects
      ? loggedWarehouseDefects
      : (BASELINE_WH_FAILS[componentCode]?.[d] ?? 0);
    if (dayOverride?.warehouseQualityFails !== undefined) {
      warehouseQualityFails = dayOverride.warehouseQualityFails;
    }

    // Row 30: Assembly Quality Failures
    let assemblyQualityFails = hasRecordedDefects
      ? loggedAssemblyDefects
      : (BASELINE_ASSY_FAILS[componentCode]?.[d] ?? 0);
    if (dayOverride?.assemblyQualityFails !== undefined) {
      assemblyQualityFails = dayOverride.assemblyQualityFails;
    } else if (dayOverride?.productionQualityFails !== undefined) {
      assemblyQualityFails = dayOverride.productionQualityFails;
    }

    // Row 31: Safety Stock Quality Failures
    let safetyStockQualityFails = hasRecordedDefects
      ? loggedSafetyStockDefects
      : (BASELINE_SAFETY_FAILS[componentCode]?.[d] ?? 0);
    if (dayOverride?.safetyStockQualityFails !== undefined) {
      safetyStockQualityFails = dayOverride.safetyStockQualityFails;
    }

    // Row 27: Quality Fails Total
    const qualityFailsTotal = lotQualityFails + warehouseQualityFails + assemblyQualityFails + safetyStockQualityFails;

    // Row 32: Remaining Safety Stock
    const remainingSafetyStock = Math.max(beginningSafetyStock + safetyStockReqReceived - qualityFailsTotal, 0);

    // Row 34: Safety Stock Cycle Day
    let safetyStockCycleDay = 1;
    if (d > 0) {
      safetyStockCycleDay = prevShortage > 0 ? 1 : prevCycleDay + 1;
    }

    // Row 33: Safety Stock Shortage (Checks if previous recoveries are still pending)
    let recoveryPendingAfterToday = false;
    for (let sIdx = 0; sIdx < d; sIdx++) {
      const prevSShortage = rows[sIdx].safetyStockShortage || 0;
      const prevP = rows[sIdx].receiveShortageWithin || 0;
      if (prevSShortage > 0 && prevP > 0) {
        let receivingDaysFound = 0;
        let lastDeliveryDayIdx = -1;
        for (let rDay = sIdx + 2; rDay < daysInMonth; rDay++) {
          const prRow = plannedRows[rDay];
          if (prRow && prRow.supplierDeliveryPlan > 0) {
            receivingDaysFound++;
            if (receivingDaysFound === prevP) {
              lastDeliveryDayIdx = rDay;
              break;
            }
          }
        }
        if (lastDeliveryDayIdx !== -1 && d < lastDeliveryDayIdx) {
          recoveryPendingAfterToday = true;
          break;
        }
      }
    }

    let safetyStockShortage = 0;
    if (remainingSafetyStock < 26 && !recoveryPendingAfterToday) {
      safetyStockShortage = 50 - remainingSafetyStock;
    }

    // Row 35: Need to Receive the Shortage Safety Stock Within
    const receiveShortageWithin = safetyStockShortage > 0 ? Math.min(Math.max(safetyStockCycleDay - 1, 2), 5) : 0;

    // Row 37: Actual Ending Inventory
    const actualEndingInventory = remainingInventory + remainingSafetyStock + asPlannedOrder;

    // Row 38: Are There Any Storage Issues?
    const storageIssue = actualEndingInventory > 1750 ? 'Yes' : '—';

    rows.push({
      day: dayNum,
      date: dateStr,
      status: 'Confirmed',
      beginningInventory,
      beginningSafetyStock,
      actualUsage,
      fromMainStock,
      fromSafetyStock,
      remainingInventory,
      inventoryShortage,
      orderCode,
      actualReceiving,
      asPlannedOrder,
      safetyStockRequirement: safetyStockReqReceived,
      qualityFailsTotal,
      lotQualityFails,
      warehouseQualityFails,
      assemblyQualityFails,
      safetyStockQualityFails,
      remainingSafetyStock,
      safetyStockShortage,
      safetyStockCycleDay,
      receiveShortageWithin,
      updatedReceivingPlan,
      actualEndingInventory,
      storageIssue,

      // Legacy compatibility mapping to avoid compilation breaks
      safetyStock: beginningSafetyStock,
      actualEffectiveUsage: actualUsage,
      incomingQualityFails: lotQualityFails,
      productionQualityFails: assemblyQualityFails,
      totalQualityFails: qualityFailsTotal,
      updatedOrderingAmount: updatedReceivingPlan,
      safetyShortfall: safetyStockShortage > 0 ? safetyStockShortage : null,
    });

    prevEndingInventory = actualEndingInventory;
    prevRemainingSafetyStock = remainingSafetyStock;
    prevShortage = safetyStockShortage;
    prevCycleDay = safetyStockCycleDay;
  }

  return rows;
}
