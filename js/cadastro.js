// ===== DADOS DE MAPAS E SERVIDORES =====
// Alterado para 'var' para evitar conflito de script na index.html
var MAPAS = [
    'Lorencia',
    'Dungeon',
    'Devias',
    'Noria',
    'Lost Tower',
    'Arena',
    'Atlans',
    'Tarkan',
    'Icarus',
    'Aida',
    'Kanturu',
    'Elbeland',
    'Raklion',
    'Vulcanus',
    'Ferea'
];

var SERVIDORES = [1, 2, 3, 4, 5, 6, 11, 12, 14, 15, 16, 17, 19];

// ===== INICIALIZAÇÃO =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('📝 Página de cadastro carregada');
    
    // Carregar opções dinâmicas
    loadMapasOptions();
    loadServidoresOptions();
    
    // Focar no primeiro campo
    const mapaSelect = document.getElementById('mapa');
    if (mapaSelect) {
        mapaSelect.focus();
    }
    
    // Inicializar campos de duração com 0
    const horasInput = document.getElementById('horas');
    const minutosInput = document.getElementById('minutos');
    const segundosInput = document.getElementById('segundos');
    
    if(horasInput) horasInput.value = 0;
    if(minutosInput) minutosInput.value = 0;
    if(segundosInput) segundosInput.value = 0;
});

// ===== CARREGAR OPÇÕES DE MAPAS =====
function loadMapasOptions() {
    const mapaSelect = document.getElementById('mapa');
    
    // Proteção: só executa se o elemento existir
    if (!mapaSelect) return; 
    
    MAPAS.forEach(mapa => {
        const option = document.createElement('option');
        option.value = mapa;
        option.textContent = mapa;
        mapaSelect.appendChild(option);
    });
    
    console.log('✅ Mapas carregados:', MAPAS.length);
}

// ===== CARREGAR OPÇÕES DE SERVIDORES =====
function loadServidoresOptions() {
    const servidorSelect = document.getElementById('servidor');
    
    // Proteção: só executa se o elemento existir
    if (!servidorSelect) return; 
    
    SERVIDORES.forEach(servidor => {
        const option = document.createElement('option');
        option.value = servidor;
        option.textContent = servidor;
        servidorSelect.appendChild(option);
    });
    
    console.log('✅ Servidores carregados:', SERVIDORES.length);
}

// ===== MANIPULAÇÃO DO FORMULÁRIO =====
const towerForm = document.getElementById('towerForm');
if (towerForm) {
    towerForm.addEventListener('submit', function(e) {
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

        // ===== VALIDAÇÃO DE DUPLICATAS (COM POP-UP) =====
        if (typeof allTowers === 'undefined') {
            console.warn('⚠️ Atenção: array allTowers (do tabela.js) não está definido. A verificação de duplicatas será pulada.');
        } else {
            console.log(`[Verificação de Duplicata] Verificando ${mapa}-${servidor} contra ${allTowers.length} torres ativas...`);
            
            const isDuplicate = allTowers.some(torre => 
                torre.mapa === mapa && torre.servidor === servidor
            );

            if (isDuplicate) {
                const errorMsg = `Já existe uma torre ATIVA cadastrada em ${mapa} (Servidor ${servidor})!`;
                
                console.error('❌ ERRO DE DUPLICATA:', errorMsg); 
                
                // *** POP-UP ADICIONADO AQUI ***
                alert('❌ ERRO: ' + errorMsg); 
                
                // (Ainda chamamos o showError para o caso de o usuário querer ver no topo)
                showError(errorMsg);
                
                resetSubmitButton();
                return; // Impede o cadastro
            } else {
                console.log('✅ [Verificação de Duplicata] Nenhuma duplicata encontrada. Prosseguindo com o cadastro.');
            }
        }
        // ===== FIM DA VALIDAÇÃO =====


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

        console.log('📤 Enviando torre para Firebase:', torre);

        // Salvar no Firebase
        saveTowerToFirebase(torre);
    });
}

// ===== SALVAR NO FIREBASE =====
function saveTowerToFirebase(torre) {
    towersRef.push(torre)
        .then(() => {
            console.log('✅ Torre cadastrada no Firebase com sucesso!');
            showSuccess('Torre cadastrada com sucesso!');
            resetForm();
            resetSubmitButton();
        })
        .catch((error) => {
            console.error('❌ Erro ao cadastrar torre:', error);
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
    
    if(!successMsg || !errorMsg) return;

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

    if(!successMsg || !errorMsg) return;
    
    successMsg.style.display = 'none';
    errorMsg.textContent = `❌ ${message}`;
    errorMsg.style.display = 'block';
    
    setTimeout(() => {
        errorMsg.style.display = 'none';
    }, 3000);

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetForm() {
    const towerForm = document.getElementById('towerForm');
    if(towerForm) towerForm.reset();
    
    // Recarregar opções
    const mapaSelect = document.getElementById('mapa');
    const servidorSelect = document.getElementById('servidor');
    
    if(mapaSelect) mapaSelect.innerHTML = '<option value="">Selecione um mapa</option>';
    if(servidorSelect) servidorSelect.innerHTML = '<option value="">Selecione um servidor</option>';
    
    loadMapasOptions();
    loadServidoresOptions();
    
    const horasInput = document.getElementById('horas');
    const minutosInput = document.getElementById('minutos');
    const segundosInput = document.getElementById('segundos');
    
    if(horasInput) horasInput.value = 0;
    if(minutosInput) minutosInput.value = 0;
    if(segundosInput) segundosInput.value = 0;
    
    if(mapaSelect) mapaSelect.focus();
}

function resetSubmitButton() {
    const submitBtn = document.getElementById('submitBtn');
    if(submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>📝</span> Cadastrar Torre';
    }
}

// ===== VALIDAÇÃO EM TEMPO REAL =====
const horasInput = document.getElementById('horas');
if (horasInput) {
    horasInput.addEventListener('input', function() {
        if (this.value > 48) {
            this.value = 48;
            showError('A duração máxima é de 48 horas!');
        }
        if (this.value < 0) this.value = 0;
        updateDurationFeedback();
    });
}

const minutosInput = document.getElementById('minutos');
if (minutosInput) {
    minutosInput.addEventListener('input', function() {
        if (this.value > 59) this.value = 59;
        if (this.value < 0) this.value = 0;
    });
}

const segundosInput = document.getElementById('segundos');
if (segundosInput) {
    segundosInput.addEventListener('input', function() {
        if (this.value > 59) this.value = 59;
        if (this.value < 0) this.value = 0;
    });
}

// ===== ATALHOS DE TECLADO =====
document.addEventListener('keydown', function(e) {
    // Atalho (Ctrl + Enter) para submeter o formulário
    if (e.ctrlKey && e.key === 'Enter') {
        const towerForm = document.getElementById('towerForm');
        if(towerForm) {
            towerForm.dispatchEvent(new Event('submit'));
        }
    }
    
    // Atalho (Ctrl + T) para ir à tabela
    if (e.ctrlKey && e.key === 't') {
        e.preventDefault();
        window.location.href = 'tabela.html';
    }
});

// ===== FEEDBACK VISUAL PARA DURAÇÃO =====
function updateDurationFeedback() {
    const horasInput = document.getElementById('horas');
    if(!horasInput) return;

    const horas = parseInt(horasInput.value) || 0;
    
    if (horas >= 24) {
        horasInput.style.borderColor = '#ff9800';
        horasInput.style.fontWeight = 'bold';
    } else {
        horasInput.style.borderColor = '';
        horasInput.style.fontWeight = '';
    }
}