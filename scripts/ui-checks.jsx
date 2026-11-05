import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';

export async function checkUI({initialData,html,fetchPortfolio}){
  const dom=new JSDOM(`<html><head><meta name="description"><meta property="og:title"><meta property="og:description"></head><body><div id="root">${html}</div></body></html>`,{url:'http://portfolio.test/',pretendToBeVisual:true});
  const originals={};
  for(const key of ['window','document','navigator','HTMLElement','MouseEvent','PopStateEvent','requestAnimationFrame','cancelAnimationFrame']){
    originals[key]=Object.getOwnPropertyDescriptor(globalThis,key);
    const value=key==='requestAnimationFrame'||key==='cancelAnimationFrame'?dom.window[key].bind(dom.window):dom.window[key];
    Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});
  }
  dom.window.scrollTo=()=>{};
  let scrollTarget;
  dom.window.HTMLElement.prototype.scrollIntoView=function(){scrollTarget=this.id;};
  const originalFetch=globalThis.fetch;
  let requests=0;
  let fail=false;
  const pending=[];
  globalThis.fetch=(_url,{signal}={})=>{
    requests++;
    const task=fail?Promise.resolve({ok:false,status:503,json:async()=>({})}):fetchPortfolio().then(data=>({ok:true,status:200,json:async()=>data}));
    pending.push(task);
    if(signal?.aborted)return Promise.reject(new DOMException('Aborted','AbortError'));
    return task;
  };
  const {act}=await import('react');
  const {hydrateRoot}=await import('react-dom/client');
  const {BrowserRouter}=await import('react-router-dom');
  const {PortfolioProvider}=await import('../frontend/src/context.jsx');
  const {default:App}=await import('../frontend/src/App.jsx');
  globalThis.IS_REACT_ACT_ENVIRONMENT=true;
  const errors=[];
  let reactRoot;
  const application=(data,key='normal')=><BrowserRouter><PortfolioProvider key={key} initialData={data}><App/></PortfolioProvider></BrowserRouter>;
  async function settle(){await act(async()=>{await Promise.all(pending.splice(0));});}
  const click=async element=>{assert.ok(element,'Expected a clickable element.');await act(async()=>element.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true,cancelable:true,button:0})));await settle();};
  try{
    await act(async()=>{reactRoot=hydrateRoot(document.getElementById('root'),application(initialData),{onRecoverableError:error=>errors.push(error.message)});});
    await settle();
    assert.equal(document.querySelectorAll('.project-card').length,4);
    assert.ok(requests>0,'The standalone React app must fetch WordPress data.');
    assert.ok(document.body.textContent.includes('CMS EDIT IN REACT'));
    assert.equal(errors.length,0,'React hydration must match the prerendered HTML.');
    await click([...document.querySelectorAll('.filter')].find(button=>button.textContent.startsWith('Front end')));
    assert.equal(document.querySelectorAll('.project-card').length,1);
    assert.ok(document.querySelector('.project-card').textContent.includes('tzn Digital'));
    await click(document.querySelector('.project-card a'));
    assert.equal(window.location.pathname,'/work/tzn/');
    assert.equal(document.querySelector('h1').textContent,'tzn Digital');
    assert.ok(document.title.includes('tzn Digital'));
    await click(document.querySelector('.back-link'));
    assert.equal(window.location.pathname,'/');
    assert.equal(document.querySelectorAll('.project-card').length,4);
    const anchorErrors=[];
    window.addEventListener('error',event=>anchorErrors.push(event.error));
    for(const hash of ['#%ZZ','#%77ork']){
      scrollTarget=undefined;
      await act(async()=>{window.history.pushState({},'',hash);window.dispatchEvent(new dom.window.PopStateEvent('popstate'));});
      await new Promise(resolve=>window.requestAnimationFrame(resolve));
    }
    assert.deepEqual(anchorErrors,[],'A malformed URL fragment must not throw.');
    assert.equal(scrollTarget,'work','An encoded URL fragment must still scroll to its target.');
    await click(document.querySelector('.project-card a'));
    assert.equal(window.location.pathname,'/work/ligre/');
    assert.equal(document.querySelector('.case-body script'),null);
    assert.equal(document.querySelector('.case-body [onerror]'),null);
    await act(async()=>{window.history.pushState({},'', '/work/not-a-project/');window.dispatchEvent(new dom.window.PopStateEvent('popstate'));});
    assert.ok(document.body.textContent.includes('404 / PAGE NOT FOUND'));
    await act(async()=>{window.history.pushState({},'', '/');window.dispatchEvent(new dom.window.PopStateEvent('popstate'));});
    fail=true;
    await act(async()=>reactRoot.render(application(null,'failure')));
    await settle();
    assert.equal(document.querySelector('h1').textContent,'Portfolio unavailable');
    fail=false;
    await click(document.querySelector('button'));
    assert.equal(document.querySelectorAll('.project-card').length,4);
    return {hydration:true,real_api_refresh:true,filtering:true,case_navigation:true,metadata:true,not_found:true,error_and_retry:true,requests};
  }finally{
    if(reactRoot)await act(async()=>reactRoot.unmount());
    globalThis.fetch=originalFetch;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
    dom.window.close();
    for(const [key,descriptor] of Object.entries(originals)){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}
  }
}
