import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const site='https://applyflow-review.gbeminiyiprecious721.chatgpt.site';
const headers={'Access-Control-Allow-Origin':site,'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json','Cache-Control':'no-store'};
const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
const pilotUser='231030d0-1aaf-48bc-922d-9c179b5eb991';


const boardHosts=['boards.greenhouse.io','job-boards.greenhouse.io','jobs.lever.co','jobs.eu.lever.co'];
async function searchBoards(userId,payload){
 const query=payload?.body?.q;
 if(payload?.path!=='/search'||payload?.method!=='POST'||typeof query!=='string'||query.length<1||query.length>400)return reply({message:'Invalid job search request'},400);
 const sites=[...query.matchAll(/site:([a-z0-9.-]+)/gi)].map(m=>m[1].toLowerCase());
 if(!sites.length||sites.some(host=>!boardHosts.includes(host)))return reply({message:'Choose a supported Greenhouse or Lever job-board search'},400);
 const key=Deno.env.get('SERPER_API_KEY');
 if(!key)return reply({message:'Greenhouse and Lever search needs its server search connection configured'},501);
 const admin=createClient(Deno.env.get('SUPABASE_URL'),Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),{auth:{persistSession:false,autoRefreshToken:false}});
 const reserved=await admin.rpc('reserve_capability_call',{p_user:userId});
 if(reserved.error)return reply({message:'Request limit reached; retry later'},429);
 const upstream=await fetch('https://google.serper.dev/search',{
  method:'POST',headers:{'Content-Type':'application/json','X-API-KEY':key},
  body:JSON.stringify({q:query,num:Math.min(10,Math.max(1,Math.floor(Number(payload.body.num)||10)))}),signal:AbortSignal.timeout(20000)
 });
 if(!upstream.ok)return reply({message:upstream.status===429?'Job search request limit reached; try later':'Job search provider is temporarily unavailable'},upstream.status===429?429:503);
 const data=await upstream.json();
 if(!Array.isArray(data.organic))return reply({message:'Job search returned an invalid response'},502);
 const wantedGreenhouse=sites.some(h=>h.includes('greenhouse.io'));
 const wantedLever=sites.some(h=>h.includes('lever.co'));
 const organic=data.organic.filter(r=>{try{const u=new URL(r.link);return u.protocol==='https:'&&boardHosts.includes(u.hostname)&&((wantedGreenhouse&&u.hostname.endsWith('greenhouse.io'))||(wantedLever&&u.hostname.endsWith('lever.co')));}catch{return false;}}).slice(0,10).map(r=>({title:String(r.title||'').slice(0,400),link:r.link,snippet:String(r.snippet||'').slice(0,3000)}));
 return reply({organic});
}

export async function handle(req){
 if(req.headers.get('origin')&&req.headers.get('origin')!==site)return reply({message:'Origin not permitted'},403);
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return reply({message:'Method not allowed'},405);
 try{
  const authorization=req.headers.get('authorization')||'';
  if(!authorization.startsWith('Bearer '))return reply({message:'Sign in required'},401);
  const client=createClient(Deno.env.get('SUPABASE_URL'),Deno.env.get('SUPABASE_ANON_KEY'),{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await client.auth.getUser();
  if(error||!data.user)return reply({message:'Sign in required'},401);

  const raw=await req.text();if(raw.length>120000)return reply({message:'Request too large'},413);
  const body=JSON.parse(raw);
  if(body.provider==='status'){const search=!!Deno.env.get('SERPER_API_KEY');return reply({sources:{adzuna:!!(Deno.env.get('ADZUNA_APP_ID')&&Deno.env.get('ADZUNA_APP_KEY')),greenhouse:search,lever:search},mailbox:{connected:false,implemented:false}});}
  if(body.provider==='serper')return await searchBoards(data.user.id,body.body);
  // Preserve the existing AI pilot; job search has a separate authenticated route.
  if(data.user.id!==pilotUser)return reply({message:'AI access is not enabled for this account yet'},403);
  if(body.provider!=='llm')return reply({message:'This provider is not connected yet'},503);
  const messages=body.body?.messages;
  if(!Array.isArray(messages)||messages.length<1||messages.length>20||messages.some(m=>!m||!['system','user','assistant'].includes(m.role)||typeof m.content!=='string'||m.content.length>60000))return reply({message:'Invalid messages'},400);
  const key=Deno.env.get('OPENAI_API_KEY');
  if(!key)return reply({message:'AI backend key is not configured yet'},503);
  const admin=createClient(Deno.env.get('SUPABASE_URL'),Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),{auth:{persistSession:false,autoRefreshToken:false}});
  const reserved=await admin.rpc('reserve_capability_call',{p_user:data.user.id});
  if(reserved.error)return reply({message:'Request limit reached; retry later'},429);
  const upstream=await fetch('https://api.openai.com/v1/chat/completions',{
   method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+key},
   body:JSON.stringify({model:'gpt-4.1-mini-2025-04-14',messages,max_completion_tokens:4000,temperature:0.2,store:false}),
   signal:AbortSignal.timeout(40000)
  });
  if(!upstream.ok){
   const result=await upstream.json().catch(()=>({}));
   const code=result.error?.code;
   const message=['insufficient_quota','credit_balance_exhausted'].includes(code)?'OpenAI billing or credits need attention':upstream.status===401?'The backend AI key needs attention':upstream.status===429?'AI request limit reached; try again later':'AI provider is temporarily unavailable';
   return reply({message},upstream.status===429?429:503);
  }
  const result=await upstream.json();
  if(!result.choices?.[0]?.message?.content)return reply({message:'AI returned no usable response'},502);
  return reply({choices:result.choices,model:result.model,usage:result.usage});
 }catch(error){return reply({message:error instanceof SyntaxError?'Invalid request':'AI request could not finish; try again later'},error instanceof SyntaxError?400:503)}
}
Deno.serve(handle);
