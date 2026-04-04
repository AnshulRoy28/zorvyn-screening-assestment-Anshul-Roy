const API_URL = window.location.origin;

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

async function loadSummary() {
    const response = await fetchWithAuth(`${API_URL}/summary`);
    const result = await response.json();

    if (result.success) {
        document.getElementById('total-income').textContent = `$${result.data.total_income.toFixed(2)}`;
        document.getElementById('total-expenses').textContent = `$${result.data.total_expenses.toFixed(2)}`;
        
        const netBalance = result.data.net_balance;
        const balanceEl = document.getElementById('net-balance');
        balanceEl.textContent = `$${netBalance.toFixed(2)}`;
        balanceEl.className = netBalance >= 0 ? 'stat-value positive' : 'stat-value negative';
    }
}

async function loadCategoryChart() {
    const response = await fetchWithAuth(`${API_URL}/summary/by-category`);
    const result = await response.json();

    if (result.success && result.data.length > 0) {
        const ctx = document.getElementById('category-chart').getContext('2d');
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: result.data.map(d => d.category),
                datasets: [{
                    data: result.data.map(d => d.total),
                    backgroundColor: [
                        '#3498db', '#e74c3c', '#f39c12', '#9b59b6',
                        '#1abc9c', '#34495e', '#e67e22', '#95a5a6'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            boxWidth: 12,
                            font: {
                                size: 11
                            }
                        }
                    }
                }
            }
        });
    }
}

async function loadTopExpenses() {
    const response = await fetchWithAuth(`${API_URL}/transactions?type=expense`);
    const result = await response.json();

    if (result.success) {
        const sorted = result.data
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 5);
        
        const container = document.getElementById('top-expenses');
        container.innerHTML = sorted.map(t => `
            <div class="expense-item">
                <span class="expense-name">${t.item_name}</span>
                <span class="expense-amount">$${t.amount.toFixed(2)}</span>
            </div>
        `).join('');
    }
}

async function loadRecentActivity() {
    const response = await fetchWithAuth(`${API_URL}/summary/recent?limit=5`);
    const result = await response.json();

    if (result.success) {
        const container = document.getElementById('recent-activity');
        container.innerHTML = result.data.map(t => `
            <div class="activity-item">
                <div class="activity-info">
                    <div class="activity-name">${t.item_name}</div>
                    <div class="activity-category">${t.category} • ${t.date}</div>
                </div>
                <div class="activity-amount ${t.type}">
                    ${t.type === 'income' ? '+' : '-'}$${t.amount.toFixed(2)}
                </div>
            </div>
        `).join('');
    }
}

async function loadMonthlyChart() {
    const response = await fetchWithAuth(`${API_URL}/summary/by-month`);
    const result = await response.json();

    if (result.success && result.data.length > 0) {
        const ctx = document.getElementById('monthly-chart').getContext('2d');
        
        // Get last 6 months
        const last6Months = result.data.slice(-6);
        
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: last6Months.map(d => d.month),
                datasets: [
                    {
                        label: 'Income',
                        data: last6Months.map(d => d.income),
                        backgroundColor: '#27ae60'
                    },
                    {
                        label: 'Expenses',
                        data: last6Months.map(d => d.expenses),
                        backgroundColor: '#e74c3c'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            boxWidth: 12,
                            font: {
                                size: 11
                            }
                        }
                    }
                }
            }
        });
    }
}

document.getElementById('logout-btn').addEventListener('click', logout);

loadSummary();
loadCategoryChart();
loadMonthlyChart();
loadTopExpenses();
loadRecentActivity();
