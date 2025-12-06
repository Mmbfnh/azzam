// === Animate.css helper ===
function animateOnce(el, className, dur=800){ if(!el) return; el.classList.add('animated', className); setTimeout(()=>{ el.classList.remove('animated', className); }, dur); }

// === نظام المصادقة والصلاحيات ===
const USER_ROLES = {
  ADMIN: 'admin',
  EDITOR: 'editor',
  GUEST: 'guest'
};

let currentUser = {
  username: '',
  role: USER_ROLES.GUEST,
  permissions: []
};

// التحقق من الصلاحيات
function checkAuth() {
  const isLoggedIn = localStorage.getItem('isLoggedIn');
  const userRole = localStorage.getItem('userRole');
  const username = localStorage.getItem('currentUser');
  
  if (isLoggedIn !== 'true') {
    // غير مسجل دخول، التوجيه إلى صفحة الدخول
    window.location.href = 'login.html';
    return false;
  }
  
  currentUser = {
    username: username || 'زائر',
    role: userRole || USER_ROLES.GUEST,
    permissions: getPermissionsForRole(userRole)
  };
  
  return true;
}

// الحصول على الصلاحيات حسب الدور
function getPermissionsForRole(role) {
  const permissions = {
    [USER_ROLES.ADMIN]: [
      'view', 'add', 'edit', 'delete', 'export', 'import',
      'manage_users', 'change_settings', 'view_stats', 'backup'
    ],
    [USER_ROLES.EDITOR]: ['view', 'add', 'edit'],
    [USER_ROLES.GUEST]: ['view']
  };
  
  return permissions[role] || permissions[USER_ROLES.GUEST];
}

// التحقق من وجود صلاحية معينة
function hasPermission(permission) {
  return currentUser.permissions.includes(permission);
}

// تحديث واجهة المستخدم بناءً على الصلاحيات
function updateUIForPermissions() {
  const userBadge = document.getElementById('userBadge');
  if (userBadge) {
    userBadge.textContent = currentUser.username;
    userBadge.className = `user-badge ${currentUser.role}`;
  }
  
  // إخفاء/إظهار العناصر بناءً على الصلاحيات
  const adminOnlySections = ['usersSection', 'statsSection'];
  adminOnlySections.forEach(sectionId => {
    const section = document.getElementById(sectionId);
    if (section) {
      section.classList.toggle('hidden', !hasPermission('manage_users'));
    }
  });
  
  // تعطيل الأزرار غير المسموحة
  const adminButtons = ['addUserBtn', 'changePasswordBtn', 'backupData'];
  adminButtons.forEach(btnId => {
    const btn = document.getElementById(btnId);
    if (btn) {
      btn.disabled = !hasPermission('manage_users');
    }
  });
  
  const editorButtons = ['exportJson', 'importJson', 'resetDefaults'];
  editorButtons.forEach(btnId => {
    const btn = document.getElementById(btnId);
    if (btn) {
      btn.disabled = !hasPermission('export') && !hasPermission('import');
    }
  });
}

// تسجيل الخروج
function logout() {
  localStorage.removeItem('isLoggedIn');
  localStorage.removeItem('userRole');
  localStorage.removeItem('currentUser');
  window.location.href = 'login.html';
}

// === إدارة المستخدمين ===
let USERS = [];

function loadUsers() {
  try {
    const saved = localStorage.getItem('appUsers');
    if (saved) {
      USERS = JSON.parse(saved);
    } else {
      // إنشاء المستخدم الافتراضي
      USERS = [{
        username: 'admin',
        password: '1234',
        role: USER_ROLES.ADMIN,
        createdAt: new Date().toISOString(),
        lastLogin: null
      }];
      saveUsers();
    }
  } catch (e) {
    console.error('خطأ في تحميل المستخدمين:', e);
    USERS = [];
  }
}

function saveUsers() {
  try {
    localStorage.setItem('appUsers', JSON.stringify(USERS));
  } catch (e) {
    console.error('خطأ في حفظ المستخدمين:', e);
  }
}

function renderUsersList() {
  const usersList = document.getElementById('usersList');
  if (!usersList) return;
  
  usersList.innerHTML = '';
  
  USERS.forEach((user, index) => {
    const div = document.createElement('div');
    div.className = 'item-card';
    div.style.cursor = 'pointer';
    div.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
        <div>
          <div style="font-weight: 700;">${user.username}</div>
          <div style="display: flex; gap: 8px; margin-top: 5px;">
            <span class="user-badge ${user.role}" style="font-size: 12px;">${getRoleName(user.role)}</span>
            ${user.lastLogin ? `<span style="color: #6B7280; font-size: 12px;">آخر دخول: ${new Date(user.lastLogin).toLocaleDateString('ar-EG')}</span>` : ''}
          </div>
        </div>
        <div class="item-actions">
          ${currentUser.role === USER_ROLES.ADMIN && user.username !== currentUser.username ? `
            <button class="btn btn-outline" data-user-index="${index}" data-action="edit">تعديل</button>
            <button class="btn btn-danger" data-user-index="${index}" data-action="delete">حذف</button>
          ` : ''}
        </div>
      </div>
    `;
    
    usersList.appendChild(div);
  });
}

function getRoleName(role) {
  const names = {
    [USER_ROLES.ADMIN]: 'مسؤول',
    [USER_ROLES.EDITOR]: 'محرر',
    [USER_ROLES.GUEST]: 'زائر'
  };
  return names[role] || role;
}

// === إدارة العناصر (البطاقات) ===
let ITEMS = [];
let CURRENT_FILE = null;
let currentPage = 1;
const itemsPerPage = 8;

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

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
  if (item.img && item.img.startsWith('data:image')) {
    return item.img;
  }
  return item.img || `assets/${item.id}.png`; 
}

// عناصر واجهة الإدارة
function getElement(id) {
  return document.getElementById(id);
}

// تحديث معلومات الملف
function updateFileInfo() {
  const fileInfo = getElement('fileInfo');
  if (!fileInfo) return;
  
  if (CURRENT_FILE) {
    fileInfo.textContent = `📁 الملف الحالي: ${CURRENT_FILE.name} | 📊 عدد العناصر: ${ITEMS.length}`;
  } else {
    fileInfo.textContent = `💾 البيانات الحالية: ${ITEMS.length} عنصر (غير محفوظة في ملف بعد)`;
  }
}

// عرض قائمة العناصر مع التصفية والترتيب
function renderAdminList(){ 
  const itemsList = getElement('itemsList');
  if (!itemsList) return;
  
  // التصفية والترتيب
  let filteredItems = [...ITEMS];
  
  // البحث
  const searchTerm = getElement('searchItems')?.value.toLowerCase() || '';
  if (searchTerm) {
    filteredItems = filteredItems.filter(item => 
      item.id.toLowerCase().includes(searchTerm) ||
      item.en.toLowerCase().includes(searchTerm) ||
      item.ar.includes(searchTerm)
    );
  }
  
  // التصفية حسب الفئة
  const categoryFilter = getElement('filterCategory')?.value;
  if (categoryFilter) {
    filteredItems = filteredItems.filter(item => item.category === categoryFilter);
  }
  
  // الترتيب
  const sortBy = getElement('sortItems')?.value;
  switch(sortBy) {
    case 'name_asc':
      filteredItems.sort((a, b) => a.en.localeCompare(b.en));
      break;
    case 'name_desc':
      filteredItems.sort((a, b) => b.en.localeCompare(a.en));
      break;
    case 'date_new':
      filteredItems.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      break;
    case 'date_old':
      filteredItems.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
      break;
  }
  
  // التقسيم للصفحات
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const pageItems = filteredItems.slice(startIndex, endIndex);
  
  // عرض العناصر
  itemsList.innerHTML = '';
  
  if (!pageItems.length) {
    itemsList.innerHTML = '<li style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #666; list-style: none;">لا توجد عناصر تطابق معايير البحث</li>';
    getElement('pagination').style.display = 'none';
    updateStats(0, 0, 0, 0);
    return;
  }
  
  pageItems.forEach((item, idx) => { 
    const li = document.createElement('li'); 
    li.className = 'item-card'; 
    li.innerHTML = `
      <img src="${getImgSrc(item)}" alt="${item.en}" style="width: 80px; height: 80px; object-fit: contain; border-radius: 10px; background: #F9FAFB;">
      <div class="item-meta" style="flex: 1;">
        <div style="display: flex; justify-content: space-between; align-items: start;">
          <div>
            <div><strong>${item.en} / ${item.ar}</strong></div>
            <div style="opacity:.7; font-size: 12px;">ID: ${item.id}</div>
          </div>
          <div class="item-tags">
            ${item.category ? `<span class="item-tag category">${item.category}</span>` : ''}
            ${item.difficulty ? `<span class="item-tag difficulty-${item.difficulty}">${['سهل', 'متوسط', 'صعب'][item.difficulty - 1]}</span>` : ''}
          </div>
        </div>
        <div style="font-size: 12px; color: #9CA3AF; margin-top: 5px;">
          ${item.createdAt ? `أضيف في: ${new Date(item.createdAt).toLocaleDateString('ar-EG')}` : ''}
        </div>
      </div>
      <div class="item-actions">
        ${hasPermission('edit') ? `<button class="btn btn-outline" data-act="edit" data-idx="${startIndex + idx}">تعديل</button>` : ''}
        ${hasPermission('delete') ? `<button class="btn btn-danger" data-act="del" data-idx="${startIndex + idx}">حذف</button>` : ''}
      </div>
    `; 
    
    if (hasPermission('edit')) {
      li.querySelector('[data-act="edit"]').addEventListener('click', ()=> fillFormForEdit(startIndex + idx)); 
    }
    
    if (hasPermission('delete')) {
      li.querySelector('[data-act="del"]').addEventListener('click', ()=> deleteItem(startIndex + idx)); 
    }
    
    itemsList.appendChild(li); 
  });
  
  // تحديث الإحصائيات
  updateStats(
    filteredItems.length,
    filteredItems.filter(item => item.ar).length,
    filteredItems.filter(item => item.en).length,
    filteredItems.filter(item => item.img).length
  );
  
  // تحديث الترقيم
  updatePagination(totalPages);
}

// تحديث الإحصائيات
function updateStats(total, ar, en, withImages) {
  const elements = ['totalItems', 'arItems', 'enItems', 'withImages'];
  const values = [total, ar, en, withImages];
  
  elements.forEach((id, index) => {
    const el = getElement(id);
    if (el) el.textContent = values[index];
  });
}

// تحديث الترقيم
function updatePagination(totalPages) {
  const pagination = getElement('pagination');
  const pageNumbers = getElement('pageNumbers');
  
  if (totalPages <= 1) {
    pagination.style.display = 'none';
    return;
  }
  
  pagination.style.display = 'flex';
  pageNumbers.innerHTML = '';
  
  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement('button');
    btn.className = `btn ${i === currentPage ? 'btn-primary' : 'btn-subtle'}`;
    btn.textContent = i;
    btn.style.padding = '5px 10px';
    btn.addEventListener('click', () => {
      currentPage = i;
      renderAdminList();
    });
    pageNumbers.appendChild(btn);
  }
  
  // تحديث أحداث أزرار السابق/التالي
  document.querySelectorAll('.page-btn').forEach(btn => {
    btn.onclick = function() {
      if (this.dataset.page === 'prev' && currentPage > 1) {
        currentPage--;
      } else if (this.dataset.page === 'next' && currentPage < totalPages) {
        currentPage++;
      }
      renderAdminList();
    };
  });
}

// ملء النموذج للتعديل
function fillFormForEdit(i){ 
  const item = ITEMS[i]; 
  getElement('f_id').value = item.id; 
  getElement('f_en').value = item.en; 
  getElement('f_ar').value = item.ar; 
  getElement('f_img').value = item.img || ''; 
  getElement('f_category').value = item.category || 'عام';
  
  // تحديد مستوى الصعوبة
  document.querySelectorAll('input[name="difficulty"]').forEach(radio => {
    radio.checked = radio.value === String(item.difficulty || 1);
  });
  
  getElement('adminPreview').src = getImgSrc(item); 
  getElement('formMsg').textContent = `✏️ تحرير: ${item.id}`; 
  animateOnce(getElement('adminForm'), 'fadeInUp'); 
}

// حذف عنصر
function deleteItem(i){ 
  if(!confirm('هل أنت متأكد من حذف هذا العنصر؟')) return; 
  ITEMS.splice(i, 1); 
  updateFileInfo(); 
  renderAdminList();
  showToast('✅ تم حذف العنصر بنجاح');
}

// حفظ البيانات إلى ملف
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
  a.download = `cards_data_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  animateOnce(getElement('adminSaveFile'), 'pulse');
  showToast('💾 تم حفظ البيانات إلى ملف');
}

// استخدام البيانات الافتراضية
function useAdminDefaults() {
  ITEMS = window.DEFAULT_ITEMS ? [...window.DEFAULT_ITEMS] : [];
  CURRENT_FILE = null;
  updateFileInfo();
  renderAdminList();
  showToast('🔄 تم تحميل البيانات الافتراضية');
}

// عرض رسالة مؤقتة
function showToast(message, duration = 3000) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: #111827;
    color: white;
    padding: 12px 20px;
    border-radius: 10px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.2);
    z-index: 1000;
    animation: fadeInUp 0.3s ease;
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'fadeOutUp 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// النسخ الاحتياطي
function createBackup() {
  const backupData = {
    version: '2.0',
    timestamp: new Date().toISOString(),
    items: ITEMS,
    settings: {
      soundEnabled: localStorage.getItem('clickSound') === 'on',
      animationsEnabled: localStorage.getItem('animations') !== 'off'
    },
    users: USERS,
    stats: JSON.parse(localStorage.getItem('appStats') || '{}')
  };
  
  const dataStr = JSON.stringify(backupData, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `backup_${new Date().toISOString().split('T')[0]}.backup`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  showToast('💾 تم إنشاء النسخة الاحتياطية');
}

// استعادة النسخة الاحتياطية
async function restoreBackup(file) {
  try {
    const content = await readFileAsText(file);
    const backupData = JSON.parse(content);
    
    if (backupData.items && Array.isArray(backupData.items)) {
      ITEMS = backupData.items;
      CURRENT_FILE = file;
      
      if (backupData.settings) {
        localStorage.setItem('clickSound', backupData.settings.soundEnabled ? 'on' : 'off');
        localStorage.setItem('animations', backupData.settings.animationsEnabled ? 'on' : 'off');
      }
      
      if (backupData.users && currentUser.role === USER_ROLES.ADMIN) {
        USERS = backupData.users;
        saveUsers();
      }
      
      updateFileInfo();
      renderAdminList();
      showToast('✅ تم استعادة النسخة الاحتياطية بنجاح');
    } else {
      throw new Error('تنسيق النسخة الاحتياطية غير صالح');
    }
  } catch (error) {
    console.error('خطأ في استعادة النسخة:', error);
    showToast('❌ خطأ في استعادة النسخة الاحتياطية');
  }
}

// تهيئة لوحة التحكم
function initAdminPanel() {
  // إخفاء شاشة التحميل وإظهار المحتوى
  getElement('loadingScreen').style.display = 'none';
  getElement('adminContent').style.display = 'block';
  
  // تحديث التاريخ الحالي
  const dateElement = getElement('currentDate');
  if (dateElement) {
    dateElement.textContent = new Date().toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
  
  // تحميل المستخدمين
  loadUsers();
  
  // تحديث واجهة المستخدم بناءً على الصلاحيات
  updateUIForPermissions();
  
  // أحداث أزرار التنقل
  getElement('logoutBtn')?.addEventListener('click', logout);
  
  // رفع الملف
  getElement('adminFileUpload')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const success = await loadItemsFromFile(file);
    if (success) {
      updateFileInfo();
      renderAdminList();
      showToast(`📁 تم تحميل ${ITEMS.length} عنصر بنجاح`);
    } else {
      showToast('❌ خطأ في تحميل الملف. تأكد من تنسيق JSON');
    }
  });
  
  // حفظ الملف
  getElement('adminSaveFile')?.addEventListener('click', saveAdminToFile);
  
  // استخدام الافتراضيات
  getElement('adminUseDefaults')?.addEventListener('click', useAdminDefaults);
  
  // النسخ الاحتياطي
  getElement('backupData')?.addEventListener('click', () => {
    getElement('backupModal').classList.remove('hidden');
  });
  
  getElement('backupNow')?.addEventListener('click', createBackup);
  getElement('restoreBackup')?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) await restoreBackup(file);
  });
  getElement('closeBackup')?.addEventListener('click', () => {
    getElement('backupModal').classList.add('hidden');
  });
  
  // البحث والتصفية
  getElement('searchItems')?.addEventListener('input', () => {
    currentPage = 1;
    renderAdminList();
  });
  
  getElement('filterCategory')?.addEventListener('change', () => {
    currentPage = 1;
    renderAdminList();
  });
  
  getElement('sortItems')?.addEventListener('change', () => {
    currentPage = 1;
    renderAdminList();
  });
  
  // التصدير
  getElement('exportJson')?.addEventListener('click', () => { 
    const blob = new Blob([JSON.stringify(ITEMS,null,2)], { type: 'application/json' }); 
    const a = document.createElement('a'); 
    a.href = URL.createObjectURL(blob); 
    a.download = 'cardsItems.json'; 
    a.click(); 
    URL.revokeObjectURL(a.href); 
    animateOnce(getElement('exportJson'), 'pulse');
    showToast('📤 تم تصدير البيانات بنجاح');
  });
  
  // الاستيراد
  getElement('importJson')?.addEventListener('change', (e) => { 
    const file = e.target.files[0]; 
    if(!file) return; 
    const reader = new FileReader(); 
    reader.onload = () => { 
      try{ 
        const data = JSON.parse(reader.result); 
        if(Array.isArray(data)){ 
          ITEMS = data; 
          CURRENT_FILE = file;
          updateFileInfo();
          renderAdminList(); 
          showToast('📥 تم الاستيراد بنجاح'); 
        } 
      } catch(err){ 
        showToast('❌ ملف JSON غير صالح'); 
      } 
    }; 
    reader.readAsText(file); 
  });
  
  // إعادة الضبط
  getElement('resetDefaults')?.addEventListener('click', () => { 
    if(!confirm('هل أنت متأكد من الرجوع للوضع الافتراضي؟ سيتم فقدان جميع التعديلات.')) return; 
    useAdminDefaults();
    animateOnce(getElement('resetDefaults'), 'pulse'); 
  });
  
  // تفريغ النموذج
  getElement('clearForm')?.addEventListener('click', () => { 
    getElement('f_id').value = ''; 
    getElement('f_en').value = ''; 
    getElement('f_ar').value = ''; 
    getElement('f_img').value = ''; 
    getElement('f_category').value = 'عام';
    document.querySelectorAll('input[name="difficulty"]').forEach(radio => {
      radio.checked = radio.value === '1';
    });
    getElement('f_file').value = '';
    getElement('adminPreview').src = ''; 
    getElement('formMsg').textContent = ''; 
  });
  
  // نسخ العنصر
  getElement('duplicateBtn')?.addEventListener('click', () => {
    const id = getElement('f_id').value;
    const en = getElement('f_en').value;
    const ar = getElement('f_ar').value;
    
    if (!id || !en || !ar) {
      showToast('❌ يرجى ملء البيانات الأساسية أولاً');
      return;
    }
    
    const newId = `${id}_copy`;
    getElement('f_id').value = newId;
    getElement('formMsg').textContent = `📋 تم نسخ العنصر إلى ${newId}`;
    showToast('📋 تم نسخ العنصر، يمكنك تعديله وحفظه');
  });
  
  // رفع صورة
  getElement('f_file')?.addEventListener('change', () => { 
    const file = getElement('f_file').files[0]; 
    if(!file) return;
    
    // التحقق من حجم الملف (2MB كحد أقصى)
    if (file.size > 2 * 1024 * 1024) {
      showToast('❌ حجم الصورة كبير جداً (الحد الأقصى 2MB)');
      getElement('f_file').value = '';
      return;
    }
    
    const reader = new FileReader(); 
    reader.onload = () => { 
      getElement('adminPreview').src = reader.result; 
      getElement('previewInfo').textContent = `📊 حجم الصورة: ${Math.round(file.size / 1024)}KB`;
    }; 
    reader.readAsDataURL(file); 
  });
  
  // معاينة رابط الصورة
  getElement('f_img')?.addEventListener('input', () => {
    const url = getElement('f_img').value.trim();
    if (url) {
      getElement('adminPreview').src = url;
      getElement('previewInfo').textContent = '🖼️ صورة من رابط خارجي';
    }
  });
  
  // حفظ النموذج
  getElement('adminForm')?.addEventListener('submit', (e) => { 
    e.preventDefault(); 
    
    if (!hasPermission('add') && !hasPermission('edit')) {
      showToast('❌ ليس لديك صلاحية لإضافة أو تعديل العناصر');
      return;
    }
    
    const id = getElement('f_id').value.trim(); 
    const en = getElement('f_en').value.trim(); 
    const ar = getElement('f_ar').value.trim(); 
    let imgSrc = getElement('f_img').value.trim(); 
    const category = getElement('f_category').value;
    const difficulty = document.querySelector('input[name="difficulty"]:checked')?.value || '1';
    
    if(!id || !en || !ar){ 
      getElement('formMsg').textContent = '❌ يرجى ملء كل الحقول المطلوبة'; 
      animateOnce(getElement('adminForm'), 'shake');
      return; 
    } 
    
    if(!imgSrc && getElement('adminPreview').src && getElement('adminPreview').src.startsWith('data:image')){ 
      imgSrc = getElement('adminPreview').src; 
    }
    
    const existsIdx = ITEMS.findIndex(x => x.id === id); 
    const obj = {
      id,
      en,
      ar,
      category,
      difficulty: parseInt(difficulty),
      createdAt: new Date().toISOString()
    }; 
    
    if(imgSrc) obj.img = imgSrc; 
    
    if(existsIdx >= 0){ 
      // تحديث العنصر مع الحفاظ على تاريخ الإنشاء
      obj.createdAt = ITEMS[existsIdx].createdAt || obj.createdAt;
      ITEMS[existsIdx] = obj; 
      getElement('formMsg').textContent = '✅ تم تحديث العنصر'; 
    } else { 
      ITEMS.push(obj); 
      getElement('formMsg').textContent = '✅ تمت إضافة العنصر'; 
    }
    
    updateFileInfo();
    renderAdminList(); 
    animateOnce(getElement('itemsList'), 'fadeInUp');
    showToast(existsIdx >= 0 ? '✏️ تم تحديث العنصر' : '➕ تمت إضافة العنصر');
    
    // تفريغ النموذج بعد الحفظ
    setTimeout(() => getElement('clearForm').click(), 1000);
  });
  
  // إعدادات الصوت
  let clickSoundEnabled = localStorage.getItem('clickSound') !== 'off';
  const onBtn = getElement('soundOn'); 
  const offBtn = getElement('soundOff'); 
  
  if(onBtn && offBtn){ 
    const syncUI = () => { 
      onBtn.setAttribute('aria-pressed', clickSoundEnabled ? 'true' : 'false'); 
      offBtn.setAttribute('aria-pressed', clickSoundEnabled ? 'false' : 'true'); 
      onBtn.classList.toggle('is-on', clickSoundEnabled); 
      offBtn.classList.toggle('is-on', !clickSoundEnabled); 
    }; 
    
    onBtn.addEventListener('click', () => { 
      clickSoundEnabled = true; 
      localStorage.setItem('clickSound', 'on');
      animateOnce(onBtn, 'pulse'); 
      syncUI(); 
      showToast('🔊 تم تفعيل الصوت');
    }); 
    
    offBtn.addEventListener('click', () => { 
      clickSoundEnabled = false; 
      localStorage.setItem('clickSound', 'off');
      animateOnce(offBtn, 'pulse'); 
      syncUI(); 
      showToast('🔇 تم إيقاف الصوت');
    }); 
    
    syncUI(); 
  }
  
  // إدارة المستخدمين
  getElement('changePasswordBtn')?.addEventListener('click', () => {
    getElement('changePasswordModal').classList.remove('hidden');
  });
  
  getElement('addUserBtn')?.addEventListener('click', () => {
    getElement('userModal').classList.remove('hidden');
  });
  
  getElement('cancelPassword')?.addEventListener('click', () => {
    getElement('changePasswordModal').classList.add('hidden');
  });
  
  getElement('cancelUser')?.addEventListener('click', () => {
    getElement('userModal').classList.add('hidden');
  });
  
  getElement('passwordForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const currentPassword = getElement('currentPassword').value;
    const newPassword = getElement('newPassword').value;
    const confirmPassword = getElement('confirmPassword').value;
    
    // التحقق من كلمة المرور الحالية
    const currentUserData = USERS.find(u => u.username === currentUser.username);
    if (!currentUserData || currentUserData.password !== currentPassword) {
      getElement('passwordError').textContent = '❌ كلمة المرور الحالية غير صحيحة';
      getElement('passwordError').style.display = 'block';
      return;
    }
    
    if (newPassword.length < 6) {
      getElement('passwordError').textContent = '❌ كلمة المرور الجديدة يجب أن تحتوي على 6 أحرف على الأقل';
      getElement('passwordError').style.display = 'block';
      return;
    }
    
    if (newPassword !== confirmPassword) {
      getElement('passwordError').textContent = '❌ كلمة المرور الجديدة غير متطابقة';
      getElement('passwordError').style.display = 'block';
      return;
    }
    
    // تحديث كلمة المرور
    currentUserData.password = newPassword;
    saveUsers();
    
    getElement('passwordError').style.display = 'none';
    getElement('changePasswordModal').classList.add('hidden');
    getElement('passwordForm').reset();
    showToast('✅ تم تغيير كلمة المرور بنجاح');
  });
  
  getElement('userForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const username = getElement('newUsername').value.trim();
    const password = getElement('newUserPassword').value;
    const role = getElement('userRole').value;
    
    if (USERS.some(u => u.username === username)) {
      getElement('userError').textContent = '❌ اسم المستخدم موجود مسبقاً';
      getElement('userError').style.display = 'block';
      return;
    }
    
    if (password.length < 6) {
      getElement('userError').textContent = '❌ كلمة المرور يجب أن تحتوي على 6 أحرف على الأقل';
      getElement('userError').style.display = 'block';
      return;
    }
    
    USERS.push({
      username,
      password,
      role,
      createdAt: new Date().toISOString(),
      lastLogin: null
    });
    
    saveUsers();
    renderUsersList();
    
    getElement('userError').style.display = 'none';
    getElement('userModal').classList.add('hidden');
    getElement('userForm').reset();
    showToast(`✅ تم إضافة المستخدم "${username}" بنجاح`);
  });
  
  // تحديث المعلومات وعرض القائمة
  updateFileInfo();
  renderAdminList();
  renderUsersList();
}

// التشغيل الرئيسي
document.addEventListener('DOMContentLoaded', function() {
  // التحقق من المصادقة أولاً
  if (!checkAuth()) {
    return;
  }
  
  // تهيئة لوحة التحكم
  setTimeout(() => {
    initAdminPanel();
  }, 500);
});
