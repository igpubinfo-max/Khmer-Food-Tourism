/** The signed-in user's id for server-side quotas (Edge Functions). Never throws; null when nobody is signed in. */
export function getApiUserId(): string | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem('kft_current_user_v5') || localStorage.getItem('kft_current_user_v4');
    if (!raw) return null;
    const u = JSON.parse(raw);
    const id = typeof u?.id === 'string' ? u.id.trim() : '';
    return /^[A-Za-z0-9_.@:+-]{3,128}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}
