const navToggle=document.querySelector('.nav-toggle');const nav=document.getElementById('site-nav');
if(navToggle&&nav){navToggle.addEventListener('click',()=>{const open=nav.classList.toggle('open');navToggle.setAttribute('aria-expanded',String(open));});}
document.getElementById('year').textContent=new Date().getFullYear();

const currency=n=>'$'+n.toFixed(2);

// Materials grid
async function loadMaterials(){
  const wrap=document.getElementById('materials-grid'); if(!wrap) return;
  try{
    const res=await fetch('assets/data/materials.json'); const items=await res.json();
    window.MATERIALS=items;
    wrap.innerHTML=items.map(m=>`
      <article class="card" data-material-id="${m.id}" data-material-name="${m.name}">
        <a class="thumb"><img src="${m.image}" alt="${m.name} thumbnail"></a>
        <h3>${m.name}</h3>
        <p class="muted">Customize & upload artwork</p>
        <span class="price-tag">${m.price}</span>
      </article>
    `).join('');
  }catch(e){ wrap.innerHTML='<p>Could not load materials.</p>'; }
}
document.addEventListener('DOMContentLoaded', loadMaterials);

// Artwork grid
async function loadGallery(){
  const el=document.getElementById('gallery'); if(!el) return;
  try{
    const res=await fetch('assets/data/artworks.json'); const items=await res.json();
    el.innerHTML=items.map(i=>`
      <article class="card tile">
        <a class="thumb" href="${i.image}" target="_blank" rel="noopener"><img src="${i.image}" alt="${i.title}" loading="lazy"/></a>
        <div><h3>${i.title}</h3><p class="muted">${i.size} • ${i.materials.join(', ')}</p>
        <div style="display:flex;justify-content:space-between;align-items:center"><strong>${i.price}</strong>
        ${i.buy_url?`<a class="btn btn-primary" href="${i.buy_url}" target="_blank" rel="noopener">Buy</a>`:`<a class="btn" href="mailto:Mike.devlieger7@gmail.com?subject=Artwork%20Inquiry:%20${encodeURIComponent(i.title)}">Email to purchase</a>`}
        </div></div>
      </article>`).join('');
  }catch(e){ el.innerHTML='<p>Could not load artwork.</p>'; }
}
document.addEventListener('DOMContentLoaded', loadGallery);

// Click to open drawer
document.addEventListener('click', async (e)=>{
  const card=e.target.closest('.products .card[data-material-id]'); if(!card) return;
  if(!window.MATERIALS){const r=await fetch('assets/data/materials.json'); window.MATERIALS=await r.json();}
  openDrawer(card.getAttribute('data-material-id'), card.getAttribute('data-material-name'));
});

// Drawer
function openDrawer(materialId, materialName){
  const root=document.getElementById('mdc-drawer');
  let backdrop=root.querySelector('.mdc-drawer__backdrop');
  let closeBtn=root.querySelector('.mdc-drawer__close');

  const newBackdrop=backdrop.cloneNode(true); backdrop.parentNode.replaceChild(newBackdrop, backdrop); backdrop=newBackdrop;
  const newClose=closeBtn.cloneNode(true); closeBtn.parentNode.replaceChild(newClose, closeBtn); closeBtn=newClose;

  const title=document.getElementById('mdc-drawer-title');
  const matId=document.getElementById('mdc-material-id');
  const matName=document.getElementById('mdc-material-name');

  const w=document.getElementById('mdc-w');
  const h=document.getElementById('mdc-h');
  const q=document.getElementById('mdc-q');
  const optsWrap=document.getElementById('mdc-opts');

  const areaEl=document.getElementById('mdc-area');
  const priceEl=document.getElementById('mdc-price');
  const eachEl=document.getElementById('mdc-each');

  const filesInput=document.getElementById('mdc-files');
  const drop=document.getElementById('mdc-drop');
  const previews=drop.querySelector('.previews');

  const ship=document.getElementById('mdc-ship');
  const form=document.getElementById('order-form');
  const status=document.getElementById('form-status');

  const mat=(window.MATERIALS||[]).find(m=>m.id===materialId)||{};

  title.textContent=`${materialName} — Customize & Upload`; matId.value=materialId; matName.value=materialName;
  w.value=w.value||24; h.value=h.value||36; q.value=q.value||1;

  // Options
  optsWrap.innerHTML='<legend>Options</legend>';
  const labelMap={hems:'Hems',grommets:'Grommets',wind_slits:'Wind slits',laminate:'Laminate',rounded_corners:'Rounded corners',standoffs:'Standoffs',h_stakes:'H-stakes',spot_gloss:'Spot gloss'};
  Object.entries(mat.options||{}).forEach(([key,val])=>{
    const per=(val<2)?' / sq ft':'';
    const el=document.createElement('label');
    el.innerHTML=`<span>${labelMap[key]||key} (+$${val}${per})</span><input type="checkbox" data-opt="${key}">`;
    optsWrap.appendChild(el);
  });

  // Pricing
  const recalc=()=>{
    const base=mat.base_rate||0, minP=mat.min_price||0;
    const W=parseFloat(w.value||0), H=parseFloat(h.value||0), Q=parseInt(q.value||1,10);
    const area=Math.max(0,(W*H)/144);
    let price=Math.max(minP, area*base);
    optsWrap.querySelectorAll('input[type="checkbox"]').forEach(cb=>{
      if(cb.checked){ const add=(mat.options||{})[cb.dataset.opt]; price += (add<2)?(area*add):add; }
    });
    const total=price*Q;
    areaEl.textContent=area.toFixed(2)+' sq ft';
    priceEl.textContent=currency(total);
    eachEl.textContent=currency(total/Math.max(1,Q));
    return {W,H,Q,area,total};
  };
  let t; const debounced=()=>{ clearTimeout(t); t=setTimeout(recalc,80); };
  ['input','change'].forEach(evt=>{
    w.addEventListener(evt,debounced,{passive:true});
    h.addEventListener(evt,debounced,{passive:true});
    q.addEventListener(evt,debounced,{passive:true});
    optsWrap.addEventListener(evt,debounced,{passive:true});
  });
  recalc();

  // File previews (filenames only, not uploading yet)
  const dropClone=drop.cloneNode(true); drop.parentNode.replaceChild(dropClone, drop);
  dropClone.addEventListener('click',()=>filesInput.click());
  dropClone.addEventListener('dragover',(e)=>{e.preventDefault(); dropClone.classList.add('drag');});
  dropClone.addEventListener('dragleave',()=>dropClone.classList.remove('drag'));
  dropClone.addEventListener('drop',(e)=>{e.preventDefault(); dropClone.classList.remove('drag'); if(e.dataTransfer?.files){ filesInput.files=e.dataTransfer.files; handleFiles(e.dataTransfer.files); }});
  filesInput.addEventListener('change',()=> filesInput.files && handleFiles(filesInput.files), { once:true });
  function handleFiles(files){ previews.innerHTML=''; Array.from(files).forEach(f=>{ const p=document.createElement('div'); p.className='preview'; p.textContent=`${f.name} (${Math.round(f.size/1024)} KB)`; previews.appendChild(p); }); }

  function close(){ root.classList.remove('open'); }
  root.classList.add('open');

  const onBackdrop=(e)=>{ if(e.target===e.currentTarget) close(); };
  backdrop.addEventListener('click', onBackdrop);
  closeBtn.addEventListener('click',(e)=>{ e.preventDefault(); close(); });

  const onEsc=(e)=>{ if(e.key==='Escape'){ close(); window.removeEventListener('keydown', onEsc);} };
  window.addEventListener('keydown', onEsc);

  // Submit to Stripe checkout
  form.onsubmit=async (e)=>{
    e.preventDefault();
    status.textContent='Starting checkout…';
    const options=Array.from(optsWrap.querySelectorAll('input[type="checkbox"]:checked')).map(cb=>cb.dataset.opt);
    const filenames = Array.from(filesInput.files||[]).map(f=>f.name);
    const payload={
      materialId:matId.value, materialName:matName.value,
      widthIn:parseFloat(w.value), heightIn:parseFloat(h.value),
      quantity:parseInt(q.value,10), options,
      customer:{name:form.name.value,email:form.email.value,phone:form.phone.value},
      shipTo:ship.value,
      notes:form.details.value,
      attachments:filenames
    };
    try{
      const res=await fetch('/.netlify/functions/create-checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      if(!res.ok) throw new Error('Checkout creation failed');
      const {url}=await res.json(); window.location=url;
    }catch(err){ console.error(err); status.textContent='Could not start checkout. Please try again.'; }
  };
}

document.addEventListener('keydown',(e)=>{
  if(e.key==='Enter'&&e.target&&(e.target.matches('input[type=number]')||e.target.matches('input[type=checkbox]'))){ e.preventDefault(); }
});
