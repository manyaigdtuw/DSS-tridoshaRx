import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import SearchBar from './SearchBar';
import DiseaseSearchBar from "./DiseaseSearchBar";
import ResultsDisplay from './ResultsDisplay';
import MedicalChatbot from './MedicalChatbot';
import PDFExportButton from './PDFExportButton';
import './SymptomChecker.css';

const API_BASE_URL = 'http://localhost:5000';

const SymptomChecker = () => {
  const [searchResults, setSearchResults] = useState([]);
  const [diseaseDetails, setDiseaseDetails] = useState(null); // New state for disease details
  const [isLoading, setIsLoading] = useState(false);
  const [showChatbot, setShowChatbot] = useState(false);
  const [selectedDisease, setSelectedDisease] = useState(null);
  const navigate = useNavigate();

  const handleSearch = async (searchTerm) => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }
    setIsLoading(true);
    try {
      const terms = searchTerm.split(',')
        .map(term => term.trim())
        .filter(term => term.length > 0)
        .join(',');
      const response = await axios.get(`${API_BASE_URL}/api/search`, {
        params: { term: terms }
      });
      setSearchResults(response.data);
    } catch (error) {
      console.error("Search failed:", error);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  // New function to handle disease selection
  const handleDiseaseSearch = async (disease) => {
    setSelectedDisease(disease);
    setIsLoading(true);
    try {
      // Fetch detailed information about the selected disease
      const response = await axios.get(`${API_BASE_URL}/api/diseases/${disease.disease_id}/mappings`);
      setDiseaseDetails({
        ...disease,
        ...response.data
      });
      setSearchResults([]); // Clear symptom search results
    } catch (error) {
      console.error("Failed to fetch disease details:", error);
      setDiseaseDetails(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      localStorage.clear();
      window.location.assign('/login');
    } catch (error) {
      console.error('Logout error:', error);
      window.location.href = '/login';
    }
  };

  const toggleChatbot = () => {
    setShowChatbot(!showChatbot);
  };

  return (
    <div className="symptom-checker-container">
      <div className="user-header">
        <h2>TridoshaRx</h2>
        <div className="header-buttons">
          <button className="chatbot-toggle-button" onClick={toggleChatbot}>
            {showChatbot ? 'Close Assistant' : 'Medical Assistant'}
          </button>
          <button className="logout-button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
      
      <div className="symptom-checker">
        {showChatbot && (
          <div className="chatbot-container">
            <MedicalChatbot />
          </div>
        )}

        <div className={`search-section ${showChatbot ? 'collapsed' : ''}`}>
          <h2>Search Disease</h2>
          <DiseaseSearchBar onSearch={handleDiseaseSearch} />
          
          <h2>Search Symptoms</h2>
          <SearchBar onSearch={handleSearch} />
          {isLoading && <div className="search-loading">Searching database...</div>}
        </div>

        <div className={`results-section ${showChatbot ? 'collapsed' : ''}`}>
          {/* Show disease details if available, otherwise show symptom search results */}
          {diseaseDetails ? (
            <div className="disease-details">
              <h3>{diseaseDetails.name}</h3>
              <div className="disease-mappings">
                {diseaseDetails.symptoms && diseaseDetails.symptoms.length > 0 && (
                  <div className="mapping-section">
                    <h4>Symptoms</h4>
                    <ul>
                      {diseaseDetails.symptoms.map(s => (
                        <li key={s.symptom_id}>{s.name}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {diseaseDetails.medicines && diseaseDetails.medicines.length > 0 && (
                  <div className="mapping-section">
                    <h4>Medicines</h4>
                    <ul>
                      {diseaseDetails.medicines.map(m => (
                        <li key={m.medicine_id}>{m.name}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {diseaseDetails.labTests && diseaseDetails.labTests.length > 0 && (
                  <div className="mapping-section">
                    <h4>Lab Tests</h4>
                    <ul>
                      {diseaseDetails.labTests.map(l => (
                        <li key={l.lab_id}>{l.name}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {diseaseDetails.procedures && diseaseDetails.procedures.length > 0 && (
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
            <ResultsDisplay results={searchResults} />
          )}
        </div>

        {searchResults.length > 0 && (
          <PDFExportButton 
            results={searchResults[0]} 
            userName={localStorage.getItem('userName')} 
          />
        )}
      </div>
    </div>
  );
};

export default SymptomChecker;