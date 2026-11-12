(function(){
let S=null,baseSha=null;
const app=document.getElementById('app');
let canEdit=false,art=null,pending=null,msg='',resMsg='',copyMsg={};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pid=(y,r,t)=>y+'|'+r+'|'+t;
const own=k=>S.owner[k]||k.split('|')[2];
const paid=(y,t)=>!!(S.dues[y]&&S.dues[y][t]);
const season=y=>`${y-1}–${String(y).slice(2)}`;
const ord=n=>['1st','2nd','3rd'][n-1]||n+'th';
function allPicks(){const a=[];S.years.forEach(y=>S.teams.forEach(t=>{for(let r=1;r<=S.rounds;r++)a.push(pid(y,r,t))}));return a}
function chipFor(k,viewer){const[y,r,t]=k.split('|');const o=own(k);
 if(o===viewer&&t===viewer)return `<span class="pk">R${r}</span>`;
 if(o===viewer)return `<span class="pk got">R${r} · ${esc(t)}</span>`;
 return `<span class="pk gone">R${r} → ${esc(o)}</span>`}
function board(){
 const head=S.years.map(y=>`<th>${y} picks</th>`).join('');
 const rows=S.teams.map(t=>{
  const cells=S.years.map(y=>{
   const mine=[];for(const o of S.teams)for(let r=1;r<=S.rounds;r++){const k=pid(y,r,o);const ow=own(k);if(o===t||ow===t)mine.push([r,o===t?0:1,k])}
   mine.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
   return `<td><div class="picks">${mine.map(m=>chipFor(m[2],t)).join('')}</div><span class="dues ${paid(y,t)?'ok':'no'}">${y} dues ${paid(y,t)?'paid':'not paid'}</span></td>`}).join('');
  const total=S.years.reduce((n,y)=>n+allPicks().filter(k=>k.startsWith(y+'|')&&own(k)===t).length,0);
  return `<tr><td class="team">${esc(t)}<span class="dues" style="color:var(--muted)">${total} picks owned</span></td>${cells}</tr>`}).join('');
 return `<div class="panel scroll"><table><thead><tr><th>Team</th>${head}</tr></thead><tbody>${rows}</tbody></table></div>`}
/* Draft order: worst finish picks first; rounds 1..S.linear repeat that order, then each later round flips (snake) */
function hasResults(y){const r=S.results[y];return !!(r&&r.length===S.teams.length&&r.every(t=>S.teams.includes(t)))}
function roundOrder(y,r){const base=[...S.results[y]].reverse();return (r>S.linear&&(r-S.linear)%2===1)?base.reverse():base}
function formatText(){return S.linear>=S.rounds?'every round linear':S.linear<=0?'snake from round 1':S.linear===1?'round 1 linear, then snake':`rounds 1–${S.linear} linear, then snake`}
function draftOrder(){
 return S.years.map(y=>{
  if(!hasResults(y))return `<div class="panel"><div class="empty"><b>${y} draft</b> · Order is set once the ${season(y)} season ends and final standings are in.</div></div>`;
  const rows=[];for(let r=1;r<=S.rounds;r++){const o=roundOrder(y,r);
   rows.push(`<div class="rd"><span class="rn">R${r}</span><div class="slots">${o.map((t,i)=>{const ow=own(pid(y,r,t));return `<span class="slot${ow!==t?' moved':''}"><i>${r}.${String(i+1).padStart(2,'0')}</i> ${esc(ow)}${ow!==t?` <em>via ${esc(t)}</em>`:''}</span>`}).join('')}</div></div>`)}
  const st=S.results[y].map((t,i)=>`${ord(i+1)} ${esc(t)}`).join(' · ');
  return `<div class="panel do"><div class="dohead"><b>${y} draft</b><span class="msg">${formatText()}</span><button class="small" data-act="copy" data-y="${y}">${esc(copyMsg[y]||'Copy order')}</button></div><div class="standline">${season(y)} final: ${st}</div>${rows.join('')}</div>`}).join('')}
function orderText(y){const lines=[`Windsor Keepers ${y} draft order (${formatText()})`];
 for(let r=1;r<=S.rounds;r++){lines.push(`R${r}: `+roundOrder(y,r).map((t,i)=>{const ow=own(pid(y,r,t));return `${i+1}. ${ow}${ow!==t?` (via ${t})`:''}`}).join(', '))}
 return lines.join('\n')}
function tradeLog(){
 if(!S.trades.length)return `<div class="panel"><div class="empty">No trades yet. Every trade shows up here with the date, players and picks that moved.</div></div>`;
 const list=[...S.trades].reverse().map((tr,i)=>{
  const side=(from,to)=>{
   const picks=tr.moves.filter(m=>m.from===from).map(m=>{const[y,r,t]=m.pick.split('|');return `<span class="pk">${y} R${r}${t!==from?` · ${esc(t)}'s`:''}</span>`});
   const pl=((tr.players&&tr.players[from])||'').split(',').map(s=>s.trim()).filter(Boolean).map(s=>`<span class="pl">${esc(s)}</span>`);
   return `<div><b>${esc(from)} sends</b><div class="items">${[...pl,...picks].join('')||'<span class="note">Nothing</span>'}</div></div>`};
  const last=i===0&&canEdit?`<button class="link" data-act="undo">Undo this trade</button>`:'';
  return `<div class="trade"><div class="head"><span class="who">${esc(tr.a)} ⇄ ${esc(tr.b)}</span><span class="date">${esc(tr.date)}</span>${last}</div><div class="sides">${side(tr.a,tr.b)}${side(tr.b,tr.a)}</div>${tr.note?`<div class="note">${esc(tr.note)}</div>`:''}</div>`}).join('');
 return `<div class="panel log">${list}</div>`}
function teamOpts(sel){return S.teams.map(t=>`<option${t===sel?' selected':''}>${esc(t)}</option>`).join('')}
function pickChecks(team,side){const ks=allPicks().filter(k=>own(k)===team);
 return S.years.map(y=>`<div class="cks">${ks.filter(k=>k.startsWith(y+'|')).map(k=>{const[,r,t]=k.split('|');return `<label class="ck"><input type="checkbox" data-side="${side}" value="${esc(k)}">${y} R${r}${t!==team?' ('+esc(t)+')':''}</label>`}).join('')}</div>`).join('')}
function standingsTools(){
 return S.years.map(y=>{const r=S.results[y]||[];
  return `<fieldset class="stand"><legend>${season(y)} final standings → sets the ${y} draft</legend>
  <div class="names">${S.teams.map((_,i)=>`<label class="f">${ord(i+1)}${i===0?' (champion)':i===S.teams.length-1?' (last)':''}<select data-res="${y}|${i}"><option value="">—</option>${S.teams.map(t=>`<option${r[i]===t?' selected':''}>${esc(t)}</option>`).join('')}</select></label>`).join('')}</div>
  <div class="row"><button class="primary" data-act="saveres" data-y="${y}">Save ${season(y)} standings</button>${r.length?`<button data-act="clearres" data-y="${y}">Clear</button>`:''}</div></fieldset>`}).join('')}
let form=null;
function tools(){
 if(!canEdit)return '';
 const w=pending?`<div class="warn"><span>${esc(pending.warn)}</span><div class="row"><button class="primary" data-act="force">Log it anyway</button><button data-act="cancelwarn">Cancel</button></div></div>`:'';
 const duesRows=S.teams.map(t=>`<tr><td>${esc(t)}</td>${S.years.map(y=>`<td><input type="checkbox" data-due="${y}|${esc(t)}"${paid(y,t)?' checked':''} aria-label="${y} dues paid for ${esc(t)}"></td>`).join('')}</tr>`).join('');
 return `<section style="display:grid;gap:10px"><h2>Commissioner</h2>
 <div class="panel tools">
  <div class="row"><label class="f">Team A<select id="ta">${teamOpts(form.a)}</select></label><label class="f">Team B<select id="tb">${teamOpts(form.b)}</select></label><label class="f" style="flex:0 1 170px">Date<input type="date" id="td" value="${esc(form.date)}"></label></div>
  <div class="choose">
   <fieldset><legend>${esc(form.a)} sends</legend>${pickChecks(form.a,'a')}<input type="text" id="pa" placeholder="Players, comma separated"></fieldset>
   <fieldset><legend>${esc(form.b)} sends</legend>${pickChecks(form.b,'b')}<input type="text" id="pb" placeholder="Players, comma separated"></fieldset>
  </div>
  <label class="f">Note<input type="text" id="tn" placeholder="Optional, e.g. 'Players processed in Yahoo Oct 30'"></label>
  ${w}
  <div class="row"><button class="primary" data-act="log">Log trade</button><span class="msg">Process the players in Yahoo too.</span><span class="msg">${esc(msg)}</span></div>
 </div>
 <details class="panel set"${resMsg?' open':''}><summary>Season results</summary><div class="tools">
  <p class="msg" style="margin:0">Enter where every team finished: playoffs decide 1st–4th, the consolation bracket decides 5th–8th. The draft order above fills in from this.</p>
  ${standingsTools()}
  ${resMsg?`<span class="msg">${esc(resMsg)}</span>`:''}
 </div></details>
 <details class="panel set"><summary>Dues, teams and settings</summary><div class="tools">
  <div class="scroll"><table class="duesgrid"><thead><tr><th>Dues paid</th>${S.years.map(y=>`<th>${y}</th>`).join('')}</tr></thead><tbody>${duesRows}</tbody></table></div>
  <div class="names">${S.teams.map((t,i)=>`<label class="f">Team ${i+1}<input type="text" data-name="${i}" value="${esc(t)}"></label>`).join('')}</div>
  <div class="row"><label class="f" style="flex:0 1 160px">Rounds per year<input type="number" id="rounds" min="1" max="15" value="${S.rounds}"></label>
   <label class="f" style="flex:0 1 220px">Linear rounds before snake<input type="number" id="linear" min="0" max="15" value="${S.linear}"></label></div>
  <div class="row"><button data-act="addyear">Add ${Math.max(...S.years)+1}</button><button data-act="dropyear">Drop ${Math.min(...S.years)} (after its draft)</button></div>
  <div class="row"><button class="primary" data-act="savesettings">Save dues and settings</button><button data-act="signout">Sign out of commissioner mode</button></div>
 </div></details></section>`}
function render(){
 const keep={pa:document.getElementById('pa')?.value||'',pb:document.getElementById('pb')?.value||'',tn:document.getElementById('tn')?.value||''};
 const keepRes={};app.querySelectorAll('select[data-res]').forEach(s=>keepRes[s.dataset.res]=s.value);
 const keepers=15-S.rounds;
 app.innerHTML=`<header><h1>Windsor Keepers <span>Pick Ledger</span></h1>
 <p class="sub">Who owns every future draft pick, and the draft order each year. This page is the official record; Yahoo only handles the players.${updated()}</p>
 <span class="badge${canEdit?' edit':''}">${canEdit?'Commissioner view · you can edit':'View only · kept by the commissioner'}</span></header>
 <div class="rules">
  <p>Each team keeps ${keepers} players a year, free, with no contract limit. Each draft is ${S.rounds} rounds for everyone else.</p>
  <p>Dues are $100 a season, always paid one season ahead. Leave early and your prepaid dues go to whoever takes over your team.</p>
  <p>Picks can be traded up to two drafts out, and only once that year's dues are paid.</p>
  <p>Draft order is worst finish first: playoffs set 1st–4th, the consolation bracket sets 5th–8th. ${formatText().replace(/^./,c=>c.toUpperCase())}.</p>
 </div>
 <section style="display:grid;gap:10px"><h2>Pick board</h2><div class="legend"><span class="pk">R1</span>own pick <span class="pk got">R1 · Ajay</span>acquired, original owner <span class="pk gone">R2 → Vasu</span>traded away</div>${board()}</section>
 <section style="display:grid;gap:10px"><h2>Draft order</h2>${draftOrder()}</section>
 <section style="display:grid;gap:10px"><h2>Trade log</h2>${tradeLog()}</section>${tools()}${signinPanel()}`;
 for(const id in keep){const el=document.getElementById(id);if(el)el.value=keep[id]}
 app.querySelectorAll('select[data-res]').forEach(s=>{if(s.dataset.res in keepRes)s.value=keepRes[s.dataset.res]});
}
const LS='wk-ledger-github';
let showSignin=false,signMsg='';
function cfg(){try{return JSON.parse(localStorage.getItem(LS)||'null')}catch(e){return null}}
function guessRepo(){const h=location.hostname;if(h.endsWith('.github.io')){const seg=location.pathname.split('/').filter(Boolean)[0];return{owner:h.split('.')[0],repo:seg||h}}return{owner:'',repo:''}}
const b64e=s=>btoa(unescape(encodeURIComponent(s)));
const b64d=s=>decodeURIComponent(escape(atob(s.replace(/\n/g,''))));
const api=(c,p,o={})=>fetch(`https://api.github.com/repos/${c.owner}/${c.repo}${p}`,{...o,cache:'no-store',headers:{Authorization:'Bearer '+c.token,Accept:'application/vnd.github+json',...(o.headers||{})}});
function updated(){return S.updated?` <span style="white-space:nowrap">Last updated ${esc(S.updated)}.</span>`:''}
function signinPanel(){
 if(canEdit)return '';
 if(!showSignin)return `<p class="msg" style="text-align:center;margin:0"><button class="link" style="color:var(--muted)" data-act="signinopen">Commissioner sign-in</button></p>`;
 const g=cfg()||guessRepo();
 return `<section style="display:grid;gap:10px"><h2>Commissioner sign-in</h2><div class="panel tools">
  <p class="msg" style="margin:0">Paste a GitHub fine-grained token with <b>Contents: read and write</b> on this repo only. It stays in this browser and is only ever sent to GitHub.</p>
  <div class="row"><label class="f">GitHub owner<input type="text" id="gho" value="${esc(g.owner||'')}"></label><label class="f">Repo<input type="text" id="ghr" value="${esc(g.repo||'')}"></label></div>
  <label class="f">Token<input type="password" id="ght" autocomplete="off" placeholder="github_pat_…" style="font:inherit;padding:7px 10px;border:1px solid var(--line);border-radius:6px;background:var(--bg);color:var(--fg)"></label>
  <div class="row"><button class="primary" data-act="signin">Sign in</button><span class="msg">${esc(signMsg)}</span></div>
 </div></section>`}
async function signIn(){
 const c={owner:document.getElementById('gho').value.trim(),repo:document.getElementById('ghr').value.trim(),token:document.getElementById('ght').value.trim()};
 if(!c.owner||!c.repo||!c.token){signMsg='Fill in all three.';render();return}
 signMsg='Checking…';render();
 try{const r=await api(c,'');if(!r.ok)throw 0;const j=await r.json();if(!j.permissions||!j.permissions.push){signMsg='That token can read the repo but not write to it.';render();return}
  c.branch=j.default_branch||'main';try{localStorage.setItem(LS,JSON.stringify(c))}catch(_){signMsg='This browser blocked saving the token.';render();return}
  signMsg='';showSignin=false;await boot()}
 catch(e){signMsg='GitHub didn\'t accept that token for this repo.';render()}
}
async function save(note){
 const c=cfg();if(!c){canEdit=false;render();return}
 msg='Saving…';render();
 try{
  const g=await api(c,`/contents/data.json?ref=${encodeURIComponent(c.branch)}`);if(!g.ok)throw{status:g.status};
  const cur=await g.json();
  if(baseSha&&cur.sha!==baseSha){msg='data.json changed on GitHub since you opened this page. Reload, then redo your change.';render();return}
  S.updated=new Date().toLocaleDateString('en-CA',{year:'numeric',month:'short',day:'numeric'});
  const p=await api(c,'/contents/data.json',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:note||'Update ledger',content:b64e(JSON.stringify(S,null,1)+'\n'),sha:cur.sha,branch:c.branch})});
  if(!p.ok)throw{status:p.status};
  baseSha=(await p.json()).content.sha;msg='Saved. Live for everyone in about a minute.';if(resMsg)resMsg='Saved.';render()}
 catch(e){const s=e&&e.status;msg=s===401||s===403?'GitHub rejected the token. Sign out and sign in again.':s===409?'GitHub reported a conflict. Reload and retry.':'Could not save. Try again in a moment.';render()}
}
function collect(){const g=s=>[...app.querySelectorAll(`input[data-side="${s}"]:checked`)].map(i=>i.value);
 return{a:form.a,b:form.b,date:document.getElementById('td').value||form.date,pa:g('a'),pb:g('b'),playersA:document.getElementById('pa').value.trim(),playersB:document.getElementById('pb').value.trim(),note:document.getElementById('tn').value.trim()}}
function check(t){
 if(t.a===t.b)return{err:'Pick two different teams.'};
 if(!t.pa.length&&!t.pb.length&&!t.playersA&&!t.playersB)return{err:'Add at least one player or pick.'};
 const unpaid=[];[[t.a,t.pa],[t.b,t.pb]].forEach(([team,ks])=>ks.forEach(k=>{const y=k.split('|')[0];if(!paid(y,team))unpaid.push(`${team} (${y})`)}));
 if(unpaid.length)return{warn:`Dues not marked paid for ${[...new Set(unpaid)].join(', ')}. League rules say those picks can't be traded yet.`};
 return{};
}
function apply(t){
 const moves=[...t.pa.map(k=>({pick:k,from:t.a,to:t.b})),...t.pb.map(k=>({pick:k,from:t.b,to:t.a}))];
 moves.forEach(m=>{const orig=m.pick.split('|')[2];if(m.to===orig)delete S.owner[m.pick];else S.owner[m.pick]=m.to});
 const players={};if(t.playersA)players[t.a]=t.playersA;if(t.playersB)players[t.b]=t.playersB;
 S.trades.push({date:t.date,a:t.a,b:t.b,moves,players,note:t.note});
}
app.addEventListener('change',e=>{
 if(e.target.id==='ta'){form.a=e.target.value;pending=null;render()}
 else if(e.target.id==='tb'){form.b=e.target.value;pending=null;render()}
 else if(e.target.id==='td'){form.date=e.target.value}
});
app.addEventListener('click',async e=>{
 const b=e.target.closest('button[data-act]');if(!b)return;const act=b.dataset.act;
 if(act==='copy'){const y=b.dataset.y;
  try{await navigator.clipboard.writeText(orderText(y));copyMsg[y]='Copied'}catch(_){copyMsg[y]='Copy blocked here'}
  render();setTimeout(()=>{delete copyMsg[y];render()},2000);return}
 if(act==='signin'){signIn();return}
 if(act==='signinopen'){showSignin=true;render();return}
 if(!canEdit)return;
 if(act==='signout'){try{localStorage.removeItem(LS)}catch(_){}canEdit=false;msg='';render();return}
 if(act==='log'){const t=collect(),c=check(t);if(c.err){msg=c.err;render();return}if(c.warn){pending={t,warn:c.warn};msg='';render();return}apply(t);save(`Trade: ${t.a} ⇄ ${t.b}`)}
 else if(act==='force'&&pending){const pt=pending.t;apply(pt);pending=null;save(`Trade: ${pt.a} ⇄ ${pt.b}`)}
 else if(act==='cancelwarn'){pending=null;render()}
 else if(act==='undo'){const tr=S.trades[S.trades.length-1];if(!tr)return;
  const blocked=tr.moves.some(m=>own(m.pick)!==m.to);if(blocked){msg='A pick from that trade has moved again since, so it can\'t be undone automatically.';render();return}
  tr.moves.forEach(m=>{const orig=m.pick.split('|')[2];if(m.from===orig)delete S.owner[m.pick];else S.owner[m.pick]=m.from});S.trades.pop();save('Undo last trade')}
 else if(act==='saveres'){const y=b.dataset.y;
  const arr=S.teams.map((_,i)=>app.querySelector(`select[data-res="${y}|${i}"]`).value);
  if(arr.some(v=>!v)){resMsg=`Fill in all ${S.teams.length} spots for ${season(y)}.`;render();return}
  if(new Set(arr).size!==arr.length){resMsg='Each team can only appear once.';render();return}
  S.results[y]=arr;resMsg='Saving…';save(`${season(y)} final standings`)}
 else if(act==='clearres'){const y=b.dataset.y;delete S.results[y];resMsg='Saving…';save(`Clear ${season(y)} standings`)}
 else if(act==='addyear'){S.years.push(Math.max(...S.years)+1);readSettings();save('Add draft year')}
 else if(act==='dropyear'){if(S.years.length<2)return;const y=Math.min(...S.years);S.years=S.years.filter(x=>x!==y);Object.keys(S.owner).forEach(k=>{if(k.startsWith(y+'|'))delete S.owner[k]});delete S.dues[y];delete S.results[y];readSettings();save('Drop draft year')}
 else if(act==='savesettings'){readSettings();save('Update dues and settings')}
});
function readSettings(){
 app.querySelectorAll('input[data-due]').forEach(i=>{const[y,t]=i.dataset.due.split('|');if(!S.years.includes(+y))return;S.dues[y]=S.dues[y]||{};S.dues[y][t]=i.checked});
 const ren={};app.querySelectorAll('input[data-name]').forEach(i=>{const old=S.teams[+i.dataset.name],nw=i.value.trim();if(nw&&nw!==old&&!S.teams.includes(nw))ren[old]=nw});
 if(Object.keys(ren).length){const R=n=>ren[n]||n;
  const owner={};Object.entries(S.owner).forEach(([k,v])=>{const[y,r,t]=k.split('|');owner[pid(y,r,R(t))]=R(v)});S.owner=owner;
  S.trades.forEach(tr=>{tr.a=R(tr.a);tr.b=R(tr.b);tr.moves.forEach(m=>{const[y,r,t]=m.pick.split('|');m.pick=pid(y,r,R(t));m.from=R(m.from);m.to=R(m.to)});const p={};Object.entries(tr.players||{}).forEach(([k,v])=>p[R(k)]=v);tr.players=p});
  Object.values(S.dues).forEach(d=>Object.keys(d).forEach(k=>{if(ren[k]){d[ren[k]]=d[k];delete d[k]}}));
  Object.keys(S.results).forEach(y=>{S.results[y]=S.results[y].map(R)});
  S.teams=S.teams.map(R);form.a=R(form.a);form.b=R(form.b)}
 const r=parseInt(document.getElementById('rounds').value,10);if(r>=1&&r<=15)S.rounds=r;
 const l=parseInt(document.getElementById('linear').value,10);if(l>=0&&l<=15)S.linear=l;
}
async function boot(){
 const c=cfg();canEdit=false;
 try{
  if(c){const r=await api(c,`/contents/data.json?ref=${encodeURIComponent(c.branch||'main')}`);
   if(r.ok){const j=await r.json();S=JSON.parse(b64d(j.content));baseSha=j.sha;canEdit=true}}
 }catch(e){}
 if(!S||!canEdit){try{const r=await fetch('data.json?t='+Date.now(),{cache:'no-store'});S=await r.json()}catch(e){app.innerHTML='<p class="empty">Couldn\'t load data.json.</p>';return}}
 S.results=S.results||{};if(typeof S.linear!=='number')S.linear=7;
 if(!form||!S.teams.includes(form.a))form={a:S.teams[0],b:S.teams[1],date:new Date().toISOString().slice(0,10)};
 render();
}
if(location.hash==='#commish')showSignin=true;
boot();
})();
