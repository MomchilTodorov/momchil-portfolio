import {build as viteBuild,loadEnv} from 'vite';
import {build as esbuild} from 'esbuild';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {root} from './runtime.mjs';

const data=JSON.parse(await readFile(path.join(root,'frontend/public/content/portfolio.json'),'utf8').catch(()=>{throw new Error('Run pnpm content:sync once to export the WordPress content before building.');}));
await viteBuild({configFile:path.join(root,'vite.config.mjs')});
await mkdir(path.join(root,'.local'),{recursive:true});
const serverBundle=path.join(root,'.local/entry-server.mjs');
await esbuild({entryPoints:[path.join(root,'frontend/src/entry-server.jsx')],outfile:serverBundle,bundle:true,platform:'node',format:'esm',packages:'external',jsx:'automatic',define:{'import.meta.env.VITE_WP_API_BASE':JSON.stringify('/api/')}});
const {render}=await import(pathToFileURL(serverBundle).href+'?build='+Date.now());
const template=await readFile(path.join(root,'dist/index.html'),'utf8');
const env=loadEnv('production',root,'');
const origin=process.env.PUBLIC_SITE_URL||env.PUBLIC_SITE_URL||'';
const escape=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const routes=['/',...data.projects.map(project=>`/work/${project.slug}/`),'/404/'];
for(const route of routes){
  const project=data.projects.find(item=>route===`/work/${item.slug}/`);
  const title=route==='/404/'?'Page not found — '+data.profile.name:project?project.title+' — '+data.profile.name:data.profile.name+' — WordPress & WooCommerce Developer';
  const description=project?.summary||data.profile.intro;
  let html=template.replace('<div id="root"><!--app-html--></div>',`<div id="root" data-prerendered="true">${render(route,data)}</div>`);
  html=html.replace(/<title>.*?<\/title>/s,()=>`<title>${escape(title)}</title>`)
    .replace(/(<meta name="description" content=")[^"]*"/,(_,prefix)=>`${prefix}${escape(description)}"`)
    .replace(/(<meta property="og:title" content=")[^"]*"/,(_,prefix)=>`${prefix}${escape(title)}"`)
    .replace(/(<meta property="og:description" content=")[^"]*"/,(_,prefix)=>`${prefix}${escape(description)}"`);
  if(origin&&route!=='/404/')html=html.replace('</head>',`<link rel="canonical" href="${escape(new URL(route,origin).href)}"></head>`);
  const destination=route==='/404/'?path.join(root,'dist/404.html'):path.join(root,'dist',route,'index.html');
  await mkdir(path.dirname(destination),{recursive:true});
  await writeFile(destination,html);
}
console.log(`Prerendered ${routes.length} React pages from WordPress content. No PHP theme renders the public frontend.`);
