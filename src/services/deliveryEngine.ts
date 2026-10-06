import {
  ComponentCode,
  ComponentConfig,
  DeliveryRecord,
  LorrySplit,
  UrgentReplenishmentRecord,
} from '../types';

export function splitLorries(
  quantity: number,
  componentConfig: ComponentConfig
): LorrySplit[] {
  const max = componentConfig.maxDeliveryQty;
  if (quantity <= max) {
    return [{ lorryNumber: 1, quantity }];
  }

  // Split into multiple lorries
  const numLorries = Math.ceil(quantity / max);
  const baseQty = Math.floor(quantity / numLorries);
  const remainder = quantity % numLorries;

  const splits: LorrySplit[] = [];
  for (let i = 0; i < numLorries; i++) {
    splits.push({
      lorryNumber: i + 1,
      quantity: baseQty + (i < remainder ? 1 : 0),
    });
  }

  return splits;
}

export function generateNextDeliveryNumber(
  existingDeliveries: DeliveryRecord[],
  isReplacement: boolean = false,
  originalFamilyNumber?: string
): { businessDeliveryNumber: string; deliveryFamilyNumber: string; replacementSequence: number } {
  if (isReplacement && originalFamilyNumber) {
    // Find highest replacement sequence for this family
    const familyMembers = existingDeliveries.filter(
      (d) => d.deliveryFamilyNumber === originalFamilyNumber
    );
    const maxSeq = familyMembers.reduce((max, d) => Math.max(max, d.replacementSequence), 0);
    const nextSeq = maxSeq + 1;
    return {
      businessDeliveryNumber: `${originalFamilyNumber}-R${nextSeq}`,
      deliveryFamilyNumber: originalFamilyNumber,
      replacementSequence: nextSeq,
    };
  }

  // Standard sequential delivery number
  const numbers = existingDeliveries
    .map((d) => {
      const match = d.deliveryFamilyNumber.match(/DEL-(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter((n) => !isNaN(n));

  const nextNum = (numbers.length > 0 ? Math.max(...numbers) : 0) + 1;
  const code = `DEL-${String(nextNum).padStart(3, '0')}`;

  return {
    businessDeliveryNumber: code,
    deliveryFamilyNumber: code,
    replacementSequence: 0,
  };
}

export function calculateLorryCount(quantity: number, maxCapacity: number): number {
  if (quantity <= 0 || !maxCapacity) return 0;
  return Math.ceil(quantity / maxCapacity);
}

export function calculateTargetDate(requestDateStr: string, leadDays: number = 2): string {
  const d = new Date(requestDateStr);
  d.setDate(d.getDate() + leadDays);
  return d.toISOString().split('T')[0];
}
