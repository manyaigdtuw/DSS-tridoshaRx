import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import "./SearchBar.css";

const API_BASE_URL = "https://dss-tridosharx.onrender.com/";

const DiseaseSearchBar = ({ onSearch }) => {
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [selectedDiseases, setSelectedDiseases] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef();
  const containerRef = useRef();

  // Fetch disease suggestions
  useEffect(() => {
    if (!inputValue.trim()) {
      setSuggestions([]);
      return;
    }

    const fetchDiseases = async () => {
      try {
        const { data } = await axios.get(`${API_BASE_URL}/api/diseases`);
        const filtered = data
          .filter(disease => 
            disease.name.toLowerCase().includes(inputValue.toLowerCase()) &&
            !selectedDiseases.some(d => d.disease_id === disease.disease_id)
          )
          .slice(0, 8);
        setSuggestions(filtered);
      } catch (error) {
        console.error("Error fetching diseases:", error);
        setSuggestions([]);
      }
    };

    const timer = setTimeout(() => {
      fetchDiseases();
    }, 300); // Add slight debounce

    return () => clearTimeout(timer);
  }, [inputValue, selectedDiseases]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Add disease
  const addDisease = (disease) => {
    const updated = [...selectedDiseases, disease];
    setSelectedDiseases(updated);
    setInputValue("");
    setSuggestions([]);
    inputRef.current?.focus();
    setShowSuggestions(false);
    onSearch(disease); // Pass the selected disease to parent
  };

  // Remove disease
  const removeDisease = (id) => {
    const updated = selectedDiseases.filter(d => d.disease_id !== id);
    setSelectedDiseases(updated);
     onSearch(null); 
  };

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === "Backspace" && !inputValue && selectedDiseases.length) {
      removeDisease(selectedDiseases[selectedDiseases.length - 1].disease_id);
    }
    if (e.key === "ArrowDown" && suggestions.length) {
      document.getElementById("disease-autocomplete-opt-0")?.focus();
    }
  };

  // Move focus to input after selection
  const handleSuggestionClick = (disease) => {
    addDisease(disease);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  return (
    <div className="search-form" autoComplete="off">
      <div className="searchbar-chips-container" ref={containerRef}>
        {selectedDiseases.map((d) => (
          <span className="chip" key={d.disease_id}>
            {d.name}
            <button
              type="button"
              className="chip-remove"
              aria-label="Remove disease"
              onClick={() => removeDisease(d.disease_id)}
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          className="searchbar-input"
          type="text"
          value={inputValue}
          placeholder={
            selectedDiseases.length === 0 ? "Search for a disease..." : ""
          }
          onChange={(e) => {
            setInputValue(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => inputValue && setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          style={{ minWidth: 80, flex: 1 }}
        />
        {inputValue && (
          <button
            type="button"
            className="clear-button"
            onClick={() => setInputValue("")}
            aria-label="Clear input"
          >
            ×
          </button>
        )}
        {showSuggestions && suggestions.length > 0 && (
          <ul className="autocomplete-dropdown">
            {suggestions.map((d, idx) => (
              <li
                key={d.disease_id}
                id={`disease-autocomplete-opt-${idx}`}
                tabIndex={0}
                className="autocomplete-option"
                onClick={() => handleSuggestionClick(d)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSuggestionClick(d);
                  if (e.key === "ArrowDown" && suggestions[idx + 1])
                    document.getElementById(
                      `disease-autocomplete-opt-${idx + 1}`
                    )?.focus();
                  if (e.key === "ArrowUp" && suggestions[idx - 1])
                    document.getElementById(
                      `disease-autocomplete-opt-${idx - 1}`
                    )?.focus();
                  if (e.key === "Escape") {
                    setShowSuggestions(false);
                    inputRef.current?.focus();
                  }
                }}
              >
                {d.name}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default DiseaseSearchBar;