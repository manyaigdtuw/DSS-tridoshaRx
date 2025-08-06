// AboutUs.jsx
import React from 'react';
import './AboutUs.css';
import Header from './Header';
import Footer from './Footer';

const AboutUs = () => {
  return (
    <>
      <div className="full-width-bleed">
        <Header />
      </div>

      <div className="about-us-container">
        <div className="about-us-header">
          <h2>About Us</h2>
        </div>

        <div className="about-us-content">
          <div className="about-section">
            <h3>About Central Council for Research in Ayurvedic Sciences</h3>
            <p>
              The Central Council for Research in Ayurvedic Sciences (CCRAS) is an autonomous body under the Ministry of Ayush, Government of India. It is an apex body in India for the formulation, coordination, development, and promotion of research in Ayurveda.
            </p>
            <p>
              CCRAS undertakes research activities in collaboration with national and international institutes to explore the potential of Ayurveda in healthcare. The council has a network of 30 institutes across India engaged in clinical research, drug research, and fundamental research.
            </p>
          </div>

          <div className="mission-section">
            <h3>Our Mission</h3>
            <ul>
              <li>To undertake research in Ayurveda with scientific approach</li>
              <li>To develop standardized Ayurvedic treatments for various diseases</li>
              <li>To promote evidence-based practice of Ayurveda</li>
              <li>To integrate Ayurveda with modern healthcare systems</li>
              <li>To preserve and document traditional Ayurvedic knowledge</li>
            </ul>
          </div>

          <div className="achievements-section">
            <h3>Key Achievements</h3>
            <div className="achievements-grid">
              <div className="achievement-card">
                <h4>Research Publications</h4>
                <p>Over 5000 research papers published in national and international journals</p>
              </div>
              <div className="achievement-card">
                <h4>Clinical Trials</h4>
                <p>Conducted 200+ clinical trials for various disease conditions</p>
              </div>
              <div className="achievement-card">
                <h4>Patent Filings</h4>
                <p>Filed 50+ patents for novel Ayurvedic formulations</p>
              </div>
              <div className="achievement-card">
                <h4>Global Collaborations</h4>
                <p>Partnerships with 20+ international institutions</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="full-width-bleed" style={{ marginTop: '40px' }}>
        <Footer />
      </div>
    </>
  );
};

export default AboutUs;