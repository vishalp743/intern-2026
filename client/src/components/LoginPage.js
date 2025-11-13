import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './LoginPage.css';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post('/auth/login', { email, password });

      // Store token in localStorage for later use
      localStorage.setItem('token', data.token);

      if (data.user.role === 'Admin') {
        navigate('/admin');
      } else if (data.user.role === 'Tutor') {
        navigate('/tutor');
      } else {
        alert('Unknown user role.');
      }
    } catch (error) {
      console.error('Login failed', error.response?.data || error.message);
      alert('Login failed: ' + (error.response?.data?.msg || 'Server Error'));
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2 className="login-title">Welcome Back</h2>
        <p className="login-subtitle">Please log in to your account</p>
        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={email}
              onChange={(e) => setEmail(e.target.value)}
              required placeholder="Enter your email" />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" value={password}
              onChange={(e) => setPassword(e.target.value)}
              required placeholder="Enter your password" />
          </div>
          <button type="submit" className="login-button">Login</button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
