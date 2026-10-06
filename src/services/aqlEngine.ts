import { AQLValue, SamplingMethod } from '../types';

export interface CodeLetterRange {
  min: number;
  max: number;
  letter: string;
}

export const CODE_LETTER_RANGES: CodeLetterRange[] = [
  { min: 2, max: 8, letter: 'A' },
  { min: 9, max: 15, letter: 'B' },
  { min: 16, max: 25, letter: 'C' },
  { min: 26, max: 50, letter: 'D' },
  { min: 51, max: 90, letter: 'E' },
  { min: 91, max: 150, letter: 'F' },
  { min: 151, max: 280, letter: 'G' },
  { min: 281, max: 500, letter: 'H' },
  { min: 501, max: 1200, letter: 'J' },
  { min: 1201, max: 3200, letter: 'K' },
  { min: 3201, max: 10000, letter: 'L' },
  { min: 10001, max: 35000, letter: 'M' },
  { min: 35001, max: 150000, letter: 'N' },
  { min: 150001, max: 500000, letter: 'P' },
  { min: 500001, max: Infinity, letter: 'Q' },
];

export function getCodeLetter(lotSize: number): string {
  if (lotSize < 2) return 'A';
  const found = CODE_LETTER_RANGES.find((r) => lotSize >= r.min && lotSize <= r.max);
  return found ? found.letter : 'Q';
}

export interface SinglePlanRecord {
  sampleSize: number;
  ac: number;
  re: number;
  is100Percent: boolean;
  effectiveCodeLetter: string;
}

// ANSI/ASQ Z1.4 Table II-A - Single Normal Sampling Plans
// Exact resolution following arrows for each letter and AQL
const SINGLE_SAMPLING_TABLE: Record<string, Record<AQLValue, { sampleSize: number; ac: number; re: number; letter: string }>> = {
  A: {
    1.0: { sampleSize: 32, ac: 1, re: 2, letter: 'G' }, // arrow down to G
    1.5: { sampleSize: 20, ac: 1, re: 2, letter: 'F' }, // arrow down to F
    2.5: { sampleSize: 13, ac: 1, re: 2, letter: 'E' }, // arrow down to E
    4.0: { sampleSize: 8, ac: 1, re: 2, letter: 'D' },  // arrow down to D
    6.5: { sampleSize: 5, ac: 1, re: 2, letter: 'C' },  // arrow down to C
  },
  B: {
    1.0: { sampleSize: 32, ac: 1, re: 2, letter: 'G' },
    1.5: { sampleSize: 20, ac: 1, re: 2, letter: 'F' },
    2.5: { sampleSize: 13, ac: 1, re: 2, letter: 'E' },
    4.0: { sampleSize: 8, ac: 1, re: 2, letter: 'D' },
    6.5: { sampleSize: 5, ac: 1, re: 2, letter: 'C' },
  },
  C: {
    1.0: { sampleSize: 32, ac: 1, re: 2, letter: 'G' },
    1.5: { sampleSize: 20, ac: 1, re: 2, letter: 'F' },
    2.5: { sampleSize: 13, ac: 1, re: 2, letter: 'E' },
    4.0: { sampleSize: 8, ac: 1, re: 2, letter: 'D' },
    6.5: { sampleSize: 5, ac: 1, re: 2, letter: 'C' },
  },
  D: {
    1.0: { sampleSize: 32, ac: 1, re: 2, letter: 'G' },
    1.5: { sampleSize: 20, ac: 1, re: 2, letter: 'F' },
    2.5: { sampleSize: 13, ac: 1, re: 2, letter: 'E' },
    4.0: { sampleSize: 8, ac: 1, re: 2, letter: 'D' },
    6.5: { sampleSize: 8, ac: 1, re: 2, letter: 'D' },
  },
  E: {
    1.0: { sampleSize: 32, ac: 1, re: 2, letter: 'G' },
    1.5: { sampleSize: 20, ac: 1, re: 2, letter: 'F' },
    2.5: { sampleSize: 13, ac: 1, re: 2, letter: 'E' },
    4.0: { sampleSize: 13, ac: 1, re: 2, letter: 'E' },
    6.5: { sampleSize: 13, ac: 2, re: 3, letter: 'E' },
  },
  F: {
    1.0: { sampleSize: 32, ac: 1, re: 2, letter: 'G' },
    1.5: { sampleSize: 20, ac: 1, re: 2, letter: 'F' },
    2.5: { sampleSize: 20, ac: 1, re: 2, letter: 'F' },
    4.0: { sampleSize: 20, ac: 2, re: 3, letter: 'F' },
    6.5: { sampleSize: 20, ac: 3, re: 4, letter: 'F' },
  },
  G: {
    1.0: { sampleSize: 32, ac: 1, re: 2, letter: 'G' },
    1.5: { sampleSize: 32, ac: 1, re: 2, letter: 'G' },
    2.5: { sampleSize: 32, ac: 2, re: 3, letter: 'G' },
    4.0: { sampleSize: 32, ac: 3, re: 4, letter: 'G' },
    6.5: { sampleSize: 32, ac: 5, re: 6, letter: 'G' },
  },
  H: {
    1.0: { sampleSize: 50, ac: 1, re: 2, letter: 'H' },
    1.5: { sampleSize: 50, ac: 2, re: 3, letter: 'H' },
    2.5: { sampleSize: 50, ac: 3, re: 4, letter: 'H' },
    4.0: { sampleSize: 50, ac: 5, re: 6, letter: 'H' },
    6.5: { sampleSize: 50, ac: 7, re: 8, letter: 'H' },
  },
  J: {
    1.0: { sampleSize: 80, ac: 2, re: 3, letter: 'J' },
    1.5: { sampleSize: 80, ac: 3, re: 4, letter: 'J' },
    2.5: { sampleSize: 80, ac: 5, re: 6, letter: 'J' },
    4.0: { sampleSize: 80, ac: 7, re: 8, letter: 'J' },
    6.5: { sampleSize: 80, ac: 10, re: 11, letter: 'J' },
  },
  K: {
    1.0: { sampleSize: 125, ac: 3, re: 4, letter: 'K' },
    1.5: { sampleSize: 125, ac: 5, re: 6, letter: 'K' },
    2.5: { sampleSize: 125, ac: 7, re: 8, letter: 'K' },
    4.0: { sampleSize: 125, ac: 10, re: 11, letter: 'K' },
    6.5: { sampleSize: 125, ac: 14, re: 15, letter: 'K' },
  },
  L: {
    1.0: { sampleSize: 200, ac: 5, re: 6, letter: 'L' },
    1.5: { sampleSize: 200, ac: 7, re: 8, letter: 'L' },
    2.5: { sampleSize: 200, ac: 10, re: 11, letter: 'L' },
    4.0: { sampleSize: 200, ac: 14, re: 15, letter: 'L' },
    6.5: { sampleSize: 200, ac: 21, re: 22, letter: 'L' },
  },
  M: {
    1.0: { sampleSize: 315, ac: 7, re: 8, letter: 'M' },
    1.5: { sampleSize: 315, ac: 10, re: 11, letter: 'M' },
    2.5: { sampleSize: 315, ac: 14, re: 15, letter: 'M' },
    4.0: { sampleSize: 315, ac: 21, re: 22, letter: 'M' },
    6.5: { sampleSize: 315, ac: 21, re: 22, letter: 'M' }, // arrow up
  },
  N: {
    1.0: { sampleSize: 500, ac: 10, re: 11, letter: 'N' },
    1.5: { sampleSize: 500, ac: 14, re: 15, letter: 'N' },
    2.5: { sampleSize: 500, ac: 21, re: 22, letter: 'N' },
    4.0: { sampleSize: 500, ac: 21, re: 22, letter: 'N' },
    6.5: { sampleSize: 500, ac: 21, re: 22, letter: 'N' },
  },
  P: {
    1.0: { sampleSize: 800, ac: 14, re: 15, letter: 'P' },
    1.5: { sampleSize: 800, ac: 21, re: 22, letter: 'P' },
    2.5: { sampleSize: 500, ac: 21, re: 22, letter: 'N' }, // arrow up to N
    4.0: { sampleSize: 500, ac: 21, re: 22, letter: 'N' },
    6.5: { sampleSize: 500, ac: 21, re: 22, letter: 'N' },
  },
  Q: {
    1.0: { sampleSize: 1250, ac: 21, re: 22, letter: 'Q' },
    1.5: { sampleSize: 800, ac: 21, re: 22, letter: 'P' }, // arrow up to P
    2.5: { sampleSize: 500, ac: 21, re: 22, letter: 'N' }, // arrow up to N
    4.0: { sampleSize: 500, ac: 21, re: 22, letter: 'N' },
    6.5: { sampleSize: 500, ac: 21, re: 22, letter: 'N' },
  },
};

export function getSingleSamplingPlan(lotSize: number, aql: AQLValue): SinglePlanRecord {
  const codeLetter = getCodeLetter(lotSize);
  const plan = SINGLE_SAMPLING_TABLE[codeLetter]?.[aql] || SINGLE_SAMPLING_TABLE['H'][2.5];

  // If sample size equals or exceeds lot size, perform 100% inspection
  if (plan.sampleSize >= lotSize) {
    return {
      sampleSize: lotSize,
      ac: plan.ac,
      re: plan.re,
      is100Percent: true,
      effectiveCodeLetter: plan.letter,
    };
  }

  return {
    sampleSize: plan.sampleSize,
    ac: plan.ac,
    re: plan.re,
    is100Percent: false,
    effectiveCodeLetter: plan.letter,
  };
}

export interface DoublePlanRecord {
  stage1: {
    sampleSize: number;
    ac: number;
    re: number;
  };
  stage2: {
    sampleSize: number;
    cumulativeSampleSize: number;
    ac: number;
    re: number;
  };
  effectiveCodeLetter: string;
  is100Percent: boolean;
}

// ANSI/ASQ Z1.4 Table III-A - Double Normal Sampling Plans
// Exact values for AQL 1.0, 1.5, 2.5, 4.0, 6.5
interface DoublePlanEntry {
  n1: number;
  n2: number;
  cumN: number;
  ac1: number;
  re1: number;
  ac2: number;
  re2: number;
  letter: string;
}

const DOUBLE_SAMPLING_TABLE: Record<string, Record<AQLValue, DoublePlanEntry>> = {
  A: {
    1.0: { n1: 20, n2: 20, cumN: 40, ac1: 0, re1: 2, ac2: 1, re2: 2, letter: 'G' }, // arrow down
    1.5: { n1: 13, n2: 13, cumN: 26, ac1: 0, re1: 2, ac2: 1, re2: 2, letter: 'F' }, // arrow down
    2.5: { n1: 8, n2: 8, cumN: 16, ac1: 0, re1: 2, ac2: 1, re2: 2, letter: 'E' },   // arrow down
    4.0: { n1: 5, n2: 5, cumN: 10, ac1: 0, re1: 2, ac2: 1, re2: 2, letter: 'D' },   // arrow down
    6.5: { n1: 3, n2: 3, cumN: 6, ac1: 0, re1: 2, ac2: 1, re2: 2, letter: 'C' },    // arrow down
  },
  B: {
    1.0: { n1: 20, n2: 20, cumN: 40, ac1: 0, re1: 2, ac2: 1, re2: 2, letter: 'G' },
    1.5: { n1: 13, n2: 13, cumN: 26, ac1: 0, re1: 2, ac2: 1, re2: 2, letter: 'F' },
    2.5: { n1: 8, n2: 8, cumN: 16, ac1: 0, re1: 2, ac2: 1, re2: 2, letter: 'E' },
    4.0: { n1: 5, n2: 5, cumN: 10, ac1: 0, re1: 2, ac2: 1, re2: 2, letter: 'D' },
    6.5: { n1: 3, n2: 3, cumN: 6, ac1: 0, re1: 2, ac2: 1, re2: 2, letter: 'C' },
  },
  C: {
    1.0: { n1: 20, n2: 20, cumN: 40, ac1: 0, re1: 2, ac2: 1, re2: 2, letter: 'G' },
    1.5: { n1: 13, n2: 13, cumN: 26, ac1: 0, re1: 2, ac2: 1, re2: 2, letter: 'F' },
    2.5: { n1: 8, n2: 8, cumN: 16, ac1: 0, re1: 2, ac2: 1, re2: 2, letter: 'E' },
    4.0: { n1: 5, n2: 5, cumN: 10, ac1: 0, re1: 2, ac2: 1, re2: 2, letter: 'D' },
    6.5: { n1: 3, n2: 3, cumN: 6, ac1: 0, re1: 2, ac2: 1, re2: 2, letter: 'C' },
  },
  D: {
    1.0: { n1: 20, n2: 20, cumN: 40, ac1: 0, re1: 2, ac2: 1, re2: 2, letter: 'G' },
    1.5: { n1: 13, n2: 13, cumN: 26, ac1: 0, re1: 2, ac2: 1, re2: 2, letter: 'F' },
    2.5: { n1: 8, n2: 8, cumN: 16, ac1: 0, re1: 2, ac2: 1, re2: 2, letter: 'E' },
    4.0: { n1: 5, n2: 5, cumN: 10, ac1: 0, re1: 2, ac2: 1, re2: 2, letter: 'D' },
    6.5: { n1: 5, n2: 5, cumN: 10, ac1: 0, re1: 3, ac2: 3, re2: 4, letter: 'D' },
  },
  E: {
    1.0: { n1: 20, n2: 20, cumN: 40, ac1: 0, re1: 2, ac2: 1, re2: 2, letter: 'G' },
    1.5: { n1: 13, n2: 13, cumN: 26, ac1: 0, re1: 2, ac2: 1, re2: 2, letter: 'F' },
    2.5: { n1: 8, n2: 8, cumN: 16, ac1: 0, re1: 2, ac2: 1, re2: 2, letter: 'E' },
    4.0: { n1: 8, n2: 8, cumN: 16, ac1: 0, re1: 3, ac2: 3, re2: 4, letter: 'E' },
    6.5: { n1: 8, n2: 8, cumN: 16, ac1: 1, re1: 4, ac2: 4, re2: 5, letter: 'E' },
  },
  F: {
    1.0: { n1: 20, n2: 20, cumN: 40, ac1: 0, re1: 2, ac2: 1, re2: 2, letter: 'G' },
    1.5: { n1: 13, n2: 13, cumN: 26, ac1: 0, re1: 2, ac2: 1, re2: 2, letter: 'F' },
    2.5: { n1: 13, n2: 13, cumN: 26, ac1: 0, re1: 3, ac2: 3, re2: 4, letter: 'F' },
    4.0: { n1: 13, n2: 13, cumN: 26, ac1: 1, re1: 4, ac2: 4, re2: 5, letter: 'F' },
    6.5: { n1: 13, n2: 13, cumN: 26, ac1: 2, re1: 5, ac2: 6, re2: 7, letter: 'F' },
  },
  G: {
    1.0: { n1: 20, n2: 20, cumN: 40, ac1: 0, re1: 2, ac2: 1, re2: 2, letter: 'G' },
    1.5: { n1: 20, n2: 20, cumN: 40, ac1: 0, re1: 3, ac2: 3, re2: 4, letter: 'G' },
    2.5: { n1: 20, n2: 20, cumN: 40, ac1: 1, re1: 4, ac2: 4, re2: 5, letter: 'G' },
    4.0: { n1: 20, n2: 20, cumN: 40, ac1: 2, re1: 5, ac2: 6, re2: 7, letter: 'G' },
    6.5: { n1: 20, n2: 20, cumN: 40, ac1: 3, re1: 7, ac2: 8, re2: 9, letter: 'G' },
  },
  H: {
    1.0: { n1: 32, n2: 32, cumN: 64, ac1: 0, re1: 3, ac2: 3, re2: 4, letter: 'H' },
    1.5: { n1: 32, n2: 32, cumN: 64, ac1: 1, re1: 4, ac2: 4, re2: 5, letter: 'H' },
    2.5: { n1: 32, n2: 32, cumN: 64, ac1: 2, re1: 5, ac2: 6, re2: 7, letter: 'H' },
    4.0: { n1: 32, n2: 32, cumN: 64, ac1: 3, re1: 7, ac2: 8, re2: 9, letter: 'H' },
    6.5: { n1: 32, n2: 32, cumN: 64, ac1: 5, re1: 9, ac2: 12, re2: 13, letter: 'H' },
  },
  J: {
    1.0: { n1: 50, n2: 50, cumN: 100, ac1: 1, re1: 4, ac2: 4, re2: 5, letter: 'J' },
    1.5: { n1: 50, n2: 50, cumN: 100, ac1: 2, re1: 5, ac2: 6, re2: 7, letter: 'J' },
    2.5: { n1: 50, n2: 50, cumN: 100, ac1: 3, re1: 7, ac2: 8, re2: 9, letter: 'J' },
    4.0: { n1: 50, n2: 50, cumN: 100, ac1: 5, re1: 9, ac2: 12, re2: 13, letter: 'J' },
    6.5: { n1: 50, n2: 50, cumN: 100, ac1: 7, re1: 11, ac2: 18, re2: 19, letter: 'J' },
  },
  K: {
    1.0: { n1: 80, n2: 80, cumN: 160, ac1: 2, re1: 5, ac2: 6, re2: 7, letter: 'K' },
    1.5: { n1: 80, n2: 80, cumN: 160, ac1: 3, re1: 7, ac2: 8, re2: 9, letter: 'K' },
    2.5: { n1: 80, n2: 80, cumN: 160, ac1: 5, re1: 9, ac2: 12, re2: 13, letter: 'K' },
    4.0: { n1: 80, n2: 80, cumN: 160, ac1: 7, re1: 11, ac2: 18, re2: 19, letter: 'K' },
    6.5: { n1: 80, n2: 80, cumN: 160, ac1: 11, re1: 16, ac2: 26, re2: 27, letter: 'K' },
  },
  L: {
    1.0: { n1: 125, n2: 125, cumN: 250, ac1: 3, re1: 7, ac2: 8, re2: 9, letter: 'L' },
    1.5: { n1: 125, n2: 125, cumN: 250, ac1: 5, re1: 9, ac2: 12, re2: 13, letter: 'L' },
    2.5: { n1: 125, n2: 125, cumN: 250, ac1: 7, re1: 11, ac2: 18, re2: 19, letter: 'L' },
    4.0: { n1: 125, n2: 125, cumN: 250, ac1: 11, re1: 16, ac2: 26, re2: 27, letter: 'L' },
    6.5: { n1: 125, n2: 125, cumN: 250, ac1: 11, re1: 16, ac2: 26, re2: 27, letter: 'L' },
  },
  M: {
    1.0: { n1: 200, n2: 200, cumN: 400, ac1: 5, re1: 9, ac2: 12, re2: 13, letter: 'M' },
    1.5: { n1: 200, n2: 200, cumN: 400, ac1: 7, re1: 11, ac2: 18, re2: 19, letter: 'M' },
    2.5: { n1: 200, n2: 200, cumN: 400, ac1: 11, re1: 16, ac2: 26, re2: 27, letter: 'M' },
    4.0: { n1: 200, n2: 200, cumN: 400, ac1: 11, re1: 16, ac2: 26, re2: 27, letter: 'M' },
    6.5: { n1: 200, n2: 200, cumN: 400, ac1: 11, re1: 16, ac2: 26, re2: 27, letter: 'M' },
  },
  N: {
    1.0: { n1: 315, n2: 315, cumN: 630, ac1: 7, re1: 11, ac2: 18, re2: 19, letter: 'N' },
    1.5: { n1: 315, n2: 315, cumN: 630, ac1: 11, re1: 16, ac2: 26, re2: 27, letter: 'N' },
    2.5: { n1: 315, n2: 315, cumN: 630, ac1: 11, re1: 16, ac2: 26, re2: 27, letter: 'N' },
    4.0: { n1: 315, n2: 315, cumN: 630, ac1: 11, re1: 16, ac2: 26, re2: 27, letter: 'N' },
    6.5: { n1: 315, n2: 315, cumN: 630, ac1: 11, re1: 16, ac2: 26, re2: 27, letter: 'N' },
  },
  P: {
    1.0: { n1: 500, n2: 500, cumN: 1000, ac1: 11, re1: 16, ac2: 26, re2: 27, letter: 'P' },
    1.5: { n1: 500, n2: 500, cumN: 1000, ac1: 11, re1: 16, ac2: 26, re2: 27, letter: 'P' },
    2.5: { n1: 315, n2: 315, cumN: 630, ac1: 11, re1: 16, ac2: 26, re2: 27, letter: 'N' },
    4.0: { n1: 315, n2: 315, cumN: 630, ac1: 11, re1: 16, ac2: 26, re2: 27, letter: 'N' },
    6.5: { n1: 315, n2: 315, cumN: 630, ac1: 11, re1: 16, ac2: 26, re2: 27, letter: 'N' },
  },
  Q: {
    1.0: { n1: 500, n2: 500, cumN: 1000, ac1: 11, re1: 16, ac2: 26, re2: 27, letter: 'P' },
    1.5: { n1: 500, n2: 500, cumN: 1000, ac1: 11, re1: 16, ac2: 26, re2: 27, letter: 'P' },
    2.5: { n1: 315, n2: 315, cumN: 630, ac1: 11, re1: 16, ac2: 26, re2: 27, letter: 'N' },
    4.0: { n1: 315, n2: 315, cumN: 630, ac1: 11, re1: 16, ac2: 26, re2: 27, letter: 'N' },
    6.5: { n1: 315, n2: 315, cumN: 630, ac1: 11, re1: 16, ac2: 26, re2: 27, letter: 'N' },
  },
};

export function getDoubleSamplingPlan(lotSize: number, aql: AQLValue): DoublePlanRecord {
  const codeLetter = getCodeLetter(lotSize);
  const entry = DOUBLE_SAMPLING_TABLE[codeLetter]?.[aql] || DOUBLE_SAMPLING_TABLE['H'][2.5];

  const is100Percent = entry.cumN >= lotSize;

  return {
    stage1: {
      sampleSize: is100Percent ? Math.min(entry.n1, Math.floor(lotSize / 2) || 1) : entry.n1,
      ac: entry.ac1,
      re: entry.re1,
    },
    stage2: {
      sampleSize: is100Percent ? Math.max(lotSize - entry.n1, 1) : entry.n2,
      cumulativeSampleSize: is100Percent ? lotSize : entry.cumN,
      ac: entry.ac2,
      re: entry.re2,
    },
    effectiveCodeLetter: entry.letter,
    is100Percent,
  };
}

export function evaluateSingleInspection(defects: number, ac: number, re: number): 'Accepted' | 'Rejected' {
  if (defects <= ac) return 'Accepted';
  if (defects >= re) return 'Rejected';
  // Standard boundary fallback (if between ac and re, which is standard re=ac+1 in single)
  return defects > ac ? 'Rejected' : 'Accepted';
}

export function evaluateDoubleStage1(
  defectsStage1: number,
  ac1: number,
  re1: number
): 'Accepted' | 'Rejected' | 'Second Sample Required' {
  if (defectsStage1 <= ac1) return 'Accepted';
  if (defectsStage1 >= re1) return 'Rejected';
  return 'Second Sample Required';
}

export function evaluateDoubleStage2(
  defectsStage1: number,
  defectsStage2: number,
  ac2: number,
  re2: number
): 'Accepted' | 'Rejected' {
  const cumulativeDefects = defectsStage1 + defectsStage2;
  if (cumulativeDefects <= ac2) return 'Accepted';
  return 'Rejected';
}
