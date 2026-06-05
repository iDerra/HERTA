window.Bridge3D = {
    scene: null,
    camera: null,
    renderer: null,
    robotMesh: null,
    animationId: null,
    clock: null,
    targetPos: null, 
    targetRot: 0,    
    blockSize: 1, 
    isDragging: false,
    previousMousePosition: { x: 0, y: 0 },

    colors: {
        dirt: 0xA5D86A,
        water: 0x45B0E8,
        block: 0xF0913A,
        ramp: 0xFF6B6B,
        robot: 0xE91E63
    },

    // Initialize the Three.js scene, orthographic camera, and WebGL renderer
    init: function (canvasId) {
        const canvas = document.getElementById(canvasId);
        this.targetPos = new THREE.Vector3();
        this.clock = new THREE.Clock();

        this.scene = new THREE.Scene();
        this.scene.background = null; 

        const width = canvas.clientWidth || window.innerWidth;
        const height = canvas.clientHeight || window.innerHeight;
        const aspect = width / height;

        const d = 8; 
        this.camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 1000);

        this.camera.position.set(30, 30, 50); 
        this.camera.lookAt(this.scene.position);

        this.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
        this.renderer.setSize(width, height);
        this.renderer.setClearColor(0x000000, 0);

        canvas.style.backgroundImage = "url('../images/bridge_background.webp'), linear-gradient(160deg, #1a3a5c 0%, #1e6fa8 40%, #3498db 70%, #76c8f5 100%)";
        canvas.style.backgroundSize = "100% auto, 100% 100%";
        canvas.style.backgroundPosition = "top center, center";
        canvas.style.backgroundRepeat = "no-repeat, no-repeat";

        window.addEventListener('resize', () => {
            if (!document.getElementById(canvasId).classList.contains('hidden')) {
                const newAspect = canvas.clientWidth / canvas.clientHeight;
                this.camera.left = -d * newAspect;
                this.camera.right = d * newAspect;
                this.camera.top = d;
                this.camera.bottom = -d;
                this.camera.updateProjectionMatrix();
                this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
            }
        });

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
        dirLight.position.set(10, 20, 10);
        dirLight.castShadow = true;
        this.scene.add(dirLight);

        this.setupPanningControls(canvas);
        this.startAnimationLoop();
    },

    // Handle mouse and touch drag events to pan the camera across the scene
    setupPanningControls: function (canvas) {
        const handleDown = (x, y) => {
            this.isDragging = true;
            this.previousMousePosition = { x, y };
        };

        const handleMove = (x, y) => {
            if (!this.isDragging || !this.camera) return;

            const deltaX = x - this.previousMousePosition.x;
            const deltaY = y - this.previousMousePosition.y;

            const moveSpeed = 0.01 / this.camera.zoom;

            const right = new THREE.Vector3(1, 0, 0);
            right.applyQuaternion(this.camera.quaternion);

            const up = new THREE.Vector3(0, 1, 0);
            up.applyQuaternion(this.camera.quaternion);

            const moveDelta = new THREE.Vector3();
            moveDelta.addScaledVector(right, -deltaX * moveSpeed);
            moveDelta.addScaledVector(up, deltaY * moveSpeed);

            this.camera.position.add(moveDelta);

            this.previousMousePosition = { x, y };
        };

        const handleUp = () => {
            this.isDragging = false;
        };

        canvas.addEventListener('mousedown', (e) => handleDown(e.clientX, e.clientY));
        window.addEventListener('mousemove', (e) => handleMove(e.clientX, e.clientY));
        window.addEventListener('mouseup', handleUp);

        canvas.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) handleDown(e.touches[0].clientX, e.touches[0].clientY);
        }, { passive: true });
        window.addEventListener('touchmove', (e) => {
            if (e.touches.length === 1 && this.isDragging) handleMove(e.touches[0].clientX, e.touches[0].clientY);
        }, { passive: true });
        window.addEventListener('touchend', handleUp);
    },

    // Parse the level matrix to dynamically generate 3D terrain, water, and user obstacles
    buildScene: function (levelMatrix, onLoaded) {
        const objectsToRemove = this.scene.children.filter(child => child.type !== "AmbientLight" && child.type !== "DirectionalLight");
        objectsToRemove.forEach(obj => this.scene.remove(obj));

        if (!this.scene.children.find(c => c.type === "AmbientLight")) {
            this.scene.add(new THREE.AmbientLight(0xffffff, 0.6));
        }
        if (!this.scene.children.find(c => c.type === "DirectionalLight")) {
            const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
            dirLight.position.set(10, 20, 10);
            this.scene.add(dirLight);
        }

        const boxGeo = new THREE.BoxGeometry(this.blockSize, this.blockSize, this.blockSize);
        const idx = window.BridgeCore.currentLevelIdx;
        const currentLevel = window.BridgeLevels[idx] || window.BridgeLevels[0];

        const matrixCenter = currentLevel.matrixCenter;
        const matrixLeft = currentLevel.matrixLeft || matrixCenter;
        const matrixRight = currentLevel.matrixRight || matrixCenter;

        const rows = matrixCenter.length;
        const cols = matrixCenter[0].length;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {

                for (let dz = -1; dz <= 1; dz++) {
                    const currentMatrix = (dz === -1) ? matrixRight : (dz === 1 ? matrixLeft : matrixCenter);
                    const cell = currentMatrix[r] ? currentMatrix[r][c] : '.';

                    if (!cell || cell === '.' || cell === 'o' || cell === 'r' || cell === 't') continue;

                    const x = (c - cols / 2) * this.blockSize;
                    const y = (rows / 2 - r) * this.blockSize;

                    if (cell === 'x' || cell === 'n') {

                        // Calculate block depth to apply darker colors/shading to underground dirt blocks
                        let depthFromSurface = 0;
                        for (let i = r - 1; i >= 0; i--) {
                            const upperCell = currentMatrix[i] ? currentMatrix[i][c] : '.';
                            if (upperCell === 'x' || upperCell === 'n') {
                                depthFromSurface++;
                            } else {
                                break;
                            }
                        }

                        let baseHex;
                        if (depthFromSurface === 0) {
                            baseHex = this.colors.dirt;
                        } else if (depthFromSurface === 1) {
                            baseHex = 0xA0785A;
                        } else if (depthFromSurface === 2 || depthFromSurface === 3) {
                            baseHex = 0x7A5C44;
                        } else {
                            baseHex = 0x8A8A8A;
                        }

                        const depthFactor = Math.max(0.5, 1.0 - depthFromSurface * 0.10);
                        const material = new THREE.MeshStandardMaterial({
                            color: new THREE.Color(baseHex).multiplyScalar(depthFactor),
                            flatShading: true, roughness: 0.8, metalness: 0.1
                        });

                        let mesh;
                        if (cell === 'n') {
                            const shape = new THREE.Shape();
                            shape.moveTo(0, 0); shape.lineTo(this.blockSize, 0); shape.lineTo(this.blockSize, this.blockSize); shape.lineTo(0, 0);
                            const geo = new THREE.ExtrudeGeometry(shape, { depth: this.blockSize, bevelEnabled: false });
                            mesh = new THREE.Mesh(geo, material);
                            mesh.position.set(x - 0.5 * this.blockSize, y - 0.5 * this.blockSize, dz * this.blockSize - 0.5 * this.blockSize);
                        } else {
                            const geo = new THREE.BoxGeometry(this.blockSize, this.blockSize, this.blockSize);
                            mesh = new THREE.Mesh(geo, material);
                            mesh.position.set(x, y, dz * this.blockSize);
                        }
                        this.scene.add(mesh);

                    } else if (cell === 'w') {

                        // Render water blocks with transparency and hide faces adjacent to other water blocks
                        const isWater = (rr, cc, ddz) => {
                            if (ddz < -1 || ddz > 1) return false;
                            const m = (ddz === -1) ? matrixRight : (ddz === 1 ? matrixLeft : matrixCenter);
                            if (!m || !m[rr] || cc < 0 || cc >= m[rr].length) return false;
                            return m[rr][cc] === 'w';
                        };

                        const matVis = new THREE.MeshStandardMaterial({
                            color: this.colors.water, transparent: true, opacity: 0.6,
                            flatShading: true, roughness: 0.1, metalness: 0.5
                        });
                        const matInvis = new THREE.MeshBasicMaterial({ visible: false });

                        const mats = [
                            isWater(r, c + 1, dz) ? matInvis : matVis,
                            isWater(r, c - 1, dz) ? matInvis : matVis,
                            isWater(r - 1, c, dz) ? matInvis : matVis,
                            isWater(r + 1, c, dz) ? matInvis : matVis,
                            isWater(r, c, dz + 1) ? matInvis : matVis,
                            isWater(r, c, dz - 1) ? matInvis : matVis
                        ];

                        const mesh = new THREE.Mesh(boxGeo, mats);
                        mesh.position.set(x, y, dz * this.blockSize);
                        this.scene.add(mesh);

                    } else if (cell === 'm' && dz === 0) {
                        const sprite = new THREE.Sprite();
                        sprite.position.set(x + (0.5 * this.blockSize), y + (1.0 * this.blockSize), 1.0 * this.blockSize);
                        this.scene.add(sprite);

                        new THREE.TextureLoader().load('../images/bridge_finish.webp', (texture) => {
                            const img = texture.image;
                            const aspect = img.width / img.height;
                            const spriteH = this.blockSize * 3.0;
                            const spriteW = spriteH * aspect;
                            sprite.material = new THREE.SpriteMaterial({ map: texture, transparent: true });
                            sprite.scale.set(spriteW, spriteH, 1);
                        });
                    }
                }
            }
        }

        const placedItems = window.BridgeCore.placedItems || [];
        placedItems.forEach(item => {
            if (item.type === 'rect') {
                const w = item.w * this.blockSize;
                const h = item.h * this.blockSize;
                const geo = new THREE.BoxGeometry(w, h, this.blockSize);
                const mat = new THREE.MeshStandardMaterial({ color: this.colors.block, roughness: 0.3, metalness: 0.1, flatShading: true });
                const mesh = new THREE.Mesh(geo, mat);

                const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0x4e342e, opacity: 0.5, transparent: true, linewidth: 2 }));
                mesh.add(edges);

                const centerC = item.c + (item.w - 1) / 2;
                const centerR = item.r + (item.h - 1) / 2;

                const x = (centerC - cols / 2) * this.blockSize;
                const y = (rows / 2 - centerR) * this.blockSize;

                mesh.position.set(x, y, 0);

                this.scene.add(mesh);

            } else if (item.type === 'tri') {
                const w = item.w * this.blockSize;
                const h = item.h * this.blockSize;

                const shape = new THREE.Shape();
                if (item.mirrored) {
                    shape.moveTo(0, 0);
                    shape.lineTo(w, 0);
                    shape.lineTo(0, h);
                    shape.lineTo(0, 0);
                } else {
                    shape.moveTo(0, 0);
                    shape.lineTo(w, 0);
                    shape.lineTo(w, h);
                    shape.lineTo(0, 0);
                }

                const geo = new THREE.ExtrudeGeometry(shape, { depth: this.blockSize, bevelEnabled: false });
                const mat = new THREE.MeshStandardMaterial({ color: this.colors.ramp, roughness: 0.3, metalness: 0.1, flatShading: true });
                const mesh = new THREE.Mesh(geo, mat);

                const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0xbf360c, opacity: 0.5, transparent: true, linewidth: 2 }));
                mesh.add(edges);

                const x = (item.c - cols / 2 - 0.5) * this.blockSize;
                const y = (rows / 2 - (item.r + item.h - 1) - 0.5) * this.blockSize;

                mesh.position.set(x, y, -this.blockSize / 2);

                this.scene.add(mesh);
            }
        });
        this.createRobot(cols, rows, onLoaded);
    },

    // Load, scale, and position the 3D vehicle model using GLTF and DRACO loaders
    createRobot: function (cols, rows, onLoaded) {
        this.robotMesh = new THREE.Group();

        const loader = new THREE.GLTFLoader();

        const dracoLoader = new THREE.DRACOLoader();
        dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.4.3/');
        loader.setDRACOLoader(dracoLoader);

        loader.load('../images/bridge_car_model.glb', (gltf) => {
            const model = gltf.scene;

            model.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    if (child.material) {
                        child.material.flatShading = true;
                        child.material.needsUpdate = true;
                    }
                }
            });

            const box = new THREE.Box3().setFromObject(model);
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.z, size.y);

            const targetWidth = this.blockSize * 1.5;
            const targetScale = targetWidth / maxDim;
            model.scale.setScalar(targetScale);

            const boxScaled = new THREE.Box3().setFromObject(model);
            const center = boxScaled.getCenter(new THREE.Vector3());
            const bottomY = boxScaled.min.y;

            model.position.x = -center.x;
            model.position.z = -center.z;
            model.position.y = -bottomY + (0.15 * this.blockSize);

            const wrapper = new THREE.Group();
            wrapper.add(model);

            wrapper.rotation.y = 0;
            wrapper.type = "GLTFCar";

            this.robotMesh.add(wrapper);

            if (onLoaded) onLoaded();
        });

        this.scene.add(this.robotMesh);

        this.robotMesh.userData = { cols: cols, rows: rows };
    },

    updateRobot: function (r, c, rotationDegree) {
    },

    // Sync the 3D mesh position and rotation with the 2D physics engine body on every frame
    startAnimationLoop: function () {
        const animate = () => {
            this.animationId = requestAnimationFrame(animate);
            const deltaTime = this.clock.getDelta();

            if (this.renderer && this.scene && this.camera) {
                if (window.BridgeCore && window.BridgeCore.robotBody && this.robotMesh) {
                    const body = window.BridgeCore.robotBody;
                    const S = window.BridgeCore.SCALE;
                    const cols = this.robotMesh.userData.cols;
                    const rows = this.robotMesh.userData.rows;

                    const x3d = (body.position.x / S - cols / 2) * this.blockSize;
                    const y3d = (rows / 2 - body.position.y / S) * this.blockSize;

                    const isMovingForward = body.velocity.x > 0.1;
                    if (isMovingForward) {
                        const tgtRot = Math.atan2(-body.velocity.y, body.velocity.x);

                        const diff = tgtRot - this.robotMesh.rotation.z;
                        const adDiff = Math.atan2(Math.sin(diff), Math.cos(diff));
                        this.robotMesh.rotation.z += adDiff * 0.15;
                    } else if (Math.abs(body.velocity.y) > 0.5 && body.velocity.x < 0.1) {
                        const diff = 0 - this.robotMesh.rotation.z;
                        const adDiff = Math.atan2(Math.sin(diff), Math.cos(diff));
                        this.robotMesh.rotation.z += adDiff * 0.10;
                    }

                    this.robotMesh.position.set(x3d, y3d, -0.15 * this.blockSize);

                    if (this.robotMesh.children.length > 0 && this.robotMesh.children[0].type === "Sprite") {
                        this.robotMesh.children[0].material.rotation = this.robotMesh.rotation.z;
                    }
                }
                this.renderer.render(this.scene, this.camera);
            }
        };
        animate();
    },

    // Adjust camera projection matrix to zoom in the view
    zoomIn: function () {
        if (!this.camera) return;
        this.camera.zoom += 0.2;
        this.camera.updateProjectionMatrix();
    },

    zoomOut: function () {
        if (!this.camera) return;
        this.camera.zoom = Math.max(0.2, this.camera.zoom - 0.2);
        this.camera.updateProjectionMatrix();
    }
};

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('sim-3d-canvas')) {
        window.Bridge3D.init('sim-3d-canvas');
    }
});