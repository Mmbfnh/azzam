// === Animate.css helper ===
function animateOnce(el, className, dur=800){ if(!el) return; el.classList.add('animated', className); setTimeout(()=>{ el.classList.remove('animated', className); }, dur); }

// Items state
const DEFAULTS = window.DEFAULT_ITEMS || [];
let ITEMS = loadItems() || DEFAULTS.slice();
function loadItems(){ try{ const raw=localStorage.getItem('cardsItems'); return raw? JSON.parse(raw): null; }catch(e){ return null; } }
function saveItems(){ localStorage.setItem('cardsItems', JSON.stringify(ITEMS)); }
function getImgSrc(item){ return item.img || `assets/${item.id}.png`; }

// Admin refs
const itemsList = document.getElementById('itemsList');
const form = document.getElementById('adminForm');
const f_id = document.getElementById('f_id');
const f_en = document.getElementById('f_en');
const f_ar = document.getElementById('f_ar');
const f_img = document.getElementById('f_img');
const f_file = document.getElementById('f_file');
const clearFormBtn = document.getElementById('clearForm');
const formMsg = document.getElementById('formMsg');
const adminPreview = document.getElementById('adminPreview');
const exportJsonBtn = document.getElementById('exportJson');
const importJsonInput = document.getElementById('importJson');
const resetDefaultsBtn = document.getElementById('resetDefaults');

function renderAdminList(){ itemsList.innerHTML=''; ITEMS.forEach((item, idx)=>{ const li=document.createElement('li'); li.className='item-card'; li.innerHTML=`<img src="${getImgSrc(item)}" alt="${item.en}"><div class="item-meta"><div><strong>${item.en} / ${item.ar}</strong></div><div style="opacity:.7">ID: ${item.id}</div></div><div class="item-actions"><button class="btn btn-outline" data-act="edit" data-idx="${idx}">تعديل</button><button class="btn btn-danger" data-act="del" data-idx="${idx}">حذف</button></div>`; li.querySelector('[data-act="edit"]').addEventListener('click', ()=> fillFormForEdit(idx)); li.querySelector('[data-act="del"]').addEventListener('click', ()=> deleteItem(idx)); itemsList.appendChild(li); }); }

function fillFormForEdit(i){ const item=ITEMS[i]; f_id.value=item.id; f_en.value=item.en; f_ar.value=item.ar; f_img.value=item.img||''; adminPreview.src=getImgSrc(item); formMsg.textContent=`تحرير: ${item.id}`; animateOnce(form,'fadeInUp'); }

function deleteItem(i){ if(!confirm('حذف العنصر؟')) return; ITEMS.splice(i,1); saveItems(); renderAdminList(); }

clearFormBtn.addEventListener('click', ()=>{ f_id.value=''; f_en.value=''; f_ar.value=''; f_img.value=''; adminPreview.src=''; formMsg.textContent=''; });

f_file.addEventListener('change', ()=>{ const file=f_file.files[0]; if(!file) return; const reader=new FileReader(); reader.onload=()=>{ adminPreview.src=reader.result; }; reader.readAsDataURL(file); });

form.addEventListener('submit', (e)=>{ e.preventDefault(); const id=f_id.value.trim(); const en=f_en.value.trim(); const ar=f_ar.value.trim(); let imgSrc=f_img.value.trim(); if(!id || !en || !ar){ formMsg.textContent='يرجى ملء كل الحقول المطلوبة'; return; } if(!imgSrc && adminPreview.src){ imgSrc=adminPreview.src; }
  const existsIdx=ITEMS.findIndex(x=> x.id===id); const obj={id,en,ar}; if(imgSrc) obj.img=imgSrc; if(existsIdx>=0){ ITEMS[existsIdx]=obj; formMsg.textContent='تم تحديث العنصر'; } else { ITEMS.push(obj); formMsg.textContent='تمت إضافة العنصر'; }
  saveItems(); renderAdminList(); animateOnce(itemsList,'fadeInUp'); });

exportJsonBtn.addEventListener('click', ()=>{ const blob=new Blob([JSON.stringify(ITEMS,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='cardsItems.json'; a.click(); URL.revokeObjectURL(a.href); animateOnce(exportJsonBtn,'pulse'); });
importJsonInput.addEventListener('change', ()=>{ const file=importJsonInput.files[0]; if(!file) return; const reader=new FileReader(); reader.onload=()=>{ try{ const data=JSON.parse(reader.result); if(Array.isArray(data)){ ITEMS=data; saveItems(); renderAdminList(); alert('تم الاستيراد بنجاح'); animateOnce(itemsList,'fadeInUp'); } }catch(err){ alert('ملف JSON غير صالح'); } }; reader.readAsText(file); });
resetDefaultsBtn.addEventListener('click', ()=>{ if(!confirm('الرجوع للوضع الافتراضي؟')) return; ITEMS = DEFAULTS.slice(); saveItems(); renderAdminList(); animateOnce(resetDefaultsBtn,'pulse'); });

// === إعدادات الصوت (داخل لوحة التحكم) ===
let clickSoundEnabled = (localStorage.getItem('clickSound') || 'off') === 'on';
(function(){ const onBtn=document.getElementById('soundOn'); const offBtn=document.getElementById('soundOff'); if(onBtn && offBtn){ const syncUI = ()=>{ onBtn.setAttribute('aria-pressed', clickSoundEnabled? 'true':'false'); offBtn.setAttribute('aria-pressed', clickSoundEnabled? 'false':'true'); onBtn.classList.toggle('is-on', clickSoundEnabled); offBtn.classList.toggle('is-on', !clickSoundEnabled); }; onBtn.addEventListener('click', ()=>{ clickSoundEnabled = true; localStorage.setItem('clickSound','on'); animateOnce(onBtn,'pulse'); syncUI(); }); offBtn.addEventListener('click', ()=>{ clickSoundEnabled = false; localStorage.setItem('clickSound','off'); animateOnce(offBtn,'pulse'); syncUI(); }); syncUI(); } })();

// Init
renderAdminList();
