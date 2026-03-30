window.UniverseUI = {
    zoomLevel: 1.0,
    
    mapOverlay: document.getElementById('map-interface'),
    mapContent: document.getElementById('map-content'),
    mapNodesContainer: document.getElementById('map-nodes'),
    mapSvg: document.getElementById('map-connections'),
    
    battleStage: document.querySelector('.battle-stage'),
    
    showLoading: function() {
        let overlay = document.getElementById('loading-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'loading-overlay';
            overlay.innerHTML = `<div class="loader"></div><div class="loading-text">Cargando Simulación...</div>`;
            document.body.appendChild(overlay);
        }
        overlay.classList.remove('hidden');
    },

    hideLoading: function() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) overlay.classList.add('hidden');
    },

    preloadImages: function(urls, callback) {
        let loaded = 0;
        const total = urls.length;
        if (total === 0) { callback(); return; }
        
        const check = () => { loaded++; if (loaded === total) callback(); };
        urls.forEach(url => {
            const img = new Image();
            img.onload = check; img.onerror = check;
            img.src = url;
        });
    },

    showAvatarSelection: function(avatars, callback) {
        const overlay = document.createElement('div');
        // Le asignamos una clase para controlarlo desde el CSS
        overlay.className = 'avatar-select-overlay';
        
        let html = `<h2>ELIGE TU AVATAR</h2><div class='avatar-container'>`;
        avatars.forEach(av => {
            html += `<div class='av-opt' data-av='${av}'>
                <img src='../images/universe/${av}'>
            </div>`;
        });
        html += `</div>`;
        
        overlay.innerHTML = html;
        document.body.appendChild(overlay);

        overlay.querySelectorAll('.av-opt').forEach(el => {
            el.onclick = () => { 
                document.body.removeChild(overlay); 
                callback(el.dataset.av); 
            };
        });
    },

    showModal: function(title, text, btnText, callback) {
        const overlay = document.getElementById('msg-overlay');
        document.getElementById('msg-title').innerText = title;
        document.getElementById('msg-text').innerText = text;
        const btn = document.getElementById('msg-btn');
        btn.innerText = btnText || "Continuar";
        
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        
        newBtn.onclick = () => {
            if(callback) callback();
        };
        overlay.classList.remove('hidden');
    },

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
                el.innerHTML = node.type === 'boss' ? '👿' : (node.type === 'semiboss' ? '⚔️' : (node.type === 'start' ? '🏠' : lIdx));
                
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

    renderScene: function(data, combatType, enemyHealth = 0) {
        const bgNum = Math.floor(Math.random() * 3) + 1;
        const viewport = document.getElementById('viewport-3d');
        if (viewport) {
            viewport.style.backgroundImage = `url('../images/universe/us_background${bgNum}.webp')`;
        }

        this.battleStage.innerHTML = ''; 

        const avatarBase = window.Core.avatar.replace(/(\.[^.]+)$/, '_base$1');

        this.battleStage.innerHTML += `
            <div class="base base-player" style="background-image: url('../images/universe/${avatarBase}'); background-size: 100%; background-repeat: no-repeat; background-position: center;"></div>
            <div class="player-char">
                <div class="char-body"><div class="char-img" style="background-image: url('../images/universe/${window.Core.avatar}'); background-size: contain; background-repeat: no-repeat; background-position: center bottom;"></div></div>
            </div>
            <div class="hp-box hp-player">
                <span class="hp-name">Herta (Tú)</span>
                <div class="hp-bar-bg"><div class="hp-bar-fill" style="width: ${window.Core.energy}%; background: #2ecc71;"></div></div>
            </div>
        `;

        const isBoss = combatType === 'boss';
        const isSemiBoss = combatType === 'semiboss';

        const maxHp = isBoss ? 3 : (isSemiBoss ? 2 : 1);
        const currentHp = (isBoss || isSemiBoss) ? enemyHealth : 1;
        const hpPercent = (currentHp / maxHp) * 100;
        
        let spriteStyle = isSemiBoss ? 'width:100%; height:100%; object-fit:contain; filter: drop-shadow(0 0 20px rgba(255, 60, 0, 0.8)); transform: scale(1.15);' : 'width:100%; height:100%; object-fit:contain; filter: drop-shadow(0 10px 10px rgba(0,0,0,0.5));';

        const enemyContent = data.visual.img 
            ? `<img src="../images/universe/${data.visual.img}" style="${spriteStyle}">`
            : `<div class="enemy-emoji" style="${isSemiBoss ? 'transform: scale(1.3); text-shadow: 0 0 20px rgba(255,60,0,0.8);' : ''}">${data.visual.emoji}</div>`;

        let enemyBaseStyle = '';
        if (data.visual.img) {
            const enemyBase = data.visual.img.replace(/(\.[^.]+)$/, '_base$1');
            enemyBaseStyle = `style="background-image: url('../images/universe/${enemyBase}'); background-size: contain; background-repeat: no-repeat; background-position: center;"`;
        }

        this.battleStage.innerHTML += `
            <div class="base base-enemy" ${enemyBaseStyle}></div>
            <div class="obstacle-pos">
                <div id="enemy-sprite" class="enemy-sprite">
                    ${enemyContent}
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

    animateBossHit: function(remainingLives, totalLives) {
        const sprite = document.getElementById('enemy-sprite');
        sprite.style.filter = "brightness(5) sepia(1) hue-rotate(-50deg) saturate(5)"; 
        sprite.animate([
            { transform: 'translateX(0)' }, { transform: 'translateX(10px)' }, { transform: 'translateX(-10px)' }, { transform: 'translateX(0)' }
        ], { duration: 300 });

        setTimeout(() => sprite.style.filter = "none", 300);
        
        const hpFill = document.getElementById('enemy-hp-fill');
        const pct = (remainingLives / totalLives) * 100;
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