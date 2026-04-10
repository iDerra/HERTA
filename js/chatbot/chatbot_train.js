let trainState = {
    currentIndex: 0,
    currentTool: 'noun',
    sentences: [],
    totalSentences: 5,
    isTransitioning: false,
    // Métricas de sesión
    totalErrors: 0,
    totalAttempts: 0,
    sessionStartTime: null
};

const dummyInventory = [
    { name: "telescopio", feature: "potente", gender: 'M', number: 'S' },
    { name: "poción", feature: "mágica", gender: 'F', number: 'S' },
    { name: "mapas", feature: "estelares", gender: 'M', number: 'P' },
    { name: "botas", feature: "gravitatorias", gender: 'F', number: 'P' }
];


window.checkTrainingStatus = function () {
    const btnChat = document.getElementById('btn-chat');
    if (btnChat) {
        const isTrained = window.shopData && window.shopData.isTrained;
        btnChat.disabled = !isTrained;
        const label = btnChat.querySelector('.tab-label');
        if (label) label.textContent = isTrained ? 'Simulación' : 'Simulación 🔒';
    }
}

window.initTrainingView = function () {
    const unclassified = window.shopData.products.filter(p => !p.gender || !p.number);

    const classUI = document.getElementById('training-classification-ui');
    const gameWrapper = document.getElementById('training-game-wrapper');
    const sideAvatar = document.getElementById('train-side-avatar');

    if (unclassified.length > 0) {
        classUI.style.display = 'block';
        gameWrapper.style.display = 'none';
        if(sideAvatar) sideAvatar.style.display = 'block';
        renderClassificationTable();
    } else {
        classUI.style.display = 'none';
        gameWrapper.style.display = 'block';
        if(sideAvatar) sideAvatar.style.display = 'none';

        const gameUI = document.getElementById('training-game-ui');
        const msgUI = document.getElementById('training-complete-msg');

        if (window.shopData.isTrained && trainState.currentIndex === 0 && trainState.sentences.length === 0) {
            gameUI.style.display = 'none';
            msgUI.style.display = 'block';
        } else {
            if (trainState.sentences.length === 0) window.startTrainingRound();
        }
    }
}

function renderClassificationTable() {
    const tbody = document.getElementById('classification-list');
    tbody.innerHTML = '';

    window.shopData.products.forEach(p => {
        const gM = (p.gender === 'M' || !p.gender) ? 'selected' : '';
        const gF = (p.gender === 'F') ? 'selected' : '';

        const nS = (p.number === 'S' || !p.number) ? 'selected' : '';
        const nP = (p.number === 'P') ? 'selected' : '';

        const row = document.createElement('tr');
        row.style.borderBottom = "1px solid #eee";
        row.innerHTML = `
            <td style="padding: 15px; font-weight: bold;">${p.name}</td>
            <td style="padding: 15px;">
                <select id="gender-${p.id}" style="padding: 5px; border-radius: 4px;">
                    <option value="M" ${gM}>Masculino (El/Un)</option>
                    <option value="F" ${gF}>Femenino (La/Una)</option>
                </select>
            </td>
            <td style="padding: 15px;">
                <select id="number-${p.id}" style="padding: 5px; border-radius: 4px;">
                    <option value="S" ${nS}>Singular</option>
                    <option value="P" ${nP}>Plural</option>
                </select>
            </td>
        `;
        tbody.appendChild(row);
    });
}

window.saveClassificationAndStart = function () {
    window.shopData.products.forEach(p => {
        const gSelect = document.getElementById(`gender-${p.id}`);
        const nSelect = document.getElementById(`number-${p.id}`);

        if (gSelect && nSelect) {
            p.gender = gSelect.value;
            p.number = nSelect.value;
        }
    });

    saveData();
    initTrainingView();
}


window.startTrainingRound = function () {
    trainState.currentIndex = 0;
    trainState.sentences = generateSentenceBatch();
    trainState.totalErrors = 0;
    trainState.totalAttempts = 0;
    trainState.sessionStartTime = Date.now();

    document.getElementById('training-game-ui').style.display = 'block';
    document.getElementById('training-complete-msg').style.display = 'none';

    loadCurrentSentence();
}


function generateSentenceBatch() {
    const batch = [];
    const userProds = window.shopData.products;
    const mixedInventory = [...userProds, ...dummyInventory];

    for (let i = 0; i < trainState.totalSentences; i++) {
        const prod = mixedInventory[Math.floor(Math.random() * mixedInventory.length)];
        batch.push(createSentenceTemplate(prod));
    }
    return batch;
}

function createSentenceTemplate(prod) {
    const g = prod.gender;
    const n = prod.number;

    const getIndefinite = () => {
        if (n === 'P') return g === 'F' ? "unas" : "unos";
        return g === 'F' ? "una" : "un";
    };

    const getDefinite = () => {
        if (n === 'P') return g === 'F' ? "las" : "los";
        return g === 'F' ? "la" : "el";
    };

    const getSome = () => {
        if (n === 'P') return g === 'F' ? "algunas" : "algunos";
        return g === 'F' ? "alguna" : "algún";
    }

    const getOther = () => {
        if (n === 'P') return g === 'F' ? "otras" : "otros";
        return g === 'F' ? "otra" : "otro";
    }

    const getThis = () => {
        if (n === 'P') return g === 'F' ? "estas" : "estos";
        return g === 'F' ? "esta" : "este";
    }

    const getThat = () => {
        if (n === 'P') return g === 'F' ? "esas" : "esos";
        return g === 'F' ? "esa" : "ese";
    }

    const un_una = getIndefinite();
    const el_la = getDefinite();
    const algun = getSome();
    const otro = getOther();
    const este_esta = getThis();
    const ese_esa = getThat();

    const es_son = n === 'P' ? "son" : "es";
    const cuesta_cuestan = n === 'P' ? "cuestan" : "cuesta";
    const encanta_encantan = n === 'P' ? "encantan" : "encanta";

    const templates = [
        {
            words: ["Quiero", un_una, prod.name, prod.feature + "."],
            keys: ["verb", "det", "noun", "adj"]
        },
        {
            words: ["Busco", el_la, prod.name, "con", "descuento."],
            keys: ["verb", "det", "noun", "prep", "noun"]
        },
        {
            words: ["¿Tenéis", algun, prod.name, "en", "stock?"],
            keys: ["verb", "det", "noun", "prep", "noun"]
        },
        {
            words: [el_la, prod.name, es_son, "muy", prod.feature + "."],
            keys: ["det", "noun", "verb", "other", "adj"]
        },
        {
            words: ["Enséñame", otro, prod.name, "por", "favor."],
            keys: ["verb", "det", "noun", "prep", "noun"]
        },
        {
            words: ["Compraré", el_la, prod.name, "de", "inmediato."],
            keys: ["verb", "det", "noun", "prep", "other"]
        },
        {
            words: ["¿Cuánto", cuesta_cuestan, este_esta, prod.name + "?"],
            keys: ["other", "verb", "det", "noun"]
        },
        {
            words: ["Me", encanta_encantan, el_la, prod.name, prod.feature + "."],
            keys: ["other", "verb", "det", "noun", "adj"]
        },
        {
            words: ["Necesito", un_una, prod.name, "para", "hoy."],
            keys: ["verb", "det", "noun", "prep", "other"]
        },
        {
            words: ["Ayer", "vi", ese_esa, prod.name, prod.feature + "."],
            keys: ["other", "verb", "det", "noun", "adj"]
        }
    ];

    const selectedTemplate = templates[Math.floor(Math.random() * templates.length)];

    let capitalizeNext = true;
    selectedTemplate.words = selectedTemplate.words.map(word => {
        if (capitalizeNext && /[a-zA-ZáéíóúÁÉÍÓÚñÑ]/.test(word)) {
            const firstLetterMatch = word.match(/[a-zA-ZáéíóúÁÉÍÓÚñÑ]/);
            if (firstLetterMatch) {
                const idx = word.indexOf(firstLetterMatch[0]);
                word = word.substring(0, idx) + word.charAt(idx).toUpperCase() + word.substring(idx + 1);
            }
            capitalizeNext = false;
        }
        if (word.endsWith('.') || word.endsWith('?')) {
            capitalizeNext = true;
        }
        return word;
    });

    return selectedTemplate;
}

function showSpeechBubble(text, type = 'neutral') {
    const bubble = document.getElementById('train-speech-bubble');
    if (!bubble) return;
    bubble.innerText = text;
    
    bubble.className = 'speech-bubble';
    if(type === 'error') bubble.classList.add('error');
    if(type === 'success') bubble.classList.add('success');

    // Animar pulsando
    bubble.animate([
        { transform: 'scale(0.97)' },
        { transform: 'scale(1)' }
    ], { duration: 250, easing: 'ease-out' });
}

function resetSpeechBubble() {
    const left = trainState.totalSentences - trainState.currentIndex;
    
    let text = "¡Hola! Ayúdame a identificar los tipos de palabras.";
    if (trainState.currentIndex === 0) {
        text = "¡Empezamos! Señala cada palabra con la herramienta correcta.";
    } else if (left === 1) {
        text = "¡Ya solo nos queda la última! Tú puedes con ella. Piénsalo bien.";
    } else if (left === 2) {
        text = "¡Muy bien! Ya casi terminamos el entrenamiento, solo quedan dos más.";
    } else {
        text = `¡Sigue así! Nos quedan ${left} oraciones por analizar.`;
    }
    
    showSpeechBubble(text, "neutral");
}

window.selectTool = function(tool) {
    trainState.currentTool = tool;
    const buttons = document.querySelectorAll('.tool-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    
    const activeBtn = document.querySelector(`.tool-btn[data-tool="${tool}"]`);
    if(activeBtn) activeBtn.classList.add('active');
}

function loadCurrentSentence() {
    if (!trainState.sentences || trainState.sentences.length === 0) return;
    
    trainState.isTransitioning = false;

    const data = trainState.sentences[trainState.currentIndex];
    const container = document.getElementById('sentence-container');
    if (!container) return;
    container.innerHTML = "";

    document.getElementById('current-sentence-num').innerText = trainState.currentIndex + 1;
    const bar = document.getElementById('train-progress-fill');
    if (bar) bar.style.width = `${(trainState.currentIndex / trainState.totalSentences) * 100}%`;
    
    resetSpeechBubble();

    data.words.forEach((word, index) => {
        const block = document.createElement('div');
        block.className = 'word-analysis-block interactive-selectable';
        block.dataset.index = index;
        block.dataset.currentTag = 'none';
        block.innerText = word;

        block.addEventListener('click', function () {
            if(!trainState.currentTool) {
                showSpeechBubble("⚠️ ¡Selecciona primero una categoría de la barra!", 'error');
                return;
            }
            // Toggle off if clicking the same tool
            if (this.dataset.currentTag === trainState.currentTool) {
                this.dataset.currentTag = 'none';
                this.className = 'word-analysis-block interactive-selectable';
            } else {
                this.dataset.currentTag = trainState.currentTool;
                this.className = `word-analysis-block interactive-selectable tagged-${trainState.currentTool}`;
            }
        });

        container.appendChild(block);
    });
}

window.validateSentence = function () {
    if (trainState.isTransitioning) return;
    
    const currentSentence = trainState.sentences[trainState.currentIndex];
    const blocks = document.querySelectorAll('.word-analysis-block');
    let errors = 0;

    blocks.forEach((block, i) => {
        const userTag = block.dataset.currentTag;
        const correctTag = currentSentence.keys[i];

        if (userTag !== correctTag) {
            errors++;
            block.style.border = "2px solid #ef4444";
            block.animate([
                { transform: 'translateX(0)' }, { transform: 'translateX(-5px)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(0)' }
            ], { duration: 300 });
        } else {
            block.style.border = "2px solid #22c55e";
        }
    });

    if (errors === 0) {
        showSpeechBubble("✨ ¡Perfecto! El análisis de la oración es correcto. ¡Sigamos con la siguiente!", 'success');
        trainState.isTransitioning = true;
        trainState.totalAttempts++;
        setTimeout(() => {
            trainState.currentIndex++;
            if (trainState.currentIndex >= trainState.totalSentences) {
                finishSession();
            } else {
                loadCurrentSentence();
            }
        }, 2000);
    } else {
        trainState.totalErrors += errors;
        trainState.totalAttempts++;
        showSpeechBubble(`❌ Vaya, he encontrado ${errors} error${errors > 1 ? 'es' : ''}. ¡Inténtalo de nuevo! Revisa que a una palabra no se le haya asignado el tipo que no le corresponde.`, 'error');
    }
}

function finishSession() {
    if (window.shopData) {
        window.shopData.isTrained = true;
        saveData();
    }
    checkTrainingStatus();
    document.getElementById('training-game-ui').style.display = 'none';

    // Calcular métricas
    const elapsedMs = Date.now() - (trainState.sessionStartTime || Date.now());
    const elapsedSec = Math.round(elapsedMs / 1000);
    const minutes = Math.floor(elapsedSec / 60);
    const seconds = elapsedSec % 60;
    const timeStr = minutes > 0
        ? `${minutes}m ${seconds}s`
        : `${seconds}s`;

    const accuracy = trainState.totalAttempts > 0
        ? Math.round(((trainState.totalSentences) / trainState.totalAttempts) * 100)
        : 100;
    const accuracyCapped = Math.min(accuracy, 100);

    const trophy = accuracyCapped === 100 ? '🏆' : accuracyCapped >= 70 ? '🥇' : '🏅';
    const msg = accuracyCapped === 100
        ? '¡Sin ningún error! Análisis impecable. Eres un experto en PLN.'
        : accuracyCapped >= 70
        ? '¡Muy buen trabajo! Tu IA ha aprendido mucho.'
        : 'Ha costado un poco, pero ¡el aprendizaje sigue!';

    const resultEl = document.getElementById('training-complete-msg');
    resultEl.innerHTML = `
        <div class="results-screen">
            <span class="results-trophy">${trophy}</span>
            <h3>¡Entrenamiento Completado!</h3>
            <p>${msg}</p>
            <div class="results-stats">
                <div class="stat-card">
                    <span class="stat-value">${accuracyCapped}%</span>
                    <span class="stat-label">Precisión</span>
                </div>
                <div class="stat-card">
                    <span class="stat-value">${trainState.totalSentences}</span>
                    <span class="stat-label">Oraciones</span>
                </div>
                <div class="stat-card">
                    <span class="stat-value">${trainState.totalErrors}</span>
                    <span class="stat-label">Errores</span>
                </div>
                <div class="stat-card">
                    <span class="stat-value">${timeStr}</span>
                    <span class="stat-label">Tiempo</span>
                </div>
            </div>
            <div class="action-group">
                <button class="btn-secondary" onclick="startTrainingRound()">Repasar de nuevo</button>
                <button class="btn-primary btn-large" onclick="switchTab('tab-chat')">Probar el Chatbot →</button>
            </div>
        </div>`;
    resultEl.style.display = 'block';
}