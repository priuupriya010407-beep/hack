export function getAuthToken() {
  return localStorage.getItem('proofpixel-token');
}

export function setAuthToken(token: string) {
  localStorage.setItem('proofpixel-token', token);
}

export function clearAuthToken() {
  localStorage.removeItem('proofpixel-token');
}

export function getHeaders() {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}
