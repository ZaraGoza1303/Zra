// src/services/api.ts
import { API_BASE_URL } from "../config";
import { getRoomImageUrl, getUserImageUrl } from "../utils/imageUtils";
import type { SocialLink, User } from "../types/chat";

// Re-export helper functions untuk kemudahan
export { getRoomImageUrl, getUserImageUrl };

// Token refresh state
let refreshPromise: Promise<string | null> | null = null;

import { useAuthStore } from "../store/authStore";



export const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const getAuthHeadersFormData = (): HeadersInit => {
  const token = localStorage.getItem("token");
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

// Fungsi untuk refresh token dengan mutex untuk mencegah race condition
export const refreshToken = async (): Promise<string | null> => {
  // If already refreshing, return the existing promise (mutex)
  if (refreshPromise) {
    return refreshPromise;
  }

  // Start new refresh process
  refreshPromise = (async (): Promise<string | null> => {
    try {
      const userStr = localStorage.getItem("user");
      if (!userStr) return null;

      const user = JSON.parse(userStr);
      if (!user.refresh_token) return null;

      console.log("🔄 Attempting to refresh token...");
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refresh_token: user.refresh_token }),
      });

      const data = await response.json();

      if (!response.ok || !data.data) {
        console.error("❌ Refresh failed response:", response.status, data);
        throw new Error(data.message || "Refresh failed");
      }

      console.log("✅ Token refreshed successfully");

      // Update token di localStorage
      const newToken = data.data.access_token;
      const newRefreshToken = data.data.refresh_token;

      const updatedUser = {
        ...user,
        refresh_token: newRefreshToken,
      };

      localStorage.setItem("token", newToken);
      localStorage.setItem("user", JSON.stringify(updatedUser));

      // Update Zustand store to avoid stale state in components/WebSocket
      useAuthStore.getState().setAuthData(newToken, updatedUser, new Date());

      return newToken;
    } catch (error) {
      console.error("Token refresh failed:", error);
      return null;
    } finally {
      // Always reset the promise so next call can refresh again
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

// Enhanced API call dengan auto-refresh on 401
export const apiCall = async <T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> => {
  let retried = false;

  const makeRequest = async (): Promise<T> => {
    try {
      const defaultHeaders = getAuthHeaders();
      const headers =
        options.body instanceof FormData
          ? getAuthHeadersFormData()
          : { ...defaultHeaders, ...options.headers };

      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });

      // Handle 401 Unauthorized - token might be expired
      if (res.status === 401 && !retried) {
        retried = true;

        // Gunakan mutex refreshToken (sudah handle concurrent calls)
        const newToken = await refreshToken();

        if (!newToken) {
          // Refresh gagal → logout dan redirect
          console.error("Token refresh failed in apiCall, logging out...");
          useAuthStore.getState().logoutState();
          window.location.href = "/login";
          throw new Error("Session expired. Please login again.");
        }

        // Retry request dengan token baru
        const newHeaders =
          options.body instanceof FormData
            ? { Authorization: `Bearer ${newToken}` }
            : { ...defaultHeaders, ...options.headers, Authorization: `Bearer ${newToken}` };

        const retryRes = await fetch(`${API_BASE_URL}${endpoint}`, {
          ...options,
          headers: newHeaders,
        });

        const retryData = await retryRes.json();

        if (!retryRes.ok) {
          const error = new Error(retryData.message || "API request failed");
          (error as any).status = retryRes.status;
          (error as any).data = retryData.data;
          (error as any).fullResponse = retryData;
          throw error;
        }

        return retryData;
      }

      const data = await res.json();

      if (!res.ok) {
        const error = new Error(data.message || "API request failed");
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
      throw new Error(error.message || "Network error");
    }
  };

  return makeRequest();
};

export const getUserById = (userId: number) =>
  apiCall<{ data: User }>(`/user/${userId}`, { method: 'GET' });

export const getSocialLinks = () => 
  apiCall<{ data: SocialLink[] }>('/user/social-links', { method: 'GET' });

export const createSocialLinks = (links: { type: string; url: string }[]) =>
  apiCall('/user/social-links', {
    method: 'POST',
    body: JSON.stringify({ link: links }),
    headers: { 'Content-Type': 'application/json' },
  });

export const updateSocialLink = (linkId: number, data: { type?: string; url?: string }) =>
  apiCall(`/user/social-link/${linkId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
    headers: { 'Content-Type': 'application/json' },
  });

export const deleteSocialLink = (linkId: number) =>
  apiCall(`/user/social-link/${linkId}`, { method: 'DELETE' });

export const getBlockedUsers = () =>
  apiCall<{ data: { id: number }[] }>('/user/blocked-list', { method: 'GET' });
