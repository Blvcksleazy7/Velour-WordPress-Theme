import { execFile as execFileCallback } from 'node:child_process';
import { constants as fsConstants } from 'node:fs';
import {
  chmod,
  lstat,
  mkdir,
  mkdtemp,
  open,
  readFile,
  readdir,
  realpath,
  rename,
  rm,
  utimes,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFile = promisify(execFileCallback);
const wordpressDirectory = fileURLToPath(new URL('../', import.meta.url));
const sourceDirectory = wordpressDirectory;
const distributionDirectory = path.join(wordpressDirectory, 'dist');
const finalArchive = path.join(distributionDirectory, 'velour-standard.zip');

const themeDirectories = new Set([
  'assets',
  'inc',
  'page-templates',
  'template-parts',
]);

const allowedFiles = [
  '404.php',
  'archive-product.php',
  'assets/images/velour-bundle-complete.avif',
  'assets/images/velour-perfume-display.png',
  'assets/js/velour-presence.js',
  'assets/js/velour.js',
  'footer.php',
  'front-page.php',
  'functions.php',
  'header.php',
  'inc/assets.php',
  'inc/contact.php',
  'inc/presence-profile.php',
  'inc/setup.php',
  'inc/woocommerce.php',
  'index.php',
  'page-templates/about.php',
  'page-templates/bundles.php',
  'page-templates/contact.php',
  'page-templates/presence-profile.php',
  'page.php',
  'search.php',
  'single-product.php',
  'style.css',
  'template-parts/product-card.php',
];

const textExtensions = new Set(['.css', '.js', '.php']);
const forbiddenPatterns = [
  ['Shopify Liquid delimiter', /\{\{|\}\}|\{%|%\}/],
  ['Shopify AJAX endpoint', /\/(?:cart(?:\/add|\/change|\/update|\/clear)?\.js|recommendations\/products\.json|search\/suggest\.json)/i],
  ['private key', /-----BEGIN (?:(?:RSA|EC|OPENSSH|DSA) )?PRIVATE KEY-----|-----BEGIN PGP PRIVATE KEY BLOCK-----/],
  ['private API key or token', /\b(?:(?:sk|rk|pk)_(?:live|test)_[A-Za-z0-9_-]{16,}|sk-[A-Za-z0-9_-]{20,}|(?:AKIA|ASIA)[A-Z0-9]{16}|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|glpat-[A-Za-z0-9_-]{20,}|shpat_[A-Fa-f0-9]{32}|xox[baprs]-[A-Za-z0-9-]{20,})\b/],
  ['bearer credential', /\bBearer\s+[A-Za-z0-9._~+\/-]{16,}={0,2}\b/i],
  ['hard-coded n8n webhook URL', /https?:\/\/[^\s'"<>]*\/webhook(?:-test)?(?:\/[^\s'"<>]*)?/i],
  ['credential-bearing connection URL', /\b(?:postgres(?:ql)?|mysql|mariadb|mongodb(?:\+srv)?|redis|rediss|amqp|amqps):\/\/[^\s/:@]+:[^\s/@]+@[^\s'"<>]+/i],
  ['WordPress key or salt', /\bdefine\s*\(\s*['"](?:AUTH|SECURE_AUTH|LOGGED_IN|NONCE)_(?:KEY|SALT)['"]\s*,\s*['"][^'"\r\n]+['"]/i],
];

const secretAssignmentTargets = [
  ['indexed', /\$[A-Za-z_][A-Za-z0-9_]*(?:\s*\[\s*['"][A-Za-z_][A-Za-z0-9_]*['"]\s*\])*\s*\[\s*['"](?<name>[A-Za-z_][A-Za-z0-9_]*)['"]\s*\]\s*=(?!=|>)\s*/gi],
  ['define', /\bdefine\s*\(\s*['"](?<name>[A-Za-z_][A-Za-z0-9_]*)['"]\s*,\s*/gi],
  ['variable', /(?<![A-Za-z0-9_])\$(?<name>[A-Za-z_][A-Za-z0-9_]*)\s*=(?!=|>)\s*/g],
  ['property', /(?:^|[^A-Za-z0-9_$])["']?(?<name>[A-Za-z_][A-Za-z0-9_]*)["']?\s*(?:=>|:|=(?!=|>))\s*/gim],
];

const phpEnvironmentReference = /^(?:\$_(?:ENV|SERVER)\s*\[\s*['"][A-Za-z_][A-Za-z0-9_]*['"]\s*\])(?:\s*\?\?\s*\$_(?:ENV|SERVER)\s*\[\s*['"][A-Za-z_][A-Za-z0-9_]*['"]\s*\])*/;
const phpGetenvReference = /^getenv\s*\(\s*['"][A-Za-z_][A-Za-z0-9_]*['"]\s*\)/i;
const javascriptEnvironmentReference = /^(?:globalThis\.)?process(?:\?\.|\.)env(?:(?:\?\.|\.)[A-Za-z_$][A-Za-z0-9_$]*|\s*(?:\?\.)?\[\s*['"][A-Za-z_$][A-Za-z0-9_$]*['"]\s*\])/;
const directLiteralValue = /^(?:\s*\()*\s*(?:['"`][^'"`\r\n]+['"`]|[A-Za-z0-9_.\/+\-]{8,})(?=\s*(?:[,;)}\]]|\?>|$))/;
const literalValueOperator = /(?:\?\:|\?\?|\.|\+|\|\||\?|:)\s*['"`][^'"`\r\n]+['"`]/;

const fixedTimestamp = new Date('2000-01-01T00:00:00.000Z');

function toArchivePath(file) {
  return file.split(path.sep).join('/');
}

function isSecretName(name) {
  const normalized = name.toUpperCase();
  return /^(?:AWS_(?:ACCESS_KEY_ID|SECRET_ACCESS_KEY|SESSION_TOKEN)|(?:WORDPRESS_)?(?:AUTH|SECURE_AUTH|LOGGED_IN|NONCE)_(?:KEY|SALT)|(?:[A-Z][A-Z0-9]*_)*(?:API_KEY|API_TOKEN|ACCESS_TOKEN|AUTH_TOKEN|CLIENT_SECRET|PRIVATE_KEY|SECRET_KEY))$/.test(normalized)
    || /(?:^|_)(?:SECRET|TOKEN|PASSWORD|KEY)$/.test(normalized);
}

function isHighRiskSecretName(name) {
  return /(?:^|_)(?:API|ACCESS|AUTH|BEARER|CLIENT|ADMIN|PRIVATE|SECRET|SESSION|REFRESH|DEPLOY|SERVICE|DATABASE|DB|AWS|GITHUB|GITLAB)(?:_|$)/i.test(name)
    || /^(?:SECRET|TOKEN|PASSWORD)$/i.test(name);
}

function readAssignmentValue(contents, valueStart, kind) {
  let quote = '';
  let escaped = false;
  let depth = 0;

  for (let index = valueStart; index < contents.length; index += 1) {
    const character = contents[index];

    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (character === '\\') {
        escaped = true;
      } else if (character === quote) {
        quote = '';
      }
      continue;
    }

    if (character === '"' || character === "'" || character === '`') {
      quote = character;
    } else if (character === '(' || character === '[' || character === '{') {
      depth += 1;
    } else if (character === ')' || character === ']' || character === '}') {
      if (depth === 0) return contents.slice(valueStart, index).trim();
      depth -= 1;
    } else if (depth === 0 && (character === ';' || (character === ',' && kind !== 'variable'))) {
      return contents.slice(valueStart, index).trim();
    } else if (depth === 0 && character === '?' && contents[index + 1] === '>') {
      return contents.slice(valueStart, index).trim();
    }
  }

  return contents.slice(valueStart).trim();
}

function hasForbiddenAssignmentValue(value, name, kind) {
  const runtimeReference = [
    phpEnvironmentReference,
    phpGetenvReference,
    javascriptEnvironmentReference,
  ].map((pattern) => value.match(pattern)).find(Boolean);

  if (runtimeReference) {
    return runtimeReference[0].length !== value.length;
  }

  if (directLiteralValue.test(value) || literalValueOperator.test(value)) {
    return true;
  }

  return kind === 'indexed' || kind === 'define' || isHighRiskSecretName(name);
}

async function collectFiles(directory, relativeDirectory = '') {
  const files = [];
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const relativePath = path.join(relativeDirectory, entry.name);
    const absolutePath = path.join(directory, entry.name);
    const entryStatus = await lstat(absolutePath);

    if (entry.isDirectory() && entryStatus.isDirectory() && !entryStatus.isSymbolicLink()) {
      files.push(...await collectFiles(absolutePath, relativePath));
    } else if (entry.isFile() && entryStatus.isFile() && !entryStatus.isSymbolicLink()) {
      files.push(toArchivePath(relativePath));
    } else {
      throw new Error(`Unsupported theme path: ${toArchivePath(relativePath)}`);
    }
  }

  return files.sort();
}

async function collectThemeFiles() {
  const files = [];
  const entries = await readdir(sourceDirectory, { withFileTypes: true });

  for (const entry of entries) {
    const absolutePath = path.join(sourceDirectory, entry.name);
    const entryStatus = await lstat(absolutePath);

    if (themeDirectories.has(entry.name)) {
      if (!entry.isDirectory() || !entryStatus.isDirectory() || entryStatus.isSymbolicLink()) {
        throw new Error(`Unsupported theme path: ${entry.name}`);
      }
      files.push(...await collectFiles(absolutePath, entry.name));
    } else if (entry.name.endsWith('.php') || entry.name.endsWith('.css')) {
      if (!entry.isFile() || !entryStatus.isFile() || entryStatus.isSymbolicLink()) {
        throw new Error(`Unsupported theme path: ${entry.name}`);
      }
      files.push(entry.name);
    }
  }

  return files.sort();
}

function isContainedBy(root, target) {
  const relative = path.relative(root, target);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

async function assertSourceRoot(expectedIdentity) {
  const sourceStatus = await lstat(sourceDirectory);
  if (!sourceStatus.isDirectory() || sourceStatus.isSymbolicLink()) {
    throw new Error('Theme source root must be a non-symlinked directory');
  }

  const canonicalWordpress = await realpath(wordpressDirectory);
  const canonicalSource = await realpath(sourceDirectory);
  const expectedSource = canonicalWordpress;
  if (canonicalSource !== expectedSource || !isContainedBy(canonicalWordpress, canonicalSource)) {
    throw new Error('Theme source root must be the repository root');
  }

  if (expectedIdentity && (sourceStatus.dev !== expectedIdentity.dev || sourceStatus.ino !== expectedIdentity.ino)) {
    throw new Error('Theme source root changed during packaging');
  }

  return {
    canonicalPath: canonicalSource,
    dev: sourceStatus.dev,
    ino: sourceStatus.ino,
  };
}

async function validateSource() {
  const sourceIdentity = await assertSourceRoot();
  const actualFiles = await collectThemeFiles();
  const allowed = new Set(allowedFiles);

  for (const file of actualFiles) {
    if (!allowed.has(file)) {
      throw new Error(`Unknown theme path: ${file}`);
    }
  }

  for (const file of allowedFiles) {
    if (!actualFiles.includes(file)) {
      throw new Error(`Required theme file is missing: ${file}`);
    }
  }

  await assertSourceRoot(sourceIdentity);
  return sourceIdentity;
}

async function readVerifiedSourceFile(file, sourceIdentity) {
  await assertSourceRoot(sourceIdentity);
  const sourceFile = path.join(sourceDirectory, ...file.split('/'));
  const expectedCanonicalFile = path.join(sourceIdentity.canonicalPath, ...file.split('/'));
  const beforeOpen = await lstat(sourceFile);

  if (!beforeOpen.isFile() || beforeOpen.isSymbolicLink()) {
    throw new Error(`Theme source is not a regular file: ${file}`);
  }

  const canonicalFile = await realpath(sourceFile);
  if (canonicalFile !== expectedCanonicalFile || !isContainedBy(sourceIdentity.canonicalPath, canonicalFile)) {
    throw new Error(`Theme source escaped its expected root: ${file}`);
  }

  const handle = await open(sourceFile, fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0));
  try {
    const openedStatus = await handle.stat();
    if (!openedStatus.isFile() || openedStatus.dev !== beforeOpen.dev || openedStatus.ino !== beforeOpen.ino) {
      throw new Error(`Theme source changed while opening: ${file}`);
    }

    const contents = await handle.readFile();
    const afterOpen = await lstat(sourceFile);
    if (!afterOpen.isFile() || afterOpen.dev !== openedStatus.dev || afterOpen.ino !== openedStatus.ino) {
      throw new Error(`Theme source changed while reading: ${file}`);
    }
    if (await realpath(sourceFile) !== expectedCanonicalFile) {
      throw new Error(`Theme source escaped its expected root while reading: ${file}`);
    }
    await assertSourceRoot(sourceIdentity);
    return contents;
  } finally {
    await handle.close();
  }
}

async function stageTheme(stagingDirectory, sourceIdentity) {
  const stagedTheme = path.join(stagingDirectory, 'velour-standard');
  await mkdir(stagedTheme, { recursive: true });

  for (const file of allowedFiles) {
    const destination = path.join(stagedTheme, file);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, await readVerifiedSourceFile(file, sourceIdentity));
    await chmod(destination, 0o644);
    await utimes(destination, fixedTimestamp, fixedTimestamp);
  }

  const directories = [
    'velour-standard',
    ...new Set(allowedFiles.flatMap((file) => {
      const parts = file.split('/');
      return parts.slice(0, -1).map((_, index) => `velour-standard/${parts.slice(0, index + 1).join('/')}`);
    })),
  ].sort();

  for (const directory of directories) {
    const stagedDirectory = path.join(stagingDirectory, directory);
    await chmod(stagedDirectory, 0o755);
    await utimes(stagedDirectory, fixedTimestamp, fixedTimestamp);
  }

  return directories.map((directory) => `${directory}/`);
}

async function scanStagedTheme(stagingDirectory) {
  const decoder = new TextDecoder('utf-8', { fatal: true });

  for (const file of allowedFiles.filter((entry) => textExtensions.has(path.extname(entry)))) {
    let contents;
    try {
      contents = decoder.decode(await readFile(path.join(stagingDirectory, 'velour-standard', file)));
    } catch (error) {
      throw new Error(`Packaged text file is not valid UTF-8: ${file}`, { cause: error });
    }

    for (const [label, pattern] of forbiddenPatterns) {
      if (pattern.test(contents)) {
        throw new Error(`Forbidden ${label} found in ${file}`);
      }
    }

    for (const [kind, targetPattern] of secretAssignmentTargets) {
      for (const match of contents.matchAll(targetPattern)) {
        const name = match.groups.name;
        if (!isSecretName(name)) continue;

        const valueStart = match.index + match[0].length;
        const value = readAssignmentValue(contents, valueStart, kind);
        if (hasForbiddenAssignmentValue(value, name, kind)) {
          throw new Error(`Forbidden secret assignment found in ${file}`);
        }
      }
    }
  }
}

export async function settleCleanup(operations, primaryError) {
  const results = await Promise.allSettled(
    operations.map((operation) => Promise.resolve().then(operation)),
  );
  const cleanupErrors = results
    .filter((result) => result.status === 'rejected')
    .map((result) => result.reason);

  if (primaryError !== undefined) {
    if (cleanupErrors.length > 0 && typeof primaryError === 'object' && primaryError !== null) {
      try {
        primaryError.cleanupErrors = cleanupErrors;
      } catch {
        // A frozen primary error still takes precedence over cleanup failures.
      }
    }
    throw primaryError;
  }

  if (cleanupErrors.length > 0) {
    throw new AggregateError(cleanupErrors, 'Theme package cleanup failed');
  }
}

async function verifyArchive(archive, expectedEntries) {
  await execFile('/usr/bin/unzip', ['-tq', archive]);
  const { stdout } = await execFile('/usr/bin/unzip', ['-Z1', archive]);
  const entries = stdout.trim().split('\n').filter(Boolean);

  if (JSON.stringify(entries) !== JSON.stringify(expectedEntries)) {
    throw new Error('Archive listing does not match the approved package manifest');
  }
}

async function packageTheme() {
  const sourceIdentity = await validateSource();
  await mkdir(distributionDirectory, { recursive: true });

  const stagingDirectory = await mkdtemp(path.join(tmpdir(), 'velour-theme-package-'));
  const temporaryArchive = path.join(
    distributionDirectory,
    `.velour-standard-${process.pid}-${Date.now()}.zip`,
  );

  let primaryError;
  try {
    const directories = await stageTheme(stagingDirectory, sourceIdentity);
    await scanStagedTheme(stagingDirectory);

    const archiveEntries = [
      ...directories,
      ...allowedFiles.map((file) => `velour-standard/${file}`),
    ];
    await execFile('/usr/bin/zip', ['-X', '-q', temporaryArchive, ...archiveEntries], {
      cwd: stagingDirectory,
    });
    await verifyArchive(temporaryArchive, archiveEntries);
    await rename(temporaryArchive, finalArchive);
  } catch (error) {
    primaryError = error;
  }

  await settleCleanup([
    () => rm(temporaryArchive, { force: true }),
    () => rm(stagingDirectory, { force: true, recursive: true }),
  ], primaryError);
  process.stdout.write(`Created ${path.relative(process.cwd(), finalArchive)}\n`);
}

async function isMainModule() {
  if (!process.argv[1]) return false;
  return await realpath(process.argv[1]) === await realpath(fileURLToPath(import.meta.url));
}

if (await isMainModule()) {
  await packageTheme();
}
