const fs = require('fs');
const path = require('path');
const logger = require('../src/utils/logger');
const { logarErro } = require('../src/utils/errorHelpers');

const root = path.resolve(__dirname, '..');
const source = path.join(root, 'node_modules', 'imask', 'dist', 'imask.min.js');
const sourceMap = path.join(
  root,
  'node_modules',
  'imask',
  'dist',
  'imask.min.js.map'
);
const destRoot = path.join(root, 'src', 'public', 'vendor', 'imask');
const destFile = path.join(destRoot, 'imask.min.js');
const destMap = path.join(destRoot, 'imask.min.js.map');

function assertExists(filePath, label) {
  if (!fs.existsSync(filePath)) {
    const err = new Error(`${label} nao encontrado: ${filePath}`);
    logarErro('copy-imask', err);
    throw err;
  }
}

function ensureCleanDir(dirPath) {
  fs.rmSync(dirPath, { recursive: true, force: true });
  fs.mkdirSync(dirPath, { recursive: true });
}

function copyImask() {
  assertExists(source, 'Arquivo IMask');

  ensureCleanDir(destRoot);
  fs.copyFileSync(source, destFile);

  if (fs.existsSync(sourceMap)) {
    fs.copyFileSync(sourceMap, destMap);
  }

  logger.info('IMask sincronizado em src/public/vendor/imask', 'copy-imask');
}

try {
  copyImask();
} catch (error) {
  logarErro('copy-imask', error);
  process.exit(1);
}
