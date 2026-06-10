import axios from "axios";
import { useAuthStore } from "../store/authStore";


const API_BASE_URL =
   "https://pedagogically-sensationless-lanell.ngrok-free.dev";


const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "ngrok-skip-browser-warning": "true",
  },
});


const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "ngrok-skip-browser-warning": "true",
  },
});


api.interceptors.request.use((config) => {
  if (window.accessToken) {
    config.headers.Authorization = `Bearer ${window.accessToken}`;
  }
  return config;
});


let isRefreshing = false;
let failedQueue = [];


const processQueue = (error, token = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(token);
    }
  });

  failedQueue = [];
};


// ── 401 Token-refresh interceptor (MUST be registered first) ─────────────────
// When the access token expires the backend returns 401. This interceptor
// transparently calls /api/auth/refresh (which reads the httpOnly refresh-token
// cookie) to get a new access token, then retries every queued request.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Only handle 401s and only if we haven't already retried this request
    if (error?.response?.status !== 401 || originalRequest?._retry) {
      return Promise.reject(error);
    }

    // If the refresh call itself returned 401, don't loop — give up
    if (originalRequest?.url?.includes("/api/auth/refresh")) {
      window.accessToken = null;
      return Promise.reject(error);
    }

    // If another request is already refreshing, queue this one
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const refreshResponse = await refreshClient.post("/api/auth/refresh");

      const newAccessToken = refreshResponse.data.data.accessToken;
      window.accessToken = newAccessToken;

      processQueue(null, newAccessToken);

      // Retry the original failed request with the fresh token
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      window.accessToken = null;
      useAuthStore.getState().clearAuth();

      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }

      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);


// ── Sales-session guard interceptor ──────────────────────────────────────────
// The backend middleware returns 409 when a session-gated action (create order,
// KOT, payment) is attempted without an open session. We intercept that here
// and redirect to /open-sales so every page doesn't have to handle it.
// Registered AFTER the 401 interceptor so token refresh happens first.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const message = error?.response?.data?.message || "";

    if (
      status === 409 &&
      message.toLowerCase().includes("sales session is not opened")
    ) {
      if (window.location.pathname !== "/open-sales") {
        window.location.href = "/open-sales";
      }
      return Promise.reject(error);
    }

    return Promise.reject(error);
  },
);


export default api;