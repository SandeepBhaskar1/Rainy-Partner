import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_APP_BACKEND_URL,
  withCredentials: true,
});

// FIX: Prevent multiple simultaneous refresh attempts using a queue system
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      
      // FIX: Queue subsequent requests while token is being refreshed
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => api(originalRequest))
          .catch(err => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // FIX: Wait for refresh response and ensure cookies are set
        const refreshResponse = await api.post("/auth/refresh-token");
        
        // FIX: Small delay to ensure browser processes the Set-Cookie headers
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // FIX: Explicitly ensure withCredentials is set for the retry
        originalRequest.withCredentials = true;
        
        // FIX: Process all queued requests after successful refresh
        processQueue(null);
        
        return api(originalRequest);
        
      } catch (refreshError) {
        // FIX: Clear queue on refresh failure
        processQueue(refreshError, null);
        
        console.error("❌ Token refresh failed:", refreshError);
        
        sessionStorage.removeItem("user");
        window.location.href = "/login";
        
        return Promise.reject(refreshError);
      } finally {
        // FIX: Reset refresh flag after completion
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;