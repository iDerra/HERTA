const STORAGE_KEY = 'herta_chatbot_data';

window.shopData = {
    name: "",
    products: [],
    isTrained: false
};

window.saveData = function() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(window.shopData));
}

window.loadData = function() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        window.shopData = JSON.parse(saved);
        if(typeof renderProductList === 'function') renderProductList();
        if(typeof updateSetupUI === 'function') updateSetupUI();
        if(typeof checkRequirements === 'function') checkRequirements();
        if(typeof checkTrainingStatus === 'function') checkTrainingStatus();
    }
}

window.resetActivity = function() {
    if(confirm("¿Borrar todo y empezar de cero?")) {
        localStorage.removeItem(STORAGE_KEY);
        location.reload();
    }
}

window.switchTab = function(tabId) {
    const btn = document.querySelector(`button[data-target="${tabId}"]`);
    if (btn && btn.disabled) return;

    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

    document.getElementById(tabId).classList.add('active');
    if(btn) btn.classList.add('active');

    if (tabId === 'tab-train') {

        if (typeof initTrainingView === 'function') initTrainingView();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    switchTab('tab-config');
    
    loadData();
    if(typeof checkRequirements === 'function') {
        checkRequirements();
    }
});