const MAP_CONFIG = { layers: 11 }; 

window.Core = {
    map: [],
    currentLayer: 0,
    currentNode: 0,
    energy: 100,
    avatar: 'us_avatar1.webp',
    
    combatType: 'normal',
    bossStage: 0, 
    combatData: [],

    init: function() {
        const avatars = ['us_avatar1.webp', 'us_avatar2.webp', 'us_avatar3.webp'];
        const preloadList = avatars.map(a => `../images/universe/${a}`);
        
        window.UniverseUI.showLoading();
        window.UniverseUI.preloadImages(preloadList, () => {
            window.UniverseUI.hideLoading();
            window.UniverseUI.showAvatarSelection(avatars, (selected) => {
                this.avatar = selected;
                this.startSimulation();
            });
        });
    },

    startSimulation: function() {
        this.energy = 100;
        this.generateMap();
        this.currentLayer = 0;
        this.currentNode = 0;
        this.map[0][0].status = 'active'; 
        
        window.UniverseUI.renderMap(this.map);
        this.loadRoom(this.map[0][0]);
        
        this.updateHUD();
    },

    generateMap: function() {
        this.map = [];
        this.map.push([{ id: 'start', type: 'start', x: 0.5, connections: [], status: 'visited', data: window.UniverseData.generateProblem() }]);
        for (let i = 1; i < MAP_CONFIG.layers - 1; i++) {
            const layerNodes = [];
            const count = Math.random() > 0.6 ? 3 : 2; 
            for (let j = 0; j < count; j++) {
                const isSemiBoss = Math.random() < 0.25;
                let dataResult;
                if (isSemiBoss) {
                    const prob1 = window.UniverseData.generateProblem();
                    let prob2 = window.UniverseData.generateProblem();
                    // Ensure the second problem has the same subject but different question
                    while (prob2.subject !== prob1.subject || prob2.question === prob1.question) {
                        prob2 = window.UniverseData.generateProblem();
                    }
                    dataResult = [prob1, prob2];
                } else {
                    dataResult = window.UniverseData.generateProblem();
                }

                layerNodes.push({
                    id: `${i}-${j}`,
                    type: isSemiBoss ? 'semiboss' : 'normal',
                    x: (j + 1) / (count + 1),
                    connections: [],
                    status: 'locked', 
                    data: dataResult
                });
            }
            this.map.push(layerNodes);
        }
        this.map.push([{ id: 'boss', type: 'boss', x: 0.5, connections: [], status: 'locked', bossQuestions: window.UniverseData.generateBossGauntlet() }]);

        for (let i = 0; i < this.map.length - 1; i++) {
            const current = this.map[i];
            const next = this.map[i+1];
            current.forEach(node => {
                let closest = 0, minDist = 999;
                next.forEach((n, idx) => { let d = Math.abs(node.x - n.x); if(d < minDist) { minDist = d; closest = idx; } });
                node.connections.push(closest);
                if(next.length > 1 && Math.random() > 0.6) node.connections.push((closest + 1) % next.length);
            });
        }
    },

    updateSelectables: function(layer, index) {
        const currentNode = this.map[layer][index];
        const nextLayerIdx = layer + 1;
        if (nextLayerIdx < this.map.length) {
            currentNode.connections.forEach(targetIdx => {
                if (this.map[nextLayerIdx][targetIdx].status === 'locked') {
                    this.map[nextLayerIdx][targetIdx].status = 'selectable';
                }
            });
        }
    },

    selectNode: function(layer, index) {
        const node = this.map[layer][index];
        if (node.status !== 'selectable') return;

        this.map[this.currentLayer][this.currentNode].status = 'visited';
        this.currentLayer = layer;
        this.currentNode = index;
        node.status = 'active';

        window.UniverseUI.renderMap(this.map);
        window.UniverseUI.toggleMap(false);
        this.loadRoom(node);
        this.updateHUD();
    },

    loadRoom: function(node) {
        const assets = [];
        // Player assets
        assets.push(`../images/universe/${this.avatar}`);
        assets.push(`../images/universe/${this.avatar.replace(/(\.[^.]+)$/, '_base$1')}`);

        // Enemy assets
        const collectAssets = (data) => {
            if (data.visual && data.visual.img) {
                assets.push(`../images/universe/${data.visual.img}`);
                assets.push(`../images/universe/${data.visual.img.replace(/(\.[^.]+)$/, '_base$1')}`);
            }
        };

        if (node.type === 'boss') node.bossQuestions.forEach(q => collectAssets(q));
        else if (node.type === 'semiboss') node.data.forEach(q => collectAssets(q));
        else collectAssets(node.data);

        const uniqueAssets = [...new Set(assets)];

        window.UniverseUI.showLoading();
        window.UniverseUI.preloadImages(uniqueAssets, () => {
            window.UniverseUI.hideLoading();
            if (node.type === 'boss') {
                this.combatType = 'boss';
                this.bossStage = 0;
                this.combatData = node.bossQuestions;
                window.UniverseUI.renderScene(this.combatData[0], 'boss', 3);
            } else if (node.type === 'semiboss') {
                this.combatType = 'semiboss';
                this.bossStage = 0;
                this.combatData = node.data;
                window.UniverseUI.renderScene(this.combatData[0], 'semiboss', 2);
            } else {
                this.combatType = 'normal';
                window.UniverseUI.renderScene(node.data, 'normal');
            }
        });
    },

    solveProblem: function(isCorrect) {
        if (isCorrect) {
            if (this.combatType === 'boss' || this.combatType === 'semiboss') {
                const totalStages = this.combatType === 'boss' ? 3 : 2;
                this.bossStage++;
                window.UniverseUI.animateBossHit(totalStages - this.bossStage, totalStages); 
                
                if (this.bossStage >= totalStages) {
                    setTimeout(() => {
                        window.UniverseUI.animateSuccess(() => {
                            if (this.combatType === 'boss') {
                                window.UniverseUI.showModal("¡VICTORIA!", "Has derrotado al Boss y completado el Universo Simulado.", "Salir", () => location.href = '../index.html');
                            } else {
                                this.energy = Math.min(100, this.energy + 50);
                                this.updateHUD();
                                this.updateSelectables(this.currentLayer, this.currentNode);
                                window.UniverseUI.renderMap(this.map);
                                window.UniverseUI.toggleMap(true);
                            }
                        });
                    }, 1000);
                } else {
                    setTimeout(() => {
                        window.UniverseUI.renderScene(this.combatData[this.bossStage], this.combatType, totalStages - this.bossStage);
                    }, 1000);
                }

            } else {
                window.UniverseUI.animateSuccess(() => {
                    this.updateSelectables(this.currentLayer, this.currentNode);
                    window.UniverseUI.renderMap(this.map);
                    window.UniverseUI.toggleMap(true);
                });
            }
        } else {
            const damage = this.combatType === 'boss' ? 30 : (this.combatType === 'semiboss' ? 25 : 20);
            this.energy -= damage;
            this.updateHUD();
            window.UniverseUI.animateFail();
            if(this.energy <= 0) {
                window.UniverseUI.showModal("DESCONEXIÓN", "Energía crítica. Herta te desconecta de la simulación.", "Reiniciar", () => location.reload());
            }
        }
    },

    updateHUD: function() {
        const el = document.getElementById('energy-val');
        el.innerText = this.energy + '%';
        
        const roomEl = document.getElementById('room-val');
        if (roomEl) {
            roomEl.innerText = (this.currentLayer + 1);
        }

        const playerHpBar = document.querySelector('.hp-player .hp-bar-fill');
        if(playerHpBar) {
            playerHpBar.style.width = this.energy + '%';
            playerHpBar.style.background = this.energy < 30 ? '#e74c3c' : '#2ecc71';
        }
    }
};

document.addEventListener('DOMContentLoaded', () => { window.Core.init(); });