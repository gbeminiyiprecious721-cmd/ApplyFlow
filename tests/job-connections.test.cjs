const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const providers=['adzuna','greenhouse','lever'];const options=providers.map(value=>({value,textContent:value,disabled:true}));
const select={options,value:'jobicy'};let authListener;let response={data:{sources:{adzuna:true,greenhouse:false,lever:false}}};let session={user:{id:'a'}};let resolveDelayed, rejectDelayed;
const context=vm.createContext({window:{},uiElement:id=>id==='provider'?select:null,setTimeout,Error,supabaseClient:{auth:{getSession:async()=>({data:{session}}),onAuthStateChange:fn=>authListener=fn},functions:{invoke:async(name,{body})=>{assert.equal(name,'applyflow-capability-gateway');assert.equal(body.provider,'status');return response;}}}});
vm.runInContext(fs.readFileSync('dist/job-connections.js','utf8'),context);
const tick=()=>new Promise(r=>setTimeout(r,10));
(async()=>{
 await tick();assert.equal(options[0].disabled,false);assert.equal(options[1].disabled,true);assert.equal(context.window.applyflowJobConnections.isReady('adzuna'),true);
 response={data:{sources:{adzuna:false,greenhouse:true,lever:true}}};await context.window.applyflowJobConnections.refresh();assert.equal(options[0].disabled,true);assert.equal(options[1].disabled,false);assert.equal(options[2].disabled,false);
 response={error:{message:'offline'}};select.value='lever';await context.window.applyflowJobConnections.refresh();assert(options.every(o=>o.disabled));assert.equal(select.value,'jobicy');
 response=new Promise(r=>resolveDelayed=r);const pending=context.window.applyflowJobConnections.refresh();await tick();session=null;authListener();resolveDelayed({data:{sources:{adzuna:true,greenhouse:true,lever:true}}});await pending;await tick();assert(options.every(o=>o.disabled),'A late response after sign-out must not re-enable providers');
 session={user:{id:'b'}};response=new Promise((resolve,reject)=>rejectDelayed=reject);const staleFailure=context.window.applyflowJobConnections.refresh();await tick();response={data:{sources:{adzuna:true}}};await context.window.applyflowJobConnections.refresh();rejectDelayed(Error('old request failed'));await staleFailure;assert.equal(context.window.applyflowJobConnections.isReady('adzuna'),true,'A stale failed response must not clear newer availability');
 console.log('Job connections: readiness, unavailable providers, network failure and stale-account responses passed.');
})().catch(e=>{console.error(e);process.exit(1)});
