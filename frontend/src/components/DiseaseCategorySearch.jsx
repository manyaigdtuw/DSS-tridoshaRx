/* ------------------------------------------------------------
   DiseaseCategorySearch.jsx
   ------------------------------------------------------------ */
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import FilterBar from './FilterBar';
import './DiseaseCategorySearch.css';
import ResultCard from './ResultCard';
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
  const [diseases, setDiseases] = useState([]);               // [{disease_id, disease, symptoms:[…]}]
  const [uniqueSymptoms, setUniqueSymptoms] = useState([]);    // [{symptom_id, name}]
  const [selectedSymptomIds, setSelectedSymptomIds] = useState([]);
  const [diagnosis, setDiagnosis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /* ---------- FETCH diseases when filters change ---------- */
  const fetchDiseases = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await axios.get(`${API_BASE_URL}/api/diseases/by-category`, {
        params: filters,
      });
      const fetched = resp.data; // array of disease objects

      setDiseases(fetched);

      // Build a deduped symptom list from the returned diseases
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

  // run on first render and every time filters change
  useEffect(() => {
    fetchDiseases();
  }, [fetchDiseases]);

  // ---- IMPORTANT: clear old selections when the hierarchy changes ----
  useEffect(() => {
    // user switched category → old symptom picks are no longer valid
    setSelectedSymptomIds([]);
    setDiagnosis(null);
  }, [filters]);

  /* ---------- Symptom checkbox toggle ---------- */
  const toggleSymptom = (sid) => {
    setSelectedSymptomIds(prev =>
      prev.includes(sid) ? prev.filter(id => id !== sid) : [...prev, sid]
    );
  };

  /* ---------- Diagnose logic ---------- */
  const diagnose = () => {
    // Compute match count for each disease
    const withMatch = diseases.map(d => {
      const diseaseSymIds = d.symptoms.map(s => s.symptom_id);
      const hitCount = selectedSymptomIds.filter(id => diseaseSymIds.includes(id)).length;
      return { disease: d, hitCount };
    });

    const maxHit = Math.max(...withMatch.map(m => m.hitCount));
    const best = withMatch.filter(m => m.hitCount === maxHit && maxHit > 0);

    setDiagnosis({
      results: best,
      selectedCount: selectedSymptomIds.length,
    });
  };

  /* ---------- Render ---------- */
  return (
    <div className="disease-cat-search">
      <h2>Disease Search by Category</h2>

      {/* ---- Category filters (reuse your FilterBar) ---- */}
      <FilterBar onCategoryFilter={setFilters} />

      {/* ---- Loading / error feedback ---- */}
      {loading && <p className="info">Loading diseases …</p>}
      {error && <p className="error">{error}</p>}

      {/* ---- Symptom checklist (only when we have symptoms) ---- */}
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

      {/* ---- Diagnosis result (if any) ---- */}
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
    </div>
  );
};

export default DiseaseCategorySearch;