import { execSync } from 'node:child_process';

try {
  execSync('docker compose up -d postgres', { stdio: 'inherit' });
} catch {
  console.log('Docker not available. Falling back to WSL PostgreSQL service...');
  try {
    execSync('wsl -u root service postgresql start', { stdio: 'inherit' });
    console.log('PostgreSQL service is running in WSL on port 5432.');
  } catch (err) {
    console.error('Failed to start PostgreSQL:', err.message);
    process.exit(1);
  }
}
