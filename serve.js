import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {createQuizService} from './quiz-server.js';

const files = new Map([
  ['/', ['index.html','text/html; charset=utf-8']],
  ['/index.html', ['index.html','text/html; charset=utf-8']],
  ['/styles.css', ['styles.css','text/css; charset=utf-8']],
  ['/app.js', ['app.js','text/javascript; charset=utf-8']],
  ['/model.js', ['model.js','text/javascript; charset=utf-8']],
  ['/execution.js', ['execution.js','text/javascript; charset=utf-8']],
  ['/challenges.js', ['challenges.js','text/javascript; charset=utf-8']],
  ['/levels.js', ['levels.js','text/javascript; charset=utf-8']],
  ['/quiz.html', ['quiz.html','text/html; charset=utf-8']],
  ['/quiz-client.js', ['quiz-client.js','text/javascript; charset=utf-8']],
  ['/quiz.css', ['quiz.css','text/css; charset=utf-8']],
  ['/assets/Ubuntu-Regular.ttf', ['assets/Ubuntu-Regular.ttf','font/ttf']],
  ['/assets/Ubuntu-Medium.ttf', ['assets/Ubuntu-Medium.ttf','font/ttf']],
]);
export function createLabServer(options) {
  const quiz = createQuizService(options);
  const server = createServer(async (request,response) => {
    response.setHeader('X-Content-Type-Options','nosniff');
    response.setHeader('Referrer-Policy','no-referrer');
    if (await quiz.handle(request,response)) return;
    const file = files.get(request.url?.split('?')[0]);
    if (!file || !['GET','HEAD'].includes(request.method)) { response.writeHead(404); response.end('Not found'); return; }
    try {
      const content = await readFile(new URL(file[0],import.meta.url));
      response.writeHead(200,{'Content-Type':file[1],'Cache-Control':'no-store'});
      response.end(request.method==='HEAD'?undefined:content);
    } catch { response.writeHead(500); response.end('Cannot read application file'); }
  });
  server.on('close',()=>quiz.close());
  return {server,quiz};
}
if (process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  const hosts=process.env.QUIZ_HOSTS?.split(',').map(value=>value.trim()).filter(Boolean);
  const {server,quiz}=createLabServer({allowedHosts:hosts?.length?hosts:null,trustProxy:process.env.QUIZ_TRUST_PROXY==='1',dataFile:process.env.QUIZ_DATA_FILE||null});
  const port=Number(process.env.PORT??5174),host=process.env.HOST??(process.argv.includes('--lan')?'0.0.0.0':'127.0.0.1');
  server.on('error',error=>{console.error(error.message);process.exitCode=1;});
  for (const signal of ['SIGINT','SIGTERM']) process.on(signal,()=>{quiz.flush();process.exit(0);});
  if(host==='0.0.0.0'&&!hosts?.length)console.warn('QUIZ_HOSTS belum diatur: set ke domain publik agar Host header asing ditolak.');
  server.listen(port,host,()=>console.log(`Strukdat Gaming: http://${host}:${port}${host==='0.0.0.0'?' (peserta: gunakan IP LAN komputer ini)':''}`));
}
