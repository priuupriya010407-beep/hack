export const demoInvestigations = [
  {
    id: 'INV-1024',
    title: 'Suspicious social post',
    scanType: 'image',
    status: 'completed',
    resultStatus: 'Potential Manipulation Indicators',
    createdAt: '2026-10-06T11:30:00Z',
    completedAt: '2026-10-06T11:45:00Z',
    notes: 'DEMO DATA — synthetic sample result',
  },
  {
    id: 'INV-1025',
    title: 'Certificate OCR review',
    scanType: 'certificate',
    status: 'completed',
    resultStatus: 'No Indicators Detected by Available Checks',
    createdAt: '2026-10-07T08:00:00Z',
    completedAt: '2026-10-07T08:23:00Z',
    notes: 'DEMO DATA — sample extracted fields only',
  },
  {
    id: 'INV-1026',
    title: 'Video frame analysis',
    scanType: 'video',
    status: 'processing',
    resultStatus: 'Inconclusive',
    createdAt: '2026-10-08T17:10:00Z',
    notes: 'DEMO DATA — analysis queued for demonstration',
  },
];

export const demoReports = [
  { title: 'Evidence Summary', id: 'RPT-4401', type: 'Image Report', generatedAt: '2026-10-08T12:15:00Z', status: 'Ready' },
  { title: 'Certificate Verification', id: 'RPT-4402', type: 'Certificate Report', generatedAt: '2026-10-07T08:25:00Z', status: 'Ready' },
];
