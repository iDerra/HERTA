window.updateSetupUI = function() {
    const nameInput = document.getElementById('shop-name-input');
    if (nameInput) nameInput.value = window.shopData.name;
}

window.updateShopName = function() {
    window.shopData.name = document.getElementById('shop-name-input').value;
    saveData();
    checkRequirements();
}

window.addProduct = function() {
    const nameInput = document.getElementById('prod-name');
    const priceInput = document.getElementById('prod-price');
    const featureInput = document.getElementById('prod-feature');

    const name = nameInput.value.trim();
    const price = priceInput.value;
    const feature = featureInput.value.trim();

    if (name === "" || price === "") {
        alert("Rellena nombre y precio.");
        return;
    }

    window.shopData.products.push({ 
        id: Date.now(), 
        name, 
        price, 
        feature,
        gender: null, 
        number: null 
    });
    
    nameInput.value = "";
    priceInput.value = "";
    featureInput.value = "";
    
    renderProductList();
    saveData();
    checkRequirements();
}

window.removeProduct = function(id) {
    window.shopData.products = window.shopData.products.filter(p => p.id !== id);
    renderProductList();
    saveData();
    checkRequirements();
}

window.renderProductList = function() {
    const list = document.getElementById('products-list-ui');
    if (!list) return;
    list.innerHTML = "";
    
    if (window.shopData.products.length === 0) {
        list.innerHTML = '<p style="color: #999; text-align: center;">No hay productos.</p>';
        return;
    }
    
    window.shopData.products.forEach(p => {
        list.innerHTML += `
            <div class="product-item" style="background:#f8f9fa; padding:10px; margin-bottom:5px; border-left:4px solid var(--herta-main); display:flex; justify-content:space-between;">
                <div><strong>${p.name}</strong> (${p.feature})</div>
                <button onclick="removeProduct(${p.id})" style="background:#e74c3c; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">🗑️</button>
            </div>`;
    });
}

window.checkRequirements = function() {
    const minProducts = 3;
    const count = window.shopData.products.length;
    const hasName = window.shopData.name && window.shopData.name.trim().length > 0;
    const ready = hasName && count >= minProducts;

    const panel = document.getElementById('status-panel');
    if (!panel) return;

    if (ready) {
        panel.className = 'status-box success';
        panel.innerHTML = '<div>✅</div><div><strong>Fase 1 Completa.</strong> Pasa a Entrenamiento.</div>';
    } else {
        panel.className = 'status-box';
        panel.innerHTML = `
            <div style="font-size: 2rem;">⚠️</div>
            <div>
                <strong>Requisitos:</strong>
                <ul style="list-style:none; padding:0;">
                    <li class="req-item ${hasName?'done':''}">${hasName?'Nombre asignado':'Poner nombre a la tienda'}</li>
                    <li class="req-item ${count>=minProducts?'done':''}">${count>=minProducts?'Productos suficientes':'Crear 3 productos'} (${count}/${minProducts})</li>
                </ul>
            </div>`;
    }

    const btnTrain = document.getElementById('btn-train');
    if (btnTrain) {
        btnTrain.disabled = !ready;
        btnTrain.innerText = ready ? "2. Entrenamiento" : "2. Entrenamiento 🔒";
    }
    
    if(typeof checkTrainingStatus === 'function') checkTrainingStatus();
}