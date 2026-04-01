const STORAGE_KEY = 'adhd_publishing_tasks';

// Helper to get formatted date strings safely (YYYY-MM-DD)
const getDaysLater = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};
const getToday = () => getDaysLater(0);

// Default tasks for Book Publishing
const defaultTasks = [
    { id: '1', title: '本のテーマ・ターゲット設定', time: 60, deadline: getToday(), completed: false },
    { id: '2', title: '企画書の作成（目次・構成）', time: 120, deadline: getToday(), completed: false },
    { id: '3', title: '第1章の執筆', time: 180, deadline: getDaysLater(1), completed: false },
    { id: '4', title: '第2章の執筆', time: 180, deadline: getDaysLater(2), completed: false },
    { id: '5', title: '第3章の執筆', time: 180, deadline: getDaysLater(3), completed: false },
    { id: '6', title: '「はじめに」「おわりに」の執筆', time: 60, deadline: getDaysLater(4), completed: false },
    { id: '7', title: '全体の推敲・自己校正', time: 120, deadline: getDaysLater(5), completed: false },
    { id: '8', title: '表紙デザインの作成・依頼', time: 60, deadline: getDaysLater(6), completed: false },
    { id: '9', title: 'KDP用フォーマット（EPUB等）作成', time: 60, deadline: getDaysLater(7), completed: false },
    { id: '10', title: 'KDPへの登録・出版申請', time: 30, deadline: getDaysLater(8), completed: false },
];

let tasks = [];
let currentTab = 'today'; // 'today', 'planner', 'settings'
let focusMode = false;
let activeTaskId = null;

// Initialization
function init() {
    loadTasks();
    if(tasks.length > 0 && !activeTaskId) {
        // Set first incomplete task as active
        const firstIncomplete = tasks.find(t => !t.completed);
        if(firstIncomplete) activeTaskId = firstIncomplete.id;
        else activeTaskId = tasks[0].id;
    }
    bindEvents();
    render();
    
    // Register PWA service worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
          .then(reg => console.log('SW registered!', reg))
          .catch(err => console.error('SW failed', err));
    }
}

// Data management
function loadTasks() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        try {
            tasks = JSON.parse(stored);
        } catch(e) {
            tasks = JSON.parse(JSON.stringify(defaultTasks));
        }
    } else {
        tasks = JSON.parse(JSON.stringify(defaultTasks));
    }
}

function saveTasks() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    render();
}

function resetData() {
    if(confirm('本当に初期化しますか？')) {
        tasks = JSON.parse(JSON.stringify(defaultTasks));
        saveTasks();
        alert('データをリセットしました');
    }
}

function exportCSV() {
    // UTF-8 with BOM for Excel compatibility
    let csvContent = "\uFEFF"; 
    csvContent += "ID,タスク名,所要時間(分),締切日,状態\n";
    tasks.forEach(t => {
        // Escape quotes
        let title = t.title.replace(/"/g, '""');
        if(title.includes(',')) title = `"${title}"`;
        csvContent += `${t.id},${title},${t.time},${t.deadline},${t.completed ? '完了' : '未完了'}\n`;
    });
    downloadFile(csvContent, 'publishing_tasks.csv', 'text/csv;charset=utf-8;');
}

function exportJSON() {
    const dataStr = JSON.stringify(tasks, null, 2);
    downloadFile(dataStr, 'publishing_tasks_backup.json', 'application/json');
}

function downloadFile(content, fileName, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function importJSON(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const importedTasks = JSON.parse(e.target.result);
            if(Array.isArray(importedTasks)) {
                tasks = importedTasks;
                saveTasks();
                alert('データを復元しました');
            } else {
                alert('無効なデータ形式です');
            }
        } catch(err) {
            alert('ファイルの読み込みに失敗しました');
        }
    };
    reader.readAsText(file);
    // Reset input
    event.target.value = '';
}

// Events
function bindEvents() {
    document.getElementById('tab-today').addEventListener('click', () => switchTab('today'));
    document.getElementById('tab-planner').addEventListener('click', () => switchTab('planner'));
    document.getElementById('tab-settings').addEventListener('click', () => switchTab('settings'));
    
    document.getElementById('btn-focus-mode').addEventListener('click', () => {
        focusMode = !focusMode;
        render();
    });
    
    document.getElementById('btn-complete-hero').addEventListener('click', () => {
        if(!activeTaskId) return;
        const t = tasks.find(x => x.id === activeTaskId);
        if(t) {
            t.completed = !t.completed;
            saveTasks();
        }
    });

    document.getElementById('btn-export-csv').addEventListener('click', exportCSV);
    document.getElementById('btn-export-json').addEventListener('click', exportJSON);
    document.getElementById('btn-import-trigger').addEventListener('click', () => document.getElementById('file-import').click());
    document.getElementById('file-import').addEventListener('change', importJSON);
    document.getElementById('btn-reset-data').addEventListener('click', resetData);

    // Energy buttons effect
    document.querySelectorAll('.energy-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.energy-btn').forEach(b => {
                b.classList.remove('border', 'border-primary/20', 'bg-surface-container-lowest', 'shadow-sm');
                b.classList.add('hover:bg-surface-container-lowest');
            });
            const target = e.currentTarget;
            target.classList.add('border', 'border-primary/20', 'bg-surface-container-lowest', 'shadow-sm');
            target.classList.remove('hover:bg-surface-container-lowest');
        });
    });

    // PWA Install Prompt
    let deferredPrompt;
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        document.getElementById('pwa-install-container').classList.remove('hidden');
    });

    document.getElementById('btn-install-pwa').addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                document.getElementById('pwa-install-container').classList.add('hidden');
            }
            deferredPrompt = null;
        }
    });

    // Handle dynamically added task clicks using event delegation
    document.getElementById('task-list-container').addEventListener('click', (e) => {
        const item = e.target.closest('.task-item');
        if(!item) return;
        
        const taskId = item.dataset.id;
        
        // if user clicked the checkbox container, toggle complete
        if(e.target.closest('.task-checkbox')) {
            const t = tasks.find(x => x.id === taskId);
            if(t) {
                t.completed = !t.completed;
                saveTasks();
            }
            return;
        }

        // otherwise, set as active
        activeTaskId = taskId;
        render();
        // Scroll to top to see hero
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

function switchTab(tab) {
    currentTab = tab;
    // hide focus mode when switching to planner
    if(tab !== 'today') focusMode = false;
    
    // Update nav ui
    document.querySelectorAll('.tab-btn').forEach(el => {
        el.classList.remove('nav-active');
        el.classList.add('nav-inactive');
    });
    document.getElementById(`tab-${tab}`).classList.remove('nav-inactive');
    document.getElementById(`tab-${tab}`).classList.add('nav-active');
    
    // Show/hide views
    const mainView = document.getElementById('main-view');
    const settingsView = document.getElementById('settings-view');
    const btnFocus = document.getElementById('btn-focus-mode');
    
    if (tab === 'settings') {
        mainView.classList.add('hidden');
        settingsView.classList.remove('hidden');
        btnFocus.classList.add('hidden');
        document.getElementById('header-title').textContent = '設定・データ管理';
    } else {
        mainView.classList.remove('hidden');
        settingsView.classList.add('hidden');
        btnFocus.classList.remove('hidden');
        document.getElementById('header-title').textContent = tab === 'today' ? '今日やること' : '全体計画';
        render();
    }
}

function render() {
    if(currentTab === 'settings') return;

    // Focus mode button styling
    const btnFocus = document.getElementById('btn-focus-mode');
    if(focusMode) {
        btnFocus.classList.replace('bg-[#eef5f5]', 'bg-[#1a5d54]');
        btnFocus.classList.replace('text-[#296960]', 'text-[#ffffff]');
        btnFocus.classList.replace('dark:bg-[#2a3435]', 'dark:bg-[#afefe3]');
        btnFocus.classList.replace('dark:text-[#afefe3]', 'dark:text-[#1a5d54]');
    } else {
        btnFocus.classList.replace('bg-[#1a5d54]', 'bg-[#eef5f5]');
        btnFocus.classList.replace('text-[#ffffff]', 'text-[#296960]');
        btnFocus.classList.replace('dark:bg-[#afefe3]', 'dark:bg-[#2a3435]');
        btnFocus.classList.replace('dark:text-[#1a5d54]', 'dark:text-[#afefe3]');
    }

    renderProgress();
    renderHero();
    renderList();
}

function renderProgress() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    let pct = 0;
    if(total > 0) pct = Math.round((completed / total) * 100);
    
    document.getElementById('total-progress-text').textContent = `${pct}%`;
    document.getElementById('total-progress-bar').style.width = `${pct}%`;
}

function renderHero() {
    const t = tasks.find(x => x.id === activeTaskId);
    const heroTitle = document.getElementById('hero-title');
    const heroTime = document.getElementById('hero-time');
    const heroDesc = document.getElementById('hero-desc');
    const heroStatus = document.getElementById('hero-status');
    const btnComplete = document.getElementById('btn-complete-hero');
    const progressRing = document.getElementById('hero-progress-ring');
    
    if(!t) {
        heroTitle.textContent = "タスクがありません";
        heroTime.textContent = "--:--";
        heroDesc.textContent = "すべて完了しました！お疲れ様です。";
        btnComplete.classList.add('hidden');
        heroStatus.textContent = "準備完了";
        progressRing.style.strokeDashoffset = "552.92"; // Empty
        return;
    }

    heroTitle.textContent = t.title;
    const hours = Math.floor(t.time / 60);
    const mins = t.time % 60;
    heroTime.textContent = hours > 0 ? `${hours}h${mins > 0 ? mins+'m' : ''}` : `${mins}m`;
    
    if(t.completed) {
        heroStatus.textContent = "完了済✨";
        heroStatus.classList.replace('text-tertiary', 'text-primary');
        heroDesc.textContent = "このタスクは完了しました";
        btnComplete.textContent = "未完了に戻す";
        btnComplete.classList.remove('tonal-gradient', 'text-on-primary');
        btnComplete.classList.add('bg-surface-variant', 'text-on-surface');
        progressRing.style.strokeDashoffset = "0"; // Full
    } else {
        heroStatus.textContent = "次のタスク";
        heroStatus.classList.replace('text-primary', 'text-tertiary');
        
        // Calculate days left
        const todayStr = getToday();
        if(t.deadline < todayStr) {
            heroDesc.textContent = `締切: ${t.deadline} (期限切れ💥)`;
            heroDesc.classList.add('text-error', 'font-bold');
        } else if(t.deadline === todayStr) {
            heroDesc.textContent = "締切: 今日";
            heroDesc.classList.remove('text-error', 'font-bold');
        } else {
            heroDesc.textContent = `締切: ${t.deadline}`;
            heroDesc.classList.remove('text-error', 'font-bold');
        }
        
        btnComplete.textContent = "このタスクを完了にする";
        btnComplete.classList.add('tonal-gradient', 'text-on-primary');
        btnComplete.classList.remove('bg-surface-variant', 'text-on-surface');
        progressRing.style.strokeDashoffset = (552.92 * 0.9).toString(); // slight progress indication
    }
    btnComplete.classList.remove('hidden');
}

function renderList() {
    const listContainer = document.getElementById('task-list-container');
    const countText = document.getElementById('task-count-text');
    let filtered = tasks;

    const todayStr = getToday();

    if (currentTab === 'today') {
        // Show tasks that are due today or overdue
        filtered = tasks.filter(t => t.deadline <= todayStr);
    }
    
    // Sort: incomplete first, then by deadline
    filtered.sort((a,b) => {
        if(a.completed !== b.completed) return a.completed ? 1 : -1;
        if(a.deadline !== b.deadline) return a.deadline.localeCompare(b.deadline);
        return 0;
    });

    if (focusMode && currentTab === 'today') {
        // Only show up to 3 incomplete tasks
        filtered = filtered.filter(t => !t.completed).slice(0, 3);
        document.getElementById('task-list-title').textContent = '集中するタスク (最大3個)';
    } else {
        document.getElementById('task-list-title').textContent = currentTab === 'today' ? "今日のタスク" : "全てのタスク";
    }

    countText.textContent = `残り ${filtered.filter(t=>!t.completed).length} 個`;

    let html = '';
    filtered.forEach(t => {
        const isActive = t.id === activeTaskId;
        const isOverdue = !t.completed && t.deadline < todayStr;
        
        // dynamic styles
        let boxClass = 'bg-surface-container-low border-transparent hover:bg-surface-container-highest';
        if(isActive) boxClass = 'bg-surface-container-lowest border-[#296960] shadow-sm transform scale-[1.01] transition-transform';
        if(t.completed) boxClass = 'bg-surface-variant bg-opacity-40 opacity-70 grayscale-[0.3] hover:bg-surface-variant/60';

        let checkContainerClass = 'border-outline-variant text-transparent bg-transparent';
        if(t.completed) checkContainerClass = 'border-primary bg-primary text-on-primary';
        
        html += `
        <div class="task-item flex items-center gap-4 p-4 sm:p-5 rounded-xl border-l-[6px] transition-all cursor-pointer ${boxClass}" data-id="${t.id}">
            <div class="task-checkbox w-7 h-7 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors active:scale-90 hover:opacity-80 ${checkContainerClass}">
                <span class="material-symbols-outlined text-[18px]">check</span>
            </div>
            <div class="flex-1 min-w-0">
                <p class="font-semibold text-on-surface text-base sm:text-lg leading-tight truncate ${t.completed ? 'line-through' : ''}">${t.title}</p>
                <div class="flex items-center gap-3 mt-1.5">
                    <span class="text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded bg-surface-container text-on-surface-variant whitespace-nowrap"><span class="material-symbols-outlined text-[12px] align-middle mr-1">schedule</span>${t.time}分</span>
                    <p class="text-[11px] sm:text-xs text-on-surface-variant truncate ${isOverdue ? 'text-error font-bold flex items-center gap-1' : ''}">
                        ${isOverdue ? '<span class="material-symbols-outlined text-[14px]">warning</span>' : ''}
                        ${t.deadline === todayStr ? '今日まで' : t.deadline}
                    </p>
                </div>
            </div>
        </div>
        `;
    });
    
    if(filtered.length === 0) {
        html = `
        <div class="text-center py-12 text-on-surface-variant bg-surface-container-low rounded-xl">
            <span class="material-symbols-outlined text-5xl mb-3 opacity-40">task_alt</span>
            <p class="text-base font-semibold">表示するタスクがありません！<br>大変よく頑張りました😊</p>
        </div>`;
    }

    listContainer.innerHTML = html;
}

// Start
document.addEventListener('DOMContentLoaded', init);
