// ===== SISTEMA DE AUTENTICAÇÃO UNIVERSAL (COM FIREBASE AUTH) =====

// Referência ao serviço de autenticação
// Esta linha SÓ funciona se firebase-auth-compat.js foi carregado ANTES.
const auth = firebase.auth();

// ===== VERIFICAR AUTENTICAÇÃO AO CARREGAR PÁGINA =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔒 Verificando autenticação via Firebase...');
    
    // O Firebase nos diz se o usuário está logado ou não
    auth.onAuthStateChanged(user => {
        if (user) {
            console.log('✅ Usuário autenticado.');
            showContent();
        } else {
            // Se 'user' for nulo, ele está deslogado
            console.log('🔐 Usuário deslogado.');
            showLoginScreen(); // Mostra a tela de login
        }
    });
});

// ===== TENTAR FAZER LOGIN (Versão com E-mail Fixo) =====
let loginInFlight = false;

function handleLogin() {
    if (loginInFlight) return;

    // O e-mail fica no cliente de propósito: a proteção real é a regra do
    // Realtime Database, que só aceita este usuário. Publique database.rules.json.
    const EMAIL_FIXO = "fujikow.kontarski@gmail.com";

    const passwordInput = document.getElementById('passwordInput');
    const loginButton = document.querySelector('.btn-login');
    const senha = passwordInput.value;

    if (senha === '') {
        showLoginError(getTranslation('error_password_empty'));
        return;
    }

    loginInFlight = true;
    if (loginButton) loginButton.disabled = true;

    auth.signInWithEmailAndPassword(EMAIL_FIXO, senha)
        .then(() => {
            passwordInput.value = '';
        })
        .catch(error => {
            console.error('❌ Falha no login:', error.code);

            let mensagemErro = getTranslation('error_login_generic');
            if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                mensagemErro = getTranslation('error_wrong_password');
            } else if (error.code === 'auth/user-not-found') {
                mensagemErro = getTranslation('error_user_not_found');
            } else if (error.code === 'auth/too-many-requests') {
                mensagemErro = getTranslation('error_too_many_requests');
            }

            showLoginError(mensagemErro);
            loginInFlight = false;
            if (loginButton) loginButton.disabled = false;
            
            // Animação de erro
            passwordInput.classList.add('shake');
            setTimeout(() => {
                passwordInput.classList.remove('shake');
            }, 500);
        });
}

// ===== FAZER LOGOUT =====
function logout() {
    console.log('🚪 Fazendo logout...');
    
    if (confirm('Deseja realmente sair?')) {
        auth.signOut(); // O onAuthStateChanged cuidará de mostrar a tela de login
    }
}

// ===== MOSTRAR TELA DE LOGIN =====
function showLoginScreen() {
    console.log('🔐 Mostrando tela de login...');
    
    const mainContent = document.querySelector('.container-full') || document.querySelector('.container');
    if (mainContent) {
        mainContent.style.display = 'none';
    }
    
    const loginScreen = document.getElementById('loginScreen');
    if (loginScreen) {
        loginScreen.style.display = 'flex';
    }

    loginInFlight = false;
    const loginButton = document.querySelector('.btn-login');
    if (loginButton) loginButton.disabled = false;
    
    setTimeout(() => {
        // Foca no campo de senha, já que não há e-mail
        const passwordInput = document.getElementById('passwordInput');
        if (passwordInput) {
            passwordInput.focus();
        }
    }, 100);
}

// ===== MOSTRAR CONTEÚDO =====
function showContent() {
    console.log('✅ Autenticado! Mostrando conteúdo...');
    
    const loginScreen = document.getElementById('loginScreen');
    if (loginScreen) {
        loginScreen.style.display = 'none';
    }
    
    const mainContent = document.querySelector('.container-full') || document.querySelector('.container');
    if (mainContent) {
        mainContent.style.display = 'block';
    }
    
    if (typeof loadTowersFromFirebase === 'function') {
        loadTowersFromFirebase();
    }

    // Uma vez por aba: apaga histórico que já passou de 1 hora.
    if (typeof cleanExpiredTowers === 'function' && !sessionStorage.getItem('anbu_cleaned')) {
        sessionStorage.setItem('anbu_cleaned', '1');
        cleanExpiredTowers();
    }
}

function togglePasswordVisibility() {
    const passwordInput = document.getElementById('passwordInput');
    const toggleButton = document.getElementById('togglePasswordBtn');
    if (!passwordInput || !toggleButton) return;

    const willShow = passwordInput.type === 'password';
    passwordInput.type = willShow ? 'text' : 'password';
    const key = willShow ? 'login_hide_password' : 'login_show_password';
    toggleButton.setAttribute('data-i18n-key', key);
    toggleButton.textContent = getTranslation(key);
}

// ===== MOSTRAR MENSAGEM DE ERRO =====
function showLoginError(message) {
    const errorMessage = document.getElementById('loginErrorMessage');
    if (errorMessage) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
    }
}

document.addEventListener('keydown', function(e) {
    if (e.key !== 'Escape') return;
    if (typeof closeJoiasModal === 'function') closeJoiasModal();
    if (typeof closeMissingModal === 'function') closeMissingModal();
    if (typeof closeRuudModal === 'function') closeRuudModal();
});

// ===== PERMITIR ENTER PARA ENVIAR =====
document.addEventListener('DOMContentLoaded', function() {
    const passwordInput = document.getElementById('passwordInput');
    
    const handleKeypress = function(e) {
        if (e.key === 'Enter') {
            handleLogin();
        }
    };

    if (passwordInput) {
        passwordInput.addEventListener('keypress', handleKeypress);
    }
});