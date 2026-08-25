import axios from "axios";

const resolvedBaseUrl = import.meta.env.VITE_API_BASE_URL || "/api/v1";

export const apiClient = axios.create({
  baseURL: resolvedBaseUrl,
  timeout: 10000,
});

apiClient.interceptors.request.use((config) => {
  const token = window.localStorage.getItem("asidenote.access_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach((promise) => {
    if (error || !token) {
      promise.reject(error ?? new Error("Token refresh failed: no token returned."));
    } else {
      promise.resolve(token);
    }
  });
  failedQueue = [];
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/")
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(apiClient(originalRequest));
            },
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = window.localStorage.getItem("asidenote.refresh_token");

      if (!refreshToken) {
        isRefreshing = false;
        window.localStorage.removeItem("asidenote.access_token");
        window.localStorage.removeItem("asidenote.refresh_token");
        window.location.href = "/login";
        return Promise.reject(error);
      }

      try {
        const { data } = await apiClient.post("/auth/refresh", { refreshToken });
        const newToken = data.token as string;
        const newRefreshToken = data.refreshToken as string;

        window.localStorage.setItem("asidenote.access_token", newToken);
        window.localStorage.setItem("asidenote.refresh_token", newRefreshToken);

        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        processQueue(null, newToken);

        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        window.localStorage.removeItem("asidenote.access_token");
        window.localStorage.removeItem("asidenote.refresh_token");
        window.location.href = "/login";
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);
