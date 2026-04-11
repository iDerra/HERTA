window.BridgeUI = {
    currentShape: 'rect',

    renderGrid: function(matrix) {
        const container = document.getElementById('level-grid');
        if(!container) return;
        container.innerHTML = '';
        const cs = window.BridgeCore.CELL_SIZE;

        const rows = matrix.length;
        const cols = matrix[0].length;
        
        container.style.gridTemplateRows = `repeat(${rows}, ${cs}px)`;
        container.style.gridTemplateColumns = `repeat(${cols}, ${cs}px)`;
        container.style.width = (cols * cs) + 'px';
        container.style.height = (rows * cs) + 'px';

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const char = matrix[r][c];
                const cell = document.createElement('div');
                cell.className = 'grid-cell';

                if (char === 'x') cell.classList.add('cell-solid');
                if (char === 'n') cell.classList.add('cell-natural-ramp');
                if (char === 'm') cell.classList.add('cell-goal');
                if (char === 'w') cell.classList.add('cell-water');

                // Oscurecer bloques sólidos según cuántos bloques sólidos hay encima
                if (char === 'x' || char === 'n') {
                    let depth = 0;
                    for (let i = r - 1; i >= 0; i--) {
                        const above = matrix[i][c];
                        if (above === 'x' || above === 'n') depth++;
                        else break;
                    }
                    // brightness: 1.0 en superficie → 0.5 con 5+ bloques encima
                    const brightness = Math.max(0.5, 1.0 - depth * 0.10);
                    cell.style.setProperty('--cell-brightness', brightness);
                }
                
                // Marcadores 5x5 para guiar al usuario
                if ((c + 1) % 5 === 0) cell.classList.add('grid-mark-x');
                if ((r + 1) % 5 === 0) cell.classList.add('grid-mark-y');
                
                cell.onclick = () => window.BridgeCore.placeBlock(r, c);
                cell.onmouseenter = () => window.BridgeUI.updateGhost(r, c);

                container.appendChild(cell);
            }
        }

        const robot = document.createElement('div');
        robot.id = 'robot';
        robot.className = 'robot-avatar';
        robot.style.width = cs + 'px';
        robot.style.height = cs + 'px';
        robot.innerHTML = `<div class="robot-body"></div><div class="robot-wheel w1"></div><div class="robot-wheel w2"></div>`;
        container.appendChild(robot);

        // CREATE GHOST
        const ghost = document.createElement('div');
        ghost.id = 'placement-ghost';
        ghost.style.position = 'absolute';
        ghost.style.pointerEvents = 'none';
        ghost.style.display = 'none';
        ghost.style.zIndex = '50';
        ghost.style.opacity = '0.9';
        ghost.style.transition = 'none';
        container.appendChild(ghost);

        container.onmouseleave = () => {
            if(ghost) ghost.style.display = 'none';
        };
    },

    updateGhost: function(r, c) {
        const ghost = document.getElementById('placement-ghost');
        if (!ghost) return;

        const core = window.BridgeCore;
        if (core.isSimulating || core.eraserMode || core.selectedItemIdx === null) {
            ghost.style.display = 'none';
            return;
        }

        const item = core.inventory[core.selectedItemIdx];
        const cs = core.CELL_SIZE;
        const matrix = core.levelMatrix;

        const startR = r - item.h + 1;
        const startC = c;

        let valid = true;
        let mirrored = false;

        if (startR < 0 || startR + item.h > matrix.length || startC + item.w > matrix[0].length) {
            valid = false;
        } else {
            for (let j = 0; j < item.w; j++) {
                let colHeight = item.h;
                if (item.type === 'tri') {
                    colHeight = Math.ceil(((j + 1) / item.w) * item.h);
                }
                for (let k = 0; k < colHeight; k++) {
                    const targetR = (startR + item.h - 1) - k;
                    const targetC = startC + j;
                    if (targetR < 0 || targetR >= matrix.length || targetC >= matrix[0].length) {
                        valid = false;
                    } else if (matrix[targetR][targetC] !== '.' && matrix[targetR][targetC] !== 'w') {
                        valid = false;
                    }
                }
            }
            if (item.type === 'tri') {
                const leftC = startC - 1;
                if (leftC >= 0) {
                    for (let row = startR; row <= startR + item.h - 1; row++) {
                        if (row >= 0 && row < matrix.length && matrix[row][leftC] === 'x') {
                            mirrored = true;
                            break;
                        }
                    }
                }
            }
        }

        ghost.style.display = 'block';
        ghost.style.left = (startC * cs) + 'px';
        ghost.style.top = (startR * cs) + 'px';
        ghost.style.width = (item.w * cs) + 'px';
        ghost.style.height = (item.h * cs) + 'px';

        const colorMode = valid ? 'rgba(255, 255, 255, 0.45)' : 'rgba(255, 79, 109, 0.65)';
        
        if (item.type === 'rect') {
            ghost.style.clipPath = 'none';
            ghost.style.background = `repeating-linear-gradient(45deg, ${colorMode}, ${colorMode} 10px, transparent 10px, transparent 20px)`;
            ghost.style.border = valid ? '2px solid rgba(255,255,255,0.8)' : '2px solid rgba(255,79,109,0.8)';
        } else {
            if (mirrored) {
                ghost.style.clipPath = 'polygon(0% 100%, 100% 100%, 0% 0%)';
            } else {
                ghost.style.clipPath = 'polygon(0% 100%, 100% 100%, 100% 0%)';
            }
            ghost.style.background = `repeating-linear-gradient(45deg, ${colorMode}, ${colorMode} 10px, transparent 10px, transparent 20px)`;
            ghost.style.border = 'none';
        }

        ghost.style.boxShadow = valid ? '0 0 16px rgba(255, 255, 255, 0.3)' : '0 0 16px rgba(255, 79, 109, 0.5)';
    },

    renderPlacedItems: function(items) {
        const container = document.getElementById('level-grid');
        const cs = window.BridgeCore.CELL_SIZE;
        const matrix = window.BridgeCore.levelMatrix;
        
        items.forEach(item => {
            const el = document.createElement('div');
            if (item.type === 'rect') {
                el.className = 'placed-rect';
            } else if (item.mirrored) {
                el.className = 'placed-ramp placed-ramp-mirrored';
            } else {
                el.className = 'placed-ramp';
            }
            
            el.style.position = 'absolute';
            el.style.left = (item.c * cs) + 'px';
            el.style.top = (item.r * cs) + 'px';
            el.style.width = (item.w * cs) + 'px';
            el.style.height = (item.h * cs) + 'px';

            // Oscurecer según bloques sólidos que hay encima del borde superior del item
            if (matrix) {
                const topRow = item.r;
                let depth = 0;
                for (let i = topRow - 1; i >= 0; i--) {
                    const above = matrix[i] ? matrix[i][item.c] : null;
                    if (above === 'x' || above === 'n') depth++;
                    else break;
                }
                const brightness = Math.max(0.5, 1.0 - depth * 0.10);
                el.style.setProperty('--cell-brightness', brightness);
            }

            el.style.pointerEvents = 'none'; 

            container.appendChild(el);
        });
    },

    renderInventory: function() {
        const container = document.getElementById('inventory-grid');
        container.innerHTML = '';
        const items = window.BridgeCore.inventory;

        if (items.length === 0) {
            container.innerHTML = '<div class="empty-msg">Vacío</div>';
            return;
        }

        items.forEach((item, idx) => {
            const el = document.createElement('div');
            el.className = 'inv-item';
            if (window.BridgeCore.selectedItemIdx === idx) el.classList.add('selected');
            const icon = item.type === 'rect' ? '🟦' : '◢';
            el.innerHTML = `<span>${icon}</span><div>${item.w}x${item.h}</div>`;
            el.onclick = () => window.BridgeCore.selectItem(idx);
            container.appendChild(el);
        });
    },

    highlightInventory: function(idx) {
        const items = document.querySelectorAll('.inv-item');
        items.forEach(i => i.classList.remove('selected'));
        if (idx !== null && items[idx]) items[idx].classList.add('selected');
    },

    selectShapeType: function(type) {
        this.currentShape = type;
        document.querySelectorAll('.shape-btn').forEach(b => b.classList.remove('active'));
        if(type==='rect') document.querySelector('.shape-btn:nth-child(1)').classList.add('active');
        if(type==='tri') document.querySelector('.shape-btn:nth-child(2)').classList.add('active');
    },

    renderFormulas: function() {
        const grid = document.getElementById('formulas-grid');
        if (!grid) return;
        
        const formulas = [
            { name: "Área Bloque (Rectángulo)", expr: "Base × Altura" },
            { name: "Área Rampa (Triángulo)", expr: "(Base × Altura) / 2" },
            { name: "Perímetro (Rectángulo)", expr: "2×Base + 2×Altura" },
            { name: "Volumen", expr: "Área × Profundidad" },
            { name: "Coste Total", expr: "Área × Precio (m²)" }
        ];

        grid.innerHTML = formulas.map(f => `
            <div class="formula-item">
                <span class="formula-name">${f.name}:</span>
                <span class="formula-expr">${f.expr}</span>
            </div>
        `).join('');
    },
    
    initUI: function() {
        this.renderFormulas();
    }
};

window.BridgeHelp = {
    open: function() {
        document.getElementById('help-overlay').classList.remove('hidden');
    },
    close: function() {
        document.getElementById('help-overlay').classList.add('hidden');
    }
};

document.addEventListener('DOMContentLoaded', () => { window.BridgeUI.initUI(); });