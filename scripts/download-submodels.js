#!/usr/bin/env node

/**
 * Script per scaricare e indicizzare il repository IDTA submodel-templates
 *
 * Utilizzo:
 *   node scripts/download-submodels.js
 *
 * Output:
 *   public/idta-catalog.json - Indice dei file JSON con metadati
 *   .cache/submodel-templates/ - Repository clonato (Git)
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REPO_URL = 'https://github.com/admin-shell-io/submodel-templates.git';
const CACHE_DIR = path.join(__dirname, '..', '.cache', 'submodel-templates');
const PUBLISHED_DIR = path.join(CACHE_DIR, 'published');
const OUTPUT_FILE = path.join(__dirname, '..', 'public', 'idta-catalog.json');

// Colori per l'output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.bright}${colors.blue}${msg}${colors.reset}`),
};

/**
 * Trova il percorso di git nel sistema
 */
function findGitCommand() {
  try {
    // Try git in PATH first
    execSync('git --version', { stdio: 'ignore' });
    return 'git';
  } catch {
    // Try common Windows locations
    const commonPaths = [
      'C:\\Program Files\\Git\\bin\\git.exe',
      'C:\\Program Files (x86)\\Git\\bin\\git.exe',
      'C:\\Program Files\\Git For Windows\\cmd\\git.exe',
    ];
    
    for (const gitPath of commonPaths) {
      if (fs.existsSync(gitPath)) {
        return gitPath;
      }
    }
    
    throw new Error('Git non trovato nel sistema. Installa Git da https://git-scm.com/');
  }
}

const gitCommand = findGitCommand();

/**
 * Esegue un comando shell
 */
function exec(command, options = {}) {
  try {
    // Quote git command if it contains spaces
    let finalCommand = command;
    if (command.includes(gitCommand) && gitCommand.includes(' ')) {
      finalCommand = command.replace(gitCommand, `"${gitCommand}"`);
    }
    
    const output = execSync(finalCommand, {
      stdio: 'pipe',
      encoding: 'utf-8',
      ...options,
    });
    return output.trim();
  } catch (error) {
    throw new Error(`Comando fallito: ${command}\n${error.message}`);
  }
}

/**
 * Clona il repository se non esiste
 */
function ensureRepoCloned() {
  log.header('Passo 1: Clone Repository');

  if (fs.existsSync(PUBLISHED_DIR)) {
    log.info(`Repository già presente in ${PUBLISHED_DIR}`);
    log.info('Aggiornamento in corso...');
    try {
      exec(`${gitCommand} -C ${CACHE_DIR} pull origin main`, { stdio: 'ignore' });
      log.success('Repository aggiornato');
    } catch (error) {
      log.warn('Impossibile aggiornare il repository (continuo comunque)');
    }
    return;
  }

  log.info(`Clonazione repository da ${REPO_URL}...`);
  try {
    fs.mkdirSync(path.dirname(CACHE_DIR), { recursive: true });
    exec(`${gitCommand} clone --depth 1 ${REPO_URL} ${CACHE_DIR}`);
    log.success('Repository clonato con successo');
  } catch (error) {
    log.error(`Errore durante il clone: ${error.message}`);
    throw error;
  }
}

/**
 * Estrae metadati da un nome file
 */
function parseFileMetadata(filename) {
  let fileType = 'Generic';
  if (filename.includes('_Template_')) fileType = 'Template';
  else if (filename.includes('_Example_')) fileType = 'Example';
  else if (filename.includes('_Sample_')) fileType = 'Sample';

  // Extract metamodel version: "forAASMetamodelV3.1" → "3.1"
  const metamodelMatch = filename.match(/forAASMetamodelV(\d+(?:[._]\d+)*)/i);
  const metamodel = metamodelMatch ? metamodelMatch[1].replace('_', '.') : '3.0';

  // Extract IDTA code: "IDTA12345" or "IDTA-12345" → "IDTA 12345"
  const idtaMatch = filename.match(/IDTA[- ]?(\d+)/i);
  const idtaCode = idtaMatch ? `IDTA ${idtaMatch[1]}` : '';

  return { fileType, metamodel, idtaCode };
}

/**
 * Scopre ricorsivamente tutti i file JSON sotto published/
 */
function discoverJsonFiles() {
  log.header('Passo 2: Discover JSON Files');

  if (!fs.existsSync(PUBLISHED_DIR)) {
    throw new Error(`Cartella published non trovata: ${PUBLISHED_DIR}`);
  }

  const files = [];
  const visited = new Set();

  function walk(dir, depth = 0) {
    if (depth > 10 || visited.has(dir)) return; // Limit depth
    visited.add(dir);

    try {
      const entries = fs.readdirSync(dir);
      for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        const stat = fs.statSync(fullPath);

        if (stat.isFile() && entry.endsWith('.json')) {
          const relativePath = path.relative(PUBLISHED_DIR, fullPath).replace(/\\/g, '/');
          files.push({ path: relativePath, filename: entry });
        } else if (stat.isDirectory()) {
          walk(fullPath, depth + 1);
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
  }

  walk(PUBLISHED_DIR);
  log.success(`Trovati ${files.length} file JSON`);
  return files;
}

/**
 * Raggruppa i file per categoria e versione
 */
function groupAndVersionFiles(files) {
  log.header('Passo 3: Group and Version');

  const groups = {};

  for (const file of files) {
    // published/Nameplate/1/0/0/file.json
    const parts = file.path.split('/');
    if (parts.length < 2) continue;

    const groupName = parts[0];
    const versionParts = parts.slice(1, -1);
    const version = versionParts.join('.');

    if (!groups[groupName]) {
      groups[groupName] = {};
    }
    if (!groups[groupName][version]) {
      groups[groupName][version] = [];
    }

    const metadata = parseFileMetadata(file.filename);
    groups[groupName][version].push({
      path: `published/${file.path}`,
      filename: file.filename,
      fileType: metadata.fileType,
      metamodel: metadata.metamodel,
      idtaCode: metadata.idtaCode,
    });
  }

  log.success(`Raggruppati in ${Object.keys(groups).length} categorie`);
  return groups;
}

/**
 * Identifica la versione più recente usando semver
 */
function compareVersions(a, b) {
  const partsA = a.split('.').map(Number);
  const partsB = b.split('.').map(Number);

  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const numA = partsA[i] || 0;
    const numB = partsB[i] || 0;
    if (numA !== numB) return numA - numB;
  }
  return 0;
}

/**
 * Costruisce la struttura finale con versioni e latest
 */
function buildCatalogStructure(groups) {
  log.header('Passo 4: Build Catalog Structure');

  const catalog = [];

  for (const [groupName, versions] of Object.entries(groups)) {
    const versionEntries = [];
    let latestVersion = null;
    let latestVersionStr = '0.0.0';

    for (const [versionStr, files] of Object.entries(versions)) {
      versionEntries.push({
        version: versionStr,
        files: files,
      });

      // Track latest version
      if (compareVersions(versionStr, latestVersionStr) > 0) {
        latestVersionStr = versionStr;
        latestVersion = {
          version: versionStr,
          files: files,
        };
      }
    }

    // Sort versions descending
    versionEntries.sort((a, b) => compareVersions(b.version, a.version));

    catalog.push({
      name: groupName,
      versions: versionEntries,
      latestVersion: latestVersion || {
        version: '0.0.0',
        files: [],
      },
    });
  }

  // Sort by name
  catalog.sort((a, b) => a.name.localeCompare(b.name));

  log.success(`Catalogo costruito con ${catalog.length} gruppi`);
  return catalog;
}

/**
 * Scrive il catalogo in un file JSON
 */
function writeCatalog(catalog) {
  log.header('Passo 5: Write Catalog');

  const outputDir = path.dirname(OUTPUT_FILE);
  fs.mkdirSync(outputDir, { recursive: true });

  const metadata = {
    generatedAt: new Date().toISOString(),
    repositoryUrl: REPO_URL,
    localPath: PUBLISHED_DIR,
    groups: catalog.length,
    files: catalog.reduce((sum, g) => sum + g.versions.reduce((s, v) => s + v.files.length, 0), 0),
    catalog: catalog,
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(metadata, null, 2));
  log.success(`Catalogo scritto in ${OUTPUT_FILE}`);
  return OUTPUT_FILE;
}

/**
 * Main
 */
async function main() {
  try {
    console.log(`\n${colors.bright}${colors.blue}═══════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.bright}IDTA Submodel Catalog Generator${colors.reset}`);
    console.log(`${colors.bright}${colors.blue}═══════════════════════════════════════════════════${colors.reset}\n`);

    ensureRepoCloned();
    const files = discoverJsonFiles();
    const grouped = groupAndVersionFiles(files);
    const catalog = buildCatalogStructure(grouped);
    const outputPath = writeCatalog(catalog);

    console.log(`\n${colors.bright}${colors.green}═══════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.green}✓ Successo!${colors.reset}`);
    console.log(`${colors.bright}${colors.green}═══════════════════════════════════════════════════${colors.reset}\n`);

    log.success(`Catalogo generato: ${outputPath}`);
    log.info(`Gruppi: ${catalog.length}`);
    log.info(`File totali: ${catalog.reduce((sum, g) => sum + g.versions.reduce((s, v) => s + v.files.length, 0), 0)}`);
    log.info(`Versione più recente disponibile per ogni gruppo`);

    console.log();
  } catch (error) {
    console.log(`\n${colors.bright}${colors.red}═══════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.red}✗ Errore!${colors.reset}`);
    console.log(`${colors.bright}${colors.red}═══════════════════════════════════════════════════${colors.reset}\n`);
    log.error(error.message);
    process.exit(1);
  }
}

main();
