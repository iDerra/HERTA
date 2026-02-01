let trainState = {
    currentIndex: 0,
    currentTool: 'noun', 
    sentences: [], 
    totalSentences: 5
};

const dummyInventory = [
    { name: "telescopio", feature: "potente", gender: 'M', number: 'S' },
    { name: "poción", feature: "mágica", gender: 'F', number: 'S' },
    { name: "mapas", feature: "estelares", gender: 'M', number: 'P' }, 
    { name: "botas", feature: "gravitatorias", gender: 'F', number: 'P' }
];


window.checkTrainingStatus = function() {
    const btnChat = document.getElementById('btn-chat');
    if (btnChat) {
        const isTrained = window.shopData && window.shopData.isTrained;
        btnChat.disabled = !isTrained;
        btnChat.innerText = isTrained ? "3. Simulación" : "3. Simulación 🔒";
    }
}

window.initTrainingView = function() {
    const unclassified = window.shopData.products.filter(p => !p.gender || !p.number);

    const classUI = document.getElementById('training-classification-ui');
    const gameWrapper = document.getElementById('training-game-wrapper');

    if (unclassified.length > 0) {
        classUI.style.display = 'block';
        gameWrapper.style.display = 'none';
        renderClassificationTable();
    } else {
        classUI.style.display = 'none';
        gameWrapper.style.display = 'block';
        
        const gameUI = document.getElementById('training-game-ui');
        const msgUI = document.getElementById('training-complete-msg');

        if (window.shopData.isTrained && trainState.currentIndex === 0 && trainState.sentences.length === 0) {
            gameUI.style.display = 'none';
            msgUI.style.display = 'block';
        } else {
            if(trainState.sentences.length === 0) window.startTrainingRound();
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

window.saveClassificationAndStart = function() {
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


window.startTrainingRound = function() {
    trainState.currentIndex = 0;
    trainState.sentences = generateSentenceBatch();
    
    document.getElementById('training-game-ui').style.display = 'block';
    document.getElementById('training-complete-msg').style.display = 'none';
    
    loadCurrentSentence();
}

window.selectTool = function(toolType) {
    trainState.currentTool = toolType;
    document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('selected'));
    const activeBtn = document.querySelector(`.tool-btn.tool-${toolType}`);
    if(activeBtn) activeBtn.classList.add('selected');
}


function generateSentenceBatch() {
    const batch = [];
    const userProds = window.shopData.products;
    const mixedInventory = [...userProds, ...dummyInventory];

    for(let i=0; i<trainState.totalSentences; i++) {
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

    const un_una = getIndefinite();
    const el_la = getDefinite();
    const algun = getSome();
    const otro = getOther();

    const templates = [
        {
            words: ["Quiero", un_una, prod.name, prod.feature],
            keys:  ["verb", "det", "noun", "adj"]
        },
        {
            words: ["Busco", el_la, prod.name, prod.feature, "hoy"],
            keys:  ["verb", "det", "noun", "adj", "other"]
        },
        {
            words: ["¿", "Tenéis", algun, prod.name, "?"],
            keys:  ["other", "verb", "det", "noun", "other"]
        },
        {
            words: [el_la.charAt(0).toUpperCase() + el_la.slice(1), prod.name, "es", "muy", prod.feature],
            keys:  ["det", "noun", "verb", "other", "adj"]
        },
        {
             words: ["Enséñame", otro, prod.name, "por favor"],
             keys:  ["verb", "det", "noun", "other"]
        }
    ];

    return templates[Math.floor(Math.random() * templates.length)];
}

function loadCurrentSentence() {
    if (!trainState.sentences || trainState.sentences.length === 0) return;

    const data = trainState.sentences[trainState.currentIndex];
    const container = document.getElementById('sentence-container');
    if(!container) return;
    container.innerHTML = ""; 

    document.getElementById('current-sentence-num').innerText = trainState.currentIndex + 1;
    const bar = document.getElementById('train-progress-fill');
    if(bar) bar.style.width = `${(trainState.currentIndex / trainState.totalSentences) * 100}%`;
    document.getElementById('feedback-msg').innerText = "";

    data.words.forEach((word, index) => {
        const span = document.createElement('span');
        span.innerText = word;
        span.className = 'interactive-word';
        span.dataset.index = index;
        span.dataset.currentTag = 'none'; 
        
        span.addEventListener('click', function() {
            span.classList.remove('tagged-noun', 'tagged-adj', 'tagged-verb', 'tagged-det', 'tagged-other');
            const newTag = trainState.currentTool;
            span.classList.add(`tagged-${newTag}`);
            span.dataset.currentTag = newTag;
        });
        
        container.appendChild(span);
    });
}

window.validateSentence = function() {
    const currentSentence = trainState.sentences[trainState.currentIndex];
    const spans = document.querySelectorAll('.interactive-word');
    let errors = 0;

    spans.forEach((span, i) => {
        const userTag = span.dataset.currentTag;
        const correctTag = currentSentence.keys[i];

        if (userTag !== correctTag) {
            errors++;
            span.style.border = "2px solid #e74c3c"; 
            span.animate([
                { transform: 'translateX(0)' }, { transform: 'translateX(-5px)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(0)' }
            ], { duration: 300 });
        } else {
            span.style.border = "2px solid #2ecc71"; 
        }
    });

    const feedback = document.getElementById('feedback-msg');
    
    if (errors === 0) {
        feedback.innerText = "✨ ¡Perfecto! Análisis correcto.";
        feedback.style.color = "#27ae60";
        setTimeout(() => {
            trainState.currentIndex++;
            if (trainState.currentIndex >= trainState.totalSentences) {
                finishSession();
            } else {
                loadCurrentSentence();
            }
        }, 1500);
    } else {
        feedback.innerText = `❌ Hay ${errors} errores.`;
        feedback.style.color = "#c0392b";
    }
}

function finishSession() {
    if(window.shopData) {
        window.shopData.isTrained = true;
        saveData();
    }
    checkTrainingStatus();
    document.getElementById('training-game-ui').style.display = 'none';
    document.getElementById('training-complete-msg').style.display = 'block';
}