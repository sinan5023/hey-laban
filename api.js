// import axios from "axios";
// import { useAuthStore } from "../store/authStore";

// const API_BASE_URL =
//   "http://localhost:8000";

// const api = axios.create({
//   baseURL: API_BASE_URL,
//   withCredentials: true,
//   headers: {
//     "ngrok-skip-browser-warning": "true",
//   },
// });

// const refreshClient = axios.create({
//   baseURL: API_BASE_URL,
//   withCredentials: true,
//   headers: {
//     "ngrok-skip-browser-warning": "true",
//   },
// });

// api.interceptors.request.use((config) => {
//   if (window.accessToken) {
//     config.headers.Authorization = `Bearer ${window.accessToken}`;
//   }
//   return config;
// });

// let isRefreshing = false;
// let failedQueue = [];

// const processQueue = (error, token = null) => {
//   failedQueue.forEach((promise) => {
//     if (error) {
//       promise.reject(error);
//     } else {
//       promise.resolve(token);
//     }
//   });

//   failedQueue = [];
// };

// api.interceptors.response.use(
//   (response) => response,
//   async (error) => {
//     const originalRequest = error.config;

//     if (error?.response?.status !== 401 || originalRequest?._retry) {
//       return Promise.reject(error);
//     }

//     if (originalRequest?.url?.includes("/api/auth/refresh")) {
//       window.accessToken = null;
//       return Promise.reject(error);
//     }

//     if (isRefreshing) {
//       return new Promise((resolve, reject) => {
//         failedQueue.push({ resolve, reject });
//       }).then((token) => {
//         originalRequest.headers.Authorization = `Bearer ${token}`;
//         return api(originalRequest);
//       });
//     }

//     originalRequest._retry = true;
//     isRefreshing = true;

//     try {
//       const refreshResponse = await refreshClient.post("/api/auth/refresh", {});

//       const newAccessToken = refreshResponse.data.data.accessToken;
//       window.accessToken = newAccessToken;

//       processQueue(null, newAccessToken);

//       originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
//       return api(originalRequest);
//     } catch (refreshError) {
//       processQueue(refreshError, null);
//       window.accessToken = null;
//       useAuthStore.getState().clearAuth();

//       if (window.location.pathname !== "/login") {
//         window.location.href = "/login";
//       }

//       return Promise.reject(refreshError);
//     } finally {
//       isRefreshing = false;
//     }
//   },
// );

// export default api;

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


// ── Sales-session guard interceptor ──────────────────────────────────────────
// The backend middleware returns 409 when a session-gated action (create order,
// KOT, payment) is attempted without an open session. We intercept that here
// and redirect to /open-sales so every page doesn't have to handle it.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const message = error?.response?.data?.message || "";

    if (
      status === 409 &&
      message.toLowerCase().includes("sales session is not opened")
    ) {
      // Only redirect if not already on the open-sales page
      if (window.location.pathname !== "/open-sales") {
        window.location.href = "/open-sales";
      }
      return Promise.reject(error);
    }

    return Promise.reject(error);
  },
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;


    if (error?.response?.status !== 401 || originalRequest?._retry) {
      return Promise.reject(error);
    }


    if (originalRequest?.url?.includes("/api/auth/refresh")) {
      window.accessToken = null;
      return Promise.reject(error);
    }


    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token};`
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


      originalRequest.headers.Authorization = `Bearer ${newAccessToken};`
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


export default api;