#!/usr/bin/env node
/**
 * PeoplePay360 Migration Runner
 * Run from the PROJECT ROOT: node scripts/migrate.js [--seeds]
 * Env vars must be set before running (or use cross-env)
 */

const path = require('path');
const fs = require('fs');
const https = require('https');

// Read .env manually without dotenv dependency
function readEnv(envPath) {
  if (!fs.existsSync(envPath)) return {};
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  const result = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.substring(0, idx).trim();
    const val = trimmed.substring(idx + 1).trim().replace(/^["']|["']$/g, '');
    result[key] = val;
  }
  return result;
}

const envPath = path.resolve(__dirname, '../backend/.env');
const env = readEnv(envPath);

const SUPABASE_URL = env.SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY || 
                    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SECRET_KEY in backend/.env');
  process.exit(1);
}

const match = SUPABASE_URL.match(/https:\/\/([a-z0-9]+)\.supabase\.co/);
if (!match) {
  console.error('❌ Cannot parse project ref from:', SUPABASE_URL);
  process.exit(1);
}
const projectRef = match[1];
console.log(`🔗 Project: ${projectRef}`);

function executeSql(sql) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query: sql });
    const options = {
      hostname: 'api.supabase.com',
      path: `/v1/projects/${projectRef}/database/query`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'Authorization': `Bearer ${SERVICE_KEY}`,
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(json);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${JSON.stringify(json).substring(0, 500)}`));
          }
        } catch {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({});
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data.substring(0, 300)}`));
          }
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(60000, () => { req.destroy(); reject(new Error('Request timeout')); });
    req.write(body);
    req.end();
  });
}

async function runSqlFile(filePath) {
  const sql = fs.readFileSync(filePath, 'utf8');
  const name = path.basename(filePath);
  process.stdout.write(`  📄 ${name} ... `);
  try {
    await executeSql(sql);
    console.log('✅');
    return true;
  } catch (err) {
    console.log(`⚠️  ${err.message.substring(0, 250)}`);
    return false;
  }
}

async function main() {
  const runSeeds = process.argv.includes('--seeds');
  const projectRoot = path.resolve(__dirname, '..');

  console.log('\n🚀 Applying migrations...');
  const migrationsDir = path.join(projectRoot, 'database/migrations');
  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of migrationFiles) {
    await runSqlFile(path.join(migrationsDir, file));
  }

  if (runSeeds) {
    console.log('\n🌱 Applying seeds...');
    const seedsDir = path.join(projectRoot, 'database/seeds');
    const seedFiles = fs.readdirSync(seedsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();
    for (const file of seedFiles) {
      await runSqlFile(path.join(seedsDir, file));
    }
  }

  console.log('\n✅ Done!');
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
