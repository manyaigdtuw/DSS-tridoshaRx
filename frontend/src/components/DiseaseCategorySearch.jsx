import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import FilterBar from './FilterBar';
import './DiseaseCategorySearch.css';
import ResultCard from './ResultCard';
import Header from './Header'; // ✅ Make sure Header is in the same folder or update the path accordingly
import Footer from './Footer';
import PDFExportButton from './PDFExportButton';

const API_BASE_URL = 'https://dss-tridosharx.onrender.com';

const DiseaseCategorySearch = () => {
  /* ---------- STATE ---------- */
  const [filters, setFilters] = useState({
    categorytype_ids: [],
    category_ids: [],
    subcategory_ids: [],
    tertiary_ids: [],
  });
  const [diseases, setDiseases] = useState([]);               
  const [uniqueSymptoms, setUniqueSymptoms] = useState([]);    
  const [selectedSymptomIds, setSelectedSymptomIds] = useState([]);
  const [diagnosis, setDiagnosis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchDiseases = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await axios.get(`${API_BASE_URL}/api/diseases/by-category`, {
        params: filters,
      });
      const fetched = resp.data; 

      setDiseases(fetched);

      const symptomMap = {};
      fetched.forEach(d => {
        d.symptoms.forEach(s => {
          symptomMap[s.symptom_id] = s;
        });
      });
      setUniqueSymptoms(
        Object.values(symptomMap).sort((a, b) => a.name.localeCompare(b.name))
      );
    } catch (e) {
      console.error(e);
      setError('Failed to load diseases');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchDiseases();
  }, [fetchDiseases]);

  useEffect(() => {
    setSelectedSymptomIds([]);
    setDiagnosis(null);
  }, [filters]);

  const toggleSymptom = (sid) => {
    setSelectedSymptomIds(prev =>
      prev.includes(sid) ? prev.filter(id => id !== sid) : [...prev, sid]
    );
  };

const diagnose = () => {
  const withMatch = diseases.map(d => {
    const diseaseSymIds = d.symptoms.map(s => s.symptom_id);   

    const hitCount = selectedSymptomIds.filter(id =>
      diseaseSymIds.includes(id)
    ).length;   

    return { disease: d, hitCount };
  });

  const filtered = withMatch.filter(m => m.hitCount >= 1);   
  filtered.sort((a, b) => b.hitCount - a.hitCount);

  setDiagnosis({
    results: filtered,                
    selectedCount: selectedSymptomIds.length   
  });
};
  return (
    <div className="disease-cat-search">
      <div className="full-width-bleed">
        <Header />
      </div>
      

      <FilterBar onCategoryFilter={setFilters} />

      {loading && <p className="info">Loading diseases …</p>}
      {error && <p className="error">{error}</p>}

      {uniqueSymptoms.length > 0 && (
        <div className="symptom-checklist">
          <h3>Select Symptoms</h3>
          <div className="checkbox-grid">
            {uniqueSymptoms.map(sym => (
              <label key={sym.symptom_id} className="sym-checkbox">
                <input
                  type="checkbox"
                  checked={selectedSymptomIds.includes(sym.symptom_id)}
                  onChange={() => toggleSymptom(sym.symptom_id)}
                />
                {sym.name}
              </label>
            ))}
          </div>

          <button
            className="diagnose-btn"
            onClick={diagnose}
            disabled={selectedSymptomIds.length === 0}
          >
            Diagnose
          </button>
        </div>
      )}

      {diagnosis && (
        <div className="diagnosis-results">
          {diagnosis.results.length > 0 ? (
            <>
              <h3>
                Most probable disease{diagnosis.results.length > 1 ? 's' : ''}
              </h3>

              <div className="cards-wrapper">
                {diagnosis.results.map(({ disease, hitCount }) => (
                  <ResultCard
                    key={disease.disease_id}
                    disease={disease}
                    matchInfo={`${hitCount}/${diagnosis.selectedCount} symptoms matched`}
                  />
                ))}
              </div>

              {/* PDF export – the same component you already use */}
              <PDFExportButton
                results={diagnosis.results.map(r => r.disease)}
                userName={localStorage.getItem('userName') || 'User'}
              />
            </>
          ) : (
            <div className="no-match">
              No disease matches the selected symptoms in the chosen category.
              Try adding more symptoms or adjusting the filters.
            </div>
          )}
        </div>
      )}
       <div className="full-width-bleed" style={{ marginTop: '40px' }}>
    <Footer />
  </div>
    </div>
    
  );
};

export default DiseaseCategorySearch;