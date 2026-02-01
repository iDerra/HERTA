window.BridgeCore = {
    currentLevelIdx: 0,
    inventory: [],
    selectedItemIdx: null,
    levelMatrix: [], 
    placedItems: [], 
    robotPos: { r: 0, c: 0 },
    isSimulating: false,
    simulationInterval: null,
    CELL_SIZE: 40,

    init: function() {
        this.currentLevelIdx = 0;
        this.loadLevel(this.currentLevelIdx);
    },

    loadLevel: function(idx) {
        const levelData = window.BridgeLevels[idx];
        if(!levelData) return;

        document.getElementById('level-val').innerText = idx + 1;
        this.isSimulating = false;
        this.inventory = [];
        this.placedItems = [];
        clearInterval(this.simulationInterval);

        this.levelMatrix = levelData.matrix.map(row => row.split(''));

        for(let r=0; r<this.levelMatrix.length; r++) {
            for(let c=0; c<this.levelMatrix[r].length; c++) {
                if(this.levelMatrix[r][c] === 'o') {
                    this.robotPos = { r: r, c: c };
                    this.levelMatrix[r][c] = '.'; 
                }
            }
        }

        this.renderAll();
        document.querySelector('.btn-play').innerText = "▶ SIMULAR";
    },

    pendingBlock: null,

    initCrafting: function() {
        const b = parseInt(document.getElementById('inp-base').value);
        const h = parseInt(document.getElementById('inp-height').value);
        const type = window.BridgeUI.currentShape;

        if (isNaN(b) || isNaN(h) || b < 1 || h < 1) return alert("Medidas inválidas");

        document.getElementById('config-step').classList.add('hidden');
        document.getElementById('challenge-step').classList.remove('hidden');
        document.getElementById('inp-answer').value = '';
        document.getElementById('challenge-error').innerText = '';

        let question = "";
        let answer = 0;
        let unit = "";

        const challengeType = Math.floor(Math.random() * 4); 

        if (type === 'rect') {
            if (challengeType === 0) {
                question = `Calcula el <b>ÁREA</b> de este bloque (${b}m x ${h}m).`;
                answer = b * h;
                unit = "m²";
            } else if (challengeType === 1) {
                question = `Calcula el <b>PERÍMETRO</b> total del bloque (${b}m x ${h}m).`;
                answer = (2 * b) + (2 * h);
                unit = "m";
            } else if (challengeType === 2) {
                const price = 5;
                question = `El material cuesta <b>${price}€/m²</b>. ¿Cuál es el coste total?`;
                answer = (b * h) * price;
                unit = "€";
            } else {
                const density = 2;
                question = `La densidad es <b>${density}kg/m²</b>. ¿Cuánto pesa el bloque?`;
                answer = (b * h) * density;
                unit = "kg";
            }
        } else { 

            if (challengeType % 2 === 0) {
                question = `Calcula el <b>ÁREA</b> de esta rampa triangular (Base ${b}, Altura ${h}).`;
                answer = (b * h) / 2;
                unit = "m²";
            } else {
                const price = 10;
                question = `Este material reforzado cuesta <b>${price}€/m²</b>. ¿Coste total?`;
                answer = ((b * h) / 2) * price;
                unit = "€";
            }
        }

        this.pendingBlock = {
            w: b, h: h, type: type,
            char: type === 'rect' ? 'r' : 't',
            correctAnswer: answer,
            id: Date.now()
        };

        document.getElementById('challenge-question').innerHTML = question;
        document.getElementById('challenge-unit').innerText = unit;
    },

    verifyAndCraft: function() {
        if (!this.pendingBlock) return;

        const userAns = parseFloat(document.getElementById('inp-answer').value);
        
        if (Math.abs(userAns - this.pendingBlock.correctAnswer) < 0.1) {
            this.inventory.push({ 
                type: this.pendingBlock.type, 
                w: this.pendingBlock.w, 
                h: this.pendingBlock.h, 
                id: this.pendingBlock.id, 
                char: this.pendingBlock.char 
            });
            window.BridgeUI.renderInventory();
            
            this.cancelCrafting();
        } else {
            document.getElementById('challenge-error').innerText = "Incorrecto. Inténtalo de nuevo.";
        }
    },

    cancelCrafting: function() {
        this.pendingBlock = null;
        document.getElementById('config-step').classList.remove('hidden');
        document.getElementById('challenge-step').classList.add('hidden');
        document.getElementById('challenge-error').innerText = '';
    },

    selectItem: function(idx) {
        this.selectedItemIdx = (this.selectedItemIdx === idx) ? null : idx;
        window.BridgeUI.highlightInventory(this.selectedItemIdx);
    },

    placeBlock: function(clickR, clickC) {
        if (this.selectedItemIdx === null || this.isSimulating) return;

        const item = this.inventory[this.selectedItemIdx];
        
        const startR = clickR - item.h + 1;
        const startC = clickC;

        for(let j = 0; j < item.w; j++) {
            let colHeight = item.h;
            if (item.type === 'tri') {
                colHeight = Math.ceil( ( (j + 1) / item.w ) * item.h );
            }

            for(let k = 0; k < colHeight; k++) {
                const targetR = (startR + item.h - 1) - k; 
                const targetC = startC + j;

                if (targetR < 0 || targetR >= this.levelMatrix.length || targetC >= this.levelMatrix[0].length) {
                    return alert("Se sale del mapa");
                }
                const cell = this.levelMatrix[targetR][targetC];
                if (cell !== '.' && cell !== 'w') return alert("Espacio ocupado");
            }
        }

        for(let j = 0; j < item.w; j++) {
            let colHeight = item.h;
            if (item.type === 'tri') {
                colHeight = Math.ceil( ( (j + 1) / item.w ) * item.h );
            }

            for(let k = 0; k < colHeight; k++) {
                const targetR = (startR + item.h - 1) - k; 
                const targetC = startC + j;
                this.levelMatrix[targetR][targetC] = item.char;
            }
        }

        this.placedItems.push({
            type: item.type, 
            r: startR,       
            c: startC,       
            w: item.w,
            h: item.h
        });

        this.inventory.splice(this.selectedItemIdx, 1);
        this.selectedItemIdx = null;
        this.renderAll();
    },

    renderAll: function() {
        window.BridgeUI.renderGrid(this.levelMatrix);
        window.BridgeUI.renderPlacedItems(this.placedItems);
        window.BridgeUI.renderInventory();
        this.updateRobotVisuals();
    },

    toggleSimulation: function() {
        if (this.isSimulating) {
            this.loadLevel(this.currentLevelIdx);
            return;
        }
        this.isSimulating = true;
        document.querySelector('.btn-play').innerText = "⏹ REINICIAR";
        document.getElementById('robot').classList.add('moving');
        this.simulationInterval = setInterval(() => this.stepPhysics(), 400);
    },

    stepPhysics: function() {
        const currR = this.robotPos.r;
        const currC = this.robotPos.c;
        const nextC = currC + 1;

        if (nextC >= this.levelMatrix[0].length) return this.winLevel();
        if (this.levelMatrix[currR][nextC] === 'm') return this.winLevel();

        const currentFloorRow = this.getTopSolidRow(currC, currR + 1);
        
        if (currentFloorRow === null) {
            this.robotPos.r += 1; 
            this.updateRobotVisuals();
            if (currR+1 < this.levelMatrix.length && this.levelMatrix[currR+1][currC] === 'w') this.failLevel("¡Agua!");
            else if (currR+1 >= this.levelMatrix.length) this.failLevel("¡Vacío!");
            return;
        }

        if (currR < currentFloorRow - 1) {
            this.robotPos.r += 1;
            this.updateRobotVisuals();
            return;
        }

        const nextFloorRow = this.getTopSolidRow(nextC, 0);

        if (nextFloorRow === null) {
            this.robotPos.c += 1;
            this.updateRobotVisuals();
            return;
        }

        const rise = currentFloorRow - nextFloorRow; 

        if (rise <= 1) {
            this.robotPos.c += 1;
            this.robotPos.r = nextFloorRow - 1; 
            this.updateRobotVisuals();
            if (this.levelMatrix[this.robotPos.r][this.robotPos.c] === 'm') this.winLevel();
        } else {
            this.failLevel("¡Pendiente demasiado alta!");
        }
    },

    getTopSolidRow: function(col, startSearchRow) {
        for (let r = startSearchRow; r < this.levelMatrix.length; r++) {
            if (r < 0) continue; 
            const cell = this.levelMatrix[r][col];
            if (cell !== '.' && cell !== 'w' && cell !== 'm' && cell !== 'o') {
                return r;
            }
        }
        return null;
    },

    updateRobotVisuals: function() {
        const robot = document.getElementById('robot');
        if(robot) {
            robot.style.top = (this.robotPos.r * this.CELL_SIZE) + 'px';
            robot.style.left = (this.robotPos.c * this.CELL_SIZE) + 'px';
        }
    },

    failLevel: function(msg) {
        clearInterval(this.simulationInterval);
        document.getElementById('robot').classList.add('falling');
        setTimeout(() => alert(msg), 500);
    },
    winLevel: function() {
        clearInterval(this.simulationInterval);
        document.getElementById('robot').classList.remove('moving');
        document.getElementById('msg-overlay').classList.remove('hidden');
    },
    nextLevel: function() {
        document.getElementById('msg-overlay').classList.add('hidden');
        this.currentLevelIdx++;
        if (this.currentLevelIdx < window.BridgeLevels.length) this.loadLevel(this.currentLevelIdx);
        else { alert("¡Juego Terminado!"); location.href = '../index.html'; }
    }
};

document.addEventListener('DOMContentLoaded', () => window.BridgeCore.init());