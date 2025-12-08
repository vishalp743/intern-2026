// client/src/services/api.js
import axios from 'axios';

// 🚨 CHANGE THIS LINE TO YOUR DEPLOYED BACKEND URL
// Example: https://intern-portal-api.onrender.com/api
// Note: Keep the '/api' prefix if your Express server uses it in its routing structure.
const BACKEND_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api'; 


const api = axios.create({
  baseURL: BACKEND_URL, 
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
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      console.log('Session expired or unauthorized. Logging out.');
      localStorage.removeItem('token');
      if (window.location.pathname !== '/') {
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

export default api;