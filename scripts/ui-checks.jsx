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
  const dialogPrototype = dom.window.HTMLDialogElement.prototype;
  dialogPrototype.showModal ??= function() { this.open = true; };
  dialogPrototype.close ??= function() {
    this.open = false;
    this.dispatchEvent(new dom.window.Event('close'));
  };
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
  const click=async (element,detail=0)=>{assert.ok(element,'Expected a clickable element.');await act(async()=>element.dispatchEvent(new dom.window.MouseEvent('click',{bubbles:true,cancelable:true,button:0,detail})));await settle();};
  try{
    await act(async()=>{reactRoot=hydrateRoot(document.getElementById('root'),application(initialData),{onRecoverableError:error=>errors.push(error.message)});});
    await settle();
    assert.equal(document.querySelectorAll('.project-card').length,4);
    assert.equal(document.querySelectorAll('.gallery-slide').length,4);
    assert.ok(requests>0,'The standalone React app must fetch WordPress data.');
    assert.ok(document.body.textContent.includes('CMS EDIT IN REACT'));
    assert.equal(errors.length,0,'React hydration must match the prerendered HTML.');
    assert.notEqual(document.activeElement,document.getElementById('main'),'Initial hydration must preserve the current focus.');
    const currentProject=()=>document.querySelector('.gallery-current').textContent;
    const galleryButton=label=>document.querySelector(`.gallery-controls button[aria-label="${label} project"]`);
    assert.equal(currentProject(),'LIGRE Coffee Equipment');
    await click(galleryButton('Next'));
    assert.equal(currentProject(),'Walhalla Weine');
    await act(async()=>document.querySelector('.gallery-current').dispatchEvent(
      new dom.window.KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true,cancelable:true}),
    ));
    assert.equal(currentProject(),'LIGRE Coffee Equipment');
    await click(document.querySelector('.gallery-slide[data-position="-1"]'));
    assert.equal(window.location.pathname,'/work/tzn/','An off-center card must open its own case study.');
    await click(document.querySelector('.back-link'));
    assert.equal(currentProject(),'tzn Digital');
    await click(document.querySelector('.showcase-about'));
    assert.equal(document.querySelector('.about-dialog').open,true);
    const copiedEmails=[];
    let finishCopy;
    Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:email=>{
      copiedEmails.push(email);
      return new Promise(resolve=>{finishCopy=resolve;});
    }}});
    const copyButton=document.querySelector('.copy-email');
    await click(copyButton);
    assert.equal(copyButton.disabled,true,'Copy email must be disabled while the clipboard request is pending.');
    assert.equal(copyButton.getAttribute('aria-busy'),'true');
    assert.equal(copyButton.textContent,'Copying email…');
    await click(copyButton);
    assert.deepEqual(copiedEmails,[initialData.profile.email],'A pending clipboard request must not be duplicated.');
    await act(async()=>finishCopy());
    assert.equal(copyButton.disabled,false);
    assert.equal(copyButton.textContent,'Email copied');
    navigator.clipboard.writeText=async()=>{throw new Error('Clipboard access denied');};
    await click(copyButton);
    assert.equal(copyButton.disabled,false,'Clipboard failure must leave the button available for another attempt.');
    assert.equal(copyButton.textContent,'Select email to copy');
    assert.ok(document.querySelector('.contact-panel [role="status"]').textContent.includes('browser’s copy command'));
    navigator.clipboard.writeText=async email=>{copiedEmails.push(email);};
    await click(copyButton);
    assert.equal(copyButton.textContent,'Email copied','Copying must recover after a clipboard failure.');
    await click([...document.querySelectorAll('.filter')].find(button=>button.textContent.startsWith('Front end')));
    assert.equal(document.querySelectorAll('.project-card').length,1);
    assert.ok(document.querySelector('.project-card').textContent.includes('tzn Digital'));
    await click(document.querySelector('.project-card a'));
    assert.equal(window.location.pathname,'/work/tzn/');
    assert.equal(document.querySelector('h1').textContent,'tzn Digital');
    assert.ok(document.title.includes('tzn Digital'));
    assert.equal(document.activeElement,document.getElementById('main'),'A case study navigation must focus the new main content.');
    await click(document.querySelector('.back-link'));
    assert.equal(window.location.pathname,'/');
    assert.equal(document.querySelectorAll('.project-card').length,4);
    assert.equal(currentProject(),'tzn Digital','Closing a case study must restore the selected slide.');
    assert.equal(document.querySelector('.about-dialog').open,false);
    assert.equal(document.activeElement,document.getElementById('main'),'Returning home must focus its main content.');
    const stage=document.querySelector('.gallery-stage');
    const centered=stage.querySelector('[data-position="0"]');
    const pointer=(type,clientX,timeStamp)=>{
      const event=new dom.window.PointerEvent(type,{
        bubbles:true,button:0,clientX,clientY:120,pointerId:1,pointerType:'mouse',isPrimary:true,
      });
      Object.defineProperty(event,'timeStamp',{value:timeStamp});
      return event;
    };
    const frame=()=>new Promise(resolve=>window.requestAnimationFrame(resolve));
    const finishTravel=()=>act(async()=>{
      let previousOffset;
      for(let i=0;i<90;i++){
        await frame();
        const offset=centered.style.getPropertyValue('--arc-x');
        if(offset===previousOffset&&!stage.hasAttribute('data-moving'))return;
        previousOffset=offset;
      }
      assert.fail('The carousel must settle and clear color separation.');
    });
    await act(async()=>{
      centered.dispatchEvent(pointer('pointermove',240,0));
      await frame();
    });
    assert.ok(Number.parseFloat(stage.style.getPropertyValue('--camera-yaw'))>0,'The camera must follow the pointer.');
    await act(async()=>{
      centered.dispatchEvent(pointer('pointerdown',260,10));
      stage.dispatchEvent(pointer('pointermove',190,100));
      await frame();
    });
    assert.equal(stage.dataset.dragging,'true');
    assert.ok(Number(centered.style.getPropertyValue('--arc-x'))<0,'The card must move while the pointer is held.');
    assert.ok(Number(stage.querySelector('[data-shift="red"]').getAttribute('dx'))>0,'Color separation must follow the direction of travel.');
    await act(async()=>stage.dispatchEvent(pointer('pointerup',190,145)));
    await click(centered,1);
    assert.equal(window.location.pathname,'/','Releasing a drag must not open a case study.');
    await finishTravel();
    const partialOffset=Number(centered.style.getPropertyValue('--arc-x'));
    assert.ok(partialOffset<-.31&&partialOffset>-.34,'A short drag must settle at the dragged offset.');
    assert.equal(currentProject(),'tzn Digital','The closest card must remain selected after a short drag.');
    await act(async()=>stage.dispatchEvent(new dom.window.WheelEvent('wheel',{bubbles:true,deltaX:100})));
    await finishTravel();
    const wheelOffset=Number(centered.style.getPropertyValue('--arc-x'));
    assert.ok(wheelOffset<-.65&&wheelOffset>-.95,'Wheel input must leave the carousel between cards.');
    assert.equal(currentProject(),'LIGRE Coffee Equipment');
    await click(galleryButton('Previous'));
    assert.equal(currentProject(),'tzn Digital');
    const focusedProject=document.querySelector('.gallery-current');
    focusedProject.focus();
    const anchorErrors=[];
    window.addEventListener('error',event=>anchorErrors.push(event.error));
    for(const hash of ['#%ZZ','#%77ork']){
      scrollTarget=undefined;
      await act(async()=>{window.history.pushState({},'',hash);window.dispatchEvent(new dom.window.PopStateEvent('popstate'));});
      await new Promise(resolve=>window.requestAnimationFrame(resolve));
    }
    assert.deepEqual(anchorErrors,[],'A malformed URL fragment must not throw.');
    assert.equal(scrollTarget,'work','An encoded URL fragment must still scroll to its target.');
    assert.equal(document.activeElement,focusedProject,'Section navigation must preserve keyboard focus on the same page.');
    await click(galleryButton('Next'));
    assert.equal(currentProject(),'LIGRE Coffee Equipment','Advancing from the last slide must wrap to the first.');
    await click(document.querySelector('.gallery-slide[data-position="0"]'));
    assert.equal(window.location.pathname,'/work/ligre/');
    assert.equal(document.querySelector('.case-body script'),null);
    assert.equal(document.querySelector('.case-body [onerror]'),null);
    await act(async()=>{window.history.pushState({},'', '/work/not-a-project/');window.dispatchEvent(new dom.window.PopStateEvent('popstate'));});
    assert.ok(document.body.textContent.includes('404 / PAGE NOT FOUND'));
    assert.equal(document.activeElement,document.getElementById('main'),'The 404 route must also receive keyboard focus.');
    const normalFetch=globalThis.fetch;
    let finishCaseRequest;
    globalThis.fetch=()=>new Promise(resolve=>{finishCaseRequest=resolve;});
    await act(async()=>reactRoot.render(application(initialData,'case-metadata')));
    assert.equal(document.title,`Loading case study — ${initialData.profile.name}`);
    assert.equal(document.querySelector('meta[name="description"]').content,'Loading the requested project and its case study.');
    assert.ok(document.querySelector('main [role="status"]').textContent.includes('Loading case study'));
    await act(async()=>finishCaseRequest({ok:false,status:503}));
    assert.equal(document.querySelector('h1').textContent,'Case study unavailable');
    assert.equal(document.title,`Case study unavailable — ${initialData.profile.name}`);
    assert.equal(document.querySelector('meta[property="og:title"]').content,document.title);
    assert.equal(document.querySelector('meta[name="description"]').content,'This case study couldn’t be loaded. Please try again.');
    assert.equal(document.querySelector('link[rel="canonical"]').href,'http://portfolio.test/work/not-a-project/');
    globalThis.fetch=normalFetch;
    await click(document.querySelector('.case-page button'));
    assert.ok(document.title.startsWith('Page not found'),'A successful retry must replace the unavailable metadata.');
    await act(async()=>{window.history.pushState({},'', '/');window.dispatchEvent(new dom.window.PopStateEvent('popstate'));});
    fail=true;
    await act(async()=>reactRoot.render(application(null,'failure')));
    await settle();
    assert.equal(document.querySelector('h1').textContent,'Portfolio unavailable');
    fail=false;
    await click(document.querySelector('button'));
    assert.equal(document.querySelectorAll('.project-card').length,4);
    return {hydration:true,real_api_refresh:true,gallery_navigation:true,gallery_drag:true,about_panel:true,copy_email:true,filtering:true,case_navigation:true,route_focus:true,metadata:true,case_state_metadata:true,not_found:true,error_and_retry:true,requests};
  }finally{
    if(reactRoot)await act(async()=>reactRoot.unmount());
    globalThis.fetch=originalFetch;
    delete globalThis.IS_REACT_ACT_ENVIRONMENT;
    dom.window.close();
    for(const [key,descriptor] of Object.entries(originals)){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}
  }
}
