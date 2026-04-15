let chatState = {
    conversationStage: 'IDLE',
    cart: [],
    pendingProduct: null
};

function normalizeText(str) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s]/gi, '').toLowerCase();
}

window.handleUserMessage = function () {
    const inputEl = document.getElementById('sim-user-input');
    const text = inputEl.value.trim();
    if (!text) return;

    addBubble(text, 'user');
    inputEl.value = "";
    showTyping(true);

    setTimeout(() => {
        let response;

        const cleanText = normalizeText(text);

        // Comandos globales de escape
        const abortWords = ["cancelar", "menu", "inicio", "salir", "reiniciar", "volver"];
        if (abortWords.some(w => cleanText === w || cleanText.startsWith(w + " "))) {
            chatState.conversationStage = 'IDLE';
            chatState.pendingProduct = null;
            response = getMainMenu();
        } else {
            if (chatState.conversationStage === 'WAITING_RETURN_PRODUCT') {
                response = handleReturnProductInput(cleanText);
            } else if (chatState.conversationStage === 'WAITING_DATE') {
                response = handleReturnDateLogic(cleanText);
            } else if (chatState.conversationStage === 'WAITING_SPECIFICATION') {
                response = handleSpecificationLogic(cleanText);
            } else {
                response = generateBotResponse(cleanText);
            }
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

function generateBotResponse(cleanText) {

    // Arrays de sinónimos para detectar intenciones
    const intCesta = ["cesta", "carrito", "mis cosas", "pedidos", "bolsa"];
    if (intCesta.some(w => cleanText.includes(w))) return showCart();

    const intCheckout = ["pagar", "finalizar", "cobrar", "caja", "tarjeta", "factura", "terminar", "abonar"];
    if (intCheckout.some(w => cleanText.includes(w))) return processCheckout();

    const intCatalog = ["catalogo", "articulos", "1", "productos", "inventario", "ver", "mostrar", "teneis", "vendeis", "lista", "ofreceis"];
    if (intCatalog.some(w => cleanText.includes(w))) {
        const list = window.shopData.products.map(p => `- ${p.name} (${p.price}€)`).join("<br>");
        return `📦 <b>Artículos disponibles:</b><br>${list}`;
    }

    const intEnvio = ["envio", "gastos", "2", "mandar", "entrega", "domicilio", "transporte", "portes", "mandais"];
    if (intEnvio.some(w => cleanText.includes(w))) return "🚚 <b>Política de Envíos:</b><br>Coste fijo: 5€.<br><b>¡GRATIS</b> si la cesta supera los 50€!";

    const intDevolucion = ["devolver", "devolucion", "3", "retornar", "cambiar", "reembolso", "roto", "mal estado", "defectuoso"];
    if (intDevolucion.some(w => cleanText.includes(w))) {
        chatState.conversationStage = 'WAITING_RETURN_PRODUCT';
        return "🔄 <b>Solicitud de Devolución.</b><br>Por favor, indícame: <b>¿Qué artículo quieres devolver?</b>";
    }

    const inventory = window.shopData.products;

    // Función de búsqueda flexible (palabras parciales o desordenadas)
    const userWords = cleanText.split(/\s+/).filter(w => w.trim().length > 0);
    
    const foundProduct = inventory.find(p => {
        const pNameClean = normalizeText(p.name).trim();
        if (cleanText.includes(pNameClean)) {
            return true;
        } else {
            const pWords = pNameClean.split(/\s+/).filter(w => w.trim().length > 0);
            return pWords.length > 0 && pWords.every(pw => userWords.some(uw => uw.length > 1 && (uw.includes(pw) || pw.includes(uw))));
        }
    });

    if (foundProduct) {
        return processAddToCart(cleanText, foundProduct);
    }

    const intAnadir = ["anadir", "comprar", "4", "adquirir", "llevar", "quiero", "dame", "poner", "agregar", "vender"];
    if (intAnadir.some(w => cleanText.includes(w))) {
        if (inventory.length === 0) return "El catálogo está vacío.";
        const productCommands = inventory.map(p => `➕ Añadir ${p.name} ${p.feature}`);
        return {
            text: "Selecciona un producto para añadirlo directamente a tu cesta:",
            commands: productCommands
        };
    }

    const intSaludos = ["hola", "buenos", "buenas", "empezar", "saludos", "que tal", "ey", "hey"];
    if (intSaludos.some(w => cleanText.includes(w))) return getMainMenu();

    const intGracias = ["gracias", "merci", "agradecido", "genial", "guay", "estupendo", "perfecto", "ok", "vale"];
    if (intGracias.some(w => cleanText.includes(w))) return "¡De nada! ¿En qué más puedo ayudarte?";

    // Fallback: No se entendió el mensaje
    const fallbacks = [
        "😕 Hmm, no estoy seguro de entender eso. ¿Quizás querías ver el catálogo?",
        "No he captado bien lo que buscas. ¿Podrías escribirlo de otra forma o elegir una opción rápida?",
        "¡Vaya! Esa frase no está en mi base de datos actual. ¿Qué tal si empezamos desde el menú?"
    ];

    return {
        text: fallbacks[Math.floor(Math.random() * fallbacks.length)],
        commands: ["1. 📦 Consultar catálogo", "2. 🚚 Gastos de envío", "4. ➕ Añadir a la cesta"]
    };
}

function processAddToCart(cleanText, foundProduct) {
    const featureKey = normalizeText(foundProduct.feature);

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

function handleSpecificationLogic(cleanText) {
    const pending = chatState.pendingProduct;

    chatState.conversationStage = 'IDLE';
    chatState.pendingProduct = null;

    if (!pending) return getMainMenu();

    const affirmations = ["si", "sii", "ese", "claro", "vale", "correcto", "perfecto", "ok", "confirmar", "eso"];
    const isAffirmative = affirmations.some(word => cleanText.includes(word));
    const mentionsFeature = cleanText.includes(normalizeText(pending.feature));

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

    // --- GAMIFICACIÓN: Sumar ventas ---
    playCashRegisterAnimation(subtotal);

    return {
        text: receipt,
        commands: ["1. 📦 Volver al catálogo", "3. 🔄 Gestionar devolución"]
    };
}

function playCashRegisterAnimation(amount) {
    if (window.shopData) {
        window.shopData.salesTotal = (window.shopData.salesTotal || 0) + amount;
        window.shopData.salesCount = (window.shopData.salesCount || 0) + 1;
        saveData(); // Llama a checkQuests() indirectamente
    }

    const cashEl = document.getElementById('total-cash');
    const animContainer = document.getElementById('cash-amount-anim');
    if (cashEl && animContainer) {
        cashEl.innerText = window.shopData.salesTotal.toFixed(2);

        animContainer.classList.remove('cash-pop');
        void animContainer.offsetWidth;
        animContainer.classList.add('cash-pop');
    }
}

function updateCartUI() {
    const countEl = document.getElementById('cart-count');
    if (countEl) countEl.innerText = chatState.cart.length;
}

function handleReturnProductInput(cleanText) {
    const inventory = window.shopData.products;

    const userWords = cleanText.split(/\s+/).filter(w => w.trim().length > 0);
    const foundProduct = inventory.find(p => {
        const pClean = normalizeText(p.name).trim();
        if (cleanText.includes(pClean)) return true;
        const pWords = pClean.split(/\s+/).filter(w => w.trim().length > 0);
        return pWords.length > 0 && pWords.every(pw => userWords.some(uw => uw.length > 1 && (uw.includes(pw) || pw.includes(uw))));
    });

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

function handleReturnDateLogic(cleanText) {
    // Buscar un patrón de fecha, incluso si el texto tiene palabras adicionales
    const match = cleanText.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);

    if (!match) {
        return "❌ Formato incorrecto. Por favor dime la fecha con el formato DD/MM/AAAA (ej: 15/01/2026).";
    }

    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const year = parseInt(match[3], 10);
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
        text: `¡Hola! Soy Herta, el asistente virtual de <b>${escapeHTML(window.shopData.name) || 'la tienda'}</b>.`,
        commands: ["1. 📦 Consultar catálogo", "2. 🚚 Gastos de envío", "3. 🔄 Devolución", "4. ➕ Añadir a la cesta"]
    };
}

function createMessageWrapper(type) {
    const wrapper = document.createElement('div');
    wrapper.className = `chat-message-wrapper wrapper-${type}`;

    const botName = window.shopData && window.shopData.name ? escapeHTML(window.shopData.name) : 'Asistente IA';

    let avatarHTML = '';
    if (type === 'bot') {
        avatarHTML = `
            <div class="chat-avatar-container avatar-bot-container">
                <img src="../images/chatbot_bot.webp" class="chat-avatar" alt="Bot"> 
                <span class="chat-name">Herta</span>
            </div>`;
    } else {
        avatarHTML = `
            <div class="chat-avatar-container avatar-user-container">
                <span class="chat-name">Usuario</span> 
                <div class="chat-avatar emoji-avatar">👤</div>
            </div>`;
    }

    wrapper.innerHTML = avatarHTML;
    return wrapper;
}

function addBubble(text, type) {
    const container = document.getElementById('chat-history-container');
    const wrapper = createMessageWrapper(type);

    const bubble = document.createElement('div');
    bubble.className = `chat-bubble bubble-${type}`;
    if (type === 'user') {
        bubble.innerText = text;
    } else {
        bubble.innerHTML = text;
    }

    wrapper.appendChild(bubble);
    container.appendChild(wrapper);
    container.scrollTop = container.scrollHeight;
}

function addBubbleWithCommands(text, commands) {
    const container = document.getElementById('chat-history-container');
    const wrapper = createMessageWrapper('bot');

    const bubble = document.createElement('div');
    bubble.className = `chat-bubble bubble-bot`;

    let html = text + `<div class="command-list">`;
    commands.forEach(cmd => {
        let cleanCmd = cmd.replace(/^[0-9.]+\s/, '').replace(/^[^\w\s]/, '').trim();
        let valToSend = cmd;

        if (cmd.includes("Cesta")) valToSend = "ver cesta";
        if (cmd.includes("Finalizar")) valToSend = "finalizar";
        if (cmd.includes("Añadir")) valToSend = cmd;
        if (cmd.includes("Consultar")) valToSend = "1";
        if (cmd.includes("Gastos")) valToSend = "2";
        if (cmd.includes("Devolución")) valToSend = "3";
        if (cmd.includes("Sí,")) valToSend = "si";
        if (cmd.includes("No,")) valToSend = "no";
        if (cmd.includes("4.")) valToSend = "4";

        html += `<div class="command-item" onclick="simulateUserClick('${valToSend}')">${cmd}</div>`;
    });
    html += `</div>`;

    bubble.innerHTML = html;
    wrapper.appendChild(bubble);
    container.appendChild(wrapper);
    container.scrollTop = container.scrollHeight;
}

window.simulateUserClick = function (text) {
    const inputEl = document.getElementById('sim-user-input');
    inputEl.value = text;
    handleUserMessage();
}

function showTyping(show) {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) indicator.style.display = show ? 'block' : 'none';
}

document.getElementById('sim-user-input')?.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') window.handleUserMessage();
});

window.initChatGreeting = function () {
    const container = document.getElementById('chat-history-container');
    showTyping(false);
    if (container.children.length === 0) {
        const menu = getMainMenu();
        addBubbleWithCommands(menu.text, menu.commands);
    }
    updateCartUI();

    // Actualizar visual de la caja registradora
    const cashEl = document.getElementById('total-cash');
    if (cashEl && window.shopData) {
        cashEl.innerText = (window.shopData.salesTotal || 0).toFixed(2);
    }
}