// ===== VARIÁVEIS GLOBAIS =====
let allTowers = [];
let updateInterval;

// --- DADOS GERAIS DO JOGO ---
if (typeof MAPAS === 'undefined') {
  var MAPAS = [
      'Lorencia', 'Dungeon', 'Devias', 'Noria', 'Lost Tower', 'Arena', 'Atlans', 
      'Tarkan', 'Icarus', 'Aida', 'Kanturu', 'Elbeland', 'Raklion', 'Vulcanus', 'Ferea'
  ];
}
if (typeof SERVIDORES === 'undefined') {
 var SERVIDORES = [1, 2, 3, 4, 5, 6, 11, 12, 14, 15, 16, 17, 19];
}

// ===== INICIALIZAÇÃO =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Iniciando tabela.js...');
    
    // O loadTowersFromFirebase é chamado pelo auth.js após o login
    
    // O intervalo só roda na página da tabela
    if (document.getElementById('towersTable')) {
        updateInterval = setInterval(() => {
            renderTable(); 
            updateStats(); 
        }, 1000);
    }
});

// ===== CARREGAR TORRES DO FIREBASE (LÓGICA DE FILTRO ATUALIZADA) =====
function loadTowersFromFirebase() {
    console.log('📡 Conectando ao Firebase...');
    
    towersRef.on('value', (snapshot) => {
        const towers = snapshot.val();
        allTowers = [];
        
        console.log('📦 Dados recebidos do Firebase:', towers);
        
        if (towers) {
            const now = new Date();
            
            // ===== MUDANÇA AQUI =====
            // Definimos um "tempo de corte" 5 minutos ATRÁS de agora.
            // (5 minutos * 60 segundos * 1000 milissegundos)
            const cutoffTime = now.getTime() - (5 * 60 * 1000);

            Object.keys(towers).forEach(key => {
                const torre = towers[key];
                const finalizacao = new Date(torre.horarioFinalizacao);
                
                // MUDANÇA: Incluir torres ativas E as que expiraram nos últimos 5 min
                if (finalizacao.getTime() > cutoffTime) { 
                    allTowers.push({
                        id: key,
                        ...torre
                    });
                }
            });
            // ===== FIM DA MUDANÇA =====
            
            console.log('✅ Torres (ativas e expiradas recentes) carregadas:', allTowers.length);
        } else {
            console.log('⚠️ Nenhuma torre encontrada no Firebase');
        }
        
        populateFilters();
        updateStats();
        renderTable();

    }, (error) => {
        console.error('❌ Erro ao carregar torres do Firebase:', error);
    });
}

// ===== POPULAR FILTROS =====
function populateFilters() {
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
    const totalTorresEl = document.getElementById('totalTorres');
    if (!totalTorresEl) return; 

    const servidoresAleatorios = ['4', '5', '6', '11', '12', '14', '15'];
    
    const filterMapa = document.getElementById('filterMapa').value;
    const filterServidor = document.getElementById('filterServidor').value;
    const filterDono = document.getElementById('filterDono').value.trim().toLowerCase();

    let filteredTowers = allTowers;
    if (filterMapa) {
        filteredTowers = filteredTowers.filter(t => t.mapa === filterMapa);
    }
    if (filterServidor) {
        filteredTowers = filteredTowers.filter(t => t.servidor === filterServidor);
    }
    if (filterDono) {
        filteredTowers = filteredTowers.filter(t => 
            t.dono.toLowerCase().includes(filterDono)
        );
    }
    
    // Atualiza estatísticas para incluir apenas as ativas (mesmo que expiradas estejam visíveis)
    const now = new Date().getTime();
    const activeFilteredTowers = filteredTowers.filter(t => new Date(t.horarioFinalizacao).getTime() > now);

    const torresAleatorias = activeFilteredTowers.filter(t => 
        servidoresAleatorios.includes(t.servidor)
    ).length;

    totalTorresEl.textContent = activeFilteredTowers.length;
    document.getElementById('torresAtivas').textContent = activeFilteredTowers.length;
    document.getElementById('torresAleatorias').textContent = torresAleatorias;
}

// ===== RENDERIZAR TABELA (SEM BADGES) =====
function renderTable() {
    const tableBody = document.getElementById('tableBody');
    if (!tableBody) return; 
    
    const filterMapa = document.getElementById('filterMapa').value;
    const filterServidor = document.getElementById('filterServidor').value;
    const filterDono = document.getElementById('filterDono').value.trim().toLowerCase();
    
    const emptyState = document.getElementById('emptyState');
    const table = document.getElementById('towersTable');

    let filteredTowers = allTowers;

    if (filterMapa) {
        filteredTowers = filteredTowers.filter(t => t.mapa === filterMapa);
    }

    if (filterServidor) {
        filteredTowers = filteredTowers.filter(t => t.servidor === filterServidor);
    }

    if (filterDono) {
        filteredTowers = filteredTowers.filter(t => 
            t.dono.toLowerCase().includes(filterDono)
        );
    }

    if (filteredTowers.length === 0) {
        table.style.display = 'none';
        emptyState.style.display = 'block';
    } else {
        table.style.display = 'table';
        emptyState.style.display = 'none';
    }

    filteredTowers.sort((a, b) => {
        return new Date(a.horarioFinalizacao) - new Date(b.horarioFinalizacao);
    });

    tableBody.innerHTML = '';

    filteredTowers.forEach(torre => {
        const now = new Date();
        const vistoDate = new Date(torre.vistoHorario);
        const finalizacaoDate = new Date(torre.horarioFinalizacao);
        
        // Esta função já lida com torres expiradas (diff <= 0)
        const tempoRestante = calculateTempoRestante(finalizacaoDate, now);
        // Esta função já lida com torres expiradas (diff <= 0)
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
        
        const td11 = document.createElement('td');
        td11.textContent = torre.id;
        td11.style.fontSize = '0.75em';
        td11.style.color = '#6c757d';
        td11.style.fontFamily = 'monospace';
        td11.title = 'Clique para copiar';
        td11.style.cursor = 'pointer';
        
        td11.onclick = function() {
            navigator.clipboard.writeText(torre.id);
            alert(getTranslation('alert_copy_id_success', { id: torre.id }));
        };
        tr.appendChild(td11);

        tableBody.appendChild(tr);
    });
}



// ===== OBTER INFORMAÇÕES DE STATUS (UNIFICADA) =====
function getStatusInfo(finalizacao, now) {
    const diff = finalizacao - now;
    const minutes = diff / (1000 * 60);

    if (diff <= 0) {
        return { class: 'status-expired', icon: '⚫', text: 'EXPIRADO' };
    } else if (minutes < 5) {
        return { class: 'status-danger', icon: '🔴', text: 'CRÍTICO (< 5 min)' };
    } else if (minutes < 15) {
        return { class: 'status-orange', icon: '🟠', text: 'ATENÇÃO (< 15 min)' };
    } else if (minutes < 30) {
        return { class: 'status-warning', icon: '🟡', text: 'ALERTA (< 30 min)' };
    } else {
        return { class: 'status-success', icon: '🔵', text: 'ATIVO' };
    }
}

// ===== CALCULAR TEMPO RESTANTE (APENAS HH:MM:SS) =====
function calculateTempoRestante(finalizacao, now) {
    const diff = finalizacao - now;
    if (diff <= 0) return '00:00:00';

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
    if (!document.getElementById('towersTable')) return; 
    console.log('🔄 Atualizando tabela...');
    renderTable();
}

// ===== EXPORTAR PARA EXCEL (MENSAGENS TRADUZIDAS) =====
function exportToExcel() {
    if (!document.getElementById('towersTable')) return; 

    if (allTowers.length === 0) {
        showExportMessage(getTranslation('export_error_no_towers'), 'error');
        return;
    }

    try {
        const filterMapa = document.getElementById('filterMapa').value;
        const filterServidor = document.getElementById('filterServidor').value;
        const filterDono = document.getElementById('filterDono').value.trim().toLowerCase();
        
        let filteredTowers = allTowers;
        if (filterMapa) {
            filteredTowers = filteredTowers.filter(t => t.mapa === filterMapa);
        }
        if (filterServidor) {
            filteredTowers = filteredTowers.filter(t => t.servidor === filterServidor);
        }
        if (filterDono) {
            filteredTowers = filteredTowers.filter(t => 
                t.dono.toLowerCase().includes(filterDono)
            );
        }

        if (filteredTowers.length === 0) {
            showExportMessage(getTranslation('export_error_no_filtered_towers'), 'error');
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

        showExportMessage(getTranslation('export_success'), 'success');
        
        const btnExport = document.querySelector('.btn-export');
        if (btnExport) {
            btnExport.classList.add('exporting');
            setTimeout(() => {
                btnExport.classList.remove('exporting');
            }, 500);
        }

    } catch (error) {
        console.error('❌ Erro ao exportar:', error);
        showExportMessage(getTranslation('export_error_generic'), 'error');
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