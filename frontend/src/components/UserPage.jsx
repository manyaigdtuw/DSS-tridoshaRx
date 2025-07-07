import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import SearchBar from './SearchBar';
import ResultsDisplay from './ResultsDisplay';
import MedicalChatbot from './MedicalChatbot'; // Add this import
import PDFExportButton from './PDFExportButton';
import './SymptomChecker.css';

const API_BASE_URL = 'http://localhost:5000';

const SymptomChecker = () => {
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showChatbot, setShowChatbot] = useState(false); // New state for chatbot visibility
  const navigate = useNavigate();

  const handleSearch = async (searchTerm) => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/search`, {
        params: { term: searchTerm }
      });
      setSearchResults(response.data);
    } catch (error) {
      console.error("Search failed:", error);
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
          <h2>Search Symptoms</h2>
          <SearchBar onSearch={handleSearch} />
          {isLoading && <div className="search-loading">Searching database...</div>}
        </div>

        <div className={`results-section ${showChatbot ? 'collapsed' : ''}`}>
          <ResultsDisplay results={searchResults} />
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