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
    duracaoSegundos: 48 * 60 * 60
};
