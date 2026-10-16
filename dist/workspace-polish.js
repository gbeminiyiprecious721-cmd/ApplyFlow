/* Focused workspace layout and connection visibility; existing record IDs are retained. */
(()=>{'use strict';
 const $=id=>uiElement(id);
 const status=document.createElement('div');status.id='workspaceSync';status.className='workspace-sync';status.innerHTML='<span id="workspaceSyncText" role="status" aria-live="polite"></span><button class="btn tertiary" type="button" id="workspaceSyncRetry" hidden>Retry</button>';
 document.querySelector('header.top').after(status);
 function sync(info){if(window.__APPLYFLOW_LOCAL_READ_ONLY__&&['idle','pending','saving','saved'].includes(info.phase))info={phase:'readonly',message:'Read-only preview. Changes are not saved to your account.'};status.dataset.phase=info.phase;$('workspaceSyncText').textContent=info.message;$('workspaceSyncRetry').hidden=!['error','restore-error'].includes(info.phase);}
 window.addEventListener('applyflow:sync',e=>sync(e.detail));sync(workspaceSync);
 $('workspaceSyncRetry').onclick=async()=>{const button=$('workspaceSyncRetry');button.disabled=true;try{if(restoredAccountId!==uid())await hydrateFromRemote();else await persistRemote();}catch{}finally{button.disabled=false;}};
 // Candidate editing separates contact facts, career facts and search preferences.
 const candidate=$('profileHeading').closest('article');candidate.querySelector('.profile-illustration')?.remove();
 function group(title,ids,folded=false){const section=document.createElement(folded?'details':'fieldset');section.className=folded?'form-details':'candidate-fieldset';section.innerHTML=folded?'<summary>'+title+'</summary>':'<legend>'+title+'</legend>';const grid=document.createElement('div');grid.className='form-grid';section.append(grid);$('saveProfile').before(section);for(const id of ids){const input=$(id);if(!input)continue;const wrap=document.createElement('div');const label=document.querySelector('label[for="'+id+'"]');if(label)wrap.append(label);wrap.append(input);grid.append(wrap);}return section;}
 group('Contact details',['fullName','candidateEmail','candidatePhone','candidateLocation']);
 group('Career facts',['skillsIn','years']);
 group('Search & work eligibility',['titles','locations','pref','salaryCurrency','minsal','sponsor'],true);
 const upload=group('Resume source',['resume'],true);upload.append($('resumeNote'));upload.open=!state.resumeMeta?.name;
 $('skillChips').classList.add('hidden');
 const privacyNote=candidate.querySelector(':scope>p.meta');if(privacyNote)privacyNote.textContent='Review your information before using it in applications. Your records save privately to your account.';
 // Connection setup is a single destination with a progressive installation guide.
 const clip=$('clipperId')?.closest('article');if(clip){const text=clip.querySelector('p');const setup=document.createElement('details');setup.className='form-details';setup.innerHTML='<summary>Install or update the Chrome / Edge extension</summary><ol><li>Download the ZIP and extract it.</li><li>Open chrome://extensions or edge://extensions. Enable Developer mode and choose Load unpacked.</li><li>Select the extracted folder. Copy its extension ID below.</li><li>Connect your account here, then accept the connection in the extension popup.</li><li>Open an employer form and select Autofill in the popup. Review the filled fields.</li></ol><p class="meta">After updating an existing installation, select Reload on its extension card. Reconnect after a browser restart or expired session.</p><div class="actions"><a class="btn" href="ApplyFlow-Job-Clipper.zip" download>Download extension ZIP</a><a class="btn" href="agent-sandbox.html" target="_blank" rel="noopener">Open test form</a></div>';text.textContent='Use your verified profile to fill employer forms and save job listings.';text.after(setup);clip.querySelectorAll('a[download]').forEach(a=>{if(!setup.contains(a))a.remove();});}
 $('freq').value='Manual';for(const option of $('freq').querySelectorAll('option'))if(option.value==='Daily'||option.textContent==='Daily'){option.disabled=true;option.textContent='Daily discovery (not connected)';}
 // Keep unsupported providers visible as unavailable rather than let searches fail later.
 for(const id of ['provider','apSrc']){const select=$(id);if(!select)continue;for(const option of select.options||select.querySelectorAll('option')){if(['adzuna','greenhouse','lever'].includes(option.value)){option.disabled=true;option.textContent=option.textContent.replace(/ \(not connected\)$/,'')+' (not connected)';}}if(['adzuna','greenhouse','lever'].includes(select.value))select.value='jobicy';}
 $('settings-connections').insertAdjacentHTML('afterbegin','<div class="connection-summary"><h3>Your connected workspace</h3><p>Profile and private records use your signed-in account. Jobicy provides remote listings. Other job sources and mailbox sync need provider setup.</p><button class="btn" type="button" id="connectionAgent">Check application runner</button></div>');
 $('settings-connections').insertAdjacentHTML('beforeend','<article class="card"><h3>AI tailoring</h3><p class="meta">Managed AI access is currently restricted to the pilot account. Other accounts can organise their search and use verified-profile autofill; AI preparation needs account access enabled before use.</p></article>');
 $('connectionAgent').onclick=()=>{showView('agent');document.querySelector('[data-agent-tab="rules"]').click();};
 // Make list view the default: the board remains available for visual tracking.
 document.querySelector('[data-app-tab="list"]')?.click();
 for(const group of document.querySelectorAll('[role=tablist]')){const tabs=[...group.querySelectorAll('[role=tab]')];tabs.forEach(b=>b.tabIndex=b.getAttribute('aria-selected')==='true'?0:-1);group.addEventListener('click',e=>{const selected=e.target.closest('[role=tab]');if(selected)tabs.forEach(b=>b.tabIndex=b===selected?0:-1);});}
 // Close transient surfaces with Escape, including the mobile navigation.
 document.addEventListener('keydown',e=>{if(e.key!=='Escape')return;document.body.classList.remove('sidebar-open');$('userPop').classList.add('hidden');$('notifPanel').classList.add('hidden');$('productJobDetails')?.classList.remove('is-selected');});
 const toggle=$('toggleSidebar');toggle.setAttribute('aria-controls',document.querySelector('nav[aria-label=Primary]').id||'workspaceNavigation');document.querySelector('nav[aria-label=Primary]').id='workspaceNavigation';toggle.addEventListener('click',()=>toggle.setAttribute('aria-expanded',String(document.body.classList.contains('sidebar-open'))));
 // Avoid implying the old preparation modes are the new submission switch.
 const help=$('helpDialog').querySelector('p');if(help)help.textContent='Prepare and review your documents first. In Agent, submission rules control the cloud queue; the browser extension fills forms you open yourself.';
 // Retire the original executor and diagnostics after initialization. These are
 // disconnected render targets, never hidden controls in the user DOM.
 const roots=[$('systemDiagnostics'),$('productAgentModes')?.closest('.product-section'),$('agentPill'),$('pauseAgentNav'),$('productAgentState'),$('startAgent'),$('pauseAgent'),$('stopAutopilot'),$('onboardingModes'),$('obCtrl'),$('autoAcknowledgement')];
 for(const root of roots){if(!root)continue;for(const node of [root,...root.querySelectorAll('[id]')])if(node.id)retiredUi.set(node.id,node);root.remove();}
 document.querySelector('[data-setting="advanced"]')?.remove();$('settings-advanced')?.remove();
 $('autoOn').value='off';$('mode').value='hitl';$('demoMode').checked=false;
 $('runAgent').disabled=true;$('obCtrl').value='hitl';
 $('obCopyNote')?.remove();obCopy[6]=['Ready to start','Find matches and prepare your packet. Enable submission separately in Agent after checking the connection.'];paintOb();
})();
