// client/src/services/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api', // note: includes /api
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// add auth header if token present (optional)
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
}, err => Promise.reject(err));

export default api;
