const $=s=>document.querySelector(s);
const api=async(url,opt={})=>{let r=await fetch(url,opt);let j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.detail||'Request failed');return j};
let me=null, view='dashboard';

// ---------- role-based navigation (exactly the menu structure required) ----------
const NAV={
  citizen:[['dashboard','Dashboard'],['mycases','My Cases'],['filecomplaint','File Complaint'],['mydocuments','My Documents'],['trackcase','Track Case']],
  police:[['dashboard','Dashboard'],['casemanagement','Case Management'],['evidence','Evidence & Documents'],['stageupdate','Case Stage Update'],['authrequests','Authorization Requests'],['ledger','Blockchain Ledger'],['audit','Audit Trail'],['security','Security Monitor']],
  lawyer:[['dashboard','Dashboard'],['assignedcases','My Assigned Cases'],['casedocuments','Case Documents'],['requestauth','Request Authorization'],['approvalstatus','Approval Status'],['casesearch','Case Search']],
  judge:[['dashboard','Dashboard'],['assignedcases','Assigned Cases'],['evidencereview','Evidence Review'],['approvalrequests','Approval Requests'],['decisions','Case Decisions'],['ledger','Blockchain Ledger'],['audit','Audit Trail']],
  admin:[['admindashboard','Admin Dashboard'],['usermanagement','User Management'],['allcases','All Cases'],['alldocuments','All Documents'],['allapprovals','All Approvals'],['ledger','Blockchain Ledger'],['audit','Audit Trail'],['security','Security Monitor']]
};
const ICONS={dashboard:'🏠',admindashboard:'🏛️',mycases:'📁',filecomplaint:'📝',mydocuments:'📄',trackcase:'🔎',
  casemanagement:'🗂️',evidence:'🧾',stageupdate:'🔁',authrequests:'🔐',ledger:'⛓️',audit:'🕵️',security:'🛡️',
  assignedcases:'📁',casedocuments:'📄',requestauth:'🔐',approvalstatus:'✅',casesearch:'🔍',
  evidencereview:'🧾',approvalrequests:'📥',decisions:'⚖️',usermanagement:'👥',allcases:'🗂️',alldocuments:'📄',allapprovals:'✅'};
const ROLE_LABEL={citizen:'Citizen',police:'Police Officer',lawyer:'Lawyer / Advocate',judge:'Judge',admin:'System Administrator'};
const LOGO=`<svg viewBox="0 0 64 64" width="1em" height="1em" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f3d78a"/><stop offset="1" stop-color="#c99a2e"/></linearGradient></defs><rect x="30.5" y="14" width="3" height="27" rx="1.5" fill="url(#g1)"/><rect x="14" y="18" width="36" height="2.6" rx="1.3" fill="url(#g1)"/><path d="M16 19 L12 30" stroke="url(#g1)" stroke-width="1.6" fill="none"/><path d="M16 19 L20 30" stroke="url(#g1)" stroke-width="1.6" fill="none"/><path d="M9.5 30 a6.5 6.5 0 0 0 13 0 Z" fill="none" stroke="url(#g1)" stroke-width="1.8"/><path d="M48 19 L44 30" stroke="url(#g1)" stroke-width="1.6" fill="none"/><path d="M48 19 L52 30" stroke="url(#g1)" stroke-width="1.6" fill="none"/><path d="M41.5 30 a6.5 6.5 0 0 0 13 0 Z" fill="none" stroke="url(#g1)" stroke-width="1.8"/><path d="M23 45 L41 45 L38 41 L26 41 Z" fill="url(#g1)"/><rect x="20" y="45" width="24" height="3" rx="1.5" fill="url(#g1)"/></svg>`;

function esc(s){return String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
const STAGES=['FIR Registered','Investigation','Evidence Collection','Charge Sheet','Pre-Trial','Trial','Judgment','Closed'];

function shell(){
  const nav=NAV[me.role]||NAV.citizen;
  document.body.innerHTML=`<div class="shell">
    <aside class="side">
      <div class="brand">${LOGO}<span>NYAYCHAIN</span></div>
      <div class="role-pill">${esc(ROLE_LABEL[me.role]||me.role)}</div>
      <div class="nav">${nav.map(x=>`<button class="${view==x[0]?'active':''}" data-view="${x[0]}" onclick="go('${x[0]}')"><span class="ic">${ICONS[x[0]]||'•'}</span><span class="lbl">${x[1]}</span></button>`).join('')}</div>
      <div class="footer-note">NyayChain • SIH 2026<br>PS #26190 — Blockchain &amp; Cybersecurity<br>Prototype • Mock govt. integrations</div>
    </aside>
    <main class="main">
      <div class="top">
        <div><div class="muted">Secure Digital Legal &amp; Investigation Document Management</div><h1 id="title" style="margin:4px 0 0;font-size:26px">Dashboard</h1></div>
        <div class="user"><div class="avatar">${esc((me.name||'?')[0])}</div><div><b>${esc(me.name)}</b><div class="muted" style="font-size:12px">${esc(ROLE_LABEL[me.role]||me.role)}</div></div><button class="secondary" onclick="logout()">Logout</button></div>
      </div>
      <div id="content"></div>
    </main>
  </div>`;
}

async function start(){
  try{ me=(await api('/api/me')).user; }catch(e){ me=null; }
  if(!me){ login(); return; }
  view=(NAV[me.role]||NAV.citizen)[0][0];
  shell(); render();
}

function login(){
  document.body.innerHTML=`<div class="login"><div class="login-card">
    <div class="logo">${LOGO}</div>
    <div class="login-title">NyayChain</div>
    <div class="muted">Secure. Transparent. Tamper-Evident.</div>
    <form onsubmit="doLogin(event)">
      <div class="field"><label>EMAIL / USER ID</label><input id="email" value="police@demo.com" autocomplete="username"></div>
      <div class="field"><label>PASSWORD</label><input id="pass" type="password" value="Police123" autocomplete="current-password"></div>
      <button class="primary" style="width:100%">Sign in to SIH Demo</button>
    </form>
    <div class="demo">
      <b>Demo accounts</b> <span class="muted">(click to autofill)</span>
      <div class="demo-grid">
        <button type="button" class="chip" onclick="fillDemo('citizen@demo.com','Citizen')">👤 Citizen</button>
        <button type="button" class="chip" onclick="fillDemo('police@demo.com','Police123')">👮 Police</button>
        <button type="button" class="chip" onclick="fillDemo('lawyer@demo.com','Lawyer123')">⚖️ Lawyer</button>
        <button type="button" class="chip" onclick="fillDemo('judge@demo.com','Judge123')">👨‍⚖️ Judge</button>
        <button type="button" class="chip" onclick="fillDemo('admin@demo.com','Admin123')">🔐 Admin</button>
      </div>
    </div>
    <div class="footer-note">Prototype only. Government systems and real case data are not connected.</div>
  </div></div>`;
}
function fillDemo(email,pass){$('#email').value=email;$('#pass').value=pass}
async function doLogin(e){
  e.preventDefault();
  try{ let j=await api('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:$('#email').value,password:$('#pass').value})});
    me=j.user; view=(NAV[me.role]||NAV.citizen)[0][0]; shell(); render();
  }catch(x){ alert(x.message) }
}
async function logout(){ await api('/api/logout',{method:'POST'}); me=null; login(); }
function go(v){ view=v; render(); }

async function render(){
  const nav=NAV[me.role]||NAV.citizen;
  document.querySelectorAll('.nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
  const t=nav.find(x=>x[0]===view);
  $('#title').textContent=t?t[1]:view;
  $('#content').innerHTML='<div class="empty">Loading…</div>';
  try{
    switch(view){
      case 'dashboard': case 'admindashboard': await dashboard(); break;
      case 'mycases': await caseListPage('mine',{allowCreate:false}); break;
      case 'casemanagement': await caseListPage('all',{allowCreate:true}); break;
      case 'assignedcases': await caseListPage(me.role==='lawyer'?'mine':'all',{allowCreate:false}); break;
      case 'allcases': await caseListPage('all',{allowCreate:true}); break;
      case 'filecomplaint': fileComplaintPage(); break;
      case 'mydocuments': await documentsPage('mine'); break;
      case 'casedocuments': await documentsPage('mine'); break;
      case 'evidence': await documentsPage('all'); break;
      case 'evidencereview': await documentsPage('all'); break;
      case 'alldocuments': await documentsPage('all'); break;
      case 'trackcase': trackCasePage(); break;
      case 'stageupdate': await stageUpdatePage(); break;
      case 'decisions': await decisionsPage(); break;
      case 'authrequests': await approvalsPage('all'); break;
      case 'requestauth': await approvalsPage('mine'); break;
      case 'approvalstatus': await approvalsPage('mine'); break;
      case 'approvalrequests': await approvalsPage('pending'); break;
      case 'allapprovals': await approvalsPage('all'); break;
      case 'casesearch': caseSearchPage(); break;
      case 'usermanagement': await userManagementPage(); break;
      case 'ledger': await ledgerPage(); break;
      case 'audit': await auditPage(); break;
      case 'security': await securityPage(); break;
      default: $('#content').innerHTML='<div class="empty">Not found.</div>';
    }
  }catch(e){ $('#content').innerHTML=`<div class="card danger">${esc(e.message)}</div>` }
}

// ---------- dashboard ----------
async function dashboard(){
  let j=await api('/api/dashboard'); let c=j.counts;
  let cards=[['Total Cases',c.Total],['My / Linked Cases',c.Mine],['Documents',c.Documents],['Pending Approvals',c['Pending Approvals']],['Blockchain Blocks',c.Blocks],['Audit Events',c['Audit Events']]];
  if(me.role==='admin') cards.splice(2,0,['Users',c.Users]);
  $('#content').innerHTML=`
    <div class="grid">${cards.map(x=>`<div class="card stat"><span>${x[0]}</span><b>${x[1]}</b></div>`).join('')}</div>
    <div class="section card"><h2>Case Lifecycle</h2><div class="timeline">${STAGES.map((x,i)=>`<div class="stage ${c[x]?'done':''}"><b>${i+1}. ${x}</b><small>${c[x]||0} case(s)</small></div>`).join('')}</div></div>
    <div class="section card"><h2>Recent Immutable Activity</h2>${j.recent.length?`<table class="table"><tr><th>Time</th><th>User</th><th>Action</th><th>Case</th><th>Status</th></tr>${j.recent.map(a=>`<tr><td>${esc(a.ts)}</td><td>${esc(a.user_email)}</td><td>${esc(a.action)}</td><td>${esc(a.case_id)}</td><td><span class="badge ${a.result==='SUCCESS'?'secure':'danger'}">${esc(a.result)}</span></td></tr>`).join('')}</table>`:'<div class="empty">No activity yet.</div>'}</div>`;
}

// ---------- cases ----------
async function caseListPage(scope,opts={}){
  let rows=await api('/api/cases?scope='+scope);
  $('#content').innerHTML=`<div class="card">
    <div class="actions" style="justify-content:space-between">
      <input class="search" placeholder="Search case ID, FIR, title..." oninput="filterRows(this.value)">
      ${opts.allowCreate?'<button class="primary" onclick="newCase()">+ File New FIR</button>':''}
    </div>
    <table class="table" id="caseTable"><tr><th>Case</th><th>FIR</th><th>Title</th><th>Type</th><th>Status</th><th>Action</th></tr>
    ${rows.map(x=>`<tr><td>${esc(x.case_id)}</td><td>${esc(x.fir_no)}</td><td>${esc(x.title)}</td><td>${esc(x.case_type)}</td><td><span class="badge">${esc(x.status)}</span></td><td><button class="secondary" onclick="caseDetail('${x.case_id}')">Open</button></td></tr>`).join('')}
    </table>${!rows.length?'<div class="empty">No cases found.</div>':''}
  </div>`;
}
function filterRows(q){ q=q.toLowerCase(); document.querySelectorAll('#caseTable tr').forEach((r,i)=>{ if(i) r.style.display=r.textContent.toLowerCase().includes(q)?'':'none' }) }

function newCase(){ modal(`<h2>File Online FIR</h2><form onsubmit="createCase(event)">
  <div class="field"><label>INCIDENT TITLE</label><input id="ct" required value="Online Financial Fraud Complaint"></div>
  <div class="field"><label>CASE TYPE</label><select id="ctype"><option>Criminal</option><option>Civil</option></select></div>
  <div class="field"><label>COMPLAINANT</label><input id="cc" value="${esc(me.name)}"></div>
  <button class="primary">Submit FIR</button></form>`); }
async function createCase(e){
  e.preventDefault();
  let j=await api('/api/cases',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:$('#ct').value,case_type:$('#ctype').value,complainant:$('#cc').value})});
  closeModal(); toast(`FIR registered — ${j.fir_no} (Case ${j.case_id})`); render();
}

function fileComplaintPage(){
  $('#content').innerHTML=`<div class="card" style="max-width:560px">
    <h2 style="margin-top:0">File a New Complaint / FIR</h2>
    <p class="muted">Submit your complaint online. It will be registered, hashed, and recorded on the blockchain audit ledger.</p>
    <form onsubmit="submitComplaint(event)">
      <div class="field"><label>INCIDENT TITLE</label><input id="fc_title" required placeholder="e.g. Online Financial Fraud Complaint"></div>
      <div class="field"><label>CASE TYPE</label><select id="fc_type"><option>Criminal</option><option>Civil</option></select></div>
      <div class="field"><label>COMPLAINANT NAME</label><input id="fc_name" value="${esc(me.name)}"></div>
      <div class="field"><label>DESCRIPTION (optional, for your records)</label><textarea id="fc_desc" rows="4" placeholder="Describe what happened..."></textarea></div>
      <button class="primary" style="width:100%">Submit Complaint</button>
    </form>
  </div>`;
}
async function submitComplaint(e){
  e.preventDefault();
  let j=await api('/api/cases',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:$('#fc_title').value,case_type:$('#fc_type').value,complainant:$('#fc_name').value})});
  toast(`Complaint registered as FIR ${j.fir_no} — Case ID ${j.case_id}`);
  go('mycases');
}

function timelineHtml(status){
  let idx=STAGES.indexOf(status);
  return `<div class="timeline">${STAGES.map((s,i)=>`<div class="stage ${s===status?'done current':(i<idx?'done':'')}"><b>${s}</b><small>${s===status?'● Current stage':(i<idx?'✓ Completed':'○ Pending')}</small></div>`).join('')}</div>`;
}

async function caseDetail(id){
  let j=await api('/api/cases/'+id); let x=j.case;
  modal(`<h2>${esc(x.case_id)}</h2><p class="muted">${esc(x.title)} • ${esc(x.fir_no)} • ${esc(x.court)}</p>
  <div class="grid" style="grid-template-columns:repeat(3,1fr)">
    <div class="card"><b>Status</b><br><span class="badge">${esc(x.status)}</span></div>
    <div class="card"><b>Blockchain</b><br><span class="badge secure">✓ Verified</span></div>
    <div class="card"><b>Documents</b><br><b>${j.documents.length}</b></div>
  </div>
  <div class="section"><h3>Case Timeline</h3>${timelineHtml(x.status)}</div>
  ${x.remarks?`<div class="section"><h3>Judicial Remarks</h3><div class="card">${esc(x.remarks)}</div></div>`:''}
  <div class="section"><h3>People</h3><div class="grid" style="grid-template-columns:repeat(3,1fr)">
    <div class="card"><b>Complainant</b><br>${esc(x.complainant)}</div>
    <div class="card"><b>Investigating Officer</b><br>${esc(x.officer)}</div>
    <div class="card"><b>Lawyer</b><br>${esc(x.lawyer)}</div>
  </div></div>
  <div class="section"><h3>Documents</h3>${j.documents.length?j.documents.map(d=>`<div class="card" style="margin:8px 0"><b>${esc(d.name)}</b> <span class="badge">${esc(d.doc_type)}</span><div class="hash">SHA-256: ${esc(d.sha256)}</div><button class="secondary" onclick="viewDoc('${d.doc_id}')">View + Watermark</button> <a class="secondary" href="/api/documents/${d.doc_id}/download">Download</a></div>`).join(''):'<div class="empty">No documents uploaded.</div>'}</div>
  <div class="actions">
    <button class="primary" onclick="uploadDoc('${x.case_id}')">+ Upload Document</button>
    ${['police','admin'].includes(me.role)?`<button class="secondary" onclick="advance('${x.case_id}')">Update Stage</button>`:''}
    ${['judge','admin'].includes(me.role)?`<button class="secondary" onclick="decisionModal('${x.case_id}')">⚖️ Record Decision</button>`:''}
  </div>`);
}

function advance(id){ modal(`<h2>Update Case Stage</h2><div class="field"><select id="st">${STAGES.map(s=>`<option>${s}</option>`).join('')}</select></div><button class="primary" onclick="setStage('${id}')">Save Stage</button>`); }
async function setStage(id){ await api('/api/cases/'+id+'/status',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:$('#st').value})}); closeModal(); caseDetail(id); }

function decisionModal(id){ modal(`<h2>Record Case Decision</h2><div class="field"><label>DECISION</label><select id="dec_status"><option value="Judgment">Judgment delivered</option><option value="Closed">Case closed</option></select></div><div class="field"><label>REMARKS</label><textarea id="dec_remarks" rows="4" placeholder="Judicial remarks / order summary"></textarea></div><button class="primary" onclick="submitDecision('${id}')">Record Decision</button>`); }
async function submitDecision(id){ await api('/api/cases/'+id+'/decision',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:$('#dec_status').value,remarks:$('#dec_remarks').value})}); closeModal(); toast('Decision recorded on the blockchain ledger.'); caseDetail(id); }

// ---------- police: stage update page ----------
async function stageUpdatePage(){
  let rows=await api('/api/cases?scope=all');
  $('#content').innerHTML=`<div class="card"><p class="muted">Update the lifecycle stage for any case. Every change is hashed and recorded on the blockchain ledger.</p>
  <table class="table"><tr><th>Case</th><th>Title</th><th>Current Stage</th><th>New Stage</th><th></th></tr>
  ${rows.map(x=>`<tr><td>${esc(x.case_id)}</td><td>${esc(x.title)}</td><td><span class="badge">${esc(x.status)}</span></td>
    <td><select id="sel_${x.case_id}">${STAGES.map(s=>`<option ${s===x.status?'selected':''}>${s}</option>`).join('')}</select></td>
    <td><button class="secondary" onclick="quickStage('${x.case_id}')">Save</button></td></tr>`).join('')}
  </table></div>`;
}
async function quickStage(id){ let v=document.getElementById('sel_'+id).value; await api('/api/cases/'+id+'/status',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:v})}); toast('Stage updated for '+id); stageUpdatePage(); }

// ---------- judge: decisions page ----------
async function decisionsPage(){
  let rows=await api('/api/cases?scope=all');
  let pending=rows.filter(x=>!['Judgment','Closed'].includes(x.status));
  let decided=rows.filter(x=>['Judgment','Closed'].includes(x.status));
  $('#content').innerHTML=`<div class="card"><h2 style="margin-top:0">Cases Awaiting Decision</h2>
  ${pending.length?`<table class="table"><tr><th>Case</th><th>Title</th><th>Stage</th><th></th></tr>${pending.map(x=>`<tr><td>${esc(x.case_id)}</td><td>${esc(x.title)}</td><td><span class="badge">${esc(x.status)}</span></td><td><button class="primary" onclick="decisionModal('${x.case_id}')">Record Decision</button> <button class="secondary" onclick="caseDetail('${x.case_id}')">Open</button></td></tr>`).join('')}</table>`:'<div class="empty">No pending cases.</div>'}</div>
  <div class="section card"><h2>Decided Cases</h2>${decided.length?`<table class="table"><tr><th>Case</th><th>Title</th><th>Decision</th><th>Remarks</th><th></th></tr>${decided.map(x=>`<tr><td>${esc(x.case_id)}</td><td>${esc(x.title)}</td><td><span class="badge secure">${esc(x.status)}</span></td><td>${esc((x.remarks||'').slice(0,60))}</td><td><button class="secondary" onclick="caseDetail('${x.case_id}')">Open</button></td></tr>`).join('')}</table>`:'<div class="empty">No decided cases yet.</div>'}</div>`;
}

// ---------- documents ----------
function uploadDoc(id){ modal(`<h2>Secure Document Upload</h2><form onsubmit="sendDoc(event,'${id}')">
  <div class="field"><label>DOCUMENT TYPE</label><select id="dt"><option>Evidence</option><option>FIR</option><option>Case Diary</option><option>Witness Statement</option><option>Investigation Report</option><option>Charge Sheet</option><option>Court Document</option><option>Judgment</option></select></div>
  <div class="field"><label>ACCESS LEVEL</label><select id="al"><option>Restricted</option><option>Case Team</option><option>Judiciary</option><option>Public</option></select></div>
  <div class="field"><label>FILE</label><input id="df" type="file" required></div>
  <button class="primary">Encrypt + Hash + Register</button></form>`); }
async function sendDoc(e,id){
  e.preventDefault(); let f=new FormData(); f.append('case_id',id); f.append('doc_type',$('#dt').value); f.append('access_level',$('#al').value); f.append('file',$('#df').files[0]);
  let j=await api('/api/documents',{method:'POST',body:f}); closeModal(); toast(`Document secured — SHA-256 ${j.sha256.slice(0,16)}…`); caseDetail(id);
}
async function documentsPage(scope){
  let rows=await api('/api/documents?scope='+scope);
  $('#content').innerHTML=`<div class="card">${rows.length?`<table class="table"><tr><th>Document</th><th>Case</th><th>Type</th><th>Uploader</th><th>Hash</th><th>Action</th></tr>${rows.map(d=>`<tr><td>${esc(d.name)}</td><td>${esc(d.case_id)}</td><td>${esc(d.doc_type)}</td><td>${esc(d.uploaded_by)}</td><td class="hash">${esc((d.sha256||'').slice(0,18))}…</td><td><button class="secondary" onclick="viewDoc('${d.doc_id}')">View</button> <a class="secondary" href="/api/documents/${d.doc_id}/download">Download</a></td></tr>`).join('')}</table>`:'<div class="empty">No documents found. Upload one from a case.</div>'}</div>`;
}
async function viewDoc(id){
  let j=await api('/api/documents/'+id); let d=j.document;
  modal(`<h2>Protected Document Preview</h2><div class="watermark" data-wm="${esc(d.watermark)}"><h3>${esc(d.name)}</h3><p>Document type: ${esc(d.doc_type)}</p><p>Case: ${esc(d.case_id)}</p><hr><p class="muted">Prototype preview. Actual file remains protected in storage.</p><p class="hash">SHA-256<br>${esc(d.sha256)}</p><span class="badge secure">✓ HASH VERIFIED AT UPLOAD</span></div>`);
}

// ---------- track case (citizen) ----------
function trackCasePage(){
  $('#content').innerHTML=`<div class="card" style="max-width:560px">
    <h2 style="margin-top:0">Track Your Case</h2>
    <p class="muted">Enter your Case ID (e.g. NYC-2026-0001) or FIR number to see the live status.</p>
    <div class="field"><input id="tk_q" placeholder="Case ID or FIR number"></div>
    <button class="primary" onclick="trackCase()">Track</button>
    <div id="tk_result" style="margin-top:18px"></div>
  </div>`;
}
async function trackCase(){
  let q=$('#tk_q').value.trim(); let out=$('#tk_result'); out.innerHTML='<div class="empty">Searching…</div>';
  if(!q){ out.innerHTML='<div class="card danger">Enter a case ID or FIR number.</div>'; return; }
  try{
    let x; try{ x=(await api('/api/cases/'+encodeURIComponent(q))).case; }
    catch(e){ let s=await api('/api/search?q='+encodeURIComponent(q)); if(s.cases.length) x=s.cases[0]; }
    if(!x){ out.innerHTML='<div class="card danger">No matching case found.</div>'; return; }
    out.innerHTML=`<div class="card"><b>${esc(x.case_id)}</b> — ${esc(x.title)}<br><span class="muted">${esc(x.fir_no)} • ${esc(x.court)}</span><div style="margin-top:10px"><span class="badge">${esc(x.status)}</span></div></div><div class="section">${timelineHtml(x.status)}</div>`;
  }catch(e){ out.innerHTML=`<div class="card danger">${esc(e.message)}</div>`; }
}

// ---------- case search (lawyer) ----------
function caseSearchPage(){
  $('#content').innerHTML=`<div class="card"><div class="field"><input id="cs_q" class="search" placeholder="Search by case ID, FIR number, title, or complainant..." onkeydown="if(event.key==='Enter')caseSearch()"></div><button class="primary" onclick="caseSearch()">Search</button><div id="cs_result" style="margin-top:16px"></div></div>`;
}
async function caseSearch(){
  let q=$('#cs_q').value.trim(); let out=$('#cs_result');
  if(!q){ out.innerHTML=''; return; }
  let j=await api('/api/search?q='+encodeURIComponent(q));
  out.innerHTML=`<h3>Cases (${j.cases.length})</h3>${j.cases.length?`<table class="table"><tr><th>Case</th><th>FIR</th><th>Title</th><th>Status</th><th></th></tr>${j.cases.map(x=>`<tr><td>${esc(x.case_id)}</td><td>${esc(x.fir_no)}</td><td>${esc(x.title)}</td><td><span class="badge">${esc(x.status)}</span></td><td><button class="secondary" onclick="caseDetail('${x.case_id}')">Open</button></td></tr>`).join('')}</table>`:'<div class="empty">No cases matched.</div>'}
  <h3 style="margin-top:18px">Documents (${j.documents.length})</h3>${j.documents.length?`<table class="table"><tr><th>Document</th><th>Case</th><th>Type</th><th></th></tr>${j.documents.map(d=>`<tr><td>${esc(d.name)}</td><td>${esc(d.case_id)}</td><td>${esc(d.doc_type)}</td><td><button class="secondary" onclick="viewDoc('${d.doc_id}')">View</button></td></tr>`).join('')}</table>`:'<div class="empty">No documents matched.</div>'}`;
}

// ---------- blockchain / audit / security ----------
async function ledgerPage(){
  let j=await api('/api/ledger');
  let f=await api('/api/fabric/status');
  const fabricBadge=f.connected?'✓ HYPERLEDGER FABRIC CONNECTED':(f.enabled?'⚠ FABRIC OFFLINE':'LOCAL HASH CHAIN MODE');
  $('#content').innerHTML=`<div class="card"><div class="actions" style="justify-content:space-between"><div><h2 style="margin:0">Permissioned Blockchain Audit Ledger</h2><div class="muted">Local SHA-256 ledger + optional Hyperledger Fabric integration</div></div><div><span class="badge ${f.connected?'secure':(f.enabled?'danger':'')}">${fabricBadge}</span> <span class="badge ${j.valid?'secure':'danger'}">${j.valid?'✓ LOCAL CHAIN VALID':'⚠ LOCAL INTEGRITY VIOLATION'}</span> <button class="secondary" onclick="verifyLedger()">Verify Blockchain</button></div></div>
  <div class="ledger" style="margin-top:18px">${j.blocks.length?j.blocks.map(b=>`<div class="block"><b>BLOCK #${b.block_index}</b> <span class="badge">${esc(b.event)}</span><div class="muted">${esc(b.ts)} • ${esc(b.user_email)} • ${esc(b.case_id)}</div><div class="hash">Previous: ${esc(b.previous_hash)}<br>Current: ${esc(b.current_hash)}</div></div>`).join(''):'<div class="empty">No blocks yet. File an FIR or upload a document.</div>'}</div></div>`;
}
async function verifyLedger(){ let j=await api('/api/ledger/verify',{method:'POST'}); toast(j.valid?'✓ Blockchain integrity verified.':'⚠ Integrity violation detected.'); ledgerPage(); }
async function auditPage(){
  let rows=await api('/api/audit');
  $('#content').innerHTML=`<div class="card"><table class="table"><tr><th>Time</th><th>User</th><th>Role</th><th>Action</th><th>Case</th><th>IP</th><th>Result</th></tr>${rows.map(a=>`<tr><td>${esc(a.ts)}</td><td>${esc(a.user_email)}</td><td>${esc(a.role)}</td><td>${esc(a.action)}</td><td>${esc(a.case_id)}</td><td>${esc(a.ip)}</td><td><span class="badge ${a.result==='SUCCESS'?'secure':'danger'}">${esc(a.result)}</span></td></tr>`).join('')}</table></div>`;
}
async function securityPage(){
  let j=await api('/api/security');
  $('#content').innerHTML=`<div class="grid">${[['System',j.status],['Encryption',j.encryption],['Blockchain',j.blockchain],['Audit Logging',j.audit],['Access Control',j.access_control]].map(x=>`<div class="card stat"><span>${x[0]}</span><b style="font-size:18px;color:#0d7a47">✓ ${x[1]}</b></div>`).join('')}</div>
  <div class="section card"><h2>Security Events</h2>${j.events.length?`<table class="table"><tr><th>Time</th><th>Event</th><th>Severity</th><th>Details</th></tr>${j.events.map(e=>`<tr><td>${esc(e.ts)}</td><td>${esc(e.event)}</td><td><span class="badge ${e.severity==='CRITICAL'?'danger':''}">${esc(e.severity)}</span></td><td>${esc(e.details)}</td></tr>`).join('')}</table>`:'<div class="empty">No security events.</div>'}</div>
  <div class="section card"><h2>Tamper Detection Demo</h2><p class="muted">Open a case, choose a document from the case detail view, then simulate tampering with the API to demonstrate hash mismatch and security logging.</p></div>`;
}

// ---------- approvals ----------
async function approvalsPage(scope){
  let rows=await api('/api/approvals?scope='+scope);
  let canCreate=['police','lawyer','judge','admin'].includes(me.role);
  let canDecide=['judge','admin'].includes(me.role);
  $('#content').innerHTML=`<div class="card"><div class="actions" style="justify-content:space-between"><div><h2 style="margin:0">Multi-Party / Quorum Authorization</h2><div class="muted">Sensitive actions require controlled approval.</div></div>${canCreate?'<button class="primary" onclick="newApproval()">+ Request Approval</button>':''}</div>
  ${rows.length?`<table class="table" style="margin-top:15px"><tr><th>Request</th><th>Case</th><th>Action</th><th>Requested By</th><th>Approver</th><th>Status</th><th></th></tr>${rows.map(a=>`<tr><td>${esc(a.request_id)}</td><td>${esc(a.case_id)}</td><td>${esc(a.action)}</td><td>${esc(a.requested_by)}</td><td>${esc(a.approver)}</td><td><span class="badge ${a.status==='APPROVED'?'secure':(a.status==='REJECTED'?'danger':'')}">${esc(a.status)}</span></td><td>${canDecide&&a.status==='PENDING'?`<button class="secondary" onclick="decideApproval('${a.request_id}','approve')">Approve</button> <button class="secondary" onclick="decideApproval('${a.request_id}','reject')">Reject</button>`:''}</td></tr>`).join('')}</table>`:'<div class="empty">No approval requests.</div>'}</div>`;
}
function newApproval(){ modal(`<h2>Request Sensitive Action</h2><div class="field"><label>CASE ID</label><input id="rqcase" placeholder="e.g. NYC-2026-0001"></div><div class="field"><label>ACTION</label><select id="rqa"><option>Release restricted evidence</option><option>Change document permissions</option><option>Export sensitive case data</option></select></div><button class="primary" onclick="requestApproval()">Submit for Quorum</button>`); }
async function requestApproval(){ let j=await api('/api/approvals',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({case_id:$('#rqcase').value,action:$('#rqa').value})}); closeModal(); toast('Approval request created: '+j.request_id); render(); }
async function decideApproval(id,action){ await api(`/api/approvals/${id}/${action}`,{method:'POST'}); render(); }

// ---------- admin: user management ----------
async function userManagementPage(){
  let rows=await api('/api/users');
  $('#content').innerHTML=`<div class="card"><div class="actions" style="justify-content:space-between"><h2 style="margin:0">User Management</h2><button class="primary" onclick="newUser()">+ Add User</button></div>
  <table class="table" style="margin-top:12px"><tr><th>Name</th><th>Email</th><th>Role</th><th></th></tr>
  ${rows.map(u=>`<tr><td>${esc(u.name)}</td><td>${esc(u.email)}</td><td><span class="badge">${esc(u.role)}</span></td><td>${u.email!==me.email?`<button class="secondary" onclick="removeUser(${u.id})">Remove</button>`:'<span class="muted">You</span>'}</td></tr>`).join('')}
  </table></div>`;
}
function newUser(){ modal(`<h2>Add New User</h2><form onsubmit="createUser(event)">
  <div class="field"><label>FULL NAME</label><input id="nu_name" required></div>
  <div class="field"><label>EMAIL</label><input id="nu_email" type="email" required></div>
  <div class="field"><label>ROLE</label><select id="nu_role"><option value="citizen">Citizen</option><option value="police">Police</option><option value="lawyer">Lawyer</option><option value="judge">Judge</option><option value="admin">Admin</option></select></div>
  <div class="field"><label>TEMPORARY PASSWORD</label><input id="nu_pass" type="password" required minlength="4"></div>
  <button class="primary" style="width:100%">Create User</button></form>`); }
async function createUser(e){
  e.preventDefault();
  try{ await api('/api/users',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:$('#nu_name').value,email:$('#nu_email').value,role:$('#nu_role').value,password:$('#nu_pass').value})});
    closeModal(); toast('User created.'); userManagementPage();
  }catch(x){ alert(x.message) }
}
async function removeUser(id){ if(!confirm('Remove this user?'))return; await api('/api/users/'+id,{method:'DELETE'}); userManagementPage(); }

// ---------- ui helpers ----------
function modal(html){ let x=document.createElement('div'); x.className='modal show'; x.id='modal'; x.innerHTML=`<div class="modal-card"><div style="text-align:right"><button class="secondary" onclick="closeModal()">Close</button></div>${html}</div>`; document.body.appendChild(x); }
function closeModal(){ let x=$('#modal'); if(x) x.remove(); }
function toast(msg){
  let t=document.createElement('div'); t.className='toast'; t.textContent=msg; document.body.appendChild(t);
  requestAnimationFrame(()=>t.classList.add('show'));
  setTimeout(()=>{ t.classList.remove('show'); setTimeout(()=>t.remove(),300); },3200);
}

start();
