import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
let handle;let searches=0;let limits=0;let authOK=true;let rateLimited=false;let upstreamStatus=200;
const env={SUPABASE_URL:'https://auth.example',SUPABASE_ANON_KEY:'mock-public',SUPABASE_SERVICE_ROLE_KEY:'mock-backend',SERPER_API_KEY:'mock-search'};
const context=vm.createContext({Deno:{env:{get:k=>env[k]},serve:fn=>handle=fn},createClient:()=>({auth:{getUser:async()=>({data:{user:authOK?{id:'non-pilot-user'}:null},error:null})},rpc:async()=>{limits++;return {error:rateLimited?{}:null};}}),fetch:async(url,options)=>{assert.equal(url,'https://google.serper.dev/search');searches++;assert.equal(options.headers['X-API-KEY'],'mock-search');return Response.json({organic:[{title:'Data analyst',link:'https://job-boards.greenhouse.io/sample/jobs/123',snippet:'Public role'},{title:'Unrelated',link:'https://unrelated.example/role'},{title:'Unsafe',link:'javascript:alert(1)'}]},{status:upstreamStatus});},Request,Response,URL,URLSearchParams,AbortSignal,JSON,Array,String,Number,Math,Date,SyntaxError,Error});
vm.runInContext(fs.readFileSync('backend/capability-gateway.js','utf8').replace(/^import .*;\r?\n/,'').replace('export async function','async function'),context);
const origin='https://applyflow-review.gbeminiyiprecious721.chatgpt.site';
const body={provider:'serper',body:{path:'/search',method:'POST',body:{q:'analyst site:boards.greenhouse.io',num:10}}};
async function req(payload=body,headers={Origin:origin,Authorization:'Bearer user-token'}){return handle(new Request('https://edge.example',{method:'POST',headers,body:JSON.stringify(payload)}));}
const readiness=await req({provider:'status'});assert.equal(readiness.status,200);const readinessBody=await readiness.json();assert.equal(readinessBody.sources.greenhouse,true);assert.equal(readinessBody.sources.adzuna,false);assert.equal(readinessBody.mailbox.implemented,false);assert.equal(searches,0,'Status must never spend provider quota');
let r=await req();assert.equal(r.status,200,'Authenticated search must have a provider route');assert.equal((await r.json()).organic.length,1,'Only job-board URLs may leave the proxy');assert.equal(searches,1);assert.equal(limits,1);
r=await req({...body,body:{...body.body,path:'https://evil.example'}});assert.equal(r.status,400);assert.equal(searches,1);
r=await req({...body,body:{...body.body,body:{q:'arbitrary general search'}}});assert.equal(r.status,400);
authOK=false;assert.equal((await req({provider:'status'})).status,401);assert.equal((await req()).status,401);authOK=true;
rateLimited=true;assert.equal((await req()).status,429);rateLimited=false;
upstreamStatus=401;r=await req();assert.equal(r.status,503);assert.doesNotMatch(await r.text(),/mock-search/);upstreamStatus=200;
delete env.SERPER_API_KEY;assert.equal((await req()).status,501);
assert.equal((await req(body,{Origin:'https://evil.example',Authorization:'Bearer user-token'})).status,403);
assert.equal((await req({provider:'llm',body:{messages:[]}})).status,403,'Search support must not broaden the existing AI pilot');
console.log('Capability gateway: authenticated search, site restriction, rate limit, unavailable credentials, upstream errors and unchanged AI pilot passed.');
