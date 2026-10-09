const certificateFields = [
  { label: 'Issuer', pattern: /\b(issuer|institution|institute|academy|university|school|organization)\b/i },
  { label: 'Recipient', pattern: /\b(candidate|recipient|awarded to|name)\b/i },
  { label: 'Qualification', pattern: /\b(qualification|certificate|degree|course|diploma|award)\b/i },
  { label: 'Date', pattern: /\b\d{1,4}[/-]\d{1,2}[/-]\d{1,4}\b|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2},?\s+\d{4}\b/i },
];

export function reviewCertificate(text: string, verificationUrl = '') {
  const foundFields = certificateFields
    .filter(({ pattern }) => pattern.test(text))
    .map(({ label }) => label);
  const missingFields = certificateFields
    .filter(({ pattern }) => !pattern.test(text))
    .map(({ label }) => label);
  const explicitDemoMarkers = /\b(demo|sample|specimen|template|fake|forgery|void)\b|not\s+a\s+real|for\s+ocr\s+testing\s+only/i.test(text);
  const warnings: string[] = [];

  if (explicitDemoMarkers) {
    warnings.push('Text contains a demo, sample, template, fake, void, or test-only marker.');
  }
  if (missingFields.length) {
    warnings.push(`Missing or unreadable field patterns: ${missingFields.join(', ')}.`);
  }

  let urlAssessment = 'No verification URL provided; the issuer has not been checked.';
  if (verificationUrl) {
    const parsedUrl = new URL(verificationUrl);
    if (!['https:', 'http:'].includes(parsedUrl.protocol)) {
      throw new Error('Verification URL must use http:// or https://.');
    }
    if (parsedUrl.protocol === 'http:') {
      warnings.push('Verification link uses HTTP rather than encrypted HTTPS.');
    }
    urlAssessment = `${parsedUrl.protocol === 'https:' ? 'HTTPS' : 'HTTP'} URL format found (${parsedUrl.hostname}); the issuer was not contacted.`;
  }

  return {
    foundFields,
    missingFields,
    warnings,
    explicitDemoMarkers,
    urlAssessment,
    status: warnings.length ? 'Warning signs found — manual review needed; authenticity not verified' : 'No listed warning signs found — authenticity not verified',
  };
}
