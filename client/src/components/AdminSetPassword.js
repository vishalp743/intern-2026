import React, { useState } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

const AdminSetPassword = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState(null);
  const navigate = useNavigate();

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      return;
    }

    try {
      await api.put('/users/admin/password', { newPassword });
      setMessage({ type: 'success', text: 'Password encrypted and updated successfully!' });
      setTimeout(() => navigate('/admin'), 2000);
    } catch (error) {
      const errorMsg = error.response?.data?.msg || error.response?.data?.errors?.[0]?.msg || 'Error updating password';
      setMessage({ type: 'error', text: errorMsg });
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '80px auto', padding: '30px', background: '#fff', borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.1)', fontFamily: 'Segoe UI' }}>
      <h2 style={{ color: '#131313', textAlign: 'center', marginBottom: '10px' }}>Secure Admin Password</h2>
      <p style={{ color: '#555', fontSize: '14px', textAlign: 'center', marginBottom: '30px' }}>
        Set a new encrypted password for your account.
      </p>

      {message && (
        <div style={{ 
          padding: '12px', 
          marginBottom: '20px', 
          borderRadius: '4px', 
          backgroundColor: message.type === 'success' ? '#e8f5e9' : '#ffebee',
          color: message.type === 'success' ? '#27ae60' : '#c62828',
          textAlign: 'center'
        }}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleUpdate}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#131313' }}>New Password</label>
          <input 
            type="password" 
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ marginBottom: '25px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#131313' }}>Confirm Password</label>
          <input 
            type="password" 
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
          />
        </div>
        <button 
          type="submit" 
          style={{ width: '100%', padding: '12px', background: '#005FB3', color: 'white', border: 'none', borderRadius: '4px', fontWeight: '600', cursor: 'pointer', transition: '0.2s' }}
        >
          Update & Encrypt Password
        </button>
      </form>
    </div>
  );
};

export default AdminSetPassword;