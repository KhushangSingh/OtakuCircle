/**
 * Authentication and Token Management Utilities
 * Safely parses, validates JWT expiration, and synchronizes auth state across tabs and components.
 */

/**
 * Safely decodes a JWT payload without external dependencies and checks its expiration timestamp.
 * Returns true if token is missing, malformed, or expired.
 */
export const isTokenExpired = (token) => {
    if (!token || typeof token !== 'string') return true;
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return true;
        
        // Base64Url to Base64
        const base64Url = parts[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        
        // Safely decode UTF-8 string
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        
        const decoded = JSON.parse(jsonPayload);
        if (!decoded || typeof decoded.exp !== 'number') return false;
        
        // Return true if expired or expiring within 5 seconds
        return Date.now() >= (decoded.exp * 1000 - 5000);
    } catch {
        return true;
    }
};

/**
 * Clears stored credentials and emits an auth-change event across the app.
 */
export const clearAuth = () => {
    const hadAuth = !!localStorage.getItem('token') || !!localStorage.getItem('username');
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('userId');
    localStorage.removeItem('user');
    
    if (hadAuth) {
        window.dispatchEvent(new CustomEvent('auth-change', { detail: { isAuthenticated: false } }));
    }
};

/**
 * Retrieves the currently stored token, automatically purging it if expired.
 * Returns the valid token string or null.
 */
export const getValidToken = () => {
    const token = localStorage.getItem('token');
    if (!token) return null;
    
    if (isTokenExpired(token)) {
        clearAuth();
        return null;
    }
    
    return token;
};

/**
 * Saves authenticated user credentials to localStorage and notifies active listeners.
 */
export const setAuth = (token, username, extra = {}) => {
    if (token) localStorage.setItem('token', token);
    if (username) localStorage.setItem('username', username);
    
    Object.entries(extra).forEach(([key, val]) => {
        if (val !== undefined && val !== null) {
            localStorage.setItem(key, typeof val === 'object' ? JSON.stringify(val) : String(val));
        }
    });
    
    window.dispatchEvent(new CustomEvent('auth-change', { 
        detail: { isAuthenticated: true, username, token } 
    }));
};

/**
 * Configures an Axios response interceptor that automatically purges credentials
 * and synchronizes logout state whenever a protected request returns HTTP 401 Unauthorized.
 */
export const setupAuthInterceptor = (axiosInstance) => {
    if (!axiosInstance || !axiosInstance.interceptors) return;
    
    axiosInstance.interceptors.response.use(
        (response) => response,
        (error) => {
            if (error.response && error.response.status === 401) {
                // If an authenticated request failed with 401, purge stale credentials
                const hadToken = !!localStorage.getItem('token');
                if (hadToken) {
                    clearAuth();
                }
            }
            return Promise.reject(error);
        }
    );
};

