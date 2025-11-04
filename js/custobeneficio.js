// ===== DADOS FIXOS: CUSTO ACUMULADO DE JOIAS =====
const RUUD_JEWEL_COST_TABLE = [
    { h: 1, acc: 5 }, { h: 2, acc: 12 }, { h: 3, acc: 22 }, { h: 4, acc: 36 }, 
    { h: 5, acc: 55 }, { h: 6, acc: 80 }, { h: 7, acc: 111 }, { h: 8, acc: 149 }, 
    { h: 9, acc: 194 }, { h: 10, acc: 248 }, { h: 11, acc: 310 }, { h: 12, acc: 382 }, 
    { h: 13, acc: 464 }, { h: 14, acc: 556 }, { h: 15, acc: 659 }, { h: 16, acc: 774 }, 
    { h: 17, acc: 901 }, { h: 18, acc: 1041 }, { h: 19, acc: 1194 }, { h: 20, acc: 1360 }, 
    { h: 21, acc: 1540 }, { h: 22, acc: 1735 }, { h: 23, acc: 1945 }, { h: 24, acc: 2171 }, 
    { h: 25, acc: 2412 }, { h: 26, acc: 2670 }, { h: 27, acc: 2945 }, { h: 28, acc: 3237 }, 
    { h: 29, acc: 3547 }, { h: 30, acc: 3875 }, { h: 31, acc: 4222 }, { h: 32, acc: 4588 }, 
    { h: 33, acc: 4973 }, { h: 34, acc: 5378 }, { h: 35, acc: 5803 }, { h: 36, acc: 6249 }, 
    { h: 37, acc: 6716 }, { h: 38, acc: 7204 }, { h: 39, acc: 7714 }, { h: 40, acc: 8247 }, 
    { h: 41, acc: 8802 }, { h: 42, acc: 9380 }, { h: 43, acc: 9982 }, { h: 44, acc: 10608 }
];

// Variável global para armazenar a joia selecionada
let selectedJewelForCalc = 'bless'; // Padrão

// ===== INICIALIZAÇÃO =====
document.addEventListener('DOMContentLoaded', function() {
    // 1. Define os valores padrão dos inputs
    setDefaultRuudValues();
    
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
function setDefaultRuudValues() {
    // Taxa de Farm
    document.getElementById('ruud_farm_rate').value = 1400; // Padrão único
    // Conversão
    document.getElementById('ruud_conversion_rate').value = 5;
    // Preços de Joias
    document.getElementById('price_bless').value = 600;
    document.getElementById('price_soul').value = 600;
    document.getElementById('price_chaos').value = 200;
    document.getElementById('price_life').value = 100;
    document.getElementById('price_harmony').value = 100;
    document.getElementById('price_creation').value = 150;
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
    const conversionRate = parseFloat(document.getElementById('ruud_conversion_rate').value) || 5;
    
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
    const farmRateInMc = farmRate / conversionRate;

    // 4. PROCESSAR E RENDERIZAR TABELA
    const tableBody = document.getElementById('ruudResultsTableBody');
    if (!tableBody) return;
    
    tableBody.innerHTML = ''; // Limpa a tabela
    let accumulatedProfit = 0;
    let lastAccumulatedCost = 0;

    RUUD_JEWEL_COST_TABLE.forEach(row => {
        const hour = row.h;
        const accumulatedJewelCost = row.acc;
        
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
        } else {
            tr.classList.add('row-loss');
        }

        tr.innerHTML = `
            <td>${hour}h</td>
            <td>${marginalJewelCost}</td>
            <td>${marginalMcCost.toFixed(2)} MC</td>
            <td>${hourlyProfit.toFixed(2)} MC</td>
            <td><strong>${accumulatedProfit.toFixed(2)} MC</strong></td>
        `;

        tableBody.appendChild(tr);
        
        // Atualiza o custo anterior para o próximo loop
        lastAccumulatedCost = accumulatedJewelCost;
    });
}