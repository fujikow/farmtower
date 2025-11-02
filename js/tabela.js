// ===== VARIÁVEIS GLOBAIS =====
let allTowers = [];
let allMissingTowers = []; // Torres que não estão ativas
let updateInterval;

// --- DADOS GERAIS DO JOGO ---
// CORREÇÃO: Verifica se as variáveis já foram declaradas (pelo cadastro.js)
// Se não (estamos na tabela.html), declara elas aqui.
if (typeof MAPAS === 'undefined') {
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
}

if (typeof SERVIDORES === 'undefined') {
 var SERVIDORES = [1, 2, 3, 4, 5, 6, 11, 12, 14, 15, 16, 17, 19];
}


// ===== INICIALIZAÇÃO =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Iniciando tabela.js...');
    
    // Carrega os dados em AMBAS as páginas (index e tabela)
    // A própria função vai filtrar o que deve ser renderizado.
    loadTowersFromFirebase(); 
    
    // O intervalo só roda na página da tabela
    if (document.getElementById('towersTable')) {
        updateInterval = setInterval(() => {
            renderTable(); 
            updateStats(); 
        }, 1000);
    }
});

// ===== CARREGAR TORRES DO FIREBASE =====
function loadTowersFromFirebase() {
    console.log('📡 Conectando ao Firebase...');
    
    towersRef.on('value', (snapshot) => {
        const towers = snapshot.val();
        allTowers = [];
        
        console.log('📦 Dados recebidos do Firebase:', towers);
        
        if (towers) {
            const now = new Date();
            
            Object.keys(towers).forEach(key => {
                const torre = towers[key];
                const finalizacao = new Date(torre.horarioFinalizacao);
                
                // Incluir apenas torres ativas
                if (finalizacao > now) {
                    allTowers.push({
                        id: key,
                        ...torre
                    });
                }
            });
            
            console.log('✅ Torres ativas carregadas:', allTowers.length);
        } else {
            console.log('⚠️ Nenhuma torre encontrada no Firebase');
        }
        
        // Funções que só rodam na página da tabela (agora estão protegidas)
        populateFilters();
        updateStats();
        renderTable();

    }, (error) => {
        console.error('❌ Erro ao carregar torres do Firebase:', error);
    });
}

// ===== POPULAR FILTROS =====
function populateFilters() {
    // Proteção para não rodar no index.html
    const filterMapa = document.getElementById('filterMapa');
    if (!filterMapa) return; 

    const mapas = [...new Set(allTowers.map(t => t.mapa))].sort();
    const servidores = [...new Set(allTowers.map(t => t.servidor))].sort((a, b) => {
        return parseInt(a) - parseInt(b);
    });

    const filterServidor = document.getElementById('filterServidor');

    filterMapa.innerHTML = '<option value="">Todos</option>';
    filterServidor.innerHTML = '<option value="">Todos</option>';

    mapas.forEach(mapa => {
        const option = document.createElement('option');
        option.value = mapa;
        option.textContent = mapa;
        filterMapa.appendChild(option);
    });

    servidores.forEach(servidor => {
        const option = document.createElement('option');
        option.value = servidor;
        option.textContent = servidor;
        filterServidor.appendChild(option);
    });
}

// ===== APLICAR FILTROS =====
function applyFilters() {
    renderTable();
}

// ===== ATUALIZAR ESTATÍSTICAS =====
function updateStats() {
    // Proteção para não rodar no index.html
    const totalTorresEl = document.getElementById('totalTorres');
    if (!totalTorresEl) return; 

    const servidoresAleatorios = ['4', '5', '6', '11', '12', '14', '15'];
    const torresAleatorias = allTowers.filter(t => 
        servidoresAleatorios.includes(t.servidor)
    ).length;

    totalTorresEl.textContent = allTowers.length;
    document.getElementById('torresAtivas').textContent = allTowers.length;
    document.getElementById('torresAleatorias').textContent = torresAleatorias;
}

// ===== RENDERIZAR TABELA (SEM BADGES) =====
function renderTable() {
    // Proteção para não rodar no index.html
    const tableBody = document.getElementById('tableBody');
    if (!tableBody) return; 
    
    const filterMapa = document.getElementById('filterMapa').value;
    const filterServidor = document.getElementById('filterServidor').value;
    const emptyState = document.getElementById('emptyState');
    const table = document.getElementById('towersTable');

    let filteredTowers = allTowers;

    if (filterMapa) {
        filteredTowers = filteredTowers.filter(t => t.mapa === filterMapa);
    }

    if (filterServidor) {
        filteredTowers = filteredTowers.filter(t => t.servidor === filterServidor);
    }

    if (filteredTowers.length === 0) {
        table.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }

    table.style.display = 'table';
    emptyState.style.display = 'none';

    filteredTowers.sort((a, b) => {
        return new Date(a.horarioFinalizacao) - new Date(b.horarioFinalizacao);
    });

    tableBody.innerHTML = '';

    filteredTowers.forEach(torre => {
        const now = new Date();
        const vistoDate = new Date(torre.vistoHorario);
        const finalizacaoDate = new Date(torre.horarioFinalizacao);
        const tempoRestante = calculateTempoRestante(finalizacaoDate, now);
        const statusInfo = getStatusInfo(finalizacaoDate, now);

        const tr = document.createElement('tr');
        tr.classList.add(`row-${statusInfo.class}`);
        
        tr.innerHTML = `
            <td class="col-fix"></td>
            <td style="font-size: 1.5em; text-align: center;">${statusInfo.icon}</td>
            <td><strong>${torre.mapa}</strong></td>
            <td>${torre.servidor}</td>
            <td style="font-weight: 600; text-align: center;">${torre.aleatoriedade}</td>
            <td>${torre.dono}</td>
            <td>${torre.localizacao}</td>
            <td>${formatDateTime(vistoDate)}</td>
            <td>${formatDateTime(finalizacaoDate)}</td>
            <td><strong>${tempoRestante}</strong></td>
        `;
        
        // CÉLULA 11: ID (separada para o clique)
        const td11 = document.createElement('td');
        td11.textContent = torre.id;
        td11.style.fontSize = '0.75em';
        td11.style.color = '#6c757d';
        td11.style.fontFamily = 'monospace';
        td11.title = 'Clique para copiar';
        td11.style.cursor = 'pointer';
        td11.onclick = function() {
            navigator.clipboard.writeText(torre.id);
            alert('ID copiado: ' + torre.id);
        };
        tr.appendChild(td11);

        tableBody.appendChild(tr);
    });
    
    console.log('✅ Tabela renderizada com', filteredTowers.length, 'torres');
}



// ===== OBTER INFORMAÇÕES DE STATUS (UNIFICADA) =====
function getStatusInfo(finalizacao, now) {
    const diff = finalizacao - now;
    const minutes = diff / (1000 * 60);

    if (diff <= 0) {
        return {
            class: 'status-expired', 
            icon: '⚫', 
            text: 'EXPIRADO'
        };
    } else if (minutes < 5) {
        return {
            class: 'status-danger',
            icon: '🔴',
            text: 'CRÍTICO (< 5 min)'
        };
    } else if (minutes < 15) {
        return {
            class: 'status-orange',
            icon: '🟠',
            text: 'ATENÇÃO (< 15 min)'
        };
    } else if (minutes < 30) {
        return {
            class: 'status-warning',
            icon: '🟡',
            text: 'ALERTA (< 30 min)'
        };
    } else {
        return {
            class: 'status-success',
            icon: '🔵',
            text: 'ATIVO'
        };
    }
}

// ===== CALCULAR TEMPO RESTANTE (APENAS HH:MM:SS) =====
function calculateTempoRestante(finalizacao, now) {
    const diff = finalizacao - now;

    if (diff <= 0) {
        return '00:00:00';
    }

    const totalSeconds = Math.floor(diff / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// ===== FORMATAR DATA E HORA =====
function formatDateTime(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

// ===== ATUALIZAR TABELA =====
function refreshTable() {
    // Proteção para não rodar no index.html
    if (!document.getElementById('towersTable')) return; 

    console.log('🔄 Atualizando tabela...');
    renderTable();
}

// ===== EXPORTAR PARA EXCEL =====
function exportToExcel() {
    // Proteção para não rodar no index.html
    if (!document.getElementById('towersTable')) return; 

    if (allTowers.length === 0) {
        showExportMessage('❌ Nenhuma torre para exportar!', 'error');
        return;
    }

    try {
        const filterMapa = document.getElementById('filterMapa').value;
        const filterServidor = document.getElementById('filterServidor').value;
        
        let filteredTowers = allTowers;

        if (filterMapa) {
            filteredTowers = filteredTowers.filter(t => t.mapa === filterMapa);
        }

        if (filterServidor) {
            filteredTowers = filteredTowers.filter(t => t.servidor === filterServidor);
        }

        if (filteredTowers.length === 0) {
            showExportMessage('❌ Nenhuma torre encontrada com os filtros aplicados!', 'error');
            return;
        }

        filteredTowers.sort((a, b) => {
            return new Date(a.horarioFinalizacao) - new Date(b.horarioFinalizacao);
        });

        const now = new Date();
        const exportData = filteredTowers.map(torre => {
            const vistoDate = new Date(torre.vistoHorario);
            const finalizacaoDate = new Date(torre.horarioFinalizacao);
            const tempoRestante = calculateTempoRestante(finalizacaoDate, now);
            const status = getStatusInfo(finalizacaoDate, now).text;

            return {
                'Mapa': torre.mapa,
                'Servidor': torre.servidor,
                'Aleatoriedade': torre.aleatoriedade,
                'Dono': torre.dono,
                'Localização': torre.localizacao,
                'Visto Horário': formatDateTime(vistoDate),
                'Horário Finalização': formatDateTime(finalizacaoDate),
                'Tempo Restante': tempoRestante,
                'Status': status,
                'Duração': torre.duracaoFormatada
            };
        });

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(exportData);

        const colWidths = [
            { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 20 },
            { wch: 25 }, { wch: 20 }, { wch: 20 }, { wch: 12 },
            { wch: 15 }, { wch: 12 }
        ];
        ws['!cols'] = colWidths;

        XLSX.utils.book_append_sheet(wb, ws, 'Torres Ativas');

        const infoData = [
            { 'Informação': 'Total de Torres', 'Valor': filteredTowers.length },
            { 'Informação': 'Torres com Aleatoriedade', 'Valor': filteredTowers.filter(t => t.aleatoriedade === 'Sim').length },
            { 'Informação': 'Data/Hora da Exportação', 'Valor': formatDateTime(now) },
            { 'Informação': 'Exportado por', 'Valor': 'ANBU Farm Tower - MEGAMU' },
            { 'Informação': 'Criado por', 'Valor': 'fujikoftw - O MELHOR DL DO MEGAMU' }
        ];

        const wsInfo = XLSX.utils.json_to_sheet(infoData);
        wsInfo['!cols'] = [{ wch: 30 }, { wch: 40 }];
        XLSX.utils.book_append_sheet(wb, wsInfo, 'Informações');

        const fileName = `ANBU_Farm_Tower_${formatFileNameDate(now)}.xlsx`;
        XLSX.writeFile(wb, fileName);

        showExportMessage('✅ Tabela exportada com sucesso!', 'success');
        
        const btnExport = document.querySelector('.btn-export');
        if (btnExport) {
            btnExport.classList.add('exporting');
            setTimeout(() => {
                btnExport.classList.remove('exporting');
            }, 500);
        }

    } catch (error) {
        console.error('❌ Erro ao exportar:', error);
        showExportMessage('❌ Erro ao exportar tabela!', 'error');
    }
}

function formatFileNameDate(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0'); 

    return `${day}-${month}-${year}_${hours}h${minutes}m`;
}

function showExportMessage(message, type) {
    let tooltip = document.querySelector('.export-tooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.className = 'export-tooltip';
        document.body.appendChild(tooltip);
    }

    tooltip.textContent = message;
    tooltip.style.background = type === 'success' 
        ? 'rgba(13, 110, 253, 0.95)' 
        : 'rgba(0, 0, 0, 0.95)';
    tooltip.style.borderColor = type === 'success'
        ? 'var(--gremio-azul)'
        : 'var(--status-critico)';

    tooltip.classList.add('show');

    setTimeout(() => {
        tooltip.classList.remove('show');
    }, 2000);
}

window.addEventListener('beforeunload', function() {
    if (updateInterval) {
        clearInterval(updateInterval);
    }
    towersRef.off();
});


// ===== NOVAS FUNÇÕES: MODAL DE TORRES SEM CADASTRO (MISSING) =====

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
        console.error("MAPAS ou SERVIDORES não estão definidos. Verifique cadastro.js");
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