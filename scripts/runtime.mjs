import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, access, writeFile } from 'node:fs/promises';
import { syncBuiltinESMExports } from 'node:module';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const pluginPath = path.join(root, 'wordpress/plugins/momchil-headless-core');

export async function startCMS({ persistent = true, port = 9417, quiet = false, storageDirectory = '.local/wordpress' } = {}) {
  // Keep Playground's download cache and Windows temporary paths inside the task.
  const runtimeHome = path.join(root, '.cache/runtime-home');
  const runtimeTemp = path.resolve(root, '../hp-tmp');
  await mkdir(runtimeHome, { recursive: true });
  await mkdir(runtimeTemp, { recursive: true });
  os.homedir = () => runtimeHome;
  os.tmpdir = () => runtimeTemp;
  syncBuiltinESMExports();
  const { runCLI } = await import('@wp-playground/cli');
  const databaseRoot = path.resolve(root, storageDirectory);
  let installed = false;
  if (persistent) {
    await mkdir(databaseRoot, { recursive: true });
    try { await access(path.join(databaseRoot, 'wp-settings.php')); installed = true; } catch {}
  }
  const code = `<?php require '/wordpress/wp-load.php'; require_once ABSPATH . 'wp-admin/includes/plugin.php'; $activation = activate_plugin('momchil-headless-core/momchil-headless-core.php'); if (is_wp_error($activation)) throw new Exception($activation->get_error_message()); \\Momchil\\Headless\\Portfolio::register_content(); $count = \\Momchil\\Headless\\Portfolio::import_cv_projects(); if (is_wp_error($count)) throw new Exception($count->get_error_message()); update_option('blogname','Momchil portfolio CMS'); update_option('blog_public','0'); update_option('permalink_structure','/%postname%/'); flush_rewrite_rules();`;
  return runCLI({
    command: 'server', port, workers: 6, php: '8.3', wp: '7.1.4', login: false,
    wordpressInstallMode: installed ? 'install-from-existing-files-if-needed' : 'download-and-install',
    'mount-before-install': persistent ? [{ hostPath: databaseRoot, vfsPath: '/wordpress' }] : [],
    mount: [{ hostPath: pluginPath, vfsPath: '/wordpress/wp-content/plugins/momchil-headless-core' }],
    blueprint: { preferredVersions: { php: '8.3', wp: '7.1.4' }, steps: [{ step: 'runPHP', code }] },
    verbosity: quiet ? 'quiet' : 'normal'
  });
}

export async function readPortfolio(runtime) {
  const response = await runtime.playground.request({ url: '/?rest_route=/momchil/v2/portfolio' });
  if (response.httpStatusCode !== 200) throw new Error(`WordPress portfolio API returned ${response.httpStatusCode}: ${response.text.slice(0,250)}`);
  const data = JSON.parse(response.text);
  if (data.schemaVersion !== 2 || !Array.isArray(data.projects)) throw new Error('Unexpected portfolio response.');
  return data;
}

export async function writeSnapshot(data) {
  const directory = path.join(root, 'frontend/public/content');
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, 'portfolio.json'), JSON.stringify(data, null, 2));
}

export function apiBridge(runtime) {
  return async (req, res, next) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    if (!pathname.startsWith('/api/')) return next();
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405, {Allow:'GET, HEAD'}); res.end(); return; }
    const restPath = pathname.slice(4).replace(/\/$/, '');
    if (restPath !== '/momchil/v2/portfolio' && !/^\/momchil\/v2\/projects\/[a-z0-9-]+$/.test(restPath)) { res.writeHead(404); res.end(); return; }
    try {
      const response = await runtime.playground.request({ url: '/?rest_route=' + encodeURIComponent(restPath) });
      res.writeHead(response.httpStatusCode, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});
      res.end(req.method === 'HEAD' ? undefined : response.text);
    } catch { res.writeHead(502, {'Content-Type':'application/json'}); res.end(JSON.stringify({message:'The portfolio CMS is temporarily unavailable.'})); }
  };
}
