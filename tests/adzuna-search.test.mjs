import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
let handle,adzunaCalls=[],adzunaStatus=200,adzunaBody={results:[]};
const env={SUPABASE_URL:'https://project.example',SUPABASE_ANON_KEY:'mock-public',APPLYFLOW_APP_ORIGIN:'https://applyflow-review.gbeminiyiprecious721.chatgpt.site'};
const fetch=async(url,options={})=>{
  if(url.endsWith('/auth/v1/user'))return new Response(JSON.stringify(options.headers.Authorization==='Bearer user-token'?{id:'owner-a'}:{}),{status:options.headers.Authorization==='Bearer user-token'?200:401});
  if(url.includes('api.adzuna.com')){adzunaCalls.push(url);return new Response(JSON.stringify(adzunaBody),{status:adzunaStatus});}
  throw Error('Unexpected network path: '+url);
};
const context=vm.createContext({Deno:{env:{get:key=>env[key]},serve:fn=>handle=fn},fetch,Response,Request,URL,URLSearchParams,AbortSignal,Date,Math,Number,String,JSON});
vm.runInContext(fs.readFileSync(new URL('../backend/adzuna-search.js',import.meta.url),'utf8'),context);
const origin=env.APPLYFLOW_APP_ORIGIN;
async function request(body,authorization='Bearer user-token',requestOrigin=origin){const response=await handle(new Request('https://edge.example/',{method:'POST',headers:{Origin:requestOrigin,Authorization:authorization,'Content-Type':'application/json'},body:JSON.stringify(body)}));return {status:response.status,body:await response.json()};}

// Origin and auth are enforced before anything else.
assert.equal((await request({what:'analyst'},undefined,'https://evil.example')).status,403);
assert.equal((await request({what:'analyst'},'Bearer bad')).status,401);
assert.equal(adzunaCalls.length,0,'No Adzuna request should fire for rejected origin/auth');

// Without configured credentials, the function fails clearly rather than silently.
let r=await request({what:'analyst'});
assert.equal(r.status,501);
assert.match(r.body.error,/not configured/i);
assert.equal(adzunaCalls.length,0,'No request without credentials');

// With credentials configured, a real request is made and results are normalized to the
// flat shape the frontend's normalizeJob() expects (company/location as strings, not objects).
env.ADZUNA_APP_ID='mock-app-id';env.ADZUNA_APP_KEY='mock-app-key';
adzunaBody={results:[{title:'Data Analyst',company:{display_name:'Acme Ltd'},location:{display_name:'London'},description:'Analyse things',redirect_url:'https://jobs.example/1',salary_min:40000,salary_max:50000,created:'2026-10-01',contract_time:'full_time'}]};
r=await request({what:'data analyst',where:'United Kingdom',salary:30000,emp:'full-time',dist:10,posted:7,page:2});
assert.equal(r.status,200);
assert.equal(r.body.results.length,1);
assert.deepEqual(r.body.results[0],{title:'Data Analyst',company:'Acme Ltd',location:'London',description:'Analyse things',url:'https://jobs.example/1',salary_min:40000,salary_max:50000,salary_currency:'GBP',date_posted:'2026-10-01',employment_type:'full_time'});
assert.equal(adzunaCalls.length,1);
const calledUrl=new URL(adzunaCalls[0]);
assert.equal(calledUrl.pathname,'/v1/api/jobs/gb/search/2');
assert.equal(calledUrl.searchParams.get('app_id'),'mock-app-id');
assert.equal(calledUrl.searchParams.get('app_key'),'mock-app-key');
assert.equal(calledUrl.searchParams.get('what'),'data analyst');
assert.equal(calledUrl.searchParams.get('salary_min'),'30000');
assert.equal(calledUrl.searchParams.get('full_time'),'1');
assert.equal(calledUrl.searchParams.get('distance'),'10');
assert.equal(calledUrl.searchParams.get('max_days_old'),'7');

// Country mapping picks a sensible Adzuna locale from free-text location.
r=await request({what:'engineer',where:'United States'});
assert.equal(new URL(adzunaCalls.at(-1)).pathname,'/v1/api/jobs/us/search/1');
r=await request({what:'engineer',where:''});
assert.equal(new URL(adzunaCalls.at(-1)).pathname,'/v1/api/jobs/gb/search/1','Defaults to gb when no location given');

// Upstream failures are surfaced honestly, not swallowed into an empty success.
adzunaStatus=429;r=await request({what:'analyst'});assert.equal(r.status,429);assert.match(r.body.error,/rate limit/i);
adzunaStatus=500;r=await request({what:'analyst'});assert.equal(r.status,502);

// Preflight.
const preflight=await handle(new Request('https://edge.example/',{method:'OPTIONS',headers:{Origin:origin}}));
assert.equal(preflight.status,204);
assert.equal(preflight.headers.get('Access-Control-Allow-Origin'),origin);

console.log('Adzuna search: origin/auth guards, unconfigured-credentials handling, result normalization, country mapping and upstream failure handling passed (mock Adzuna API).');
