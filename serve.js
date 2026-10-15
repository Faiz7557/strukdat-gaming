import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';

const files = new Map([
  ['/', ['index.html','text/html; charset=utf-8']],
  ['/index.html', ['index.html','text/html; charset=utf-8']],
  ['/styles.css', ['styles.css','text/css; charset=utf-8']],
  ['/app.js', ['app.js','text/javascript; charset=utf-8']],
  ['/model.js', ['model.js','text/javascript; charset=utf-8']],
  ['/execution.js', ['execution.js','text/javascript; charset=utf-8']],
  ['/challenges.js', ['challenges.js','text/javascript; charset=utf-8']],
  ['/levels.js', ['levels.js','text/javascript; charset=utf-8']],
  ['/assets/Ubuntu-Regular.ttf', ['assets/Ubuntu-Regular.ttf','font/ttf']],
  ['/assets/Ubuntu-Medium.ttf', ['assets/Ubuntu-Medium.ttf','font/ttf']],
]);
const server = createServer(async (request,response) => {
  const file = files.get(request.url?.split('?')[0]);
  if (!file || !['GET','HEAD'].includes(request.method)) { response.writeHead(404); response.end('Not found'); return; }
  try {
    const content = await readFile(new URL(file[0],import.meta.url));
    response.writeHead(200,{'Content-Type':file[1],'Cache-Control':'no-store'});
    response.end(request.method==='HEAD'?undefined:content);
  } catch { response.writeHead(500); response.end('Cannot read application file'); }
});
server.on('error',error=>{console.error(error.message);process.exitCode=1;});
server.listen(5174,'127.0.0.1',()=>console.log('Strukdat Gaming: http://127.0.0.1:5174'));
