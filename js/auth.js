// ===== SISTEMA DE AUTENTICAÇÃO UNIVERSAL (COM FIREBASE AUTH) =====

// Referência ao serviço de autenticação
// Esta linha SÓ funciona se firebase-auth-compat.js foi carregado ANTES.
const auth = firebase.auth();

// ===== VERIFICAR AUTENTICAÇÃO AO CARREGAR PÁGINA =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔒 Verificando autenticação via Firebase...');
    
    // O Firebase nos diz se o usuário está logado ou não
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            if (typeof stopAccountWatchers === 'function') stopAccountWatchers();
            showLoginScreen();
            return;
        }

        try {
            const profile = await ensureSessionProfile(user);
            if (!profile) {
                showLoginError(getTranslation('error_user_inactive'));
                await auth.signOut();
                return;
            }
            startAccountWatchers();
            showContent();
            renderSessionChrome();
        } catch (error) {
            console.error('❌ Falha ao carregar o perfil:', error.code || error.message);
            showLoginError(getTranslation('error_login_generic'));
            await auth.signOut();
        }
    });
});

// ===== TENTAR FAZER LOGIN (Versão com E-mail Fixo) =====
let loginInFlight = false;

function handleLogin() {
    if (loginInFlight) return;

    const usernameInput = document.getElementById('usernameInput');
    const passwordInput = document.getElementById('passwordInput');
    const loginButton = document.querySelector('.btn-login');
    const email = loginEmailFromInput(usernameInput ? usernameInput.value : '');
    const senha = passwordInput.value;

    if (!email) {
        const typed = usernameInput && usernameInput.value.trim();
        showLoginError(getTranslation(typed ? 'error_username_invalid' : 'error_username_required'));
        return;
    }
    if (senha === '') {
        showLoginError(getTranslation('error_password_empty'));
        return;
    }

    loginInFlight = true;
    if (loginButton) loginButton.disabled = true;

    auth.signInWithEmailAndPassword(email, senha)
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
    
        if (confirm(getTranslation('confirm_logout'))) {
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
        const usernameInput = document.getElementById('usernameInput');
        if (usernameInput) usernameInput.focus();
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
    if (typeof closeAccountModal === 'function') closeAccountModal();
    if (typeof closeAuditModal === 'function') closeAuditModal();
});

// ===== PERMITIR ENTER PARA ENVIAR =====
document.addEventListener('DOMContentLoaded', function() {
    const handleKeypress = function(e) {
        if (e.key === 'Enter') {
            handleLogin();
        }
    };

    ['usernameInput', 'passwordInput'].forEach((id) => {
        const field = document.getElementById(id);
        if (field) field.addEventListener('keypress', handleKeypress);
    });
});