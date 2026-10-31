import { startCMS } from './runtime.mjs';
const runtime = await startCMS();
console.log('WordPress CMS: http://127.0.0.1:9417/wp-admin/');
const stop = async () => { await runtime[Symbol.asyncDispose](); process.exit(0); };
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
