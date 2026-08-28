import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
const base = new URL('./src/', import.meta.url).pathname;
const publicBase = new URL('./public/', import.meta.url).pathname;
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp'};
createServer(async(req,res)=>{let p=req.url.split('?')[0];if(p==='/'||!extname(p))p='/index.html';try{let file;try{file=await readFile(join(base,p))}catch{file=await readFile(join(publicBase,p))}res.writeHead(200,{'content-type':types[extname(p)]||'application/octet-stream'});res.end(file)}catch{res.writeHead(404);res.end('not found')}}).listen(4173,()=>console.log('http://localhost:4173'));
