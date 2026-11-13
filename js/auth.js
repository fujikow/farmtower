// ===== SISTEMA DE AUTENTICAÇÃO UNIVERSAL (COM FIREBASE AUTH) =====

// Referência ao serviço de autenticação
// Esta linha SÓ funciona se firebase-auth-compat.js foi carregado ANTES.
const auth = firebase.auth();

// ===== VERIFICAR AUTENTICAÇÃO AO CARREGAR PÁGINA =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔒 Verificando autenticação via Firebase...');
    
    // O Firebase nos diz se o usuário está logado ou não
    auth.onAuthStateChanged(async (user) => {
        if (typeof isAccountSignupInProgress === 'function' && isAccountSignupInProgress()) return;

        if (!user) {
            if (typeof stopAccountWatchers === 'function') stopAccountWatchers();
            showLoginScreen();
            return;
        }

        try {
            const profile = await ensureSessionProfile(user);
            if (!profile) {
                const reason = typeof sessionDenialReason === 'function' ? sessionDenialReason() : '';
                const key = reason === 'pending' ? 'error_user_pending' : (reason === 'refused' ? 'error_user_refused' : 'error_user_inactive');
                showLoginError(getTranslation(key));
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
    const loginButton = document.getElementById('loginSubmitBtn');
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
    const signingUp = typeof isAccountSignupInProgress === 'function' && isAccountSignupInProgress();
    if (!signingUp) {
        registerInFlight = false;
        const registerButton = document.getElementById('registerSubmitBtn');
        if (registerButton) registerButton.disabled = false;
    }
    const registerPanel = document.getElementById('registerPanel');
    const registerOpen = registerPanel && registerPanel.style.display !== 'none';
    if (!registerOpen) setAuthPanel('login');
    const loginButton = document.getElementById('loginSubmitBtn');
    if (loginButton) loginButton.disabled = false;
    
    if (!registerOpen) {
        setTimeout(() => {
            const usernameInput = document.getElementById('usernameInput');
            if (usernameInput) usernameInput.focus();
        }, 100);
    }
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

    // Uma vez por aba: tira da tabela o que já passou de 1 hora, sem apagar o lado.
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
    showLoginNotice(message, false);
}

function showLoginNotice(message, success) {
    const errorMessage = document.getElementById('loginErrorMessage');
    if (!errorMessage) return;
    errorMessage.classList.toggle('is-success', success === true);
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
}

function clearLoginMessage() {
    const errorMessage = document.getElementById('loginErrorMessage');
    if (!errorMessage) return;
    errorMessage.classList.remove('is-success');
    errorMessage.textContent = '';
    errorMessage.style.display = 'none';
}

function setAuthPanel(panel) {
    const loginPanel = document.getElementById('loginPanel');
    const registerPanel = document.getElementById('registerPanel');
    if (loginPanel) loginPanel.style.display = panel === 'login' ? 'block' : 'none';
    if (registerPanel) registerPanel.style.display = panel === 'register' ? 'block' : 'none';
}

function showRegisterForm() {
    setAuthPanel('register');
    clearLoginMessage();
    const field = document.getElementById('registerUsername');
    if (field) field.focus();
}

function showLoginForm() {
    setAuthPanel('login');
    clearLoginMessage();
    const field = document.getElementById('usernameInput');
    if (field) field.focus();
}

function shakeField(id) {
    const field = document.getElementById(id);
    if (!field) return;
    field.classList.add('shake');
    setTimeout(() => field.classList.remove('shake'), 500);
}

function clearRegisterFields() {
    ['registerUsername', 'registerNome', 'registerPassword', 'registerPasswordConfirm'].forEach((id) => {
        const field = document.getElementById(id);
        if (field) field.value = '';
    });
}

let registerInFlight = false;

async function handleRegister() {
    if (registerInFlight) return;

    const username = normalizeUsername(document.getElementById('registerUsername').value);
    const nome = sanitizePersonName(document.getElementById('registerNome').value);
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('registerPasswordConfirm').value;
    const typedUsername = document.getElementById('registerUsername').value.trim();

    if (!username) {
        showLoginError(getTranslation(typedUsername ? 'error_username_invalid' : 'error_username_required'));
        shakeField('registerUsername');
        return;
    }
    if (!nome) {
        showLoginError(getTranslation('error_name_invalid'));
        shakeField('registerNome');
        return;
    }
    if (!password || password.length < 6) {
        showLoginError(getTranslation('error_password_short'));
        shakeField('registerPassword');
        return;
    }
    if (password !== confirmPassword) {
        showLoginError(getTranslation('error_password_mismatch'));
        shakeField('registerPasswordConfirm');
        return;
    }

    const button = document.getElementById('registerSubmitBtn');
    registerInFlight = true;
    if (button) button.disabled = true;
    let createdUser = null;

    try {
        setAccountSignupInProgress(true);
        const credential = await auth.createUserWithEmailAndPassword(usernameToEmail(username), password);
        createdUser = credential.user;
        try {
            await database.ref(`users/${createdUser.uid}`).set({
                username: username,
                nome: nome,
                email: usernameToEmail(username),
                ativo: false,
                situacao: 'pendente',
                criadoEm: new Date().toISOString()
            });
        } catch (writeError) {
            try { await createdUser.delete(); } catch (ignore) { /* usuário órfão impede reutilizar o nome */ }
            try { await auth.signOut(); } catch (ignore) { /* sessão já encerrada pelo delete */ }
            createdUser = null;
            throw writeError;
        }
        await auth.signOut();
        clearRegisterFields();
        setAuthPanel('login');
        showLoginNotice(getTranslation('success_user_pending'), true);
    } catch (error) {
        console.error('❌ Falha no cadastro:', error && error.code ? error.code : 'erro');
        let key = 'error_login_generic';
        if (error && error.code === 'auth/email-already-in-use') key = 'error_user_exists';
        else if (error && error.code === 'auth/weak-password') key = 'error_password_short';
        else if (error && error.code === 'auth/invalid-email') key = 'error_username_invalid';
        showLoginError(getTranslation(key));
        const passwordField = document.getElementById('registerPassword');
        const confirmField = document.getElementById('registerPasswordConfirm');
        if (passwordField) passwordField.value = '';
        if (confirmField) confirmField.value = '';
    } finally {
        // O aviso de auth pode ser agendado depois que o signOut resolve.
        await new Promise((resolve) => setTimeout(resolve, 0));
        setAccountSignupInProgress(false);
        registerInFlight = false;
        if (button) button.disabled = false;
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
            const registerPanel = document.getElementById('registerPanel');
            if (registerPanel && registerPanel.style.display !== 'none') return;
            handleLogin();
        }
    };

    ['usernameInput', 'passwordInput'].forEach((id) => {
        const field = document.getElementById(id);
        if (field) field.addEventListener('keypress', handleKeypress);
    });

    const submitRegister = function(e) {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        handleRegister();
    };
    ['registerUsername', 'registerNome', 'registerPassword', 'registerPasswordConfirm'].forEach((id) => {
        const field = document.getElementById(id);
        if (field) field.addEventListener('keydown', submitRegister);
    });
});