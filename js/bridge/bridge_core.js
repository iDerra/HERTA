window.BridgeCore = {
    // Estado del juego
    currentLevelIdx: 0,
    activeLevelSequence: [],
    currentSequenceIndex: 0,
    tutorialCompleted: false,

    // Crafteo
    inventory: [],
    selectedItemIdx: null,
    levelMatrix: [],
    placedItems: [],
    robotPos: { r: 0, c: 0 },
    eraserMode: false,

    // Matter.js
    engine: null,
    robotBody: null,
    physicsInterval: null,
    isSimulating: false,
    SCALE: 50, // Factor para escalar bloques de la grilla 1x1 a dimensiones estables del motor físico
    CELL_SIZE: 50, // Alias necesario para que bridge_ui.js y css antiguo funcionen sin problemas

    init: function () {
        this.tutorialCompleted = localStorage.getItem('herta_bridge_tutorial_completed') === 'true';
        this.generateSequence();
        this.currentSequenceIndex = 0;

        // Instanciar el motor de física de Matter.js
        this.engine = Matter.Engine.create();
        this.engine.world.gravity.y = 1.5; // Gravedad equilibrada (intermedia) para no aplastarlo en las rampas

        this.loadLevelSequence(this.currentSequenceIndex);
    },

    generateSequence: function (forceTutorial = false) {
        let playTutorial = forceTutorial || !this.tutorialCompleted;
        let randomLevels = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

        for (let i = randomLevels.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [randomLevels[i], randomLevels[j]] = [randomLevels[j], randomLevels[i]];
        }

        if (playTutorial) {
            this.activeLevelSequence = [0, 1].concat(randomLevels);
        } else {
            this.activeLevelSequence = randomLevels;
        }
    },

    skipLevel: function () {
        if (this.isSimulating) this.toggleSimulation();
        this.currentSequenceIndex++;
        if (this.currentSequenceIndex < this.activeLevelSequence.length) {
            this.loadLevelSequence(this.currentSequenceIndex);
        } else {
            this.winLevel(true);
        }
    },

    playTutorial: function () {
        if (this.isSimulating) this.toggleSimulation();
        this.generateSequence(true);
        this.currentSequenceIndex = 0;
        this.loadLevelSequence(this.currentSequenceIndex);
    },

    loadLevelSequence: function (seqIdx) {
        if (seqIdx >= this.activeLevelSequence.length) {
            return location.href = '../index.html';
        }

        const realLevelIdx = this.activeLevelSequence[seqIdx];
        this.currentLevelIdx = realLevelIdx;

        const btnTutorial = document.getElementById('btn-tutorial');
        const btnSkip = document.getElementById('btn-skip');
        if (btnTutorial && btnSkip) {
            if (realLevelIdx === 0 || realLevelIdx === 1) {
                if (this.tutorialCompleted) {
                    btnTutorial.classList.add('hidden');
                } else {
                    btnTutorial.classList.add('hidden');
                }
                btnSkip.classList.add('hidden');
            } else {
                btnTutorial.classList.remove('hidden');
                btnSkip.classList.remove('hidden');
            }
        }

        this.loadLevel(realLevelIdx);
        document.getElementById('level-val').innerText = (seqIdx + 1) + " / " + this.activeLevelSequence.length;
    },

    loadLevel: function (idx) {
        const levelData = window.BridgeLevels[idx];
        if (!levelData) return;

        const canvas3d = document.getElementById('sim-3d-canvas');
        if (canvas3d) canvas3d.classList.add('hidden');
        document.getElementById('level-grid').classList.remove('hidden');

        const zoomControls = document.getElementById('zoom-controls');
        if (zoomControls) zoomControls.classList.add('hidden');

        this.isSimulating = false;
        this.inventory = [];
        this.placedItems = [];
        clearInterval(this.physicsInterval);

        // IMPRESCINDIBLE: Limpiar todos los objetos del motor físico del nivel anterior
        if (this.engine) {
            Matter.Events.off(this.engine, 'collisionStart');
            Matter.World.clear(this.engine.world, false);
            this.robotBody = null;
        }

        this.levelMatrix = levelData.matrixCenter.map(row => row.split(''));

        for (let r = 0; r < this.levelMatrix.length; r++) {
            for (let c = 0; c < this.levelMatrix[r].length; c++) {
                if (this.levelMatrix[r][c] === 'o') {
                    this.robotPos = { r: r, c: c };
                    this.levelMatrix[r][c] = '.'; // Retiramos al jugador visualmente de la celda matrix general
                }
            }
        }

        this.renderAll();
        document.querySelector('.btn-play').innerText = "▶ SIMULAR";
        this.eraserMode = false;
        const btnEraser = document.getElementById('btn-eraser');
        if (btnEraser) btnEraser.classList.remove('active');
        const grid = document.getElementById('level-grid');
        if (grid) grid.style.cursor = '';
    },

    pendingBlock: null,

    initCrafting: function () {
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

        const challengeType = Math.floor(Math.random() * 6);

        if (type === 'rect') {
            switch (challengeType) {
                case 0:
                    question = `Calcula el <b>área</b> de este bloque (${b}m x ${h}m).`;
                    answer = b * h;
                    unit = "m²";
                    break;
                case 1:
                    question = `Calcula el <b>perímetro</b> total del bloque (${b}m x ${h}m).`;
                    answer = (2 * b) + (2 * h);
                    unit = "m";
                    break;
                case 2: {
                    const price = 5;
                    question = `El material de este bloque (${b * h}m²) cuesta <b>${price}€/m²</b>. ¿Cuál es el coste total?`;
                    answer = (b * h) * price;
                    unit = "€";
                    break;
                }
                case 3:
                    question = `Si decides cortar a la <b>mitad</b> el bloque (${b}m x ${h}m), ¿cuántos metros cuadrados tiene ahora?`;
                    answer = (b * h) / 2;
                    unit = "m²";
                    break;
                case 4:
                    question = `El bloque de ${b * h}m² tiene un sobrecoste del <b>10%</b> sobre su área. ¿A cuánto equivale ese 10%?`;
                    answer = (b * h) * 0.1;
                    unit = "m²";
                    break;
                case 5: {
                    const depth = Math.floor(Math.random() * 5);
                    question = `Calcula el <b>volumen</b> total si esta pieza de ${b}m x ${h}m tiene una profundidad 3D de <b>${depth}m</b>.`;
                    answer = b * h * depth;
                    unit = "m³";
                    break;
                }
            }
        } else {
            // Triangle logic
            switch (challengeType) {
                case 0:
                    question = `Calcula el <b>área</b> de esta rampa triangular (Base ${b}m, Altura ${h}m). Formula: (base·altura)/2`;
                    answer = (b * h) / 2;
                    unit = "m²";
                    break;
                case 1: {
                    const price = 10;
                    question = `Este material en pendiente cuesta <b>${price}€/m²</b>. ¿Coste total de la rampa de ${b * h / 2}m²?`;
                    answer = ((b * h) / 2) * price;
                    unit = "€";
                    break;
                }
                case 2: {
                    const depthTri = Math.floor(Math.random() * 5);
                    question = `Calcula el <b>volumen</b> de la rampa (${b}m x ${h}m) asumiendo una profundidad de <b>${depthTri}m</b>. (Fórmula: (base·altura)/2·profundidad)`;
                    answer = ((b * h) / 2) * depthTri;
                    unit = "m³";
                    break;
                }
                case 3:
                    question = `Van a pintar una línea que cubre <b>un cuarto (1/4)</b> del área visible de la rampa (${b * h / 2}m²). ¿Cuántos m² se pintan?`;
                    answer = ((b * h) / 2) / 4;
                    unit = "m²";
                    break;
                default:
                    question = `Si reduces la altura de la rampa a la <b>mitad</b>, ¿cuál sería su nueva área? (Base ${b}m, Altura original ${h}m)`;
                    answer = (b * (h / 2)) / 2;
                    unit = "m²";
                    break;
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

    verifyAndCraft: function () {
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

    cancelCrafting: function () {
        this.pendingBlock = null;
        document.getElementById('config-step').classList.remove('hidden');
        document.getElementById('challenge-step').classList.add('hidden');
        document.getElementById('challenge-error').innerText = '';
    },

    selectItem: function (idx) {
        this.selectedItemIdx = (this.selectedItemIdx === idx) ? null : idx;
        window.BridgeUI.highlightInventory(this.selectedItemIdx);
    },

    placeBlock: function (clickR, clickC) {
        // Si el modo borrador está activo, borrar en lugar de colocar
        if (this.eraserMode) {
            this.eraseBlock(clickR, clickC);
            return;
        }

        if (this.selectedItemIdx === null || this.isSimulating) return;

        const item = this.inventory[this.selectedItemIdx];

        // Validar inclinación máxima de rampas: si h > w la pendiente supera 45° y el vehículo no puede subirla
        if (item.type === 'tri' && item.h > item.w) {
            return alert("⚠️ Rampa demasiado empinada. La inclinación máxima es 1:1 (45°). Usa una base ≥ altura.");
        }

        const startR = clickR - item.h + 1;
        const startC = clickC;

        for (let j = 0; j < item.w; j++) {
            let colHeight = item.h;
            if (item.type === 'tri') {
                colHeight = Math.ceil(((j + 1) / item.w) * item.h);
            }

            for (let k = 0; k < colHeight; k++) {
                const targetR = (startR + item.h - 1) - k;
                const targetC = startC + j;

                if (targetR < 0 || targetR >= this.levelMatrix.length || targetC >= this.levelMatrix[0].length) {
                    return alert("Se sale del mapa");
                }
                const cell = this.levelMatrix[targetR][targetC];
                if (cell !== '.' && cell !== 'w') return alert("Espacio ocupado");
            }
        }

        // Detectar si hay un bloque sólido 'x' a la izquierda de la rampa (solo para triángulos)
        let mirrored = false;
        if (item.type === 'tri') {
            const leftC = startC - 1;
            if (leftC >= 0) {
                // Comprobar si alguna fila de la rampa tiene un 'x' a la izquierda
                for (let r = startR; r <= startR + item.h - 1; r++) {
                    if (r >= 0 && r < this.levelMatrix.length && this.levelMatrix[r][leftC] === 'x') {
                        mirrored = true;
                        break;
                    }
                }
            }
        }

        for (let j = 0; j < item.w; j++) {
            let colHeight = item.h;
            if (item.type === 'tri') {
                if (mirrored) {
                    // Rampa reflejada: la altura crece de derecha a izquierda
                    colHeight = Math.ceil(((item.w - j) / item.w) * item.h);
                } else {
                    colHeight = Math.ceil(((j + 1) / item.w) * item.h);
                }
            }

            for (let k = 0; k < colHeight; k++) {
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
            h: item.h,
            mirrored: mirrored
        });

        this.inventory.splice(this.selectedItemIdx, 1);
        this.selectedItemIdx = null;
        this.renderAll();
    },

    toggleEraser: function () {
        if (this.isSimulating) return;
        this.eraserMode = !this.eraserMode;
        this.selectedItemIdx = null; // Deseleccionar inventario al entrar en modo borrado
        const btn = document.getElementById('btn-eraser');
        if (btn) btn.classList.toggle('active', this.eraserMode);
        // Cambiar cursor del grid
        const grid = document.getElementById('level-grid');
        if (grid) grid.style.cursor = this.eraserMode ? 'cell' : '';
        this.renderAll();
    },

    eraseBlock: function (clickR, clickC) {
        // Buscar qué placed item cubre la celda (clickR, clickC)
        const idx = this.placedItems.findIndex(item => {
            const endR = item.r + item.h - 1;
            const endC = item.c + item.w - 1;
            return clickR >= item.r && clickR <= endR && clickC >= item.c && clickC <= endC;
        });

        if (idx === -1) return; // No hay pieza aquí

        const item = this.placedItems[idx];

        // Devolver al inventario
        this.inventory.push({
            type: item.type,
            w: item.w,
            h: item.h,
            id: Date.now(),
            char: item.type === 'rect' ? 'r' : 't'
        });

        // Limpiar celdas del levelMatrix
        for (let j = 0; j < item.w; j++) {
            let colHeight = item.h;
            if (item.type === 'tri') {
                if (item.mirrored) {
                    colHeight = Math.ceil(((item.w - j) / item.w) * item.h);
                } else {
                    colHeight = Math.ceil(((j + 1) / item.w) * item.h);
                }
            }
            for (let k = 0; k < colHeight; k++) {
                const targetR = (item.r + item.h - 1) - k;
                const targetC = item.c + j;
                if (targetR >= 0 && targetR < this.levelMatrix.length &&
                    targetC >= 0 && targetC < this.levelMatrix[0].length) {
                    const cell = this.levelMatrix[targetR][targetC];
                    if (cell === 'r' || cell === 't') {
                        this.levelMatrix[targetR][targetC] = '.';
                    }
                }
            }
        }

        this.placedItems.splice(idx, 1);
        this.renderAll();
    },

    renderAll: function () {
        window.BridgeUI.renderGrid(this.levelMatrix);
        window.BridgeUI.renderPlacedItems(this.placedItems);
        window.BridgeUI.renderInventory();

        // Simplemente ponemos el robot CSS visual estático en base
        const robot = document.getElementById('robot');
        if (robot && !this.isSimulating) {
            robot.style.top = (this.robotPos.r * this.SCALE) + 'px';
            robot.style.left = (this.robotPos.c * this.SCALE) + 'px';
            robot.style.transform = `scale(1) rotate(0deg)`;
        }
    },

    toggleSimulation: function () {
        if (this.isSimulating) {
            clearInterval(this.physicsInterval);
            Matter.Events.off(this.engine, 'collisionStart');
            Matter.World.clear(this.engine.world, false); // No deep, solo limpiar objetos
            this.robotBody = null;

            const canvas3d = document.getElementById('sim-3d-canvas');
            if (canvas3d) canvas3d.classList.add('hidden');
            document.getElementById('level-grid').classList.remove('hidden');

            const zoomControls = document.getElementById('zoom-controls');
            if (zoomControls) zoomControls.classList.add('hidden');

            this.loadLevelSequence(this.currentSequenceIndex);
            return;
        }

        this.isSimulating = true;
        document.querySelector('.btn-play').innerText = "⏹ REINICIAR";

        document.getElementById('level-grid').classList.add('hidden');

        // Mostrar pantalla de carga
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) loadingOverlay.classList.remove('hidden');

        // Construir la escena física de inmediato (es inmediato y no consume asincronía)
        this.buildPhysicsWorld();

        const startSim = () => {
            // Ocultar pantalla de carga
            if (loadingOverlay) loadingOverlay.classList.add('hidden');

            // Loop principal del motor físico
            const fps = 60;
            const timeStep = 1000 / fps;

            this.physicsInterval = setInterval(() => {
                Matter.Engine.update(this.engine, timeStep);

                if (this.robotBody) {
                    // Empuje de control ajustado (-25% velocidad)
                    if (this.robotBody.velocity.x < 2.1) {
                        Matter.Body.applyForce(this.robotBody, this.robotBody.position, { x: 0.01, y: 0 });
                    }

                    // Detector de caídas al abismo
                    if (this.robotBody.position.y > this.levelMatrix.length * this.SCALE + 500) {
                        this.failLevel("¡Te has caído al vacío!");
                    }
                }
            }, timeStep);
        };

        const canvas3d = document.getElementById('sim-3d-canvas');
        if (canvas3d) {
            canvas3d.classList.remove('hidden');
            const zoomControls = document.getElementById('zoom-controls');
            if (zoomControls) zoomControls.classList.remove('hidden');

            window.dispatchEvent(new Event('resize'));

            // Iniciar buildScene que cargará el coche. Cuando termine, lanzamos el bucle físico.
            window.Bridge3D.buildScene(this.levelMatrix, startSim);
        } else {
            // Si no hubiera canvas 3D (modo 2d base), iniciar física del tirón
            startSim();
        }
    },

    buildPhysicsWorld: function () {
        const S = this.SCALE;
        const rows = this.levelMatrix.length;
        const cols = this.levelMatrix[0].length;

        const bodies = [];

        // 1. Matriz de bloques fijos (Tierra, Agua, Meta)
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const cell = this.levelMatrix[r][c];
                if (cell === 'x') {
                    // Cuerpo estático tierra
                    bodies.push(Matter.Bodies.rectangle(c * S + S / 2, r * S + S / 2, S, S, {
                        isStatic: true,
                        friction: 0.1, // Baja fricción para facilitar deslizar
                        restitution: 0.0 // No rebotar
                    }));
                } else if (cell === 'n') {
                    // Cuerpo estático rampa de tierra (Sube hacia la derecha)
                    const vertices = [
                        { x: -S / 2, y: S / 2 },  // Esquina inferior izquierda
                        { x: S / 2, y: S / 2 },   // Esquina inferior derecha
                        { x: S / 2, y: -S / 2 }   // Esquina superior derecha
                    ];
                    bodies.push(Matter.Bodies.fromVertices(c * S + S / 2, r * S + S / 2, [vertices], {
                        isStatic: true,
                        friction: 0.1,
                        restitution: 0.0
                    }, true));
                } else if (cell === 'w') {
                    // Detector agua (Sensor)
                    bodies.push(Matter.Bodies.rectangle(c * S + S / 2, r * S + S / 2, S, S, {
                        isStatic: true, isSensor: true, label: "agua"
                    }));
                } else if (cell === 'm') {
                    // Detector meta (Sensor)
                    bodies.push(Matter.Bodies.rectangle(c * S + S / 2, r * S + S / 2, S, S, {
                        isStatic: true, isSensor: true, label: "meta"
                    }));
                }
            }
        }

        // 2. Placed Items (Rectángulos y Triángulos que puso el jugador)
        this.placedItems.forEach(item => {
            if (item.type === 'rect') {
                const w = item.w * S;
                const h = item.h * S;
                const cX = item.c * S + w / 2;
                const cY = item.r * S + h / 2;
                bodies.push(Matter.Bodies.rectangle(cX, cY, w, h, {
                    isStatic: true, friction: 0.1
                }));
            } else if (item.type === 'tri') {
                const w = item.w * S;
                const h = item.h * S;
                let verts;
                if (item.mirrored) {
                    // Rampa reflejada: cuña que sube de derecha a izquierda (baja hacia la derecha)
                    // Esquina inferior izq(0,h), esquina inferior der(w,h), esquina superior izq(0,0)
                    verts = [{ x: 0, y: h }, { x: w, y: h }, { x: 0, y: 0 }];
                } else {
                    // Rampa normal: cuña que sube hacia la derecha
                    // Esquina inferior izq(0,h), esquina inferior der(w,h), esquina superior der(w,0)
                    verts = [{ x: 0, y: h }, { x: w, y: h }, { x: w, y: 0 }];
                }
                const vBody = Matter.Bodies.fromVertices(0, 0, [verts], { isStatic: true, friction: 0.1 });

                // Alinearlo a sus límites
                const targetMinX = item.c * S;
                const targetMaxY = (item.r + item.h) * S;
                Matter.Body.setPosition(vBody, {
                    x: vBody.position.x + (targetMinX - vBody.bounds.min.x),
                    y: vBody.position.y + (targetMaxY - vBody.bounds.max.y)
                });
                bodies.push(vBody);
            }
        });

        // 3. Vehiculo
        // carW aumentado a 0.8 para evitar que las curvas de sus bordes (chamfer) se solapen y se clave en las rampas
        const carW = S * 0.8;
        const carH = S * 0.7;
        const carX = this.robotPos.c * S + S / 2;
        // Posar el coche milimétricamente encima de su cuadrícula base
        const carY = this.robotPos.r * S + (S - carH / 2) - 0.5;

        this.robotBody = Matter.Bodies.rectangle(carX, carY, carW, carH, {
            mass: 2,
            friction: 0.0, // ESTO ERA CLAVE: Sin ruedas de verdad, una caja con fricción se "lija" contra la rampa y se frena.
            frictionAir: 0.001,
            restitution: 0.0,
            chamfer: { radius: carH * 0.4 }, // Curvas mágicas para deslizarse suave
            label: "robot",
            inertia: Infinity // Evitamos vueltas de campana
        });

        bodies.push(this.robotBody);

        // Agregar todo al mundo
        Matter.World.add(this.engine.world, bodies);

        // 4. Configurar Triggers (Ganar o perder)
        Matter.Events.on(this.engine, 'collisionStart', (event) => {
            const pairs = event.pairs;
            for (let i = 0; i < pairs.length; i++) {
                const bodyA = pairs[i].bodyA;
                const bodyB = pairs[i].bodyB;

                if (bodyA.label === "robot" || bodyB.label === "robot") {
                    const other = bodyA.label === "robot" ? bodyB : bodyA;

                    if (other.label === "agua") {
                        this.failLevel("¡Chapuzón!");
                    } else if (other.label === "meta") {
                        this.winLevel();
                    }
                }
            }
        });
    },

    failLevel: function (msg) {
        clearInterval(this.physicsInterval);
        Matter.Events.off(this.engine, 'collisionStart');

        const overlay = document.getElementById('msg-overlay');
        const title = document.getElementById('msg-title');
        const btn = overlay.querySelector('button');

        title.innerText = msg || "¡Qué golpe!";
        btn.innerText = "Reintentar";
        btn.onclick = () => {
            overlay.classList.add('hidden');
            this.toggleSimulation(); // Apaga la sim actual
        };

        overlay.classList.remove('hidden');
    },

    winLevel: function (forcedEnd = false) {
        clearInterval(this.physicsInterval);
        Matter.Events.off(this.engine, 'collisionStart');

        if (this.activeLevelSequence[this.currentSequenceIndex] === 1) {
            localStorage.setItem('herta_bridge_tutorial_completed', 'true');
            this.tutorialCompleted = true;
        }

        const overlay = document.getElementById('msg-overlay');
        const title = document.getElementById('msg-title');
        const btn = overlay.querySelector('button');

        if (forcedEnd || this.currentSequenceIndex >= this.activeLevelSequence.length - 1) {
            title.innerText = "¡Juego Completado! 🎉";
            btn.innerText = "Volver al Menú";
            btn.onclick = () => location.href = '../index.html';
        } else {
            title.innerText = "¡Nivel Completado!";
            btn.innerText = "Siguiente Nivel ➡";
            btn.onclick = () => window.BridgeCore.nextLevel();
        }

        overlay.classList.remove('hidden');
    },

    nextLevel: function () {
        document.getElementById('msg-overlay').classList.add('hidden');
        this.currentSequenceIndex++;
        if (this.currentSequenceIndex < this.activeLevelSequence.length) {
            this.loadLevelSequence(this.currentSequenceIndex);
        } else {
            location.href = '../index.html';
        }
    }
};

document.addEventListener('DOMContentLoaded', () => window.BridgeCore.init());