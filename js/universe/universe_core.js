const MAP_CONFIG = { layers: 6 }; 

window.Core = {
    map: [],
    currentLayer: 0,
    currentNode: 0,
    energy: 100,
    
    isBossFight: false,
    bossStage: 0, 
    bossData: [], 

    init: function() {
        this.energy = 100;
        this.generateMap();
        this.currentLayer = 0;
        this.currentNode = 0;
        this.map[0][0].status = 'active'; 
        this.updateSelectables(0, 0);
        
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
                layerNodes.push({
                    id: `${i}-${j}`,
                    type: 'normal',
                    x: (j + 1) / (count + 1),
                    connections: [],
                    status: 'locked', 
                    data: window.UniverseData.generateProblem()
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
        if (node.type === 'boss') {
            this.isBossFight = true;
            this.bossStage = 0;
            this.bossData = node.bossQuestions;
            window.UniverseUI.renderScene(this.bossData[0], true, 3);
        } else {
            this.isBossFight = false;
            window.UniverseUI.renderScene(node.data, false);
        }
    },

    solveProblem: function(isCorrect) {
        if (isCorrect) {
            if (this.isBossFight) {
                this.bossStage++;
                window.UniverseUI.animateBossHit(3 - this.bossStage); 
                
                if (this.bossStage >= 3) {
                    setTimeout(() => {
                        window.UniverseUI.animateSuccess(() => {
                            alert("🎉 ¡HAS DERROTADO AL BOSS Y COMPLETADO EL UNIVERSO! 🎉");
                            location.href = '../index.html';
                        });
                    }, 1000);
                } else {
                    setTimeout(() => {
                        alert(`¡Buen golpe! Al jefe le quedan ${3 - this.bossStage} vidas.`);
                        window.UniverseUI.renderScene(this.bossData[this.bossStage], true, 3 - this.bossStage);
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
            this.energy -= (this.isBossFight ? 30 : 20);
            this.updateHUD();
            window.UniverseUI.animateFail();
            if(this.energy <= 0) {
                alert("💀 Energía crítica. Herta te desconecta de la simulación.");
                location.reload();
            }
        }
    },

    updateHUD: function() {
        const el = document.getElementById('energy-val');
        el.innerText = this.energy + '%';
        const playerHpBar = document.querySelector('.hp-player .hp-bar-fill');
        if(playerHpBar) {
            playerHpBar.style.width = this.energy + '%';
            playerHpBar.style.background = this.energy < 30 ? '#e74c3c' : '#2ecc71';
        }
    }
};

document.addEventListener('DOMContentLoaded', () => { window.Core.init(); });