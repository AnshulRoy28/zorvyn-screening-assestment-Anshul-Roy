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

async function loadTransactions() {
    const params = new URLSearchParams();

    const category = document.getElementById('filter-category').value;
    const type = document.getElementById('filter-type').value;
    const startDate = document.getElementById('filter-start').value;
    const endDate = document.getElementById('filter-end').value;
    const sortBy = document.getElementById('sort-by').value;

    if (category) params.append('category', category);
    if (type) params.append('type', type);
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);

    const response = await fetchWithAuth(`${API_URL}/transactions?${params}`);
    const result = await response.json();

    if (result.success) {
        let transactions = result.data;

        // Client-side sorting
        const [sortField, sortOrder] = sortBy.split('-');
        transactions.sort((a, b) => {
            let compareA, compareB;

            if (sortField === 'date') {
                compareA = new Date(a.date);
                compareB = new Date(b.date);
            } else if (sortField === 'amount') {
                compareA = a.amount;
                compareB = b.amount;
            }

            if (sortOrder === 'asc') {
                return compareA > compareB ? 1 : -1;
            } else {
                return compareA < compareB ? 1 : -1;
            }
        });

        const tbody = document.querySelector('#transactions-table tbody');
        tbody.innerHTML = transactions.map(t => `
            <tr class="hover:bg-gray-50/50 transition-colors">
                <td class="px-6 py-4 text-gray-500">${t.date}</td>
                <td class="px-6 py-4 font-medium text-gray-900">${t.item_name}</td>
                <td class="px-6 py-4"><span class="text-[10px] px-2 py-1 rounded-md bg-gray-100 text-gray-600">${t.category}</span></td>
                <td class="px-6 py-4 text-right font-medium ${t.type === 'income' ? 'text-green-600' : 'text-gray-900'}">${t.type === 'income' ? '+' : '-'}$${t.amount.toFixed(2)}</td>
                <td class="px-6 py-4"><span class="text-[10px] px-2 py-1 rounded-md ${t.type === 'income' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}">${t.type}</span></td>
                <td class="px-6 py-4 text-gray-500">${t.source}</td>
                <td class="px-6 py-4">
                    <button onclick="deleteTransaction(${t.id})" class="text-xs text-red-500 hover:text-red-700 font-medium transition-colors">Delete</button>
                </td>
            </tr>
        `).join('');
    }
}

async function deleteTransaction(id) {
    if (!confirm('Are you sure you want to delete this transaction?')) return;

    const response = await fetchWithAuth(`${API_URL}/transactions/${id}`, {
        method: 'DELETE'
    });

    const result = await response.json();
    if (result.success) {
        loadTransactions();
    } else {
        alert('Failed to delete transaction: ' + result.error);
    }
}

function exportToCSV() {
    const params = new URLSearchParams();

    const category = document.getElementById('filter-category').value;
    const type = document.getElementById('filter-type').value;
    const startDate = document.getElementById('filter-start').value;
    const endDate = document.getElementById('filter-end').value;

    if (category) params.append('category', category);
    if (type) params.append('type', type);
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);

    const token = getToken();

    // Create a temporary link to download
    fetch(`${API_URL}/transactions/export/csv?${params}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
        .then(response => response.blob())
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'transactions.csv';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        })
        .catch(error => {
            alert('Export failed: ' + error.message);
        });
}

function exportToJSON() {
    const params = new URLSearchParams();

    const category = document.getElementById('filter-category').value;
    const type = document.getElementById('filter-type').value;
    const startDate = document.getElementById('filter-start').value;
    const endDate = document.getElementById('filter-end').value;

    if (category) params.append('category', category);
    if (type) params.append('type', type);
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);

    const token = getToken();

    fetch(`${API_URL}/transactions/export/json?${params}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
        .then(response => response.blob())
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'transactions.json';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        })
        .catch(error => {
            alert('Export failed: ' + error.message);
        });
}

document.getElementById('apply-filters').addEventListener('click', loadTransactions);
document.getElementById('sort-by').addEventListener('change', loadTransactions);
document.getElementById('export-csv-btn').addEventListener('click', exportToCSV);
document.getElementById('export-json-btn').addEventListener('click', exportToJSON);
document.getElementById('logout-btn').addEventListener('click', logout);

loadTransactions();
