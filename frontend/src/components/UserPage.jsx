import React, { useState } from 'react';
import axios from 'axios';
import { Link, useLocation } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import SearchBar from './SearchBar';
import DiseaseSearchBar from "./DiseaseSearchBar";
import ResultsDisplay from './ResultsDisplay';
import ayushLogo from './AyushLogo.png'; // Update with your actual path
import Footer from './Footer';  

import PDFExportButton from './PDFExportButton';
import './SymptomChecker.css';

const API_BASE_URL = 'http://localhost:5000';

const SymptomChecker = () => {
   const [activeTab, setActiveTab] = useState('home');
  const [searchResults, setSearchResults] = useState([]);
  const [diseaseDetails, setDiseaseDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDisease, setSelectedDisease] = useState(null);
  const [searchType, setSearchType] = useState(null); // NEW: search type tracking
  const [enteredSymptoms, setEnteredSymptoms] = useState([]); // NEW: symptom tracking

  const navigate = useNavigate();

  // ✳️ Enhanced search handler (from updated SearchBar)
  const handleEnhancedSearch = async ({ symptoms, ...filters }) => {
    setIsLoading(true);
    try {
      console.log("Enhanced search with filters:", { symptoms, ...filters });
      const response = await axios.get(`${API_BASE_URL}/api/search-enhanced`, {
        params: {
          term: symptoms,
          ...filters
        }
      });
      console.log("Enhanced search results:", response.data);
      setSearchResults(response.data);
      setDiseaseDetails(null);
      setSearchType('enhanced'); // NEW
      setEnteredSymptoms(symptoms ? symptoms.split(',').map(s => s.trim()) : []); // NEW
    } catch (error) {
      console.error("Enhanced search error:", error);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ Manual update method for partial search
  const updateResults = ({ results, enteredSymptoms: passedSymptoms }) => {
    setSearchResults(results);
    setDiseaseDetails(null);
    setSearchType('partial'); // NEW
    setEnteredSymptoms(passedSymptoms || []); // NEW
  };

  // Disease selection logic
  const handleDiseaseSearch = async (disease) => {
    setSelectedDisease(disease);
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/diseases/${disease.disease_id}/mappings`);
      setDiseaseDetails({ ...disease, ...response.data });
      setSearchResults([]); // Clear any existing symptom search results
    } catch (error) {
      console.error("Failed to fetch disease details:", error);
      setDiseaseDetails(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.assign('/login');
  };

  


  return (
    <div className="symptom-checker-container">
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
      <div className="symptom-checker">

        <div className={`search-section`}>
          <h2>Search Disease</h2>
          <DiseaseSearchBar onSearch={handleDiseaseSearch} />
          <h2>Search Symptoms</h2>
          <SearchBar 
            onEnhancedSearch={handleEnhancedSearch} 
            onUpdateResults={updateResults}
          />

          {isLoading && <div className="search-loading">Searching database...</div>}
        </div>

        <div className={`results-section`}>
          {diseaseDetails ? (
            <div className="disease-details">
              <h3>{diseaseDetails.name}</h3>
              <div className="disease-mappings">
                {diseaseDetails.symptoms?.length > 0 && (
                  <div className="mapping-section">
                    <h4>Symptoms</h4>
                    <ul>
                      {diseaseDetails.symptoms.map(s => (
                        <li key={s.symptom_id}>{s.name}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {diseaseDetails.medicines?.length > 0 && (
                  <div className="mapping-section">
                    <h4>Medicines</h4>
                    <ul>
                      {diseaseDetails.medicines.map(m => (
                        <li key={m.medicine_id}>{m.name}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {diseaseDetails.labTests?.length > 0 && (
                  <div className="mapping-section">
                    <h4>Lab Tests</h4>
                    <ul>
                      {diseaseDetails.labTests.map(l => (
                        <li key={l.lab_id}>{l.name}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {diseaseDetails.procedures?.length > 0 && (
                  <div className="mapping-section">
                    <h4>Procedures</h4>
                    <ul>
                      {diseaseDetails.procedures.map(p => (
                        <li key={p.procedure_id}>{p.name}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <PDFExportButton 
                results={diseaseDetails} 
                userName={localStorage.getItem('userName')} 
                isDisease={true}
              />
            </div>
          ) : (
            <ResultsDisplay 
              results={searchResults} 
              searchType={searchType} 
              enteredSymptoms={enteredSymptoms} 
            />
          )}
        </div>

        {searchResults.length > 0 && (
          <PDFExportButton 
            results={searchResults[0]} 
            userName={localStorage.getItem('userName')} 
          />
        )}
      </div>
      <div className="full-width-bleed">
       <Footer />
       </div>
    </div>
  );
};

export default SymptomChecker;
