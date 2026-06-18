/**
 * Test per il Submodel Loader
 * Verifica che la nuova strategia di acquisizione dei modelli funzioni correttamente
 */

import {
  loadSubmodelTemplates,
  checkCatalogAvailability,
  type SubmodelGroup,
} from './submodel-loader';

/**
 * Utility per il confronto di versioni semantiche
 */
function compareVersionStrings(a: string, b: string): number {
  const partsA = a.split('.').map(p => parseInt(p, 10) || 0);
  const partsB = b.split('.').map(p => parseInt(p, 10) || 0);
  
  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const numA = partsA[i] || 0;
    const numB = partsB[i] || 0;
    if (numA !== numB) return numA - numB;
  }
  return 0;
}

/**
 * Test 1: Verifica disponibilità del catalogo locale
 */
export async function testCatalogAvailability(): Promise<boolean> {
  console.log('🧪 Test 1: Verifica disponibilità del catalogo locale...');
  try {
    const isAvailable = await checkCatalogAvailability();
    console.log(`  ${isAvailable ? '✅' : '❌'} Catalogo ${isAvailable ? 'disponibile' : 'non disponibile'}`);
    return isAvailable;
  } catch (error) {
    console.error('  ❌ Errore durante il test:', error);
    return false;
  }
}

/**
 * Test 2: Carica e valida la struttura dei gruppi di modelli
 */
export async function testLoadSubmodelTemplates(): Promise<SubmodelGroup[] | null> {
  console.log('🧪 Test 2: Carica i template dei submodel...');
  try {
    const groups = await loadSubmodelTemplates();

    console.log(`  ✅ Caricati ${groups.length} gruppi di modelli`);

    if (groups.length > 0) {
      const firstGroup = groups[0]!;
      console.log(`  📦 Primo gruppo: "${firstGroup.name}"`);
      console.log(`     - Versioni disponibili: ${firstGroup.versions.length}`);
      console.log(`     - Versione più recente: ${firstGroup.latestVersion.version}`);
      console.log(`     - File nella versione più recente: ${firstGroup.latestVersion.files.length}`);

      if (firstGroup.latestVersion.files.length > 0) {
        const firstFile = firstGroup.latestVersion.files[0]!;
        console.log(`     - Primo file: ${firstFile.filename}`);
        console.log(`       - Tipo: ${firstFile.fileType}`);
        console.log(`       - Metamodel: ${firstFile.metamodel}`);
        console.log(`       - IDTA Code: ${firstFile.idtaCode || '(non disponibile)'}`);
      }
    }

    // Verifica che tutti i gruppi abbiano la struttura corretta
    const allValid = groups.every(
      group =>
        group.name &&
        Array.isArray(group.versions) &&
        group.latestVersion &&
        group.versions.every(v => v.version && Array.isArray(v.files))
    );

    if (allValid) {
      console.log(`  ✅ Struttura dei dati validata`);
    } else {
      console.warn(`  ⚠️  Alcuni gruppi hanno struttura non valida`);
    }

    return groups;
  } catch (error) {
    console.error('  ❌ Errore durante il caricamento:', error);
    return null;
  }
}

export async function testVersioning(): Promise<boolean> {
  console.log('🧪 Test 3: Valida il versioning...');
  try {
    const groups = await loadSubmodelTemplates();

    if (groups.length === 0) {
      console.log('  ⚠️  Nessun gruppo trovato per validare il versioning');
      return true;
    }

    // Controlla che la versione più recente sia effettivamente la più alta
    let allCorrect = true;
    for (const group of groups.slice(0, 3)) {
      // Controlla solo i primi 3 per velocità
      const latestVersionStr = group.latestVersion.version;
      const allVersionsAreConsistent = group.versions.every(v => {
        // Semplice controllo: la versione più recente deve essere uguale a latestVersion
        return v.version === latestVersionStr || compareVersionStrings(v.version, latestVersionStr) <= 0;
      });

      if (allVersionsAreConsistent) {
        console.log(`  ✅ ${group.name}: versione più recente corretta (${group.latestVersion.version})`);
      } else {
        console.warn(`  ⚠️  ${group.name}: versione più recente potrebbe essere scorretta`);
        allCorrect = false;
      }
    }

    return allCorrect;
  } catch (error) {
    console.error('  ❌ Errore durante la validazione:', error);
    return false;
  }
}

/**
 * Esegui tutti i test
 */
export async function runAllTests(): Promise<void> {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('   Submodel Loader - Suite di Test');
  console.log('═══════════════════════════════════════════════════════\n');

  const results = {
    catalogAvailability: false,
    loadTemplates: false,
    versioning: false,
  };

  try {
    results.catalogAvailability = await testCatalogAvailability();
    console.log();

    if (!results.catalogAvailability) {
      console.warn('⚠️  Catalogo locale non disponibile. Esegui: npm run download-submodels\n');
    }

    const groups = await testLoadSubmodelTemplates();
    results.loadTemplates = groups !== null;
    console.log();

    if (results.loadTemplates) {
      results.versioning = await testVersioning();
      console.log();
    }
  } catch (error) {
    console.error('Errore durante l\'esecuzione dei test:', error);
  }

  console.log('═══════════════════════════════════════════════════════');
  console.log('   Risultati');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`Catalog Availability: ${results.catalogAvailability ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Load Templates:       ${results.loadTemplates ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Versioning:           ${results.versioning ? '✅ PASS' : '❌ FAIL'}`);
  console.log('═══════════════════════════════════════════════════════\n');
}
