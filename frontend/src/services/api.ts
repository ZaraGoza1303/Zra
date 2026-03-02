// src/services/api.ts (updated with interceptor pattern)
import { API_BASE_URL, getRoomImageUrl, getUserImageUrl } from '../config';

// Re-export helper functions untuk kemudahan
export { getRoomImageUrl, getUserImageUrl };

// Token refresh state
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

const subscribeTokenRefresh = (cb: (token: string) => void) => {
    refreshSubscribers.push(cb);
};

const onRefreshed = (token: string) => {
    refreshSubscribers.forEach(cb => cb(token));
    refreshSubscribers = [];
};

export const getAuthHeaders = (): HeadersInit => {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
};

export const getAuthHeadersFormData = (): HeadersInit => {
    const token = localStorage.getItem('token');
    return {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
};

// Fungsi untuk refresh token
const refreshToken = async (): Promise<string | null> => {
    try {
        const userStr = localStorage.getItem('user');
        if (!userStr) return null;

        const user = JSON.parse(userStr);
        if (!user.refresh_token) return null;

        const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refresh_token: user.refresh_token }),
        });

        const data = await response.json();

        if (!response.ok || !data.data) {
            throw new Error(data.message || 'Refresh failed');
        }

        // Update token di localStorage
        const newToken = data.data.access_token;
        const newRefreshToken = data.data.refresh_token;

        const updatedUser = {
            ...user,
            refresh_token: newRefreshToken
        };

        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(updatedUser));

        return newToken;
    } catch (error) {
        console.error('Token refresh failed:', error);
        // If refresh fails, clear auth data
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('lastRefreshed');
        return null;
    }
};

// Enhanced API call dengan auto-refresh on 401
export const apiCall = async <T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> => {
    const maxRetries = 1;
    let retryCount = 0;

    const makeRequest = async (): Promise<T> => {
        try {
            const defaultHeaders = getAuthHeaders();
            const headers = options.body instanceof FormData
                ? getAuthHeadersFormData()
                : { ...defaultHeaders, ...options.headers };

            const res = await fetch(`${API_BASE_URL}${endpoint}`, {
                ...options,
                headers,
            });

            // Handle 401 Unauthorized - token might be expired
            if (res.status === 401 && retryCount < maxRetries) {
                retryCount++;

                // If already refreshing, wait for new token
                if (isRefreshing) {
                    const newToken = await new Promise<string>((resolve) => {
                        subscribeTokenRefresh((token) => {
                            resolve(token);
                        });
                    });

                    // Retry with new token
                    const newHeaders = {
                        ...headers,
                        Authorization: `Bearer ${newToken}`,
                    };

                    const retryRes = await fetch(`${API_BASE_URL}${endpoint}`, {
                        ...options,
                        headers: newHeaders,
                    });

                    const retryData = await retryRes.json();

                    if (!retryRes.ok) {
                        const error = new Error(retryData.message || 'API request failed');
                        (error as any).status = retryRes.status;
                        (error as any).data = retryData.data;
                        (error as any).fullResponse = retryData;
                        throw error;
                    }

                    return retryData;
                }

                // Start refresh process
                isRefreshing = true;

                try {
                    const newToken = await refreshToken();

                    if (!newToken) {
                        throw new Error('Token refresh failed');
                    }

                    onRefreshed(newToken);

                    // Retry with new token
                    const newHeaders = {
                        ...headers,
                        Authorization: `Bearer ${newToken}`,
                    };

                    const retryRes = await fetch(`${API_BASE_URL}${endpoint}`, {
                        ...options,
                        headers: newHeaders,
                    });

                    const retryData = await retryRes.json();

                    if (!retryRes.ok) {
                        const error = new Error(retryData.message || 'API request failed');
                        (error as any).status = retryRes.status;
                        (error as any).data = retryData.data;
                        (error as any).fullResponse = retryData;
                        throw error;
                    }

                    return retryData;
                } catch (refreshError) {
                    console.error('Token refresh failed in apiCall:', refreshError);
                    // Clear auth state and redirect to login
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    window.location.href = '/login';
                    throw new Error('Session expired. Please login again.');
                } finally {
                    isRefreshing = false;
                }
            }

            const data = await res.json();

            if (!res.ok) {
                const error = new Error(data.message || 'API request failed');
                (error as any).status = res.status;
                (error as any).data = data.data;
                (error as any).fullResponse = data;
                throw error;
            }

            return data;
        } catch (error: any) {
            if (error.message && error.data) {
                throw error;
            }
            throw new Error(error.message || 'Network error');
        }
    };

    return makeRequest();
};