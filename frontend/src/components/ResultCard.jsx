// src/components/ResultCard.jsx
import React from 'react';
import './ResultCard.css';          // <─ creates the card styling (see below)

 /**
  * Props
  * -----
  * disease: {
  *   disease_id: number,
  *   disease:   string,          // name of the disease (the same field you receive from the back‑end)
  *   symptoms: [{ symptom_id, name }, …]   // optional – shown as pills
  *   medicines?: [{ medicine_id, name }, …]
  *   lab_tests?: [{ lab_id, name }, …]
  *   procedures?: [{ procedure_id, name }, …]
  *   lifestyle_recommendations?: [{ lifestyle_id, name }, …]
  * }
  *
  * matchInfo (optional) – a string like “3/5 symptoms matched”.  
  *                 It will be rendered as a small badge under the disease name.
  */
const ResultCard = ({ disease, matchInfo }) => {
  // Defensive: if the API uses `name` instead of `disease`, handle both
  const diseaseName = disease.disease || disease.name || 'Unnamed disease';

  // Helper to render a pill list (symptoms, medicines, etc.)
  const renderPillSection = (title, items, keyProp) => {
    if (!items || items.length === 0) return null;
    return (
      <div className="result-section">
        <h3 className="section-title">{title}</h3>
        <div className="horizontal-list">
          {items.map(item => (
            <div key={item[keyProp]} className="list-item pill">
              {item.name}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="result-card">
      {/* ------------------- Disease name ------------------- */}
      <div className="result-section">
        <h3 className="section-title">Disease</h3>
        <div className="disease-name">{diseaseName}</div>

        {/* optional match count badge */}
        {matchInfo && <div className="match-info">{matchInfo}</div>}
      </div>

      {/* ------------------- Symptoms ------------------- */}
      {renderPillSection('Symptoms', disease.symptoms, 'symptom_id')}

      {/* ------------------- Medicines ------------------- */}
      {renderPillSection('Medicines', disease.medicines, 'medicine_id')}

      {/* ------------------- Lab Tests ------------------- */}
      {renderPillSection('Lab Tests', disease.lab_tests, 'lab_id')}

      {/* ------------------- Procedures ------------------- */}
      {renderPillSection('Procedures', disease.procedures, 'procedure_id')}

      {/* ------------------- Lifestyle Recommendations ------------------- */}
      {disease.lifestyle_recommendations?.length > 0 && (
        <div className="result-section">
          <h3 className="section-title">Lifestyle Recommendations</h3>
          <div className="horizontal-list">
            {disease.lifestyle_recommendations.map(lr => (
              <div key={lr.lifestyle_id} className="list-item pill lifestyle">
                {lr.name}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultCard;