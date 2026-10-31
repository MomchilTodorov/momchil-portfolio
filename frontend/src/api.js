/** The frontend consumes a public WordPress API. It has no wp.element dependency. */
export function validatePortfolio(data) {
  if (!data || data.schemaVersion !== 2 || !data.profile || !Array.isArray(data.projects)) throw new Error('Invalid portfolio response.');
  const profile = data.profile;
  for (const key of ['name','role','location','email','intro','bio','agencyBio','focusBio','employer','experienceStart','education','university','cvUrl']) {
    if (typeof profile[key] !== 'string') throw new Error('Invalid profile field: ' + key);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) throw new Error('Invalid contact email.');
  for (const key of ['experienceYears','siteCount']) if (!Number.isFinite(Number(profile[key]))) throw new Error('Invalid career figure.');
  const slugs = new Set();
  data.projects.forEach(project => {
    if (!/^[a-z0-9-]+$/.test(project.slug) || slugs.has(project.slug)) throw new Error('Invalid project slug.');
    slugs.add(project.slug);
    for (const key of ['title','summary','categoryLabel','visual','clientUrl','contentHTML']) if (typeof project[key] !== 'string') throw new Error('Invalid project field: '+key);
    if (!Array.isArray(project.categories) || !project.categories.every(item=>typeof item==='string')) throw new Error('Invalid categories.');
    if (!Array.isArray(project.stack) || !project.stack.every(item=>typeof item==='string')) throw new Error('Invalid technology list.');
  });
  return data;
}

export async function loadPortfolio({base = '/api/', signal, fetcher = globalThis.fetch} = {}) {
  const response = await fetcher(base.replace(/\/*$/, '/') + 'momchil/v2/portfolio', {signal,credentials:'omit',headers:{Accept:'application/json'}});
  if (!response.ok) throw new Error('The portfolio could not be loaded.');
  return validatePortfolio(await response.json());
}

export function safeURL(value) {
  if (typeof value !== 'string') return '';
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  try { const url = new URL(value); return ['https:','http:'].includes(url.protocol) ? url.href : ''; }
  catch { return ''; }
}
