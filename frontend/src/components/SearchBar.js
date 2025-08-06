import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import "./SearchBar.css";
import FilterBar from "./FilterBar";

const API_BASE_URL = "https://dss-tridosharx.onrender.com";

const SearchBar = ({ onEnhancedSearch, onUpdateResults }) => {
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const inputRef = useRef();
  const containerRef = useRef();
  const recognitionRef = useRef(null);
  const [categoryFilters, setCategoryFilters] = useState({});

  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      recognitionRef.current = new window.webkitSpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputValue(transcript);
        findClosestSymptom(transcript);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    } else {
      console.warn('Speech recognition not supported in this browser');
    }

    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    if (!inputValue.trim()) {
      setSuggestions([]);
      return;
    }
    let ignore = false;
    const fetch = async () => {
      try {
        const { data } = await axios.get(`${API_BASE_URL}/api/symptoms`);
        const filtered = data
          .filter(
            (sym) =>
              sym.name.toLowerCase().includes(inputValue.toLowerCase()) &&
              !selectedSymptoms.some((s) => s.symptom_id === sym.symptom_id)
          )
          .slice(0, 8);
        if (!ignore) setSuggestions(filtered);
      } catch {
        setSuggestions([]);
      }
    };
    fetch();
    return () => { ignore = true; };
  }, [inputValue, selectedSymptoms]);

  useEffect(() => {
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const findClosestSymptom = async (transcript) => {
    try {
      const { data } = await axios.get(`${API_BASE_URL}/api/symptoms`);
      const lowerTranscript = transcript.toLowerCase();

      let exactMatch = data.find(s =>
        s.name.toLowerCase() === lowerTranscript
      );

      if (exactMatch) {
        addSymptom(exactMatch);
        return;
      }

      let partialMatch = data.find(s =>
        s.name.toLowerCase().includes(lowerTranscript) ||
        lowerTranscript.includes(s.name.toLowerCase())
      );

      if (partialMatch) {
        addSymptom(partialMatch);
      } else {
        setInputValue(transcript);
      }
    } catch (error) {
      console.error("Error fetching symptoms:", error);
      setInputValue(transcript);
    }
  };

  const toggleVoiceRecognition = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const addSymptom = (symptom) => {
    const updated = [...selectedSymptoms, symptom];
    setSelectedSymptoms(updated);
    setInputValue("");
    setSuggestions([]);
    inputRef.current.focus();
    setShowSuggestions(false);
    onEnhancedSearch({
      symptoms: updated.map((s) => s.name).join(","),
      ...categoryFilters,
    });
  };

  const removeSymptom = (id) => {
    const updated = selectedSymptoms.filter((s) => s.symptom_id !== id);
    setSelectedSymptoms(updated);
    onEnhancedSearch({
      symptoms: updated.map((s) => s.name).join(","),
      ...categoryFilters,
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === "Backspace" && !inputValue && selectedSymptoms.length) {
      removeSymptom(selectedSymptoms[selectedSymptoms.length - 1].symptom_id);
    }
    if (e.key === "ArrowDown" && suggestions.length) {
      document.getElementById("autocomplete-opt-0")?.focus();
    }
  };

  // ✅ UPDATED: handleSearch with enteredSymptoms included
  const handleSearch = async () => {
    if (!selectedSymptoms.length) {
      alert("Please select at least one symptom.");
      return;
    }
    try {
      const response = await axios.get(`${API_BASE_URL}/api/search-partial`, {
        params: {
          term: selectedSymptoms.map(s => s.name).join(','),
          ...categoryFilters
        }
      });
      onUpdateResults({
        results: response.data,
        enteredSymptoms: selectedSymptoms.map(s => s.name)
      });
    } catch (error) {
      console.error("Partial search error:", error);
      onUpdateResults({ results: [], enteredSymptoms: [] });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputValue.trim()) {
      findClosestSymptom(inputValue);
    } else {
      handleSearch();
    }
  };

  const handleSuggestionClick = (s) => {
    addSymptom(s);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleCategoryFilter = (filters) => {
    const cleaned = {};
    for (const key in filters) {
      if (Array.isArray(filters[key]) && filters[key].length === 0) continue;
      cleaned[key] = filters[key];
    }
    setCategoryFilters(cleaned);
    onEnhancedSearch({
      symptoms: selectedSymptoms.map((s) => s.name).join(","),
      ...cleaned,
    });
  };

  return (
    <div className="search-container">
      <form className="search-form" onSubmit={handleSubmit} autoComplete="off">
        <div className="searchbar-chips-container" ref={containerRef}>
          {selectedSymptoms.map((s) => (
            <span className="chip" key={s.symptom_id}>
              {s.name}
              <button
                type="button"
                className="chip-remove"
                onClick={() => removeSymptom(s.symptom_id)}
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
              selectedSymptoms.length === 0 ? "Type a symptom or speak..." : ""
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
            >
              ×
            </button>
          )}
          <button
            type="button"
            className={`voice-button ${isListening ? "listening" : ""}`}
            onClick={toggleVoiceRecognition}
          >
            {isListening ? <span className="pulse-animation">🎤</span> : "🎤"}
          </button>
          {showSuggestions && suggestions.length > 0 && (
            <ul className="autocomplete-dropdown">
              {suggestions.map((s, idx) => (
                <li
                  key={s.symptom_id}
                  id={`autocomplete-opt-${idx}`}
                  tabIndex={0}
                  className="autocomplete-option"
                  onClick={() => handleSuggestionClick(s)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSuggestionClick(s);
                    if (e.key === "ArrowDown" && suggestions[idx + 1])
                      document.getElementById(`autocomplete-opt-${idx + 1}`)?.focus();
                    if (e.key === "ArrowUp" && suggestions[idx - 1])
                      document.getElementById(`autocomplete-opt-${idx - 1}`)?.focus();
                    if (e.key === "Escape") {
                      setShowSuggestions(false);
                      inputRef.current.focus();
                    }
                  }}
                >
                  {s.name}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="search-controls">
          <button
            className="searchbar-searchbtn"
            type="button"
            onClick={handleSearch}
          >
            Search for any symptom
          </button>
          <FilterBar onCategoryFilter={handleCategoryFilter} />
        </div>
      </form>
    </div>
  );
};

export default SearchBar;
