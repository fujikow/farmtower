// ===== CALCULADORA DE JOIAS =====

let joiasUpdateInterval = null;

// Tabela de joias (horas -> joias necessárias)
const tabelaJoias = {
    0: 0, 1: 5, 2: 12, 3: 22, 4: 36, 5: 55,
    6: 80, 7: 111, 8: 149, 9: 194, 10: 248,
    11: 310, 12: 382, 13: 464, 14: 556, 15: 659,
    16: 774, 17: 901, 18: 1041, 19: 1194, 20: 1360,
    21: 1540, 22: 1735, 23: 1945, 24: 2171, 25: 2412,
    26: 2670, 27: 2945, 28: 3237, 29: 3547, 30: 3875,
    31: 4222, 32: 4588, 33: 4973, 34: 5378, 35: 5803,
    36: 6249, 37: 6716, 38: 7204, 39: 7714, 40: 8247,
    41: 8802, 42: 9380, 43: 9982, 44: 10608
};

// ===== INICIALIZAR EVENTOS =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 Inicializando calculadora de joias...');
    
    // Configurar slider
    const slider = document.getElementById('horasAdicionais');
    if (slider) {
        slider.addEventListener('input', function() {
            updateJoiasCalculator();
        });
        console.log('✅ Slider configurado');
    } else {
        console.error('❌ Slider não encontrado!');
    }
});

// ===== ABRIR MODAL =====
function openJoiasModal() {
    console.log('🔓 Abrindo modal de joias...');
    
    const modal = document.getElementById('joiasModal');
    
    if (!modal) {
        console.error('❌ Modal não encontrado!');
        alert('Erro: Modal não encontrado!');
        return;
    }
    
    // Mostrar modal
    modal.classList.add('active');
    modal.style.display = 'flex';
    
    console.log('✅ Modal exibido');
    
    // Resetar slider
    const slider = document.getElementById('horasAdicionais');
    if (slider) {
        slider.value = 0;
        console.log('✅ Slider resetado');
    }
    
    // Iniciar atualização do horário
    updateJoiasCalculator();
    
    // Atualizar a cada segundo
    if (joiasUpdateInterval) {
        clearInterval(joiasUpdateInterval);
    }
    joiasUpdateInterval = setInterval(updateJoiasCalculator, 1000);
    
    console.log('✅ Atualização iniciada');
}

// ===== FECHAR MODAL =====
function closeJoiasModal() {
    console.log('🔒 Fechando modal de joias...');
    
    const modal = document.getElementById('joiasModal');
    
    if (!modal) {
        console.error('❌ Modal não encontrado!');
        return;
    }
    
    // Esconder modal
    modal.classList.remove('active');
    modal.style.display = 'none';
    
    console.log('✅ Modal escondido');
    
    // Parar atualização
    if (joiasUpdateInterval) {
        clearInterval(joiasUpdateInterval);
        joiasUpdateInterval = null;
        console.log('✅ Atualização parada');
    }
}

// ===== ATUALIZAR CALCULADORA (COM TRADUÇÃO) =====
function updateJoiasCalculator() {
    const now = typeof getEstimatedServerTime === 'function' ? getEstimatedServerTime() : new Date();

    const horarioAtualElement = document.getElementById('horarioAtual');
    if (horarioAtualElement) {
        horarioAtualElement.textContent = formatModalDateTime(now);
    }
    
    // Pegar horas adicionais do slider
    const slider = document.getElementById('horasAdicionais');
    const horasAdicionais = slider ? parseInt(slider.value) : 0;
    
    // Atualizar valor do slider (LÓGICA ATUALIZADA COM i18n)
    const sliderValue = document.getElementById('horasAdicionaisValue');
    if (sliderValue) {
        const horasGratis = 2;
        const horasTotais = horasAdicionais + horasGratis;
        
        // Pega a tradução de "(Grátis)" do i18n.js
        const freeText = getTranslation('jewel_modal_free');
        
        if (horasAdicionais === 0) {
             sliderValue.textContent = `Total: ${horasTotais}h ${freeText}`;
        } else {
             // Ex: "10h + 2h (Grátis) = 12h"
             sliderValue.textContent = `${horasAdicionais}h + ${horasGratis}h ${freeText} = ${horasTotais}h`;
        }
    }
    
    const totalHorasParaLiberar = horasAdicionais + 2;
    const horaLiberacao = new Date(now.getTime() + (totalHorasParaLiberar * 60 * 60 * 1000));
    
    // Atualizar hora de liberação
    const horaLiberacaoElement = document.getElementById('horaLiberacao');
    if (horaLiberacaoElement) {
        horaLiberacaoElement.textContent = formatModalDateTime(horaLiberacao);
    }
    
    // Calcular joias necessárias (baseado apenas nas horas adicionais)
    const joias = tabelaJoias[horasAdicionais] || 0;
    
    // Atualizar joias necessárias
    const joiasElement = document.getElementById('joiasNecessarias');
    if (joiasElement) {
        joiasElement.textContent = joias;
    }
}

// ===== FORMATAR DATA E HORÁRIO =====
// (Função ATUALIZADA para mostrar DD/MM HH:MM:SS)
function formatModalDateTime(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '--/-- --:--:--';
    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23'
    }).formatToParts(date);
    const pick = (type) => parts.find((part) => part.type === type).value;
    return `${pick('day')}/${pick('month')} ${pick('hour')}:${pick('minute')}:${pick('second')}`;
}

// ===== FECHAR MODAL AO CLICAR FORA =====
document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('joiasModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeJoiasModal();
            }
        });
    }
});