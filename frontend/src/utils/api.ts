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
        const baseUrl = window.location.origin;
        console.log('🌐 [API] Using production relative URL:', baseUrl);
        return baseUrl;
    }

    // Default to local development URL
    const localUrl = 'http://localhost:5001';
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

// Response interceptor to handle auth errors
api.interceptors.response.use(
    (response: AxiosResponse) => {
        return response;
    },
    (error) => {
        if (error.response?.status === 401) {
            // Clear invalid token
            localStorage.removeItem('access_token');
            localStorage.removeItem('user');
            // Redirect to login only if not already on login page
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
