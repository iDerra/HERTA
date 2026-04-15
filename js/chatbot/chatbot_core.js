const STORAGE_KEY = 'herta_chatbot_data';

window.shopData = {
    name: "",
    products: [],
    isTrained: false,
    bestAccuracy: 0,
    salesTotal: 0,
    salesCount: 0
};

window.escapeHTML = function (str) {
    if (typeof str !== 'string') return '';
    return str.replace(/[&<>'"]/g,
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
};

window.saveData = function () {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(window.shopData));
}

window.loadData = function () {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        window.shopData = JSON.parse(saved);
        if (typeof renderProductList === 'function') renderProductList();
        if (typeof updateSetupUI === 'function') updateSetupUI();
        if (typeof checkRequirements === 'function') checkRequirements();
        if (typeof checkTrainingStatus === 'function') checkTrainingStatus();
    }
}

window.resetActivity = function () {
    if (confirm("¿Borrar todo y empezar de cero?")) {
        localStorage.removeItem(STORAGE_KEY);
        location.reload();
    }
}

window.checkQuests = function () {
    const q1 = window.shopData.name && window.shopData.name.trim().length > 0;
    const q2 = window.shopData.products && window.shopData.products.length >= 3;
    const q3 = window.shopData.isTrained && window.shopData.bestAccuracy >= 70;
    const q4 = window.shopData.salesCount >= 2;

    const setQuest = (id, condition) => {
        const el = document.getElementById(id);
        if (!el) return;
        if (condition && !el.classList.contains('completed')) {
            el.classList.add('completed');
            el.querySelector('.q-check').innerText = '✅';
            el.animate([
                { transform: 'scale(1)', background: 'transparent' },
                { transform: 'scale(1.05)', background: 'rgba(34, 197, 94, 0.2)' },
                { transform: 'scale(1)', background: 'transparent' }
            ], { duration: 600 });
        } else if (!condition) {
            el.classList.remove('completed');
            el.querySelector('.q-check').innerText = '🔲';
        }
    };

    setQuest('quest-1', q1);
    setQuest('quest-2', q2);
    setQuest('quest-3', q3);
    setQuest('quest-4', q4);

    if (q1 && q2 && q3 && q4) {
        if (!window.shopData.activityCompleted) {
            window.shopData.activityCompleted = true;
            saveData();
            setTimeout(() => {
                if(typeof window.showFinalCongratulations === 'function') window.showFinalCongratulations();
            }, 800);
        }
    }
}

window.switchTab = function (tabId) {
    const btn = document.querySelector(`button[data-target="${tabId}"]`);
    if (btn && btn.disabled) return;

    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tab-link').forEach(b => b.classList.remove('active'));

    document.getElementById(tabId).classList.add('active');
    if (btn) btn.classList.add('active');

    if (tabId === 'tab-train') {

        if (typeof initTrainingView === 'function') initTrainingView();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    switchTab('tab-config');

    loadData();
    if (typeof checkRequirements === 'function') {
        checkRequirements();
    }
    if (typeof checkQuests === 'function') {
        checkQuests();
    }
});