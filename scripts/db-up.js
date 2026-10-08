import { execSync } from 'node:child_process';

try {
  execSync('docker compose up -d postgres', { stdio: 'inherit' });
} catch {
  // Check if native PostgreSQL is already running or start it
  try {
    execSync('pg_isready -q');
    console.log('PostgreSQL service is already running on port 5432.');
  } catch {
    try {
      execSync('sudo service postgresql start', { stdio: 'inherit' });
      console.log('PostgreSQL native service started.');
    } catch {
      console.log('Docker and native service not available. Trying WSL...');
      try {
        execSync('wsl -u root service postgresql start', { stdio: 'inherit' });
        console.log('PostgreSQL service is running in WSL on port 5432.');
      } catch (err) {
        console.error('Failed to start PostgreSQL:', err.message);
        process.exit(1);
      }
    }
  }
}
