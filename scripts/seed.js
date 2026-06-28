// scripts/seed.js
// Run ONCE locally to create the admin user and crew members.
// Usage:  node scripts/seed.js
//
// Set all SEED_* variables in your .env before running.

require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool   = require('../src/db/pool');

const ADMIN = {
  firstName: process.env.SEED_ADMIN_FIRST    || 'Admin',
  lastName:  process.env.SEED_ADMIN_LAST     || 'TrainServe',
  email:     process.env.SEED_ADMIN_EMAIL,
  password:  process.env.SEED_ADMIN_PASSWORD,
};

const CREW_MEMBERS = [
  { crewId: process.env.SEED_CREW1_ID || 'CREW001', name: process.env.SEED_CREW1_NAME || 'Crew One',   pin: process.env.SEED_CREW1_PIN },
  { crewId: process.env.SEED_CREW2_ID || 'CREW002', name: process.env.SEED_CREW2_NAME || 'Crew Two',   pin: process.env.SEED_CREW2_PIN },
  { crewId: process.env.SEED_CREW3_ID || 'CREW003', name: process.env.SEED_CREW3_NAME || 'Crew Three', pin: process.env.SEED_CREW3_PIN },
  { crewId: process.env.SEED_CREW4_ID || 'CREW004', name: process.env.SEED_CREW4_NAME || 'Crew Four',  pin: process.env.SEED_CREW4_PIN },
];

// ── Startup guards ────────────────────────────────────────────────────
if (!ADMIN.email || !ADMIN.password) {
  console.error('FATAL: Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD in your .env before seeding.');
  process.exit(1);
}

const missingCrew = CREW_MEMBERS.filter(c => !c.pin);
if (missingCrew.length) {
  console.error('FATAL: Missing PIN for crew members:', missingCrew.map(c => c.crewId).join(', '));
  console.error('Set SEED_CREW1_PIN, SEED_CREW2_PIN, etc. in your .env');
  process.exit(1);
}

async function seed() {
  try {
    console.log('Seeding database...');

    // Admin user
    const passHash = await bcrypt.hash(ADMIN.password, 10);
    await pool.query(
      `INSERT INTO users (first_name, last_name, email, password, role)
       VALUES ($1, $2, $3, $4, 'ADMIN')
       ON CONFLICT (email) DO NOTHING`,
      [ADMIN.firstName, ADMIN.lastName, ADMIN.email.toLowerCase().trim(), passHash]
    );
    console.log('  Admin created:', ADMIN.email);

    // Crew members
    for (const c of CREW_MEMBERS) {
      const pinHash = await bcrypt.hash(String(c.pin), 10);
      await pool.query(
        `INSERT INTO crew (crew_id, name, pin_hash)
         VALUES ($1, $2, $3)
         ON CONFLICT (crew_id) DO NOTHING`,
        [c.crewId, c.name, pinHash]
      );
      console.log('  Crew created:', c.crewId, '-', c.name);
    }

    console.log('\nSeeding complete. You can now sign in.');
  } catch (err) {
    console.error('Seed error:', err.message);
  } finally {
    await pool.end();
  }
}

seed();
