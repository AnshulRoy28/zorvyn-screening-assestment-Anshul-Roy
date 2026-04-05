const API_URL = window.location.origin;

// ─── Auth Helpers ───────────────────────────────────────────────
function getToken() {
    return localStorage.getItem('token');
}

function logout() {
    localStorage.removeItem('token');
    window.location.href = '/login.html';
}

async function fetchWithAuth(url, options = {}) {
    const token = getToken();
    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    const response = await fetch(url, {
        ...options,
        headers: {
            ...options.headers,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });

    if (response.status === 401) {
        logout();
        return;
    }

    return response;
}

// ─── Widget Registry ────────────────────────────────────────────
const WIDGETS = [
    {
        id: 'summary-stats',
        title: 'Summary Stats',
        icon: '📊',
        size: 'full',
        renderHTML: () => `
            <div class="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                <div class="p-5 rounded-2xl bg-white border border-gray-200/80 shadow-sm hover:border-orange-200 transition-colors">
                    <div class="text-xs text-gray-500 mb-1 flex items-center justify-between">Total Income
                        <span class="text-green-500">↗</span>
                    </div>
                    <div class="text-2xl font-medium text-gray-900 tracking-tight" id="total-income">$0.00</div>
                </div>
                <div class="p-5 rounded-2xl bg-white border border-gray-200/80 shadow-sm hover:border-orange-200 transition-colors">
                    <div class="text-xs text-gray-500 mb-1 flex items-center justify-between">Total Expenses
                        <span class="text-red-500">↘</span>
                    </div>
                    <div class="text-2xl font-medium text-gray-900 tracking-tight" id="total-expenses">$0.00</div>
                </div>
                <div class="p-5 rounded-2xl bg-white border border-gray-200/80 shadow-sm hover:border-orange-200 transition-colors col-span-2 md:col-span-1">
                    <div class="text-xs text-gray-500 mb-1 flex items-center justify-between">Net Balance
                        <span class="text-orange-500">⊖</span>
                    </div>
                    <div class="text-2xl font-medium tracking-tight" id="net-balance">$0.00</div>
                </div>
            </div>`,
        load: loadSummary
    },
    {
        id: 'category-chart',
        title: 'Spending by Category',
        icon: '🍩',
        size: 'half',
        renderHTML: () => `
            <div class="flex gap-1 mb-4" id="category-period-btns">
                <button data-period="7" class="px-3 py-1 text-[11px] rounded-lg bg-gray-100 text-gray-500 hover:bg-orange-50 hover:text-orange-600 transition-colors">Week</button>
                <button data-period="30" class="px-3 py-1 text-[11px] rounded-lg bg-orange-50 text-orange-600 font-medium">Month</button>
                <button data-period="365" class="px-3 py-1 text-[11px] rounded-lg bg-gray-100 text-gray-500 hover:bg-orange-50 hover:text-orange-600 transition-colors">Year</button>
                <button data-period="all" class="px-3 py-1 text-[11px] rounded-lg bg-gray-100 text-gray-500 hover:bg-orange-50 hover:text-orange-600 transition-colors">All</button>
            </div>
            <canvas id="category-chart-canvas"></canvas>`,
        load: () => loadCategoryChart(30)
    },
    {
        id: 'top-expenses',
        title: 'Top 5 Expenses',
        icon: '💸',
        size: 'half',
        renderHTML: () => `<div id="top-expenses-list"></div>`,
        load: loadTopExpenses
    },
    {
        id: 'monthly-chart',
        title: 'Income vs Expenses',
        icon: '📈',
        size: 'half',
        renderHTML: () => `<div style="position:relative; min-height:280px;"><canvas id="monthly-chart-canvas"></canvas></div>`,
        load: loadMonthlyChart
    },
    {
        id: 'recent-activity',
        title: 'Recent Activity',
        icon: '🕐',
        size: 'half',
        renderHTML: () => `<div id="recent-activity-list"></div>`,
        load: loadRecentActivity
    },
    {
        id: 'recurring-summary',
        title: 'Recurring Expenses',
        icon: '🔄',
        size: 'half',
        renderHTML: () => `<div id="recurring-widget-list"></div>`,
        load: loadRecurringSummary
    }
];

// ─── Preferences ────────────────────────────────────────────────
const PREFS_KEY = 'dashboard_widget_prefs';

function getDefaultPrefs() {
    return WIDGETS.map(w => ({ id: w.id, visible: true }));
}

function loadPrefs() {
    try {
        const saved = localStorage.getItem(PREFS_KEY);
        if (saved) {
            const prefs = JSON.parse(saved);
            const existing = prefs.map(p => p.id);
            for (const w of WIDGETS) {
                if (!existing.includes(w.id)) prefs.push({ id: w.id, visible: true });
            }
            return prefs.filter(p => WIDGETS.some(w => w.id === p.id));
        }
    } catch (e) { /* ignore */ }
    return getDefaultPrefs();
}

function savePrefs(prefs) {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

// ─── Dashboard Rendering ────────────────────────────────────────
let currentCharts = {};

function destroyCharts() {
    Object.values(currentCharts).forEach(c => { if (c && c.destroy) c.destroy(); });
    currentCharts = {};
}

async function renderDashboard() {
    destroyCharts();
    const prefs = loadPrefs();
    const container = document.getElementById('widget-container');
    container.innerHTML = '';

    let halfWidgets = [];

    for (const pref of prefs) {
        if (!pref.visible) continue;
        const widget = WIDGETS.find(w => w.id === pref.id);
        if (!widget) continue;

        if (widget.size === 'full') {
            if (halfWidgets.length > 0) { flushHalfWidgets(container, halfWidgets); halfWidgets = []; }
            const el = createWidgetElement(widget);
            container.appendChild(el);
        } else {
            halfWidgets.push(widget);
            if (halfWidgets.length === 2) { flushHalfWidgets(container, halfWidgets); halfWidgets = []; }
        }
    }
    if (halfWidgets.length > 0) flushHalfWidgets(container, halfWidgets);

    for (const pref of prefs) {
        if (!pref.visible) continue;
        const widget = WIDGETS.find(w => w.id === pref.id);
        if (widget && widget.load) {
            try { await widget.load(); } catch (e) { console.error(`Widget ${widget.id} error:`, e); }
        }
    }
}

function flushHalfWidgets(container, widgets) {
    const row = document.createElement('div');
    row.className = 'grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6';
    for (const w of widgets) row.appendChild(createWidgetElement(w));
    container.appendChild(row);
}

function createWidgetElement(widget) {
    const el = document.createElement('div');
    if (widget.size === 'full') {
        el.className = 'widget';
        el.dataset.widgetId = widget.id;
        el.innerHTML = widget.renderHTML();
    } else {
        el.className = 'p-6 rounded-2xl bg-white border border-gray-200/80 shadow-sm widget';
        el.dataset.widgetId = widget.id;
        el.innerHTML = `<h3 class="text-sm font-medium text-gray-900 mb-4">${widget.icon} ${widget.title}</h3>${widget.renderHTML()}`;
    }
    return el;
}

// ─── Data Loaders ───────────────────────────────────────────────
async function loadSummary() {
    const response = await fetchWithAuth(`${API_URL}/summary`);
    if (!response) return;
    const result = await response.json();

    if (result.success) {
        const ie = document.getElementById('total-income');
        const ee = document.getElementById('total-expenses');
        const be = document.getElementById('net-balance');
        if (ie) ie.textContent = `$${result.data.total_income.toFixed(2)}`;
        if (ee) ee.textContent = `$${result.data.total_expenses.toFixed(2)}`;
        if (be) {
            const nb = result.data.net_balance;
            be.textContent = `$${nb.toFixed(2)}`;
            be.className = nb >= 0
                ? 'text-2xl font-medium tracking-tight text-green-600'
                : 'text-2xl font-medium tracking-tight text-red-600';
        }
    }
}

async function loadCategoryChart(days) {
    // Build query params
    let url = `${API_URL}/summary/by-category`;
    if (days && days !== 'all') {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        url += `?start_date=${startDate.toISOString().split('T')[0]}`;
    }

    const response = await fetchWithAuth(url);
    if (!response) return;
    const result = await response.json();
    const canvas = document.getElementById('category-chart-canvas');
    if (!canvas) return;

    // Destroy existing chart
    if (currentCharts['category']) { currentCharts['category'].destroy(); delete currentCharts['category']; }

    // Wire up period buttons (only once)
    const btnContainer = document.getElementById('category-period-btns');
    if (btnContainer && !btnContainer.dataset.wired) {
        btnContainer.dataset.wired = 'true';
        btnContainer.addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-period]');
            if (!btn) return;
            btnContainer.querySelectorAll('button').forEach(b => {
                b.className = 'px-3 py-1 text-[11px] rounded-lg bg-gray-100 text-gray-500 hover:bg-orange-50 hover:text-orange-600 transition-colors';
            });
            btn.className = 'px-3 py-1 text-[11px] rounded-lg bg-orange-50 text-orange-600 font-medium';
            const period = btn.dataset.period;
            loadCategoryChart(period === 'all' ? 'all' : parseInt(period));
        });
    }

    if (result.success && result.data.length > 0) {
        // Remove any no-data message
        const existing = canvas.parentElement.querySelector('.no-data-msg');
        if (existing) existing.remove();

        currentCharts['category'] = new Chart(canvas.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: result.data.map(d => d.category),
                datasets: [{
                    data: result.data.map(d => d.total),
                    backgroundColor: ['#f97316', '#ef4444', '#eab308', '#8b5cf6', '#06b6d4', '#64748b', '#f59e0b', '#94a3b8']
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            boxWidth: 10,
                            font: { size: 11, family: 'Inter' },
                            padding: 12,
                            usePointStyle: true,
                            pointStyle: 'circle',
                            generateLabels: (chart) => {
                                const data = chart.data;
                                return data.labels.map((label, i) => {
                                    const meta = chart.getDatasetMeta(0);
                                    const hidden = meta.data[i] ? meta.data[i].hidden : false;
                                    const total = data.datasets[0].data[i];
                                    return {
                                        text: `${label} ($${total.toFixed(0)})`,
                                        fillStyle: hidden ? '#d1d5db' : data.datasets[0].backgroundColor[i],
                                        strokeStyle: 'transparent',
                                        hidden: false,
                                        index: i,
                                        fontColor: hidden ? '#9ca3af' : '#374151',
                                        textDecoration: hidden ? 'line-through' : ''
                                    };
                                });
                            }
                        },
                        onClick: (e, legendItem, legend) => {
                            const index = legendItem.index;
                            const chart = legend.chart;
                            const meta = chart.getDatasetMeta(0);
                            meta.data[index].hidden = !meta.data[index].hidden;
                            chart.update();
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => `${ctx.label}: $${ctx.parsed.toFixed(2)}`
                        }
                    }
                }
            }
        });

        // Add hint if not already present
        if (!canvas.parentElement.querySelector('.chart-hint')) {
            const hint = document.createElement('p');
            hint.className = 'text-[10px] text-gray-400 text-center mt-2 chart-hint';
            hint.textContent = 'Click a legend label to hide/show categories';
            canvas.parentElement.appendChild(hint);
        }
    } else {
        // Remove old "no data" message if present, add new one
        const existing = canvas.parentElement.querySelector('.no-data-msg');
        if (existing) existing.remove();
        const p = document.createElement('p');
        p.className = 'text-gray-400 text-sm text-center mt-8 no-data-msg';
        p.textContent = 'No expense data for this period';
        canvas.parentElement.appendChild(p);
    }
}

async function loadTopExpenses() {
    const response = await fetchWithAuth(`${API_URL}/transactions?type=expense`);
    if (!response) return;
    const result = await response.json();
    const container = document.getElementById('top-expenses-list');
    if (!container) return;

    if (result.success && result.data.length > 0) {
        const sorted = result.data.sort((a, b) => b.amount - a.amount).slice(0, 5);
        container.innerHTML = sorted.map(t => `
            <div class="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                <span class="text-sm text-gray-900 font-medium">${t.item_name}</span>
                <span class="text-sm text-red-600 font-medium">$${t.amount.toFixed(2)}</span>
            </div>
        `).join('');
    } else {
        container.innerHTML = '<p class="text-gray-400 text-sm text-center mt-8">No expenses yet</p>';
    }
}

async function loadRecentActivity() {
    const response = await fetchWithAuth(`${API_URL}/summary/recent?limit=5`);
    if (!response) return;
    const result = await response.json();
    const container = document.getElementById('recent-activity-list');
    if (!container) return;

    if (result.success && result.data.length > 0) {
        container.innerHTML = result.data.map(t => `
            <div class="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg ${t.type === 'income' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'} flex items-center justify-center text-xs font-medium">
                        ${t.type === 'income' ? '+' : '-'}
                    </div>
                    <div>
                        <p class="text-sm font-medium text-gray-900">${t.item_name}</p>
                        <p class="text-xs text-gray-400">${t.category} · ${t.date}</p>
                    </div>
                </div>
                <span class="text-sm font-medium ${t.type === 'income' ? 'text-green-600' : 'text-gray-900'}">
                    ${t.type === 'income' ? '+' : '-'}$${t.amount.toFixed(2)}
                </span>
            </div>
        `).join('');
    } else {
        container.innerHTML = '<p class="text-gray-400 text-sm text-center mt-8">No transactions yet</p>';
    }
}

async function loadMonthlyChart() {
    const response = await fetchWithAuth(`${API_URL}/summary/by-month`);
    if (!response) return;
    const result = await response.json();
    const canvas = document.getElementById('monthly-chart-canvas');
    if (!canvas) return;

    if (result.success && result.data.length > 0) {
        const last6 = result.data.slice(-6);
        currentCharts['monthly'] = new Chart(canvas.getContext('2d'), {
            type: 'bar',
            data: {
                labels: last6.map(d => d.month),
                datasets: [
                    { label: 'Income', data: last6.map(d => d.income), backgroundColor: '#22c55e', borderRadius: 4 },
                    { label: 'Expenses', data: last6.map(d => d.expenses), backgroundColor: '#ef4444', borderRadius: 4 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, grid: { color: '#f3f4f6' }, ticks: { font: { size: 10, family: 'Inter' } } },
                    x: { grid: { display: false }, ticks: { font: { size: 10, family: 'Inter' } } }
                },
                plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, padding: 12, font: { size: 11, family: 'Inter' } } } }
            }
        });
    } else {
        canvas.parentElement.innerHTML += '<p class="text-gray-400 text-sm text-center mt-8">No monthly data yet</p>';
    }
}

async function loadRecurringSummary() {
    const response = await fetchWithAuth(`${API_URL}/summary/recurring`);
    if (!response) return;
    const result = await response.json();
    const container = document.getElementById('recurring-widget-list');
    if (!container) return;

    if (result.success && result.data.length > 0) {
        const items = result.data.slice(0, 4);
        const monthlyTotal = result.data.reduce((sum, d) => {
            if (d.frequency === 'weekly') return sum + d.avg_amount * 4;
            if (d.frequency === 'bi-weekly') return sum + d.avg_amount * 2;
            if (d.frequency === 'quarterly') return sum + d.avg_amount / 3;
            if (d.frequency === 'yearly') return sum + d.avg_amount / 12;
            return sum + d.avg_amount;
        }, 0);

        container.innerHTML = items.map(item => `
            <div class="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center text-xs font-medium">🔄</div>
                    <div>
                        <p class="text-sm font-medium text-gray-900">${item.item_name}</p>
                        <p class="text-xs text-gray-400">${item.frequency} · ${item.status === 'active' ? '✓ Active' : '⚠ Possibly cancelled'}</p>
                    </div>
                </div>
                <span class="text-sm font-medium text-gray-900">$${item.avg_amount.toFixed(2)}</span>
            </div>
        `).join('') + `
            <div class="flex items-center justify-between pt-3 mt-1">
                <a href="/recurring.html" class="text-xs text-orange-600 font-medium hover:text-orange-700">View all →</a>
                <span class="text-xs text-gray-500">~$${monthlyTotal.toFixed(2)}/mo</span>
            </div>`;
    } else {
        container.innerHTML = '<p class="text-gray-400 text-sm text-center mt-8">No recurring expenses detected</p>';
    }
}

// ─── Customize Panel ────────────────────────────────────────────
let configPrefs = [];
let dragSrcIndex = null;

function openCustomizePanel() {
    configPrefs = loadPrefs();
    renderConfigList();
    document.getElementById('customize-overlay').classList.add('active');
}

function closeCustomizePanel() {
    document.getElementById('customize-overlay').classList.remove('active');
}

function renderConfigList() {
    const list = document.getElementById('widget-config-list');
    list.innerHTML = '';

    configPrefs.forEach((pref, index) => {
        const widget = WIDGETS.find(w => w.id === pref.id);
        if (!widget) return;

        const item = document.createElement('div');
        item.className = 'flex items-center gap-3 p-3 bg-gray-50 rounded-xl border-2 border-transparent cursor-grab transition-all hover:bg-gray-100';
        item.draggable = true;
        item.dataset.index = index;

        item.innerHTML = `
            <span class="text-gray-300 text-lg cursor-grab">⠿</span>
            <label class="flex items-center gap-2 flex-1 cursor-pointer text-sm font-medium text-gray-700">
                <input type="checkbox" ${pref.visible ? 'checked' : ''} data-index="${index}"
                    class="w-4 h-4 rounded accent-orange-500 cursor-pointer">
                <span>${widget.icon} ${widget.title}</span>
            </label>
        `;

        item.addEventListener('dragstart', () => { dragSrcIndex = index; item.style.opacity = '0.4'; });
        item.addEventListener('dragend', () => { item.style.opacity = '1'; list.querySelectorAll('div').forEach(el => el.classList.remove('border-orange-400')); });
        item.addEventListener('dragover', (e) => { e.preventDefault(); item.classList.add('border-orange-400'); });
        item.addEventListener('dragleave', () => { item.classList.remove('border-orange-400'); });
        item.addEventListener('drop', (e) => {
            e.preventDefault(); item.classList.remove('border-orange-400');
            if (dragSrcIndex !== null && dragSrcIndex !== index) {
                const moved = configPrefs.splice(dragSrcIndex, 1)[0];
                configPrefs.splice(index, 0, moved);
                renderConfigList();
            }
        });

        item.querySelector('input').addEventListener('change', (e) => { configPrefs[index].visible = e.target.checked; });
        list.appendChild(item);
    });
}

function saveConfig() { savePrefs(configPrefs); closeCustomizePanel(); renderDashboard(); }
function resetConfig() { configPrefs = getDefaultPrefs(); savePrefs(configPrefs); closeCustomizePanel(); renderDashboard(); }

// ─── Event Listeners ────────────────────────────────────────────
document.getElementById('logout-btn').addEventListener('click', logout);
document.getElementById('customize-btn').addEventListener('click', openCustomizePanel);
document.getElementById('customize-close').addEventListener('click', closeCustomizePanel);
document.getElementById('config-save').addEventListener('click', saveConfig);
document.getElementById('config-reset').addEventListener('click', resetConfig);
document.getElementById('customize-overlay').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeCustomizePanel(); });

// ─── Init ───────────────────────────────────────────────────────
renderDashboard();
