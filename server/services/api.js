// client/src/services/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api', // note: includes /api
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// REQUEST Interceptor: Add auth token to every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
}, err => Promise.reject(err));


// RESPONSE Interceptor: Handle 401 errors (e.g., token expired)
api.interceptors.response.use(
  (response) => {
    // Any status code that lie within the range of 2xx cause this function to trigger
    return response;
  },
  (error) => {
    // Any status codes that falls outside the range of 2xx cause this function to trigger
    if (error.response && error.response.status === 401) {
      // 401 Unauthorized: Token is invalid or expired
      console.log('Session expired or unauthorized. Logging out.');
      
      // Clear the invalid token from storage
      localStorage.removeItem('token');
      
      // Redirect to login page
      // We use window.location to force a full page reload and clear any state.
      if (window.location.pathname !== '/') {
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

export default api;