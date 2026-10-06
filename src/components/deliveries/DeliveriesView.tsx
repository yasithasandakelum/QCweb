import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Edit,
  Eye,
  FileCheck2,
  Plus,
  Search,
  ShieldAlert,
  ShieldCheck,
  Truck,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ComponentCode, DeliveryRecord } from '../../types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

interface DeliveriesViewProps {
  onStartInspection?: (data: {
    deliveryNumber: string;
    componentCode: ComponentCode;
    lotSize: number;
    lotReceivedDate: string;
    lotReceivedTime: string;
    vehicleRef?: string;
  }) => void;
}

export const DeliveriesView: React.FC<DeliveriesViewProps> = ({ onStartInspection }) => {
  const {
    deliveries,
    systemConfig,
    activeRole,
    updateDeliveryQuantity,
    createDelivery,
    receiveSupplierDelivery,
    monthlyPlans,
    currentMonth,
    currentDay,
    inspections,
  } = useApp();

  const [filterComponent, setFilterComponent] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Adjust quantity modal
  const [editDelivery, setEditDelivery] = useState<DeliveryRecord | null>(null);
  const [newQty, setNewQty] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState<string>('');

  // Create new planned delivery modal
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [newComp, setNewComp] = useState<ComponentCode>('AA');
  const [newDate, setNewDate] = useState<string>(`${currentMonth}-${String(currentDay).padStart(2, '0')}`);
  const [newPlannedQty, setNewPlannedQty] = useState<number>(300);
  const [newNotes, setNewNotes] = useState<string>('');

  // Receive Delivery Modal (Section 5)
  const [isReceiveOpen, setIsReceiveOpen] = useState<boolean>(false);
  const [selectedOrderCode, setSelectedOrderCode] = useState<string>('');
  const [receiveComp, setReceiveComp] = useState<ComponentCode>('AA');
  const [receivePlannedQty, setReceivePlannedQty] = useState<number>(400);
  const [receivePlannedDate, setReceivePlannedDate] = useState<string>(`${currentMonth}-${String(currentDay).padStart(2, '0')}`);
  const [actualArrivedQty, setActualArrivedQty] = useState<number>(415);
  const [lorryNo, setLorryNo] = useState<string>('ABC-1234');
  const [arrivalTime, setArrivalTime] = useState<string>('09:20 AM');
  const [receiveNotes, setReceiveNotes] = useState<string>('');
  const [receiveDate, setReceiveDate] = useState<string>(`${currentMonth}-${String(currentDay).padStart(2, '0')}`);
  const [deliveryCondition, setDeliveryCondition] = useState<'Normal' | 'Damaged cartons' | 'Missing items' | 'Other'>('Normal');
  const [savedDeliveryJustNow, setSavedDeliveryJustNow] = useState<DeliveryRecord | null>(null);

  // Extract planned order codes from Planned MRP
  const plannedOrderOptions = useMemo(() => {
    const list: Array<{
      orderCode: string;
      componentCode: ComponentCode;
      plannedQty: number;
      day: number;
      date: string;
    }> = [];

    const plan = monthlyPlans[currentMonth];
    if (plan?.plannedRows) {
      (['AA', 'BB', 'CC'] as ComponentCode[]).forEach((code) => {
        plan.plannedRows[code]?.forEach((r) => {
          if (r.supplierDeliveryPlan > 0 && r.orderCode && r.orderCode !== '—') {
            list.push({
              orderCode: r.orderCode,
              componentCode: code,
              plannedQty: r.supplierDeliveryPlan,
              day: r.day,
              date: r.date,
            });
          }
        });
      });
    }

    // Default fallback sample codes if empty
    if (list.length === 0) {
      list.push(
        { orderCode: 'AA001', componentCode: 'AA', plannedQty: 300, day: 2, date: `${currentMonth}-02` },
        { orderCode: 'AA002', componentCode: 'AA', plannedQty: 300, day: 5, date: `${currentMonth}-05` },
        { orderCode: 'AA003', componentCode: 'AA', plannedQty: 400, day: 8, date: `${currentMonth}-08` },
        { orderCode: 'AA004', componentCode: 'AA', plannedQty: 400, day: 10, date: `${currentMonth}-10` },
        { orderCode: 'AA005', componentCode: 'AA', plannedQty: 400, day: 12, date: `${currentMonth}-12` }
      );
    }

    return list;
  }, [monthlyPlans, currentMonth]);

  const isProcurementOrAdmin =
    activeRole === 'Procurement' || activeRole === 'Manager' || activeRole === 'Admin';

  const filteredDeliveries = deliveries.filter((del) => {
    if (filterComponent !== 'ALL' && del.componentCode !== filterComponent) return false;
    if (filterStatus !== 'ALL' && del.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (!del.businessDeliveryNumber.toLowerCase().includes(q) && !(del.orderCode && del.orderCode.toLowerCase().includes(q))) {
        return false;
      }
    }
    return true;
  });

  const totalDeliveries = deliveries.length;
  const totalUnits = deliveries.reduce((sum, d) => sum + (d.actualQuantity || d.updatedQuantity || d.plannedQuantity), 0);
  const arrivedPendingInspectionCount = deliveries.filter((d) => d.status === 'Arrived').length;

  const handleOpenReceiveModal = () => {
    const defaultOption = plannedOrderOptions[0];
    if (defaultOption) {
      setSelectedOrderCode(defaultOption.orderCode);
      setReceiveComp(defaultOption.componentCode);
      setReceivePlannedQty(defaultOption.plannedQty);
      setReceivePlannedDate(defaultOption.date);
      setActualArrivedQty(defaultOption.plannedQty);
    } else {
      setSelectedOrderCode('AA001');
      setReceiveComp('AA');
      setReceivePlannedQty(400);
      setReceivePlannedDate(`${currentMonth}-${String(currentDay).padStart(2, '0')}`);
      setActualArrivedQty(400);
    }
    setLorryNo('ABC-1234');
    setArrivalTime('09:20 AM');
    setReceiveDate(`${currentMonth}-${String(currentDay).padStart(2, '0')}`);
    setDeliveryCondition('Normal');
    setReceiveNotes('');
    setSavedDeliveryJustNow(null);
    setIsReceiveOpen(true);
  };

  const handleSelectOrderCode = (code: string) => {
    setSelectedOrderCode(code);
    const match = plannedOrderOptions.find((o) => o.orderCode === code);
    if (match) {
      setReceiveComp(match.componentCode);
      setReceivePlannedQty(match.plannedQty);
      setReceivePlannedDate(match.date);
      setReceiveDate(match.date);
      setActualArrivedQty(match.plannedQty);
    }
  };

  // Friendly validation check: is actual arrived quantity unusually high or low?
  const isSignificantlyDifferent =
    receivePlannedQty > 0 &&
    (actualArrivedQty > receivePlannedQty * 1.5 || actualArrivedQty < receivePlannedQty * 0.5);

  const handleSaveReceivedDelivery = (e: React.FormEvent) => {
    e.preventDefault();
    if (actualArrivedQty <= 0) return;

    const saved = receiveSupplierDelivery(
      selectedOrderCode,
      receiveComp,
      actualArrivedQty,
      lorryNo,
      arrivalTime,
      receiveNotes,
      deliveryCondition,
      receiveDate
    );

    setSavedDeliveryJustNow(saved);
  };

  const handleSaveAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDelivery || newQty <= 0) return;
    updateDeliveryQuantity(editDelivery.id, newQty, adjustReason || 'Urgent requirement update');
    setEditDelivery(null);
  };

  const handleCreateDelivery = (e: React.FormEvent) => {
    e.preventDefault();
    createDelivery({
      componentCode: newComp,
      plannedDate: newDate,
      plannedQuantity: newPlannedQty,
      updatedQuantity: newPlannedQty,
      lorries: [],
      status: 'Planned',
      urgentAdjustment: 0,
      notes: newNotes,
    });
    setIsCreateOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-blue-600 shrink-0" />
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-slate-800">
              Supplier Deliveries & Lorry Dispatch Plan
            </h2>
            <Badge variant="outline" className="hidden sm:inline-flex bg-blue-50 text-blue-700 border-blue-200 text-xs">
              Receiving Operational Screen
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Log arrived shipments against planned order codes. Arrived quantities require AQL lot inspection before release to Actual MRP.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Section 5: Dedicated Operational Inbound Receiving Button */}
          <button
            onClick={handleOpenReceiveModal}
            className="flex items-center gap-2 px-3.5 py-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-xs"
          >
            <Truck className="w-4 h-4" />
            <span>Receive Delivery</span>
          </button>

          {isProcurementOrAdmin && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Create Order</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="shadow-xs">
          <CardContent className="p-3.5">
            <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">
              Total Scheduled Orders
            </span>
            <span className="text-2xl font-black text-slate-800 value-mono mt-0.5 block">{totalDeliveries}</span>
            <span className="text-[10px] text-slate-500">Planned & arrived shipments</span>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardContent className="p-3.5">
            <span className="text-[10px] text-blue-600 block font-bold uppercase tracking-wider">
              Total Inbound Units
            </span>
            <span className="text-2xl font-black text-blue-600 value-mono mt-0.5 block">{totalUnits.toLocaleString()}</span>
            <span className="text-[10px] text-slate-500">Across AA, BB, CC components</span>
          </CardContent>
        </Card>

        <Card className={`shadow-xs ${arrivedPendingInspectionCount > 0 ? 'border-amber-300 bg-amber-50/20' : ''}`}>
          <CardContent className="p-3.5">
            <span className={`text-[10px] block font-bold uppercase tracking-wider ${arrivedPendingInspectionCount > 0 ? 'text-amber-700' : 'text-slate-400'}`}>
              Pending Lot Inspection
            </span>
            <span className={`text-2xl font-black value-mono mt-0.5 block ${arrivedPendingInspectionCount > 0 ? 'text-amber-700' : 'text-slate-800'}`}>
              {arrivedPendingInspectionCount} Arrived
            </span>
            <span className="text-[10px] text-amber-600">
              {arrivedPendingInspectionCount > 0 ? 'Stock withheld until accepted' : 'All lots inspected'}
            </span>
          </CardContent>
        </Card>

        <Card className="shadow-xs">
          <CardContent className="p-3.5">
            <span className="text-[10px] text-emerald-600 block font-bold uppercase tracking-wider">
              Active Supplier
            </span>
            <span className="text-sm font-bold text-slate-800 mt-1.5 block truncate">
              {systemConfig.supplierName}
            </span>
            <span className="text-[10px] text-emerald-600 font-semibold">Single source active (auto-selected)</span>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 p-3 rounded-lg shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search delivery number or order code..."
            className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Component:</span>
            <select
              value={filterComponent}
              onChange={(e) => setFilterComponent(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 text-slate-700 focus:outline-none text-xs"
            >
              <option value="ALL">All</option>
              <option value="AA">AA (Outer Tub)</option>
              <option value="BB">BB (Inner Tub)</option>
              <option value="CC">CC (Ridgeform)</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Status:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 text-slate-700 focus:outline-none text-xs"
            >
              <option value="ALL">All Statuses</option>
              <option value="Planned">Planned</option>
              <option value="Arrived">Arrived (Awaiting Inspection)</option>
              <option value="Inspected - Accepted">Inspected - Accepted</option>
              <option value="Inspected - Rejected">Inspected - Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Deliveries Table with Lorry Split Detail */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="mrp-table w-full">
            <thead>
              <tr>
                <th className="row-label">Delivery / Order</th>
                <th>Date</th>
                <th>Component</th>
                <th className="text-right">Planned Qty</th>
                <th className="text-right">Arrived / Current</th>
                <th>Lorry Breakdown</th>
                <th className="text-center">Status</th>
                <th className="pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDeliveries.map((del) => {
                const isReplacement = del.replacementSequence > 0;
                const compCfg = systemConfig.components[del.componentCode];
                const matchingInsp = inspections.find((i) => i.deliveryNumber === del.businessDeliveryNumber || (del.orderCode && i.deliveryNumber === del.orderCode));

                return (
                  <tr key={del.id} className="hover:bg-slate-50 text-slate-700">
                    <td className="row-label font-bold text-slate-900">
                      <div className="flex items-center gap-1.5">
                        {isReplacement && (
                          <span className="px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 text-[10px] font-bold border border-purple-200">
                            Replacement
                          </span>
                        )}
                        <span>{del.businessDeliveryNumber}</span>
                        {del.orderCode && (
                          <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-900 font-mono text-[10px]">
                            {del.orderCode}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="text-slate-600">{del.plannedDate}</td>

                    <td className="font-semibold text-slate-800">
                      <span className="status-pill status-safe font-bold">
                        {del.componentCode}
                      </span>
                    </td>

                    <td className="text-right value-mono text-slate-500">{del.plannedQuantity}</td>

                    <td className="text-right value-mono font-bold text-slate-900">
                      {del.actualQuantity !== undefined ? (
                        <span className="text-emerald-700 font-black">+{del.actualQuantity}</span>
                      ) : (
                        del.updatedQuantity
                      )}
                    </td>

                    {/* Lorry Distribution Pill Badges */}
                    <td>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {del.lorries.map((l, lIdx) => {
                          const lorryNum = l.lorryNumber ?? (lIdx + 1);
                          return (
                            <span
                              key={`lorry-${del.id}-${lorryNum}-${lIdx}`}
                              className="px-2 py-0.5 rounded text-[10px] value-mono flex items-center gap-1 bg-slate-100 border border-slate-200 text-slate-700 font-medium"
                            >
                              <Truck className="w-3 h-3 text-slate-400" />
                              <span>
                                L{lorryNum}: <strong>{l.quantity}</strong>
                              </span>
                            </span>
                          );
                        })}
                      </div>
                    </td>

                    <td className="text-center">
                      <span
                        className={`status-pill ${
                          del.status === 'Inspected - Accepted'
                            ? 'status-safe font-bold'
                            : del.status === 'Inspected - Rejected'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200 font-bold'
                            : del.status === 'Arrived'
                            ? 'bg-amber-50 text-amber-800 border border-amber-300 font-bold animate-pulse'
                            : 'status-warning'
                        }`}
                      >
                        {del.status === 'Arrived' ? 'Arrived (Inspection Required)' : del.status}
                      </span>
                    </td>

                    <td className="pr-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {del.status === 'Arrived' && onStartInspection && (
                          <button
                            onClick={() =>
                              onStartInspection({
                                deliveryNumber: del.businessDeliveryNumber,
                                componentCode: del.componentCode,
                                lotSize: del.actualQuantity || del.updatedQuantity,
                                lotReceivedDate: del.plannedDate,
                                lotReceivedTime: del.arrivalTime || '09:30',
                                vehicleRef: del.vehicleRef,
                              })
                            }
                            className="px-2 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold shadow-xs flex items-center gap-1"
                          >
                            <ShieldAlert className="w-3 h-3" />
                            <span>Start Inspection</span>
                          </button>
                        )}

                        {matchingInsp && (
                          <span className="text-[10px] text-slate-500 font-medium">
                            {matchingInsp.finalDecision === 'Accepted' ? '✅ AQL Accepted' : '❌ AQL Rejected'}
                          </span>
                        )}

                        {isProcurementOrAdmin && del.status === 'Planned' && (
                          <button
                            onClick={() => {
                              setEditDelivery(del);
                              setNewQty(del.updatedQuantity);
                              setAdjustReason(del.adjustmentReason || '');
                            }}
                            className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-blue-600 text-[11px] font-semibold border border-slate-200 transition-colors"
                          >
                            Adjust
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 5: Receive Delivery Input Modal */}
      {isReceiveOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="text-sm font-bold">Receive Supplier Delivery</h3>
                  <p className="text-[10px] text-slate-400">Record physical shipment arrival at the warehouse</p>
                </div>
              </div>
              <button
                onClick={() => setIsReceiveOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* If delivery was just saved, show Section 6: Inspection Required prompt */}
            {savedDeliveryJustNow ? (
              <div className="p-5 space-y-4">
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-700 mx-auto flex items-center justify-center">
                    <ShieldAlert className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-amber-900 text-sm">
                    🧪 Quality Inspection Required
                  </h4>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    Delivery <strong>{savedDeliveryJustNow.businessDeliveryNumber}</strong> ({savedDeliveryJustNow.actualQuantity} units of {savedDeliveryJustNow.componentCode}) has been safely recorded as <em>Arrived</em>.
                  </p>
                  <p className="text-[11px] text-slate-600 bg-white p-2 rounded border border-amber-200/60 font-medium">
                    ⚠️ Operational Rule: This quantity will <strong>NOT</strong> enter usable MRP inventory until quality inspection evaluates and accepts the lot.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-slate-50 rounded border border-slate-200">
                    <span className="text-[10px] text-slate-400 block">Delivery Ref</span>
                    <strong className="text-slate-800">{savedDeliveryJustNow.businessDeliveryNumber}</strong>
                  </div>
                  <div className="p-2 bg-slate-50 rounded border border-slate-200">
                    <span className="text-[10px] text-slate-400 block">Order Code</span>
                    <strong className="text-blue-700 font-mono">{savedDeliveryJustNow.orderCode || '—'}</strong>
                  </div>
                  <div className="p-2 bg-slate-50 rounded border border-slate-200">
                    <span className="text-[10px] text-slate-400 block">Component</span>
                    <strong className="text-slate-800">{savedDeliveryJustNow.componentCode}</strong>
                  </div>
                  <div className="p-2 bg-slate-50 rounded border border-slate-200">
                    <span className="text-[10px] text-slate-400 block">Arrived Units</span>
                    <strong className="text-emerald-700 value-mono font-black">+{savedDeliveryJustNow.actualQuantity}</strong>
                  </div>
                  <div className="p-2 bg-slate-50 rounded border border-slate-200">
                    <span className="text-[10px] text-slate-400 block">Condition</span>
                    <span className="text-slate-800 font-semibold">{savedDeliveryJustNow.deliveryCondition || 'Normal'}</span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded border border-slate-200">
                    <span className="text-[10px] text-slate-400 block">Received Date</span>
                    <span className="text-slate-800 font-mono font-semibold">{savedDeliveryJustNow.receivedDate || savedDeliveryJustNow.plannedDate}</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setIsReceiveOpen(false)}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900"
                  >
                    Close & Keep in Queue
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (onStartInspection) {
                        onStartInspection({
                          deliveryNumber: savedDeliveryJustNow.businessDeliveryNumber,
                          componentCode: savedDeliveryJustNow.componentCode,
                          lotSize: savedDeliveryJustNow.actualQuantity || savedDeliveryJustNow.updatedQuantity,
                          lotReceivedDate: savedDeliveryJustNow.plannedDate,
                          lotReceivedTime: savedDeliveryJustNow.arrivalTime || '09:20',
                          vehicleRef: savedDeliveryJustNow.vehicleRef,
                        });
                      }
                      setIsReceiveOpen(false);
                    }}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Start Lot Inspection Now</span>
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSaveReceivedDelivery} className="p-5 space-y-4 text-xs">
                {/* Order Code Select */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Order Code *
                  </label>
                  <select
                    value={selectedOrderCode}
                    onChange={(e) => handleSelectOrderCode(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-md px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500 font-mono"
                  >
                    {plannedOrderOptions.map((o) => (
                      <option key={o.orderCode} value={o.orderCode}>
                        {o.orderCode} — {o.componentCode} ({o.plannedQty} units planned on {o.date})
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Selects from planned supplier orders generated in Planned MRP.
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Component (auto)
                    </label>
                    <input
                      type="text"
                      disabled
                      value={`${receiveComp} - ${receiveComp === 'AA' ? 'Outer Tub' : receiveComp === 'BB' ? 'Inner Tub' : 'Ridgeform'}`}
                      className="w-full bg-slate-100 border border-slate-200 rounded-md px-2.5 py-1.5 text-xs text-slate-600 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Supplier (auto)
                    </label>
                    <input
                      type="text"
                      disabled
                      value={systemConfig.supplierName}
                      className="w-full bg-slate-100 border border-slate-200 rounded-md px-2.5 py-1.5 text-xs text-slate-600 font-medium truncate"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Planned Quantity (read only)
                    </label>
                    <input
                      type="text"
                      disabled
                      value={`${receivePlannedQty} units`}
                      className="w-full bg-slate-100 border border-slate-200 rounded-md px-2.5 py-1.5 text-xs text-slate-600 font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Planned Date (read only)
                    </label>
                    <input
                      type="text"
                      disabled
                      value={receivePlannedDate}
                      className="w-full bg-slate-100 border border-slate-200 rounded-md px-2.5 py-1.5 text-xs text-slate-600 font-mono"
                    />
                  </div>
                </div>

                <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-200 space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-emerald-950 mb-1">
                      Actual Quantity Arrived *
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={actualArrivedQty}
                      onChange={(e) => setActualArrivedQty(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full bg-white border border-emerald-300 rounded-md px-3 py-2 text-sm text-emerald-950 font-black text-center font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Section 19 Friendly Validation Warning */}
                  {isSignificantlyDifferent && (
                    <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-md text-amber-900 text-xs flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <span>
                        ⚠️ <strong>Confirmation Required:</strong> Arrived quantity (<strong>{actualArrivedQty}</strong>) is significantly different from the planned quantity of <strong>{receivePlannedQty}</strong>. Please verify the lorry delivery note.
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Received Date *
                      </label>
                      <input
                        type="date"
                        required
                        value={receiveDate}
                        onChange={(e) => setReceiveDate(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-xs text-slate-800 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Delivery Condition *
                      </label>
                      <select
                        value={deliveryCondition}
                        onChange={(e) => setDeliveryCondition(e.target.value as any)}
                        className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-xs text-slate-800 font-medium"
                      >
                        <option value="Normal">Normal</option>
                        <option value="Damaged cartons">Damaged cartons</option>
                        <option value="Missing items">Missing items</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Lorry / Vehicle No. *
                      </label>
                      <input
                        type="text"
                        required
                        value={lorryNo}
                        onChange={(e) => setLorryNo(e.target.value)}
                        placeholder="e.g. ABC-1234"
                        className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-xs text-slate-800 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Arrival Time *
                      </label>
                      <input
                        type="text"
                        required
                        value={arrivalTime}
                        onChange={(e) => setArrivalTime(e.target.value)}
                        placeholder="09:20 AM"
                        className="w-full bg-white border border-slate-300 rounded-md px-2.5 py-1.5 text-xs text-slate-800"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Receiving Notes
                  </label>
                  <input
                    type="text"
                    value={receiveNotes}
                    onChange={(e) => setReceiveNotes(e.target.value)}
                    placeholder="Bay number, seal integrity check, etc."
                    className="w-full bg-white border border-slate-200 rounded-md px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setIsReceiveOpen(false)}
                    className="px-3 py-1.5 rounded-md bg-slate-100 text-slate-700 text-xs font-medium hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Save Delivery & Stage for Inspection</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Adjust Quantity Modal */}
      {editDelivery && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
              <h3 className="font-bold text-slate-900 text-sm">
                Adjust Delivery: {editDelivery.businessDeliveryNumber}
              </h3>
              <button
                onClick={() => setEditDelivery(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAdjustment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Component & Date
                </label>
                <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded-md border border-slate-200">
                  <strong>{editDelivery.componentCode}</strong> • {editDelivery.plannedDate}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Updated Total Quantity *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={newQty}
                  onChange={(e) => setNewQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-900 font-bold focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Adjustment Reason *
                </label>
                <input
                  type="text"
                  required
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="e.g. Supplier lorry volume capacity limitation"
                  className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditDelivery(null)}
                  className="px-3 py-1.5 rounded-md bg-slate-100 text-slate-700 text-xs font-medium hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
                >
                  Save & Re-calculate Lorries
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Delivery Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
              <h3 className="font-bold text-slate-900 text-sm">
                Create Planned Supplier Delivery Order
              </h3>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateDelivery} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Component *
                </label>
                <select
                  value={newComp}
                  onChange={(e) => setNewComp(e.target.value as ComponentCode)}
                  className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500"
                >
                  <option value="AA">AA — Outer Tub (Max 300/lorry)</option>
                  <option value="BB">BB — Inner Tub (Max 160/lorry)</option>
                  <option value="CC">CC — Ridgeform (Max 560/lorry)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Planned Delivery Date *
                </label>
                <input
                  type="date"
                  required
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Planned Quantity (Units) *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={newPlannedQty}
                  onChange={(e) => setNewPlannedQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-900 font-bold focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Special instructions or delivery slot..."
                  className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-3 py-1.5 rounded-md bg-slate-100 text-slate-700 text-xs font-medium hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
                >
                  Generate Order & Allocate Lorries
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
