import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {build as esbuild} from 'esbuild';
import {root,startCMS,readPortfolio} from './runtime.mjs';
import {safeJSON} from '../vite.config.mjs';

await mkdir(path.join(root,'.local'),{recursive:true});
const storageDirectory='.local/verify-wp';
let runtime=await startCMS({persistent:true,port:9418,quiet:true,storageDirectory});
let report;
try{
  const initial=await readPortfolio(runtime);
  assert.equal(initial.schemaVersion,2);
  assert.equal(initial.projects.length,4);
  const checked=await runtime.playground.run({code:`<?php
    require '/wordpress/wp-load.php';
    foreach (new RecursiveIteratorIterator(new RecursiveDirectoryIterator(WP_PLUGIN_DIR.'/momchil-headless-core')) as $file) if($file->isFile()&&$file->getExtension()==='php') token_get_all(file_get_contents($file->getPathname()),TOKEN_PARSE);
    $projects=\\Momchil\\Headless\\Portfolio::public_projects();
    $id=$projects[0]['id'];
    update_option('mt_verify_original', ['id'=>$id,'excerpt'=>get_post_field('post_excerpt',$id),'content'=>get_post_field('post_content',$id)]);
    $draft=wp_insert_post(['post_type'=>'mt_project','post_status'=>'draft','post_title'=>'PRIVATE DRAFT']);
    $protected=wp_insert_post(['post_type'=>'mt_project','post_status'=>'publish','post_password'=>'private','post_title'=>'PROTECTED PROJECT']);
    $visible=count(\\Momchil\\Headless\\Portfolio::public_projects());
    $missing=rest_do_request(new WP_REST_Request('GET','/momchil/v2/projects/protected-project'));
    wp_set_current_user(0);
    $write=rest_do_request(new WP_REST_Request('POST','/wp/v2/portfolio-projects'));
    wp_update_post(['ID'=>$id,'post_excerpt'=>'CMS EDIT IN REACT','post_content'=>'<h2>My contribution</h2><p>Edited in the WordPress backend.</p><script>alert(1)</script><img src="x" onerror="alert(1)">']);
    update_option('mt_headless_verify_marker','persists across restarts');
    wp_delete_post($draft,true);wp_delete_post($protected,true);
    $user=get_user_by('login','admin');
    echo wp_json_encode(['wordpress'=>get_bloginfo('version'),'private_excluded'=>$visible===4,'protected_detail_status'=>$missing->get_status(),'anonymous_write_status'=>$write->get_status(),'repeat_import'=>\\Momchil\\Headless\\Portfolio::import_cv_projects(),'default_local_login'=>wp_check_password('password',$user->user_pass,$user->ID)]);
  `});
  const backend=JSON.parse(checked.text);
  assert.equal(backend.private_excluded,true);
  assert.equal(backend.protected_detail_status,404);
  assert.equal(backend.anonymous_write_status,401);
  assert.equal(backend.repeat_import,0);
  const edited=await readPortfolio(runtime);
  assert.ok(!edited.projects[0].contentHTML.includes('<script'));
  assert.ok(!edited.projects[0].contentHTML.includes('onerror'));
  assert.equal(edited.projects[0].summary,'CMS EDIT IN REACT');
  for(const project of edited.projects){
    const response=await runtime.playground.request({url:'/?rest_route='+encodeURIComponent('/momchil/v2/projects/'+project.slug)});
    assert.equal(response.httpStatusCode,200);
    assert.equal(JSON.parse(response.text).slug,project.slug);
  }
  const serverBundle=path.join(root,'.local/entry-server.mjs');
  const {render}=await import(pathToFileURL(serverBundle).href+'?verify='+Date.now());
  const html=render('/',initial);
  assert.ok(html.includes('Behind the site.'));
  assert.ok(render('/work/ligre/',edited).includes('CMS EDIT IN REACT'));
  assert.ok(!safeJSON({text:'</script><script>alert(1)</script>'}).includes('</script>'));
  for(const route of ['index.html',...initial.projects.map(project=>`work/${project.slug}/index.html`),'404.html']){
    const page=await readFile(path.join(root,'dist',route),'utf8');
    assert.ok(page.includes('data-prerendered="true"'));
    assert.ok(!page.includes('<!--app-html-->'));
    assert.ok(!page.includes('wp-element'));
  }
  await esbuild({entryPoints:[path.join(root,'scripts/ui-checks.jsx')],outfile:path.join(root,'.local/ui-checks.mjs'),bundle:true,platform:'node',format:'esm',packages:'external',jsx:'automatic',define:{'import.meta.env.VITE_WP_API_BASE':JSON.stringify('/api/')}});
  const {checkUI}=await import(pathToFileURL(path.join(root,'.local/ui-checks.mjs')).href+'?verify='+Date.now());
  const ui=await checkUI({initialData:initial,html,fetchPortfolio:()=>readPortfolio(runtime)});
  await runtime[Symbol.asyncDispose]();runtime=null;
  runtime=await startCMS({persistent:true,port:9418,quiet:true,storageDirectory});
  const persistence=await runtime.playground.run({code:`<?php require '/wordpress/wp-load.php'; echo wp_json_encode(['marker'=>get_option('mt_headless_verify_marker'),'summary'=>\\Momchil\\Headless\\Portfolio::public_projects()[0]['summary']]);`});
  assert.equal(JSON.parse(persistence.text).marker,'persists across restarts');
  assert.equal(JSON.parse(persistence.text).summary,'CMS EDIT IN REACT');
  report={backend,standalone_react:true,php_theme_used_by_frontend:false,react_dom:ui,persistent_cms:true,prerendered_routes:6,bootstrap_script_escaping:true,public_content_sanitization:true,browser_visual_qa:'Not verified: the local browser connection was unavailable. React interaction checks ran in a simulated DOM.'};
  await writeFile(path.join(root,'.local/verification.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
}finally{
  if(runtime){
    try{await runtime.playground.run({code:`<?php require '/wordpress/wp-load.php'; $original=get_option('mt_verify_original'); if($original)wp_update_post(['ID'=>$original['id'],'post_excerpt'=>$original['excerpt'],'post_content'=>$original['content']]); delete_option('mt_verify_original');delete_option('mt_headless_verify_marker');`});}catch{}
    await runtime[Symbol.asyncDispose]();
  }
}
