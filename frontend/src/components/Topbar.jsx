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

  return (
    <div className="topbar">
      <div className="topbar-right">
        {userName && (
          <div className="user-info">
            <span className="welcome-msg">Welcome,</span>
            <span className="username">{userName}</span>
            <button 
              className="logout-btn" 
              onClick={handleLogout}
              aria-label="Logout"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Topbar;