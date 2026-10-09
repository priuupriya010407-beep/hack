import { describe, expect, it } from 'vitest';
import { getInvestigationSeverity } from './investigationSeverity';

describe('getInvestigationSeverity', () => {
  it.each([
    ['high indicator level (78/100)', 'high'],
    ['Suspicious structure indicators', 'high'],
    ['warning', 'caution'],
    ['Warning signs found — manual review needed; authenticity not verified', 'caution'],
    ['Text fields need manual review', 'caution'],
    ['elevated indicator level (35/100)', 'caution'],
    ['Potential Manipulation Indicators', 'caution'],
    ['low indicator level (0/100)', 'none'],
    ['no-warning-signals', 'none'],
    ['No obvious structure indicator', 'none'],
    ['No Indicators Detected by Available Checks', 'none'],
    ['Three local frame diagnostics complete; no deepfake detector configured', 'unassessed'],
    ['Exact SHA-256 match', 'unassessed'],
    ['', 'unassessed'],
  ] as const)('classifies %s without claiming authenticity', (status, expected) => {
    expect(getInvestigationSeverity(status)).toBe(expected);
  });
});
