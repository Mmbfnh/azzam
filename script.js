// === Animate.css helper ===
function animateOnce(el, className, dur=800){ if(!el) return; el.classList.add('animated', className); setTimeout(()=>{ el.classList.remove('animated', className); }, dur); }

// Base state & helpers
const DEFAULTS = window.DEFAULT_ITEMS || [];
let ITEMS = []; // سيتم تحميلها من الملف
let DATA_FILE = null; // الملف المرفوع

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
async function loadFromFile(file) {
    try {
        const content = await readFileAsText(file);
        const data = JSON.parse(content);
        if (Array.isArray(data)) {
            ITEMS = data;
            DATA_FILE = file;
            return true;
        } else {
            throw new Error('تنسيق الملف غير صالح');
        }
    } catch (error) {
        console.error('خطأ في قراءة الملف:', error);
        return false;
    }
}

// دالة لحفظ البيانات إلى ملف
function saveToFile() {
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
    
    animateOnce(document.body, 'pulse');
    alert('تم حفظ البيانات إلى ملف cards_data.json');
}

function getImgSrc(item){ 
    // إذا كانت الصورة base64، نستخدمها مباشرة
    if (item.img && item.img.startsWith('data:image')) {
        return item.img;
    }
    // إذا كان لدينا ملف مرفوع، نبحث عن الصورة في الملف
    return item.img || `assets/${item.id}.png`; 
}

// Cards UI
const grid = document.getElementById('cardsGrid');
const langSelect = document.getElementById('langSelect');
const toggleNamesBtn = document.getElementById('toggleNames');
const shuffleBtn = document.getElementById('shuffleBtn');
const resetBtn = document.getElementById('resetBtn');

// إضافة أزرار إدارة الملفات
const cardsToolbar = document.querySelector('.cards-toolbar');
const fileButtons = `
    <label class="btn btn-subtle" style="cursor:pointer">
        رفع ملف البيانات
        <input type="file" id="fileUpload" accept=".json" style="display:none">
    </label>
    <button id="saveFileBtn" class="btn btn-success">حفظ البيانات إلى ملف</button>
    <button id="useDefaultsBtn" class="btn btn-outline">استخدام البيانات الافتراضية</button>
`;

if (cardsToolbar) {
    cardsToolbar.insertAdjacentHTML('beforeend', fileButtons);
}

let showNames = true;
let currentOrder = [...ITEMS];

function render(){
    if (!ITEMS.length) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px;">
                <h3 style="color: #666; margin-bottom: 20px;">⚠️ لا توجد بيانات</h3>
                <p style="margin-bottom: 20px; color: #888;">يرجى رفع ملف البيانات أو استخدام البيانات الافتراضية</p>
                <button id="useDefaultsBtn2" class="btn btn-primary">استخدام البيانات الافتراضية</button>
            </div>
        `;
        document.getElementById('useDefaultsBtn2')?.addEventListener('click', useDefaultData);
        return;
    }
    
    grid.innerHTML='';
    currentOrder.forEach(item=>{
        const card = document.createElement('div');
        card.className='card';
        card.innerHTML=`<div class="card-inner"><div class="face front"><img class="figure" src="${getImgSrc(item)}" alt="${item[langSelect.value]}" /><div class="actions"><button class="icon-btn speak">🔊</button></div><div class="name ${showNames?"":"hidden"}">${item[langSelect.value]}</div></div><div class="face back"><div class="name">${item[langSelect.value]}</div><div class="actions"><button class="icon-btn speak">🔊</button></div></div></div>`;
        card.addEventListener('click', (e)=>{ if (e.target && e.target.classList.contains('speak')) return; card.classList.toggle('flipped'); });
        card.querySelectorAll('.speak').forEach(btn=> btn.addEventListener('click', ()=> speak(item[langSelect.value], langSelect.value)) );
        grid.appendChild(card);
    });
}

function useDefaultData() {
    ITEMS = [...DEFAULTS];
    currentOrder = [...ITEMS];
    render();
    alert('تم تحميل البيانات الافتراضية بنجاح');
}

function speak(text, lang){ if (!('speechSynthesis' in window)) return alert('متصفحك لا يدعم النطق الصوتي.'); const u=new SpeechSynthesisUtterance(text); u.lang=(lang==='ar')?'ar':'en'; u.rate=0.95; u.pitch=1.0; window.speechSynthesis.cancel(); window.speechSynthesis.speak(u); }
function shuffle(){ currentOrder=[...ITEMS].sort(()=>Math.random()-0.5); render(); }
function reset(){ currentOrder=[...ITEMS]; render(); }

// إدارة الملفات
document.getElementById('fileUpload')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const success = await loadFromFile(file);
    if (success) {
        currentOrder = [...ITEMS];
        render();
        alert(`تم تحميل ${ITEMS.length} عنصر بنجاح`);
    } else {
        alert('خطأ في تحميل الملف. تأكد من تنسيق JSON');
    }
});

document.getElementById('saveFileBtn')?.addEventListener('click', saveToFile);
document.getElementById('useDefaultsBtn')?.addEventListener('click', useDefaultData);

langSelect.addEventListener('change', ()=>{ render(); if (!matchMode.classList.contains('hidden')) renderMatch(); if (!lettersMode.classList.contains('hidden')) initLetters(); });
toggleNamesBtn.addEventListener('click', ()=>{ showNames=!showNames; render(); });
shuffleBtn.addEventListener('click', shuffle);
resetBtn.addEventListener('click', reset);

// ===== Navigation (3-button header) =====
const homeBtn = document.getElementById('homeBtn');
const testsBtn = document.getElementById('testsBtn');
const cardsMode=document.getElementById('cardsMode');
const testsHub = document.getElementById('testsHub');
const matchMode=document.getElementById('matchMode');
const lettersMode=document.getElementById('lettersMode');

function showSection(section){
    cardsMode.classList.add('hidden');
    testsHub.classList.add('hidden');
    matchMode.classList.add('hidden');
    lettersMode.classList.add('hidden');
    section.classList.remove('hidden');
}

homeBtn && homeBtn.addEventListener('click', ()=>{ showSection(cardsMode); render(); });
testsBtn && testsBtn.addEventListener('click', ()=>{ showSection(testsHub); });

// Tests hub buttons
const goMatch = document.getElementById('goMatch');
const goLetters = document.getElementById('goLetters');

goMatch && goMatch.addEventListener('click', ()=>{ showSection(matchMode); animateOnce(matchMode,'fadeInUp'); renderMatch(); });
goLetters && goLetters.addEventListener('click', ()=>{ showSection(lettersMode); animateOnce(lettersMode,'fadeInUp'); initLetters(); });

// Match Mode logic
const matchImages=document.getElementById('matchImages');
const matchWords=document.getElementById('matchWords');
const matchScore=document.getElementById('matchScore');
const matchShuffle=document.getElementById('matchShuffle');
const matchReset=document.getElementById('matchReset');
const matchCheck=document.getElementById('matchCheck');

let currentLevel=1; const levelConfig={1:{count:4,duration:60},2:{count:7,duration:45},3:{count:10,duration:30}};
const levelSelect=document.getElementById('levelSelect');
const levelLabel=document.getElementById('levelLabel');
const timerLabel=document.getElementById('matchTimer');
const btnStart=document.getElementById('timerStart');
const btnPause=document.getElementById('timerPause');
let timerId=null; let timeLeft=levelConfig[currentLevel].duration;
function getLevelItems(){ return [...ITEMS].sort(()=>Math.random()-0.5).slice(0, Math.min(levelConfig[currentLevel].count, ITEMS.length)); }
function formatTime(s){ const m=Math.floor(s/60), sec=s%60; return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`; }
function updateTimerDisplay(){ timerLabel.textContent=`⏱️ ${formatTime(timeLeft)}`; }
function startTimer(){ if (timerId) return; timerId=setInterval(()=>{ timeLeft=Math.max(0,timeLeft-1); updateTimerDisplay(); if(timeLeft===0){ pauseTimer(); showToast((langSelect.value==='ar')?'انتهى الوقت!':'Time is up!'); } },1000); }
function pauseTimer(){ if(timerId){ clearInterval(timerId); timerId=null; } }
function resetTimer(){ pauseTimer(); timeLeft=levelConfig[currentLevel].duration; updateTimerDisplay(); }
btnStart.addEventListener('click', startTimer); btnPause.addEventListener('click', pauseTimer);
levelSelect.addEventListener('change', ()=>{ currentLevel=parseInt(levelSelect.value,10); resetTimer(); if(!matchMode.classList.contains('hidden')) renderMatch(); });
langSelect.addEventListener('change', ()=>{ levelLabel.textContent=(langSelect.value==='ar')?'المستوى:':'Level:'; btnStart.textContent=(langSelect.value==='ar')?'بدء':'Start'; btnPause.textContent=(langSelect.value==='ar')?'إيقاف':'Pause'; });

let assignments={}; let matchTotal=0;
function renderMatch(){ 
    if (!ITEMS.length) {
        matchImages.innerHTML = '<div style="text-align:center; padding:40px; color:#666">لا توجد بيانات. يرجى رفع ملف البيانات أولاً</div>';
        return;
    }
    
    matchImages.innerHTML=''; matchWords.innerHTML=''; assignments={}; 
    const subset=getLevelItems(); 
    matchTotal=subset.length; 
    subset.forEach((item,idx)=>{ 
        const slot=document.createElement('div'); 
        slot.className='slot'; 
        slot.dataset.slotId='slot_'+idx; 
        slot.dataset.itemId=item.id; 
        const img=document.createElement('img'); 
        img.className='figure'; 
        img.src=getImgSrc(item); 
        img.alt=item[langSelect.value]; 
        const label=document.createElement('div'); 
        label.className='drop-label'; 
        label.textContent=(langSelect.value==='ar')?'اسحب الكلمة هنا':'Drag the word here'; 
        slot.addEventListener('dragover', e=>{ e.preventDefault(); slot.classList.add('dragover'); }); 
        slot.addEventListener('dragleave', ()=> slot.classList.remove('dragover')); 
        slot.addEventListener('drop', e=>{ e.preventDefault(); slot.classList.remove('dragover'); const droppedId=e.dataTransfer.getData('text/plain'); if(!droppedId) return; const existing=slot.querySelector('.chip'); if (existing) matchWords.appendChild(existing); const chip=document.getElementById('chip_'+droppedId); if (chip){ slot.appendChild(chip); chip.classList.remove('dragging'); assignments[slot.dataset.slotId]=droppedId; updateScore(matchTotal); } }); 
        slot.appendChild(img); 
        slot.appendChild(label); 
        matchImages.appendChild(slot); 
    }); 
    const words=[...subset].sort(()=>Math.random()-0.5); 
    words.forEach(item=>{ 
        const chip=document.createElement('div'); 
        chip.className='chip'; 
        chip.id='chip_'+item.id; 
        chip.textContent=item[langSelect.value]; 
        chip.draggable=true; 
        chip.addEventListener('dragstart', e=>{ 
            chip.classList.add('dragging'); 
            e.dataTransfer.setData('text/plain', item.id); 
        }); 
        chip.addEventListener('dragend', ()=> chip.classList.remove('dragging')); 
        matchWords.appendChild(chip); 
    }); 
    updateScore(matchTotal); 
}
function updateScore(total){ let correct=0; for(const slot of matchImages.querySelectorAll('.slot')){ if(slot.classList.contains('correct')) correct++; else { const slotId=slot.dataset.slotId; const expected=slot.dataset.itemId; const assigned=assignments[slotId]; if(assigned){ if(assigned===expected){ correct++; slot.classList.add('correct'); slot.classList.remove('incorrect'); } else { slot.classList.add('incorrect'); slot.classList.remove('correct'); } } else { slot.classList.remove('correct','incorrect'); } } } matchScore.textContent=(langSelect.value==='ar')?`النتيجة: ${correct}/${total}`:`Score: ${correct}/${total}`; }
matchShuffle.addEventListener('click', ()=>{ const chips=Array.from(matchWords.children); chips.sort(()=>Math.random()-0.5).forEach(c=> matchWords.appendChild(c)); });
matchReset.addEventListener('click', ()=>{ for(const slot of matchImages.querySelectorAll('.slot')){ const chip=slot.querySelector('.chip'); if(chip) matchWords.appendChild(chip); } assignments={}; updateScore(matchTotal); resetTimer(); });
matchCheck.addEventListener('click', ()=>{ updateScore(matchTotal); const total=matchTotal; let correct=0; for(const slot of matchImages.querySelectorAll('.slot')){ if(slot.classList.contains('correct')) correct++; } if(correct===total){ const dur=levelConfig[currentLevel].duration; const ratio=timeLeft/dur; let stars=1; if(ratio>=0.66) stars=3; else if(ratio>=0.33) stars=2; showReward(stars); } });

function showToast(message){ const t=document.createElement('div'); t.className='toast'; t.textContent=message; document.body.appendChild(t); setTimeout(()=> t.remove(), 1800); }
function showReward(stars){ const overlay=document.createElement('div'); overlay.className='reward animated fadeIn'; const card=document.createElement('div'); card.className='card animated bounceIn'; const title=document.createElement('h3'); title.textContent=(langSelect.value==='ar')?'أحسنت!':'Great job!'; const starBox=document.createElement('div'); starBox.className='stars'; starBox.textContent='★'.repeat(stars)+'☆'.repeat(3-stars); const btn=document.createElement('button'); btn.className='btn btn-primary'; btn.textContent=(langSelect.value==='ar')?'متابعة':'Continue'; btn.addEventListener('click', ()=>{ overlay.classList.add('animated','fadeOutUp'); setTimeout(()=> overlay.remove(), 400); }); card.appendChild(title); card.appendChild(starBox); card.appendChild(btn); overlay.appendChild(card); document.body.appendChild(overlay); }

// Letters Mode
const lettersFigure=document.getElementById('lettersFigure');
const lettersSlots=document.getElementById('lettersSlots');
const lettersBank=document.getElementById('lettersBank');
const lettersScore=document.getElementById('lettersScore');
const lettersSelect=document.getElementById('lettersSelect');
const lettersNewBtn=document.getElementById('lettersNew');
const lettersResetBtn=document.getElementById('lettersReset');
const lettersCheckBtn=document.getElementById('lettersCheck');

let currentLettersItem=null; let targetWord=''; let assembled=[];
function initLetters(){ 
    if (!ITEMS.length) {
        lettersSlots.innerHTML = '<div style="text-align:center; padding:40px; color:#666">لا توجد بيانات. يرجى رفع ملف البيانات أولاً</div>';
        return;
    }
    pickRandomLettersItem(); 
}
function pickRandomLettersItem(){ 
    if (!ITEMS.length) return;
    currentLettersItem=ITEMS[Math.floor(Math.random()*ITEMS.length)]; 
    buildLettersRound(); 
}
// Hide dropdown changes: no change handler needed; random only
lettersNewBtn.addEventListener('click', pickRandomLettersItem);
lettersResetBtn.addEventListener('click', ()=> buildLettersRound());
lettersCheckBtn.addEventListener('click', ()=>{ const guess=assembled.join(''); const target=targetWord; const correct=(guess===target); lettersSlots.classList.remove('correct-word','incorrect-word'); lettersSlots.classList.add(correct? 'correct-word':'incorrect-word'); const msg=(langSelect.value==='ar')? (correct?'إجابة صحيحة!':'إجابة غير صحيحة'):(correct?'Correct!':'Try again'); showToast(msg); });
function normalizeWord(raw){ return raw.replace(/\s+/g,'').replace(/[ـ؟،,.;:!؟،]/g,''); }
function buildLettersRound(){ const wordRaw=currentLettersItem[langSelect.value]; targetWord=normalizeWord(wordRaw); assembled=Array(targetWord.length).fill(''); lettersFigure.src=getImgSrc(currentLettersItem); lettersFigure.alt=wordRaw; lettersSlots.innerHTML=''; for(let i=0;i<targetWord.length;i++){ const slot=document.createElement('div'); slot.className='slot-letter'; slot.dataset.index=i; slot.addEventListener('dragover', e=>{ e.preventDefault(); }); slot.addEventListener('drop', e=>{ e.preventDefault(); const ch=e.dataTransfer.getData('text/plain'); placeLetter(i, ch); }); slot.addEventListener('click', ()=>{ if (assembled[i]){ const chip=createChip(assembled[i]); lettersBank.appendChild(chip); assembled[i]=''; slot.textContent=''; slot.classList.remove('filled'); updateLettersScore(); } }); lettersSlots.appendChild(slot); } lettersBank.innerHTML=''; const chars=Array.from(targetWord); const distractors=buildDistractors(chars); const bank=shuffleArray(chars.concat(distractors)); bank.forEach(ch=> lettersBank.appendChild(createChip(ch))); updateLettersScore(); }
function buildDistractors(chars){ const alphabet=(langSelect.value==='ar')?'ابتثجحخدذرزسشصضطظعغفقكلمنهوي':'abcdefghijklmnopqrstuvwxyz'; const need=Math.max(3, Math.ceil(chars.length/2)); const pool=Array.from(alphabet).filter(c=> !chars.includes(c)); return shuffleArray(pool).slice(0, need); }
function createChip(ch){ const chip=document.createElement('div'); chip.className='chip-letter'; chip.textContent=ch; chip.draggable=true; chip.addEventListener('dragstart', e=>{ chip.classList.add('dragging'); e.dataTransfer.setData('text/plain', ch); }); chip.addEventListener('dragend', ()=> chip.classList.remove('dragging')); chip.addEventListener('click', ()=>{ const idx=assembled.indexOf(''); if (idx!==-1){ placeLetter(idx, ch); chip.remove(); } }); return chip; }
function placeLetter(i, ch){ if (!assembled[i] || assembled[i]===ch){ assembled[i]=ch; const slot=lettersSlots.children[i]; slot.textContent=ch; slot.classList.add('filled'); updateLettersScore(); } else { const old=assembled[i]; assembled[i]=ch; const slot=lettersSlots.children[i]; slot.textContent=ch; slot.classList.add('filled'); lettersBank.appendChild(createChip(old)); updateLettersScore(); } }
function updateLettersScore(){ const total=targetWord.length; const filled=assembled.filter(c=> c && c.length>0).length; lettersScore.textContent=`${filled} / ${total}`; }
function shuffleArray(a){ return a.map(x=>({v:x,r:Math.random()})).sort((p,q)=>p.r-q.r).map(o=>o.v); }

// Init default
showSection(cardsMode); 
// لا نقوم بتحميل أي بيانات تلقائياً
render(); 
updateTimerDisplay();
