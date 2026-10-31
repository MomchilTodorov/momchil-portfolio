import {preview} from 'vite';
import path from 'node:path';
import {startCMS,apiBridge,root} from './runtime.mjs';
const runtime=await startCMS();
const server=await preview({configFile:path.join(root,'vite.config.mjs'),preview:{host:'127.0.0.1',port:4173,strictPort:true},plugins:[{name:'wordpress-preview-api',configurePreviewServer(vite){vite.middlewares.use(apiBridge(runtime));}}]});
server.printUrls();
console.log('WordPress admin: http://127.0.0.1:9417/wp-admin/');
const stop=async()=>{await new Promise(resolve=>server.httpServer.close(resolve));await runtime[Symbol.asyncDispose]();process.exit(0);};
process.on('SIGINT',stop);process.on('SIGTERM',stop);
