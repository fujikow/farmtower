// ===== INICIALIZAÇÃO =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('📝 Página de cadastro carregada');
    
    loadMapasOptions();
    loadServidoresOptions();
    applyQueryPrefill();
    restoreOwnerFields();
    
    const mapaSelect = document.getElementById('mapa');
    if (mapaSelect && !mapaSelect.value) {
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
        const dono = document.getElementById('dono').value.replace(/[\u0000-\u001F\u007F]/g, '').trim();
        const localizacao = document.getElementById('localizacao').value.replace(/[\u0000-\u001F\u007F]/g, '').trim();
        const allianceInput = document.querySelector('input[name="alliance"]:checked');
        const alianca = allianceInput ? allianceInput.value : '';
        const horas = parseInt(document.getElementById('horas').value, 10) || 0;
        const minutos = parseInt(document.getElementById('minutos').value, 10) || 0;
        const segundos = parseInt(document.getElementById('segundos').value, 10) || 0;
        const duracaoTotal = (horas * 3600) + (minutos * 60) + segundos;

        if (!mapa || !servidor || !dono || !localizacao) {
            showError(getTranslation('error_all_fields'));
            resetSubmitButton();
            return;
        }
        if (!MAPAS.includes(mapa) || !SERVIDORES.map(String).includes(String(servidor))) {
            showError(getTranslation('error_all_fields'));
            resetSubmitButton();
            return;
        }
        if (alianca !== 'Aliado' && alianca !== 'Inimigo') {
            showError(getTranslation('error_all_fields'));
            resetSubmitButton();
            return;
        }
        if (dono.length > FIELD_LIMITS.dono || localizacao.length > FIELD_LIMITS.localizacao) {
            showError(getTranslation('error_field_length'));
            resetSubmitButton();
            return;
        }
        if (duracaoTotal <= 0) {
            showError(getTranslation('error_duration_zero'));
            resetSubmitButton();
            return;
        }
        if (duracaoTotal > FIELD_LIMITS.duracaoSegundos) {
            showError(getTranslation('error_duration_max'));
            resetSubmitButton();
            return;
        }

        // ===== VALIDAÇÃO DE DUPLICATAS (COM OPÇÃO DE SOBREESCREVER) =====
        let duplicateTower = null; 

        if (typeof allTowers === 'undefined') {
            console.warn('⚠️ Atenção: array allTowers (do tabela.js) não está definido. A verificação de duplicatas será pulada.');
        } else {
            console.log(`[Verificação de Duplicata] Verificando ${mapa}-${servidor} contra ${allTowers.length} torres ativas...`);
            
            duplicateTower = allTowers.find(torre => 
                torre.mapa === mapa && torre.servidor === servidor
            );

            if (duplicateTower) {
                const errorMsg = getTranslation('error_duplicate_tower', { mapa: mapa, servidor: servidor });
                console.error('❌ ERRO DE DUPLICATA:', errorMsg); 
                
                const confirmMsg = getTranslation('error_duplicate_overwrite_confirm', { mapa: mapa, servidor: servidor });
                
                if (confirm(confirmMsg)) {
                    console.log('✅ [Verificação de Duplicata] Usuário escolheu sobreescrever.');
                } else {
                    console.log('🛑 [Verificação de Duplicata] Usuário cancelou a sobreescrita.');
                    showError(getTranslation('error_duplicate_cancelled')); 
                    resetSubmitButton();
                    return; 
                }

            } else {
                console.log('✅ [Verificação de Duplicata] Nenhuma duplicata encontrada. Prosseguindo com o cadastro.');
            }
        }
        // ===== FIM DA VALIDAÇÃO =====


        // ===== ALTERAÇÃO DE TIMEZONE =====
        // Horário atual (visto) - USA A HORA CORRIGIDA DO SERVIDOR
        const vistoHorario = getEstimatedServerTime(); // Função do firebase-config.js

        // Calcular horário de finalização
        const horarioFinalizacao = new Date(vistoHorario.getTime() + (duracaoTotal * 1000));
        // ===== FIM DA ALTERAÇÃO =====

        const aleatoriedade = SERVIDORES_ALEATORIOS.includes(String(servidor)) ? 'Sim' : 'Não';

        // Criar objeto da torre
        const torre = {
            mapa: mapa,
            servidor: servidor,
            aleatoriedade: aleatoriedade,
            dono: dono,
            localizacao: localizacao,
            alianca: alianca,
            vistoHorario: vistoHorario.toISOString(), // Salva em UTC
            horarioFinalizacao: horarioFinalizacao.toISOString(), // Salva em UTC
            duracaoSegundos: duracaoTotal,
            duracaoFormatada: formatDuration(horas, minutos, segundos),
            cadastradoEm: vistoHorario.toISOString() // Atualiza usando a hora corrigida
        };

        rememberOwner(dono, alianca);
        console.log('📤 Enviando torre:', torre.mapa, torre.servidor);

        saveTowerToFirebase(torre, duplicateTower ? duplicateTower.id : null);
    });
}

// ===== SALVAR NO FIREBASE (MODIFICADO) =====
function saveTowerToFirebase(torre, existingId) {
    let promise;
    
    if (existingId) {
        console.log(`...Sobreescrevendo torre no ID: ${existingId}`);
        promise = towersRef.child(existingId).set(torre);
    } else {
        console.log('...Criando novo registro de torre...');
        promise = towersRef.push(torre);
    }

    promise
        .then(() => {
            const messageKey = existingId ? 'success_tower_overwritten' : 'success_tower_registered';
            const message = getTranslation(messageKey);
            
            console.log(message);
            showSuccess(message); // Mostra a barra verde
            resetForm();
            resetSubmitButton();
        })
        .catch((error) => {
            console.error('❌ Erro ao salvar torre:', error);
            showError(getTranslation('error_save_tower'));
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
    successMsg.textContent = message; 
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
    errorMsg.textContent = message; // Mensagem já vem formatada (com ❌)
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
    
    restoreOwnerFields();
    if(mapaSelect && !mapaSelect.value) mapaSelect.focus();
}

function rememberOwner(dono, alianca) {
    localStorage.setItem('anbu_last_dono', dono);
    localStorage.setItem('anbu_last_alianca', alianca);
}

function restoreOwnerFields() {
    const donoInput = document.getElementById('dono');
    if (!donoInput) return;

    const savedOwner = localStorage.getItem('anbu_last_dono');
    if (savedOwner) donoInput.value = savedOwner.slice(0, FIELD_LIMITS.dono);

    const savedAlliance = localStorage.getItem('anbu_last_alianca');
    if (savedAlliance === 'Inimigo') {
        const enemy = document.getElementById('alliance_enemy');
        if (enemy) enemy.checked = true;
    } else if (savedAlliance === 'Aliado') {
        const ally = document.getElementById('alliance_ally');
        if (ally) ally.checked = true;
    }
}

function applyQueryPrefill() {
    const params = new URLSearchParams(window.location.search);
    const mapa = params.get('mapa');
    const servidor = params.get('servidor');
    const mapaSelect = document.getElementById('mapa');
    const servidorSelect = document.getElementById('servidor');

    if (mapaSelect && mapa && MAPAS.includes(mapa)) {
        mapaSelect.value = mapa;
    }
    if (servidorSelect && servidor && SERVIDORES.map(String).includes(servidor)) {
        servidorSelect.value = servidor;
    }
}

function resetSubmitButton() {
    const submitBtn = document.getElementById('submitBtn');
    if(submitBtn) {
        submitBtn.disabled = false;
        // Usa a tradução para resetar o botão
        const buttonText = getTranslation('form_button_register');
        submitBtn.innerHTML = `<span>📝</span> ${buttonText}`;
    }
}

// ===== VALIDAÇÃO EM TEMPO REAL =====
const horasInput = document.getElementById('horas');
if (horasInput) {
    horasInput.addEventListener('input', function() {
        if (this.value > 48) {
            this.value = 48;
            showError(getTranslation('error_duration_max'));
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