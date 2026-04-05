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
        overlay.classList.remove('hidden');
        overlay.classList.add('flex');
    } else {
        overlay.classList.add('hidden');
        overlay.classList.remove('flex');
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
    msgEl.classList.remove('hidden');
    otherEl.classList.add('hidden');

    setTimeout(() => {
        msgEl.classList.add('hidden');
    }, 5000);
}

function makeEditable(cell, rowIndex, field) {
    const currentValue = previewData[rowIndex][field];
    const originalText = cell.textContent;

    if (field === 'category') {
        const categories = ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Health', 'Income', 'Other'];
        const select = document.createElement('select');
        select.className = 'w-full bg-white border border-orange-400 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500';
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            option.selected = cat === currentValue;
            select.appendChild(option);
        });
        cell.innerHTML = '';
        cell.appendChild(select);
        select.focus();
        select.addEventListener('blur', () => saveEdit(cell, rowIndex, field, select.value, originalText));
        select.addEventListener('change', () => saveEdit(cell, rowIndex, field, select.value, originalText));
    } else if (field === 'type') {
        const select = document.createElement('select');
        select.className = 'w-full bg-white border border-orange-400 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500';
        ['expense', 'income'].forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            option.selected = type === currentValue;
            select.appendChild(option);
        });
        cell.innerHTML = '';
        cell.appendChild(select);
        select.focus();
        select.addEventListener('blur', () => saveEdit(cell, rowIndex, field, select.value, originalText));
        select.addEventListener('change', () => saveEdit(cell, rowIndex, field, select.value, originalText));
    } else if (field === 'amount') {
        const input = document.createElement('input');
        input.type = 'number';
        input.step = '0.01';
        input.value = currentValue || '';
        input.className = 'w-full bg-white border border-orange-400 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-orange-500';
        cell.innerHTML = '';
        cell.appendChild(input);
        input.focus();
        input.select();
        input.addEventListener('blur', () => saveEdit(cell, rowIndex, field, parseFloat(input.value) || 0, originalText));
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                saveEdit(cell, rowIndex, field, parseFloat(input.value) || 0, originalText);
            }
        });
    } else if (field === 'date') {
        const input = document.createElement('input');
        input.type = 'date';
        input.value = currentValue || '';
        input.className = 'w-full bg-white border border-orange-400 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500';
        cell.innerHTML = '';
        cell.appendChild(input);
        input.focus();
        input.addEventListener('blur', () => saveEdit(cell, rowIndex, field, input.value, originalText));
        input.addEventListener('change', () => saveEdit(cell, rowIndex, field, input.value, originalText));
    } else {
        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentValue || '';
        input.className = 'w-full bg-white border border-orange-400 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500';
        cell.innerHTML = '';
        cell.appendChild(input);
        input.focus();
        input.select();
        input.addEventListener('blur', () => saveEdit(cell, rowIndex, field, input.value, originalText));
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                saveEdit(cell, rowIndex, field, input.value, originalText);
            }
        });
    }
}

function saveEdit(cell, rowIndex, field, newValue, originalText) {
    previewData[rowIndex][field] = newValue;
    renderPreviewTable();
}

function deletePreviewRow(rowIndex) {
    if (confirm('Delete this transaction?')) {
        previewData.splice(rowIndex, 1);
        renderPreviewTable();
        if (previewData.length === 0) {
            document.getElementById('preview-card').classList.add('hidden');
        }
    }
}

function renderPreviewTable() {
    const tbody = document.querySelector('#preview-table tbody');
    tbody.innerHTML = previewData.map((t, i) => `
        <tr class="hover:bg-gray-50/50 transition-colors">
            <td class="px-6 py-3 text-gray-900 font-medium editable-cell" data-row="${i}" data-field="item_name">${t.item_name || ''}</td>
            <td class="px-6 py-3 text-right font-medium text-gray-900 editable-cell" data-row="${i}" data-field="amount">${t.amount ? '$' + t.amount.toFixed(2) : 'N/A'}</td>
            <td class="px-6 py-3 editable-cell" data-row="${i}" data-field="category"><span class="text-[10px] px-2 py-1 rounded-md bg-gray-100 text-gray-600">${t.category || 'Other'}</span></td>
            <td class="px-6 py-3 editable-cell" data-row="${i}" data-field="type"><span class="text-[10px] px-2 py-1 rounded-md ${(t.type || 'expense') === 'income' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}">${t.type || 'expense'}</span></td>
            <td class="px-6 py-3 text-gray-500 editable-cell" data-row="${i}" data-field="date">${t.date || 'Today'}</td>
            <td class="px-6 py-3 text-center">
                <button class="btn-small text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition-colors" onclick="deletePreviewRow(${i})">
                    <iconify-icon icon="solar:trash-bin-trash-linear" width="18"></iconify-icon>
                </button>
            </td>
        </tr>
    `).join('');

    document.querySelectorAll('.editable-cell').forEach(cell => {
        cell.addEventListener('click', () => {
            const rowIndex = parseInt(cell.dataset.row);
            const field = cell.dataset.field;
            makeEditable(cell, rowIndex, field);
        });
    });
}

function showPreview(transactions) {
    previewData = transactions;
    renderPreviewTable();
    document.getElementById('preview-card').classList.remove('hidden');
}

// Make deletePreviewRow globally accessible
window.deletePreviewRow = deletePreviewRow;

document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => {
            t.classList.remove('text-orange-600', 'bg-orange-50/50', 'border-b-2', 'border-orange-500');
            t.classList.add('text-gray-500');
        });
        document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));

        tab.classList.add('text-orange-600', 'bg-orange-50/50', 'border-b-2', 'border-orange-500');
        tab.classList.remove('text-gray-500');
        document.getElementById(`${tab.dataset.tab}-tab`).classList.remove('hidden');
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
            document.getElementById('preview-card').classList.add('hidden');
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
