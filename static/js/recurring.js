const API_URL = window.location.origin;

function getToken() { return localStorage.getItem('token'); }
function logout() { localStorage.removeItem('token'); window.location.href = '/login.html'; }

async function fetchWithAuth(url, options = {}) {
    const token = getToken();
    if (!token) { window.location.href = '/login.html'; return; }
    const response = await fetch(url, {
        ...options,
        headers: { ...options.headers, 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
    if (response.status === 401) { logout(); return; }
    return response;
}

// ─── State ──────────────────────────────────────────────────────
const today = new Date();
let calYear = today.getFullYear();
let calMonth = today.getMonth() + 1; // 1-indexed

const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const CATEGORY_COLORS = {
    'Bills': { bg: 'bg-blue-50', text: 'text-blue-600', dot: 'bg-blue-500' },
    'Entertainment': { bg: 'bg-purple-50', text: 'text-purple-600', dot: 'bg-purple-500' },
    'Health': { bg: 'bg-red-50', text: 'text-red-600', dot: 'bg-red-500' },
    'Food': { bg: 'bg-orange-50', text: 'text-orange-600', dot: 'bg-orange-500' },
    'Transport': { bg: 'bg-cyan-50', text: 'text-cyan-600', dot: 'bg-cyan-500' },
    'Shopping': { bg: 'bg-pink-50', text: 'text-pink-600', dot: 'bg-pink-500' },
    'default': { bg: 'bg-gray-50', text: 'text-gray-600', dot: 'bg-gray-500' }
};

function getColor(category) {
    return CATEGORY_COLORS[category] || CATEGORY_COLORS['default'];
}

// ─── Load Recurring Expenses List ───────────────────────────────
async function loadRecurringList() {
    const response = await fetchWithAuth(`${API_URL}/summary/recurring`);
    if (!response) return;
    const result = await response.json();

    if (!result.success) return;

    const data = result.data;
    const listEl = document.getElementById('recurring-list');

    // Update summary stats
    const activeItems = data.filter(d => d.status === 'active');
    const cancelledItems = data.filter(d => d.status === 'possibly_cancelled');
    const yearlyTotal = data.reduce((sum, d) => sum + d.yearly_cost, 0);
    const monthlyTotal = data.reduce((sum, d) => {
        if (d.frequency === 'weekly') return sum + d.avg_amount * 4;
        if (d.frequency === 'bi-weekly') return sum + d.avg_amount * 2;
        if (d.frequency === 'quarterly') return sum + d.avg_amount / 3;
        if (d.frequency === 'yearly') return sum + d.avg_amount / 12;
        return sum + d.avg_amount;
    }, 0);

    document.getElementById('yearly-total').textContent = `$${yearlyTotal.toFixed(2)}`;
    document.getElementById('monthly-total').textContent = `$${monthlyTotal.toFixed(2)}`;
    document.getElementById('active-count').textContent = activeItems.length;
    document.getElementById('cancelled-count').textContent = cancelledItems.length;

    if (data.length === 0) {
        listEl.innerHTML = `
            <div class="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-8 text-center">
                <iconify-icon icon="solar:calendar-search-linear" width="40" class="text-gray-300 mb-3"></iconify-icon>
                <p class="text-sm text-gray-500">No recurring expenses detected yet.</p>
                <p class="text-xs text-gray-400 mt-1">Keep adding transactions — patterns will be detected automatically.</p>
            </div>`;
        return;
    }

    listEl.innerHTML = data.map(item => {
        const color = getColor(item.category);
        const statusBadge = item.status === 'active'
            ? '<span class="text-[10px] px-2 py-0.5 rounded-md bg-green-50 text-green-700 font-medium">Active</span>'
            : '<span class="text-[10px] px-2 py-0.5 rounded-md bg-orange-50 text-orange-700 font-medium">Possibly Cancelled</span>';

        return `
            <div class="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-5 hover:border-orange-200 transition-colors">
                <div class="flex items-start justify-between gap-4">
                    <div class="flex items-center gap-4">
                        <div class="w-10 h-10 rounded-xl ${color.bg} ${color.text} flex items-center justify-center shrink-0">
                            <iconify-icon icon="solar:repeat-linear" width="20"></iconify-icon>
                        </div>
                        <div>
                            <p class="text-sm font-medium text-gray-900">${item.item_name}</p>
                            <div class="flex items-center gap-2 mt-1 flex-wrap">
                                <span class="text-[10px] px-2 py-0.5 rounded-md ${color.bg} ${color.text}">${item.category}</span>
                                ${statusBadge}
                                <span class="text-xs text-gray-400">${item.frequency} · ${item.months_seen} months</span>
                            </div>
                        </div>
                    </div>
                    <div class="text-right shrink-0">
                        <p class="text-sm font-medium text-gray-900">$${item.avg_amount.toFixed(2)}</p>
                        <p class="text-[10px] text-gray-400">~$${item.yearly_cost.toFixed(0)}/yr</p>
                    </div>
                </div>
                <div class="flex items-center justify-between mt-3 pt-3 border-t border-gray-50 text-xs text-gray-400">
                    <span>Last: ${item.last_date}</span>
                    <span>Next: ${item.next_expected}</span>
                    <span>Variation: ${item.amount_variation}%</span>
                </div>
            </div>`;
    }).join('');
}

// ─── Calendar ───────────────────────────────────────────────────
async function loadCalendar() {
    const response = await fetchWithAuth(`${API_URL}/summary/recurring/calendar?year=${calYear}&month=${calMonth}`);
    if (!response) return;
    const result = await response.json();

    if (!result.success) return;

    const { month_info, expenses } = result.data;
    const { days_in_month, first_weekday } = month_info;

    // Update label
    document.getElementById('cal-month-label').textContent = `${MONTH_NAMES[calMonth]} ${calYear}`;

    // Build calendar grid
    const grid = document.getElementById('calendar-grid');
    grid.innerHTML = '';

    // Create expense lookup by day
    const expensesByDay = {};
    for (const e of expenses) {
        if (!expensesByDay[e.day]) expensesByDay[e.day] = [];
        expensesByDay[e.day].push(e);
    }

    // Empty cells before first day (Monday = 0)
    for (let i = 0; i < first_weekday; i++) {
        grid.innerHTML += '<div class="h-10"></div>';
    }

    // Day cells
    const todayDay = today.getDate();
    const isCurrentMonth = calYear === today.getFullYear() && calMonth === (today.getMonth() + 1);

    for (let day = 1; day <= days_in_month; day++) {
        const hasExpense = expensesByDay[day];
        const isToday = isCurrentMonth && day === todayDay;

        let cellClass = 'h-10 rounded-lg flex flex-col items-center justify-center text-xs relative transition-colors ';
        if (isToday) {
            cellClass += 'bg-gray-900 text-white font-medium';
        } else if (hasExpense) {
            cellClass += 'bg-orange-50 text-orange-700 font-medium cursor-pointer hover:bg-orange-100';
        } else {
            cellClass += 'text-gray-500 hover:bg-gray-50';
        }

        let dot = '';
        if (hasExpense && !isToday) {
            dot = '<div class="absolute bottom-1 w-1 h-1 rounded-full bg-orange-500"></div>';
        } else if (hasExpense && isToday) {
            dot = '<div class="absolute bottom-1 w-1 h-1 rounded-full bg-white"></div>';
        }

        grid.innerHTML += `<div class="${cellClass}" data-day="${day}">${day}${dot}</div>`;
    }

    // Calendar details (list of expenses for the month)
    const detailsEl = document.getElementById('calendar-details');
    if (expenses.length === 0) {
        detailsEl.innerHTML = '<p class="text-xs text-gray-400 text-center">No recurring expenses expected this month</p>';
    } else {
        detailsEl.innerHTML = expenses.map(e => {
            const color = getColor(e.category);
            return `
                <div class="flex items-center justify-between py-2 px-3 bg-white rounded-xl border border-gray-100">
                    <div class="flex items-center gap-2">
                        <div class="w-2 h-2 rounded-full ${color.dot}"></div>
                        <span class="text-xs font-medium text-gray-700">${e.item_name}</span>
                    </div>
                    <div class="flex items-center gap-3">
                        <span class="text-[10px] text-gray-400">Day ${e.day}</span>
                        <span class="text-xs font-medium text-gray-900">$${e.amount.toFixed(2)}</span>
                    </div>
                </div>`;
        }).join('');
    }
}

function prevMonth() {
    calMonth--;
    if (calMonth < 1) { calMonth = 12; calYear--; }
    loadCalendar();
}

function nextMonth() {
    calMonth++;
    if (calMonth > 12) { calMonth = 1; calYear++; }
    loadCalendar();
}

// ─── Events ─────────────────────────────────────────────────────
document.getElementById('logout-btn').addEventListener('click', logout);
document.getElementById('cal-prev').addEventListener('click', prevMonth);
document.getElementById('cal-next').addEventListener('click', nextMonth);

// ─── Init ───────────────────────────────────────────────────────
loadRecurringList();
loadCalendar();
