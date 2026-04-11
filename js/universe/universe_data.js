const OBSTACLES = {
    PHYSICS: { emoji: "⚡", color: "#f1c40f", name: "Constructo Volt", img: "us_enemy_physics.webp" },
    CHEMISTRY: { emoji: "🧪", color: "#00b894", name: "Slime Ácido", img: "us_enemy_chemestry.webp" },
    BIOLOGY: { emoji: "🧬", color: "#e056fd", name: "Virus Mutante", img: "us_enemy_biology.webp" },
    ASTRO: { emoji: "🪐", color: "#0984e3", name: "Vigilante Estelar" },
    MATH: { emoji: "📐", color: "#e17055", name: "Gólem Geométrico", img: "us_enemy_math.webp" },
    TECH: { emoji: "💻", color: "#74b9ff", name: "Bot Corrupto", img: "us_enemy_tech.webp" },
    BOSS: { emoji: "👿", color: "#ff7675", name: "Jefe del Universo", img: "us_enemy_boss.webp" }
};

window.UniverseData = {

    generateBossGauntlet: function () {
        const q1 = this.generateProblem(true);
        const q2 = this.generateProblem(true);
        const q3 = this.generateProblem(true);

        q1.visual = OBSTACLES.BOSS; q1.subject = "BOSS - FASE 1";
        q2.visual = OBSTACLES.BOSS; q2.subject = "BOSS - FASE 2";
        q3.visual = OBSTACLES.BOSS; q3.subject = "BOSS - FASE FINAL";

        return [q1, q2, q3];
    },

    generateProblem: function (isBossContext = false, forceType = null) {
        const types = ['PHYSICS', 'CHEMISTRY', 'BIOLOGY', 'MATH', 'TECH'];
        const selected = forceType || types[Math.floor(Math.random() * types.length)];

        let p = {};

        switch (selected) {
            case 'PHYSICS':
                const physFuncs = [
                    () => { const v = (Math.floor(Math.random() * 8) + 3) * 10, t = Math.floor(Math.random() * 5) + 2; return { q: `Un coche viaja a ${v} m/s durante ${t} s. ¿Qué distancia ha recorrido? (d=v·t)`, c: `${v * t} m`, w: [`${v + t} m`, `${v * 10} m`, `${v / 2} m`] } },
                    () => { const m = Math.floor(Math.random() * 10) + 5, a = Math.floor(Math.random() * 5) + 2; return { q: `Si la masa de un objeto es ${m}kg, y su aceleración ${a}m/s². ¿Cuál es su fuerza? (F=m·a)`, c: `${m * a} N`, w: [`${m + a} N`, `${m * 10} N`, `${a * 2} N`] } },
                    () => { const f = (Math.floor(Math.random() * 5) + 2) * 10, a = Math.floor(Math.random() * 3) + 2; return { q: `Si la fuerza es ${f}N, y su aceleración ${a}m/s². ¿Cuál es su masa? (m=F/a)`, c: `${f / a} kg`, w: [`${f * a} kg`, `${f - a} kg`, `${f * 2} kg`] } },
                    () => { const m = 10, g = 9.8, h = Math.floor(Math.random() * 6) + 2; return { q: `Un objeto de ${m}kg se encuentra a ${h}m de altura. ¿Qué energía potencial tiene? (Ep=m·g·h, g=9.8)`, c: `${(m * g * h).toFixed(0)} J`, w: [`${h * 10} J`, `${h * 100} J`, `${50} J`] } },
                    () => { const i = Math.floor(Math.random() * 5) + 2, r = Math.floor(Math.random() * 10) + 5; return { q: `Si la intensidad de un circuito es de ${i}A y su resistencia es de ${r}Ω. ¿Cuál es el voltaje? (V=I·R)`, c: `${i * r} V`, w: [`${i + r} V`, `${r / i} V`, `${100} V`] } },
                    () => { const v = (Math.floor(Math.random() * 5) + 2) * 10, r = Math.floor(Math.random() * 5) + 2; return { q: `Si el voltaje de un circuito es de ${v}V y su resistencia es de ${r}Ω. ¿Cuál es la intensidad? (I=V/R)`, c: `${v / r} A`, w: [`${v * r} A`, `${v + r} A`, `${v * 2} A`] } },
                    () => { const m = (Math.floor(Math.random() * 5) + 2) * 10, vol = Math.floor(Math.random() * 4) + 2; return { q: `Si la masa de un objeto es de ${m}g y su volumen es de ${vol}cm³. ¿Cuál es su densidad? (d=m/V)`, c: `${(m / vol).toFixed(1)} g/cm³`, w: [`${m * vol} g/cm³`, `${m + vol} g/cm³`, `10 g/cm³`] } },
                    () => { const d = Math.floor(Math.random() * 4) + 2, vol = Math.floor(Math.random() * 5) + 2; return { q: `Si la densidad de un objeto es de ${d}kg/m³ y su volumen es de ${vol}m³. ¿Cuál es su masa? (m=d·V)`, c: `${d * vol} kg`, w: [`${d + vol} kg`, `${vol / d} kg`, `${vol * 10} kg`] } },
                    () => { const f = Math.floor(Math.random() * 5) + 5, d = Math.floor(Math.random() * 5) + 2; return { q: `Si la fuerza aplicada sobre un objeto es de ${f}N y se desplaza ${d}m. ¿Cuánto trabajo se ha realizado? (W=F·d)`, c: `${f * d} J`, w: [`${f + d} J`, `${f} J`, `${d * 2} J`] } },
                    () => { const a = Math.floor(Math.random() * 4) + 2, t = Math.floor(Math.random() * 5) + 3; return { q: `Si un objeto acelera a ${a}m/s² durante ${t}s desde el reposo. ¿Cuál es su velocidad final? (v=a·t)`, c: `${a * t} m/s`, w: [`${a + t} m/s`, `${a * 10} m/s`, `${t * 2} m/s`] } },
                    () => { const vi = 10, vf = 10 + (Math.floor(Math.random() * 4) + 2) * 2, t = 2; return { q: `Si un objeto pasa de ${vi}m/s a ${vf}m/s en ${t}s. ¿Cuál es su aceleración? a=(Vf-Vi)/t`, c: `${(vf - vi) / t} m/s²`, w: [`${vf - vi} m/s²`, `${vf + vi} m/s²`, `${t * 2} m/s²`] } },
                    () => { const m = Math.floor(Math.random() * 10) + 5; const g = 9.8; return { q: `Si la masa es de ${m}kg en la Tierra (g=9.8). ¿Cuál es su peso? (P=m·g)`, c: `${(m * g).toFixed(1)} N`, w: [`${m * 10} N`, `${m} N`, `${m + 9} N`] } },
                    () => { const v = 220, i = Math.floor(Math.random() * 4) + 2; return { q: `Si el voltaje es de ${v}V y la intensidad es de ${i}A. ¿Cuál es la resistencia? (R=V/I)`, c: `${v / i} Ω`, w: [`${v * i} Ω`, `${v - i} Ω`, `${v} Ω`] } },
                    () => { const m = 2, v = Math.floor(Math.random() * 5) + 3; return { q: `Si la masa es de ${m}kg y la velocidad es de ${v}m/s. ¿Cuál es su Energía Cinética? (Ec=0.5·m·v²)`, c: `${0.5 * m * v * v} J`, w: [`${m * v} J`, `${v * v} J`, `${m * v * v} J`] } },
                    () => { const k = 100, x = Math.floor(Math.random() * 4) + 2; return { q: `Si el muelle es de ${k} N/m y se estira ${x}m. ¿Cuál es la fuerza restauradora? (F=k·x)`, c: `${k * x} N`, w: [`${k + x} N`, `${k / x} N`, `${100} N`] } },
                    () => { const w = Math.floor(Math.random() * 5 + 5) * 10, t = Math.floor(Math.random() * 4) + 2; return { q: `Si el trabajo es de ${w}J en ${t}s. ¿Cuál es la potencia? (P=W/t)`, c: `${w / t} W`, w: [`${w * t} W`, `${w + t} W`, `${w} W`] } },
                    () => { const m = 1, ce = 4180, dt = 10; return { q: `Si tenemos ${m}kg de agua y sus datos son: Ce=4180 J/kgK, ΔT=10K. ¿Cuál es el calor? (Q=m·Ce·ΔT)`, c: `41800 J`, w: [`4180 J`, `418 J`, `10 J`] } },
                    () => { const f = 100, a = Math.floor(Math.random() * 4) + 2; return { q: `Si la fuerza es de ${f}N y el área es de ${a}m². ¿Cuál es la presión? (P=F/A)`, c: `${f / a} Pa`, w: [`${f * a} Pa`, `${f - a} Pa`, `${a * 10} Pa`] } },
                    () => { const tArray = [0.1, 0.2, 0.5]; const t = tArray[Math.floor(Math.random() * tArray.length)]; return { q: `Si el periodo es de ${t}s. ¿Cuál es la frecuencia? (f=1/T)`, c: `${1 / t} Hz`, w: [`${t * 10} Hz`, `${t} Hz`, `10 Hz`] } },
                    () => { const l = Math.floor(Math.random() * 5) + 2, f = Math.floor(Math.random() * 10) + 5; return { q: `Si la longitud de onda es de ${l}m y la frecuencia es de ${f}Hz. ¿Cuál es la velocidad de onda? (v=λ·f)`, c: `${l * f} m/s`, w: [`${l + f} m/s`, `${f / l} m/s`, `${l * 10} m/s`] } }
                ];
                p = physFuncs[Math.floor(Math.random() * physFuncs.length)]();
                p.visual = OBSTACLES.PHYSICS;
                p.subject = "FÍSICA";
                p.typeKey = 'PHYSICS';
                break;

            case 'MATH':
                const mathFuncs = [
                    () => { const x = Math.floor(Math.random() * 10) + 1; const res = 2 * x + 5; return { q: `Si 2x + 5 = ${res}, ¿cuánto vale x?`, c: `x = ${x}`, w: [`x = ${x + 1}`, `x = ${x - 1}`, `x = ${x * 2}`] } },
                    () => { const x = Math.floor(Math.random() * 8) + 2; const res = 3 * x - 2; return { q: `Si 3x - 2 = ${res}, ¿cuánto vale x?`, c: `x = ${x}`, w: [`x = ${x + 2}`, `x = ${res}`, `x = ${x - 1}`] } },
                    () => { const b = Math.floor(Math.random() * 8) + 3, h = Math.floor(Math.random() * 8) + 3; return { q: `Si un rectángulo tiene una base=${b}m y altura=${h}m, ¿cuál es su área?`, c: `${b * h}`, w: [`${b + h}`, `${(b * h) / 2}`, `${b * 2 + h * 2}`] } },
                    () => { const b = Math.floor(Math.random() * 8) + 3, a = Math.floor(Math.random() * 8) + 3; return { q: `Si un rectángulo tiene los lados de ${b}m y ${a}m, ¿cuál es su perímetro?`, c: `${2 * b + 2 * a}`, w: [`${b * a}`, `${b + a}`, `${b * a / 2}`] } },
                    () => { const b = (Math.floor(Math.random() * 5) + 2) * 2, h = Math.floor(Math.random() * 5) + 3; return { q: `Si un triángulo tiene una base=${b}m y altura=${h}m, ¿cuál es su área?`, c: `${(b * h) / 2}`, w: [`${b * h}`, `${b + h}`, `${b * h * 2}`] } },
                    () => { const mult = Math.floor(Math.random() * 3) + 1; const c1 = 3 * mult, c2 = 4 * mult, h = 5 * mult; return { q: `Si un triángulo rectángulo tiene catetos ${c1} y ${c2}, ¿cuál es su hipotenusa?`, c: `${h}`, w: [`${c1 + c2}`, `${h + 1}`, `${h * 2}`] } },
                    () => { const mult = Math.floor(Math.random() * 2) + 1; const c1 = 6 * mult, h = 10 * mult, c2 = 8 * mult; return { q: `Si un triángulo rectángulo tiene hipotenusa=${h} y un cateto=${c1}, ¿cuál es el otro cateto?`, c: `${c2}`, w: [`${h - c1}`, `${c2 + 2}`, `${10}`] } },
                    () => { const t = 200, pct = [10, 20, 25, 50][Math.floor(Math.random() * 4)]; return { q: `Si un producto cuesta ${t}€ y tiene un ${pct}% de descuento, ¿cuál es el precio final?`, c: `${(t * pct) / 100}`, w: [`${pct}`, `${t / 2}`, `${pct * 2}`] } },
                    () => { const p = Math.floor(Math.random() * 5 + 5) * 10, d = 10; return { q: `Si un juego cuesta ${p}€ y tiene un 10% de descuento, ¿cuál es el precio final?`, c: `${p - (p * 0.1)} €`, w: [`${p - 10} €`, `${p * 0.1} €`, `${p - 5} €`] } },
                    () => { const x = Math.floor(Math.random() * 5) + 2; return { q: `Calcula el resultado de elevar ${x} al cubo (${x}³)`, c: `${Math.pow(x, 3)}`, w: [`${x * 3}`, `${x * x}`, `${Math.pow(x, 3) + 1}`] } },
                    () => { const x = Math.floor(Math.random() * 8) + 4; return { q: `Calcula: Raíz cuadrada de ${x * x} (√${x * x})`, c: `${x}`, w: [`${x / 2}`, `${x * x / 2}`, `${x + 2}`] } },
                    () => { const a1 = Math.floor(Math.random() * 30) + 40, a2 = Math.floor(Math.random() * 30) + 40; return { q: `Si un triángulo tiene ángulos de ${a1}º y ${a2}º, ¿cuál es el tercer ángulo?`, c: `${180 - a1 - a2}º`, w: [`${90}º`, `${180 - a1}º`, `${100}º`] } },
                    () => { const x = Math.floor(Math.random() * 3) + 2, y = Math.floor(Math.random() * 4) + 4; return { q: `Si ${x} cuadernos cuestan ${x * 2}€, ¿cuánto cuestan ${y}?`, c: `${y * 2} €`, w: [`${y * 3} €`, `${y} €`, `${x + y} €`] } },
                    () => { const n = Math.floor(Math.random() * 5) * 3 + 6; return { q: `Calcula los 2/3 de ${n}`, c: `${(n * 2) / 3}`, w: [`${n / 3}`, `${n * 2}`, `${n - 2}`] } },
                    () => { const e = Math.floor(Math.random() * 5) + 10; return { q: `María tiene ${e} años. Su padre tiene el triple. ¿Cuántos años tiene el padre?`, c: `${e * 3}`, w: [`${e * 2}`, `${e + 10}`, `${e * 3 - 2}`] } },
                    () => { const a = Math.floor(Math.random() * 5) + 5, b = a + 2, c = a + 4; return { q: `Haz la media de ${a}, ${b} y ${c}?`, c: `${(a + b + c) / 3}`, w: [`${a}`, `${c}`, `${a + b}`] } },
                    () => { const l = Math.floor(Math.random() * 3) + 3; return { q: `Volumen de un cubo cuyo lado es de ${l}m`, c: `${l * l * l} m³`, w: [`${l * l} m³`, `${l * 3} m³`, `${l * l * 2} m³`] } },
                    () => { const x = 2, y = 3; return { q: `Evalúa 2x + 3y, si x=2, y=3`, c: `13`, w: [`10`, `6`, `12`] } },
                    () => { const x = Math.floor(Math.random() * 5) + 2; return { q: `Desarrolla: 2·(x + ${x})`, c: `2x + ${2 * x}`, w: [`2x + ${x}`, `x + ${2 * x}`, `4x`] } },
                    () => { const r = Math.floor(Math.random() * 3) + 2, t = 10; return { q: `Si hay una urna con ${r} bolas rojas y ${t - r} azules. ¿Cuál es la probabilidad de sacar una bola roja?`, c: `${r / t}`, w: [`${(t - r) / t}`, `${r}`, `1/${r}`] } }
                ];
                p = mathFuncs[Math.floor(Math.random() * mathFuncs.length)]();
                p.visual = OBSTACLES.MATH;
                p.subject = "MATEMÁTICAS";
                p.typeKey = 'MATH';
                break;

            case 'CHEMISTRY':
                const chemQ = [
                    { q: "¿Cuál es el símbolo químico del Oro?", c: "Au", w: ["Ag", "Or", "Fe"] },
                    { q: "¿Cuál es el pH de una sustancia neutra?", c: "7", w: ["0", "14", "5"] },
                    { q: "¿Qué gas respiramos principalmente del aire?", c: "Nitrógeno", w: ["Oxígeno", "Helio", "Carbono"] }, // Trampa común, el aire es 78% N2
                    { q: "¿Qué partícula atómica tiene carga negativa?", c: "Electrón", w: ["Protón", "Neutrón", "Fotón"] },
                    { q: "¿Cuál es la fórmula química del agua?", c: "H2O", w: ["HO2", "H2O2", "CO2"] },
                    { q: "¿Qué carga tiene un protón?", c: "Positiva", w: ["Negativa", "Neutra", "Variable"] },
                    { q: "¿Cuál es el proceso de paso de estado sólido a líquido?", c: "Fusión", w: ["Evaporación", "Sublimación", "Condensación"] },
                    { q: "¿Cuál es el proceso de paso de estado líquido a gas?", c: "Vaporización", w: ["Fusión", "Ebullición exacta", "Solidificación"] },
                    { q: "¿Cuál de estas es una mezcla homogénea?", c: "Agua salada", w: ["Agua y aceite", "Granito", "Una ensalada"] },
                    { q: "¿Cuál es el símbolo químico del Hierro?", c: "Fe", w: ["Ir", "Hi", "H"] },
                    { q: "¿Qué indica el Número Atómico (Z)?", c: "Número de protones", w: ["Suma de protones y neutrones", "Electrones en valencia", "El peso del átomo"] },
                    { q: "¿Cuál de estos es un gas noble?", c: "Helio", w: ["Oxígeno", "Cloro", "Sodio"] },
                    { q: "La sal común es cloruro de...", c: "Sodio", w: ["Potasio", "Calcio", "Magnesio"] },
                    { q: "El centro del átomo se llama...", c: "Núcleo", w: ["Corteza", "Centroide", "Protón"] },
                    { q: "¿Cuál es el símbolo químico del Sodio?", c: "Na", w: ["So", "S", "Ni"] },
                    { q: "¿Qué proceso es quemar un papel?", c: "Químico", w: ["Físico", "Reversible", "Mecánico"] },
                    { q: "¿Qué proceso es romper un cristal?", c: "Físico", w: ["Químico", "Molecular", "Atómico"] },
                    { q: "¿Qué partícula NO tiene carga eléctrica?", c: "Neutrón", w: ["Protón", "Electrón", "Positrón"] },
                    { q: "¿Qué pH tiene un ácido fuerte?", c: "1", w: ["7", "14", "10"] },
                    { q: "¿Cuál es el elemento esencial en moléculas orgánicas?", c: "Carbono", w: ["Nitrógeno", "Hierro", "Calcio"] }
                ];
                const qC = chemQ[Math.floor(Math.random() * chemQ.length)];
                p = { ...qC, visual: OBSTACLES.CHEMISTRY, subject: "QUÍMICA", typeKey: 'CHEMISTRY' };
                break;

            case 'BIOLOGY':
                const bioQ = [
                    { q: "¿Qué orgánulo produce energía (ATP) celular?", c: "Mitocondria", w: ["Núcleo", "Ribosoma", "Lisosoma"] },
                    { q: "¿Qué molécula contiene la información genética?", c: "ADN", w: ["ARN", "Proteína", "Glucosa"] },
                    { q: "¿Qué proceso realizan las plantas para fabricar su alimento?", c: "Fotosíntesis", w: ["Respiración celular", "Mitosis", "Digestión"] },
                    { q: "¿Qué tipo de animal come grandes porciones de plantas?", c: "Herbívoro", w: ["Carnívoro", "Omnívoro", "Insectívoro"] },
                    { q: "¿Qué es una célula?", c: "Unidad estructural y funcional de los seres vivos", w: ["Tejido", "Órgano", "Átomo"] },
                    { q: "¿A qué reino pertenecen las levaduras y mohos?", c: "Fungi (Hongos)", w: ["Móneras", "Proctistas", "Plantae"] },
                    { q: "¿Qué tipo de célula recubre casi todo nuestro cuerpo?", c: "Célula epitelial", w: ["Célula nerviosa", "Glóbulo rojo", "Hepatocito"] },
                    { q: "¿Dónde ocurre la digestión química estomacal principal?", c: "Estómago", w: ["Esófago", "Hígado", "Intestino Grueso"] },
                    { q: "¿Qué vaso sanguíneo lleva sangre del corazón al cuerpo?", c: "Arteria", w: ["Vena", "Capilar", "Bronquio"] },
                    { q: "¿Qué célula es responsable de la defensa del cuerpo?", c: "Glóbulo blanco", w: ["Glóbulo rojo", "Plaqueta", "Neurona"] },
                    { q: "¿Qué tipo de células son las bacterianas (sin núcleo)?", c: "Procariotas", w: ["Eucariotas animal", "Eucariotas vegetal", "Protistas"] },
                    { q: "¿Qué órgano filtra y purifica la sangre produciendo orina?", c: "Riñón", w: ["Hígado", "Pulmón", "Estómago"] },
                    { q: "¿Qué son las aberturas en las hojas para el intercambio gaseoso vegetal?", c: "Estomas", w: ["Cloroplastos", "Tricomas", "Vacuolas"] },
                    { q: "¿Qué es el conjunto de todos los individuos de una misma especie en el mismo lugar?", c: "Población", w: ["Comunidad", "Ecosistema", "Biosfera"] },
                    { q: "¿Qué pigmento verde es esencial para la fotosíntesis?", c: "Clorofila", w: ["Hemoglobina", "Melanina", "Caroteno"] },
                    { q: "¿Cuántos cromosomas humanos típicos hay en una célula somática?", c: "46", w: ["23", "48", "21"] },
                    { q: "¿Qué parte de la célula controla sus funciones?", c: "Núcleo", w: ["Citoplasma", "Membrana Celular", "Retículo Endoplasmático"] },
                    { q: "¿Qué son los leones en la cadena trófica?", c: "Consumidores secundarios/terciarios", w: ["Productores", "Consumidores primarios", "Descomponedores"] },
                    { q: "¿Cuál es el hueso más largo del cuerpo humano?", c: "Fémur", w: ["Tibia", "Húmero", "Costilla"] },
                    { q: "¿Qué parte del sistema nervioso controla actos reflejos rápidos?", c: "Médula espinal", w: ["Cerebro", "Cerebelo", "Nervio óptico"] }
                ];
                const qB = bioQ[Math.floor(Math.random() * bioQ.length)];
                p = { ...qB, visual: OBSTACLES.BIOLOGY, subject: "BIOLOGÍA", typeKey: 'BIOLOGY' };
                break;

            case 'TECH':
                const techQ = [
                    { q: "¿Qué significa CPU?", c: "Central Processing Unit", w: ["Central Power Unit", "Computer Personal Unit", "Control Panel User"] },
                    { q: "¿Cuál es el código binario de 5?", c: "101", w: ["111", "100", "010"] },
                    { q: "¿Qué material es un buen conductor de electricidad?", c: "Cobre", w: ["Madera", "Plástico", "Vidrio"] },
                    { q: "¿Qué componente de ordenador sirve para almacenar datos permanentemente?", c: "Disco Duro (HDD/SSD)", w: ["Memoria RAM", "Procesador", "Placa Base"] },
                    { q: "¿Qué lenguaje se utiliza para las estructuras de páginas web?", c: "HTML", w: ["Snake", "C++", "Excel"] },
                    { q: "¿A qué género pertenece una palanca como el balancín?", c: "Primer Género", w: ["Segundo Género", "Tercer Género", "Cuarto Género"] },
                    { q: "¿A qué género pertenece una carretilla?", c: "Segundo Género", w: ["Primer Género", "Tercer Género", "Cuarto Género"] },
                    { q: "¿Qué herramienta es ideal para cortar madera en curva?", c: "Sierra de calar", w: ["Serrucho ordinario", "Taladro", "Lijadora"] },
                    { q: "¿Qué componente eléctrico almacena carga y se opone al voltaje?", c: "Condensador", w: ["Resistencia", "Bobina", "Diodo"] },
                    { q: "¿Qué componente eléctrico sólo deja pasar corriente en un sentido?", c: "Diodo", w: ["Transistor", "Interruptor", "Pila"] },
                    { q: "¿Qué mecanismo transmite movimiento entre ejes lejanos?", c: "Correa y poleas", w: ["Engranajes directos", "Tornillo sin fin", "Leva"] },
                    { q: "¿Cómo se llama el software vital que arranca el hardware (ej: BIOS/UEFI)?", c: "Firmware", w: ["Malware", "Freeware", "Shareware"] },
                    { q: "¿De dónde se extraen los metales puros mayoritariamente?", c: "Minerales", w: ["Árboles", "Petróleo", "Arena"] },
                    { q: "¿Qué tipo de plástico puede fundirse y moldearse múltiples veces?", c: "Termoplástico", w: ["Termoestable", "Elastómero", "Silicona"] },
                    { q: "¿En qué energía se basan las centrales diseñadas para aprovechar la fuerza del viento?", c: "Energía eólica", w: ["Energía térmica", "Energía lumínica", "Energía química"] },
                    { q: "¿Qué voltaje típico hay en los enchufes domésticos europeos?", c: "230V", w: ["120V", "12V", "5V"] },
                    { q: "¿De qué derivan los plásticos ordinarios en su gran mayoría?", c: "Petróleo", w: ["Carbón", "Gas natural", "Fibras vegetales"] },
                    { q: "Si sumas resistencias en SERIE, la resistencia equivalente...", c: "Aumenta", w: ["Disminuye", "Se queda igual", "Se hace cero"] },
                    { q: "¿Qué dispositivo de dibujo asistido por ordenador es el más común?", c: "Ratón / Tableta Digitalizadora", w: ["Impresora", "Altavoces", "Torre"] },
                    { q: "¿Qué significa las siglas LED?", c: "Diodo Emisor de Luz", w: ["Luz Extra Duradera", "Lámpara de Energía Doble", "Laser Emission Device"] }
                ];
                const qT = techQ[Math.floor(Math.random() * techQ.length)];
                p = { ...qT, visual: OBSTACLES.TECH, subject: "TECNOLOGÍA", typeKey: 'TECH' };
                break;
        }

        p.c = String(p.c);
        const seen = new Set();
        seen.add(p.c);

        p.w = p.w.map(opt => {
            let val = String(opt);
            let safety = 0;
            while (seen.has(val) && safety < 10) {
                const newVal = val.replace(/-?\d+(\.\d+)?/, m => parseFloat(m) + 1);
                if (newVal === val) val += "*";
                else val = newVal;
                safety++;
            }
            seen.add(val);
            return val;
        });

        const allOpts = [p.c, ...p.w].sort(() => Math.random() - 0.5);

        return {
            typeKey: p.typeKey,
            visual: p.visual,
            subject: p.subject,
            question: p.q,
            options: allOpts,
            correctIndex: allOpts.indexOf(p.c)
        };
    }
};