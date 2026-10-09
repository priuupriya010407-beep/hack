import { describe, expect, it } from 'vitest';
import { hashString, analyzeUrlValue, analyzeMessageText, analyzeSocialPost } from './logic.js';

describe('ProofPixel AI logic', () => {
  it('generates a stable SHA-256 hash', () => {
    expect(hashString('demo')).toBe('2a97516c354b68848cdbd8f54a226a0a55b21ed138e207ad6c5cbb9c00aa5aea');
  });

  it('flags suspicious URL structure', () => {
    const result = analyzeUrlValue('https://secure-paypal-verification.example.com/login');
    expect(result.https).toBe(true);
    expect(result.suspicious).toBe(true);
    expect(result.provider).toMatch(/structural|checks/i);
  });

  it('detects common phishing language patterns', () => {
    const result = analyzeMessageText('Your account is suspended immediately. Reset your password and OTP now.');
    expect(result.status).toBe('warning');
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('returns an explainable high-risk score and protective actions for a credential scam', () => {
    const result = analyzeSocialPost({
      text: 'URGENT: Instagram support says your account is suspended. Verify your password and OTP immediately.',
      url: 'http://instagram-security.example/login',
    });

    expect(result.level).toBe('high');
    expect(result.score).toBeGreaterThanOrEqual(60);
    expect(result.signals.map(({ category }) => category)).toContain('Credential theft');
    expect(result.recommendedActions).toContain('Do not enter passwords, OTPs, or recovery codes from this post.');
    expect(result.rescueSteps.map(({ id }) => id)).toContain('secure-account');
    expect(result.rescueSteps.map(({ id }) => id)).toContain('protect-contacts');
  });

  it('returns a low indicator score for a plain post without a link', () => {
    const result = analyzeSocialPost({ text: 'Had a nice walk in the park today.' });

    expect(result.level).toBe('low');
    expect(result.score).toBe(0);
    expect(result.signals).toEqual([]);
    expect(result.recommendedActions.length).toBeGreaterThan(0);
    expect(result.rescueSteps.map(({ id }) => id)).toContain('preserve-and-report');
  });

  it('rejects non-web links and empty social content', () => {
    expect(() => analyzeSocialPost({ text: '', url: '' })).toThrow(/required/i);
    expect(() => analyzeSocialPost({ url: 'javascript:alert(1)' })).toThrow(/http and https/i);
  });
});
