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
    }
};