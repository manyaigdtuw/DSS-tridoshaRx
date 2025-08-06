import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Header.css';
import ayushLogo from './AyushLogo.png'; // Update with your actual path

const Header = ({ handleLogout }) => {
  const location = useLocation();

  return (
    <div className="full-width-bleed">
      <nav className="govt-navbar">
        <div className="govt-logo-container">
          <img src={ayushLogo} alt="Ministry of Ayush Logo" className="govt-logo-img" />
          <div className="govt-logo-text">
            Central Council for Research in Ayurvedic Sciences
            <small>Ministry of Ayush, Government of India</small>
          </div>
        </div>
        <div className="govt-nav-links">
          <Link 
            to="/user-page" 
            className={`govt-nav-link ${location.pathname === '/user-page' ? 'active' : ''}`}
          >
            Home
          </Link>
          <Link 
            to="/about" 
            className={`govt-nav-link ${location.pathname === '/about' ? 'active' : ''}`}
          >
            About Us
          </Link>
          <Link 
            to="/contact" 
            className={`govt-nav-link ${location.pathname === '/contact' ? 'active' : ''}`}
          >
            Contact Us
          </Link>
          <button className="govt-nav-button" onClick={handleLogout}>Logout</button>
        </div>
      </nav>
    </div>
  );
};

export default Header;
