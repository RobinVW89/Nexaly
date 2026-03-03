import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const outDir = path.join(rootDir, 'dist');

const excludedDirs = new Set([
  '.git',
  'node_modules',
  'dist',
  '.wrangler',
  'scripts',
  'Guide fiscale 02',
  'Nos Véhicules Recommandés 2025'
]);

const excludedFilePatterns = [
  /^\.gitignore$/i,
  /^package\.json$/i,
  /^package-lock\.json$/i,
  /^guide-fiscalite-2026/i,
  /^guide-de-la-fiscalite-2026/i
];

function shouldExcludeFile(fileName) {
  return excludedFilePatterns.some((pattern) => pattern.test(fileName));
}

function copyRecursive(src, dest) {
  const stats = fs.statSync(src);

  if (stats.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      const srcPath = path.join(src, entry);
      const destPath = path.join(dest, entry);
      const rel = path.relative(rootDir, srcPath);
      const topLevel = rel.split(path.sep)[0];

      if (excludedDirs.has(topLevel)) {
        continue;
      }

      if (fs.statSync(srcPath).isFile() && shouldExcludeFile(entry)) {
        continue;
      }

      copyRecursive(srcPath, destPath);
    }
    return;
  }

  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

if (fs.existsSync(outDir)) {
  fs.rmSync(outDir, { recursive: true, force: true });
}

copyRecursive(rootDir, outDir);

console.log('Build terminé: dossier dist généré (contenus internes exclus).');
