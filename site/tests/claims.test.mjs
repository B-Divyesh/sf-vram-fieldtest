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

test('@claim:sample-equality web and CLI demos use the same bundled sample', () => {
  const fixture = JSON.parse(readFileSync('examples/sample-report.json', 'utf8'));
  const out = JSON.parse(execFileSync('target/debug/vram-fieldtest', ['demo', '--json'], { encoding: 'utf8' }));
  const report = JSON.parse(readFileSync(join(out.output, 'report.json'), 'utf8'));
  assert.equal(report.adapter.name, fixture.adapter.name);
  assert.deepEqual(report.patterns.map(pattern => pattern.name), fixture.patterns.map(pattern => pattern.name));
  assert.equal(report.limits.tested_mib, fixture.limits.tested_mib);
  rmSync(out.output, { recursive: true, force: true });
});

test('@claim:cli-local CLI has no telemetry or network client', () => {
  const source = readFileSync('src/main.rs', 'utf8');
  const dependencies = execFileSync('cargo', ['tree', '--prefix', 'none'], { encoding: 'utf8' });
  assert.doesNotMatch(source, /TcpStream|UdpSocket|reqwest|https?:\/\//);
  assert.doesNotMatch(dependencies, /^(reqwest|hyper|ureq|telemetry)\s/vm);
});

test('@claim:report-output-path report files are written to the requested local directory', () => {
  execFileSync('cargo', ['test', 'write_report_uses_the_requested_local_directory'], { stdio: 'pipe' });
});

test('@claim:non-invasive the CLI has no clock or driver changing command path', () => {
  const source = readFileSync('src/main.rs', 'utf8');
  assert.doesNotMatch(source, /--set|--overclock|--voltage|--power-limit|nvidia-settings|setClocks/i);
  assert.match(source, /--query-gpu=name,pci\.device_id,temperature\.gpu,clocks\.sm,clocks\.mem/);
});

test('@claim:unsigned-builds Windows and macOS artifacts are not signed in the release workflow', () => {
  const workflow = readFileSync('.github/workflows/release.yml', 'utf8');
  assert.match(workflow, /pkgbuild/);
  assert.doesNotMatch(workflow, /codesign|signtool|Authenticode/i);
});

test('@claim:safety-consent real runs require explicit consent', () => {
  const result = spawnSync('target/debug/vram-fieldtest', ['run', '--mib', '1'], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /pass --yes/);
});

test('regression: automatic coverage cannot silently fall back to a small fixed amount', () => {
  const source = readFileSync('src/main.rs', 'utf8');
  assert.doesNotMatch(source, /DEFAULT_MIB/);
  const output = execFileSync('cargo', ['test', '--quiet', 'tests::automatic_run_refuses_an_unknown_memory_total', '--', '--exact'], { encoding: 'utf8' });
  assert.match(output, /1 passed/);
  assert.match(source, /Run `vram-fieldtest inspect`, confirm the card's memory, then pass `--mib <amount>`/);
});

test('@claim:host-vram-inspection inspect returns the adapters and memory values visible on this host', () => {
  const inventory = JSON.parse(execFileSync('cargo', ['run', '--quiet', '--', 'inspect', '--json'], { encoding: 'utf8' }));
  assert.ok(Array.isArray(inventory));
  for (const adapter of inventory) {
    assert.equal(typeof adapter.index, 'number');
    assert.equal(typeof adapter.name, 'string');
    assert.ok(Object.hasOwn(adapter, 'detected_vram_mib'));
  }
  const text = execFileSync('target/debug/vram-fieldtest', ['inspect'], { encoding: 'utf8' });
  assert.match(text, /No GPU adapter is available|\[\d+\] .+ \(WebGPU /);
});

test('@claim:completed-run-coverage coverage is withheld until all three patterns complete', () => {
  const output = execFileSync('cargo', ['test', '--quiet', 'tests::coverage_is_absent_until_all_three_patterns_complete', '--', '--exact'], { encoding: 'utf8' });
  assert.match(output, /1 passed/);
});

test('regression: a GPU-free plan never labels its request as completed coverage', () => {
  const plan = JSON.parse(execFileSync('cargo', ['run', '--quiet', '--', 'plan', '--detected-mib', '12288', '--coverage', '90', '--window-mib', '1024', '--json'], { encoding: 'utf8' }));
  assert.equal(plan.requested_mib, 11060);
  assert.ok(plan.requested_percent >= 90);
  assert.equal(Object.hasOwn(plan, 'coverage_percent'), false);
});

test('@claim:selected-thermal-stop hardware runs require temperature from the selected adapter', () => {
  for (const name of ['hardware_run_requires_temperature_and_stops_if_it_disappears', 'selected_adapter_telemetry_never_falls_back_to_the_first_gpu', 'drm_telemetry_reads_only_the_selected_adapter']) {
    const output = execFileSync('cargo', ['test', '--quiet', `tests::${name}`, '--', '--exact'], { encoding: 'utf8' });
    assert.match(output, /1 passed/);
  }
});

test('@claim:bounded-stop-report a bounded stop saves incomplete JSON and HTML', () => {
  const output = execFileSync('cargo', ['test', '--quiet', 'tests::stop_reports_are_saved_and_mismatches_map_to_exit_two', '--', '--exact'], { encoding: 'utf8' });
  assert.match(output, /1 passed/);
});

test('@claim:mismatch-exit a mismatch maps to process exit code two', () => {
  const output = execFileSync('cargo', ['test', '--quiet', 'tests::stop_reports_are_saved_and_mismatches_map_to_exit_two', '--', '--exact'], { encoding: 'utf8' });
  assert.match(output, /1 passed/);
});

test('@claim:installer-checksum shell and PowerShell installers verify SHA-256 before installation', async () => {
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
    if (req.url === '/release') return res.end(JSON.stringify({ tag_name: 'v0.1.8', assets: [
      { browser_download_url: `${base}/vram-fieldtest-linux-x86_64.tar.gz` },
      { browser_download_url: `${base}/SHA256SUMS` },
      { browser_download_url: `${base}/PROVENANCE.json` }
    ] }, null, 2));
    if (req.url === '/identity') return res.end(JSON.stringify({ tag: 'v0.1.8', source_commit: sourceCommit }, null, 2));
    // GitHub may return minified JSON; the installer must not depend on a line
    // beginning with the top-level sha field.
    if (req.url === '/commit') return res.end(JSON.stringify({ sha: sourceCommit, commit: { tree: { sha: 'b'.repeat(40) } } }));
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
    const powershell = readFileSync('site/public/install.ps1', 'utf8');
    assert.match(powershell, /\[System\.Security\.Cryptography\.SHA256\]::Create\(\)/);
    assert.match(powershell, /\$actual = \[System\.BitConverter\]::ToString\(\$sha256\.ComputeHash\(\[System\.IO\.File\]::ReadAllBytes\("\$temp\\tool\.zip"\)\)\)\.Replace\('-', ''\)\.ToLowerInvariant\(\)/);
    assert.match(powershell, /if \(\$wanted\.ToLower\(\) -ne \$actual\) \{ throw 'SHA256 verification failed\.' \}\s+Expand-Archive/);
  } finally {
    server.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test('regression: Windows PowerShell installer copies only a checksum-matching archive', { skip: process.platform !== 'win32' }, async () => {
  const dir = mkdtempSync(join(tmpdir(), 'vram-powershell-installer-'));
  const stage = join(dir, 'stage');
  const zip = join(dir, 'vram-fieldtest-windows-x86_64.zip');
  const sourceCommit = 'a'.repeat(40);
  mkdirSync(stage);
  writeFileSync(join(stage, 'vram-fieldtest.exe'), 'sample windows binary');
  const quote = value => value.replaceAll("'", "''");
  execFileSync('powershell.exe', ['-NoProfile', '-Command', `Compress-Archive -Path '${quote(join(stage, 'vram-fieldtest.exe'))}' -DestinationPath '${quote(zip)}' -Force`]);
  const archive = readFileSync(zip);
  let checksum = createHash('sha256').update(archive).digest('hex');
  const server = createServer((req, res) => {
    const base = `http://127.0.0.1:${server.address().port}`;
    if (req.url === '/release') {
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ tag_name: 'v0.1.8', assets: [
      { name: 'vram-fieldtest-windows-x86_64.zip', browser_download_url: `${base}/tool.zip` },
      { name: 'SHA256SUMS', browser_download_url: `${base}/SHA256SUMS` },
      { name: 'PROVENANCE.json', browser_download_url: `${base}/PROVENANCE.json` }
      ] }));
    }
    if (req.url === '/identity') {
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ tag: 'v0.1.8', source_commit: sourceCommit }));
    }
    if (req.url === '/commit') {
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ sha: sourceCommit }));
    }
    if (req.url === '/tool.zip') return res.end(archive);
    if (req.url === '/SHA256SUMS') return res.end(`${checksum}  vram-fieldtest-windows-x86_64.zip\n`);
    if (req.url === '/PROVENANCE.json') {
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ source_commit: sourceCommit }));
    }
    res.writeHead(404).end();
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const runInstaller = localAppData => new Promise(resolve => {
    const base = `http://127.0.0.1:${server.address().port}`;
    const child = spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', 'site/public/install.ps1'], {
      env: {
        ...process.env,
        LOCALAPPDATA: localAppData,
        VRAM_FIELDTEST_RELEASE_API: `${base}/release`,
        VRAM_FIELDTEST_IDENTITY_URL: `${base}/identity`,
        VRAM_FIELDTEST_COMMIT_API: `${base}/commit`
      }
    });
    let stderr = '';
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('exit', status => resolve({ status, stderr }));
  });
  try {
    const goodRoot = join(dir, 'good-local-app-data');
    const good = await runInstaller(goodRoot);
    assert.equal(good.status, 0, good.stderr);
    assert.equal(readFileSync(join(goodRoot, 'VRAMFieldTest', 'vram-fieldtest.exe'), 'utf8'), 'sample windows binary');
    checksum = '0'.repeat(64);
    const badRoot = join(dir, 'bad-local-app-data');
    const bad = await runInstaller(badRoot);
    assert.notEqual(bad.status, 0);
    assert.match(bad.stderr, /SHA256 verification failed/);
    assert.equal(existsSync(join(badRoot, 'VRAMFieldTest', 'vram-fieldtest.exe')), false);
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
    assert.match(result.stderr, /Downloads for v0\.1\.8 are not published yet/);
    assert.equal(existsSync(join(dir, 'vram-fieldtest')), false);
  } finally {
    server.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test('regression: installer refuses the expected tag when it points at an ancestor commit', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'vram-ancestor-installer-'));
  const server = createServer((req, res) => {
    if (req.url === '/release') return res.end(JSON.stringify({ tag_name: 'v0.1.8', assets: [] }, null, 2));
    if (req.url === '/identity') return res.end(JSON.stringify({ tag: 'v0.1.8', source_commit: 'a'.repeat(40) }, null, 2));
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

test('@claim:release-package-provenance tagged publication includes package checksums and source provenance', () => {
  const workflow = readFileSync('.github/workflows/release.yml', 'utf8');
  assert.match(workflow, /PROVENANCE\.json/);
  assert.match(workflow, /\.source_commit == \$commit/);
  assert.match(workflow, /github\.event_name == 'push' && github\.ref_type == 'tag'/);
  assert.match(workflow, /test "\$\(git rev-parse HEAD\)" = "\$GITHUB_SHA"/);
  assert.match(workflow, /sha256sum -c -/);
  assert.match(workflow, /latest\.json/);
  assert.match(workflow, /os: ubuntu-latest[\s\S]*os: windows-latest/);
  assert.match(workflow, /publish:[\s\S]*needs: build/);
  assert.match(workflow, /evidence_kind:\"package-release\"/);
  assert.match(workflow, /does not claim a factory hardware matrix/);
  assert.doesNotMatch(workflow, /physical-gpu|hardware_linux|hardware_windows|physical-gpu-release-matrix/);
});

test('regression: the packaged workflow duration is accepted before GPU selection', () => {
  const workflow = readFileSync('.github/workflows/release.yml', 'utf8');
  assert.match(workflow, /--seconds 900/);
  assert.doesNotMatch(workflow, /--seconds 7200/);
  execFileSync('cargo', ['build', '--locked', '--release'], { stdio: 'pipe' });
  const dir = mkdtempSync(join(tmpdir(), 'vram-workflow-duration-'));
  try {
    const result = spawnSync('target/release/vram-fieldtest', [
      'run', '--yes', '--adapter', '999999', '--coverage', '90', '--window-mib', '1024',
      '--seconds', '900', '--output', dir, '--json'
    ], { encoding: 'utf8' });
    assert.equal(result.status, 1, result.stderr);
    assert.doesNotMatch(result.stderr, /invalid value .*--seconds|not in 10\.\.=900/);
    assert.match(result.stderr, /No GPU adapter is available|Adapter 999999 is not available/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('@claim:host-evidence-bundle user-host evidence validates a completed local report and rejects software fixtures', () => {
  const sourceCommit = 'a'.repeat(40);
  for (const platform of ['linux', 'windows']) {
    const dir = mkdtempSync(join(tmpdir(), `vram-evidence-${platform}-`));
    try {
      const report = JSON.parse(readFileSync('examples/sample-report.json', 'utf8'));
      report.host = { os: platform, hostname: `${platform}-fixture-bench` };
      report.adapter = {
        ...report.adapter,
        name: 'Fixture GPU 12 GB',
        backend: platform === 'linux' ? 'WebGPU Vulkan' : 'WebGPU Dx12',
        source: platform === 'linux' ? 'Linux DRM card0 mem_info_vram_total' : 'Windows DXGI DedicatedVideoMemory'
      };
      report.telemetry = {
        provider: 'nvidia-smi selected adapter 0',
        samples: [
          { at_ms: 0, phase: 'before run', temperature_c: 52, core_clock_mhz: 1420, memory_clock_mhz: 7000 },
          { at_ms: 8420, phase: 'after run', temperature_c: 61, core_clock_mhz: 1510, memory_clock_mhz: 7000 }
        ],
        unavailable_reason: null
      };
      report.notes = ['Controlled schema fixture; never published as host evidence.'];
      const result = {
        status: 'pass', coverage_percent: 93.75, mismatches: 0, tested_mib: 11520,
        resident_mib: 11520, resident_allocations: 180
      };
      const inventoryPath = join(dir, 'inventory.json');
      const resultPath = join(dir, 'result.json');
      const reportPath = join(dir, `hardware-${platform}-report.json`);
      const htmlPath = join(dir, `hardware-${platform}-report.html`);
      const binaryPath = join(dir, platform === 'windows' ? 'vram-fieldtest.exe' : 'vram-fieldtest');
      const evidencePath = join(dir, `hardware-${platform}-evidence.json`);
      writeFileSync(inventoryPath, JSON.stringify([report.adapter]));
      writeFileSync(resultPath, JSON.stringify(result));
      writeFileSync(reportPath, JSON.stringify(report));
      writeFileSync(htmlPath, `<title>VRAM Field Test report</title><p>Tested 11520 MiB. Detected VRAM on this host: 12288 MiB. Coverage from this run: 93.8%.</p><p>solid AA solid 55 address XOR</p>`);
      writeFileSync(binaryPath, `fixture-${platform}`);
      const command = platform === 'linux'
        ? './vram-fieldtest run --yes --adapter 0 --coverage 90 --window-mib 1024 --seconds 900 --output ./output --json'
        : '.\\vram-fieldtest.exe run --yes --adapter 0 --coverage 90 --window-mib 1024 --seconds 900 --output .\\output --json';
      const asset = platform === 'linux' ? 'vram-fieldtest-linux-x86_64.tar.gz' : 'vram-fieldtest-windows-x86_64.zip';
      const common = [
        'scripts/hardware-evidence.py', 'bundle', '--platform', platform, '--source-commit', sourceCommit,
        '--release-version', '0.1.8', '--runner-environment', 'user supplied fixture',
        '--inventory-command', platform === 'linux' ? './vram-fieldtest inspect --json' : '.\\vram-fieldtest.exe inspect --json', '--command', command,
        '--binary', binaryPath, '--binary-asset', asset, '--inventory', inventoryPath, '--result', resultPath,
        '--report', reportPath, '--html', htmlPath, '--output', evidencePath
      ];
      execFileSync('python3', common, { stdio: 'pipe' });
      execFileSync('python3', [
        'scripts/hardware-evidence.py', 'validate', '--evidence', evidencePath, '--platform', platform,
        '--source-commit', sourceCommit, '--release-version', '0.1.8', '--binary', binaryPath
      ], { stdio: 'pipe' });

      const software = structuredClone(report);
      software.adapter.device_type = 'software';
      software.adapter.detected_vram_mib = null;
      software.adapter.source = 'not exposed by the operating-system driver';
      software.limits.detected_vram_mib = null;
      software.limits.coverage_percent = null;
      software.limits.coverage_target_percent = null;
      software.limits.thermal_limit_c = null;
      software.telemetry = { provider: 'not available for selected adapter', samples: [], unavailable_reason: 'missing' };
      writeFileSync(inventoryPath, JSON.stringify([software.adapter]));
      writeFileSync(reportPath, JSON.stringify(software));
      const rejected = spawnSync('python3', [
        'scripts/hardware-evidence.py', 'bundle', '--platform', platform, '--source-commit', sourceCommit,
        '--release-version', '0.1.8', '--runner-environment', 'user supplied fixture',
        '--inventory-command', platform === 'linux' ? './vram-fieldtest inspect --json' : '.\\vram-fieldtest.exe inspect --json',
        '--command', `${command} --allow-software --mib 4`, '--binary', binaryPath, '--binary-asset', asset,
        '--inventory', inventoryPath, '--result', resultPath, '--report', reportPath, '--html', htmlPath,
        '--output', evidencePath
      ], { encoding: 'utf8' });
      assert.equal(rejected.status, 1);
      assert.match(rejected.stderr, /selected adapter is not a supported GPU detected on this host/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

test('regression: native archive packaging is byte reproducible', () => {
  const cargoConfig = readFileSync('.cargo/config.toml', 'utf8');
  assert.match(cargoConfig, /target\.x86_64-pc-windows-msvc/);
  assert.match(cargoConfig, /link-arg=\/Brepro/);
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
  assert.match(worker, /'\/mobile\.css'/);
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
  let expectedSourceCommit;
  try {
    expectedSourceCommit = execFileSync('git', ['rev-parse', `${identity.tag}^{commit}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    expectedSourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  }
  assert.equal(identity.source_commit, expectedSourceCommit);
  assert.equal(identity.site_commit, execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim());
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
    assert.doesNotMatch(data.hash, /^0+$/);
  }
  const formula = readFileSync('Formula/vram-fieldtest.rb', 'utf8');
  assert.match(formula, new RegExp(`version "${pkg.version.replaceAll('.', '\\.')}"`));
  assert.equal((formula.match(/sha256 "[a-f0-9]{64}"/g) || []).length, 2);
  assert.doesNotMatch(formula, /sha256 "0{64}"/);
  const winget = readFileSync('winget/vram-fieldtest/vram-fieldtest.yaml', 'utf8');
  assert.match(winget, new RegExp(`PackageVersion: ${pkg.version.replaceAll('.', '\\.')}`));
  assert.match(winget, /InstallerSha256: [A-F0-9]{64}/);
  assert.doesNotMatch(winget, /InstallerSha256: 0{64}/);
});
