import fs from 'fs';
import csv from 'csv-parser';
import pool from './database.js';

async function processRow(row, pool, maps) {
  const { diseases, symptoms, medicines, labTests, procedures } = maps;

  try {
    // Normalize keys (handle different casing)
    const diseaseName = row.disease || row.Disease;
    const symptom = row.symptoms || row.Symptom;
    const medicine = row.medicines || row.Medicine;
    const labTest = row.lab_tests || row.labTests || row.LabTests;
    const procedure = row.procedures || row.Procedures;

    if (diseaseName) {
      const clean = diseaseName.trim();
      if (clean && !diseases.has(clean)) {
        const diseaseRes = await pool.query(
          'INSERT INTO Diseases (name) VALUES ($1) ON CONFLICT (name) DO NOTHING RETURNING disease_id',
          [clean]
        );
        diseases.set(clean, diseaseRes.rows?.[0]?.disease_id || null);
      }
    }

    if (symptom) {
      const symptomList = symptom.split(',');
      for (const s of symptomList) {
        const trimmed = s.trim();
        if (trimmed && !symptoms.has(trimmed)) {
          const res = await pool.query(
            'INSERT INTO Symptoms (name) VALUES ($1) ON CONFLICT (name) DO NOTHING RETURNING symptom_id',
            [trimmed]
          );
          symptoms.set(trimmed, res.rows?.[0]?.symptom_id || null);
        }
      }
    }

    if (medicine) {
      const medicineList = medicine.split(',');
      for (const m of medicineList) {
        const trimmed = m.trim();
        if (trimmed && !medicines.has(trimmed)) {
          const res = await pool.query(
            'INSERT INTO Medicines (name) VALUES ($1) ON CONFLICT (name) DO NOTHING RETURNING medicine_id',
            [trimmed]
          );
          medicines.set(trimmed, res.rows?.[0]?.medicine_id || null);
        }
      }
    }

    if (labTest) {
      const labList = labTest.split(',');
      for (const l of labList) {
        const trimmed = l.trim();
        if (trimmed && !labTests.has(trimmed)) {
          const res = await pool.query(
            'INSERT INTO LabDiagnoses (name) VALUES ($1) ON CONFLICT (name) DO NOTHING RETURNING lab_id',
            [trimmed]
          );
          labTests.set(trimmed, res.rows?.[0]?.lab_id || null);
        }
      }
    }

    if (procedure) {
      const procedureList = procedure.split(',');
      for (const p of procedureList) {
        const trimmed = p.trim();
        if (trimmed && !procedures.has(trimmed)) {
          const res = await pool.query(
            'INSERT INTO Procedures (name) VALUES ($1) ON CONFLICT (name) DO NOTHING RETURNING procedure_id',
            [trimmed]
          );
          procedures.set(trimmed, res.rows?.[0]?.procedure_id || null);
        }
      }
    }

    return true;
  } catch (error) {
    console.error(`Error on row: ${JSON.stringify(row)} -> ${error.message}`);
    return false;
  }
}

async function processCSV(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found at ${filePath}`);
    process.exit(1);
  }

  const maps = {
    diseases: new Map(),
    symptoms: new Map(),
    medicines: new Map(),
    labTests: new Map(),
    procedures: new Map()
  };

  const rows = [];
  let successCount = 0;

  console.log('Starting CSV processing...');

  await new Promise((resolve) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => rows.push(row))
      .on('end', resolve);
  });

  for (const row of rows) {
    if (await processRow(row, pool, maps)) {
      successCount++;
    }
  }

  console.log(`\nProcessing complete. Successfully processed ${successCount}/${rows.length} rows.`);
  console.log("Connected to DB:", pool.options.database);

  await pool.end();
  console.log('Database connection closed.');
}

processCSV(process.argv[2])
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Script failed:', err);
    process.exit(1);
  });

export { processRow };
