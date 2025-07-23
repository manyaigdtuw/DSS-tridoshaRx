import fs from 'fs';
import csv from 'csv-parser';
import pool from './database.js';


function normalizeSymptomName(raw) {
  if (!raw) return '';
  let norm = raw.trim().toLowerCase().replace(/\s+/g, ' ');
  if (symptomSynonymMap[norm]) {
    norm = symptomSynonymMap[norm];
  }
  return norm;
}

function normalize(str) {
  if (!str) return '';
  return str.trim().toLowerCase().replace(/\s+/g, ' ');
}

async function processMappings(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found at ${filePath}`);
    process.exit(1);
  }

  const maps = {
    diseases: new Map(),
    symptoms: new Map(),
    medicines: new Map(),
    labTests: new Map(),
    procedures: new Map(),
    lifestyleRecs: new Map()
  };

  const rows = [];
  let successCount = 0;

  console.log('Starting CSV processing for mappings...');

  await new Promise((resolve) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => rows.push(row))
      .on('end', resolve);
  });

  for (const row of rows) {
    try {
      
      const diseaseName = row.disease || row.Disease;
      const symptoms = row.symptoms || row.Symptom;
      const medicines = row.medicines || row.Medicine;
      const labTests = row.lab_tests || row.labTests || row.LabTests;
      const procedures = row.procedures || row.Procedures;
      const lifestyle = row.lifestyle_recommendations || row.Lifestyle || row['Lifestyle Recommendations'];

      // Disease
      if (diseaseName) {
        const cleanDisease = normalize(diseaseName);
        if (cleanDisease && !maps.diseases.has(cleanDisease)) {
          let res = await pool.query(
            'INSERT INTO Diseases (name) VALUES ($1) ON CONFLICT (name) DO NOTHING RETURNING disease_id',
            [cleanDisease]
          );
          let diseaseId = res.rows[0]?.disease_id;
          if (!diseaseId) {
            const selectRes = await pool.query('SELECT disease_id FROM Diseases WHERE name = $1', [cleanDisease]);
            diseaseId = selectRes.rows[0]?.disease_id;
          }
          if (diseaseId) maps.diseases.set(cleanDisease, diseaseId);
        }
      }

      // Symptoms
      if (symptoms) {
        const symptomList = symptoms.split(',').map(s => s.trim()).filter(s => s);
        for (const symptomRaw of symptomList) {
          const symptom = normalizeSymptomName(symptomRaw);
          if (!maps.symptoms.has(symptom)) {
            let res = await pool.query(
              'INSERT INTO Symptoms (name) VALUES ($1) ON CONFLICT (name) DO NOTHING RETURNING symptom_id',
              [symptom]
            );
            let id = res.rows[0]?.symptom_id;
            if (!id) {
              const sel = await pool.query('SELECT symptom_id FROM Symptoms WHERE name = $1', [symptom]);
              id = sel.rows[0]?.symptom_id;
            }
            if (id) maps.symptoms.set(symptom, id);
          }
        }
      }

      // Medicines
      if (medicines) {
        const medicineList = medicines.split(',').map(m => m.trim()).filter(m => m);
        for (const medicineRaw of medicineList) {
          const medicine = normalize(medicineRaw);
          if (!maps.medicines.has(medicine)) {
            let res = await pool.query(
              'INSERT INTO Medicines (name) VALUES ($1) ON CONFLICT (name) DO NOTHING RETURNING medicine_id',
              [medicine]
            );
            let id = res.rows[0]?.medicine_id;
            if (!id) {
              const sel = await pool.query('SELECT medicine_id FROM Medicines WHERE name = $1', [medicine]);
              id = sel.rows[0]?.medicine_id;
            }
            if (id) maps.medicines.set(medicine, id);
          }
        }
      }

      // Lab Tests
      if (labTests) {
        const labTestList = labTests.split(',').map(l => l.trim()).filter(l => l);
        for (const labTestRaw of labTestList) {
          const labTest = normalize(labTestRaw);
          if (!maps.labTests.has(labTest)) {
            let res = await pool.query(
              'INSERT INTO LabDiagnoses (name) VALUES ($1) ON CONFLICT (name) DO NOTHING RETURNING lab_id',
              [labTest]
            );
            let id = res.rows[0]?.lab_id;
            if (!id) {
              const sel = await pool.query('SELECT lab_id FROM LabDiagnoses WHERE name = $1', [labTest]);
              id = sel.rows[0]?.lab_id;
            }
            if (id) maps.labTests.set(labTest, id);
          }
        }
      }

      // Procedures
      if (procedures) {
        const procedureList = procedures.split(',').map(p => p.trim()).filter(p => p);
        for (const procedureRaw of procedureList) {
          const procedure = normalize(procedureRaw);
          if (!maps.procedures.has(procedure)) {
            let res = await pool.query(
              'INSERT INTO Procedures (name) VALUES ($1) ON CONFLICT (name) DO NOTHING RETURNING procedure_id',
              [procedure]
            );
            let id = res.rows[0]?.procedure_id;
            if (!id) {
              const sel = await pool.query('SELECT procedure_id FROM Procedures WHERE name = $1', [procedure]);
              id = sel.rows[0]?.procedure_id;
            }
            if (id) maps.procedures.set(procedure, id);
          }
        }
      }

      // Lifestyle Recommendations
      if (lifestyle) {
        const lifestyleList = lifestyle.split(',').map(l => l.trim()).filter(l => l);
        for (const recRaw of lifestyleList) {
          const rec = normalize(recRaw);
          if (!maps.lifestyleRecs.has(rec)) {
            let res = await pool.query(
              'INSERT INTO lifestyle_recommendations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING RETURNING lifestyle_id',
              [rec]
            );
            let id = res.rows[0]?.lifestyle_id;
            if (!id) {
              const sel = await pool.query('SELECT lifestyle_id FROM lifestyle_recommendations WHERE name = $1', [rec]);
              id = sel.rows[0]?.lifestyle_id;
            }
            if (id) maps.lifestyleRecs.set(rec, id);
          }
        }
      }

      successCount++;
    } catch (error) {
      console.error(`Error processing row: ${JSON.stringify(row)} -> ${error.message}`);
    }
  }

  console.log(`Processed ${successCount}/${rows.length} rows for entries.`);

  let mappingSuccessCount = 0;
  for (const row of rows) {
    try {
      const diseaseName = normalize(row.disease || row.Disease);
      const diseaseId = maps.diseases.get(diseaseName);

      if (!diseaseId) {
        console.warn(`No disease ID found for ${diseaseName}, skipping mappings`);
        continue;
      }

      
      if (row.symptoms) {
        const symptomList = row.symptoms.split(',').map(s => s.trim()).filter(s => s);
        for (const symptomRaw of symptomList) {
          const symptom = normalizeSymptomName(symptomRaw);
          const symptomId = maps.symptoms.get(symptom);
          if (symptomId) {
            await pool.query(
              'INSERT INTO DiseaseSymptoms (disease_id, symptom_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
              [diseaseId, symptomId]
            );
          }
        }
      }

      if (row.medicines) {
        const medicineList = row.medicines.split(',').map(m => m.trim()).filter(m => m);
        for (const medicineRaw of medicineList) {
          const medicine = normalize(medicineRaw);
          const medicineId = maps.medicines.get(medicine);
          if (medicineId) {
            await pool.query(
              'INSERT INTO DiseaseMedicines (disease_id, medicine_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
              [diseaseId, medicineId]
            );
          }
        }
      }

      if (row.lab_tests) {
        const labTestList = row.lab_tests.split(',').map(l => l.trim()).filter(l => l);
        for (const labTestRaw of labTestList) {
          const labTest = normalize(labTestRaw);
          const labId = maps.labTests.get(labTest);
          if (labId) {
            await pool.query(
              'INSERT INTO DiseaseLabDiagnoses (disease_id, lab_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
              [diseaseId, labId]
            );
          }
        }
      }

      if (row.procedures) {
        const procedureList = row.procedures.split(',').map(p => p.trim()).filter(p => p);
        for (const procedureRaw of procedureList) {
          const procedure = normalize(procedureRaw);
          const procedureId = maps.procedures.get(procedure);
          if (procedureId) {
            await pool.query(
              'INSERT INTO DiseaseProcedures (disease_id, procedure_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
              [diseaseId, procedureId]
            );
          }
        }
      }

      if (row.lifestyle_recommendations) {
        const lifestyleList = row.lifestyle_recommendations.split(',').map(l => l.trim()).filter(l => l);
        for (const recRaw of lifestyleList) {
          const rec = normalize(recRaw);
          const lifestyleId = maps.lifestyleRecs.get(rec);
          if (lifestyleId) {
            await pool.query(
              'INSERT INTO disease_lifestyle (disease_id, lifestyle_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
              [diseaseId, lifestyleId]
            );
          }
        }
      }

      mappingSuccessCount++;
    } catch (error) {
      console.error(`Error creating mappings for row: ${JSON.stringify(row)} -> ${error.message}`);
    }
  }

  console.log(`Created mappings for ${mappingSuccessCount}/${rows.length} diseases.`);
  await pool.end();
  console.log('Database connection closed.');
}

processMappings(process.argv[2])
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Script failed:', err);
    process.exit(1);
  });
