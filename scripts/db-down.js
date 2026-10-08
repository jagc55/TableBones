import { execSync } from 'node:child_process';

try {
  execSync('docker compose down', { stdio: 'inherit' });
} catch {
  try {
    execSync('sudo service postgresql stop', { stdio: 'inherit' });
    console.log('PostgreSQL native service stopped.');
  } catch {
    console.log('Docker and native service not available. Trying WSL...');
    try {
      execSync('wsl -u root service postgresql stop', { stdio: 'inherit' });
      console.log('PostgreSQL service stopped in WSL.');
    } catch (err) {
      console.error('Failed to stop PostgreSQL:', err.message);
    }
  }
}
