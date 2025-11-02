// ===== INICIALIZAÇÃO =====
document.addEventListener('DOMContentLoaded', function() {
    // Focar no primeiro campo
    document.getElementById('mapa').focus();
    
    // Inicializar campos de duração com 0
    document.getElementById('horas').value = 0;
    document.getElementById('minutos').value = 0;
    document.getElementById('segundos').value = 0;
});

// ===== MANIPULAÇÃO DO FORMULÁRIO =====
document.getElementById('towerForm').addEventListener('submit', function(e) {
    e.preventDefault();

    // Desabilitar botão durante envio
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>⏳</span> Cadastrando...';

    // Coletar dados do formulário
    const mapa = document.getElementById('mapa').value;
    const servidor = document.getElementById('servidor').value;
    const dono = document.getElementById('dono').value.trim();
    const localizacao = document.getElementById('localizacao').value.trim();
    const horas = parseInt(document.getElementById('horas').value) || 0;
    const minutos = parseInt(document.getElementById('minutos').value) || 0;
    const segundos = parseInt(document.getElementById('segundos').value) || 0;

    // Validação
    if (!mapa || !servidor || !dono || !localizacao) {
        showError('Por favor, preencha todos os campos obrigatórios!');
        resetSubmitButton();
        return;
    }

    if (horas === 0 && minutos === 0 && segundos === 0) {
        showError('A duração da torre deve ser maior que zero!');
        resetSubmitButton();
        return;
    }

    if (horas > 48) {
        showError('A duração máxima é de 48 horas!');
        resetSubmitButton();
        return;
    }

    // Calcular duração total em segundos
    const duracaoTotal = (horas * 3600) + (minutos * 60) + segundos;

    // Horário atual (visto)
    const vistoHorario = new Date();

    // Calcular horário de finalização
    const horarioFinalizacao = new Date(vistoHorario.getTime() + (duracaoTotal * 1000));

    // Verificar aleatoriedade
    const servidoresAleatorios = ['4', '5', '6', '11', '12', '14', '15'];
    const aleatoriedade = servidoresAleatorios.includes(servidor) ? 'Sim' : 'Não';

    // Criar objeto da torre
    const torre = {
        mapa: mapa,
        servidor: servidor,
        aleatoriedade: aleatoriedade,
        dono: dono,
        localizacao: localizacao,
        vistoHorario: vistoHorario.toISOString(),
        horarioFinalizacao: horarioFinalizacao.toISOString(),
        duracaoSegundos: duracaoTotal,
        duracaoFormatada: formatDuration(horas, minutos, segundos),
        cadastradoEm: new Date().toISOString()
    };

    // Salvar no Firebase
    saveTowerToFirebase(torre);
});

// ===== SALVAR NO FIREBASE =====
function saveTowerToFirebase(torre) {
    towersRef.push(torre)
        .then(() => {
            showSuccess('Torre cadastrada com sucesso!');
            resetForm();
            resetSubmitButton();
        })
        .catch((error) => {
            console.error('Erro ao cadastrar torre:', error);
            showError('Erro ao cadastrar torre. Verifique sua conexão!');
            resetSubmitButton();
        });
}

// ===== FUNÇÕES AUXILIARES =====
function formatDuration(h, m, s) {
    const parts = [];
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    if (s > 0) parts.push(`${s}s`);
    return parts.join(' ') || '0s';
}

function showSuccess(message) {
    const successMsg = document.getElementById('successMessage');
    const errorMsg = document.getElementById('errorMessage');
    
    errorMsg.style.display = 'none';
    successMsg.textContent = `✅ ${message}`;
    successMsg.style.display = 'block';
    
    setTimeout(() => {
        successMsg.style.display = 'none';
    }, 3000);

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showError(message) {
    const successMsg = document.getElementById('successMessage');
    const errorMsg = document.getElementById('errorMessage');
    
    successMsg.style.display = 'none';
    errorMsg.textContent = `❌ ${message}`;
    errorMsg.style.display = 'block';
    
    setTimeout(() => {
        errorMsg.style.display = 'none';
    }, 3000);

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetForm() {
    document.getElementById('towerForm').reset();
    
    document.getElementById('horas').value = 0;
    document.getElementById('minutos').value = 0;
    document.getElementById('segundos').value = 0;
    
    document.getElementById('mapa').focus();
}

function resetSubmitButton() {
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<span>📝</span> Cadastrar Torre';
}

// ===== VALIDAÇÃO EM TEMPO REAL =====
document.getElementById('horas').addEventListener('input', function() {
    if (this.value > 48) {
        this.value = 48;
        showError('A duração máxima é de 48 horas!');
    }
    if (this.value < 0) this.value = 0;
    updateDurationFeedback();
});

document.getElementById('minutos').addEventListener('input', function() {
    if (this.value > 59) this.value = 59;
    if (this.value < 0) this.value = 0;
});

document.getElementById('segundos').addEventListener('input', function() {
    if (this.value > 59) this.value = 59;
    if (this.value < 0) this.value = 0;
});

// ===== ATALHOS DE TECLADO =====
document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.key === 'Enter') {
        document.getElementById('towerForm').dispatchEvent(new Event('submit'));
    }
    
    if (e.ctrlKey && e.key === 't') {
        e.preventDefault();
        window.location.href = 'tabela.html';
    }
});

// ===== FEEDBACK VISUAL PARA DURAÇÃO =====
function updateDurationFeedback() {
    const horasInput = document.getElementById('horas');
    const horas = parseInt(horasInput.value) || 0;
    
    if (horas >= 24) {
        horasInput.style.borderColor = '#ff9800';
        horasInput.style.fontWeight = 'bold';
    } else {
        horasInput.style.borderColor = '';
        horasInput.style.fontWeight = '';
    }
}
