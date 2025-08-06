import React from 'react';
import './ContactUs.css';
import Header from './Header'; // ✅ Make sure Header is in the same folder or update the path accordingly
import Footer from './Footer';

const ContactUs = () => {
  return (
    <>
      <div className="full-width-bleed">
        <Header />
      </div>

      <div className="contact-us-container">
        <div className="contact-us-header">
          <h2>Contact Us</h2>
        </div>

        <div className="contact-us-content">
          <div className="contact-section">
            <h3>Address</h3>
            <p>
              Jawahar Lal Nehru Bhartiya Chikitsa Avum Homeopathy Anusandhan Bhavan<br />
              No.61-65, Institutional Area, Opp. 'D' Block, Janakpuri,<br />
              New Delhi - 110058 (India)
            </p>
            <p>Telephone: 91-011-28525862 / 28525897 / 28525852</p>
          </div>
        </div>
      </div>
       <div className="full-width-bleed" style={{ marginTop: '40px' }}>
    <Footer />
  </div>
    </>
  );
};

export default ContactUs;
