const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { Client, neonConfig } = require('@neondatabase/serverless');
const { NeonWebSocket } = require('../config/neonSocket');

neonConfig.webSocketConstructor = NeonWebSocket;

const migrationsDir = path.join(__dirname, '..', 'prisma', 'migrations');

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set in server/.env');
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const { rows } = await client.query(`SELECT to_regclass('public.employees')::text AS employees`);
  if (rows[0].employees) {
    console.log('Schema already present; nothing to apply.');
    await client.end();
    return;
  }

  const migrations = fs
    .readdirSync(migrationsDir)
    .filter((name) => fs.statSync(path.join(migrationsDir, name)).isDirectory())
    .sort();

  for (const name of migrations) {
    const sqlPath = path.join(migrationsDir, name, 'migration.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    console.log(`Applying ${name}...`);
    await client.query(sql);
  }

  console.log('Schema applied successfully. Restart the server.');
  await client.end();
}

main().catch((err) => {
  console.error('Failed to apply schema:', err.message);
  process.exit(1);
});
