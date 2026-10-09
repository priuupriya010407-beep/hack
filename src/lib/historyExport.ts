export type HistoryExportItem = {
  id: string;
  title: string;
  scanType: string;
  status: string;
  resultStatus?: string;
  createdAt?: string;
  notes?: string;
};

function escapeCsvValue(value: string) {
  const safeValue = /^[\s\u0000-\u001f]*[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${safeValue.replaceAll('"', '""')}"`;
}

export function investigationsToCsv(items: HistoryExportItem[]) {
  const header = ['id', 'title', 'scan type', 'status', 'result', 'created at', 'notes'];
  const rows = items.map((item) => [
    item.id,
    item.title,
    item.scanType,
    item.status,
    item.resultStatus || '',
    item.createdAt || '',
    item.notes || '',
  ]);

  return [header, ...rows]
    .map((row) => row.map(escapeCsvValue).join(','))
    .join('\r\n');
}
