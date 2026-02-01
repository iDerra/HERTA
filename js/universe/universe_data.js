const OBSTACLES = {
    PHYSICS:   { emoji: "⚡", color: "#f1c40f", name: "Constructo Volt" },
    CHEMISTRY: { emoji: "🧪", color: "#00b894", name: "Slime Ácido" },
    BIOLOGY:   { emoji: "🧬", color: "#e056fd", name: "Virus Mutante" },
    ASTRO:     { emoji: "🪐", color: "#0984e3", name: "Vigilante Estelar" },
    MATH:      { emoji: "📐", color: "#e17055", name: "Gólem Geométrico" },
    TECH:      { emoji: "💻", color: "#74b9ff", name: "Bot Corrupto" },
    BOSS:      { emoji: "👿", color: "#ff7675", name: "BOSS: Bestia del Juicio" }
};

window.UniverseData = {

    generateBossGauntlet: function() {
        const q1 = this.generateProblem(true);
        const q2 = this.generateProblem(true);
        const q3 = this.generateProblem(true);

        q1.visual = OBSTACLES.BOSS; q1.subject = "BOSS - FASE 1";
        q2.visual = OBSTACLES.BOSS; q2.subject = "BOSS - FASE 2";
        q3.visual = OBSTACLES.BOSS; q3.subject = "BOSS - FASE FINAL";

        return [q1, q2, q3];
    },

    generateProblem: function(isBossContext = false) {
        const types = ['PHYSICS', 'CHEMISTRY', 'BIOLOGY', 'MATH', 'TECH'];
        const selected = types[Math.floor(Math.random() * types.length)];
        
        let p = {};

        switch(selected) {
            case 'PHYSICS':
                const physType = Math.floor(Math.random() * 5);
                if (physType === 0) { 
                    const v = (Math.floor(Math.random() * 8) + 2) * 10;
                    const t = Math.floor(Math.random() * 5) + 2;
                    p = { q: `Si v=${v} m/s y t=${t} s, ¿distancia? (d=v·t)`, c: `${v*t} m`, w: [`${v+t} m`, `${v*10} m`, `${v/2} m`] };
                } else if (physType === 1) { 
                    const m = Math.floor(Math.random() * 10) + 1;
                    const a = Math.floor(Math.random() * 5) + 2;
                    p = { q: `Masa=${m}kg, Aceleración=${a}m/s². ¿Fuerza? (F=m·a)`, c: `${m*a} N`, w: [`${m+a} N`, `${m*10} N`, `${a*2} N`] };
                } else if (physType === 2) { 
                    const m = 10, g = 9.8, h = Math.floor(Math.random() * 10) + 1;
                    p = { q: `Objeto de 10kg a ${h}m de altura. (Ep = m·g·h, g=9.8)`, c: `${(m*g*h).toFixed(0)} J`, w: [`${h*10} J`, `${h*100} J`, `${50} J`] };
                } else if (physType === 3) { 
                    const i = Math.floor(Math.random() * 5) + 1;
                    const r = Math.floor(Math.random() * 10) + 2;
                    p = { q: `Intensidad=${i}A, Resistencia=${r}Ω. ¿Voltaje? (V=I·R)`, c: `${i*r} V`, w: [`${i+r} V`, `${r/i} V`, `${100} V`] };
                } else { 
                    const mas = 100, vol = Math.floor(Math.random() * 4) + 1; 
                    p = { q: `Masa=100g, Volumen=${vol}cm³. ¿Densidad?`, c: `${(100/vol).toFixed(1)} g/cm³`, w: [`${100*vol} g/cm³`, `10 g/cm³`, `1 g/cm³`] };
                }
                p.visual = OBSTACLES.PHYSICS;
                p.subject = "FÍSICA";
                break;

            case 'MATH':
                const mathType = Math.floor(Math.random() * 5);
                if (mathType === 0) { 
                    const x = Math.floor(Math.random() * 10) + 1;
                    const res = 2 * x + 5;
                    p = { q: `Resuelve: 2x + 5 = ${res}`, c: `x = ${x}`, w: [`x = ${x+1}`, `x = ${x-1}`, `x = ${x*2}`] };
                } else if (mathType === 1) { 
                    const b = Math.floor(Math.random() * 10) + 2;
                    const h = Math.floor(Math.random() * 10) + 2;
                    p = { q: `Área de un triángulo con base=${b} y altura=${h}?`, c: `${(b*h)/2}`, w: [`${b*h}`, `${b+h}`, `${(b*h)/4}`] };
                } else if (mathType === 2) { 
                    const total = 200;
                    const pct = [10, 20, 50, 25][Math.floor(Math.random()*4)];
                    p = { q: `¿Cuánto es el ${pct}% de ${total}?`, c: `${(total*pct)/100}`, w: [`${pct}`, `${total/2}`, `${pct*2}`] };
                } else if (mathType === 3) { 
                    const base = Math.floor(Math.random() * 5) + 2;
                    p = { q: `Calcula: ${base} al cubo (${base}³)`, c: `${base*base*base}`, w: [`${base*3}`, `${base*base}`, `${base+3}`] };
                } else { 
                    p = { q: `En un triángulo rectángulo, catetos 3 y 4. ¿Hipotenusa?`, c: `5`, w: [`6`, `7`, `12`] };
                }
                p.visual = OBSTACLES.MATH;
                p.subject = "MATEMÁTICAS";
                break;

            case 'CHEMISTRY':
                const chemQ = [
                    { q: "¿Símbolo químico del Oro?", c: "Au", w: ["Ag", "Or", "Fe"] },
                    { q: "¿pH de una sustancia neutra?", c: "7", w: ["0", "14", "5"] },
                    { q: "¿Qué gas respiramos principalmente?", c: "Oxígeno", w: ["Hidrógeno", "Helio", "Carbono"] },
                    { q: "¿Partícula atómica con carga negativa?", c: "Electrón", w: ["Protón", "Neutrón", "Fotón"] },
                    { q: "¿Fórmula del agua?", c: "H2O", w: ["HO2", "H2O2", "CO2"] }
                ];
                const qC = chemQ[Math.floor(Math.random() * chemQ.length)];
                p = { ...qC, visual: OBSTACLES.CHEMISTRY, subject: "QUÍMICA" };
                break;

            case 'BIOLOGY':
                const bioQ = [
                    { q: "¿Qué orgánulo produce energía (ATP)?", c: "Mitocondria", w: ["Núcleo", "Ribosoma", "Lisosoma"] },
                    { q: "¿Molécula con la información genética?", c: "ADN", w: ["ARN", "Proteína", "Glucosa"] },
                    { q: "¿Proceso por el que las plantas comen?", c: "Fotosíntesis", w: ["Respiración", "Mitosis", "Digestión"] },
                    { q: "¿Animal que come solo plantas?", c: "Herbívoro", w: ["Carnívoro", "Omnívoro", "Insectívoro"] },
                    { q: "¿Unidad básica de la vida?", c: "Célula", w: ["Tejido", "Órgano", "Átomo"] }
                ];
                const qB = bioQ[Math.floor(Math.random() * bioQ.length)];
                p = { ...qB, visual: OBSTACLES.BIOLOGY, subject: "BIOLOGÍA" };
                break;

            case 'TECH':
                const techQ = [
                    { q: "¿Qué significa CPU?", c: "Central Processing Unit", w: ["Central Power Unit", "Computer Personal Unit", "Control Panel User"] },
                    { q: "¿Código binario de 5?", c: "101", w: ["111", "100", "010"] },
                    { q: "¿Material que conduce electricidad?", c: "Cobre", w: ["Madera", "Plástico", "Vidrio"] },
                    { q: "¿Componente para almacenar datos a largo plazo?", c: "Disco Duro", w: ["RAM", "Procesador", "Ventilador"] },
                    { q: "¿Lenguaje de las páginas web?", c: "HTML", w: ["Snake", "C++", "Excel"] }
                ];
                const qT = techQ[Math.floor(Math.random() * techQ.length)];
                p = { ...qT, visual: OBSTACLES.TECH, subject: "TECNOLOGÍA" };
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
            visual: p.visual,
            subject: p.subject,
            question: p.q,
            options: allOpts,
            correctIndex: allOpts.indexOf(p.c)
        };
    }
};