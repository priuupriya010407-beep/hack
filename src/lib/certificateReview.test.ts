import { describe, expect, it } from 'vitest';
import { reviewCertificate } from './certificateReview';

describe('certificate warning review', () => {
  const completeText = 'ProofPixel Academy awarded to Alex Morgan a degree on October 9, 2026';

  it('flags an explicit demo or fake marker and never claims proof of authenticity', () => {
    const result = reviewCertificate(`DEMO SAMPLE NOT A REAL CREDENTIAL. ${completeText}`);

    expect(result.explicitDemoMarkers).toBe(true);
    expect(result.status).toMatch(/warning signs found/i);
    expect(result.warnings[0]).toMatch(/demo, sample/i);
    expect(result.status).toMatch(/authenticity not verified/i);
  });

  it('warns about missing fields and an insecure verification link', () => {
    const result = reviewCertificate('University award', 'http://issuer.example/verify');

    expect(result.missingFields).toContain('Recipient');
    expect(result.warnings).toContain('Verification link uses HTTP rather than encrypted HTTPS.');
    expect(result.urlAssessment).toMatch(/issuer was not contacted/i);
  });

  it('says not verified, even when no listed patterns are found', () => {
    const result = reviewCertificate(completeText, 'https://issuer.example/verify');

    expect(result.warnings).toEqual([]);
    expect(result.status).toBe('No listed warning signs found — authenticity not verified');
    expect(result.urlAssessment).toContain('issuer was not contacted');
  });

  it('recognizes institute as an issuer label', () => {
    expect(reviewCertificate('ProofPixel Demo Institute').foundFields).toContain('Issuer');
  });

  it('rejects non-web verification URL schemes', () => {
    expect(() => reviewCertificate(completeText, 'javascript:alert(1)')).toThrow(/http:\/\/ or https:\/\//i);
  });
});
