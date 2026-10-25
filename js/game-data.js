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

var FIELD_LIMITS = {
    dono: 40,
    localizacao: 80,
    duracaoSegundos: 48 * 60 * 60
};
