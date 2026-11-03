// Lista única de mapas e servidores. As duas páginas precisam da mesma fonte:
// se a tabela usar uma lista menor, servidores somem de "Torres sem cadastro".
var MAPAS = [
    'Lorencia',
    'Dungeon',
    'Devias',
    'Noria',
    'Lost Tower',
    'Arena',
    'Atlans',
    'Tarkan',
    'Icarus',
    'Aida',
    'Kanturu',
    'Elbeland',
    'Raklion',
    'Vulcanus',
    'Ferea'
];

var SERVIDORES = [1, 2, 3, 4, 5, 6, 7, 8, 11, 12, 14, 15, 16, 17, 19];

var SERVIDORES_ALEATORIOS = ['4', '5', '6', '7', '8', '11', '12', '14', '15'];

function normalizeServerId(value) {
    const id = String(value || '').trim();
    const number = Number(id);
    if (!/^(1[0-9]|[1-9])$/.test(id) || number < 1 || number > 19) return '';
    return String(number);
}

function serverCatalogFromLists(numeros, aleatorios) {
    const random = new Set((aleatorios || []).map(String));
    return (numeros || []).map(normalizeServerId).filter(Boolean).filter((id, index, all) => all.indexOf(id) === index).sort((a, b) => Number(a) - Number(b)).map((id) => ({
        id: id,
        aleatorio: random.has(id)
    }));
}

function applyServerCatalog(value) {
    if (!value || typeof value !== 'object') return false;
    // Números seguidos voltam do Firebase como lista, com buracos vazios.
    if (Array.isArray(value)) {
        const record = {};
        value.forEach((item, index) => {
            if (typeof item === 'boolean' && index > 0) record[String(index)] = item;
        });
        value = record;
    }
    const entries = Object.keys(value).filter((id) => normalizeServerId(id) === id && typeof value[id] === 'boolean').sort((a, b) => Number(a) - Number(b));
    if (!entries.length) return false;
    SERVIDORES = entries.map(Number);
    SERVIDORES_ALEATORIOS = entries.filter((id) => value[id] === true);
    if (typeof loadServidoresOptions === 'function') loadServidoresOptions();
    if (typeof updateStats === 'function') updateStats();
    const missing = typeof document !== 'undefined' ? document.getElementById('missingModal') : null;
    if (missing && missing.classList.contains('active') && typeof loadMissingTowers === 'function') loadMissingTowers();
    return true;
}

var FIELD_LIMITS = {
    dono: 40,
    localizacao: 80,
    duracaoSegundos: 54 * 60 * 60
};

// Horas pagas. As 2h grátis da calculadora não entram nesta conta.
var JOIAS_HORAS_MEDIDAS = 44;
var JOIAS_HORAS_MAX = 54;

// Joias acumuladas por hora paga, medidas no jogo até 44h.
// A 3ª diferença da série fica perto de 0,5, então o crescimento é cúbico
// (termo principal ≈ n³ / 14,635). Arredondar a cúbica de joiasParaHoras
// reproduz, sem erro, cada valor de 24h a 44h. De 45h a 54h ela extrapola.
var TABELA_JOIAS = {
    0: 0, 1: 5, 2: 12, 3: 22, 4: 36, 5: 55,
    6: 80, 7: 111, 8: 149, 9: 194, 10: 248,
    11: 310, 12: 382, 13: 464, 14: 556, 15: 659,
    16: 774, 17: 901, 18: 1041, 19: 1194, 20: 1360,
    21: 1540, 22: 1735, 23: 1945, 24: 2171, 25: 2412,
    26: 2670, 27: 2945, 28: 3237, 29: 3547, 30: 3875,
    31: 4222, 32: 4588, 33: 4973, 34: 5378, 35: 5803,
    36: 6249, 37: 6716, 38: 7204, 39: 7714, 40: 8247,
    41: 8802, 42: 9380, 43: 9982, 44: 10608
};

function joiasParaHoras(horas) {
    const n = Math.max(0, Math.round(Number(horas) || 0));
    if (n <= JOIAS_HORAS_MEDIDAS) return TABELA_JOIAS[n] || 0;
    const estimado = (0.0683301358358545 * n * n * n)
        + (3.144415716498357 * n * n)
        - (35.773614426942 * n)
        + 273.5749981014242;
    return Math.round(estimado);
}
