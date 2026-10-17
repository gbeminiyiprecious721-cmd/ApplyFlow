/* Provider availability is checked on the server for the current signed-in user. */
(()=>{'use strict';
 const providers=['adzuna','greenhouse','lever'];
 let version=0,available={};
 function paint(){
  const select=uiElement('provider');if(!select)return;
  for(const option of select.options||[]){if(!providers.includes(option.value))continue;const ready=available[option.value]===true;option.disabled=!ready;option.textContent=option.textContent.replace(/ \(not connected\)$/,'')+(ready?'':' (not connected)');}
  if(providers.includes(select.value)&&!available[select.value])select.value='jobicy';
  const hint=uiElement('adzunaHint');if(hint)hint.textContent=available.adzuna?'Adzuna search is configured on the server.':'Adzuna search needs its server connection configured.';
 }
 async function refresh(){
  const request=++version;available={};paint();
  try{
   const {data:sessionData}=await supabaseClient.auth.getSession();
   if(request!==version||!sessionData?.session)return;
   const {data,error}=await supabaseClient.functions.invoke('applyflow-capability-gateway',{body:{provider:'status'}});
   if(request!==version)return;
   if(error||!data?.sources)throw Error('Connection status unavailable');
   for(const provider of providers)available[provider]=data.sources[provider]===true;
  }catch{if(request!==version)return;available={};}
  if(request===version)paint();
 }
 window.applyflowJobConnections={isReady:provider=>available[provider]===true,refresh};
 supabaseClient.auth.onAuthStateChange(()=>{++version;available={};paint();setTimeout(refresh,0);});
 refresh();
})();
