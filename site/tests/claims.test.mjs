import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { cpSync, existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

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

test('@claim:safety-cap oversized real runs stop before opening a GPU', () => {
  const result = spawnSync('target/debug/vram-fieldtest', ['run', '--yes', '--mib', '16385'], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /between 1 and 16384 MiB/);
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
  const server = createServer((req, res) => {
    const base = `http://127.0.0.1:${server.address().port}`;
    if (req.url === '/release') return res.end(JSON.stringify({ assets: [
      { browser_download_url: `${base}/vram-fieldtest-linux-x86_64.tar.gz` },
      { browser_download_url: `${base}/SHA256SUMS` }
    ] }, null, 2));
    if (req.url === '/vram-fieldtest-linux-x86_64.tar.gz') return res.end(archive);
    if (req.url === '/SHA256SUMS') return res.end(`${sum}  vram-fieldtest-linux-x86_64.tar.gz\n`);
    res.writeHead(404).end();
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    await new Promise((resolve, reject) => {
      const child = spawn('sh', ['site/public/install.sh'], { env: { ...process.env, VRAM_FIELDTEST_RELEASE_API: `http://127.0.0.1:${server.address().port}/release`, VRAM_FIELDTEST_INSTALL_DIR: install } });
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

test('release workflow covers the required native assets', () => {
  const workflow = readFileSync('.github/workflows/release.yml', 'utf8');
  for (const expected of ['macos-15-intel', 'macos-aarch64', 'windows-x86_64', 'linux-x86_64', '.deb', '.rpm', '.pkg', 'SHA256SUMS', 'latest.json']) {
    assert.match(workflow, new RegExp(expected.replace('.', '\\.')));
  }
  assert.doesNotMatch(workflow, /macos-13/);
});
