// The local profile session is a username, not an API credential. Only send
// a structurally valid server-issued access token to protected API routes.
export function getAccessToken() {
    const token = localStorage.getItem('fintrack_jwt_access');
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length !== 3 || parts.some(part => !part || !/^[A-Za-z0-9_-]+$/.test(part))) {
        localStorage.removeItem('fintrack_jwt_access');
        return null;
    }
    return token;
}

export function getAuthHeaders() {
    const token = getAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
}
