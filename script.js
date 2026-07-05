let activeUserSession = null;
let transactionsData = [];

window.addEventListener('DOMContentLoaded', () => {
    initSessionCheck();
    initThemeFromLocalStorage();
});

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');

    const isSuccess = type === 'success';
    const typeClass = isSuccess ? 'toast-success' : 'toast-error';
    const icon = isSuccess
        ? `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>`
        : `<svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`;

    toast.className = `toast ${typeClass}`;
    toast.innerHTML = `
        <div class="toast-icon">${icon}</div>
        <div class="toast-msg" style="font-size: 14px; font-weight: 600;">${message}</div>
      `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('show');
    }, 15);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3500);
}

function toggleAuthView(viewTarget) {
    const loginCard = document.getElementById('login-view');
    const registerCard = document.getElementById('register-view');

    if (viewTarget === 'register') {
        loginCard.classList.add('hidden');
        registerCard.classList.remove('hidden');
    } else {
        registerCard.classList.add('hidden');
        loginCard.classList.remove('hidden');
    }
}

function switchTab(tabTarget) {
    const dbTab = document.getElementById('tab-dashboard');
    const setTab = document.getElementById('tab-settings');
    const dbBtn = document.getElementById('tab-btn-dashboard');
    const setBtn = document.getElementById('tab-btn-settings');

    if (tabTarget === 'dashboard') {
        setTab.classList.add('hidden');
        dbTab.classList.remove('hidden');

        dbBtn.classList.add('active');
        setBtn.classList.remove('active');

        updateOverviewMetricsAndChart();
    } else {
        dbTab.classList.add('hidden');
        setTab.classList.remove('hidden');

        setBtn.classList.add('active');
        dbBtn.classList.remove('active');

        document.getElementById('settings-fullname').value = activeUserSession.fullname || activeUserSession.username;
        document.getElementById('settings-currency').value = activeUserSession.currency || "USD";
    }
}

function getUsersFromStorage() {
    const users = localStorage.getItem('fintrack_users_native');
    return users ? JSON.parse(users) : [];
}

function saveUsersToStorage(usersArray) {
    localStorage.setItem('fintrack_users_native', JSON.stringify(usersArray));
}

function initSessionCheck() {
    const storedSession = localStorage.getItem('fintrack_active_session_native');
    if (storedSession) {
        activeUserSession = JSON.parse(storedSession);
        renderWorkspaceDashboard();
    }
}

function renderWorkspaceDashboard() {
    document.getElementById('auth-container').classList.add('hidden');
    document.getElementById('dashboard-container').classList.remove('hidden');

    document.getElementById('header-username').textContent = activeUserSession.fullname || activeUserSession.username;

    const initials = (activeUserSession.fullname || activeUserSession.username).substring(0, 2).toUpperCase();
    document.getElementById('user-avatar').textContent = initials;

    loadTransactions();
}

function handleRegister(e) {
    e.preventDefault();
    const usernameInput = document.getElementById('register-username').value.trim();
    const passwordInput = document.getElementById('register-password').value.trim();

    if (!usernameInput || !passwordInput) {
        showToast('Complete credentials sequence before submit.', 'error');
        return;
    }

    const users = getUsersFromStorage();
    const userExists = users.some(u => u.username.toLowerCase() === usernameInput.toLowerCase());
    if (userExists) {
        showToast('This username is already taken! Try another.', 'error');
        return;
    }

    users.push({
        username: usernameInput,
        password: passwordInput,
        fullname: usernameInput,
        currency: 'USD'
    });
    saveUsersToStorage(users);

    showToast('Registration complete! Try logging in.', 'success');

    document.getElementById('register-form').reset();
    document.getElementById('login-username').value = usernameInput;
    toggleAuthView('login');
}

function handleLogin(e) {
    e.preventDefault();
    const usernameInput = document.getElementById('login-username').value.trim();
    const passwordInput = document.getElementById('login-password').value.trim();

    if (!usernameInput || !passwordInput) {
        showToast('Fill credentials inputs.', 'error');
        return;
    }

    const users = getUsersFromStorage();
    const matchedUser = users.find(u => u.username.toLowerCase() === usernameInput.toLowerCase() && u.password === passwordInput);

    if (!matchedUser) {
        showToast('Invalid Username or Password! Please retry.', 'error');
        return;
    }

    activeUserSession = {
        username: matchedUser.username,
        fullname: matchedUser.fullname || matchedUser.username,
        currency: matchedUser.currency || 'USD'
    };
    localStorage.setItem('fintrack_active_session_native', JSON.stringify(activeUserSession));

    showToast('Authentication validated successfully!', 'success');

    document.getElementById('login-form').reset();
    renderWorkspaceDashboard();
}

function handleLogout() {
    localStorage.removeItem('fintrack_active_session_native');
    activeUserSession = null;

    document.getElementById('dashboard-container').classList.add('hidden');
    document.getElementById('auth-container').classList.remove('hidden');

    switchTab('dashboard');

    showToast('Terminated workspace session safely.', 'success');
}

function loadTransactions() {
    const storageKey = `fintrack_tx_native_${activeUserSession.username.toLowerCase()}`;
    const savedTxList = localStorage.getItem(storageKey);

    if (savedTxList) {
        transactionsData = JSON.parse(savedTxList);
    } else {
        transactionsData = [];
        saveActiveTransactionsToStorage();
    }

    updateOverviewMetricsAndChart();
    updateLedgerUI(transactionsData);
}

function saveActiveTransactionsToStorage() {
    const storageKey = `fintrack_tx_native_${activeUserSession.username.toLowerCase()}`;
    localStorage.setItem(storageKey, JSON.stringify(transactionsData));
}

function openTransactionModal() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('modal-tx-date').value = today;
    document.getElementById('tx-modal').classList.add('open');
}

function closeTransactionModal() {
    document.getElementById('tx-modal').classList.remove('open');
    document.getElementById('tx-modal-form').reset();
}

function handleModalTransactionSubmit(e) {
    e.preventDefault();

    const desc = document.getElementById('modal-tx-desc').value.trim();
    const type = document.getElementById('modal-tx-type').value;
    const amount = parseFloat(document.getElementById('modal-tx-amount').value);
    const category = document.getElementById('modal-tx-category').value;
    const date = document.getElementById('modal-tx-date').value;

    if (!desc || isNaN(amount) || amount <= 0) {
        showToast('Please insert logical record entries & dynamic positive numbers.', 'error');
        return;
    }

    const freshTransaction = {
        id: 'tx-n-' + Date.now(),
        date: date,
        desc: desc,
        category: category,
        amount: amount,
        type: type
    };

    transactionsData.unshift(freshTransaction);
    saveActiveTransactionsToStorage();

    updateOverviewMetricsAndChart();
    handleSearchAndFilter();
    closeTransactionModal();

    showToast('Ledger updated successfully with entry!', 'success');
}

function removeTransactionRecord(id) {
    transactionsData = transactionsData.filter(tx => tx.id !== id);
    saveActiveTransactionsToStorage();

    updateOverviewMetricsAndChart();
    handleSearchAndFilter();

    showToast('Ledger item removed.', 'success');
}

function handleSearchAndFilter() {
    const searchQuery = document.getElementById('search-input').value.toLowerCase().trim();
    const filterType = document.getElementById('filter-type').value;

    let filteredList = transactionsData;

    if (filterType !== 'all') {
        filteredList = filteredList.filter(tx => tx.type === filterType);
    }

    if (searchQuery) {
        filteredList = filteredList.filter(tx =>
            tx.desc.toLowerCase().includes(searchQuery) ||
            tx.category.toLowerCase().includes(searchQuery)
        );
    }

    updateLedgerUI(filteredList);
}

function updateLedgerUI(listToRender) {
    const tableBody = document.getElementById('ledger-table-rows');
    const emptyState = document.getElementById('ledger-empty-state');
    tableBody.innerHTML = '';

    if (listToRender.length === 0) {
        emptyState.classList.remove('hidden');
    } else {
        emptyState.classList.add('hidden');

        listToRender.forEach(tx => {
            const row = document.createElement('tr');

            const isIncome = tx.type === 'Income';
            const symbol = isIncome ? '+' : '-';
            const colorClass = isIncome ? 'text-income' : 'text-expense';
            const badgeClass = isIncome ? 'badge badge-emerald' : 'badge badge-slate';

            row.innerHTML = `
            <td style="color: var(--text-muted); font-size:13px; font-weight:600;">${tx.date}</td>
            <td style="color: var(--text-main); font-weight:700;">${tx.desc}</td>
            <td>
              <span class="${badgeClass}">${tx.category}</span>
            </td>
            <td style="text-align: right;" class="${colorClass}">
              ${symbol}$${tx.amount.toFixed(2)}
            </td>
            <td style="text-align: center;">
              <button onclick="removeTransactionRecord('${tx.id}')" class="btn-delete">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </td>
          `;
            tableBody.appendChild(row);
        });
    }
}

function updateOverviewMetricsAndChart() {
    let incomeSum = 0;
    let expenseSum = 0;

    transactionsData.forEach(tx => {
        if (tx.type === 'Income') {
            incomeSum += tx.amount;
        } else {
            expenseSum += tx.amount;
        }
    });

    const finalBalance = incomeSum - expenseSum;

    document.getElementById('meta-income').textContent = `$${incomeSum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    document.getElementById('meta-expense').textContent = `$${expenseSum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    document.getElementById('meta-count').textContent = transactionsData.length.toString();

    const balanceEl = document.getElementById('meta-balance');
    balanceEl.textContent = `$${finalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    if (finalBalance < 0) {
        balanceEl.style.color = 'var(--rose)';
    } else {
        balanceEl.style.color = 'var(--text-main)';
    }

    drawCashFlowCanvasChart(incomeSum, expenseSum);
}

function drawCashFlowCanvasChart(income, expense) {
    const canvas = document.getElementById('cashflow-canvas');
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    ctx.clearRect(0, 0, width, height);

    ctx.strokeStyle = document.body.classList.contains('dark-mode') ? '#334155' : '#f1f5f9';
    ctx.lineWidth = 1;

    const tracks = 5;
    for (let i = 0; i <= tracks; i++) {
        const y = 30 + (i * (height - 60) / tracks);
        ctx.beginPath();
        ctx.moveTo(35, y);
        ctx.lineTo(width - 20, y);
        ctx.stroke();

        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 9px Inter';
        const ratioText = (1.0 - (i / tracks)).toFixed(1);
        ctx.fillText(ratioText, 10, y + 3);
    }

    const maxVal = Math.max(income, expense, 100);
    const incomeHeight = (income / maxVal) * (height - 80);
    const expenseHeight = (expense / maxVal) * (height - 80);

    const barWidth = 44;
    const spacing = 70;
    const midPoint = width / 2;

    const incomeX = midPoint - spacing - (barWidth / 2);
    const incomeY = height - 40 - incomeHeight;

    ctx.fillStyle = '#0f5132';
    ctx.beginPath();
    if (ctx.roundRect) {
        ctx.roundRect(incomeX, incomeY, barWidth, Math.max(incomeHeight, 8), [6, 6, 0, 0]);
    } else {
        ctx.rect(incomeX, incomeY, barWidth, Math.max(incomeHeight, 8));
    }
    ctx.fill();

    const expenseX = midPoint + spacing - (barWidth / 2);
    const expenseY = height - 40 - expenseHeight;

    ctx.fillStyle = '#842029';
    ctx.beginPath();
    if (ctx.roundRect) {
        ctx.roundRect(expenseX, expenseY, barWidth, Math.max(expenseHeight, 8), [6, 6, 0, 0]);
    } else {
        ctx.rect(expenseX, expenseY, barWidth, Math.max(expenseHeight, 8));
    }
    ctx.fill();

    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 10px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('Income Bar', midPoint - spacing, height - 15);
    ctx.fillText('Expense Bar', midPoint + spacing, height - 15);

    ctx.fillStyle = '#0f5132';
    ctx.fillText(`$${income.toFixed(0)}`, midPoint - spacing, Math.max(incomeY - 8, 25));

    ctx.fillStyle = '#842029';
    ctx.fillText(`$${expense.toFixed(0)}`, midPoint + spacing, Math.max(expenseY - 8, 25));
}

window.addEventListener('resize', () => {
    if (activeUserSession) {
        updateOverviewMetricsAndChart();
    }
});

function initThemeFromLocalStorage() {
    const mode = localStorage.getItem('fintrack_theme_native');
    if (mode === 'dark') {
        document.body.classList.add('dark-mode');
        document.getElementById('dark-mode-toggle').checked = true;
    }
}

function handleThemeToggle() {
    const toggle = document.getElementById('dark-mode-toggle');
    if (toggle.checked) {
        document.body.classList.add('dark-mode');
        localStorage.setItem('fintrack_theme_native', 'dark');
        showToast('Premium Dark Mode theme enabled.', 'success');
    } else {
        document.body.classList.remove('dark-mode');
        localStorage.setItem('fintrack_theme_native', 'light');
        showToast('Premium Light Mode theme enabled.', 'success');
    }
    updateOverviewMetricsAndChart();
}

function handleSettingsSave(e) {
    e.preventDefault();
    const fullnameVal = document.getElementById('settings-fullname').value.trim();
    const currencyVal = document.getElementById('settings-currency').value;

    if (!fullnameVal) {
        showToast('Full Name cannot be empty.', 'error');
        return;
    }

    activeUserSession.fullname = fullnameVal;
    activeUserSession.currency = currencyVal;
    localStorage.setItem('fintrack_active_session_native', JSON.stringify(activeUserSession));

    const users = getUsersFromStorage();
    const activeIndex = users.findIndex(u => u.username.toLowerCase() === activeUserSession.username.toLowerCase());
    if (activeIndex !== -1) {
        users[activeIndex].fullname = fullnameVal;
        users[activeIndex].currency = currencyVal;
        saveUsersToStorage(users);
    }

    document.getElementById('header-username').textContent = fullnameVal;
    const initials = fullnameVal.substring(0, 2).toUpperCase();
    document.getElementById('user-avatar').textContent = initials;

    showToast('Profile configuration updated!', 'success');

    switchTab('dashboard');
}

function triggerResetFlow() {
    document.getElementById('confirm-modal').classList.add('open');
}

function closeResetModal() {
    document.getElementById('confirm-modal').classList.remove('open');
}

function confirmResetAllData() {
    transactionsData = [];
    saveActiveTransactionsToStorage();

    updateOverviewMetricsAndChart();
    handleSearchAndFilter();
    closeResetModal();

    showToast('All transaction records wiped successfully.', 'success');
}