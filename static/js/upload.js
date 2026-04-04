const API_URL = window.location.origin;
let previewData = [];

function getToken() {
    return localStorage.getItem('token');
}

function logout() {
    localStorage.removeItem('token');
    window.location.href = '/login.html';
}

function showLoading(show = true) {
    const overlay = document.getElementById('loading-overlay');
    if (show) {
        overlay.classList.add('active');
    } else {
        overlay.classList.remove('active');
    }
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
            'Authorization': `Bearer ${token}`
        }
    });

    if (response.status === 401) {
        logout();
        return;
    }

    return response;
}

function showMessage(message, isError = false) {
    const msgEl = document.getElementById(isError ? 'error' : 'message');
    const otherEl = document.getElementById(isError ? 'message' : 'error');
    
    msgEl.textContent = message;
    msgEl.style.display = 'block';
    otherEl.style.display = 'none';
    
    setTimeout(() => {
        msgEl.style.display = 'none';
    }, 5000);
}

function showPreview(transactions) {
    previewData = transactions;
    const tbody = document.querySelector('#preview-table tbody');
    tbody.innerHTML = transactions.map((t, i) => `
        <tr>
            <td>${t.item_name || ''}</td>
            <td>${t.amount ? '$' + t.amount.toFixed(2) : 'N/A'}</td>
            <td>${t.category || 'Other'}</td>
            <td>${t.type || 'expense'}</td>
            <td>${t.date || 'Today'}</td>
        </tr>
    `).join('');
    
    document.getElementById('preview-card').style.display = 'block';
}

document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
        
        tab.classList.add('active');
        document.getElementById(`${tab.dataset.tab}-tab`).style.display = 'block';
    });
});

document.getElementById('receipt-zone').addEventListener('click', () => {
    document.getElementById('receipt-file').click();
});

document.getElementById('receipt-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    showLoading(true);
    try {
        const response = await fetchWithAuth(`${API_URL}/upload/receipt`, {
            method: 'POST',
            body: formData,
            headers: {}
        });

        const result = await response.json();
        if (result.success) {
            showMessage(result.data.message);
            showPreview(result.data.transactions);
        } else {
            showMessage(result.error, true);
        }
    } catch (error) {
        showMessage('Upload failed: ' + error.message, true);
    } finally {
        showLoading(false);
    }
});

document.getElementById('bank-zone').addEventListener('click', () => {
    document.getElementById('bank-file').click();
});

document.getElementById('bank-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    showLoading(true);
    try {
        const response = await fetchWithAuth(`${API_URL}/upload/bank-statement`, {
            method: 'POST',
            body: formData,
            headers: {}
        });

        const result = await response.json();
        if (result.success) {
            showMessage(result.data.message);
            showPreview(result.data.transactions);
        } else {
            showMessage(result.error, true);
        }
    } catch (error) {
        showMessage('Upload failed: ' + error.message, true);
    } finally {
        showLoading(false);
    }
});

document.getElementById('excel-zone').addEventListener('click', () => {
    document.getElementById('excel-file').click();
});

document.getElementById('excel-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    showLoading(true);
    try {
        const response = await fetchWithAuth(`${API_URL}/upload/excel`, {
            method: 'POST',
            body: formData,
            headers: {}
        });

        const result = await response.json();
        if (result.success) {
            showMessage(result.data.message);
            showPreview(result.data.transactions);
        } else {
            showMessage(result.error, true);
        }
    } catch (error) {
        showMessage('Upload failed: ' + error.message, true);
    } finally {
        showLoading(false);
    }
});

document.getElementById('manual-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const data = {
        item_name: document.getElementById('item-name').value,
        amount: parseFloat(document.getElementById('amount').value),
        category: document.getElementById('category').value,
        type: document.getElementById('type').value,
        date: document.getElementById('date').value
    };

    try {
        const response = await fetchWithAuth(`${API_URL}/transactions/manual`, {
            method: 'POST',
            body: JSON.stringify(data),
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const result = await response.json();
        if (result.success) {
            showMessage('Transaction added successfully!');
            e.target.reset();
        } else {
            showMessage(result.error, true);
        }
    } catch (error) {
        showMessage('Failed to add transaction: ' + error.message, true);
    }
});

document.getElementById('confirm-btn').addEventListener('click', async () => {
    showLoading(true);
    try {
        const response = await fetchWithAuth(`${API_URL}/transactions/batch`, {
            method: 'POST',
            body: JSON.stringify({ transactions: previewData }),
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const result = await response.json();
        if (result.success) {
            showMessage(`${result.data.created.length} transactions saved successfully!`);
            document.getElementById('preview-card').style.display = 'none';
            previewData = [];
        } else {
            showMessage('Failed to save transactions', true);
        }
    } catch (error) {
        showMessage('Failed to save: ' + error.message, true);
    } finally {
        showLoading(false);
    }
});

document.getElementById('logout-btn').addEventListener('click', logout);

document.getElementById('date').valueAsDate = new Date();
