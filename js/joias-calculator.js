// ===== TABELA DE JOIAS =====
const JOIAS_TABLE = {
    0: 0, 1: 5, 2: 12, 3: 22, 4: 36, 5: 55, 6: 80, 7: 111, 8: 149, 9: 194,
    10: 248, 11: 310, 12: 382, 13: 464, 14: 556, 15: 659, 16: 774, 17: 901,
    18: 1041, 19: 1194, 20: 1360, 21: 1540, 22: 1735, 23: 1945, 24: 2171,
    25: 2412, 26: 2670, 27: 2945, 28: 3237, 29: 3547, 30: 3875, 31: 4222,
    32: 4588, 33: 4973, 34: 5378, 35: 5803, 36: 6249, 37: 6716, 38: 7204,
    39: 7714, 40: 8247, 41: 8802, 42: 9380, 43: 9982, 44: 10608
};

let joiasUpdateInterval;

// ===== ABRIR MODAL =====
function openJoiasModal() {
    const modal = document.getElementById('joiasModal');
    modal.classList.add('active');
    
    // Resetar slider
    const slider = document.getElementById('horasAdicionais');
    if (slider) {
        slider.value = 0;
    }
    
    // Iniciar atualização do horário
    updateJoiasCalculator();
    joiasUpdateInterval = setInterval(updateJoiasCalculator, 1000);
    
    console.log('💎 Modal de joias aberto');
}

// ===== FECHAR MODAL =====
function closeJoiasModal() {
    const modal = document.getElementById('joiasModal');
    modal.classList.remove('active');
    
    // Parar atualização
    if (joiasUpdateInterval) {
        clearInterval(joiasUpdateInterval);
    }
    
    console.log('💎 Modal de joias fechado');
}

// ===== OBTER HORÁRIO DE BRASÍLIA (GMT-3) =====
function getBrasiliaTime() {
    // Obter data/hora atual
    const now = new Date();
    
    // Obter componentes de data/hora no timezone de São Paulo
    const brasiliaFormatter = new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
    
    const parts = brasiliaFormatter.formatToParts(now);
    
    // Extrair valores
    const valores = {};
    parts.forEach(part => {
        if (part.type !== 'literal') {
            valores[part.type] = parseInt(part.value);
        }
    });
    
    // Criar objeto Date com os valores de Brasília
    // IMPORTANTE: Criar como se fosse UTC para não converter
    const brasiliaDate = new Date(
        valores.year,
        valores.month - 1, // Mês é 0-indexed
        valores.day,
        valores.hour,
        valores.minute,
        valores.second
    );
    
    console.log('🕐 Horário de Brasília:', brasiliaDate);
    console.log('📅 Componentes:', valores);
    
    return brasiliaDate;
}

// ===== ATUALIZAR CALCULADORA =====
function updateJoiasCalculator() {
    // Obter horário de Brasília (GMT-3)
    const horarioBrasilia = getBrasiliaTime();
    
    // Obter horas adicionais do slider
    const slider = document.getElementById('horasAdicionais');
    const horasAdicionais = slider ? parseInt(slider.value) : 0;
    
    // Calcular hora de liberação (horário de Brasília + horas adicionais + 2 horas)
    const horaLiberacao = new Date(horarioBrasilia.getTime() + ((horasAdicionais + 2) * 60 * 60 * 1000));
    
    // Obter joias necessárias
    const joiasNecessarias = JOIAS_TABLE[horasAdicionais] || 0;
    
    // Atualizar interface
    const horarioAtualEl = document.getElementById('horarioAtual');
    const horasAdicionaisValueEl = document.getElementById('horasAdicionaisValue');
    const horaLiberacaoEl = document.getElementById('horaLiberacao');
    const joiasNecessariasEl = document.getElementById('joiasNecessarias');
    
    if (horarioAtualEl) {
        horarioAtualEl.textContent = formatTime(horarioBrasilia);
    }
    
    if (horasAdicionaisValueEl) {
        horasAdicionaisValueEl.textContent = `${horasAdicionais}h`;
    }
    
    if (horaLiberacaoEl) {
        horaLiberacaoEl.textContent = formatTime(horaLiberacao);
    }
    
    if (joiasNecessariasEl) {
        joiasNecessariasEl.textContent = joiasNecessarias.toLocaleString('pt-BR');
    }
}

// ===== FORMATAR HORÁRIO =====
function formatTime(date) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    
    return `${day}/${month} ${hours}:${minutes}:${seconds}`;
}

// ===== EVENT LISTENER PARA O SLIDER =====
document.addEventListener('DOMContentLoaded', function() {
    const slider = document.getElementById('horasAdicionais');
    
    if (slider) {
        slider.addEventListener('input', function() {
            updateJoiasCalculator();
        });
        
        console.log('💎 Slider de joias inicializado');
    }
});

// ===== FECHAR MODAL AO CLICAR FORA =====
document.addEventListener('click', function(e) {
    const modal = document.getElementById('joiasModal');
    if (modal && e.target === modal) {
        closeJoiasModal();
    }
});

// ===== FECHAR MODAL COM TECLA ESC =====
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const modal = document.getElementById('joiasModal');
        if (modal && modal.classList.contains('active')) {
            closeJoiasModal();
        }
    }
});

console.log('💎 Calculadora de Joias carregada com sucesso!');
