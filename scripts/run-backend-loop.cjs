/**
 * Executa o backend e reinicia automaticamente se o processo sair (crash ou exit).
 * Garante que o servidor volte a subir após falhas.
 */
const { spawn } = require('child_process');
const path = require('path');

const root = path.resolve(__dirname, '..');
const backendDir = path.join(root, 'backend');

function run() {
  const child = spawn('npm', ['run', 'dev'], {
    cwd: backendDir,
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, APP_PORT: process.env.APP_PORT || '4000' },
  });

  child.on('exit', (code, signal) => {
    if (code === 0 && !signal) {
      process.exit(0);
      return;
    }
    console.error(
      '[run-backend-loop] Backend saiu. Reiniciando em 2s...',
      code != null ? `(código ${code})` : '',
      signal ? `(sinal ${signal})` : ''
    );
    setTimeout(run, 2000);
  });
}

run();
