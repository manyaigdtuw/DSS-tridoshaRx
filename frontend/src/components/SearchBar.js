import React, { useState } from 'react';
import './SearchBar.css';

const SearchBar = ({ onSearch }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    onSearch(searchTerm);
  };

  const handleInputChange = (event) => {
    const value = event.target.value;
    setSearchTerm(value);
    
    // Real-time search with debouncing
    if (value.length >= 2 || value.length === 0) {
      onSearch(value);
    }
  };

  const handleClear = () => {
    setSearchTerm('');
    onSearch('');
  };

  return (
    <div className="search-bar">
      <form onSubmit={handleSubmit} className="search-form">
        <div className="search-input-container">
          <input
            type="text"
            value={searchTerm}
            onChange={handleInputChange}
            placeholder="Search for symptoms (e.g., fever, headache, cough...)"
            className="search-input"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={handleClear}
              className="clear-button"
              aria-label="Clear search"
            >
              clear
            </button>
          )}
        </div>
        <button type="submit" className="search-button"> search
        </button>
      </form>
    </div>
  );
};

export default SearchBar;
