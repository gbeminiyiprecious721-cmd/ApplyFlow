const {document,run,client,assert,context}=require('./workspace.test.cjs');
context.console={...console,error:()=>{}};
const $=id=>document.getElementById(id),flush=()=>new Promise(resolve=>setImmediate(resolve));
(async()=>{
 for(const button of document.querySelectorAll('[data-agent-tab]')){button.click();assert.equal(button.getAttribute('aria-selected'),'true');assert.equal($(button.getAttribute('aria-controls')).hidden,false);assert.equal([...document.querySelectorAll('#applicationAgentV2 [role=tabpanel]')].filter(x=>!x.hidden).length,1);}
 $('autofillSetup').click();assert($('settings-connections').classList.contains('is-active'));assert.equal(document.querySelector('[data-app-tab="list"]').getAttribute('aria-selected'),'true');
 run("state=defaultState();state.signedIn=true;state.session={id:'owner-a'};state.user_id='owner-a';restoredAccountId='owner-a';dbApi=async()=>{throw new Error('Offline')};");
 await run('persistRemote()');assert.equal(run('workspaceSync.phase'),'error');assert.equal($('workspaceSyncRetry').hidden,false);assert.match($('workspaceSyncText').textContent,/could not be saved/);
 run('dbApi=async()=>({ok:true})');await run('persistRemote()');assert.equal(run('workspaceSync.phase'),'saved');assert.equal($('workspaceSyncRetry').hidden,true);
 run("state.profile.name='Private candidate A';state.jobs=[{id:'private-a',title:'Private role'}];applySignedInUser({id:'owner-b'});");assert.equal(run('state.profile.name'),'');assert.equal(run('state.jobs.length'),0);assert.equal(run('restoredAccountId'),'');
 run("dbApi=async()=>{throw new Error('Restore failed')};");await assert.rejects(run('hydrateFromRemote()'),/Restore failed/);assert.equal(run('workspaceSync.phase'),'restore-error');assert.equal(run('restoredAccountId'),'');
 run("dbApi=async()=>({payload:{profile:{name:'Candidate B'},jobs:[],resumes:[],packages:[],review:[],notifications:[],workspace:{contacts:[],interviews:[],cards:{}}}});");await run('hydrateFromRemote()');assert.equal(run('state.profile.name'),'Candidate B');assert.equal(run('restoredAccountId'),'owner-b');
 // Queue errors, dirty rules, consent and owner-scoped application reads.
 const settings={mode:'auto',enabled:true,daily_limit:5,minimum_match:85,countries:[],excluded_companies:[],consent_at:'2026-10-11'},app={id:'app-b',job_id:'job-b',preparation_state:'READY',job_snapshot:{title:'Analyst',company:'Example'}};
 const calls=[];client.auth.getUser=async()=>({data:{user:{id:'owner-b'}}});
 const q=new Proxy(function(){},{get:(_,key)=>key==='then'?(resolve=>Promise.resolve({data:[app],error:null}).then(resolve)):(...args)=>{calls.push({query:key,args});return q;}});client.from=()=>q;
 client.functions.invoke=async(name,{body})=>{calls.push(body);if(body.action==='STATUS')return {data:{settings,runs:[],provider_configured:true,provider_health:{runnable:false,message:'Browser runner needs billing or credits (HTTP 402).'}},error:null};if(body.action==='QUEUE')return {data:{error:'Browser runner needs billing or credits (HTTP 402).'},error:null};return {data:{ok:true},error:null};};
 run("showView('agent')");await flush();assert.match($('agentV2Status').textContent,/402/);assert(calls.some(c=>c.query==='eq'&&c.args[0]==='user_id'&&c.args[1]==='owner-b'));
 $('agentV2Packet').value='app-b';$('agentV2Approved').checked=true;$('agentV2Queue').click();await flush();assert.match($('agentV2Status').textContent,/402/);assert.equal($('agentV2Queue').disabled,false);assert(calls.some(c=>c.action==='QUEUE'&&c.packet_approved===true&&c.allow_submit===true));
 $('agentV2Limit').value='6';$('agentV2Limit').dispatchEvent(new context.Event('input',{bubbles:true}));const queued=calls.filter(c=>c.action==='QUEUE').length;$('agentV2Queue').click();await flush();assert.match($('agentV2Status').textContent,/Save your updated/);assert.equal(calls.filter(c=>c.action==='QUEUE').length,queued);
 const submit=new context.Event('submit',{bubbles:true,cancelable:true});$('agentV2Form').dispatchEvent(submit);await flush();assert(calls.some(c=>c.action==='SETTINGS'&&c.daily_limit===6));assert.equal($('agentV2Form').querySelector('[type=submit]').disabled,false);
 // Actual application detail workflow with hostile display content remains escaped.
 run("state.jobs=[{job_id:'job-b',application_id:'app-b',title:'Analyst <script>bad()</script>',company:'Example',stage:'Saved',location:'Berlin',url:'https://jobs.example.com/apply',notes:'',match:{eligibility:'PASS',match_score:92},score:92}];state.packages=[];ApplyFlowProduct.openApplication(state.jobs[0]);");
 assert.equal($('appDetail').querySelectorAll('script').length,0);assert(!$('appDetail').classList.contains('hidden'));assert($('appDetail').querySelector('[data-inspect]'));$('appDetail').querySelector('[data-close-app]').click();assert($('appDetail').classList.contains('hidden'));
 console.log('Workspace flows: isolated accounts, failed/restored/successful saves, focused Agent tabs, owner-scoped queue, billing failure, dirty rules and application details passed.');
})().catch(e=>{console.error(e);process.exitCode=1;});
