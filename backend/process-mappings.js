import fs from 'fs';
import csv from 'csv-parser';
import pool from './database.js';

async function processMappings(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found at ${filePath}`);
    process.exit(1);
  }

  // Maps to store name-to-id mappings
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

  // First read the CSV file
  await new Promise((resolve) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => rows.push(row))
      .on('end', resolve);
  });

  // Process each row - first create entries if they don't exist
  for (const row of rows) {
    try {
      // Normalize keys (handle different casing)
      const diseaseName = row.disease || row.Disease;
      const symptoms = row.symptoms || row.Symptom;
      const medicines = row.medicines || row.Medicine;
      const labTests = row.lab_tests || row.labTests || row.LabTests;
      const procedures = row.procedures || row.Procedures;
      const lifestyle = row.lifestyle_recommendations || row.Lifestyle || row['Lifestyle Recommendations'];

      // Process disease
      if (diseaseName) {
        const cleanDisease = diseaseName.trim();
        if (cleanDisease && !maps.diseases.has(cleanDisease)) {
          const res = await pool.query(
            'INSERT INTO Diseases (name) VALUES ($1) ON CONFLICT (name) DO NOTHING RETURNING disease_id',
            [cleanDisease]
          );
          if (res.rows[0]) {
            maps.diseases.set(cleanDisease, res.rows[0].disease_id);
          }
        }
      }

      // Process symptoms
      if (symptoms) {
        const symptomList = symptoms.split(',').map(s => s.trim()).filter(s => s);
        for (const symptom of symptomList) {
          if (!maps.symptoms.has(symptom)) {
            const res = await pool.query(
              'INSERT INTO Symptoms (name) VALUES ($1) ON CONFLICT (name) DO NOTHING RETURNING symptom_id',
              [symptom]
            );
            if (res.rows[0]) {
              maps.symptoms.set(symptom, res.rows[0].symptom_id);
            }
          }
        }
      }

      // Process medicines (similar pattern for other entities)
      if (medicines) {
        const medicineList = medicines.split(',').map(m => m.trim()).filter(m => m);
        for (const medicine of medicineList) {
          if (!maps.medicines.has(medicine)) {
            const res = await pool.query(
              'INSERT INTO Medicines (name) VALUES ($1) ON CONFLICT (name) DO NOTHING RETURNING medicine_id',
              [medicine]
            );
            if (res.rows[0]) {
              maps.medicines.set(medicine, res.rows[0].medicine_id);
            }
          }
        }
      }

      // Process lab tests
      if (labTests) {
        const labTestList = labTests.split(',').map(l => l.trim()).filter(l => l);
        for (const labTest of labTestList) {
          if (!maps.labTests.has(labTest)) {
            const res = await pool.query(
              'INSERT INTO LabDiagnoses (name) VALUES ($1) ON CONFLICT (name) DO NOTHING RETURNING lab_id',
              [labTest]
            );
            if (res.rows[0]) {
              maps.labTests.set(labTest, res.rows[0].lab_id);
            }
          }
        }
      }

      // Process procedures
      if (procedures) {
        const procedureList = procedures.split(',').map(p => p.trim()).filter(p => p);
        for (const procedure of procedureList) {
          if (!maps.procedures.has(procedure)) {
            const res = await pool.query(
              'INSERT INTO Procedures (name) VALUES ($1) ON CONFLICT (name) DO NOTHING RETURNING procedure_id',
              [procedure]
            );
            if (res.rows[0]) {
              maps.procedures.set(procedure, res.rows[0].procedure_id);
            }
          }
        }
      }

      // Process lifestyle recommendations
      if (lifestyle) {
        const lifestyleList = lifestyle.split(',').map(l => l.trim()).filter(l => l);
        for (const rec of lifestyleList) {
          if (!maps.lifestyleRecs.has(rec)) {
            const res = await pool.query(
              'INSERT INTO lifestyle_recommendations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING RETURNING lifestyle_id',
              [rec]
            );
            if (res.rows[0]) {
              maps.lifestyleRecs.set(rec, res.rows[0].lifestyle_id);
            }
          }
        }
      }

      successCount++;
    } catch (error) {
      console.error(`Error processing row: ${JSON.stringify(row)} -> ${error.message}`);
    }
  }

  console.log(`Processed ${successCount}/${rows.length} rows for entries.`);

  // Now create the mappings
  let mappingSuccessCount = 0;
  for (const row of rows) {
    try {
      const diseaseName = (row.disease || row.Disease).trim();
      const diseaseId = maps.diseases.get(diseaseName);
      
      if (!diseaseId) {
        console.warn(`No disease ID found for ${diseaseName}, skipping mappings`);
        continue;
      }

      // Map symptoms
      if (row.symptoms) {
        const symptomList = row.symptoms.split(',').map(s => s.trim()).filter(s => s);
        for (const symptom of symptomList) {
          const symptomId = maps.symptoms.get(symptom);
          if (symptomId) {
            await pool.query(
              'INSERT INTO DiseaseSymptoms (disease_id, symptom_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
              [diseaseId, symptomId]
            );
          }
        }
      }

      // Map medicines
      if (row.medicines) {
        const medicineList = row.medicines.split(',').map(m => m.trim()).filter(m => m);
        for (const medicine of medicineList) {
          const medicineId = maps.medicines.get(medicine);
          if (medicineId) {
            await pool.query(
              'INSERT INTO DiseaseMedicines (disease_id, medicine_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
              [diseaseId, medicineId]
            );
          }
        }
      }

      // Map lab tests
      if (row.lab_tests) {
        const labTestList = row.lab_tests.split(',').map(l => l.trim()).filter(l => l);
        for (const labTest of labTestList) {
          const labId = maps.labTests.get(labTest);
          if (labId) {
            await pool.query(
              'INSERT INTO DiseaseLabDiagnoses (disease_id, lab_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
              [diseaseId, labId]
            );
          }
        }
      }

      // Map procedures
      if (row.procedures) {
        const procedureList = row.procedures.split(',').map(p => p.trim()).filter(p => p);
        for (const procedure of procedureList) {
          const procedureId = maps.procedures.get(procedure);
          if (procedureId) {
            await pool.query(
              'INSERT INTO DiseaseProcedures (disease_id, procedure_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
              [diseaseId, procedureId]
            );
          }
        }
      }

      // Map lifestyle recommendations
      if (row.lifestyle_recommendations) {
        const lifestyleList = row.lifestyle_recommendations.split(',').map(l => l.trim()).filter(l => l);
        for (const rec of lifestyleList) {
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