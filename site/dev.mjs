import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { extname, join } from 'node:path';
import { createRequire } from 'node:module';
const base = new URL('./src/', import.meta.url).pathname;
const publicBase = new URL('./public/', import.meta.url).pathname;
const require = createRequire(import.meta.url);
const licenseVerify = require('../api/license-verify/index.js');
const packageData = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: new URL('..', import.meta.url), encoding: 'utf8' }).trim();
const pages = new Set(['/', '/demo', '/report-kit', '/privacy', '/terms']);
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp'};
createServer(async(req,res)=>{
  const requestUrl = new URL(req.url, 'http://127.0.0.1');
  const originalPath = requestUrl.pathname;
  if (originalPath === '/api/license/verify') {
    const result = await licenseVerify({ log: console }, { query: Object.fromEntries(requestUrl.searchParams), headers: req.headers });
    res.writeHead(result.status, result.headers); res.end(result.body); return;
  }
  if (originalPath === '/release.json') {
    res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
    res.end(`${JSON.stringify({ tag: `v${packageData.version}`, source_commit: sourceCommit }, null, 2)}\n`); return;
  }
  const missingPage = !extname(originalPath) && !pages.has(originalPath);
  let p = pages.has(originalPath) ? '/index.html' : originalPath;
  if (missingPage) p = '/404.html';
  try {
    let file;
    try { file=await readFile(join(base,p)); } catch { file=await readFile(join(publicBase,p)); }
    res.writeHead(missingPage ? 404 : 200,{'content-type':types[extname(p)]||'application/octet-stream'});
    if (req.method === 'HEAD') res.end(); else res.end(file);
  } catch { res.writeHead(404); res.end('not found'); }
}).listen(4173,()=>console.log('http://localhost:4173'));
