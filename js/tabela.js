// ===== VARIÁVEIS GLOBAIS =====
let allTowers = [];
let updateInterval;

// ===== INICIALIZAÇÃO =====
document.addEventListener('DOMContentLoaded', function() {
    loadTowers();
    populateFilters();
    updateStats();
    renderTable();
    
    // Atualizar a cada segundo
    updateInterval = setInterval(() => {
        renderTable();
        updateStats();
    }, 1000);
});

// ===== CARREGAR TORRES =====
function loadTowers() {
    allTowers = JSON.parse(localStorage.getItem('anbuFarmTowers')) || [];
    
    // Remover torres expiradas automaticamente
    const now = new Date();
    allTowers = allTowers.filter(torre => {
        const finalizacao = new Date(torre.horarioFinalizacao);
        return finalizacao > now;
    });
    
    // Atualizar localStorage
    localStorage.setItem('anbuFarmTowers', JSON.stringify(allTowers));
}

// ===== POPULAR FILTROS =====
function populateFilters() {
    const mapas = [...new Set(allTowers.map(t => t.mapa))].sort();
    const servidores = [...new Set(allTowers.map(t => t.servidor))].sort((a, b) => {
        return parseInt(a) - parseInt(b);
    });

    const filterMapa = document.getElementById('filterMapa');
    const filterServidor = document.getElementById('filterServidor');

    // Limpar filtros
    filterMapa.innerHTML = '<option value="">Todos</option>';
    filterServidor.innerHTML = '<option value="">Todos</option>';

    // Popular mapas
    mapas.forEach(mapa => {
        const option = document.createElement('option');
        option.value = mapa;
        option.textContent = mapa;
        filterMapa.appendChild(option);
    });

    // Popular servidores
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

// ===== RENDERIZAR TABELA =====
function renderTable() {
    const filterMapa = document.getElementById('filterMapa').value;
    const filterServidor = document.getElementById('filterServidor').value;
    const tableBody = document.getElementById('tableBody');
    const emptyState = document.getElementById('emptyState');
    const table = document.getElementById('towersTable');

    // Aplicar filtros
    let filteredTowers = allTowers;

    if (filterMapa) {
        filteredTowers = filteredTowers.filter(t => t.mapa === filterMapa);
    }

    if (filterServidor) {
        filteredTowers = filteredTowers.filter(t => t.servidor === filterServidor);
    }

    // Verificar se há torres
    if (filteredTowers.length === 0) {
        table.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }

    table.style.display = 'table';
    emptyState.style.display = 'none';

    // Ordenar por horário de finalização (mais próximo primeiro)
    filteredTowers.sort((a, b) => {
        return new Date(a.horarioFinalizacao) - new Date(b.horarioFinalizacao);
    });

    // Limpar tabela
    tableBody.innerHTML = '';

    // Renderizar cada torre
    filteredTowers.forEach(torre => {
        const row = document.createElement('tr');
        
        const vistoDate = new Date(torre.vistoHorario);
        const finalizacaoDate = new Date(torre.horarioFinalizacao);
        const now = new Date();
        
        const cronometro = calculateCronometro(finalizacaoDate, now);
        const rowClass = getRowClass(finalizacaoDate, now);

        // Aplicar classe de formatação condicional
        if (rowClass) {
            row.className = rowClass;
        }

        // Montar HTML da linha
        row.innerHTML = `
            <td><strong>${torre.mapa}</strong></td>
            <td>${torre.servidor}</td>
            <td>
                <span class="badge ${torre.aleatoriedade === 'Sim' ? 'badge-success' : 'badge-danger'}">
                    ${torre.aleatoriedade}
                </span>
            </td>
            <td>${torre.dono}</td>
            <td>${torre.localizacao}</td>
            <td>${formatDateTime(vistoDate)}</td>
            <td>${formatDateTime(finalizacaoDate)}</td>
            <td><strong>${cronometro}</strong></td>
        `;

        tableBody.appendChild(row);
    });
}

// ===== CALCULAR CRONÔMETRO =====
function calculateCronometro(finalizacao, now) {
    const diff = finalizacao - now;

    if (diff <= 0) {
        return 'EXPIRADO';
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

// ===== OBTER CLASSE DA LINHA (FORMATAÇÃO CONDICIONAL) =====
function getRowClass(finalizacao, now) {
    const diff = finalizacao - now;
    const minutes = diff / (1000 * 60);

    if (minutes < 5) {
        return 'row-danger'; // Vermelho - menos de 5 minutos
    } else if (minutes < 15) {
        return 'row-warning'; // Amarelo - menos de 15 minutos
    } else if (minutes < 30) {
        return 'row-orange'; // Laranja - menos de 30 minutos
    } else {
        return 'row-success'; // Azul Grêmio - mais de 30 minutos
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
    loadTowers();
    populateFilters();
    updateStats();
    renderTable();
}

// ===== EXPORTAR PARA EXCEL =====
function exportToExcel() {
    // Verificar se há torres para exportar
    if (allTowers.length === 0) {
        showExportMessage('❌ Nenhuma torre para exportar!', 'error');
        return;
    }

    try {
        // Aplicar filtros atuais
        const filterMapa = document.getElementById('filterMapa').value;
        const filterServidor = document.getElementById('filterServidor').value;
        
        let filteredTowers = allTowers;

        if (filterMapa) {
            filteredTowers = filteredTowers.filter(t => t.mapa === filterMapa);
        }

        if (filterServidor) {
            filteredTowers = filteredTowers.filter(t => t.servidor === filterServidor);
        }

        // Verificar se há torres após filtro
        if (filteredTowers.length === 0) {
            showExportMessage('❌ Nenhuma torre encontrada com os filtros aplicados!', 'error');
            return;
        }

        // Ordenar por horário de finalização
        filteredTowers.sort((a, b) => {
            return new Date(a.horarioFinalizacao) - new Date(b.horarioFinalizacao);
        });

        // Preparar dados para exportação
        const now = new Date();
        const exportData = filteredTowers.map(torre => {
            const vistoDate = new Date(torre.vistoHorario);
            const finalizacaoDate = new Date(torre.horarioFinalizacao);
            const cronometro = calculateCronometro(finalizacaoDate, now);
            const status = getStatusText(finalizacaoDate, now);

            return {
                'Mapa': torre.mapa,
                'Servidor': torre.servidor,
                'Aleatoriedade': torre.aleatoriedade,
                'Dono': torre.dono,
                'Localização': torre.localizacao,
                'Visto Horário': formatDateTimeForExcel(vistoDate),
                'Horário Finalização': formatDateTimeForExcel(finalizacaoDate),
                'Cronômetro': cronometro,
                'Status': status,
                'Duração': torre.duracaoFormatada
            };
        });

        // Criar workbook
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(exportData);

        // Configurar largura das colunas
        const colWidths = [
            { wch: 15 }, // Mapa
            { wch: 10 }, // Servidor
            { wch: 15 }, // Aleatoriedade
            { wch: 20 }, // Dono
            { wch: 25 }, // Localização
            { wch: 20 }, // Visto Horário
            { wch: 20 }, // Horário Finalização
            { wch: 12 }, // Cronômetro
            { wch: 15 }, // Status
            { wch: 12 }  // Duração
        ];
        ws['!cols'] = colWidths;

        // Adicionar worksheet ao workbook
        XLSX.utils.book_append_sheet(wb, ws, 'Torres Ativas');

        // Adicionar informações adicionais em uma segunda aba
        const infoData = [
            { 'Informação': 'Total de Torres', 'Valor': filteredTowers.length },
            { 'Informação': 'Torres com Aleatoriedade', 'Valor': filteredTowers.filter(t => t.aleatoriedade === 'Sim').length },
            { 'Informação': 'Data/Hora da Exportação', 'Valor': formatDateTimeForExcel(now) },
            { 'Informação': 'Exportado por', 'Valor': 'ANBU Farm Tower - MEGAMU' },
            { 'Informação': 'Criado por', 'Valor': 'fujikoftw - O MELHOR DL DO MEGAMU' }
        ];

        const wsInfo = XLSX.utils.json_to_sheet(infoData);
        wsInfo['!cols'] = [{ wch: 30 }, { wch: 40 }];
        XLSX.utils.book_append_sheet(wb, wsInfo, 'Informações');

        // Gerar nome do arquivo com data e hora
        const fileName = `ANBU_Farm_Tower_${formatFileNameDate(now)}.xlsx`;

        // Fazer download
        XLSX.writeFile(wb, fileName);

        // Mostrar mensagem de sucesso
        showExportMessage('✅ Tabela exportada com sucesso!', 'success');
        
        // Animação no botão
        const btnExport = document.querySelector('.btn-export');
        btnExport.classList.add('exporting');
        setTimeout(() => {
            btnExport.classList.remove('exporting');
        }, 500);

    } catch (error) {
        console.error('Erro ao exportar:', error);
        showExportMessage('❌ Erro ao exportar tabela!', 'error');
    }
}

// ===== FORMATAR DATA PARA EXCEL =====
function formatDateTimeForExcel(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

// ===== FORMATAR DATA PARA NOME DO ARQUIVO =====
function formatFileNameDate(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${day}-${month}-${year}_${hours}h${minutes}m`;
}

// ===== OBTER TEXTO DO STATUS =====
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

// ===== MOSTRAR MENSAGEM DE EXPORTAÇÃO =====
function showExportMessage(message, type) {
    // Criar tooltip se não existir
    let tooltip = document.querySelector('.export-tooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.className = 'export-tooltip';
        document.body.appendChild(tooltip);
    }

    // Definir mensagem e cor
    tooltip.textContent = message;
    tooltip.style.background = type === 'success' 
        ? 'rgba(13, 110, 253, 0.95)' 
        : 'rgba(0, 0, 0, 0.95)';
    tooltip.style.borderColor = type === 'success'
        ? 'var(--gremio-azul)'
        : 'var(--status-critico)';

    // Mostrar tooltip
    tooltip.classList.add('show');

    // Remover após 2 segundos
    setTimeout(() => {
        tooltip.classList.remove('show');
    }, 2000);
}

// ===== LIMPAR INTERVAL AO SAIR DA PÁGINA =====
window.addEventListener('beforeunload', function() {
    if (updateInterval) {
        clearInterval(updateInterval);
    }
});
