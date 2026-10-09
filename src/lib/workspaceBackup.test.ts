import { describe, expect, it } from 'vitest';
import { createWorkspaceBackup, serializeWorkspaceBackup } from './workspaceBackup';

describe('workspace backup export', () => {
  it('includes only the supplied account data and explicitly excludes media', () => {
    const backup = createWorkspaceBackup(
      { id: 'user-1', name: 'Alex Morgan', email: 'alex@example.test', role: 'user' },
      [{ id: 'INV-1', title: 'Image review' }],
      [{ id: 'RPT-1', type: 'image', data: { summary: 'Review' } }],
      '2026-10-09T12:00:00.000Z',
    );

    expect(backup).toEqual({
      application: 'ProofPixel AI',
      schemaVersion: 1,
      exportedAt: '2026-10-09T12:00:00.000Z',
      profile: { id: 'user-1', name: 'Alex Morgan', email: 'alex@example.test', role: 'user' },
      investigations: [{ id: 'INV-1', title: 'Image review' }],
      reports: [{ id: 'RPT-1', type: 'image', data: { summary: 'Review' } }],
      mediaIncluded: false,
    });
  });

  it('serializes a readable JSON file with a trailing newline', () => {
    const backup = createWorkspaceBackup(
      { id: 'user-1', name: 'Alex', email: 'alex@example.test', role: 'user' },
      [],
      [],
      '2026-10-09T12:00:00.000Z',
    );
    const serialized = serializeWorkspaceBackup(backup);

    expect(JSON.parse(serialized)).toEqual(backup);
    expect(serialized.endsWith('\n')).toBe(true);
  });
});
