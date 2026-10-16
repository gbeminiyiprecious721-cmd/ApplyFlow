// Runs the shipped page scripts in an emulated DOM. No live accounts or employers.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const {parseHTML}=require('linkedom');
const root=path.join(__dirname,'../dist'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const {window}=parseHTML(html),document=window.document;
const storage=new Map(),noop=()=>{},errors=[];
const proto=window.HTMLElement.prototype;
Object.assign(proto,{scrollIntoView:noop,focus(){document._focused=this;},showModal(){this.setAttribute('open','');},close(){this.removeAttribute('open');},reset:noop,reportValidity(){return true;}});
Object.defineProperty(proto,'validity',{get(){return {valid:this.type!=='email'||/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(this.value||'')};}});
Object.defineProperty(window.HTMLSelectElement.prototype,'value',{configurable:true,get(){return this._value??this.querySelector('option[selected]')?.getAttribute('value')??this.querySelector('option')?.getAttribute('value')??this.querySelector('option')?.textContent??'';},set(v){this._value=String(v);}});
const query=new Proxy(function(){},{get:(_,k)=>k==='then'?(ok=>Promise.resolve({data:[],error:null}).then(ok)):()=>query});
const auth={getSession:async()=>({data:{session:null}}),getUser:async()=>({data:{user:null}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe:noop}}}),signOut:async()=>({error:null})};
const client={auth,from:()=>query,rpc:async()=>({data:[],error:null}),functions:{invoke:async()=>({data:{},error:null})},storage:{from:()=>query}};
const location={href:'https://applyflow-review.gbeminiyiprecious721.chatgpt.site/',origin:'https://applyflow-review.gbeminiyiprecious721.chatgpt.site',hash:'',search:'',pathname:'/'};
const context=vm.createContext({window,document,location,navigator:{onLine:true,userAgent:'test'},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)},sessionStorage:{getItem:()=>null,setItem:noop,removeItem:noop},console,URL,URLSearchParams,Blob,TextEncoder,TextDecoder,AbortSignal,crypto:require('node:crypto').webcrypto,atob,btoa,fetch:async()=>{throw Error('Network disabled in DOM tests');},setInterval:()=>0,clearInterval:noop,setTimeout:()=>0,clearTimeout:noop,requestAnimationFrame:noop,matchMedia:()=>({matches:false,addEventListener:noop}),MutationObserver:class{observe(){}disconnect(){}},CSS:{escape:String},confirm:()=>false,prompt:()=>null,Event:window.Event,CustomEvent:window.CustomEvent,Element:window.Element,FileReader:class{},getComputedStyle:()=>({getPropertyValue:()=>''}),performance:{now:()=>0}});
window.supabase={createClient:()=>client};window.scrollTo=noop;window.matchMedia=context.matchMedia;window.location=location;window.CSS=context.CSS;
for(const script of document.querySelectorAll('script')){
 const src=script.getAttribute('src');if(src&&(!fs.existsSync(path.join(root,src))||src.startsWith('/vendor')||src.startsWith('vendor/')))continue;
 const code=src?fs.readFileSync(path.join(root,src),'utf8'):script.textContent;
 if(!code.trim())continue;try{vm.runInContext(code,context,{filename:src||'index-inline.js'});for(const key of ['ApplyFlowProduct','ApplyFlowWorkspaces','ApplyFlowWorkspace'])if(window[key])context[key]=window[key];}catch(e){errors.push((src||'inline')+': '+e.stack);}
}
assert.deepEqual(errors,[],'Every shipped script must initialise');
const $=id=>document.getElementById(id),run=code=>vm.runInContext(code,context);
for(const view of ['overview','search','pipeline','profile','agent','settings','contacts','practice','review']){run(`showView('${view}')`);assert(!$('view-'+view).classList.contains('hidden'),view+' reachable');}
for(const button of document.querySelectorAll('[data-setting]')){button.click();assert($('settings-'+button.dataset.setting).classList.contains('is-active'));}
for(const button of document.querySelectorAll('[data-doc-tab]')){button.click();assert.equal(button.getAttribute('aria-selected'),'true');}
$('openAssistant').click();assert($('assistantDrawer').hasAttribute('open'));$('closeAssistant').click();assert(!$('assistantDrawer').hasAttribute('open'));
$('productHelp').click();assert($('helpDialog').hasAttribute('open'));$('closeHelp').click();assert(!$('helpDialog').hasAttribute('open'));
$('authLoginTab').click();assert.equal($('authTitle').textContent,'Welcome back');$('authShowPassword').click();assert.equal($('welcomePass').type,'text');$('authShowPassword').click();assert.equal($('welcomePass').type,'password');
const ids=[...document.querySelectorAll('[id]')].map(x=>x.id);assert.equal(new Set(ids).size,ids.length,'No duplicated control IDs');
console.log('Workspace: scripts, navigation, settings, documents, dialogs, auth controls and unique IDs passed (emulated DOM).');
module.exports={context,window,document,run,client,assert};

for(const selector of ['#systemDiagnostics','#settings-advanced','input[name=ctrlMode]','#autoOn','#mode','#demoMode','#runAgent','#startAgent','#pauseAgent','#stopAutopilot','#obCtrl','input[name=onboardingMode]'])assert.equal(document.querySelector(selector),null,selector+' must be removed, not hidden');
assert.equal(run('autopilotOn()'),false);

run("state.autopilot={on:true,enabled:true,mode:'auto'};fillAgentForm()");assert.equal(run('currentMode()'),'hitl');assert.equal(run('demoOn()'),false);assert.equal(run('readAutopilotSettings().enabled'),false);assert.equal(document.querySelector('#productAgentState'),null);
