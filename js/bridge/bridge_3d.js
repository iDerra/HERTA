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
        tierra: 0x8BC34A, // Verde claro (x)
        agua: 0x29B6F6,   // Azul (w)
        meta: 0xFFCA28,   // Amarillo (m)
        bloque: 0x8D6E63, // Marrón (sq)
        rampa: 0xFF7043,  // Naranja (tr)
        robot: 0xE91E63   // Rosa/Rojo (coche)
    },

    init: function (canvasId) {
        const canvas = document.getElementById(canvasId);
        this.targetPos = new THREE.Vector3();
        this.clock = new THREE.Clock();

        // 1. Crear Escena
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xE0F7FA); // Color del cielo

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
        this.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
        this.renderer.setSize(width, height);

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

    buildScene: function (levelMatrix) {
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

        const rows = levelMatrix.length;
        const cols = levelMatrix[0].length;

        // Centrar el mapa en la coordenada (0,0,0)
        // No necesitamos offsets fijos aquí, calcularemos x,y dinámicamente
        // para centrar la estructura verticalmente.

        // 1. Renderizar Elementos Estáticos del Nivel (Tierra, Agua, Meta)
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const cell = levelMatrix[r][c];
                if (cell === '') continue; // Vacío

                // Saltamos los bloques del usuario ('r', 't') porque los renderizaremos como objetos completos después
                if (cell === 'r' || cell === 't') continue;

                let material, zScale = 1;

                // Definir material y forma según el tipo de celda
                if (cell === 'x') { // Tierra
                    material = new THREE.MeshLambertMaterial({ color: this.colors.tierra });
                    zScale = 3;
                } else if (cell === 'w') { // Agua
                    material = new THREE.MeshLambertMaterial({ color: this.colors.agua, transparent: true, opacity: 0.8 });
                    zScale = 3;
                    // El agua no necesita ajuste de altura especial en vertical, es un bloque más
                } else if (cell === 'm') { // Meta
                    const texture = new THREE.TextureLoader().load('../images/bridge_finish.webp');
                    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
                    const sprite = new THREE.Sprite(spriteMat);

                    const x = ((c - cols / 2) * this.blockSize);
                    const y = (rows / 2 - r) * this.blockSize;

                    sprite.position.set(x + (0.5 * this.blockSize), y + (1.0 * this.blockSize), 1.0 * this.blockSize);
                    sprite.scale.set(this.blockSize * 3.0, this.blockSize * 3.0, 1);
                    this.scene.add(sprite);
                    continue; // Saltamos la creación del bloque `mesh` común inferior
                } else {
                    continue; // Ignora los espacios vacíos ('.') u otros caracteres
                }

                const mesh = new THREE.Mesh(boxGeo, material);

                // Mapear Coordenadas 2D (c, r) a 3D (x, y, z) VERTICAL
                // X = Columnas (izquierda a derecha)
                // Y = Filas (Invertido: r=0 es arriba, r=max es abajo)
                const x = (c - cols / 2) * this.blockSize;
                const y = (rows / 2 - r) * this.blockSize;

                mesh.position.set(x, y, 0);
                mesh.scale.z = zScale;

                this.scene.add(mesh);
            }
        }

        // 2. Renderizar Items Colocados por el Usuario (Rectángulos y Rampas) como objetos únicos
        const placedItems = window.BridgeCore.placedItems || [];
        placedItems.forEach(item => {
            if (item.type === 'rect') {
                const w = item.w * this.blockSize;
                const h = item.h * this.blockSize;
                const geo = new THREE.BoxGeometry(w, h, this.blockSize);
                const mat = new THREE.MeshLambertMaterial({ color: this.colors.bloque });
                const mesh = new THREE.Mesh(geo, mat);

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

                // Crear forma triangular (Cuña) que ocupa todo el espacio
                const shape = new THREE.Shape();
                shape.moveTo(0, 0);
                shape.lineTo(w, 0);
                shape.lineTo(w, h);
                shape.lineTo(0, 0);

                const geo = new THREE.ExtrudeGeometry(shape, { depth: this.blockSize, bevelEnabled: false });
                const mat = new THREE.MeshLambertMaterial({ color: this.colors.rampa });
                const mesh = new THREE.Mesh(geo, mat);

                // Posición (Esquina inferior izquierda del bounding box)
                const x = (item.c - cols / 2 - 0.5) * this.blockSize;
                const y = (rows / 2 - (item.r + item.h - 1) - 0.5) * this.blockSize;

                mesh.position.set(x, y, -this.blockSize / 2); // Centrar en Z

                this.scene.add(mesh);
            }
        });

        // Crear el robot (un cochecito simple con dos bloques)
        this.createRobot(cols, rows);
    },

    createRobot: function (cols, rows) {
        this.robotMesh = new THREE.Group(); // Agrupamos piezas del coche

        // Cargar textura del coche y ajustar dimensiones dinámicamente
        const loader = new THREE.TextureLoader();

        loader.load('../images/bridge_3d_car.webp', (texture) => {
            // Configuración "Pixel Perfect": evita el suavizado borroso
            texture.magFilter = THREE.NearestFilter;
            texture.minFilter = THREE.NearestFilter;

            const img = texture.image;
            // Calculamos la proporción real de la imagen (ancho / alto)
            const aspect = img.width / img.height;

            // Definimos el ancho deseado (ej. 1.4 bloques) y calculamos la altura automática
            const width = this.blockSize * 2.0; // Aumentamos el tamaño (antes 1.4)
            const height = width / aspect;

            // Usamos Sprite: Siempre mira de frente a la cámara (sin deformación)
            const material = new THREE.SpriteMaterial({ map: texture });
            const body = new THREE.Sprite(material);

            body.scale.set(width, height, 1);
            body.center.set(0.5, 0); // Pivote en la base (ruedas)

            this.robotMesh.add(body);
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

                    // Rotación visual calculada leyendo la trayectoria en vez del bloque de Matter.
                    // Evitar el cálculo de -90 grados (-PI/2) puro si cae verticalmente sin haberse movido mucho en X
                    const isMovingForward = body.velocity.x > 0.1;
                    if (isMovingForward) {
                        // En Matter, +Y es abajo. En Three, -Y es abajo. 
                        const tgtRot = Math.atan2(-body.velocity.y, body.velocity.x);
                        const diff = tgtRot - this.robotMesh.rotation.z;
                        const adDiff = Math.atan2(Math.sin(diff), Math.cos(diff));
                        this.robotMesh.rotation.z += adDiff * 0.10; // interpolar suavidad
                    } else if (body.velocity.y > 0.5 && body.velocity.x < 0.1) {
                        // Si está cayendo libre puramente sin empuje frontal aún (esperando en aire), mantenlo plano
                        // O restaura suavemente a 0.
                        const diff = 0 - this.robotMesh.rotation.z;
                        const adDiff = Math.atan2(Math.sin(diff), Math.cos(diff));
                        this.robotMesh.rotation.z += adDiff * 0.10;
                    }

                    // Alinear ligeramente el sprite hacia arriba aportando un offset visual del 10%
                    this.robotMesh.position.set(x3d, y3d + (0.10 * this.blockSize), 0.75 * this.blockSize);

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