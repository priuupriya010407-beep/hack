import { describe, expect, it } from 'vitest';
import { investigationsToCsv } from './historyExport';

describe('investigation CSV export', () => {
  it('includes every investigation field and correctly escapes CSV content', () => {
    expect(investigationsToCsv([{
      id: 'INV-1',
      title: 'Image review, "sample"',
      scanType: 'image',
      status: 'completed',
      resultStatus: 'No detector configured',
      createdAt: '2026-10-09T10:00:00.000Z',
      notes: 'first line\nsecond line',
    }])).toBe([
      '"id","title","scan type","status","result","created at","notes"',
      '"INV-1","Image review, ""sample""","image","completed","No detector configured","2026-10-09T10:00:00.000Z","first line\nsecond line"',
    ].join('\r\n'));
  });

  it('exports a header when the user has no investigations', () => {
    expect(investigationsToCsv([])).toBe('"id","title","scan type","status","result","created at","notes"');
  });

  it.each(['=1+1', '+SUM(A1:A2)', '-1+2', '@SUM(A1:A2)', ' \t=1+1'])(
    'neutralizes spreadsheet formula values starting with %s',
    (title) => {
      const csv = investigationsToCsv([{
        id: 'INV-1',
        title,
        scanType: 'image',
        status: 'completed',
      }]);
      expect(csv).toContain(`"'${title}"`);
    },
  );
});
