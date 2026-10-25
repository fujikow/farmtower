// ===== LÓGICA DO MODAL: TORRES SEM CADASTRO (MISSING) =====
// Este script depende de:
// 1. allTowers (definido em tabela.js)
// 2. MAPAS e SERVIDORES (definidos em cadastro.js ou tabela.js)

// ESTRUTURA MODIFICADA: Agora é um objeto para agrupar servidores por mapa
// Ex: { "Lorencia": ["1", "2", "4"], "Devias": ["3"] }
let allMissingTowers = {}; 

/**
 * Abre o modal de torres sem cadastro e inicia o carregamento.
 */
function openMissingModal() {
    console.log('🔓 Abrindo modal de torres sem cadastro...');
    
    // Assegura que os dados de torres ativas (allTowers) estejam carregados
    if (allTowers.length === 0 && typeof loadTowersFromFirebase === 'function') {
        console.log('⚠️ allTowers está vazio. Recarregando dados do Firebase...');
        loadTowersFromFirebase(); 
    }
    
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

        allMissingTowers = {}; // Limpa cache (resetando para objeto)
    }
}

/**
 * Carrega todas as torres que NÃO estão na lista de ativas.
 * LÓGICA MODIFICADA para agrupar servidores.
 */
function loadMissingTowers() {
    const listContainer = document.getElementById('missingListContainer');
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

    allMissingTowers = {}; // Limpa cache anterior (resetando para objeto)

    // 2. Verifica se MAPAS e SERVIDORES existem
    if (typeof MAPAS === 'undefined' || typeof SERVIDORES === 'undefined') {
        console.error("MAPAS ou SERVIDORES não estão definidos. Verifique cadastro.js ou tabela.js");
        listContainer.innerHTML = '<p>Erro: Dados de mapas não carregados.</p>';
        return;
    }

    // 3. Iterar por TODAS as combinações
    MAPAS.forEach(mapa => {
        SERVIDORES.forEach(servidor => {
            const torreKey = `${mapa}-${servidor}`;
            
            // 4. Se a combinação NÃO ESTÁ no mapa de ativas...
            if (!activeTowersMap.has(torreKey)) {
                
                // 5. (MODIFICADO) Adiciona ao grupo do mapa
                // Se o mapa ainda não está no nosso objeto, cria um array vazio para ele
                if (!allMissingTowers[mapa]) {
                    allMissingTowers[mapa] = [];
                }
                // Adiciona o servidor ao array desse mapa
                allMissingTowers[mapa].push(servidor.toString());
            }
        });
    });

    console.log(`✅ ${Object.keys(allMissingTowers).length} mapas com torres faltando.`);

    // Abre o modal AGORA, pois os dados estão prontos
    const modal = document.getElementById('missingModal');
    if (modal) {
        modal.classList.add('active');
        modal.style.display = 'flex';
    }

    // LÓGICA MODIFICADA: Verifica o tamanho do objeto
    if (Object.keys(allMissingTowers).length > 0) {
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
 * LÓGICA MODIFICADA para ler a nova estrutura de dados.
 */
function populateMissingFilters() {
    const filterMapa = document.getElementById('filterMissingMapa');
    const filterServidor = document.getElementById('filterMissingServidor');
    if (!filterMapa || !filterServidor) return;

    // LÓGICA MODIFICADA:
    // Mapas são as chaves do nosso objeto
    const mapas = Object.keys(allMissingTowers).sort();
    
    // Servidores são todos os valores, achatados (flat) e únicos (Set)
    const allServersSet = new Set();
    Object.values(allMissingTowers).forEach(serverArray => {
        serverArray.forEach(server => allServersSet.add(server));
    });
    const servidores = [...allServersSet].sort((a, b) => parseInt(a) - parseInt(b));

    // O resto da lógica é a mesma
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
 * LÓGICA MODIFICADA para agrupar servidores.
 */
function renderMissingList() {
    const filterMapa = document.getElementById('filterMissingMapa').value;
    const filterServidor = document.getElementById('filterMissingServidor').value;
    const listContainer = document.getElementById('missingListContainer');
    if (!listContainer) return;

    let filteredData = {};

    // 1. Filtrar os dados
    if (!filterMapa && !filterServidor) {
        // Sem filtros, usa todos os dados
        filteredData = allMissingTowers;
    } else {
        // Loop principal sobre os dados originais
        for (const mapa in allMissingTowers) {
            // Filtro de Mapa: Se um mapa foi selecionado E não é este mapa, pula
            if (filterMapa && mapa !== filterMapa) {
                continue;
            }

            const servidoresDoMapa = allMissingTowers[mapa];

            // Filtro de Servidor:
            if (filterServidor) {
                // Se o servidor selecionado EXISTE neste mapa...
                if (servidoresDoMapa.includes(filterServidor)) {
                    // ...adiciona ao resultado, mas MOSTRA APENAS O SERVIDOR FILTRADO
                    filteredData[mapa] = [filterServidor];
                }
            } else {
                // Se não há filtro de servidor, mas passou no filtro de mapa, adiciona todos
                filteredData[mapa] = servidoresDoMapa;
            }
        }
    }

    // 2. Verificar se o resultado filtrado está vazio
    if (Object.keys(filteredData).length === 0) {
        listContainer.innerHTML = `
            <div class="expired-empty-state">
                <div class="empty-icon">📭</div>
                <h3>Nenhum resultado</h3>
                <p>Nenhuma torre sem cadastro encontrada com os filtros aplicados.</p>
            </div>`;
        return;
    }

    // 3. Renderizar a tabela
    const table = document.createElement('table');
    table.innerHTML = `
        <thead>
            <tr>
                <th>Mapa</th>
                <th>Servidores sem Cadastro</th>
            </tr>
        </thead>
    `;
    
    const tbody = document.createElement('tbody');
    
    // Ordena pelos nomes dos mapas
    const mapasOrdenados = Object.keys(filteredData).sort();

    mapasOrdenados.forEach(mapa => {
        const tr = document.createElement('tr');

        const mapaCell = document.createElement('td');
        const mapaLabel = document.createElement('strong');
        mapaLabel.textContent = mapa;
        mapaCell.appendChild(mapaLabel);

        const serverCell = document.createElement('td');
        serverCell.className = 'missing-servers';
        filteredData[mapa].forEach((servidor) => {
            const link = document.createElement('a');
            link.className = 'missing-server-link';
            link.href = `index.html?mapa=${encodeURIComponent(mapa)}&servidor=${encodeURIComponent(servidor)}`;
            link.textContent = servidor;
            link.title = getTranslation('missing_register_hint');
            serverCell.appendChild(link);
        });

        tr.append(mapaCell, serverCell);
        tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    listContainer.innerHTML = ''; // Limpa "carregando"
    listContainer.appendChild(table);
}