/**
 * Submodel Loader - Loads IDTA submodel templates from local filesystem
 *
 * Strategy:
 * 1. Repository is cloned locally via scripts/download-submodels.js
 * 2. Script generates public/idta-catalog.json index with all metadata
 * 3. This loader reads the pre-indexed catalog from public/ (served by the app)
 * 4. Catalog includes grouped files with versions and latest identification
 *
 * The catalog is built from 'published' directory with:
 * - Files grouped by immediate subdirectory under 'published'
 * - Versions detected from directory structure (semantic versioning)
 * - Latest version identified using semver comparison
 *
 * Setup:
 *   1. Run: node scripts/download-submodels.js
 *   2. This clones the repo and generates public/idta-catalog.json
 *   3. App loads the catalog automatically
 */

export interface SubmodelGroup {
  name: string;
  versions: SubmodelVersion[];
  latestVersion: SubmodelVersion;
}

export interface SubmodelVersion {
  version: string;
  files: SubmodelFile[];
}

export interface SubmodelFile {
  path: string;
  filename: string;
  fileType: 'Template' | 'Example' | 'Sample' | 'Generic';
  metamodel: string;
  idtaCode: string;
}

interface CatalogMetadata {
  generatedAt: string;
  repositoryUrl: string;
  localPath: string;
  groups: number;
  files: number;
  catalog: SubmodelGroup[];
}

const CATALOG_URL = '/idta-catalog.json';
let cachedCatalog: SubmodelGroup[] | null = null;

/**
 * Loads the catalog from the public folder
 * The catalog must be generated first by running: node scripts/download-submodels.js
 */
export async function loadSubmodelTemplates(): Promise<SubmodelGroup[]> {
  // Return cached result if available
  if (cachedCatalog) {
    return cachedCatalog;
  }

  try {
    console.log('📥 Caricamento catalogo dal filesystem locale...');
    const response = await fetch(CATALOG_URL);

    if (!response.ok) {
      throw new Error(
        `Catalogo non trovato (${response.status}). ` +
        'Eseguire prima: node scripts/download-submodels.js'
      );
    }

    const metadata = (await response.json()) as CatalogMetadata;

    console.log(`✅ Catalogo caricato:`, {
      groups: metadata.groups,
      files: metadata.files,
      generatedAt: metadata.generatedAt,
    });

    cachedCatalog = metadata.catalog;
    return metadata.catalog;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    console.error('❌ Errore durante il caricamento del catalogo:', message);

    if (message.includes('Catalogo non trovato')) {
      throw new Error(
        'Il catalogo IDTA non è stato generato. ' +
        'Eseguire il comando:\n' +
        '  cd ' + process.cwd() + '\n' +
        '  node scripts/download-submodels.js'
      );
    }

    throw new Error(`Impossibile caricare il catalogo: ${message}`);
  }
}

/**
 * Loads the content of a JSON file from the local cached repository
 * The file path should be relative to the repository root
 * e.g., "published/Nameplate/1/0/0/Nameplate_Template.json"
 */
export async function fetchSubmodelContent(
  relativePath: string
): Promise<Record<string, unknown>> {
  try {
    // Construct the URL to the cached file
    const fileUrl = `/.cache/submodel-templates/${relativePath}`;

    const response = await fetch(fileUrl);

    if (!response.ok) {
      throw new Error(
        `File non trovato (${response.status}): ${relativePath}`
      );
    }

    const json = (await response.json()) as Record<string, unknown>;
    return json;
  } catch (error) {
    console.error(`Errore durante il caricamento del file ${relativePath}:`, error);
    throw error;
  }
}

/**
 * Gets the URL for a submodel file in the local cache
 * Useful for debugging or direct access
 */
export function getSubmodelFileUrl(relativePath: string): string {
  return `/.cache/submodel-templates/${relativePath}`;
}

/**
 * Health check: verifies that the catalog file exists
 */
export async function checkCatalogAvailability(): Promise<boolean> {
  try {
    const response = await fetch(CATALOG_URL, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Gets information about the catalog generation
 */
export async function getCatalogInfo(): Promise<{
  generatedAt: string;
  repositoryUrl: string;
  localPath: string;
  groups: number;
  files: number;
} | null> {
  try {
    const response = await fetch(CATALOG_URL);
    if (!response.ok) return null;

    const metadata = (await response.json()) as CatalogMetadata;
    return {
      generatedAt: metadata.generatedAt,
      repositoryUrl: metadata.repositoryUrl,
      localPath: metadata.localPath,
      groups: metadata.groups,
      files: metadata.files,
    };
  } catch {
    return null;
  }
}

/**
 * Setup instructions for the user
 */
export function getSetupInstructions(): string {
  return `
SETUP RICHIESTO - Catalog di Submodel Non Generato
════════════════════════════════════════════════════

Il loader funziona con un catalog precompilato dal filesystem locale.

Per completare il setup:

1. Clonare il repository e generare l'indice:
   $ node scripts/download-submodels.js

2. Questo comando:
   • Clona il repository da GitHub (una volta sola)
   • Scopre ricorsivamente tutti i file .json da 'published/'
   • Raggruppa i file per categoria e versione
   • Genera public/idta-catalog.json

3. Avviare l'applicazione normalmente

La procedura richiede:
   • ~1-2 minuti per il clone iniziale
   • ~500 MB di spazio disco
   • Connessione Internet (solo primo esecuzione)

Per aggiornare il catalog successivamente:
   $ node scripts/download-submodels.js

Il comando aggiornerà il repository locale e rigenererà l'indice.
  `;
}
