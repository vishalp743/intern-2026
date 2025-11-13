// client/src/services/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api', // your backend base URL
});

// Attach token to every request automatically
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token'); // read from localStorage
    if (token) {
      config.headers.Authorization = `Bearer ${token}`; // add to header
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
