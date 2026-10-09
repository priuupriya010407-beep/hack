export type WorkspaceBackup = {
  application: string;
  schemaVersion: 1;
  exportedAt: string;
  profile: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  investigations: unknown[];
  reports: unknown[];
  mediaIncluded: false;
};

export function createWorkspaceBackup(
  profile: WorkspaceBackup['profile'],
  investigations: unknown[],
  reports: unknown[],
  exportedAt = new Date().toISOString(),
): WorkspaceBackup {
  return {
    application: 'ProofPixel AI',
    schemaVersion: 1,
    exportedAt,
    profile,
    investigations,
    reports,
    mediaIncluded: false,
  };
}

export function serializeWorkspaceBackup(backup: WorkspaceBackup) {
  return `${JSON.stringify(backup, null, 2)}\n`;
}
