window.BridgeUI = {
    currentShape: 'rect',

    renderGrid: function(matrix) {
        const container = document.getElementById('level-grid');
        if(!container) return;
        container.innerHTML = '';

        const rows = matrix.length;
        const cols = matrix[0].length;
        
        container.style.gridTemplateRows = `repeat(${rows}, 40px)`;
        container.style.gridTemplateColumns = `repeat(${cols}, 40px)`;
        container.style.width = (cols * 40) + 'px';
        container.style.height = (rows * 40) + 'px';

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const char = matrix[r][c];
                const cell = document.createElement('div');
                cell.className = 'grid-cell';

                if (char === 'x') cell.classList.add('cell-solid');
                if (char === 'm') cell.classList.add('cell-goal');
                if (char === 'w') cell.classList.add('cell-water');
                
                cell.onclick = () => window.BridgeCore.placeBlock(r, c);

                container.appendChild(cell);
            }
        }

        const robot = document.createElement('div');
        robot.id = 'robot';
        robot.className = 'robot-avatar';
        robot.innerHTML = `<div class="robot-body"></div><div class="robot-wheel w1"></div><div class="robot-wheel w2"></div>`;
        container.appendChild(robot);
    },

    renderPlacedItems: function(items) {
        const container = document.getElementById('level-grid');
        
        items.forEach(item => {
            const el = document.createElement('div');
            el.className = item.type === 'rect' ? 'placed-rect' : 'placed-ramp';
            
            el.style.position = 'absolute';
            el.style.left = (item.c * 40) + 'px';
            el.style.top = (item.r * 40) + 'px';
            el.style.width = (item.w * 40) + 'px';
            el.style.height = (item.h * 40) + 'px';

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