import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

test('@claim:demo-report CLI demo writes JSON and print report', () => {
  const out = execFileSync('cargo', ['run', '--quiet', '--', 'demo', '--json'], { encoding: 'utf8' });
  const response = JSON.parse(out);
  const report = JSON.parse(readFileSync(`${response.output}/report.json`, 'utf8'));
  assert.equal(response.mode, 'demo');
  assert.equal(report.patterns.length, 3);
  assert.equal(report.limits.coverage_percent, 93.75);
  assert.ok(existsSync(`${response.output}/report.html`));
});

test('@claim:demo-sample Demo is an isolated bundled sample', () => {
  const source = readFileSync('src/main.rs', 'utf8');
  assert.match(source, /include_str!\("\.\.\/examples\/sample-report\.json"\)/);
  assert.match(source, /std::env::temp_dir\(\)/);
  assert.doesNotMatch(source.slice(source.indexOf('Cmd::Demo'), source.indexOf('Cmd::Run')), /reqwest|http/);
});

test('@claim:site-offline Demo page has no third-party runtime dependency', () => {
  const app = readFileSync('site/src/app.js', 'utf8');
  const demoPage = app.slice(app.indexOf('function demoPage'), app.indexOf('function legal'));
  assert.match(demoPage, /SAMPLE DATA/);
  assert.doesNotMatch(demoPage, /fetch\(/);
  assert.match(readFileSync('site/src/index.html','utf8'), /src="\/app\.js"/);
});
