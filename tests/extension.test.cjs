const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const state={},handlers={},requests=[];
const chrome={runtime:{id:'test-extension',getURL:p=>'chrome-extension://test-extension/'+p,onMessageExternal:{addListener:f=>handlers.external=f},onMessage:{addListener:f=>handlers.internal=f}},storage:{session:{get:async keys=>Object.fromEntries((Array.isArray(keys)?keys:[keys]).map(k=>[k,state[k]])),set:async values=>Object.assign(state,values),remove:async keys=>{for(const k of [].concat(keys))delete state[k];}}}};
const fetch=async(url,options={})=>{requests.push({url,options});return {ok:true,json:async()=>url.includes('/auth/')?{id:'owner-a',email:'alex@example.com'}:url.includes('/profiles?')?[{full_name:'Alex Example',email:'alex@example.com'}]:url.includes('/answer_bank?')?[{normalized_question:'first_name',answer:'Alex',verified:true,sensitive:false}]:{}};};
const context=vm.createContext({chrome,fetch,URL,console});vm.runInContext(fs.readFileSync('dist/clipper/background.js','utf8'),context);
const origin='https://applyflow-review.gbeminiyiprecious721.chatgpt.site/';
const external={url:origin,frameId:0},popup={id:chrome.runtime.id,url:chrome.runtime.getURL('popup.html')};
function send(handler,message,sender){return new Promise(resolve=>{if(handlers[handler](message,sender,resolve)!==true)resolve({ok:false});});}
(async()=>{
 let r=await send('external',{type:'PAIR',accessToken:'mock-token',expiresAt:Date.now()/1000+600},{url:'https://evil.example/',frameId:0});assert.equal(r.ok,false);assert.equal(requests.length,0);
 r=await send('external',{type:'PAIR',accessToken:'mock-token',expiresAt:Date.now()/1000+600},{...external,frameId:1});assert.equal(r.ok,false);
 r=await send('external',{type:'PAIR',accessToken:'mock-token',expiresAt:'not-a-date'},external);assert.equal(r.ok,false);
 r=await send('external',{type:'PAIR',accessToken:'mock-token',expiresAt:Date.now()/1000+600},external);assert.equal(r.pending,true);assert.equal((await send('internal',{type:'STATUS'},popup)).paired,false);
 assert.equal((await send('internal',{type:'ACCEPT_PAIR'},popup)).ok,true);assert.equal((await send('internal',{type:'STATUS'},popup)).paired,true);
 r=await send('internal',{type:'AUTOFILL_PROFILE'},{...popup,url:'https://employer.example/'});assert.equal(r.ok,false);
 r=await send('internal',{type:'AUTOFILL_PROFILE'},popup);assert.equal(r.profile.first_name,'Alex');assert.equal(r.profile.last_name,undefined);assert(requests.at(-1).url.includes('user_id=eq.owner-a'));
 r=await send('internal',{type:'SAVE_NAMES',first_name:'',last_name:'Example'},popup);assert.equal(r.ok,false);
 r=await send('internal',{type:'SAVE_NAMES',first_name:'Alex',last_name:'Example'},popup);assert.equal(r.ok,true);const names=JSON.parse(requests.at(-1).options.body);assert(names.every(x=>x.user_id==='owner-a'&&x.verified&&!x.sensitive));
 state.pair.expiresAt=NaN;assert.equal((await send('internal',{type:'STATUS'},popup)).paired,false);assert.equal((await send('internal',{type:'AUTOFILL_PROFILE'},popup)).ok,false);
 state.pair.expiresAt=Date.now()/1000-1;assert.equal((await send('internal',{type:'CAPTURE',capture:{}},popup)).ok,false);
 assert.equal((await send('internal',{type:'UNPAIR'},popup)).ok,true);assert.equal(state.pair,undefined);
 console.log('Extension: trusted origin, top-frame pairing, popup consent, private profile access, names, invalid/expired sessions and disconnect passed.');
})().catch(e=>{console.error(e);process.exitCode=1;});
