let chatState = {
    conversationStage: 'IDLE', 
    cart: [],
    pendingProduct: null 
};

function removeAccents(str) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

window.handleUserMessage = function() {
    const inputEl = document.getElementById('sim-user-input');
    const text = inputEl.value.trim();
    if (!text) return;

    addBubble(text, 'user');
    inputEl.value = ""; 
    showTyping(true);

    setTimeout(() => {
        let response;
        
        if (chatState.conversationStage === 'WAITING_RETURN_PRODUCT') {
            response = handleReturnProductInput(text);
        } else if (chatState.conversationStage === 'WAITING_DATE') {
            response = handleReturnDateLogic(text);
        } else if (chatState.conversationStage === 'WAITING_SPECIFICATION') {
            response = handleSpecificationLogic(text);
        } else {
            response = generateBotResponse(text);
        }

        showTyping(false);
        
        if (typeof response === 'object') {
            addBubbleWithCommands(response.text, response.commands);
        } else {
            addBubble(response, 'bot');
        }
        
        updateCartUI();

    }, 800);
}

function generateBotResponse(userText) {
    const cleanText = removeAccents(userText.toLowerCase());

    if (cleanText.includes("cesta") || cleanText.includes("carrito") || cleanText.includes("ver compra")) return showCart();
    if (cleanText.includes("pagar") || cleanText.includes("finalizar") || cleanText.includes("comprar todo")) return processCheckout();
    
    if (cleanText.includes("catalogo") || cleanText.includes("articulos") || cleanText.includes("1")) {
        const list = window.shopData.products.map(p => `- ${p.name} (${p.price}€)`).join("<br>");
        return `📦 <b>Artículos disponibles:</b><br>${list}`;
    }

    if (cleanText.includes("envio") || cleanText.includes("gastos") || cleanText.includes("2")) return "🚚 <b>Política de Envíos:</b><br>Coste fijo: 5€.<br><b>¡GRATIS</b> si la cesta supera los 50€!";
    
    if (cleanText.includes("devolver") || cleanText.includes("devolucion") || cleanText.includes("3")) {
        chatState.conversationStage = 'WAITING_RETURN_PRODUCT';
        return "🔄 <b>Solicitud de Devolución.</b><br>Por favor, indícame: <b>¿Qué artículo quieres devolver?</b>";
    }

    const inventory = window.shopData.products;
    const mentionsProduct = inventory.some(p => cleanText.includes(removeAccents(p.name.toLowerCase())));

    if (!mentionsProduct && (cleanText.includes("anadir") || cleanText.includes("comprar") || cleanText.includes("4"))) {
        if(inventory.length === 0) return "El catálogo está vacío.";
        const productCommands = inventory.map(p => `➕ Añadir ${p.name} ${p.feature}`);
        return {
            text: "Selecciona un producto para añadirlo directamente a tu cesta:",
            commands: productCommands
        };
    }

    if (cleanText.includes("menu") || cleanText.includes("ayuda") || cleanText.includes("hola") || cleanText.includes("empezar")) return getMainMenu();

    return processAddToCart(cleanText);
}

function processAddToCart(cleanText) {
    const inventory = window.shopData.products;
    let foundProduct = null;

    inventory.forEach(prod => {
        if (cleanText.includes(removeAccents(prod.name.toLowerCase()))) {
            foundProduct = prod;
        }
    });

    if (!foundProduct) {
        return {
            text: "😕 No te he entendido. ¿Quizás querías decir alguna de estas cosas?",
            commands: ["1. 📦 Consultar catálogo", "2. 🚚 Gastos de envío", "4. ➕ Añadir a la cesta"]
        };
    }

    const featureKey = removeAccents(foundProduct.feature.toLowerCase());
    
    if (cleanText.includes(featureKey)) {
        return addToCart(foundProduct);
    } else {
        chatState.pendingProduct = foundProduct;
        chatState.conversationStage = 'WAITING_SPECIFICATION';
        return {
            text: `Tenemos <b>${foundProduct.name}</b>, pero... ¿buscas el modelo <b>"${foundProduct.feature}"</b>? Por favor, confirma.`,
            commands: ["✅ Sí, ese modelo", "❌ No, cancelar"]
        };
    }
}

function handleSpecificationLogic(userText) {
    const cleanText = removeAccents(userText.toLowerCase());
    const pending = chatState.pendingProduct;

    chatState.conversationStage = 'IDLE'; 
    chatState.pendingProduct = null;

    if (!pending) return getMainMenu();

    const affirmations = ["si", "ese", "claro", "vale", "correcto", "perfecto", "ok", "confirmar"];
    const isAffirmative = affirmations.some(word => cleanText.includes(word));
    const mentionsFeature = cleanText.includes(removeAccents(pending.feature.toLowerCase()));

    if (isAffirmative || mentionsFeature) {
        return addToCart(pending);
    } else {
        return {
            text: "Entendido, operación cancelada. ¿Qué quieres hacer ahora?",
            commands: ["1. 📦 Ver catálogo", "4. ➕ Comprar otra cosa"]
        };
    }
}

function addToCart(prod) {
    chatState.cart.push(prod);
    return {
        text: `✅ He añadido <b>${prod.name} ${prod.feature}</b> (${prod.price}€) a tu cesta.<br>Llevas ${chatState.cart.length} artículos.`,
        commands: ["🛒 Ver cesta", "💳 Finalizar compra", "4. ➕ Añadir otro"]
    };
}

function showCart() {
    if (chatState.cart.length === 0) return "Tu cesta está vacía 🛒.";

    let html = "<b>🛒 Tu Cesta:</b><br>";
    let subtotal = 0;

    chatState.cart.forEach(p => {
        html += `- ${p.name} ${p.feature}: ${p.price}€<br>`;
        subtotal += parseFloat(p.price);
    });

    html += `<br><b>Subtotal: ${subtotal}€</b>`;
    return {
        text: html,
        commands: ["💳 Finalizar compra", "4. ➕ Añadir más productos"]
    };
}

function processCheckout() {
    if (chatState.cart.length === 0) return "No puedes pagar porque la cesta está vacía.";

    let subtotal = 0;
    chatState.cart.forEach(p => subtotal += parseFloat(p.price));

    const shipping = subtotal > 50 ? 0 : 5;
    const total = subtotal + shipping;

    let receipt = `<div class="receipt-box">`;
    receipt += `<div style="text-align:center; margin-bottom:10px;">--- TICKET DE COMPRA ---</div>`;
    chatState.cart.forEach(p => {
        receipt += `<div class="receipt-line"><span>${p.name}</span><span>${p.price}€</span></div>`;
    });
    receipt += `<div class="receipt-line" style="color:#666; margin-top:5px;"><span>Envío</span><span>${shipping === 0 ? 'GRATIS' : '5.00€'}</span></div>`;
    receipt += `<div class="receipt-line receipt-total"><span>TOTAL</span><span>${total}€</span></div>`;
    receipt += `<div style="text-align:center; margin-top:10px; font-size:0.8rem;">Gracias por su visita</div>`;
    receipt += `</div>`;

    chatState.cart = [];
    return {
        text: receipt,
        commands: ["1. 📦 Volver al catálogo", "3. 🔄 Gestionar devolución"]
    };
}

function updateCartUI() {
    const countEl = document.getElementById('cart-count');
    if(countEl) countEl.innerText = chatState.cart.length;
}

function handleReturnProductInput(text) {
    const cleanText = removeAccents(text.toLowerCase());
    const inventory = window.shopData.products;

    const foundProduct = inventory.find(p => 
        cleanText.includes(removeAccents(p.name.toLowerCase()))
    );

    if (foundProduct) {
        chatState.conversationStage = 'WAITING_DATE';
        
        return `Entendido, tramitando devolución de: <b>${foundProduct.name}</b>.<br>Ahora necesito la <b>fecha de compra</b> (DD/MM/AAAA) para verificar la garantía.`;
    } else {
        if (cleanText.includes("cancelar") || cleanText.includes("menu")) {
            chatState.conversationStage = 'IDLE';
            return getMainMenu();
        }

        return "❌ <b>Error:</b> Ese artículo no pertenece a la tienda o no está en el inventario.<br>Por favor, revisa si lo has escrito correctamente o escribe 'Cancelar' para salir.";
    }
}

function handleReturnDateLogic(dateText) {
    const parts = dateText.split('/');
    if (parts.length !== 3) {
        return "❌ Formato incorrecto. Por favor usa DD/MM/AAAA (ej: 15/01/2026).";
    }

    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    const purchaseDate = new Date(year, month, day);
    const today = new Date();

    if (isNaN(purchaseDate.getTime())) return "❌ Fecha no válida.";

    const diffTime = Math.abs(today - purchaseDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    chatState.conversationStage = 'IDLE';

    if (diffDays <= 14) {
        return `✅ <b>Devolución Aceptada</b> (Han pasado ${diffDays} días). Te enviamos la etiqueta de retorno al email.`;
    } else {
        return `⛔ <b>Devolución Rechazada</b> (Han pasado ${diffDays} días. El límite legal son 14).`;
    }
}

function getMainMenu() {
    return {
        text: `¡Hola! Soy el asistente virtual de <b>${window.shopData.name || 'la tienda'}</b>.`,
        commands: ["1. 📦 Consultar catálogo", "2. 🚚 Gastos de envío", "3. 🔄 Devolución", "4. ➕ Añadir a la cesta"]
    };
}

function addBubble(text, type) {
    const container = document.getElementById('chat-history-container');
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble bubble-${type}`;
    bubble.innerHTML = text;
    container.appendChild(bubble);
    container.scrollTop = container.scrollHeight;
}

function addBubbleWithCommands(text, commands) {
    const container = document.getElementById('chat-history-container');
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble bubble-bot`;
    
    let html = text + `<div class="command-list">`;
    commands.forEach(cmd => {
        let cleanCmd = cmd.replace(/^[0-9.]+\s/, '').replace(/^[^\w\s]/, '').trim();
        let valToSend = cmd;
        
        if(cmd.includes("Cesta")) valToSend = "ver cesta";
        if(cmd.includes("Finalizar")) valToSend = "finalizar";
        if(cmd.includes("Añadir")) valToSend = cmd; 
        if(cmd.includes("Consultar")) valToSend = "1";
        if(cmd.includes("Gastos")) valToSend = "2";
        if(cmd.includes("Devolución")) valToSend = "3";
        if(cmd.includes("Sí,")) valToSend = "si"; 
        if(cmd.includes("No,")) valToSend = "no";
        if(cmd.includes("4.")) valToSend = "4";

        html += `<div class="command-item" onclick="simulateUserClick('${valToSend}')">${cmd}</div>`;
    });
    html += `</div>`;

    bubble.innerHTML = html;
    container.appendChild(bubble);
    container.scrollTop = container.scrollHeight;
}

window.simulateUserClick = function(text) {
    const inputEl = document.getElementById('sim-user-input');
    inputEl.value = text;
    handleUserMessage();
}

function showTyping(show) {
    const indicator = document.getElementById('typing-indicator');
    if(indicator) indicator.style.display = show ? 'block' : 'none';
}

document.getElementById('sim-user-input')?.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') window.handleUserMessage();
});

window.initChatGreeting = function() {
    const container = document.getElementById('chat-history-container');
    showTyping(false);
    if(container.children.length === 0) {
        const menu = getMainMenu();
        addBubbleWithCommands(menu.text, menu.commands);
    }
    updateCartUI();
}