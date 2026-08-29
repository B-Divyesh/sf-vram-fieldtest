import { cp, mkdir, readFile, rm, unlink, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const out = resolve(root, 'dist/site');
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
await cp(resolve(root, 'site/src'), out, { recursive: true });
await cp(resolve(root, 'site/public'), out, { recursive: true });
await cp(resolve(root, 'staticwebapp.config.json'), resolve(out, 'staticwebapp.config.json'));
const packageData = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
const origin = 'https://vram-fieldtest.sociobot.in';
const routeMeta = {
  '/': ['VRAM Field Test — Test GPU memory', 'Test GPU memory and save a clear report before you buy or resell.'],
  '/demo': ['Demo — VRAM Field Test', 'View a bundled GPU memory test report with sample data that is never saved.'],
  '/report-kit': ['Report Kit — VRAM Field Test', 'Turn a local VRAM Field Test report into a printable cover and batch labels.'],
  '/privacy': ['Privacy — VRAM Field Test', 'Read how VRAM Field Test stores local reports and optional license data.'],
  '/terms': ['Terms — VRAM Field Test', 'Read the safety, license, and warranty terms for VRAM Field Test.'],
  '/404.html': ['Page not found — VRAM Field Test', 'This VRAM Field Test page could not be found.']
};
const pageHead = (html, route) => {
  const [title, description] = routeMeta[route];
  const canonical = `${origin}${route}`;
  return html
    .replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`)
    .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${description}">`)
    .replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${canonical}">`)
    .replace(/(<meta property="og:title" content=")[^"]*(">)/, `$1${title}$2`)
    .replace(/(<meta property="og:description" content=")[^"]*(">)/, `$1${description}$2`)
    .replace(/(<meta name="twitter:title" content=")[^"]*(">)/, `$1${title}$2`)
    .replace(/(<meta name="twitter:description" content=")[^"]*(">)/, `$1${description}$2`);
};
const releaseTag = `v${packageData.version}`;
let sourceCommit;
try {
  sourceCommit = execFileSync('git', ['rev-parse', `${releaseTag}^{commit}`], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
} catch {
  sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
}
await writeFile(resolve(out, 'release.json'), `${JSON.stringify({ tag: releaseTag, source_commit: sourceCommit }, null, 2)}\n`);
const assetDir = resolve(out, 'assets');
await mkdir(assetDir, { recursive: true });
const hash = content => createHash('sha256').update(content).digest('hex').slice(0, 12);
const app = await readFile(resolve(root, 'site/src/app.js'));
const css = await readFile(resolve(root, 'site/src/styles.css'));
const appName = `app.${hash(app)}.js`;
const cssName = `styles.${hash(css)}.css`;
await writeFile(resolve(assetDir, appName), app);
await writeFile(resolve(assetDir, cssName), css);
let index = await readFile(resolve(out, 'index.html'), 'utf8');
index = index.replace('/styles.css', `/assets/${cssName}`).replace('/app.js', `/assets/${appName}`);
await writeFile(resolve(out, 'index.html'), pageHead(index, '/'));
for (const route of ['demo', 'report-kit', 'privacy', 'terms']) {
  const routeDir = resolve(out, route);
  await mkdir(routeDir, { recursive: true });
  await writeFile(resolve(routeDir, 'index.html'), pageHead(index, `/${route}`));
}
let notFound = await readFile(resolve(out, '404.html'), 'utf8');
notFound = notFound.replace('/styles.css', `/assets/${cssName}`);
await writeFile(resolve(out, '404.html'), pageHead(notFound, '/404.html'));
let worker = await readFile(resolve(root, 'site/public/sw.js'), 'utf8');
worker = worker.replaceAll('/app.js', `/assets/${appName}`).replaceAll('/styles.css', `/assets/${cssName}`);
await writeFile(resolve(out, 'sw.js'), worker);
await unlink(resolve(out, 'app.js'));
await unlink(resolve(out, 'styles.css'));
console.log(`Static site built at ${out}`);
