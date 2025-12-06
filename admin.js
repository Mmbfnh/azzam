// === Animate.css helper ===
function animateOnce(el, className, dur=800){ if(!el) return; el.classList.add('animated', className); setTimeout(()=>{ el.classList.remove('animated', className); }, dur); }

// Items state
let ITEMS = []; // سيتم تحميلها من الملف
let CURRENT_FILE = null;

// دالة لقراءة الملفات
function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsText(file);
    });
}

// دالة لتحميل البيانات من الملف المرفوع
async function loadItemsFromFile(file) {
    try {
        const content = await readFileAsText(file);
        const data = JSON.parse(content);
        if (Array.isArray(data)) {
            ITEMS = data;
            CURRENT_FILE = file;
            return true;
        } else {
            throw new Error('تنسيق الملف غير صالح');
        }
    } catch (error) {
        console.error('خطأ في قراءة الملف:', error);
        return false;
    }
}

function getImgSrc(item){ 
    // إذا كانت الصورة base64، نستخدمها مباشرة
    if (item.img && item.img.startsWith('data:image')) {
        return item.img;
    }
    return item.img || `assets/${item.id}.png`; 
}

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

// إضافة أزرار إدارة الملفات في لوحة التحكم
const adminMain = document.querySelector('.admin-main');
const fileManagementSection = `
    <section style="padding:12px 0;border-bottom:1px solid #E5E7EB;margin-bottom:20px;">
        <h2>إدارة الملفات</h2>
        <div class="list-actions">
            <label class="btn btn-primary" style="cursor:pointer">
                📁 رفع ملف البيانات
                <input type="file" id="adminFileUpload" accept=".json" style="display:none">
            </label>
            <button id="adminSaveFile" class="btn btn-success">💾 حفظ البيانات إلى ملف</button>
            <button id="adminUseDefaults" class="btn btn-outline">🔄 استخدام البيانات الافتراضية</button>
        </div>
        <div id="fileInfo" style="margin-top:10px;color:#666;font-size:0.9rem;"></div>
    </section>
`;

adminMain.insertAdjacentHTML('afterbegin', fileManagementSection);

function renderAdminList(){ 
    itemsList.innerHTML=''; 
    
    if (!ITEMS.length) {
        itemsList.innerHTML = '<li style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #666; list-style: none;">لا توجد بيانات. يرجى رفع ملف البيانات أولاً</li>';
        return;
    }
    
    ITEMS.forEach((item, idx)=>{ 
        const li=document.createElement('li'); 
        li.className='item-card'; 
        li.innerHTML=`<img src="${getImgSrc(item)}" alt="${item.en}"><div class="item-meta"><div><strong>${item.en} / ${item.ar}</strong></div><div style="opacity:.7">ID: ${item.id}</div></div><div class="item-actions"><button class="btn btn-outline" data-act="edit" data-idx="${idx}">تعديل</button><button class="btn btn-danger" data-act="del" data-idx="${idx}">حذف</button></div>`; 
        li.querySelector('[data-act="edit"]').addEventListener('click', ()=> fillFormForEdit(idx)); 
        li.querySelector('[data-act="del"]').addEventListener('click', ()=> deleteItem(idx)); 
        itemsList.appendChild(li); 
    }); 
}

function fillFormForEdit(i){ const item=ITEMS[i]; f_id.value=item.id; f_en.value=item.en; f_ar.value=item.ar; f_img.value=item.img||''; adminPreview.src=getImgSrc(item); formMsg.textContent=`تحرير: ${item.id}`; animateOnce(form,'fadeInUp'); }

function deleteItem(i){ if(!confirm('حذف العنصر؟')) return; ITEMS.splice(i,1); updateFileInfo(); renderAdminList(); }

function updateFileInfo() {
    const fileInfo = document.getElementById('fileInfo');
    if (CURRENT_FILE) {
        fileInfo.textContent = `الملف الحالي: ${CURRENT_FILE.name} (${ITEMS.length} عنصر)`;
    } else {
        fileInfo.textContent = `البيانات الحالية: ${ITEMS.length} عنصر (لم يتم حفظها في ملف بعد)`;
    }
}

clearFormBtn.addEventListener('click', ()=>{ f_id.value=''; f_en.value=''; f_ar.value=''; f_img.value=''; adminPreview.src=''; formMsg.textContent=''; });

f_file.addEventListener('change', ()=>{ const file=f_file.files[0]; if(!file) return; const reader=new FileReader(); reader.onload=()=>{ adminPreview.src=reader.result; }; reader.readAsDataURL(file); });

form.addEventListener('submit', (e)=>{ 
    e.preventDefault(); 
    const id=f_id.value.trim(); 
    const en=f_en.value.trim(); 
    const ar=f_ar.value.trim(); 
    let imgSrc=f_img.value.trim(); 
    if(!id || !en || !ar){ formMsg.textContent='يرجى ملء كل الحصوص المطلوبة'; return; } 
    if(!imgSrc && adminPreview.src && adminPreview.src.startsWith('data:image')){ 
        imgSrc=adminPreview.src; 
    }
    
    const existsIdx=ITEMS.findIndex(x=> x.id===id); 
    const obj={id,en,ar}; 
    if(imgSrc) obj.img=imgSrc; 
    if(existsIdx>=0){ 
        ITEMS[existsIdx]=obj; 
        formMsg.textContent='تم تحديث العنصر'; 
    } else { 
        ITEMS.push(obj); 
        formMsg.textContent='تمت إضافة العنصر'; 
    }
    
    updateFileInfo();
    renderAdminList(); 
    animateOnce(itemsList,'fadeInUp'); 
});

// دالة لحفظ البيانات إلى ملف
function saveAdminToFile() {
    if (!ITEMS.length) {
        alert('لا توجد بيانات لحفظها');
        return;
    }
    
    const dataStr = JSON.stringify(ITEMS, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cards_data.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    animateOnce(document.getElementById('adminSaveFile'),'pulse');
    alert('تم حفظ البيانات إلى ملف cards_data.json');
}

// استخدام البيانات الافتراضية
function useAdminDefaults() {
    ITEMS = window.DEFAULT_ITEMS ? [...window.DEFAULT_ITEMS] : [];
    CURRENT_FILE = null;
    updateFileInfo();
    renderAdminList();
    alert('تم تحميل البيانات الافتراضية بنجاح');
}

// إضافة أحداث الملفات
document.getElementById('adminFileUpload')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const success = await loadItemsFromFile(file);
    if (success) {
        updateFileInfo();
        renderAdminList();
        alert(`تم تحميل ${ITEMS.length} عنصر بنجاح`);
    } else {
        alert('خطأ في تحميل الملف. تأكد من تنسيق JSON');
    }
});

document.getElementById('adminSaveFile')?.addEventListener('click', saveAdminToFile);
document.getElementById('adminUseDefaults')?.addEventListener('click', useAdminDefaults);

exportJsonBtn.addEventListener('click', ()=>{ 
    const blob=new Blob([JSON.stringify(ITEMS,null,2)],{type:'application/json'}); 
    const a=document.createElement('a'); 
    a.href=URL.createObjectURL(blob); 
    a.download='cardsItems.json'; 
    a.click(); 
    URL.revokeObjectURL(a.href); 
    animateOnce(exportJsonBtn,'pulse'); 
});

importJsonInput.addEventListener('change', ()=>{ 
    const file=importJsonInput.files[0]; 
    if(!file) return; 
    const reader=new FileReader(); 
    reader.onload=()=>{ 
        try{ 
            const data=JSON.parse(reader.result); 
            if(Array.isArray(data)){ 
                ITEMS=data; 
                CURRENT_FILE = file;
                updateFileInfo();
                renderAdminList(); 
                alert('تم الاستيراد بنجاح'); 
                animateOnce(itemsList,'fadeInUp'); 
            } 
        }catch(err){ 
            alert('ملف JSON غير صالح'); 
        } 
    }; 
    reader.readAsText(file); 
});

resetDefaultsBtn.addEventListener('click', ()=>{ 
    if(!confirm('الرجوع للوضع الافتراضي؟')) return; 
    useAdminDefaults();
    animateOnce(resetDefaultsBtn,'pulse'); 
});

// === إعدادات الصوت (داخل لوحة التحكم) ===
let clickSoundEnabled = true;
(function(){ 
    const onBtn=document.getElementById('soundOn'); 
    const offBtn=document.getElementById('soundOff'); 
    if(onBtn && offBtn){ 
        const syncUI = ()=>{ 
            onBtn.setAttribute('aria-pressed', clickSoundEnabled? 'true':'false'); 
            offBtn.setAttribute('aria-pressed', clickSoundEnabled? 'false':'true'); 
            onBtn.classList.toggle('is-on', clickSoundEnabled); 
            offBtn.classList.toggle('is-on', !clickSoundEnabled); 
        }; 
        onBtn.addEventListener('click', ()=>{ 
            clickSoundEnabled = true; 
            animateOnce(onBtn,'pulse'); 
            syncUI(); 
        }); 
        offBtn.addEventListener('click', ()=>{ 
            clickSoundEnabled = false; 
            animateOnce(offBtn,'pulse'); 
            syncUI(); 
        }); 
        syncUI(); 
    } 
})();

// Init
updateFileInfo();
renderAdminList();
