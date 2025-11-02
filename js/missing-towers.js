// ===== LÓGICA DO MODAL: TORRES SEM CADASTRO (MISSING) =====
// Este script depende de:
// 1. allTowers (definido em tabela.js)
// 2. MAPAS e SERVIDORES (definidos em cadastro.js ou tabela.js)

let allMissingTowers = []; // Torres que não estão ativas

/**
 * Abre o modal de torres sem cadastro e inicia o carregamento.
 */
function openMissingModal() {
    console.log('🔓 Abrindo modal de torres sem cadastro...');
    
    // Assegura que os dados de torres ativas (allTowers) estejam carregados
    // Se a variável allTowers estiver vazia, força uma recarga.
    if (allTowers.length === 0 && typeof loadTowersFromFirebase === 'function') {
        console.log('⚠️ allTowers está vazio. Recarregando dados do Firebase...');
        loadTowersFromFirebase(); // Garante que temos os dados
    }
    
    // A lógica de carregar o modal foi movida para dentro de loadMissingTowers
    // para garantir que os dados estejam prontos.
    loadMissingTowers();
}

/**
 * Fecha o modal de torres sem cadastro.
 */
function closeMissingModal() {
    console.log('🔒 Fechando modal de torres sem cadastro...');
    const modal = document.getElementById('missingModal');
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
        
        // Limpa a lista e filtros para a próxima abertura
        const listContainer = document.getElementById('missingListContainer');
        if (listContainer) {
            listContainer.innerHTML = '';
        }
        
        const filterMapa = document.getElementById('filterMissingMapa');
        const filterServidor = document.getElementById('filterMissingServidor');
        
        if(filterMapa) filterMapa.innerHTML = '<option value="">Todos</option>';
        if(filterServidor) filterServidor.innerHTML = '<option value="">Todos</option>';

        allMissingTowers = []; // Limpa cache
    }
}

/**
 * Carrega todas as torres que NÃO estão na lista de ativas.
 */
function loadMissingTowers() {
    const listContainer = document.getElementById('missingListContainer');
    // Proteção: Não fazer nada se o container não existir
    if (!listContainer) {
        console.error("Elemento 'missingListContainer' não encontrado.");
        return;
    }
    
    listContainer.innerHTML = '<p>Calculando torres sem cadastro...</p>';

    // 1. Criar um "mapa" de torres ativas para busca rápida.
    const activeTowersMap = new Set();
    allTowers.forEach(torre => {
        activeTowersMap.add(`${torre.mapa}-${torre.servidor}`);
    });

    allMissingTowers = []; // Limpa cache anterior

    // 2. Iterar por TODAS as combinações possíveis de Mapa e Servidor
    // Verifica se MAPAS e SERVIDORES existem (evita erro caso cadastro.js falhe)
    if (typeof MAPAS === 'undefined' || typeof SERVIDORES === 'undefined') {
        console.error("MAPAS ou SERVIDORES não estão definidos. Verifique cadastro.js ou tabela.js");
        listContainer.innerHTML = '<p>Erro: Dados de mapas não carregados.</p>';
        return;
    }
    
    MAPAS.forEach(mapa => {
        SERVIDORES.forEach(servidor => {
            const torreKey = `${mapa}-${servidor}`;
            
            // 3. Se a combinação NÃO ESTÁ no mapa de ativas, ela está "sem cadastro"
            if (!activeTowersMap.has(torreKey)) {
                allMissingTowers.push({
                    mapa: mapa,
                    servidor: servidor.toString() // Garante que é string
                });
            }
        });
    });

    console.log(`✅ ${allMissingTowers.length} torres sem cadastro encontradas.`);

    // Abre o modal AGORA, pois os dados estão prontos
    const modal = document.getElementById('missingModal');
    if (modal) {
        modal.classList.add('active');
        modal.style.display = 'flex';
    }

    if (allMissingTowers.length > 0) {
        populateMissingFilters();
        renderMissingList();
    } else {
        listContainer.innerHTML = `
            <div class="expired-empty-state">
                <div class="empty-icon">🎉</div>
                <h3>Tudo cadastrado!</h3>
                <p>Todas as torres possíveis estão ativas no momento.</p>
            </div>`;
    }
}

/**
 * Popula os filtros <select> do modal com base nas torres encontradas.
 */
function populateMissingFilters() {
    const filterMapa = document.getElementById('filterMissingMapa');
    const filterServidor = document.getElementById('filterMissingServidor');

    // Proteção caso os elementos não existam
    if (!filterMapa || !filterServidor) return;

    // Usamos os dados de allMissingTowers para os filtros
    const mapas = [...new Set(allMissingTowers.map(t => t.mapa))].sort();
    const servidores = [...new Set(allMissingTowers.map(t => t.servidor))].sort((a, b) => parseInt(a) - parseInt(b));

    filterMapa.innerHTML = '<option value="">Todos</option>';
    filterServidor.innerHTML = '<option value="">Todos</option>';

    mapas.forEach(mapa => {
        filterMapa.appendChild(new Option(mapa, mapa));
    });

    servidores.forEach(servidor => {
        filterServidor.appendChild(new Option(servidor, servidor));
    });
}

/**
 * Renderiza a lista/tabela de torres sem cadastro no modal.
 */
function renderMissingList() {
    const filterMapa = document.getElementById('filterMissingMapa').value;
    const filterServidor = document.getElementById('filterMissingServidor').value;
    const listContainer = document.getElementById('missingListContainer');

    // Proteção caso o elemento não exista
    if (!listContainer) return;

    let filteredTowers = allMissingTowers;

    if (filterMapa) {
        filteredTowers = filteredTowers.filter(t => t.mapa === filterMapa);
    }
    if (filterServidor) {
        filteredTowers = filteredTowers.filter(t => t.servidor === filterServidor);
    }

    if (filteredTowers.length === 0) {
        listContainer.innerHTML = `
            <div class="expired-empty-state">
                <div class="empty-icon">📭</div>
                <h3>Nenhum resultado</h3>
                <p>Nenhuma torre sem cadastro encontrada com os filtros aplicados.</p>
            </div>`;
        return;
    }

    // Criar tabela
    const table = document.createElement('table');
    table.innerHTML = `
        <thead>
            <tr>
                <th>Mapa</th>
                <th>Servidor</th>
            </tr>
        </thead>
    `;
    
    const tbody = document.createElement('tbody');
    // Ordena por mapa, depois por servidor
    filteredTowers.sort((a, b) => {
        if (a.mapa < b.mapa) return -1;
        if (a.mapa > b.mapa) return 1;
        return parseInt(a.servidor) - parseInt(b.servidor);
    });

    filteredTowers.forEach(torre => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${torre.mapa}</strong></td>
            <td>${torre.servidor}</td>
        `;
        tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    listContainer.innerHTML = ''; // Limpa "carregando"
    listContainer.appendChild(table);
}