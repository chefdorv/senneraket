// Applique les migrations de supabase/migrations/ sur la base, dans l'ordre,
// une seule fois chacune.
//
//   npm run db:status              n'applique rien, dit juste où on en est
//   npm run db:migrate             applique ce qui manque
//   npm run db:migrate -- --file supabase/tests/verify_schema.sql
//                                 exécute un fichier sans l'enregistrer
//
// Pourquoi un script maison plutôt que la CLI Supabase : la CLI veut Docker,
// absent de cette machine, et impose des noms de fichiers horodatés. Ici on
// garde 0000, 0001… et une seule dépendance, `pg`.
//
// La garantie qui compte : l'application d'un fichier et son enregistrement
// dans migrations.applied se font dans LA MÊME transaction. Une migration ne
// peut donc pas être passée sans être notée, ni notée sans être passée. Le DDL
// de PostgreSQL étant transactionnel, un échec au milieu d'un fichier laisse
// la base exactement comme avant.

import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..');
const MIGRATIONS_DIR = join(here, 'migrations');
const TRACKING = '0000_suivi_des_migrations.sql';

const USAGE = `
Usage :
  node supabase/apply.mjs                applique les migrations en attente
  node supabase/apply.mjs --status       n'applique rien, liste l'état
  node supabase/apply.mjs --file <x.sql> exécute un fichier sans l'enregistrer
  node supabase/apply.mjs --help         affiche ceci

La connection string se lit dans TEKA_DB_URL (environnement ou .env).
`;

function fail(message) {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

// Lecture du .env sans dépendance : on ne cherche qu'une variable.
function dbUrl() {
  if (process.env.TEKA_DB_URL) return process.env.TEKA_DB_URL;
  let raw;
  try {
    raw = readFileSync(join(repo, '.env'), 'utf8');
  } catch {
    fail("Pas de .env à la racine, et pas de TEKA_DB_URL dans l'environnement.");
  }
  const line = raw.split('\n').find((l) => l.trim().startsWith('TEKA_DB_URL='));
  if (!line) {
    fail(
      'TEKA_DB_URL absent du .env. Récupérer la connection string dans le\n' +
        'dashboard Supabase (Connect > URI), avec le mot de passe de la base.',
    );
  }
  return line
    .slice(line.indexOf('=') + 1)
    .trim()
    .replace(/^["']|["']$/g, '');
}

const sha256 = (s) => createHash('sha256').update(s, 'utf8').digest('hex');

// Analyse stricte des arguments. Un flag inconnu arrête le script au lieu
// d'être ignoré : sur le dépôt voisin, `--help` était compris comme « aucun
// flag reconnu » et appliquait toutes les migrations en attente sur la base
// réelle. Une commande qu'on croit informative ne doit jamais écrire.
const args = process.argv.slice(2);
let statusOnly = false;
let oneOff = null;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--status') {
    statusOnly = true;
  } else if (arg === '--help' || arg === '-h') {
    console.log(USAGE);
    process.exit(0);
  } else if (arg === '--file') {
    oneOff = args[++i];
    if (!oneOff) fail(`--file attend un chemin de fichier.\n${USAGE}`);
  } else {
    fail(`Argument inconnu : ${arg}\n${USAGE}`);
  }
}

if (statusOnly && oneOff) fail('--status et --file ne vont pas ensemble.');

const client = new pg.Client({
  connectionString: dbUrl(),
  ssl: { rejectUnauthorized: false },
});

await client.connect();
client.on('notice', (n) => console.log(`   ${n.message}`));

try {
  // Un fichier ponctuel : on l'exécute et on ne l'enregistre pas. Sert aux
  // scripts de vérification, qui finissent par un rollback.
  if (oneOff) {
    const sql = readFileSync(resolve(process.cwd(), oneOff), 'utf8');
    const res = await client.query(sql);
    for (const r of [res].flat()) {
      if (r.rows?.length) console.table(r.rows);
    }
    console.log(`\n✔ ${oneOff} exécuté (non enregistré).`);
    process.exit(0);
  }

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  if (!files.includes(TRACKING)) {
    fail(`${TRACKING} manquant : c'est lui qui crée le suivi.`);
  }

  // Le suivi doit exister avant de pouvoir consulter le suivi. Ce fichier est
  // écrit pour être idempotent, on le rejoue donc sans condition.
  await client.query(readFileSync(join(MIGRATIONS_DIR, TRACKING), 'utf8'));

  const { rows: known } = await client.query(
    'select filename, checksum, applied_at from migrations.applied',
  );
  const byName = new Map(known.map((r) => [r.filename, r]));

  let applied = 0;
  let skipped = 0;

  for (const file of files) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');
    const sum = sha256(sql);
    const seen = byName.get(file);

    if (seen && seen.checksum === sum) {
      skipped++;
      if (statusOnly) {
        const when = seen.applied_at
          .toISOString()
          .slice(0, 16)
          .replace('T', ' ');
        console.log(`  ✔ ${file}  appliquée le ${when}`);
      }
      continue;
    }

    if (seen && seen.checksum !== sum) {
      fail(
        `${file} a déjà été appliquée, mais son contenu a changé depuis.\n` +
          `  en base : ${seen.checksum.slice(0, 12)}…\n` +
          `  fichier : ${sum.slice(0, 12)}…\n\n` +
          'Une migration déjà passée ne se modifie pas : la base ne suivra pas,\n' +
          "et l'écart restera invisible jusqu'à la prochaine reconstruction.\n" +
          'Écrire une nouvelle migration qui corrige.',
      );
    }

    if (statusOnly) {
      console.log(`  · ${file}  À APPLIQUER`);
      continue;
    }

    // Le point clé : le fichier et son enregistrement dans la même
    // transaction. Le DDL de PostgreSQL étant transactionnel, un échec en
    // cours de route ne laisse pas la base à moitié migrée.
    process.stdout.write(`  → ${file} … `);
    try {
      await client.query('begin');
      await client.query(sql);
      await client.query('select migrations.record($1, $2)', [file, sum]);
      await client.query('commit');
      console.log('appliquée');
      applied++;
    } catch (e) {
      await client.query('rollback');
      console.log('ÉCHEC');
      fail(
        `${file} — ${e.code ?? ''} ${e.message}` +
          `${e.position ? ` (position ${e.position})` : ''}`,
      );
    }
  }

  if (statusOnly) {
    console.log(`\n${skipped} appliquée(s), ${files.length - skipped} en attente.`);
  } else if (applied === 0) {
    console.log(`\n✔ Base à jour — ${skipped} migration(s) déjà appliquée(s).`);
  } else {
    console.log(`\n✔ ${applied} migration(s) appliquée(s), ${skipped} déjà à jour.`);
  }
} finally {
  await client.end();
}
