import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_APP_BACKEND_URL,
  withCredentials: true,
});

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
        const refreshResponse = await api.post("/auth/refresh-token");
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
        originalRequest.withCredentials = true;
        
        processQueue(null);
        
        return api(originalRequest);
        
      } catch (refreshError) {
        processQueue(refreshError, null);
        
        console.error("❌ Token refresh failed:", refreshError);
        
        sessionStorage.removeItem("user");
        window.location.href = "/login";
        
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;