export type ScanType = 'image' | 'video' | 'certificate' | 'message' | 'url' | 'file';

export type InvestigationStatus = 'queued' | 'processing' | 'completed' | 'failed';
export type AnalysisResultStatus = 'Potential Manipulation Indicators' | 'No Indicators Detected by Available Checks' | 'Inconclusive' | 'Analysis Failed' | 'AI Detector Not Configured';

export type Investigation = {
  id: string;
  title: string;
  scanType: ScanType;
  status: InvestigationStatus;
  resultStatus?: AnalysisResultStatus;
  createdAt: string;
  completedAt?: string;
  notes?: string;
};

export type UserProfile = {
  name: string;
  email: string;
  role: 'user' | 'admin';
};

export type ReportSummary = {
  title: string;
  id: string;
  type: string;
  generatedAt: string;
  status: string;
};
