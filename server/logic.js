import { createHash } from 'node:crypto';

export function hashString(value) {
  if (!value || typeof value !== 'string') {
    throw new Error('Value is required.');
  }
  return createHash('sha256').update(value).digest('hex');
}

export function analyzeUrlValue(url) {
  const parsed = new URL(url);
  const hostname = parsed.hostname;
  const hasHttps = parsed.protocol === 'https:';
  const suspicious = /[0-9]{1,3}(\.[0-9]{1,3}){3}/.test(hostname)
    || hostname.includes('xn--')
    || hostname.includes('paypal-security')
    || hostname.includes('verify')
    || hostname.includes('secure-paypal')
    || hostname.includes('login');

  return {
    hostname,
    https: hasHttps,
    structuralChecksOnly: true,
    suspicious,
    warnings: suspicious ? ['Possible lookalike domain pattern'] : ['No obvious structural signal detected'],
    provider: process.env.URL_THREAT_PROVIDER || 'structural-checks-only',
    note: 'ProofPixel AI assists with digital authenticity investigation. Automated analysis provides indicators, not definitive proof.',
  };
}

export function analyzeMessageText(text) {
  if (!text || typeof text !== 'string') {
    throw new Error('Message text is required.');
  }

  const warnings = [];
  const lower = text.toLowerCase();
  if (lower.includes('urgent') || lower.includes('immediately')) warnings.push('Urgency pressure detected');
  if (lower.includes('otp') || lower.includes('password')) warnings.push('Credentials requested');
  if (lower.includes('payment') || lower.includes('wire')) warnings.push('Payment instruction identified');
  if (lower.includes('suspended') || lower.includes('blocked')) warnings.push('Threat-based language present');
  if (lower.includes('claim') || lower.includes('winner')) warnings.push('Prize or reward claim detected');

  return {
    status: warnings.length ? 'warning' : 'no-warning-signals',
    warnings,
    summary: warnings.length ? 'Basic rule-based checks found suspicious patterns.' : 'No obvious rule-based red flags detected.',
    mode: 'rule-based-checks',
  };
}

export function analyzeSocialPost({ text = '', url = '' } = {}) {
  if (typeof text !== 'string' || typeof url !== 'string') {
    throw new Error('Post text and URL must be strings.');
  }
  if (!text.trim() && !url.trim()) {
    throw new Error('Post text or a URL is required.');
  }
  if (text.length > 10000 || url.length > 2048) {
    throw new Error('Post text must be at most 10,000 characters and URL at most 2,048 characters.');
  }

  const signals = [];
  const addSignal = (label, category, weight) => signals.push({ label, category, weight });
  const lower = text.toLowerCase();
  const includesAny = (terms) => terms.some((term) => lower.includes(term));

  if (includesAny(['urgent', 'immediately', 'act now', 'expires today', 'within 24 hours'])) {
    addSignal('Urgency or time pressure', 'Pressure tactics', 16);
  }
  if (includesAny(['password', 'one-time code', 'verification code', 'otp', '2fa code', 'login details'])) {
    addSignal('Requests a password or verification code', 'Credential theft', 28);
  }
  if (includesAny(['wire transfer', 'send money', 'gift card', 'crypto wallet', 'pay a fee', 'payment'])) {
    addSignal('Payment, transfer, or gift card request', 'Financial request', 24);
  }
  if (includesAny(['you won', 'claim your prize', 'giveaway winner', 'claim reward', 'free prize'])) {
    addSignal('Prize or giveaway claim', 'Reward lure', 16);
  }
  if (includesAny(['account suspended', 'account will be closed', 'permanently disabled', 'account blocked'])) {
    addSignal('Threat of account suspension or closure', 'Threat tactics', 15);
  }
  if (includesAny(['instagram support', 'facebook support', 'meta support', 'official instagram', 'official facebook'])
    && includesAny(['verify', 'password', 'code', 'click', 'appeal'])) {
    addSignal('Possible platform-support impersonation', 'Impersonation', 24);
  }

  let parsedUrl = null;
  if (url.trim()) {
    try {
      parsedUrl = new URL(url.trim());
    } catch {
      throw new Error('Enter a valid link beginning with http:// or https://.');
    }
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('Only http and https links can be checked.');
    }

    const hostname = parsedUrl.hostname.toLowerCase();
    if (parsedUrl.protocol === 'http:') addSignal('Link does not use HTTPS', 'Link security', 10);
    if (hostname.includes('xn--')) addSignal('Link uses an encoded internationalized domain', 'Deceptive domain', 22);
    if (/^(?:\d{1,3}\.){3}\d{1,3}$/.test(hostname)) addSignal('Link points directly to an IP address', 'Deceptive domain', 22);
    if (/\b(bit\.ly|tinyurl\.com|t\.co|goo\.gl|ow\.ly|is\.gd)$/i.test(hostname)) {
      addSignal('Shortened link hides its final destination', 'Hidden destination', 14);
    }
    if (/(instagram|facebook|meta|paypal|bank|support|verify|secure)/i.test(parsedUrl.pathname)
      && !/(^|\.)((instagram|facebook|meta)\.com)$/i.test(hostname)) {
      addSignal('Social or account-security wording on a non-official host', 'Lookalike link', 20);
    }
    if (parsedUrl.username || parsedUrl.password) addSignal('Link contains a misleading embedded username', 'Deceptive domain', 20);
  }

  const score = Math.min(100, signals.reduce((total, signal) => total + signal.weight, 0));
  const level = score >= 60 ? 'high' : score >= 30 ? 'elevated' : 'low';
  const recommendedActions = [];
  if (signals.some((signal) => signal.category === 'Credential theft')) {
    recommendedActions.push('Do not enter passwords, OTPs, or recovery codes from this post.');
  }
  if (signals.some((signal) => signal.category === 'Financial request' || signal.category === 'Reward lure')) {
    recommendedActions.push('Do not send money or pay a fee; verify the offer through an independently found official channel.');
  }
  if (parsedUrl && signals.some((signal) => ['Deceptive domain', 'Lookalike link', 'Hidden destination', 'Link security'].includes(signal.category))) {
    recommendedActions.push('Do not open the link; navigate to the official site or app yourself instead.');
  }
  if (signals.some((signal) => signal.category === 'Impersonation' || signal.category === 'Threat tactics')) {
    recommendedActions.push('Contact the platform through its official app or help center—not by replying to this message.');
  }
  if (!recommendedActions.length) {
    recommendedActions.push('No listed scam pattern was detected; verify the source independently before acting.');
  }

  const categories = new Set(signals.map(({ category }) => category));
  const rescueSteps = [
    {
      id: 'stop-contact',
      title: 'Pause contact and avoid links or attachments',
      detail: 'Do not reply, share a verification code, or follow links from the post. Open the service through its official app or a website you type yourself.',
      priority: 1,
    },
    ...(categories.has('Credential theft') ? [{
      id: 'secure-account',
      title: 'Secure accounts if you shared sign-in information',
      detail: 'From the official site or app, change the affected password (and any reused passwords), sign out other sessions, and turn on two-step verification.',
      priority: 1,
    }] : []),
    ...(categories.has('Financial request') || categories.has('Reward lure') ? [{
      id: 'contact-financial-provider',
      title: 'Contact your bank or payment provider if you sent money',
      detail: 'Use the number on your card or the provider’s official app. Ask whether the payment can be stopped, disputed, or monitored.',
      priority: 1,
    }] : []),
    {
      id: 'preserve-and-report',
      title: 'Save evidence and report the post',
      detail: 'Keep screenshots of the post, profile, and time. Report and block the account using the platform’s own reporting tools.',
      priority: 2,
    },
    ...(categories.has('Credential theft') || categories.has('Financial request') ? [{
      id: 'protect-contacts',
      title: 'Warn people who may receive the same message',
      detail: 'Tell affected contacts through another trusted channel not to open the link or act on the message.',
      priority: 2,
    }] : []),
  ];

  return {
    score,
    level,
    signals: signals.map(({ label, category }) => ({ label, category })),
    recommendedActions,
    rescueSteps,
    checks: ['Urgency and pressure tactics', 'Credential, payment, reward, and impersonation language', ...(parsedUrl ? ['Link protocol and common deceptive-domain patterns'] : [])],
    mode: 'transparent-rule-based-heuristics',
    limitation: 'This score reflects listed patterns only. It cannot verify identity, post context, account ownership, or whether a claim is true. A low score does not prove safety.',
    hostname: parsedUrl?.hostname || null,
  };
}
