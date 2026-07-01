import axios, { AxiosResponse } from 'axios';

// Environment-based API configuration
const getApiBaseUrl = () => {
    // Check for environment variable or use local development URL
    const envUrl = (import.meta as any).env?.VITE_API_BASE_URL;
    if (envUrl) {
        console.log('🌐 [API] Using API URL from environment:', envUrl);
        return envUrl;
    }

    // Check if we're in production (deployed on VM)
    const isProduction = window.location.hostname === '13.60.212.110' ||
        window.location.hostname.includes('13.60.212.110');

    if (isProduction) {
        // Use relative path for production deployment
        const baseUrl = window.location.origin + '/api';
        console.log('🌐 [API] Using production relative URL:', baseUrl);
        return baseUrl;
    }

    // Default to local development URL
    const localUrl = 'http://localhost:5001/api';
    console.log('🌐 [API] Using default local API URL:', localUrl);
    return localUrl;
};

// Create axios instance with default configuration
const api = axios.create({
    baseURL: getApiBaseUrl(),
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 60000, // 60 second timeout - increased for AI generation
});

// Request interceptor to add auth token
api.interceptors.request.use(
    (config) => {
        // Fix inconsistent /api prefixes across the app
        if (config.url && config.url.startsWith('/api/')) {
            config.url = config.url.substring(4); // Remove the extra /api since baseURL provides it
        }

        const token = localStorage.getItem('access_token');

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

// Response interceptor to handle auth errors and token refresh
api.interceptors.response.use(
    (response: AxiosResponse) => {
        return response;
    },
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry && originalRequest.url !== '/auth/login' && originalRequest.url !== '/auth/refresh') {
            
            if (isRefreshing) {
                return new Promise(function(resolve, reject) {
                    failedQueue.push({resolve, reject});
                }).then(token => {
                    originalRequest.headers.Authorization = 'Bearer ' + token;
                    return api(originalRequest);
                }).catch(err => {
                    return Promise.reject(err);
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                // Call refresh endpoint. Cookies are included automatically due to withCredentials
                const res = await axios.post(getApiBaseUrl() + '/auth/refresh', {}, {
                    withCredentials: true
                });

                if (res.data.success) {
                    const newToken = res.data.access_token;
                    localStorage.setItem('access_token', newToken);

                    api.defaults.headers.common['Authorization'] = 'Bearer ' + newToken;
                    originalRequest.headers.Authorization = 'Bearer ' + newToken;

                    processQueue(null, newToken);

                    return api(originalRequest);
                }
            } catch (refreshError) {
                processQueue(refreshError, null);
                
                // Refresh failed, clear session and redirect to login
                localStorage.removeItem('access_token');
                localStorage.removeItem('user');
                if (window.location.pathname !== '/login') {
                    window.location.href = '/login';
                }
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        // Handle normal 401s (e.g. login failed)
        if (error.response?.status === 401 && originalRequest.url !== '/auth/refresh' && !originalRequest._retry) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('user');
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        
        return Promise.reject(error);
    }
);

export default api;
