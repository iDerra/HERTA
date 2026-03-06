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
    
    // Diccionario de colores para los materiales
    colors: {
        tierra: 0x8BC34A, // Verde claro (x)
        agua: 0x29B6F6,   // Azul (w)
        meta: 0xFFCA28,   // Amarillo (m)
        bloque: 0x8D6E63, // Marrón (sq)
        rampa: 0xFF7043,  // Naranja (tr)
        robot: 0xE91E63   // Rosa/Rojo (coche)
    },

    init: function(canvasId) {
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

        this.startAnimationLoop();
    },

    buildScene: function(levelMatrix) {
        // Limpiar escena anterior (manteniendo luces y cámara)
        while(this.scene.children.length > 0){ 
            if(this.scene.children[0].type === "Light") break; // No borrar luces
            this.scene.remove(this.scene.children[0]); 
        }
        
        // Volver a añadir luces por si se borraron
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
        dirLight.position.set(10, 20, 10);
        this.scene.add(dirLight);

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
                    material = new THREE.MeshLambertMaterial({ color: this.colors.meta });
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

    createRobot: function(cols, rows) {
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

        // Guardamos dimensiones para calcular posiciones
        this.robotMesh.userData = { cols: cols, rows: rows, initialized: false };
        
        // Resetear targets
        this.targetPos.set(0, 0, 0);
        this.targetRot = 0;
    },

    updateRobot: function(r, c, rotationDegree) {
        if (!this.robotMesh) return;

        const cols = this.robotMesh.userData.cols;
        const rows = this.robotMesh.userData.rows;

        // Animar o mover el robot a la nueva celda
        const targetX = (c - cols / 2) * this.blockSize;
        const targetY = (rows / 2 - r) * this.blockSize;
        
        // Ajuste de altura (Y) para que no parezca que flota (bajamos un poco)
        // y Z reducido para que esté pegado a los bloques pero visible
        const yOffset = -0.45 * this.blockSize; 
        
        // Actualizamos el objetivo hacia donde debe ir el robot
        this.targetPos.set(targetX, targetY + yOffset, 0.75 * this.blockSize);

        // Rotar el modelo 3D según los grados (convertidos a radianes). 
        // Ahora rotamos en Z porque es una vista lateral (invertimos signo para coincidir con CSS)
        this.targetRot = -rotationDegree * (Math.PI / 180);
        
        // Si es la primera vez, teletransportar para evitar "vuelo" inicial desde el centro
        if (!this.robotMesh.userData.initialized) {
            this.robotMesh.position.copy(this.targetPos);
            this.robotMesh.rotation.z = this.targetRot;
            this.robotMesh.userData.initialized = true;
        }
    },

    startAnimationLoop: function() {
        const animate = () => {
            this.animationId = requestAnimationFrame(animate);
            const deltaTime = this.clock.getDelta();

            if (this.renderer && this.scene && this.camera) {
                // Movimiento a velocidad constante en lugar de lerp
                if (this.robotMesh && this.robotMesh.userData.initialized) {
                    const speed = 2.2; // unidades/seg (1 bloque / 0.5s = 2 u/s. Un poco más para asegurar que llega)
                    const moveAmount = speed * deltaTime;
                    const distanceToTarget = this.robotMesh.position.distanceTo(this.targetPos);

                    if (distanceToTarget > 0.01) { // Mover solo si no hemos llegado
                        if (distanceToTarget < moveAmount) {
                            // Si estamos más cerca que un frame de movimiento, saltar al final
                            this.robotMesh.position.copy(this.targetPos);
                        } else {
                            // Moverse hacia el objetivo a velocidad constante
                            const direction = this.targetPos.clone().sub(this.robotMesh.position).normalize();
                            this.robotMesh.position.add(direction.multiplyScalar(moveAmount));
                        }
                    }
                    
                    // La rotación puede seguir siendo suave con lerp
                    this.robotMesh.rotation.z += (this.targetRot - this.robotMesh.rotation.z) * 0.1;
                }
                this.renderer.render(this.scene, this.camera);
            }
        };
        animate();
    }
};

// Inicializar el motor 3D cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Asumimos que has añadido <canvas id="sim-3d-canvas"> en tu HTML
    if(document.getElementById('sim-3d-canvas')) {
        window.Bridge3D.init('sim-3d-canvas');
    }
});