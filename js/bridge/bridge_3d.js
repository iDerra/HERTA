window.Bridge3D = {
    scene: null,
    camera: null,
    renderer: null,
    robotMesh: null,
    animationId: null,
    clock: null,
    targetPos: null, // Objetivo para movimiento suave
    targetRot: 0,    // Objetivo para rotación suave
    blockSize: 1, // Escala de los bloques en 3D
    isDragging: false,
    previousMousePosition: { x: 0, y: 0 },

    // Diccionario de colores para los materiales
    colors: {
        tierra: 0xA5D86A, // Verde tierra más claro y vivo
        agua: 0x45B0E8,   // Azul agua más luminoso
        meta: 0xFFCA28,   // Amarillo (m)
        bloque: 0xF0913A, // Naranja bloque más luminoso
        rampa: 0xFF6B6B,  // Coral rampa más brillante
        robot: 0xE91E63   // Rosa/Rojo (coche)
    },

    init: function (canvasId) {
        const canvas = document.getElementById(canvasId);
        this.targetPos = new THREE.Vector3();
        this.clock = new THREE.Clock();

        // 1. Crear Escena
        this.scene = new THREE.Scene();
        this.scene.background = null; // Quitar color estático para permitir background CSS transparente

        // 2. Crear Cámara Isométrica (Ortográfica)
        // Usamos un fallback por si el canvas está oculto (tamaño 0) al inicializar
        const width = canvas.clientWidth || window.innerWidth;
        const height = canvas.clientHeight || window.innerHeight;
        const aspect = width / height;

        const d = 8; // Zoom de la cámara
        this.camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 1000);

        // Posicionar la cámara en ángulo isométrico
        this.camera.position.set(30, 30, 50); // Vista más elevada y frontal
        this.camera.lookAt(this.scene.position);

        // 3. Crear Renderizador
        // alpha: true permite que el fondo HTML de la web se renderice debajo del modelo 3D
        this.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
        this.renderer.setSize(width, height);
        this.renderer.setClearColor(0x000000, 0); // Totalmente transparente

        // Configurar la imagen de fondo dinámicamente sobre la capa CSS del Viewport
        // La imagen de nubes se coloca arriba abarcando el 100% del ancho, apoyada por un gradiente de caída
        canvas.style.backgroundImage = "url('../images/bridge_background.webp'), linear-gradient(160deg, #1a3a5c 0%, #1e6fa8 40%, #3498db 70%, #76c8f5 100%)";
        canvas.style.backgroundSize = "100% auto, 100% 100%";
        canvas.style.backgroundPosition = "top center, center";
        canvas.style.backgroundRepeat = "no-repeat, no-repeat";

        // Para que se re-escale si se cambia el tamaño de la ventana
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

        // 4. Añadir Luces (Iluminación suave)
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
        dirLight.position.set(10, 20, 10);
        dirLight.castShadow = true;
        this.scene.add(dirLight);

        // 5. Configurar Eventos de Paneo (Arrastrar)
        this.setupPanningControls(canvas);

        this.startAnimationLoop();
    },

    setupPanningControls: function (canvas) {
        const handleDown = (x, y) => {
            this.isDragging = true;
            this.previousMousePosition = { x, y };
        };

        const handleMove = (x, y) => {
            if (!this.isDragging || !this.camera) return;

            const deltaX = x - this.previousMousePosition.x;
            const deltaY = y - this.previousMousePosition.y;

            // Velocidad drásticamente reducida
            const moveSpeed = 0.01 / this.camera.zoom;

            // Vectores 'derecha' y 'arriba' basados en la orientación actual de la cámara
            const right = new THREE.Vector3(1, 0, 0);
            right.applyQuaternion(this.camera.quaternion);

            const up = new THREE.Vector3(0, 1, 0);
            up.applyQuaternion(this.camera.quaternion);

            const moveDelta = new THREE.Vector3();
            // -deltaX mueve la cámara opuesto al ratón, dando la sensación de arrastrar el mundo
            moveDelta.addScaledVector(right, -deltaX * moveSpeed);
            moveDelta.addScaledVector(up, deltaY * moveSpeed);

            this.camera.position.add(moveDelta);

            this.previousMousePosition = { x, y };
        };

        const handleUp = () => {
            this.isDragging = false;
        };

        // Ratón
        canvas.addEventListener('mousedown', (e) => handleDown(e.clientX, e.clientY));
        window.addEventListener('mousemove', (e) => handleMove(e.clientX, e.clientY));
        window.addEventListener('mouseup', handleUp);

        // Táctil
        canvas.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) handleDown(e.touches[0].clientX, e.touches[0].clientY);
        }, { passive: true });
        window.addEventListener('touchmove', (e) => {
            if (e.touches.length === 1 && this.isDragging) handleMove(e.touches[0].clientX, e.touches[0].clientY);
        }, { passive: true });
        window.addEventListener('touchend', handleUp);
    },

    buildScene: function (levelMatrix, onLoaded) {
        // Limpiar escena anterior adecuadamente ignorando las luces que puedan estar dispersas en los hijos
        const objectsToRemove = this.scene.children.filter(child => child.type !== "AmbientLight" && child.type !== "DirectionalLight");
        objectsToRemove.forEach(obj => this.scene.remove(obj));

        // Por si no estaban (primera vez o borradas por accidente), las volvemos a instanciar si no existen
        if (!this.scene.children.find(c => c.type === "AmbientLight")) {
            this.scene.add(new THREE.AmbientLight(0xffffff, 0.6));
        }
        if (!this.scene.children.find(c => c.type === "DirectionalLight")) {
            const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
            dirLight.position.set(10, 20, 10);
            this.scene.add(dirLight);
        }

        // Geometría base para bloques
        const boxGeo = new THREE.BoxGeometry(this.blockSize, this.blockSize, this.blockSize);

        // Fetch de los datos del nivel actual para leer las 3 matrices (Delantera, Central, Trasera)
        // Usamos el índice actual almacenado en el Core
        const idx = window.BridgeCore.currentLevelIdx;
        const currentLevel = window.BridgeLevels[idx] || window.BridgeLevels[0];

        const matrixCenter = currentLevel.matrixCenter;
        // Fallback por si hay algún mapa antiguo que aún no está migrado
        const matrixLeft = currentLevel.matrixLeft || matrixCenter;
        const matrixRight = currentLevel.matrixRight || matrixCenter;

        const rows = matrixCenter.length;
        const cols = matrixCenter[0].length;

        // 1. Renderizar Elementos Estáticos del Nivel (Tierra, Agua, Meta)
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {

                // Iteramos por profundidad: Derecha (Z=-1), Centro (Z=0), Izquierda (Z=1)
                for (let dz = -1; dz <= 1; dz++) {
                    const currentMatrix = (dz === -1) ? matrixRight : (dz === 1 ? matrixLeft : matrixCenter);
                    const cell = currentMatrix[r] ? currentMatrix[r][c] : '.';

                    if (!cell || cell === '.' || cell === 'o' || cell === 'r' || cell === 't') continue;

                    // Coordenadas base
                    const x = (c - cols / 2) * this.blockSize;
                    const y = (rows / 2 - r) * this.blockSize;

                    if (cell === 'x' || cell === 'n') {
                        // Calcular profundidad relativa a esta matriz específica
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
                            baseHex = this.colors.tierra; // Verde - superficie
                        } else if (depthFromSurface === 1) {
                            baseHex = 0xA0785A; // Marrón tierra superior
                        } else if (depthFromSurface === 2 || depthFromSurface === 3) {
                            baseHex = 0x7A5C44; // Marrón tierra profundo
                        } else {
                            baseHex = 0x8A8A8A; // Gris piedra profunda
                        }

                        // Factor de oscurecimiento adicional: -10% de brillo por cada nivel de profundidad
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
                        // Verificador de adyacencia 3D para el agua (Culling de caras internas)
                        const isWater = (rr, cc, ddz) => {
                            // Si nos salimos del sándwich de 3 capas (-1, 0, 1), no hay agua (aire)
                            if (ddz < -1 || ddz > 1) return false;
                            const m = (ddz === -1) ? matrixRight : (ddz === 1 ? matrixLeft : matrixCenter);
                            // Verificador de límites r y c
                            if (!m || !m[rr] || cc < 0 || cc >= m[rr].length) return false;
                            return m[rr][cc] === 'w';
                        };

                        const matVis = new THREE.MeshStandardMaterial({
                            color: this.colors.agua, transparent: true, opacity: 0.6,
                            flatShading: true, roughness: 0.1, metalness: 0.5
                        });
                        const matInvis = new THREE.MeshBasicMaterial({ visible: false });

                        // Orden de caras Three.js: [px (+X), nx (-X), py (+Y), ny (-Y), pz (+Z), nz (-Z)]
                        const mats = [
                            isWater(r, c + 1, dz) ? matInvis : matVis, // Derecha
                            isWater(r, c - 1, dz) ? matInvis : matVis, // Izquierda
                            isWater(r - 1, c, dz) ? matInvis : matVis, // Arriba
                            isWater(r + 1, c, dz) ? matInvis : matVis, // Abajo
                            isWater(r, c, dz + 1) ? matInvis : matVis, // Frente (Z+)
                            isWater(r, c, dz - 1) ? matInvis : matVis  // Fondo (Z-)
                        ];

                        const mesh = new THREE.Mesh(boxGeo, mats);
                        mesh.position.set(x, y, dz * this.blockSize);
                        this.scene.add(mesh);

                    } else if (cell === 'm' && dz === 0) {
                        // Meta: sprite con imagen, proporción correcta calculada al cargar la textura
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

        // 2. Renderizar Items Colocados por el Usuario (Rectángulos y Rampas) como objetos únicos
        const placedItems = window.BridgeCore.placedItems || [];
        placedItems.forEach(item => {
            if (item.type === 'rect') {
                const w = item.w * this.blockSize;
                const h = item.h * this.blockSize;
                const geo = new THREE.BoxGeometry(w, h, this.blockSize);
                // Usamos StandardMaterial con flatShading para dar un brillo premium de tipo plástico de construcción low poly
                const mat = new THREE.MeshStandardMaterial({ color: this.colors.bloque, roughness: 0.3, metalness: 0.1, flatShading: true });
                const mesh = new THREE.Mesh(geo, mat);

                // Bordes para simular piezas ensamblables (Blueprint aesthetic)
                const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0x4e342e, opacity: 0.5, transparent: true, linewidth: 2 }));
                mesh.add(edges);

                // Calcular posición central del bloque grande
                const centerC = item.c + (item.w - 1) / 2;
                const centerR = item.r + (item.h - 1) / 2;

                const x = (centerC - cols / 2) * this.blockSize;
                const y = (rows / 2 - centerR) * this.blockSize;

                mesh.position.set(x, y, 0);

                this.scene.add(mesh);

            } else if (item.type === 'tri') {
                const w = item.w * this.blockSize;
                const h = item.h * this.blockSize;

                // Crear forma triangular (Cuña): normal sube a la derecha, reflejada sube a la izquierda
                const shape = new THREE.Shape();
                if (item.mirrored) {
                    // Rampa reflejada: vértice superior en la esquina izquierda → baja hacia la derecha
                    shape.moveTo(0, 0);
                    shape.lineTo(w, 0);
                    shape.lineTo(0, h);
                    shape.lineTo(0, 0);
                } else {
                    // Rampa normal: vértice superior en la esquina derecha → sube hacia la derecha
                    shape.moveTo(0, 0);
                    shape.lineTo(w, 0);
                    shape.lineTo(w, h);
                    shape.lineTo(0, 0);
                }

                const geo = new THREE.ExtrudeGeometry(shape, { depth: this.blockSize, bevelEnabled: false });
                // Aplicar Flat Shading Low Poly
                const mat = new THREE.MeshStandardMaterial({ color: this.colors.rampa, roughness: 0.3, metalness: 0.1, flatShading: true });
                const mesh = new THREE.Mesh(geo, mat);

                // Líneas de contorno encajable
                const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0xbf360c, opacity: 0.5, transparent: true, linewidth: 2 }));
                mesh.add(edges);

                // Posición (Esquina inferior izquierda del bounding box)
                const x = (item.c - cols / 2 - 0.5) * this.blockSize;
                const y = (rows / 2 - (item.r + item.h - 1) - 0.5) * this.blockSize;

                mesh.position.set(x, y, -this.blockSize / 2); // Centrar en Z

                this.scene.add(mesh);
            }
        });

        // Crear el robot (un cochecito simple con dos bloques)
        this.createRobot(cols, rows, onLoaded);
    },

    createRobot: function (cols, rows, onLoaded) {
        this.robotMesh = new THREE.Group(); // Agrupamos piezas del coche

        const loader = new THREE.GLTFLoader();

        // Configuramos draco loader para soportar compresión
        const dracoLoader = new THREE.DRACOLoader();
        dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.4.3/');
        loader.setDRACOLoader(dracoLoader);

        loader.load('../images/bridge_car_model.glb', (gltf) => {
            const model = gltf.scene;

            // Recorremos el modelo para activar sombras (opcional pero le da buen look)
            model.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    // También definimos un fallback de color y material low-poly para que encaje
                    if (child.material) {
                        child.material.flatShading = true;
                        child.material.needsUpdate = true;
                    }
                }
            });

            // Escalar el objeto para que coincida con el tamaño físico en Matter.js (~1.5 bloques)
            const box = new THREE.Box3().setFromObject(model);
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.z, size.y);

            const targetWidth = this.blockSize * 1.5;
            const targetScale = targetWidth / maxDim;
            model.scale.setScalar(targetScale);

            // Centrar el pivote: calculamos la caja escalada
            const boxScaled = new THREE.Box3().setFromObject(model);
            const center = boxScaled.getCenter(new THREE.Vector3());
            const bottomY = boxScaled.min.y;

            // Compensación visual clave (0.15 * blockSize):
            // El terreno visual en Three.js se dibuja centrado y la física de Matter.js utiliza otro eje de referencia.
            // Para que la rueda del coche de exactamente sobre el mapa visible, tenemos que empujar el visual model hacia arriba.
            model.position.x = -center.x;
            model.position.z = -center.z;
            model.position.y = -bottomY + (0.15 * this.blockSize);

            // Crear un contenedor intermedio
            const wrapper = new THREE.Group();
            wrapper.add(model);

            // Los modelos en 3D suelen mirar hacia +Z. En este juego 2.5D se avanza hacia +X.
            // Ponemos a 0 para que la ponga en el sentido opuesto al que estaba probocado por Math.PI
            wrapper.rotation.y = 0;
            wrapper.type = "GLTFCar";

            this.robotMesh.add(wrapper);

            if (onLoaded) onLoaded();
        });

        this.scene.add(this.robotMesh);

        // Guardamos dimensiones para usarlas de referencia si hiciera falta
        this.robotMesh.userData = { cols: cols, rows: rows };
    },

    updateRobot: function (r, c, rotationDegree) {
        // Lógica eliminada: ahora se sincroniza directamente con Matter.js en startAnimationLoop
    },

    startAnimationLoop: function () {
        const animate = () => {
            this.animationId = requestAnimationFrame(animate);
            const deltaTime = this.clock.getDelta();

            if (this.renderer && this.scene && this.camera) {
                // Sincronizar coordenadas del sprite 3D con la simulación de Matter.js
                if (window.BridgeCore && window.BridgeCore.robotBody && this.robotMesh) {
                    const body = window.BridgeCore.robotBody;
                    const S = window.BridgeCore.SCALE;
                    const cols = this.robotMesh.userData.cols;
                    const rows = this.robotMesh.userData.rows;

                    // Convertir coordenadas "píxel" físicas a escala métrica de Three.js
                    const x3d = (body.position.x / S - cols / 2) * this.blockSize;
                    const y3d = (rows / 2 - body.position.y / S) * this.blockSize;

                    // Recuperar la excelente rotación calculada sobre la trayectoria visual
                    // Evita por completo los trompos incontrolables y asegura un cabeceo perfecto.
                    const isMovingForward = body.velocity.x > 0.1;
                    if (isMovingForward) {
                        // Math.atan2 nos da la inclinación real del vector de movimiento
                        const tgtRot = Math.atan2(-body.velocity.y, body.velocity.x);

                        const diff = tgtRot - this.robotMesh.rotation.z;
                        const adDiff = Math.atan2(Math.sin(diff), Math.cos(diff));
                        this.robotMesh.rotation.z += adDiff * 0.15; // Suavidad 
                    } else if (Math.abs(body.velocity.y) > 0.5 && body.velocity.x < 0.1) {
                        // Si cae rápido rectifica plano
                        const diff = 0 - this.robotMesh.rotation.z;
                        const adDiff = Math.atan2(Math.sin(diff), Math.cos(diff));
                        this.robotMesh.rotation.z += adDiff * 0.10;
                    }

                    // Mantenemos la super compensación perfecta de las ruedas y ajustamos la profundidad (eje Z)
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

// Inicializar el motor 3D cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Asumimos que has añadido <canvas id="sim-3d-canvas"> en tu HTML
    if (document.getElementById('sim-3d-canvas')) {
        window.Bridge3D.init('sim-3d-canvas');
    }
});