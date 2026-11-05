require('../config/config'); // Load the server .env before creating Prisma Client.

const { execSync } = require('child_process');
const prisma = require('../config/prisma');

const INITIAL_MIGRATION = '20261028112706_init';

async function deployMigrations() {
  const [tables] = await prisma.$queryRaw`
    SELECT
      to_regclass('public.employees')::text AS employees_table,
      to_regclass('public._prisma_migrations')::text AS migrations_table
  `;

  // Older deployments may have been initialized with `prisma db push`, which
  // creates the schema without recording the baseline migration. In that case,
  // mark the existing schema as the initial migration before deploying deltas.
  if (tables.employees_table) {
    let initialApplied = false;
    if (tables.migrations_table) {
      const [result] = await prisma.$queryRaw`
        SELECT EXISTS (
          SELECT 1 FROM "_prisma_migrations"
          WHERE "migration_name" = ${INITIAL_MIGRATION}
            AND "rolled_back_at" IS NULL
        ) AS applied
      `;
      initialApplied = result.applied;
    }

    if (!initialApplied) {
      console.log(`Existing FaceHR schema found; baselining ${INITIAL_MIGRATION}.`);
      execSync(`npx prisma migrate resolve --applied ${INITIAL_MIGRATION}`, { stdio: 'inherit' });
    }
  }

  execSync('npx prisma migrate deploy', { stdio: 'inherit' });
}

deployMigrations()
  .catch((error) => {
    console.error('Database migration deploy failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
