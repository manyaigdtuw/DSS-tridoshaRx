import React from 'react';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="app-footer">
      <div className="footer-content">
        <div className="footer-section">
          <h3>CCRAS Web Portals</h3>
          <ul>
            <li>
              <a href="https://ayushportal.nic.in/" 
                 target="_blank" 
                 rel="noopener noreferrer"
                 className="footer-link">
                Ayush Research Portal
              </a>
            </li>
            <li>
              <a href="http://www.ccras.res.in/" 
                 target="_blank" 
                 rel="noopener noreferrer"
                 className="footer-link">
                Ayur Prakriti Web Portal
              </a>
            </li>
            <li>
              <a href="https://namaste.ayush.gov.in/" 
                 target="_blank" 
                 rel="noopener noreferrer"
                 className="footer-link">
                NAMASTE
              </a>
            </li>
            <li>
              <a href="http://ccras.res.in/ccras_ebooks/" 
                 target="_blank" 
                 rel="noopener noreferrer"
                 className="footer-link">
                E-BOOKS
              </a>
            </li>
          </ul>
        </div>
        
        <div className="footer-section">
          <h3>CCRAS Education Cell</h3>
          <ul>
            <li>
              <a href="https://spark.ccras.org.in/" 
                 target="_blank" 
                 rel="noopener noreferrer"
                 className="footer-link">
                SPARK
              </a>
            </li>
            <li>
              <a href="https://pgstar.ccras.org.in/" 
                 target="_blank" 
                 rel="noopener noreferrer"
                 className="footer-link">
                PG STAR
              </a>
            </li>
            <li>
              <a href="https://pdf.ccras.org.in/" 
                 target="_blank" 
                 rel="noopener noreferrer"
                 className="footer-link">
                PDF
              </a>
            </li>
          </ul>
        </div>
        
        <div className="footer-contact">
          <h3>Contact Us</h3>
          <p>61-65, opp. D' Block, D Block, Janakpuri Institutional Area,</p>
          <p>Janakpuri, New Delhi, Delhi 110058</p>
          <p>Telephone: 91-011-28525862/28525897/28525852</p>
        </div>
      </div>
      
      <div className="footer-copyright">
        <p>© {new Date().getFullYear()} Central Council for Research in Ayurvedic Sciences</p>
      </div>
    </footer>
  );
};

export default Footer;