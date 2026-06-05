// Sync the shop name input field with the stored data
window.updateSetupUI = function () {
    const nameInput = document.getElementById('shop-name-input');
    if (nameInput) nameInput.value = window.shopData.name;
}

// Update the shop name state, save it, and re-evaluate phase progress
window.updateShopName = function () {
    window.shopData.name = document.getElementById('shop-name-input').value;
    saveData();
    checkRequirements();
}

// Validate form inputs and append a new product to the inventory
window.addProduct = function () {
    const nameInput = document.getElementById('prod-name');
    const priceInput = document.getElementById('prod-price');
    const featureInput = document.getElementById('prod-feature');

    const name = nameInput.value.trim();
    const price = priceInput.value.trim();
    const feature = featureInput.value.trim();

    if (name === "" || price === "") {
        alert("Rellena nombre y precio.");
        return;
    }

    // Ensure the product name is a single word to simplify chatbot entity parsing later
    if (/\s/.test(name)) {
        alert("⚠️ El nombre del producto debe ser una sola palabra (sin espacios).");
        nameInput.focus();
        return;
    }

    if (/\s/.test(feature)) {
        alert("⚠️ El atributo debe ser una sola palabra (sin espacios).");
        featureInput.focus();
        return;
    }

    // Normalize comma separators to allow valid floating-point math for pricing
    const priceNum = parseFloat(price.replace(',', '.'));
    if (price === "" || isNaN(priceNum) || priceNum <= 0) {
        alert("⚠️ El precio debe ser un número válido mayor que 0.");
        priceInput.focus();
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

// Remove a product from the array using its unique timestamp ID
window.removeProduct = function (id) {
    window.shopData.products = window.shopData.products.filter(p => p.id !== id);
    renderProductList();
    saveData();
    checkRequirements();
}

// Rebuild the DOM element to display the current inventory
window.renderProductList = function () {
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
                <div><strong>${escapeHTML(p.name)}</strong> (${escapeHTML(p.feature)})</div>
                <button onclick="removeProduct(${p.id})" style="background:#e74c3c; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">🗑️</button>
            </div>`;
    });
}

// Verify Phase 1 conditions (shop name + 3 products) to unlock the training tab
window.checkRequirements = function () {
    const minProducts = 3;
    const count = window.shopData.products.length;
    const hasName = window.shopData.name && window.shopData.name.trim().length > 0;
    const ready = hasName && count >= minProducts;

    const panel = document.getElementById('status-panel');
    if (!panel) return;

    if (ready) {
        panel.className = 'status-box success';
        panel.innerHTML = '<div><strong>Fase 1 completa.</strong> Pasa al entrenamiento.</div>';
    } else {
        panel.className = 'status-box';
        panel.innerHTML = `
            <div style="font-size: 2rem;">⚠️</div>
            <div>
                <strong>Requisitos:</strong>
                <ul style="list-style:none; padding:0;">
                    <li class="req-item ${hasName ? 'done' : ''}">${hasName ? 'Nombre asignado' : 'Poner nombre a la tienda'}</li>
                    <li class="req-item ${count >= minProducts ? 'done' : ''}">${count >= minProducts ? 'Productos suficientes' : 'Crear 3 productos'} (${count}/${minProducts})</li>
                </ul>
            </div>`;
    }

    const btnTrain = document.getElementById('btn-train');
    if (btnTrain) {
        btnTrain.disabled = !ready;
        const label = btnTrain.querySelector('.tab-label');
        if (label) label.textContent = ready ? 'Entrenamiento' : 'Entrenamiento 🔒';
    }

    if (typeof checkTrainingStatus === 'function') checkTrainingStatus();
}