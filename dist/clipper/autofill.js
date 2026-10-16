/* Runs only in the active tab after the candidate clicks Autofill. */
function applyFlowFill(profile, answers = []) {
  const clean = v => String(v || '').replace(/([a-z])([A-Z])/g,'$1 $2').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const fields = {full_name: profile.full_name, first_name: profile.first_name, last_name: profile.last_name, email: profile.email, phone: profile.telephone, linkedin: profile.linkedin_url, github: profile.github_url, portfolio: profile.portfolio_url, location: profile.location};
  const aliases = {full_name:['name','full name','your name','applicant name','fullname'],first_name:['first name','given name','fname','firstname'],last_name:['last name','surname','family name','lname','lastname'],email:['email','email address','e mail','emailaddress'],phone:['phone','phone number','telephone','mobile','mobile number','phonenumber','tel'],linkedin:['linkedin','linkedin url','linkedin profile','linkedinurl'],github:['github','github url','githuburl'],portfolio:['portfolio','portfolio url','website','personal website'],location:['location','current location']};
  const auto = {'given-name':'first_name','family-name':'last_name',name:'full_name',email:'email',tel:'phone'};
  const result = {filled:[],skipped:[],unanswered:[],blocked:false,securityCheck:false,frameCount:0};
  // Embedded CAPTCHA assets must not disable unrelated candidate fields. Never solve them.
  result.securityCheck=!!document.querySelector('iframe[src*="recaptcha"],iframe[src*="hcaptcha"],.cf-turnstile');
  const controls=[],seen=new Set();
  function collect(root){if(seen.has(root))return;seen.add(root);controls.push(...root.querySelectorAll('input,textarea,select'));for(const node of root.querySelectorAll('*'))if(node.shadowRoot)collect(node.shadowRoot);for(const frame of root.querySelectorAll('iframe')){try{if(frame.contentDocument)collect(frame.contentDocument);else result.frameCount++;}catch{result.frameCount++;}}}
  collect(document);
  for(const el of controls) {
    if(el.disabled||el.readOnly||el.getClientRects().length===0||['hidden','password','submit','button','reset'].includes(el.type))continue;
    const labels=[...(el.labels||[])].map(x=>x.textContent);
    const aria=(el.getAttribute('aria-labelledby')||'').split(/\s+/).map(id=>(el.ownerDocument||document).getElementById(id)?.textContent||'').join(' ');
    const names=[...labels,el.getAttribute('aria-label'),aria,el.name,el.id,el.placeholder].map(clean).filter(Boolean);
    const name=names[0]||'Unlabelled field';
    if(el.type==='file'){result.skipped.push(name+' — select your CV manually');continue;}
    if(el.type==='checkbox'||el.type==='radio'){result.skipped.push(name+' — review selection');continue;}
    if(el.value){result.skipped.push(name+' — existing value preserved');continue;}
    const sensitive=/\b(gender|sex|ethnicity|race|disability|veteran|criminal|conviction|consent|declaration|agree|signature|visa|sponsor(?:ship|ed|ing)?|authori[sz](?:ation|ed|e)?|eligib(?:le|ility)|salary|compensation|privacy|terms|legal)\b/;
    if(names.some(n=>sensitive.test(n))){result.unanswered.push(name+' — answer personally');continue;}
    let key=auto[String(el.autocomplete||'').trim().split(/\s+/).at(-1)];
    if(!key)for(const [k,list]of Object.entries(aliases))if(names.some(n=>list.includes(n))){key=k;break;}
    let value=key?fields[key]:undefined;
    if(!value){const exact=answers.find(a=>a.verified===true&&!a.sensitive&&names.includes(clean(a.normalized_question)));value=exact?.answer;}
    if(!value){result.unanswered.push(name);continue;}
    if(el.tagName==='SELECT'){
      const matches=[...el.options].filter(o=>o.value&&(clean(o.textContent)===clean(value)||clean(o.value)===clean(value)));
      if(matches.length!==1){result.unanswered.push(name+' — no exact option');continue;}value=matches[0].value;
    }
    const realm=el.ownerDocument?.defaultView||globalThis;const proto=el.tagName==='SELECT'?realm.HTMLSelectElement.prototype:el.tagName==='TEXTAREA'?realm.HTMLTextAreaElement.prototype:realm.HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto,'value').set.call(el,String(value));
    el.dispatchEvent(new (realm.Event)('input',{bubbles:true}));el.dispatchEvent(new (realm.Event)('change',{bubbles:true}));
    result.filled.push(name);
  }
  return result;
}
