window.BridgeCore = {
    currentLevelIdx: 0,
    activeLevelSequence: [],
    currentSequenceIndex: 0,
    tutorialCompleted: false,

    inventory: [],
    selectedItemIdx: null,
    levelMatrix: [],
    placedItems: [],
    robotPos: { r: 0, c: 0 },
    eraserMode: false,

    engine: null,
    robotBody: null,
    physicsInterval: null,
    isSimulating: false,
    SCALE: 50,
    CELL_SIZE: 50,

    // Initialize the game engine, load physics settings, and start the level sequence
    init: function () {
        this.tutorialCompleted = localStorage.getItem('herta_bridge_tutorial_completed') === 'true';
        this.generateSequence();
        this.currentSequenceIndex = 0;

        this.engine = Matter.Engine.create();
        this.engine.world.gravity.y = 1.5;

        this.loadLevelSequence(this.currentSequenceIndex);
    },

    // Create a randomized playlist of levels, optionally prepending tutorial stages
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

    // Load and reset level state, converting the text-based matrix into a playable grid
    loadLevel: function (idx) {
        const levelData = window.BridgeLevels[idx];
        if (!levelData) return;

        const canvas3d = document.getElementById('sim-3d-canvas');
        if (canvas3d) canvas3d.classList.add('hidden');
        document.getElementById('level-grid').classList.remove('hidden');

        const zoomControls = document.getElementById('zoom-controls');
        if (zoomControls) zoomControls.classList.add('hidden');
        const zoomControls2D = document.getElementById('zoom-controls-2d');
        if (zoomControls2D) zoomControls2D.classList.remove('hidden');

        if (window.BridgeUI) {
            window.BridgeUI.zoomFactor2D = 1.0;
            window.BridgeUI.applyZoom2D();
        }

        this.isSimulating = false;
        this.inventory = [];
        this.placedItems = [];
        clearInterval(this.physicsInterval);

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
                    this.levelMatrix[r][c] = '.';
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

    // Generate a random math/geometry question based on the selected block dimensions
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
                    question = `Si decides cortar a la <b>mitad</b> el bloque (${b}m x ${h}m), ¿cuál es el nuevo área?`;
                    answer = (b * h) / 2;
                    unit = "m²";
                    break;
                case 4:
                    question = `Al bloque de ${b * h}m² se le tiene que aumentar el área en un <b>10%</b>. ¿A cuántos m² equivale ese 10%?`;
                    answer = (b * h) * 0.1;
                    unit = "m²";
                    break;
                case 5: {
                    const depth = Math.floor(Math.random() * 5);
                    question = `Calcula el <b>volumen</b> total si esta pieza de ${b}m x ${h}m tiene una profundidad de <b>${depth}m</b>.`;
                    answer = b * h * depth;
                    unit = "m³";
                    break;
                }
            }
        } else {
            switch (challengeType) {
                case 0:
                    question = `Calcula el <b>área</b> de esta rampa triangular (Base ${b}m, Altura ${h}m).`;
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
                    question = `Calcula el <b>volumen</b> de la rampa (${b}m x ${h}m) asumiendo una profundidad de <b>${depthTri}m</b>.`;
                    answer = ((b * h) / 2) * depthTri;
                    unit = "m³";
                    break;
                }
                case 3:
                    question = `Van a pintar una línea que cubre <b>un cuarto (1/4)</b> del área visible de la rampa. ¿Cuántos m² se pintan?`;
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

    // Validate user's answer to the math challenge and add the block to their inventory
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

    // Insert the selected block into the grid matrix if space is available and valid
    placeBlock: function (clickR, clickC) {
        if (this.eraserMode) {
            this.eraseBlock(clickR, clickC);
            return;
        }

        if (this.selectedItemIdx === null || this.isSimulating) return;

        const item = this.inventory[this.selectedItemIdx];

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

        let mirrored = false;
        if (item.type === 'tri') {
            const leftC = startC - 1;
            if (leftC >= 0) {
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
        this.selectedItemIdx = null;
        const btn = document.getElementById('btn-eraser');
        if (btn) btn.classList.toggle('active', this.eraserMode);
        const grid = document.getElementById('level-grid');
        if (grid) grid.style.cursor = this.eraserMode ? 'cell' : '';
        this.renderAll();
    },

    // Remove a placed block from the grid and return it to the user's inventory
    eraseBlock: function (clickR, clickC) {
        const idx = this.placedItems.findIndex(item => {
            const endR = item.r + item.h - 1;
            const endC = item.c + item.w - 1;
            return clickR >= item.r && clickR <= endR && clickC >= item.c && clickC <= endC;
        });

        if (idx === -1) return;

        const item = this.placedItems[idx];

        this.inventory.push({
            type: item.type,
            w: item.w,
            h: item.h,
            id: Date.now(),
            char: item.type === 'rect' ? 'r' : 't'
        });

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

        const robot = document.getElementById('robot');
        if (robot && !this.isSimulating) {
            robot.style.top = (this.robotPos.r * this.SCALE) + 'px';
            robot.style.left = (this.robotPos.c * this.SCALE) + 'px';
            robot.style.transform = `scale(1) rotate(0deg)`;
        }
    },

    // Sync the 2D grid logic with the Matter.js physics engine and toggle UI views
    toggleSimulation: function () {
        if (this.isSimulating) {
            clearInterval(this.physicsInterval);
            Matter.Events.off(this.engine, 'collisionStart');
            Matter.World.clear(this.engine.world, false);
            this.robotBody = null;

            const canvas3d = document.getElementById('sim-3d-canvas');
            if (canvas3d) canvas3d.classList.add('hidden');
            document.getElementById('level-grid').classList.remove('hidden');

            const zoomControls = document.getElementById('zoom-controls');
            if (zoomControls) zoomControls.classList.add('hidden');
            const zoomControls2D = document.getElementById('zoom-controls-2d');
            if (zoomControls2D) zoomControls2D.classList.remove('hidden');

            this.loadLevelSequence(this.currentSequenceIndex);
            return;
        }

        this.isSimulating = true;
        document.querySelector('.btn-play').innerText = "⏹ REINICIAR";
        document.getElementById('level-grid').classList.add('hidden');

        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) loadingOverlay.classList.remove('hidden');

        this.buildPhysicsWorld();

        const startSim = () => {
            if (loadingOverlay) loadingOverlay.classList.add('hidden');

            const fps = 60;
            const timeStep = 1000 / fps;

            this.physicsInterval = setInterval(() => {
                Matter.Engine.update(this.engine, timeStep);

                if (this.robotBody) {
                    if (this.robotBody.velocity.x < 2.1) {
                        Matter.Body.applyForce(this.robotBody, this.robotBody.position, { x: 0.01, y: 0 });
                    }

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
            const zoomControls2D = document.getElementById('zoom-controls-2d');
            if (zoomControls2D) zoomControls2D.classList.add('hidden');

            window.dispatchEvent(new Event('resize'));

            window.Bridge3D.buildScene(this.levelMatrix, startSim);
        } else {
            startSim();
        }
    },

    // Map grid characters ('x' for ground, 'w' for water) to physical Matter.js bodies
    buildPhysicsWorld: function () {
        const S = this.SCALE;
        const rows = this.levelMatrix.length;
        const cols = this.levelMatrix[0].length;

        const bodies = [];

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const cell = this.levelMatrix[r][c];
                if (cell === 'x') {
                    bodies.push(Matter.Bodies.rectangle(c * S + S / 2, r * S + S / 2, S, S, {
                        isStatic: true,
                        friction: 0.1,
                        restitution: 0.0
                    }));
                } else if (cell === 'n') {
                    const vertices = [
                        { x: -S / 2, y: S / 2 },
                        { x: S / 2, y: S / 2 },
                        { x: S / 2, y: -S / 2 }
                    ];
                    bodies.push(Matter.Bodies.fromVertices(c * S + S / 2, r * S + S / 2, [vertices], {
                        isStatic: true,
                        friction: 0.1,
                        restitution: 0.0
                    }, true));
                } else if (cell === 'w') {
                    bodies.push(Matter.Bodies.rectangle(c * S + S / 2, r * S + S / 2, S, S, {
                        isStatic: true, isSensor: true, label: "agua"
                    }));
                } else if (cell === 'm') {
                    bodies.push(Matter.Bodies.rectangle(c * S + S / 2, r * S + S / 2, S, S, {
                        isStatic: true, isSensor: true, label: "meta"
                    }));
                }
            }
        }

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
                    verts = [{ x: 0, y: h }, { x: w, y: h }, { x: 0, y: 0 }];
                } else {
                    verts = [{ x: 0, y: h }, { x: w, y: h }, { x: w, y: 0 }];
                }
                const vBody = Matter.Bodies.fromVertices(0, 0, [verts], { isStatic: true, friction: 0.1 });

                const targetMinX = item.c * S;
                const targetMaxY = (item.r + item.h) * S;
                Matter.Body.setPosition(vBody, {
                    x: vBody.position.x + (targetMinX - vBody.bounds.min.x),
                    y: vBody.position.y + (targetMaxY - vBody.bounds.max.y)
                });
                bodies.push(vBody);
            }
        });

        const carW = S * 0.8;
        const carH = S * 0.7;
        const carX = this.robotPos.c * S + S / 2;
        const carY = this.robotPos.r * S + (S - carH / 2) - 0.5;

        this.robotBody = Matter.Bodies.rectangle(carX, carY, carW, carH, {
            mass: 2,
            friction: 0.0,
            frictionAir: 0.001,
            restitution: 0.0,
            chamfer: { radius: carH * 0.4 },
            label: "robot",
            inertia: Infinity
        });

        bodies.push(this.robotBody);

        Matter.World.add(this.engine.world, bodies);

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

    // Handle game over state, stop physics, and prompt user to retry the level
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
            this.toggleSimulation();
        };

        overlay.classList.remove('hidden');
    },

    // Handle victory state, save tutorial progress, and load the next level or menu
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