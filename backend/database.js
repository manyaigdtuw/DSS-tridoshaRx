import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Render sets this automatically
  ssl: {
    rejectUnauthorized: false
  }
});


export default pool;