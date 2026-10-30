// ===== VARIÁVEIS GLOBAIS =====
let allTowers = [];
let updateInterval;
let filtersHydrated = false;
let knownCriticalIds = null;
let audioContext = null;

const FILTER_KEY = 'anbu_table_filters';
const ALERT_KEY = 'anbu_critical_alert';

function asText(value) {
    if (typeof value === 'string') return value;
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
    return '';
}

function readSavedFilters() {
    try {
        return JSON.parse(localStorage.getItem(FILTER_KEY) || '{}');
    } catch (e) {
        return {};
    }
}

function writeSavedFilters() {
    const filterMapa = document.getElementById('filterMapa');
    const filterServidor = document.getElementById('filterServidor');
    const filterDono = document.getElementById('filterDono');
    if (!filterMapa || !filterServidor || !filterDono) return;
    localStorage.setItem(FILTER_KEY, JSON.stringify({
        mapa: filterMapa.value,
        servidor: filterServidor.value,
        dono: filterDono.value
    }));
}

// ===== INICIALIZAÇÃO =====
document.addEventListener('DOMContentLoaded', function() {
    const alertToggle = document.getElementById('criticalAlertToggle');
    if (alertToggle) {
        alertToggle.checked = localStorage.getItem(ALERT_KEY) === '1';
        alertToggle.addEventListener('change', function() {
            localStorage.setItem(ALERT_KEY, this.checked ? '1' : '0');
            if (this.checked) prepareAlertSound();
        });
    }

    if (document.getElementById('towersTable')) {
        updateInterval = setInterval(() => {
            renderTable();
            updateStats();
            checkCriticalAlerts();
        }, 1000);
    }
});

function prepareAlertSound() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    if (!audioContext) audioContext = new AudioCtx();
    if (audioContext.state === 'suspended') audioContext.resume();
}

function playCriticalBeep() {
    prepareAlertSound();
    if (!audioContext) return;
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.frequency.value = 880;
    gain.gain.value = 0.04;
    osc.connect(gain);
    gain.connect(audioContext.destination);
    osc.start();
    osc.stop(audioContext.currentTime + 0.18);
}

// ===== CARREGAR TORRES DO FIREBASE =====
function loadTowersFromFirebase() {
    towersRef.on('value', (snapshot) => {
        const towers = snapshot.val();
        allTowers = [];

        if (towers) {
            const cutoffTime = getEstimatedServerTime().getTime() - (5 * 60 * 1000);

            Object.keys(towers).forEach(key => {
                const torre = towers[key];
                if (!torre || typeof torre !== 'object') return;
                const finalizacao = parseUtcInstant(torre.horarioFinalizacao);
                if (!finalizacao) return;
                if (finalizacao.getTime() > cutoffTime) {
                    allTowers.push({
                        id: key,
                        ...torre
                    });
                }
            });
        }

        populateFilters();
        updateStats();
        renderTable();
    }, (error) => {
        console.error('❌ Erro ao carregar torres do Firebase:', error.code || error.message);
    });
}

function currentFilters() {
    return {
        mapa: document.getElementById('filterMapa') ? document.getElementById('filterMapa').value : '',
        servidor: document.getElementById('filterServidor') ? document.getElementById('filterServidor').value : '',
        dono: document.getElementById('filterDono') ? document.getElementById('filterDono').value.trim().toLowerCase() : ''
    };
}

function towerMatchesDono(torre, filterDono) {
    if (!filterDono) return true;
    return asText(torre.dono).toLowerCase().includes(filterDono);
}

function getFilteredTowers() {
    const filters = currentFilters();
    return allTowers.filter(torre => {
        if (filters.mapa && asText(torre.mapa) !== filters.mapa) return false;
        if (filters.servidor && asText(torre.servidor) !== filters.servidor) return false;
        return towerMatchesDono(torre, filters.dono);
    });
}

// ===== POPULAR FILTROS =====
function populateFilters() {
    const filterMapa = document.getElementById('filterMapa');
    const filterServidor = document.getElementById('filterServidor');
    const filterDono = document.getElementById('filterDono');
    if (!filterMapa || !filterServidor) return;

    const saved = readSavedFilters();
    const wantedMapa = filterMapa.value || (!filtersHydrated ? (saved.mapa || '') : '');
    const wantedServidor = filterServidor.value || (!filtersHydrated ? (saved.servidor || '') : '');
    if (!filtersHydrated && filterDono && saved.dono && !filterDono.value) {
        filterDono.value = saved.dono;
    }
    filtersHydrated = true;

    const mapas = [...new Set(allTowers.map(t => asText(t.mapa)).filter(Boolean))].sort();
    const servidores = [...new Set(allTowers.map(t => asText(t.servidor)).filter(Boolean))].sort((a, b) => {
        return parseInt(a, 10) - parseInt(b, 10);
    });

    const allLabel = getTranslation('filter_all');
    filterMapa.replaceChildren(new Option(allLabel, ''));
    filterServidor.replaceChildren(new Option(allLabel, ''));

    mapas.forEach(mapa => filterMapa.appendChild(new Option(mapa, mapa)));
    servidores.forEach(servidor => filterServidor.appendChild(new Option(servidor, servidor)));

    if ([...filterMapa.options].some(option => option.value === wantedMapa)) {
        filterMapa.value = wantedMapa;
    }
    if ([...filterServidor.options].some(option => option.value === wantedServidor)) {
        filterServidor.value = wantedServidor;
    }
}

function applyFilters() {
    writeSavedFilters();
    renderTable();
    updateStats();
}

function updateStats() {
    const totalTorresEl = document.getElementById('totalTorres');
    if (!totalTorresEl) return;

    const filteredTowers = getFilteredTowers();
    const now = getEstimatedServerTime().getTime();
    const activeFilteredTowers = filteredTowers.filter(t => {
        const end = parseUtcInstant(t.horarioFinalizacao);
        return end && end.getTime() > now;
    });

    const torresAleatorias = activeFilteredTowers.filter(t =>
        SERVIDORES_ALEATORIOS.includes(asText(t.servidor))
    ).length;
    const torresAliadas = activeFilteredTowers.filter(t => t.alianca === 'Aliado').length;
    const torresInimigas = activeFilteredTowers.filter(t => t.alianca === 'Inimigo').length;

    totalTorresEl.textContent = filteredTowers.length;

    const torresAtivasEl = document.getElementById('torresAtivas');
    if (torresAtivasEl) torresAtivasEl.textContent = activeFilteredTowers.length;

    const torresAleatoriasEl = document.getElementById('torresAleatorias');
    if (torresAleatoriasEl) torresAleatoriasEl.textContent = torresAleatorias;

    const torresAliadasEl = document.getElementById('torresAliadas');
    if (torresAliadasEl) torresAliadasEl.textContent = torresAliadas;

    const torresInimigasEl = document.getElementById('torresInimigas');
    if (torresInimigasEl) torresInimigasEl.textContent = torresInimigas;
}

function renderTable() {
    const tableBody = document.getElementById('tableBody');
    if (!tableBody) return;

    const emptyState = document.getElementById('emptyState');
    const table = document.getElementById('towersTable');
    const filteredTowers = getFilteredTowers();

    if (filteredTowers.length === 0) {
        table.style.display = 'none';
        emptyState.style.display = 'block';
        tableBody.replaceChildren();
        tableBody.dataset.signature = '';
        return;
    }

    table.style.display = 'table';
    emptyState.style.display = 'none';

    filteredTowers.sort((a, b) => towerEndMs(a) - towerEndMs(b));

    const signature = filteredTowers.map(torre => torre.id).join('|');
    const canUpdateInPlace = tableBody.dataset.signature === signature
        && tableBody.children.length === filteredTowers.length;

    if (canUpdateInPlace) {
        filteredTowers.forEach((torre, index) => paintRow(tableBody.children[index], torre));
        return;
    }

    const fragment = document.createDocumentFragment();
    filteredTowers.forEach(torre => fragment.appendChild(buildRow(torre)));
    tableBody.replaceChildren(fragment);
    tableBody.dataset.signature = signature;
}

function buildRow(torre) {
    const tr = document.createElement('tr');

    const deleteCell = document.createElement('td');
    deleteCell.className = 'col-fix';
    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'btn-delete-row';
    deleteButton.setAttribute('data-i18n-key', 'btn_delete');
    deleteButton.textContent = getTranslation('btn_delete');
    deleteButton.addEventListener('click', () => {
        const current = allTowers.find((item) => item.id === torre.id) || torre;
        deleteTower(current);
    });
    deleteCell.appendChild(deleteButton);

    const cells = [
        deleteCell,
        document.createElement('td'),
        document.createElement('td'),
        document.createElement('td'),
        document.createElement('td'),
        document.createElement('td'),
        document.createElement('td'),
        document.createElement('td'),
        document.createElement('td'),
        document.createElement('td'),
        document.createElement('td'),
        document.createElement('td')
    ];

    cells[1].style.fontSize = '1.5em';
    cells[1].style.textAlign = 'center';
    cells[4].style.fontWeight = '600';
    cells[4].style.textAlign = 'center';
    cells[11].style.fontSize = '0.75em';
    cells[11].style.color = '#6c757d';
    cells[11].style.fontFamily = 'monospace';
    cells[11].style.cursor = 'pointer';
    cells[11].title = getTranslation('alert_copy_title');
    cells[11].addEventListener('click', () => {
        const id = asText(torre.id);
        navigator.clipboard.writeText(id);
        alert(getTranslation('alert_copy_id_success', { id: id }));
    });

    cells.forEach(cell => tr.appendChild(cell));
    paintRow(tr, torre);
    return tr;
}

function setStrongText(td, text) {
    let strong = td.querySelector('strong');
    if (!strong) {
        strong = document.createElement('strong');
        td.replaceChildren(strong);
    }
    strong.textContent = text;
}

function paintRow(tr, torre) {
    const now = getEstimatedServerTime();
    const vistoDate = parseUtcInstant(torre.vistoHorario);
    const finalizacaoDate = parseUtcInstant(torre.horarioFinalizacao);
    const statusInfo = getStatusInfo(finalizacaoDate, now);
    const cells = tr.children;

    tr.className = `row-${statusInfo.class}`;
    cells[1].textContent = statusInfo.icon;
    setStrongText(cells[2], asText(torre.mapa));
    cells[3].textContent = asText(torre.servidor);
    cells[4].textContent = asText(torre.aleatoriedade);
    cells[5].textContent = asText(torre.dono);

    const alianca = asText(torre.alianca) || 'N/A';
    cells[6].className = torre.alianca === 'Aliado' ? 'cell-ally' : (torre.alianca === 'Inimigo' ? 'cell-enemy' : '');
    setStrongText(cells[6], alianca);
    cells[7].textContent = asText(torre.localizacao);
    cells[8].textContent = formatDateTime(vistoDate);
    cells[9].textContent = formatDateTime(finalizacaoDate);
    setStrongText(cells[10], calculateTempoRestante(finalizacaoDate, now));
    cells[11].textContent = asText(torre.id);
    cells[11].title = getTranslation('alert_copy_title');
}

function deleteTower(torre) {
    const id = asText(torre.id);
    if (!id) return;
    const confirmed = confirm(getTranslation('confirm_delete_tower', {
        mapa: asText(torre.mapa),
        servidor: asText(torre.servidor)
    }));
    if (!confirmed) return;
    towersRef.child(id).remove().catch((error) => {
        console.error('❌ Erro ao excluir torre:', error.code || error.message);
        alert(getTranslation('error_save_tower'));
    });
}

function checkCriticalAlerts() {
    if (!document.getElementById('towersTable')) return;
    if (localStorage.getItem(ALERT_KEY) !== '1') return;

    const now = getEstimatedServerTime().getTime();
    const criticalIds = getFilteredTowers()
        .filter(torre => {
            const end = parseUtcInstant(torre.horarioFinalizacao);
            if (!end) return false;
            const diff = end.getTime() - now;
            return diff > 0 && diff < 5 * 60 * 1000;
        })
        .map(torre => torre.id);

    if (knownCriticalIds === null) {
        knownCriticalIds = new Set(criticalIds);
        return;
    }

    const fresh = criticalIds.filter(id => !knownCriticalIds.has(id));
    knownCriticalIds = new Set(criticalIds);

    if (fresh.length > 0) {
        playCriticalBeep();
        document.title = `(${criticalIds.length}) ANBU Farm Tower`;
    } else if (criticalIds.length === 0) {
        document.title = 'ANBU Farm Tower - Tabela';
    }
}

function getStatusInfo(finalizacao, now) {
    if (!(finalizacao instanceof Date) || Number.isNaN(finalizacao.getTime())) {
        return { class: 'status-expired', icon: '⚫', text: 'EXPIRADO' };
    }

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
    }
    return { class: 'status-success', icon: '🔵', text: 'ATIVO' };
}

function calculateTempoRestante(finalizacao, now) {
    if (!(finalizacao instanceof Date) || Number.isNaN(finalizacao.getTime())) return '--';
    const diff = finalizacao - now;
    if (diff <= 0) return '00:00:00';

    const totalSeconds = Math.floor(diff / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function towerEndMs(torre) {
    const end = parseUtcInstant(torre.horarioFinalizacao);
    return end ? end.getTime() : 0;
}

function refreshTable() {
    if (!document.getElementById('towersTable')) return;
    renderTable();
}

function exportToExcel() {
    if (!document.getElementById('towersTable')) return;

    if (allTowers.length === 0) {
        showExportMessage(getTranslation('export_error_no_towers'), 'error');
        return;
    }

    try {
        const filteredTowers = getFilteredTowers();

        if (filteredTowers.length === 0) {
            showExportMessage(getTranslation('export_error_no_filtered_towers'), 'error');
            return;
        }

        filteredTowers.sort((a, b) => towerEndMs(a) - towerEndMs(b));

        const now = getEstimatedServerTime();
        const exportData = filteredTowers.map(torre => {
            const vistoDate = parseUtcInstant(torre.vistoHorario);
            const finalizacaoDate = parseUtcInstant(torre.horarioFinalizacao);
            return {
                'Mapa': asText(torre.mapa),
                'Servidor': asText(torre.servidor),
                'Aleatoriedade': asText(torre.aleatoriedade),
                'Dono': asText(torre.dono),
                'Aliança': asText(torre.alianca) || 'N/A',
                'Localização': asText(torre.localizacao),
                'Visto Horário': formatDateTime(vistoDate),
                'Horário Finalização': formatDateTime(finalizacaoDate),
                'Tempo Restante': calculateTempoRestante(finalizacaoDate, now),
                'Status': getStatusInfo(finalizacaoDate, now).text,
                'Duração': asText(torre.duracaoFormatada)
            };
        });

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(exportData);
        ws['!cols'] = [
            { wch: 15 }, { wch: 10 }, { wch: 15 }, { wch: 20 },
            { wch: 12 }, { wch: 25 }, { wch: 20 }, { wch: 20 },
            { wch: 12 }, { wch: 15 }, { wch: 12 }
        ];
        XLSX.utils.book_append_sheet(wb, ws, 'Torres Ativas');

        const infoData = [
            { 'Informação': 'Total de Torres', 'Valor': filteredTowers.length },
            { 'Informação': 'Torres com Aleatoriedade', 'Valor': filteredTowers.filter(t => t.aleatoriedade === 'Sim').length },
            { 'Informação': 'Data/Hora da Exportação', 'Valor': formatDateTime(now) },
            { 'Informação': 'Fuso', 'Valor': `${getWindowsTimeZoneId()} (${getWindowsClockOffsetLabel()})` },
            { 'Informação': 'Exportado por', 'Valor': 'ANBU Farm Tower - MEGAMU' }
        ];

        const wsInfo = XLSX.utils.json_to_sheet(infoData);
        wsInfo['!cols'] = [{ wch: 30 }, { wch: 40 }];
        XLSX.utils.book_append_sheet(wb, wsInfo, 'Informações');

        XLSX.writeFile(wb, `ANBU_Farm_Tower_${formatFileNameDate(now)}.xlsx`);
        showExportMessage(getTranslation('export_success'), 'success');

        const btnExport = document.querySelector('.btn-export');
        if (btnExport) {
            btnExport.classList.add('exporting');
            setTimeout(() => btnExport.classList.remove('exporting'), 500);
        }
    } catch (error) {
        console.error('❌ Erro ao exportar:', error);
        showExportMessage(getTranslation('export_error_generic'), 'error');
    }
}

function formatFileNameDate(date) {
    const parts = formatDateTime(date).match(/(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})/);
    if (!parts) return 'export';
    return `${parts[1]}-${parts[2]}-${parts[3]}_${parts[4]}h${parts[5]}m`;
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
    setTimeout(() => tooltip.classList.remove('show'), 2000);
}

window.addEventListener('beforeunload', function() {
    if (updateInterval) clearInterval(updateInterval);
    if (typeof towersRef !== 'undefined') towersRef.off();
});
