import React from 'react';
import './ResultsDisplay.css';

const ResultsDisplay = ({ results }) => {
  if (!results || results.length === 0) {
    return null;
  }

  const formatDisease = (diseaseData) => {
    if (Array.isArray(diseaseData)) {
      if (diseaseData.every(item => typeof item === 'string' && item.length === 1)) {
        return diseaseData.join('');
      }
      return diseaseData.join(', ');
    }
    return diseaseData;
  };

  return (
    <div className="results-display">
      <div className="results-header">
        <h2>Search Results</h2>
        <span className="results-count">
          {results.length} result{results.length !== 1 ? 's' : ''} found
        </span>
      </div>

      <div className="results-grid">
        {results.map((result, index) => (
          <div key={index} className="result-card">
            {/* Disease Section */}
            {result.disease && (
              <div className="result-section">
                <h3 className="section-title">Disease</h3>
                <div className="section-content">
                  <div className="disease-name">
                    {formatDisease(result.disease)}
                  </div>
                </div>
              </div>
            )}

            {/* Symptoms Section */}
            {result.symptoms && result.symptoms.length > 0 && (
              <div className="result-section">
                <h3 className="section-title">Symptoms</h3>
                <div className="section-content horizontal-list">
                  {result.symptoms.map((symptom, i) => (
                    <div key={i} className="list-item pill">
                      {symptom}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Medicines Section */}
            {result.medicines && result.medicines.length > 0 && (
              <div className="result-section">
                <h3 className="section-title">Medicines</h3>
                <div className="section-content horizontal-list">
                  {result.medicines.map((medicine, i) => (
                    <div key={i} className="list-item pill">
                      {medicine}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Procedures Section */}
            {result.procedures && result.procedures.length > 0 && (
              <div className="result-section">
                <h3 className="section-title">Procedures</h3>
                <div className="section-content horizontal-list">
                  {result.procedures.map((procedure, i) => (
                    <div key={i} className="list-item pill">
                      {procedure}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Lab Tests Section */}
            {result.lab_tests && result.lab_tests.length > 0 && (
              <div className="result-section">
                <h3 className="section-title">Lab Tests</h3>
                <div className="section-content horizontal-list">
                  {result.lab_tests.map((test, i) => (
                    <div key={i} className="list-item pill">
                      {test}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Lifestyle Recommendations Section */}
            {result.lifestyle_recommendations && result.lifestyle_recommendations.length > 0 && (
              <div className="result-section">
                <h3 className="section-title">Lifestyle Recommendations</h3>
                <div className="section-content horizontal-list">
                  {result.lifestyle_recommendations.map((recommendation, i) => (
                    <div key={i} className="list-item pill lifestyle">
                      {recommendation}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ResultsDisplay;