import { execSync } from 'node:child_process';

try {
  execSync('docker compose down', { stdio: 'inherit' });
} catch {
  console.log('Docker not available. Stopping WSL PostgreSQL service...');
  try {
    execSync('wsl -u root service postgresql stop', { stdio: 'inherit' });
    console.log('PostgreSQL service stopped in WSL.');
  } catch (err) {
    console.error('Failed to stop PostgreSQL:', err.message);
  }
}
