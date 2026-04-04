const API_URL = 'http://localhost:5000';

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
    
    if (category) params.append('category', category);
    if (type) params.append('type', type);
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);

    const response = await fetchWithAuth(`${API_URL}/transactions?${params}`);
    const result = await response.json();

    if (result.success) {
        const tbody = document.querySelector('#transactions-table tbody');
        tbody.innerHTML = result.data.map(t => `
            <tr>
                <td>${t.date}</td>
                <td>${t.item_name}</td>
                <td>${t.category}</td>
                <td>$${t.amount.toFixed(2)}</td>
                <td>${t.type}</td>
                <td>${t.source}</td>
                <td>
                    <button class="btn btn-danger" onclick="deleteTransaction(${t.id})">Delete</button>
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

document.getElementById('apply-filters').addEventListener('click', loadTransactions);
document.getElementById('export-csv-btn').addEventListener('click', exportToCSV);
document.getElementById('logout-btn').addEventListener('click', logout);

loadTransactions();
