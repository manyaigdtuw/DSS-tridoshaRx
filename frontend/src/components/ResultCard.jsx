import React from 'react';
import './ResultCard.css';          


const ResultCard = ({ disease, matchInfo }) => {
  const diseaseName = disease.disease || disease.name || 'Unnamed disease';

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