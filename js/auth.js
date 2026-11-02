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

// Usuário digitado -> e-mail do Firebase. A regra do banco repete esta lista.
const ADMIN_ACCOUNTS = {
    "admin": "anbu-admin@anbu-farm-tower.firebaseapp.com",
    "anbu-admin@anbu-farm-tower.firebaseapp.com": "anbu-admin@anbu-farm-tower.firebaseapp.com",
    "fujikow.kontarski@gmail.com": "fujikow.kontarski@gmail.com"
};

function resolveAdminEmail(loginName) {
    return ADMIN_ACCOUNTS[loginName.trim().toLowerCase()] || null;
}

// ===== TENTAR FAZER LOGIN =====
let loginInFlight = false;

function handleLogin() {
    if (loginInFlight) return;

    const userInput = document.getElementById('userInput');
    const passwordInput = document.getElementById('passwordInput');
    const loginButton = document.querySelector('.btn-login');
    const loginName = userInput ? userInput.value : '';
    const senha = passwordInput.value;
    const email = resolveAdminEmail(loginName);

    if (loginName.trim() === '') {
        showLoginError(getTranslation('error_user_empty'));
        return;
    }
    if (!email) {
        showLoginError(getTranslation('error_not_admin'));
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
            localStorage.setItem('anbu_last_user', loginName.trim());
            passwordInput.value = '';
        })
        .catch(error => {
            console.error('❌ Falha no login:', error.code);

            let mensagemErro = getTranslation('error_login_generic');
            if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential' || error.code === 'auth/invalid-login-credentials') {
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
        const userInput = document.getElementById('userInput');
        const passwordInput = document.getElementById('passwordInput');
        const savedUser = localStorage.getItem('anbu_last_user');
        if (userInput && savedUser && !userInput.value) {
            userInput.value = savedUser;
        }
        if (userInput && !userInput.value) {
            userInput.focus();
        } else if (passwordInput) {
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
    const handleKeypress = function(e) {
        if (e.key === 'Enter') {
            handleLogin();
        }
    };

    ['userInput', 'passwordInput'].forEach((id) => {
        const field = document.getElementById(id);
        if (field) field.addEventListener('keypress', handleKeypress);
    });
});