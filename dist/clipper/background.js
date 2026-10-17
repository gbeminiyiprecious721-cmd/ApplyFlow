const API='https://tbggqauyesloekynqavb.supabase.co';
const PUBLIC_KEY='APPLYFLOW_LOCAL_KEY_NOT_INCLUDED';
function validKeyFormat(key){const k=String(key||'').trim();return (k.startsWith('sb_publishable_')&&k.length>24)||(k.startsWith('eyJ')&&k.split('.').length===3);}
async function getKey(){const {projectKey}=await chrome.storage.local.get('projectKey');if(projectKey&&validKeyFormat(projectKey))return projectKey;if(PUBLIC_KEY!=='APPLYFLOW_LOCAL_KEY_NOT_INCLUDED')return PUBLIC_KEY;return null;}
function permitted(url){try{const u=new URL(url);return (u.protocol==='http:'&&['127.0.0.1','localhost'].includes(u.hostname))||(u.protocol==='https:'&&u.hostname==='applyflow-review.gbeminiyiprecious721.chatgpt.site');}catch{return false;}}
chrome.runtime.onMessageExternal.addListener((message,sender,respond)=>{
 (async()=>{
  if(!permitted(sender.url)||sender.frameId!==0)throw new Error('Open the trusted ApplyFlow page to connect.');
  const source=new URL(sender.url).origin;
  if(message.type==='UNPAIR'){const {pair}=await chrome.storage.session.get('pair');if(pair&&pair.origin!==source)throw new Error('Connection belongs to a different ApplyFlow origin.');await chrome.storage.session.remove(['pair','pending']);return {ok:true};}
  if(message.type!=='PAIR'||typeof message.accessToken!=='string'||message.accessToken.length>6000)throw new Error('Invalid connection request.');
  const key=await getKey();if(!key)throw new Error('Open the extension popup and enter your project key first.');
  const response=await fetch(API+'/auth/v1/user',{headers:{apikey:key,Authorization:'Bearer '+message.accessToken}});
  if(!response.ok)throw new Error('Sign-in session expired. Reconnect in ApplyFlow.');
  const user=await response.json();
  const {pair}=await chrome.storage.session.get('pair');
  if(!Number.isFinite(Number(message.expiresAt))||Number(message.expiresAt)*1000<=Date.now())throw new Error('Sign-in session expired. Reconnect in ApplyFlow.');
  const pending={accessToken:message.accessToken,expiresAt:Number(message.expiresAt),appUrl:sender.url,origin:source,email:user.email||'Signed-in user',userId:user.id};
  if(pair&&pair.origin===source&&pair.userId===user.id){await chrome.storage.session.set({pair:pending});return {ok:true};}
  await chrome.storage.session.set({pending});return {ok:true,pending:true};
 })().then(respond).catch(e=>respond({ok:false,error:e.message}));return true;
});
chrome.runtime.onMessage.addListener((message,sender,respond)=>{
 if(sender.id!==chrome.runtime.id)return false;
 (async()=>{
  if(message.type==='STATUS'){const {pair,pending}=await chrome.storage.session.get(['pair','pending']);return {ok:true,hasKey:!!(await getKey()),paired:!!pair&&Number.isFinite(pair.expiresAt)&&pair.expiresAt*1000>Date.now(),email:pair?.email,pendingEmail:pending?.email,appUrl:pair?.appUrl};}
  if(message.type==='SET_KEY'){
   if(sender.url!==chrome.runtime.getURL('popup.html'))throw new Error('Open the extension popup to set your project key.');
   const key=String(message.key||'').trim();if(!validKeyFormat(key))throw new Error('Enter a Supabase public publishable key or anon JWT, not a secret key.');
   await chrome.storage.local.set({projectKey:key});return {ok:true};
  }
  if(message.type==='ACCEPT_PAIR'){const {pending}=await chrome.storage.session.get('pending');if(!pending)throw new Error('Connect from ApplyFlow first.');if(!Number.isFinite(pending.expiresAt)||pending.expiresAt*1000<=Date.now())throw new Error('This connection expired. Reconnect from ApplyFlow.');await chrome.storage.session.set({pair:pending});await chrome.storage.session.remove('pending');return {ok:true,email:pending.email};}
  if(message.type==='UNPAIR'){await chrome.storage.session.remove(['pair','pending']);return {ok:true};}
  const {pair}=await chrome.storage.session.get('pair');if(!pair||!Number.isFinite(pair.expiresAt)||pair.expiresAt*1000<=Date.now())throw new Error('Connect a current ApplyFlow sign-in session first.');
  const key=await getKey();if(!key)throw new Error('Open the extension popup and enter your project key first.');
  if(message.type==='SAVE_NAMES'){
   if(sender.url!==chrome.runtime.getURL('popup.html'))throw new Error('Open the extension popup to confirm names.');
   const first=String(message.first_name||'').trim(),last=String(message.last_name||'').trim();if(!first||!last||first.length>100||last.length>100)throw new Error('Enter and confirm your first and last names.');
   const response=await fetch(API+'/rest/v1/answer_bank?on_conflict=user_id,normalized_question',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+pair.accessToken,'Content-Type':'application/json',Prefer:'resolution=merge-duplicates'},body:JSON.stringify([{user_id:pair.userId,normalized_question:'first_name',answer:first,verified:true,sensitive:false,last_confirmed_at:new Date().toISOString()},{user_id:pair.userId,normalized_question:'last_name',answer:last,verified:true,sensitive:false,last_confirmed_at:new Date().toISOString()}])});if(!response.ok)throw new Error('Could not save names. Reconnect your account and retry.');return {ok:true};
  }
  if(message.type==='AUTOFILL_PROFILE'){
   // Extension pages only: never disclose candidate data to content scripts or sites.
   if(sender.url!==chrome.runtime.getURL('popup.html'))throw new Error('Open the extension popup to autofill.');
   const headers={apikey:key,Authorization:'Bearer '+pair.accessToken};
   const get=async path=>{const r=await fetch(API+path,{headers});if(!r.ok)throw new Error('Could not load your profile. Reconnect ApplyFlow.');return r.json();};
   const [profiles,answers]=await Promise.all([get('/rest/v1/profiles?user_id=eq.'+encodeURIComponent(pair.userId)+'&select=full_name,email,telephone,location,linkedin_url,github_url,portfolio_url'),get('/rest/v1/answer_bank?user_id=eq.'+encodeURIComponent(pair.userId)+'&verified=eq.true&sensitive=eq.false&select=normalized_question,answer,verified,sensitive')]);
   if(!profiles[0])throw new Error('Save your candidate profile in ApplyFlow first.');
   const profile=profiles[0];profile.email=profile.email||pair.email;
   // First/last names must be confirmed separately in the answer bank; never guess splits.
   profile.first_name=answers.find(a=>/^first[ _]name$/i.test(a.normalized_question))?.answer;
   profile.last_name=answers.find(a=>/^last[ _]name$/i.test(a.normalized_question))?.answer;
   return {ok:true,profile,answers};
  }
  if(message.type!=='CAPTURE')throw new Error('Unsupported request.');
  const capture=message.capture;if(!capture||!/^https:\/\//.test(capture.url)||!capture.company?.trim()||!capture.title?.trim()||capture.text?.length<40)throw new Error('Review the captured title, company and job text first.');
  const response=await fetch(API+'/rest/v1/rpc/capture_job_for_shadow',{method:'POST',headers:{apikey:key,Authorization:'Bearer '+pair.accessToken,'Content-Type':'application/json'},body:JSON.stringify({p_capture:{url:capture.url.slice(0,2000),title:capture.title.slice(0,500),company:capture.company.slice(0,300),text:capture.text.slice(0,50000),ats:capture.ats}})});
  const result=await response.json();if(!response.ok)throw new Error(result.message||'Capture failed. Try again.');return {ok:true,...result};
 })().then(respond).catch(e=>respond({ok:false,error:e.message}));return true;
});
