window.UniverseUI = {
    zoomLevel: 1.0,
    
    mapOverlay: document.getElementById('map-interface'),
    mapContent: document.getElementById('map-content'),
    mapNodesContainer: document.getElementById('map-nodes'),
    mapSvg: document.getElementById('map-connections'),
    
    battleStage: document.querySelector('.battle-stage'),
    
    toggleMap: function(show) {
        if (show) {
            this.mapOverlay.classList.remove('minimized');
            this.zoomLevel = 1.0;
            this.mapContent.style.transform = `scale(1)`;
        } else {
            this.mapOverlay.classList.add('minimized');
            this.mapContent.style.transform = `scale(0.6)`;
        }
    },

    zoomMap: function(delta) {
        this.zoomLevel += delta;
        if(this.zoomLevel < 0.5) this.zoomLevel = 0.5;
        if(this.zoomLevel > 2.0) this.zoomLevel = 2.0;
        this.mapContent.style.transform = `scale(${this.zoomLevel})`;
    },

    renderMap: function(mapData) {
        this.mapOverlay.onclick = (e) => {
            if (e.target.closest('button')) return;
            if (this.mapOverlay.classList.contains('minimized')) {
                this.toggleMap(true);
            }
        };

        this.mapNodesContainer.innerHTML = '';
        this.mapSvg.innerHTML = '';
        const totalLayers = mapData.length;

        mapData.forEach((layer, lIdx) => {
            const yPct = 90 - (lIdx / (totalLayers - 1)) * 80;
            layer.forEach((node, nIdx) => {
                if (node.status === 'locked' && node.type !== 'boss') return; 

                const xPos = node.x * 100;
                const el = document.createElement('div');
                el.className = `map-node ${node.status} ${node.type}`;
                el.style.left = `${xPos}%`;
                el.style.top = `${yPct}%`;
                el.innerHTML = node.type === 'boss' ? '👿' : (node.type === 'start' ? '🏠' : lIdx);
                
                if (node.status === 'selectable') {
                    el.onclick = (e) => {
                        e.stopPropagation();
                        if (!this.mapOverlay.classList.contains('minimized')) {
                            window.Core.selectNode(lIdx, nIdx);
                        } else {
                            this.toggleMap(true);
                        }
                    };
                }
                this.mapNodesContainer.appendChild(el);

                node.connections.forEach(targetIdx => {
                    const next = mapData[lIdx + 1];
                    if (next && next[targetIdx].status !== 'locked') {
                        const target = next[targetIdx];
                        const tY = 90 - ((lIdx + 1) / (totalLayers - 1)) * 80;
                        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                        line.setAttribute('x1', `${xPos}%`); line.setAttribute('y1', `${yPct}%`);
                        line.setAttribute('x2', `${target.x * 100}%`); line.setAttribute('y2', `${tY}%`);
                        line.setAttribute('class', 'path-visible');
                        this.mapSvg.appendChild(line);
                    }
                });
            });
        });
    },

    renderScene: function(data, isBoss, bossHealth = 0) {
        this.battleStage.innerHTML = ''; 

        this.battleStage.innerHTML += `
            <div class="base base-player"></div>
            <div class="player-char">
                <div class="char-body"><div class="char-img"></div></div>
            </div>
            <div class="hp-box hp-player">
                <span class="hp-name">Herta (Tú)</span>
                <div class="hp-bar-bg"><div class="hp-bar-fill" style="width: ${window.Core.energy}%; background: #2ecc71;"></div></div>
            </div>
        `;

        const maxHp = isBoss ? 3 : 1;
        const currentHp = isBoss ? bossHealth : 1;
        const hpPercent = (currentHp / maxHp) * 100;
        
        this.battleStage.innerHTML += `
            <div class="base base-enemy"></div>
            <div class="obstacle-pos">
                <div id="enemy-sprite" class="enemy-sprite">
                    <div class="enemy-emoji">${data.visual.emoji}</div>
                </div>
            </div>
            <div class="hp-box hp-enemy" id="enemy-hp-box">
                <span class="hp-name">${data.visual.name}</span>
                <div class="hp-bar-bg"><div id="enemy-hp-fill" class="hp-bar-fill" style="width: ${hpPercent}%; background: #e74c3c;"></div></div>
            </div>
        `;

        const panel = document.getElementById('control-panel');
        panel.classList.remove('hidden');
        document.getElementById('panel-type').innerText = data.subject;
        document.getElementById('panel-type').style.background = data.visual.color;
        document.getElementById('panel-title').innerText = data.visual.name;
        document.getElementById('panel-question').innerText = data.question;

        const grid = document.getElementById('panel-options');
        grid.innerHTML = '';
        data.options.forEach((opt, idx) => {
            const btn = document.createElement('button');
            btn.className = 'opt-btn';
            btn.innerText = opt;
            btn.onclick = () => window.Core.solveProblem(idx === data.correctIndex);
            grid.appendChild(btn);
        });
    },

    animateBossHit: function(remainingLives) {
        const sprite = document.getElementById('enemy-sprite');
        sprite.style.filter = "brightness(5) sepia(1) hue-rotate(-50deg) saturate(5)"; 
        sprite.animate([
            { transform: 'translateX(0)' }, { transform: 'translateX(10px)' }, { transform: 'translateX(-10px)' }, { transform: 'translateX(0)' }
        ], { duration: 300 });

        setTimeout(() => sprite.style.filter = "none", 300);
        
        const hpFill = document.getElementById('enemy-hp-fill');
        const pct = (remainingLives / 3) * 100;
        hpFill.style.width = `${pct}%`;
    },

    animateSuccess: function(callback) {
        const sprite = document.getElementById('enemy-sprite');
        const hpBox = document.getElementById('enemy-hp-box');
        const hpFill = document.getElementById('enemy-hp-fill');

        hpFill.style.width = '0%';
        hpBox.style.opacity = '0';

        sprite.style.transition = 'all 0.5s';
        sprite.style.transform = 'scale(0) rotate(360deg)';
        sprite.style.opacity = '0';

        document.getElementById('control-panel').classList.add('hidden');

        setTimeout(callback, 1000);
    },

    animateFail: function() {
        const overlay = document.getElementById('fx-overlay');
        overlay.classList.add('fx-hit');
        setTimeout(() => overlay.classList.remove('fx-hit'), 500);
        document.querySelector('.viewport').animate([
            { transform: 'translateX(0)' }, { transform: 'translateX(-10px)' }, { transform: 'translateX(10px)' }, { transform: 'translateX(0)' }
        ], { duration: 200 });
    }
};