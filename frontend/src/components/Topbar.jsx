// Topbar.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Topbar.css';

const Topbar = ({ userName, onLogout }) => {
  const navigate = useNavigate();
  
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    
    if (onLogout) onLogout();
    
    navigate('/login');
    
    alert('You have been logged out successfully.');
  };
  
  const getInitial = () => {
    return userName ? userName.charAt(0).toUpperCase() : '';
  };
  
  return (
    <div className="topbar">
      <div className="topbar-content">
        <div className="user-info">
          <div className="user-avatar">
            {getInitial()}
          </div>
          <div className="user-details">
            <span className="username">{userName}</span>
          </div>
        </div>
        
        <button 
          className="logout-btn" 
          onClick={handleLogout}
          aria-label="Logout"
        >
          Logout
        </button>
      </div>
    </div>
  );
};

export default Topbar;