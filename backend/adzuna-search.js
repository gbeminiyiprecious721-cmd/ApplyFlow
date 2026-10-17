const ORIGIN=Deno.env.get('APPLYFLOW_APP_ORIGIN')||'https://applyflow-review.gbeminiyiprecious721.chatgpt.site';
const json=(req,value,status=200)=>new Response(status===204?null:JSON.stringify(value),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':req.headers.get('origin')===ORIGIN?ORIGIN:'null','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS','Vary':'Origin'}});
async function auth(req){const bearer=req.headers.get('authorization')||'';const r=await fetch(Deno.env.get('SUPABASE_URL')+'/auth/v1/user',{headers:{Authorization:bearer,apikey:Deno.env.get('SUPABASE_ANON_KEY')},signal:AbortSignal.timeout(6000)});if(!r.ok)throw new Error('Sign in to search Adzuna.');const u=await r.json();if(!u.id)throw new Error('Sign in required.');return u.id;}
const COUNTRY_MAP=[['united kingdom','gb'],['uk','gb'],['great britain','gb'],['england','gb'],['scotland','gb'],['wales','gb'],['united states','us'],['usa','us'],['us','us'],['canada','ca'],['australia','au'],['germany','de'],['france','fr'],['ireland','ie'],['netherlands','nl'],['india','in'],['singapore','sg'],['south africa','za']];
function adzunaCountry(where){const w=String(where||'').toLowerCase();for(const [needle,code] of COUNTRY_MAP)if(new RegExp('(^|[^a-z])'+needle+'([^a-z]|$)').test(w))return code;return 'gb';}
Deno.serve(async req=>{
  if(req.method==='GET' && new URL(req.url).searchParams.get('health')==='1')return json(req,{service:'adzuna',configured:!!(Deno.env.get('ADZUNA_APP_ID')&&Deno.env.get('ADZUNA_APP_KEY'))});
  if(req.method==='OPTIONS')return json(req,{},204);
  if(req.method!=='POST')return json(req,{error:'POST required'},405);
  if(req.headers.get('origin')!==ORIGIN)return json(req,{error:'Origin not allowed'},403);
  try{
    try{await auth(req);}catch{return json(req,{error:'Sign in to search Adzuna.'},401);}
    const appId=Deno.env.get('ADZUNA_APP_ID');
    const appKey=Deno.env.get('ADZUNA_APP_KEY');
    if(!appId||!appKey)return json(req,{error:'Adzuna is not configured.'},501);
    const text=await req.text();
    if(text.length>4000)return json(req,{error:'Request too large'},413);
    const body=JSON.parse(text||'{}');
    const what=String(body.what||'').slice(0,200);
    const where=String(body.where||'').slice(0,200);
    const page=Math.max(1,Math.min(50,Math.floor(Number(body.page)||1)));
    const country=adzunaCountry(where);
    const params=new URLSearchParams({app_id:appId,app_key:appKey,results_per_page:'25','content-type':'application/json'});
    if(what)params.set('what',what);
    if(where)params.set('where',where);
    const minSalary=Math.max(0,Number(body.salary)||0);
    if(minSalary)params.set('salary_min',String(minSalary));
    if(/part-time/i.test(body.emp||''))params.set('part_time','1');
    else if(/full-time/i.test(body.emp||''))params.set('full_time','1');
    else if(/contract/i.test(body.emp||''))params.set('contract','1');
    const distance=Math.max(0,Number(body.dist)||0);
    if(distance)params.set('distance',String(distance));
    const maxDaysOld=Math.max(0,Number(body.posted)||0);
    if(maxDaysOld)params.set('max_days_old',String(maxDaysOld));
    const res=await fetch('https://api.adzuna.com/v1/api/jobs/'+country+'/search/'+page+'?'+params,{signal:AbortSignal.timeout(12000)});
    if(res.status===429)return json(req,{error:'Adzuna rate limit reached. Try again shortly.'},429);
    if(!res.ok)return json(req,{error:'Adzuna request failed.'},502);
    const data=await res.json();
    const results=(data.results||[]).map(r=>({
      title:r.title||'',
      company:r.company?.display_name||'',
      location:r.location?.display_name||'',
      description:r.description||'',
      url:r.redirect_url||'',
      salary_min:Number(r.salary_min||0),
      salary_max:Number(r.salary_max||0),
      salary_currency:country==='gb'?'GBP':(country==='us'?'USD':''),
      date_posted:r.created||'',
      employment_type:r.contract_time||''
    }));
    return json(req,{results});
  }catch(e){
    return json(req,{error:e instanceof SyntaxError?'Invalid search request.':'Adzuna search could not finish.'},e instanceof SyntaxError?400:502);
  }
});
