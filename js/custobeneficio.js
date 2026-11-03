function ruudJewelCostRows() {
    const max = typeof JOIAS_HORAS_MAX === 'number' ? JOIAS_HORAS_MAX : 54;
    const rows = [];
    for (let hour = 1; hour <= max; hour++) {
        rows.push({ h: hour, acc: joiasParaHoras(hour) });
    }
    return rows;
}

// Variável global para armazenar a joia selecionada
let selectedJewelForCalc = 'bless'; // Padrão

// ===== INICIALIZAÇÃO =====
document.addEventListener('DOMContentLoaded', function() {
    if (!document.getElementById('ruud_farm_rate')) return;

    // 1. Define os valores padrão dos inputs e restaura o último cenário salvo
    setDefaultRuudValues();
    applyRuudSettings(readRuudSettings());
    
    // 2. Adiciona "ouvintes" a todos os inputs
    const inputs = document.querySelectorAll('#ruudModal .modal-body input');
    inputs.forEach(input => {
        input.addEventListener('input', calculateCostBenefit);
    });

    // 3. Adiciona "ouvintes" aos botões de seleção de joia
    const jewelButtons = document.querySelectorAll('.btn-jewel-select');
    jewelButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove 'active' de todos os botões
            jewelButtons.forEach(btn => btn.classList.remove('active'));
            // Adiciona 'active' ao botão clicado
            this.classList.add('active');
            // Armazena a joia selecionada (ex: "bless")
            selectedJewelForCalc = this.dataset.jewel;
            // Recalcula tudo
            calculateCostBenefit();
        });
    });

    // 4. Calcula o estado inicial
    calculateCostBenefit();
});

// Define os valores padrão
const RUUD_FIELDS = [
    'ruud_farm_rate',
    'ruud_conversion_rate',
    'price_bless',
    'price_soul',
    'price_chaos',
    'price_life',
    'price_harmony',
    'price_creation'
];

function setDefaultRuudValues() {
    const defaults = {
        ruud_farm_rate: 1300,
        ruud_conversion_rate: 5,
        price_bless: 600,
        price_soul: 600,
        price_chaos: 200,
        price_life: 150,
        price_harmony: 150,
        price_creation: 150
    };
    RUUD_FIELDS.forEach((id) => {
        const input = document.getElementById(id);
        if (input) input.value = defaults[id];
    });
}

function readRuudSettings() {
    try {
        return JSON.parse(localStorage.getItem('anbu_ruud_settings') || '{}');
    } catch (e) {
        return {};
    }
}

function applyRuudSettings(settings) {
    RUUD_FIELDS.forEach((id) => {
        const input = document.getElementById(id);
        if (input && settings[id] != null && settings[id] !== '') input.value = settings[id];
    });
    if (!['bless', 'soul', 'chaos', 'life', 'harmony', 'creation'].includes(settings.selectedJewel)) return;
    selectedJewelForCalc = settings.selectedJewel;
    document.querySelectorAll('.btn-jewel-select').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.jewel === settings.selectedJewel);
    });
}

function saveRuudSettings() {
    const data = { selectedJewel: selectedJewelForCalc };
    RUUD_FIELDS.forEach((id) => {
        const input = document.getElementById(id);
        if (input) data[id] = input.value;
    });
    localStorage.setItem('anbu_ruud_settings', JSON.stringify(data));
}

// ===== FUNÇÕES DO MODAL =====
function openRuudModal() {
    const modal = document.getElementById('ruudModal');
    if (modal) {
        modal.classList.add('active');
        modal.style.display = 'flex';
        // Recalcula ao abrir, caso as traduções tenham mudado os botões
        translatePage(); // Garante que os botões "Selecionar" sejam traduzidos
        calculateCostBenefit();
    }
}

function closeRuudModal() {
    const modal = document.getElementById('ruudModal');
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
    }
}

// ===== O CÉREBRO: FUNÇÃO DE CÁLCULO =====
function calculateCostBenefit() {
    // 1. LER VALORES DE MERCADO (INPUTS)
    const conversionInput = document.getElementById('ruud_conversion_rate');
    if (!conversionInput) return;
    const conversionRate = parseFloat(conversionInput.value);
    
    const jewelPrices = {
        bless: parseFloat(document.getElementById('price_bless').value) || 0,
        soul: parseFloat(document.getElementById('price_soul').value) || 0,
        chaos: parseFloat(document.getElementById('price_chaos').value) || 0,
        life: parseFloat(document.getElementById('price_life').value) || 0,
        harmony: parseFloat(document.getElementById('price_harmony').value) || 0,
        creation: parseFloat(document.getElementById('price_creation').value) || 0
    };

    // Lógica de Farm Simplificada
    const farmRate = parseFloat(document.getElementById('ruud_farm_rate').value) || 0;

    // 2. LER CENÁRIO DE CÁLCULO (Variável Global)
    // selectedJewelForCalc é definido pelos botões (ex: "bless")

    // 3. CALCULAR VALORES BASE
    // Custo (MC) de 1 joia
    const unitJewelPrice = (jewelPrices[selectedJewelForCalc] || 0) / 100;
    // Ganho (MC) por hora
    const farmRateInMc = conversionRate > 0 ? farmRate / conversionRate : 0;

    // 4. PROCESSAR E RENDERIZAR TABELA
    const tableBody = document.getElementById('ruudResultsTableBody');
    if (!tableBody) return;
    
    tableBody.replaceChildren();
    let accumulatedProfit = 0;
    let lastAccumulatedCost = 0;
    let bestRow = null;

    ruudJewelCostRows().forEach(row => {
        const hour = row.h;
        const accumulatedJewelCost = row.acc;
        const horasTotais = hour + 2;
        const ruudAcumulado = horasTotais * farmRate;
        
        // Coluna 2: Custo (Joias) da Hora
        const marginalJewelCost = accumulatedJewelCost - lastAccumulatedCost;
        
        // Coluna 3: Custo (MC) da Hora
        const marginalMcCost = marginalJewelCost * unitJewelPrice;
        
        // Coluna 4: Lucro (MC) da Hora
        const hourlyProfit = farmRateInMc - marginalMcCost;
        
        // Coluna 5: Lucro Acumulado
        accumulatedProfit += hourlyProfit;

        // Criar a linha da tabela
        const tr = document.createElement('tr');
        
        // Formatação condicional (Lucro/Prejuízo)
        if (hourlyProfit >= 0) {
            tr.classList.add('row-profit');
            bestRow = tr;
        } else {
            tr.classList.add('row-loss');
        }

        tr.innerHTML = `
            <td>${hour}h</td>
            <td class="ruud-accum">${formatRuudAmount(ruudAcumulado)}</td>
            <td>${marginalJewelCost}</td>
            <td>${marginalMcCost.toFixed(2)} MC</td>
            <td>${hourlyProfit.toFixed(2)} MC</td>
            <td><strong>${accumulatedProfit.toFixed(2)} MC</strong></td>
        `;

        tableBody.appendChild(tr);
        
        // Atualiza o custo anterior para o próximo loop
        lastAccumulatedCost = accumulatedJewelCost;
    });

    if (bestRow) bestRow.classList.add('row-best');
    saveRuudSettings();
}

function formatRuudAmount(value) {
    const rounded = Math.round((Number(value) + Number.EPSILON) * 100) / 100;
    if (!Number.isFinite(rounded)) return '0';
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
}