// ===== CALCULADORA DE JOIAS =====

let joiasUpdateInterval = null;

// ===== INICIALIZAR EVENTOS =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 Inicializando calculadora de joias...');
    
    // Configurar slider
    const slider = document.getElementById('horasAdicionais');
    if (slider) {
        if (typeof JOIAS_HORAS_MAX === 'number') slider.max = String(JOIAS_HORAS_MAX);
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
    const joias = typeof joiasParaHoras === 'function' ? joiasParaHoras(horasAdicionais) : 0;
    
    // Atualizar joias necessárias
    const joiasElement = document.getElementById('joiasNecessarias');
    if (joiasElement) {
        joiasElement.textContent = joias;
    }

    const estimativa = document.getElementById('joiasEstimativa');
    if (estimativa) {
        const medidaMax = typeof JOIAS_HORAS_MEDIDAS === 'number' ? JOIAS_HORAS_MEDIDAS : 44;
        if (horasAdicionais > medidaMax) {
            estimativa.hidden = false;
            estimativa.textContent = getTranslation('jewel_modal_estimate');
        } else {
            estimativa.hidden = true;
            estimativa.textContent = '';
        }
    }
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