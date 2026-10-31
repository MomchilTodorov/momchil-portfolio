import {loadEnv} from 'vite';
import {loadPortfolio} from '../frontend/src/api.js';
import {startCMS,readPortfolio,writeSnapshot,root} from './runtime.mjs';
const env=loadEnv(process.env.NODE_ENV||'development',root,'');
const base=process.env.WORDPRESS_API_BASE||env.VITE_WP_API_BASE||'';
let runtime;
try{
  let data;
  if(/^https?:\/\//.test(base))data=await loadPortfolio({base});
  else{runtime=await startCMS({quiet:true});data=await readPortfolio(runtime);}
  await writeSnapshot(data);
  console.log(`Exported ${data.projects.length} projects from the real WordPress REST API.`);
}finally{if(runtime)await runtime[Symbol.asyncDispose]();}
