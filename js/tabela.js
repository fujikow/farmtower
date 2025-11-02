// ===== VARIÁVEIS GLOBAIS =====
let allTowers = [];
let updateInterval;

// ===== INICIALIZAÇÃO =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Iniciando tabela com Firebase...');
    
    loadTowersFromFirebase();
    
    // Atualizar a cada segundo
    updateInterval = setInterval(() => {
        renderTable();
        updateStats();
    }, 1000);
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
        
        populateFilters();
        updateStats();
        renderTable();
    }, (error) => {
        console.error('❌ Erro ao carregar torres do Firebase:', error);
    });
}

// ===== POPULAR FILTROS =====
function populateFilters() {
    const mapas = [...new Set(allTowers.map(t => t.mapa))].sort();
    const servidores = [...new Set(allTowers.map(t => t.servidor))].sort((a, b) => {
        return parseInt(a) - parseInt(b);
    });

    const filterMapa = document.getElementById('filterMapa');
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
    const servidoresAleatorios = ['4', '5', '6', '11', '12', '14', '15'];
    const torresAleatorias = allTowers.filter(t => 
        servidoresAleatorios.includes(t.servidor)
    ).length;

    document.getElementById('totalTorres').textContent = allTowers.length;
    document.getElementById('torresAtivas').textContent = allTowers.length;
    document.getElementById('torresAleatorias').textContent = torresAleatorias;
}

// ===== RENDERIZAR TABELA (SEM BADGES) =====
function renderTable() {
    const filterMapa = document.getElementById('filterMapa').value;
    const filterServidor = document.getElementById('filterServidor').value;
    const tableBody = document.getElementById('tableBody');
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

        // Criar linha
        const tr = document.createElement('tr');
        
        // ADICIONAR CLASSE DE STATUS NA LINHA
        tr.classList.add(`row-${statusInfo.class}`);
        
        // CÉLULA 1: Correção (invisível)
        const td1 = document.createElement('td');
        td1.className = 'col-fix';
        tr.appendChild(td1);
        
        // CÉLULA 2: Status (apenas emoji, sem badge)
        const td2 = document.createElement('td');
        td2.textContent = statusInfo.icon;
        td2.style.fontSize = '1.5em';
        td2.style.textAlign = 'center';
        tr.appendChild(td2);
        
        // CÉLULA 3: Mapa
        const td3 = document.createElement('td');
        td3.innerHTML = `<strong>${torre.mapa}</strong>`;
        tr.appendChild(td3);
        
        // CÉLULA 4: Servidor
        const td4 = document.createElement('td');
        td4.textContent = torre.servidor;
        tr.appendChild(td4);
        
        // CÉLULA 5: Aleatoriedade (sem badge)
        const td5 = document.createElement('td');
        td5.textContent = torre.aleatoriedade;
        td5.style.fontWeight = '600';
        td5.style.textAlign = 'center';
        tr.appendChild(td5);
        
        // CÉLULA 6: Dono
        const td6 = document.createElement('td');
        td6.textContent = torre.dono;
        tr.appendChild(td6);
        
        // CÉLULA 7: Localização
        const td7 = document.createElement('td');
        td7.textContent = torre.localizacao;
        tr.appendChild(td7);
        
        // CÉLULA 8: Visto Horário
        const td8 = document.createElement('td');
        td8.textContent = formatDateTime(vistoDate);
        tr.appendChild(td8);
        
        // CÉLULA 9: Horário Finalização
        const td9 = document.createElement('td');
        td9.textContent = formatDateTime(finalizacaoDate);
        tr.appendChild(td9);
        
        // CÉLULA 10: Tempo Restante
        const td10 = document.createElement('td');
        td10.innerHTML = `<strong>${tempoRestante}</strong>`;
        tr.appendChild(td10);

        // CÉLULA 11: ID (adicione após a célula de Tempo Restante)
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



// ===== OBTER INFORMAÇÕES DE STATUS (NOVA FUNÇÃO) =====
function getStatusInfo(finalizacao, now) {
    const diff = finalizacao - now;
    const minutes = diff / (1000 * 60);

    if (minutes < 5) {
        return {
            class: 'status-danger',
            icon: '🔴',
            text: 'CRÍTICO'
        };
    } else if (minutes < 15) {
        return {
            class: 'status-orange',
            icon: '🟠',
            text: 'ATENÇÃO'
        };
    } else if (minutes < 30) {
        return {
            class: 'status-warning',
            icon: '🟡',
            text: 'ALERTA'
        };
    } else {
        return {
            class: 'status-success',
            icon: '🔵',
            text: 'ATIVO'
        };
    }
}

// ===== CRIAR CÉLULA (HELPER FUNCTION) =====
function createCell(type, content) {
    const td = document.createElement('td');
    
    switch(type) {
        case 'strong':
            td.innerHTML = `<strong>${content}</strong>`;
            break;
            
        case 'badge':
            const badgeClass = content === 'Sim' ? 'badge-success' : 'badge-danger';
            td.innerHTML = `<span class="badge ${badgeClass}">${content}</span>`;
            break;
            
        case 'text':
        default:
            td.textContent = content;
            break;
    }
    
    return td;
}

// ===== CALCULAR TEMPO RESTANTE (APENAS HH:MM:SS) =====
function calculateTempoRestante(finalizacao, now) {
    const diff = finalizacao - now;

    if (diff <= 0) {
        return '00:00:00';
    }

    // Calcular total de horas, minutos e segundos
    const totalSeconds = Math.floor(diff / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    // Formatar como HH:MM:SS
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// ===== OBTER CLASSE DA LINHA (FORMATAÇÃO CONDICIONAL) =====
function getRowClass(finalizacao, now) {
    const diff = finalizacao - now;
    const minutes = diff / (1000 * 60);

    if (minutes < 5) {
        return 'row-danger'; // 🔴 Vermelho - menos de 5 minutos
    } else if (minutes < 15) {
        return 'row-orange'; // 🟠 Laranja - menos de 15 minutos
    } else if (minutes < 30) {
        return 'row-warning'; // 🟡 Amarelo - menos de 30 minutos
    } else {
        return 'row-success'; // 🔵 Azul Grêmio - mais de 30 minutos
    }
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
    console.log('🔄 Atualizando tabela...');
    renderTable();
}

// ===== EXPORTAR PARA EXCEL =====
function exportToExcel() {
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
            const status = getStatusText(finalizacaoDate, now);

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
    const minutes = String(date.getMinutes()).padStart(2, '0'); // CORRIGIDO: fechamento das aspas

    return `${day}-${month}-${year}_${hours}h${minutes}m`;
}


function getStatusText(finalizacao, now) {
    const diff = finalizacao - now;
    const minutes = diff / (1000 * 60);

    if (diff <= 0) {
        return 'EXPIRADO';
    } else if (minutes < 5) {
        return 'CRÍTICO (< 5 min)';
    } else if (minutes < 15) {
        return 'ATENÇÃO (< 15 min)';
    } else if (minutes < 30) {
        return 'ALERTA (< 30 min)';
    } else {
        return 'ATIVO';
    }
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
