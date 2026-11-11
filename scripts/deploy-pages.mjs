/**
 * Publie le build Vite sur la branche `gh-pages`.
 * Prérequis : dépôt Git initialisé avec un remote `origin` et droits de push.
 *
 * Utilisation : npm run deploy:pages
 */
import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function fail(message) {
  console.error(`\nErreur de déploiement : ${message}\n`);
  process.exit(1);
}

console.log('Construction du jeu…');
try {
  execFileSync(npm, ['run', 'build'], { cwd: root, stdio: 'inherit' });
} catch {
  fail('le build a échoué.');
}

let remote;
try {
  remote = execFileSync('git', ['remote', 'get-url', 'origin'], {
    cwd: root,
    encoding: 'utf8',
  }).trim();
} catch {
  fail('aucun remote Git « origin » configuré.');
}
if (!remote) fail('le remote « origin » est vide.');

const deployDir = mkdtempSync(path.join(tmpdir(), 'doomscroll-pages-'));

function git(args) {
  execFileSync('git', args, { cwd: deployDir, stdio: 'inherit' });
}

try {
  console.log('Préparation de la branche gh-pages…');
  cpSync(path.join(root, 'dist'), deployDir, { recursive: true });
  writeFileSync(path.join(deployDir, '.nojekyll'), '', 'utf8');

  git(['init', '-b', 'gh-pages']);
  git(['config', 'user.name', 'Doomscroll Deploy']);
  git(['config', 'user.email', 'deploy@users.noreply.github.com']);
  git(['add', '-A']);
  git(['commit', '-m', 'Déploiement GitHub Pages']);
  git(['remote', 'add', 'origin', remote]);
  git(['push', '--force', 'origin', 'gh-pages']);

  console.log('\n✓ Build publié sur la branche gh-pages.');
  console.log('  GitHub Pages peut servir cette branche à la racine du site.');
} catch {
  fail('la publication de la branche gh-pages a échoué.');
} finally {
  rmSync(deployDir, { recursive: true, force: true });
}
