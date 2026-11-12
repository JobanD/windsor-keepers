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
  return `<tr><td class="team"><a href="#team-${slug(t)}">${esc(t)}</a><span class="dues" style="color:var(--muted)">${total} picks owned</span></td>${cells}</tr>`}).join('');
 return `<div class="panel scroll"><table><thead><tr><th>Team</th>${head}</tr></thead><tbody>${rows}</tbody></table></div>`}
/* Draft order: worst finish picks first; rounds 1..S.linear repeat that order, then each later round flips (snake) */
function hasResults(y){const r=S.results[y];return !!(r&&r.length===S.teams.length&&r.every(t=>S.teams.includes(t))&&S.teams.includes(S.champ[y]))}
/* Picks 1-7: non-champions by regular-season standings, worst first. Champion always picks last. */
function roundOrder(y,r){const c=S.champ[y];const base=[...S.results[y].filter(t=>t!==c)].reverse().concat([c]);return (r>S.linear&&(r-S.linear)%2===1)?base.reverse():base}
function formatText(){return S.linear>=S.rounds?'every round linear':S.linear<=0?'snake from round 1':S.linear===1?'round 1 linear, then snake':`rounds 1–${S.linear} linear, then snake`}
function draftOrder(){
 return S.years.map(y=>{
  if(!hasResults(y))return `<div class="panel"><div class="empty"><b>${y} draft</b> · Order is set once the ${season(y)} season ends: regular-season standings plus the champion.</div></div>`;
  const rows=[];for(let r=1;r<=S.rounds;r++){const o=roundOrder(y,r);
   rows.push(`<div class="rd"><span class="rn">R${r}</span><div class="slots">${o.map((t,i)=>{const ow=own(pid(y,r,t));return `<span class="slot${ow!==t?' moved':''}"><i>${r}.${String(i+1).padStart(2,'0')}</i> ${esc(ow)}${ow!==t?` <em>via ${esc(t)}</em>`:''}</span>`}).join('')}</div></div>`)}
  const st=S.results[y].map((t,i)=>`${ord(i+1)} ${esc(t)}`).join(' · ')+` · Champion: ${esc(S.champ[y])}`;
  return `<div class="panel do"><div class="dohead"><b>${y} draft</b><span class="msg">${formatText()}</span><button class="small" data-act="copy" data-y="${y}">${esc(copyMsg[y]||'Copy order')}</button></div><div class="standline">${season(y)} regular season: ${st}</div>${rows.join('')}</div>`}).join('')}
function orderText(y){const lines=[`Windsor Keepers ${y} draft order (${formatText()})`];
 for(let r=1;r<=S.rounds;r++){lines.push(`R${r}: `+roundOrder(y,r).map((t,i)=>{const ow=own(pid(y,r,t));return `${i+1}. ${ow}${ow!==t?` (via ${t})`:''}`}).join(', '))}
 return lines.join('\n')}
function tradeLog(trades=S.trades,empty='No trades yet. Every trade shows up here with the date, players and picks that moved.'){
 if(!trades.length)return `<div class="panel"><div class="empty">${esc(empty)}</div></div>`;
 const lastTr=S.trades[S.trades.length-1];
 const list=[...trades].reverse().map((tr,i)=>{
  const side=(from,to)=>{
   const picks=tr.moves.filter(m=>m.from===from).map(m=>{const[y,r,t]=m.pick.split('|');return `<span class="pk">${y} R${r}${t!==from?` · ${esc(t)}'s`:''}</span>`});
   const pl=((tr.players&&tr.players[from])||'').split(',').map(s=>s.trim()).filter(Boolean).map(s=>`<span class="pl">${esc(s)}</span>`);
   return `<div><b>${esc(from)} sends</b><div class="items">${[...pl,...picks].join('')||'<span class="note">Nothing</span>'}</div></div>`};
  const last=tr===lastTr&&canEdit&&view().v==='ledger'?`<button class="link" data-act="undo">Undo this trade</button>`:'';
  return `<div class="trade"><div class="head"><span class="who">${esc(tr.a)} ⇄ ${esc(tr.b)}</span><span class="date">${esc(tr.date)}</span>${last}</div><div class="sides">${side(tr.a,tr.b)}${side(tr.b,tr.a)}</div>${tr.note?`<div class="note">${esc(tr.note)}</div>`:''}</div>`}).join('');
 return `<div class="panel log">${list}</div>`}
function teamOpts(sel){return S.teams.map(t=>`<option${t===sel?' selected':''}>${esc(t)}</option>`).join('')}
function pickChecks(team,side){const ks=allPicks().filter(k=>own(k)===team);
 return S.years.map(y=>`<div class="cks">${ks.filter(k=>k.startsWith(y+'|')).map(k=>{const[,r,t]=k.split('|');return `<label class="ck"><input type="checkbox" data-side="${side}" value="${esc(k)}">${y} R${r}${t!==team?' ('+esc(t)+')':''}</label>`}).join('')}</div>`).join('')}
function standingsTools(){
 return S.years.map(y=>{const r=S.results[y]||[],c=S.champ[y]||'';
  const opts=sel=>`<option value="">—</option>${S.teams.map(t=>`<option${sel===t?' selected':''}>${esc(t)}</option>`).join('')}`;
  return `<fieldset class="stand"><legend>${season(y)} season → sets the ${y} draft</legend>
  <label class="f" style="max-width:240px">Champion (picks last)<select data-champ="${y}">${opts(c)}</select></label>
  <div class="msg">Regular-season standings</div>
  <div class="names">${S.teams.map((_,i)=>`<label class="f">${ord(i+1)}${i===S.teams.length-1?' (last)':''}<select data-res="${y}|${i}">${opts(r[i])}</select></label>`).join('')}</div>
  <div class="row"><button class="primary" data-act="saveres" data-y="${y}">Save ${season(y)} results</button>${r.length?`<button data-act="clearres" data-y="${y}">Clear</button>`:''}</div></fieldset>`}).join('')}
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
  <p class="msg" style="margin:0">Enter the champion and the final regular-season standings. Picks 1–7 go worst record first, skipping the champion, who always picks last.</p>
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
const slug=t=>String(t).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
function view(){const h=location.hash.slice(1);
 if(h==='rules')return{v:'rules'};
 if(h==='teams')return{v:'teams'};
 if(h.startsWith('team-')){const t=S.teams.find(x=>'team-'+slug(x)===h);return t?{v:'team',team:t}:{v:'teams'}}
 return{v:'ledger'}}
function nav(v){const on=x=>x===v||(x==='teams'&&v==='team')?' class="on"':'';
 return `<nav class="nav"><a href="#ledger"${on('ledger')}>Ledger</a><a href="#teams"${on('teams')}>Teams</a><a href="#rules"${on('rules')}>Rulebook</a></nav>`}
function rulesStrip(){const keepers=15-S.rounds;return `<div class="rules">
  <p>Each team keeps ${keepers} players a year, free, with no contract limit. Each draft is ${S.rounds} rounds for everyone else.</p>
  <p>Picks can be traded for any future draft, as long as your dues are paid for every season up to and including that draft's year.</p>
  <p>Draft order is worst regular-season record first, and the champion always picks last. ${formatText().replace(/^./,c=>c.toUpperCase())}. <a href="#rules">Full rulebook →</a></p>
 </div>`}
function ledgerView(){return `${rulesStrip()}
 <section style="display:grid;gap:10px"><h2>Pick board</h2><div class="legend"><span class="pk">R1</span>own pick <span class="pk got">R1 · Ajay</span>acquired, original owner <span class="pk gone">R2 → Vasu</span>traded away</div>${board()}</section>
 <section style="display:grid;gap:10px"><h2>Draft order</h2>${draftOrder()}</section>
 <section style="display:grid;gap:10px"><h2>Trade log</h2>${tradeLog()}</section>${tools()}`}
function teamChips(sel){return `<div class="teamchips">${S.teams.map(t=>`<a href="#team-${slug(t)}"${t===sel?' class="on"':''}>${esc(t)}</a>`).join('')}</div>`}
function teamView(t){
 if(!t)return `<section style="display:grid;gap:10px"><h2>Teams</h2><p class="msg" style="margin:0">Pick a team to see its picks, dues and trade history.</p>${teamChips()}</section>`;
 const yrs=S.years.map(y=>{
  const mine=[];for(const o of S.teams)for(let r=1;r<=S.rounds;r++){const k=pid(y,r,o);if(o===t||own(k)===t)mine.push([r,o===t?0:1,k])}
  mine.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
  const n=mine.filter(m=>own(m[2])===t).length;
  return `<div class="tyear"><div class="tyhead"><b>${y}</b><span class="msg">${n} pick${n===1?'':'s'} owned</span><span class="dues ${paid(y,t)?'ok':'no'}">dues ${paid(y,t)?'paid':'not paid'}</span></div><div class="picks">${mine.map(m=>chipFor(m[2],t)).join('')}</div></div>`}).join('');
 const trs=S.trades.filter(x=>x.a===t||x.b===t);
 const res=Object.keys(S.results).sort().map(y=>{const i=S.results[y].indexOf(t);return i<0?'':`<span class="pk${S.champ[y]===t?' got':''}">${season(+y)}: ${ord(i+1)} reg. season${S.champ[y]===t?' · 🏆 champion':''}</span>`}).join('');
 return `${teamChips(t)}
 <section style="display:grid;gap:10px"><h2>${esc(t)}</h2>
  <div class="panel tteam">${yrs}${res?`<div class="tyear"><div class="tyhead"><b>Finishes</b></div><div class="picks">${res}</div></div>`:''}</div></section>
 <section style="display:grid;gap:10px"><h2>${esc(t)}'s trades</h2>${tradeLog(trs,`${t} hasn't made a trade yet.`)}</section>`}
function rulesView(){
 const rb=S.rulebook||[];
 const body=rb.length?rb.map(s=>`<div class="rsec"><h3>${esc(s.title)}</h3><ul>${(s.items||[]).map(i=>`<li${/\bTBD\b/.test(i)?' class="tbd"':''}>${esc(i)}</li>`).join('')}</ul></div>`).join(''):`<div class="empty">No rules written yet.</div>`;
 const ed=canEdit?`<details class="panel set"${rbMsg?' open':''}><summary>Edit rulebook</summary><div class="tools">
  <p class="msg" style="margin:0">Start a section with <code>## Title</code>, and each rule on its own line starting with <code>- </code>. Anything marked TBD is highlighted.</p>
  <textarea id="rbtext" rows="18">${esc(rulesToText(rb))}</textarea>
  <div class="row"><button class="primary" data-act="saverules">Save rulebook</button><span class="msg">${esc(rbMsg)}</span></div></div></details>`:'';
 return `<section style="display:grid;gap:10px"><h2>Rulebook</h2><div class="panel rbook">${body}</div></section>${ed}`}
let rbMsg='';
function rulesToText(rb){return rb.map(s=>`## ${s.title}\n`+(s.items||[]).map(i=>`- ${i}`).join('\n')).join('\n\n')}
function textToRules(txt){const out=[];let cur=null;
 txt.split('\n').forEach(l=>{const s=l.trim();if(!s)return;
  if(s.startsWith('#')){cur={title:s.replace(/^#+\s*/,''),items:[]};out.push(cur)}
  else{if(!cur){cur={title:'General',items:[]};out.push(cur)}cur.items.push(s.replace(/^[-*•]\s*/,''))}});
 return out}
function render(){
 const keep={pa:document.getElementById('pa')?.value||'',pb:document.getElementById('pb')?.value||'',tn:document.getElementById('tn')?.value||'',rbtext:document.getElementById('rbtext')?.value||''};
 const keepRes={};app.querySelectorAll('select[data-res]').forEach(s=>keepRes[s.dataset.res]=s.value);app.querySelectorAll('select[data-champ]').forEach(s=>keepRes['c'+s.dataset.champ]=s.value);
 const v=view();
 const body=v.v==='rules'?rulesView():v.v==='teams'?teamView(null):v.v==='team'?teamView(v.team):ledgerView();
 app.innerHTML=`<header><h1>Windsor Keepers <span>Pick Ledger</span></h1>
 <p class="sub">Who owns every future draft pick, every trade, and the league rules. This page is the official record; Yahoo only handles the players.${updated()}</p>
 <span class="badge${canEdit?' edit':''}">${canEdit?'Commissioner view · you can edit':'View only · kept by the commissioner'}</span></header>
 ${nav(v.v)}${body}${signinPanel()}`;
 for(const id in keep){const el=document.getElementById(id);if(el&&keep[id])el.value=keep[id]}
 app.querySelectorAll('select[data-res]').forEach(s=>{if(s.dataset.res in keepRes)s.value=keepRes[s.dataset.res]});app.querySelectorAll('select[data-champ]').forEach(s=>{const k='c'+s.dataset.champ;if(k in keepRes)s.value=keepRes[k]});
}
window.addEventListener('hashchange',()=>{if(location.hash==='#commish')showSignin=true;if(S)render();window.scrollTo(0,0)});
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
 let r;try{r=await api(c,'')}catch(e){signMsg='Couldn\'t reach GitHub from this browser. Check your connection and try again.';render();return}
 try{if(!r.ok){let m='';try{m=(await r.json()).message||''}catch(_){}signMsg=r.status===401?'GitHub says the token is invalid or expired (401). Re-copy it, or make a new one.':r.status===404?`GitHub can't see ${c.owner}/${c.repo} with this token (404). Set Repository access to Only select repositories → windsor-keepers.`:r.status===403?`GitHub refused the token (403): ${m}`:`GitHub error ${r.status}: ${m}`;render();return}
 const j=await r.json();if(!j.permissions||!j.permissions.push){signMsg='That token can read the repo but not write to it.';render();return}
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
  baseSha=(await p.json()).content.sha;msg='Saved. Live for everyone in about a minute.';if(resMsg)resMsg='Saved.';if(rbMsg)rbMsg='Saved.';render()}
 catch(e){const s=e&&e.status;msg=s===401||s===403?'GitHub rejected the token. Sign out and sign in again.':s===409?'GitHub reported a conflict. Reload and retry.':'Could not save. Try again in a moment.';render()}
}
function collect(){const g=s=>[...app.querySelectorAll(`input[data-side="${s}"]:checked`)].map(i=>i.value);
 return{a:form.a,b:form.b,date:document.getElementById('td').value||form.date,pa:g('a'),pb:g('b'),playersA:document.getElementById('pa').value.trim(),playersB:document.getElementById('pb').value.trim(),note:document.getElementById('tn').value.trim()}}
function check(t){
 if(t.a===t.b)return{err:'Pick two different teams.'};
 if(!t.pa.length&&!t.pb.length&&!t.playersA&&!t.playersB)return{err:'Add at least one player or pick.'};
 const owe={};[[t.a,t.pa],[t.b,t.pb]].forEach(([team,ks])=>ks.forEach(k=>{const y=+k.split('|')[0];S.years.filter(x=>x<=y&&!paid(x,team)).forEach(x=>{(owe[team]=owe[team]||new Set()).add(x)})}));
 const list=Object.entries(owe).map(([team,ys])=>`${team} (${[...ys].sort().join(', ')})`);
 if(list.length)return{warn:`Dues not marked paid for ${list.join('; ')}. League rules say a team has to be paid up through a pick's year before trading it.`};
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
  const c=app.querySelector(`select[data-champ="${y}"]`).value;if(!c){resMsg=`Pick the ${season(y)} champion.`;render();return}
  S.results[y]=arr;S.champ[y]=c;resMsg='Saving…';save(`${season(y)} results`)}
 else if(act==='clearres'){const y=b.dataset.y;delete S.results[y];delete S.champ[y];resMsg='Saving…';save(`Clear ${season(y)} results`)}
 else if(act==='addyear'){S.years.push(Math.max(...S.years)+1);readSettings();save('Add draft year')}
 else if(act==='dropyear'){if(S.years.length<2)return;const y=Math.min(...S.years);S.years=S.years.filter(x=>x!==y);Object.keys(S.owner).forEach(k=>{if(k.startsWith(y+'|'))delete S.owner[k]});delete S.dues[y];delete S.results[y];delete S.champ[y];readSettings();save('Drop draft year')}
 else if(act==='saverules'){const rb=textToRules(document.getElementById('rbtext').value);if(!rb.length){rbMsg='The rulebook can\'t be empty.';render();return}S.rulebook=rb;rbMsg='Saving…';save('Update rulebook')}
 else if(act==='savesettings'){readSettings();save('Update dues and settings')}
});
function readSettings(){
 app.querySelectorAll('input[data-due]').forEach(i=>{const[y,t]=i.dataset.due.split('|');if(!S.years.includes(+y))return;S.dues[y]=S.dues[y]||{};S.dues[y][t]=i.checked});
 const ren={};app.querySelectorAll('input[data-name]').forEach(i=>{const old=S.teams[+i.dataset.name],nw=i.value.trim();if(nw&&nw!==old&&!S.teams.includes(nw))ren[old]=nw});
 if(Object.keys(ren).length){const R=n=>ren[n]||n;
  const owner={};Object.entries(S.owner).forEach(([k,v])=>{const[y,r,t]=k.split('|');owner[pid(y,r,R(t))]=R(v)});S.owner=owner;
  S.trades.forEach(tr=>{tr.a=R(tr.a);tr.b=R(tr.b);tr.moves.forEach(m=>{const[y,r,t]=m.pick.split('|');m.pick=pid(y,r,R(t));m.from=R(m.from);m.to=R(m.to)});const p={};Object.entries(tr.players||{}).forEach(([k,v])=>p[R(k)]=v);tr.players=p});
  Object.values(S.dues).forEach(d=>Object.keys(d).forEach(k=>{if(ren[k]){d[ren[k]]=d[k];delete d[k]}}));
  Object.keys(S.results).forEach(y=>{S.results[y]=S.results[y].map(R)});Object.keys(S.champ).forEach(y=>{S.champ[y]=R(S.champ[y])});
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
 S.results=S.results||{};S.champ=S.champ||{};if(typeof S.linear!=='number')S.linear=7;
 if(!form||!S.teams.includes(form.a))form={a:S.teams[0],b:S.teams[1],date:new Date().toISOString().slice(0,10)};
 render();
}
if(location.hash==='#commish')showSignin=true;
boot();
})();
