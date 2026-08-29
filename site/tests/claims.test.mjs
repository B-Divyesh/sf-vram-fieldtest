import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { cpSync, existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { createLicenseHandler, ALLOWANCE, WINDOW_SECONDS } = require('../../api/license-verify/index.js');

test('regression: package lock is synchronized and supports npm ci', () => {
  const dir = mkdtempSync(join(tmpdir(), 'vram-lock-'));
  try {
    cpSync('package.json', join(dir, 'package.json'));
    cpSync('package-lock.json', join(dir, 'package-lock.json'));
    execFileSync('npm', ['ci', '--ignore-scripts', '--no-audit', '--no-fund'], { cwd: dir, stdio: 'pipe' });
    const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
    const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
    assert.equal(pkg.packageManager, 'npm@10.9.8');
    assert.equal(lock.packages[''].version, pkg.version);
    assert.deepEqual(lock.packages[''].devDependencies, pkg.devDependencies);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('@claim:demo-report CLI demo writes JSON and print report', () => {
  const out = execFileSync('cargo', ['run', '--quiet', '--', 'demo', '--json'], { encoding: 'utf8' });
  const response = JSON.parse(out);
  const report = JSON.parse(readFileSync(`${response.output}/report.json`, 'utf8'));
  assert.equal(response.mode, 'demo');
  assert.equal(report.patterns.length, 3);
  assert.equal(report.limits.coverage_percent, 93.75);
  assert.ok(existsSync(`${response.output}/report.html`));
  rmSync(response.output, { recursive: true, force: true });
});

test('@claim:demo-sample CLI demo works without a network dependency', () => {
  const source = readFileSync('src/main.rs', 'utf8');
  assert.match(source, /include_str!\("\.\.\/examples\/sample-report\.json"\)/);
  assert.match(source, /std::env::temp_dir\(\)/);
  assert.doesNotMatch(source.slice(source.indexOf('Cmd::Demo'), source.indexOf('Cmd::Run')), /reqwest|https?:\/\//);
  const out = execFileSync('target/debug/vram-fieldtest', ['demo', '--json'], {
    encoding: 'utf8',
    env: { ...process.env, HTTP_PROXY: 'http://127.0.0.1:1', HTTPS_PROXY: 'http://127.0.0.1:1', NO_PROXY: '' }
  });
  const response = JSON.parse(out);
  assert.ok(existsSync(`${response.output}/report.json`));
  rmSync(response.output, { recursive: true, force: true });
});

test('@claim:cli-local CLI has no telemetry or network client', () => {
  const source = readFileSync('src/main.rs', 'utf8');
  const dependencies = execFileSync('cargo', ['tree', '--prefix', 'none'], { encoding: 'utf8' });
  assert.doesNotMatch(source, /TcpStream|UdpSocket|reqwest|https?:\/\//);
  assert.doesNotMatch(dependencies, /^(reqwest|hyper|ureq|telemetry)\s/vm);
});

test('@claim:safety-consent real runs require explicit consent', () => {
  const result = spawnSync('target/debug/vram-fieldtest', ['run', '--mib', '1'], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /pass --yes/);
});

test('@claim:high-vram-coverage 96 GiB plans cover at least 90 percent in multiple windows', () => {
  const output = execFileSync('target/debug/vram-fieldtest', ['plan', '--detected-mib', '98304', '--coverage', '90', '--window-mib', '16384', '--json'], { encoding: 'utf8' });
  const plan = JSON.parse(output);
  assert.ok(plan.coverage_percent >= 90);
  assert.equal(plan.requested_mib, 88474);
  assert.equal(plan.windows, 6);
});

test('@claim:installer-checksum shell installer downloads, verifies, and installs', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'vram-installer-'));
  const stage = join(dir, 'stage');
  const install = join(dir, 'bin');
  mkdirSync(stage);
  writeFileSync(join(stage, 'vram-fieldtest'), '#!/bin/sh\necho sample\n', { mode: 0o755 });
  execFileSync('tar', ['-C', stage, '-czf', join(dir, 'vram-fieldtest-linux-x86_64.tar.gz'), 'vram-fieldtest']);
  const archive = readFileSync(join(dir, 'vram-fieldtest-linux-x86_64.tar.gz'));
  const sum = createHash('sha256').update(archive).digest('hex');
  const sourceCommit = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  const server = createServer((req, res) => {
    const base = `http://127.0.0.1:${server.address().port}`;
    if (req.url === '/release') return res.end(JSON.stringify({ tag_name: 'v0.1.3', assets: [
      { browser_download_url: `${base}/vram-fieldtest-linux-x86_64.tar.gz` },
      { browser_download_url: `${base}/SHA256SUMS` },
      { browser_download_url: `${base}/PROVENANCE.json` }
    ] }, null, 2));
    if (req.url === '/identity') return res.end(JSON.stringify({ tag: 'v0.1.3', source_commit: sourceCommit }, null, 2));
    if (req.url === '/commit') return res.end(JSON.stringify({ sha: sourceCommit }, null, 2));
    if (req.url === '/vram-fieldtest-linux-x86_64.tar.gz') return res.end(archive);
    if (req.url === '/SHA256SUMS') return res.end(`${sum}  vram-fieldtest-linux-x86_64.tar.gz\n`);
    if (req.url === '/PROVENANCE.json') return res.end(JSON.stringify({ source_commit: sourceCommit }, null, 2));
    res.writeHead(404).end();
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    await new Promise((resolve, reject) => {
      const child = spawn('sh', ['site/public/install.sh'], { env: {
        ...process.env,
        VRAM_FIELDTEST_RELEASE_API: `http://127.0.0.1:${server.address().port}/release`,
        VRAM_FIELDTEST_IDENTITY_URL: `http://127.0.0.1:${server.address().port}/identity`,
        VRAM_FIELDTEST_COMMIT_API: `http://127.0.0.1:${server.address().port}/commit`,
        VRAM_FIELDTEST_INSTALL_DIR: install
      } });
      let stderr = '';
      child.stderr.on('data', chunk => { stderr += chunk; });
      child.on('exit', code => code === 0 ? resolve() : reject(new Error(stderr)));
    });
    assert.equal(readFileSync(join(install, 'vram-fieldtest'), 'utf8'), '#!/bin/sh\necho sample\n');
  } finally {
    server.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test('installer refuses a stale release instead of installing the wrong CLI', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'vram-stale-installer-'));
  const server = createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ tag_name: 'v0.1.1', assets: [] }));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const result = await new Promise(resolve => {
      const child = spawn('sh', ['site/public/install.sh'], {
        env: { ...process.env, VRAM_FIELDTEST_RELEASE_API: `http://127.0.0.1:${server.address().port}/release`, VRAM_FIELDTEST_INSTALL_DIR: dir }
      });
      let stderr = '';
      child.stderr.on('data', chunk => { stderr += chunk; });
      child.on('exit', status => resolve({ status, stderr }));
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Downloads for v0\.1\.3 are not published yet/);
    assert.equal(existsSync(join(dir, 'vram-fieldtest')), false);
  } finally {
    server.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test('regression: installer refuses the expected tag when it points at an ancestor commit', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'vram-ancestor-installer-'));
  const server = createServer((req, res) => {
    if (req.url === '/release') return res.end(JSON.stringify({ tag_name: 'v0.1.3', assets: [] }, null, 2));
    if (req.url === '/identity') return res.end(JSON.stringify({ tag: 'v0.1.3', source_commit: 'a'.repeat(40) }, null, 2));
    if (req.url === '/commit') return res.end(JSON.stringify({ sha: 'b'.repeat(40) }, null, 2));
    res.writeHead(404).end();
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const result = await new Promise(resolve => {
      const base = `http://127.0.0.1:${server.address().port}`;
      const child = spawn('sh', ['site/public/install.sh'], { env: {
        ...process.env,
        VRAM_FIELDTEST_RELEASE_API: `${base}/release`,
        VRAM_FIELDTEST_IDENTITY_URL: `${base}/identity`,
        VRAM_FIELDTEST_COMMIT_API: `${base}/commit`,
        VRAM_FIELDTEST_INSTALL_DIR: dir
      } });
      let stderr = '';
      child.stderr.on('data', chunk => { stderr += chunk; });
      child.on('exit', status => resolve({ status, stderr }));
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /do not match this site build yet/);
    assert.equal(existsSync(join(dir, 'vram-fieldtest')), false);
  } finally {
    server.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test('@claim:unlock-allowance server returns 429 and Retry-After past eight checks', async () => {
  let upstreamCalls = 0;
  const handler = createLicenseHandler({
    now: () => 1_800_000_000_000,
    fetchImpl: async () => {
      upstreamCalls += 1;
      return { status: 200, headers: { get: () => null }, text: async () => '{"valid":false,"reason":"invalid"}' };
    }
  });
  const request = index => ({ query: { license: `invalid-license-${index}` }, headers: { 'x-forwarded-for': `203.0.113.9:${41000 + index}, 10.0.0.1` } });
  for (let index = 0; index < ALLOWANCE; index += 1) {
    const result = await handler({ log: console }, request(index));
    assert.equal(result.status, 200);
  }
  const limited = await handler({ log: console }, request(ALLOWANCE));
  assert.equal(limited.status, 429);
  assert.equal(limited.headers['Retry-After'], String(WINDOW_SECONDS));
  assert.equal(JSON.parse(limited.body).reason, 'rate_limited');
  assert.equal(upstreamCalls, ALLOWANCE);
  const otherClient = await handler({ log: console }, { ...request(99), headers: { 'x-forwarded-for': '203.0.113.10' } });
  assert.equal(otherClient.status, 200);
});

test('release workflow covers the required native assets', () => {
  const workflow = readFileSync('.github/workflows/release.yml', 'utf8');
  for (const expected of ['macos-15-intel', 'macos-aarch64', 'windows-x86_64', 'linux-x86_64', '.deb', '.rpm', '.pkg', 'SHA256SUMS', 'latest.json']) {
    assert.match(workflow, new RegExp(expected.replace('.', '\\.')));
  }
  assert.doesNotMatch(workflow, /macos-13/);
});

test('@claim:release-provenance release gates the staged and published candidate plan command', () => {
  const workflow = readFileSync('.github/workflows/release.yml', 'utf8');
  const exactPlan = 'plan --detected-mib 98304 --coverage 90 --window-mib 16384 --json';
  assert.equal(workflow.split(exactPlan).length - 1, 3);
  assert.match(workflow, /PROVENANCE\.json/);
  assert.match(workflow, /tr -d '\\r'/);
  assert.match(workflow, /\.source_commit == \$commit/);
  assert.match(workflow, /github\.event_name == 'push' && github\.ref_type == 'tag'/);
  assert.match(workflow, /test "\$\(git rev-parse HEAD\)" = "\$GITHUB_SHA"/);
  assert.match(workflow, /sha256sum -c -/);
  assert.match(workflow, /\.requested_mib == 88474 and \.coverage_percent >= 90 and \.windows == 6/);
  assert.match(workflow, /latest\.json/);
});

test('regression: native archive packaging is byte reproducible', () => {
  const dir = mkdtempSync(join(tmpdir(), 'vram-reproducible-'));
  try {
    const binary = join(dir, 'vram-fieldtest');
    writeFileSync(binary, '#!/bin/sh\necho stable\n', { mode: 0o755 });
    for (const format of ['tar.gz', 'zip']) {
      const one = join(dir, `one.${format}`);
      const two = join(dir, `two.${format}`);
      execFileSync('python3', ['scripts/package-release.py', format, binary, one, format === 'zip' ? 'vram-fieldtest.exe' : 'vram-fieldtest']);
      execFileSync('python3', ['scripts/package-release.py', format, binary, two, format === 'zip' ? 'vram-fieldtest.exe' : 'vram-fieldtest']);
      assert.equal(createHash('sha256').update(readFileSync(one)).digest('hex'), createHash('sha256').update(readFileSync(two)).digest('hex'));
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('service worker update policy matches the package version', () => {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  const worker = readFileSync('site/public/sw.js', 'utf8');
  assert.match(worker, new RegExp(`v${pkg.version.replaceAll('.', '\\.')}`));
  assert.match(worker, /'\/app\.js'/);
  assert.match(worker, /'\/styles\.css'/);
  assert.match(worker, /keys\.filter\(key => key !== CACHE\).*caches\.delete/);
  assert.match(worker, /self\.skipWaiting\(\)/);
  assert.match(worker, /self\.clients\.claim\(\)/);
});

test('hashed site assets receive the immutable cache route', () => {
  execFileSync('npm', ['run', 'build:site'], { stdio: 'pipe' });
  const index = readFileSync('dist/site/index.html', 'utf8');
  assert.match(index, /\/assets\/app\.[a-f0-9]{12}\.js/);
  assert.match(index, /\/assets\/styles\.[a-f0-9]{12}\.css/);
  assert.equal(existsSync('dist/site/app.js'), false);
  assert.equal(existsSync('dist/site/styles.css'), false);
  const worker = readFileSync('dist/site/sw.js', 'utf8');
  assert.match(worker, /\/assets\/app\.[a-f0-9]{12}\.js/);
  assert.match(worker, /\/assets\/styles\.[a-f0-9]{12}\.css/);
  assert.match(readFileSync('staticwebapp.config.json', 'utf8'), /"\/assets\/\*"[\s\S]*immutable/);
  const identity = JSON.parse(readFileSync('dist/site/release.json', 'utf8'));
  assert.equal(identity.tag, `v${JSON.parse(readFileSync('package.json', 'utf8')).version}`);
  assert.equal(identity.source_commit, execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim());
  assert.match(readFileSync('staticwebapp.config.json', 'utf8'), /"\/release\.json"[\s\S]*no-store/);
});

test('known routes are physical files and unknown routes keep the platform 404', () => {
  execFileSync('npm', ['run', 'build:site'], { stdio: 'pipe' });
  for (const route of ['demo', 'report-kit', 'privacy', 'terms']) {
    assert.ok(existsSync(`dist/site/${route}/index.html`));
  }
  const config = JSON.parse(readFileSync('dist/site/staticwebapp.config.json', 'utf8'));
  assert.equal(config.navigationFallback, undefined);
  assert.deepEqual(config.responseOverrides['404'], { rewrite: '/404.html', statusCode: 404 });
  const notFound = readFileSync('dist/site/404.html', 'utf8');
  assert.match(notFound, /\/assets\/styles\.[a-f0-9]{12}\.css/);
  assert.doesNotMatch(notFound, /href="\/styles\.css"/);
});

test('release-facing versions stay synchronized', () => {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  const cargo = readFileSync('Cargo.toml', 'utf8');
  const app = readFileSync('site/src/app.js', 'utf8');
  const shell = readFileSync('site/public/install.sh', 'utf8');
  const powershell = readFileSync('site/public/install.ps1', 'utf8');
  assert.match(cargo, new RegExp(`version = "${pkg.version.replaceAll('.', '\\.') }"`));
  for (const source of [app, shell, powershell]) assert.match(source, new RegExp(`v${pkg.version.replaceAll('.', '\\.')}`));
  for (const manifest of ['bucket/vram-fieldtest.json', 'scoop-bucket/vram-fieldtest.json']) {
    const data = JSON.parse(readFileSync(manifest, 'utf8'));
    assert.equal(data.version, pkg.version);
    assert.match(data.url, new RegExp(`/v${pkg.version.replaceAll('.', '\\.')}\/`));
    assert.match(data.hash, /^[a-f0-9]{64}$/);
  }
  const formula = readFileSync('Formula/vram-fieldtest.rb', 'utf8');
  assert.match(formula, new RegExp(`version "${pkg.version.replaceAll('.', '\\.')}"`));
  assert.equal((formula.match(/sha256 "[a-f0-9]{64}"/g) || []).length, 2);
  const winget = readFileSync('winget/vram-fieldtest/vram-fieldtest.yaml', 'utf8');
  assert.match(winget, new RegExp(`PackageVersion: ${pkg.version.replaceAll('.', '\\.')}`));
  assert.match(winget, /InstallerSha256: [A-F0-9]{64}/);
});
