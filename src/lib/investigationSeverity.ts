export type InvestigationSeverity = 'high' | 'caution' | 'none' | 'unassessed';

export function getInvestigationSeverity(resultStatus?: string): InvestigationSeverity {
  const status = (resultStatus || '').toLowerCase();

  if (/\bhigh indicator level\b|\bsuspicious structure indicators\b/.test(status)) {
    return 'high';
  }
  if (/\blow indicator level\b|\bno-warning-signals\b|\bno obvious structure indicator\b|\bno indicators detected\b|\bno listed warning signs found\b/.test(status)) {
    return 'none';
  }
  if (/\belevated\b|\bpotential manipulation indicators\b|\bsome caution\b|\bwarning\b|\bmanual review needed\b|\bneed manual review\b/.test(status)) {
    return 'caution';
  }
  return 'unassessed';
}
