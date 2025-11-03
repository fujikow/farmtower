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
            // Se 'user' existir, ele está logado
            console.log('✅ Usuário autenticado:', user.email);
            showContent(); // Mostra o conteúdo principal
        } else {
            // Se 'user' for nulo, ele está deslogado
            console.log('🔐 Usuário deslogado.');
            showLoginScreen(); // Mostra a tela de login
        }
    });
});

// ===== TENTAR FAZER LOGIN (Versão com E-mail Fixo) =====
function handleLogin() {
    
    // !!! MUDE AQUI !!!
    // Coloque o e-mail que você cadastrou no Painel do Firebase.
    const EMAIL_FIXO = "fujikow.kontarski@gmail.com"; 
    // !!! MUDE AQUI !!!

    const passwordInput = document.getElementById('passwordInput');
    const senha = passwordInput.value.trim();

    if (senha === '') {
        showLoginError('Por favor, digite a senha!');
        return;
    }

    console.log('🔍 Tentando login via Firebase com e-mail fixo...');

    // Função principal do Firebase para logar
    auth.signInWithEmailAndPassword(EMAIL_FIXO, senha)
        .then(userCredential => {
            // Sucesso! O onAuthStateChanged acima cuidará de mostrar o conteúdo.
            console.log('Login bem-sucedido!', userCredential.user.email);
            passwordInput.value = ''; // Limpa o campo
        })
        .catch(error => {
            // Erro no login
            console.error('❌ Falha no login:', error.code, error.message);
            
            let mensagemErro = '❌ Senha incorreta! Tente novamente.';
            if (error.code === 'auth/wrong-password') {
                mensagemErro = '❌ Senha incorreta! Tente novamente.';
            } else if (error.code === 'auth/user-not-found') {
                mensagemErro = '❌ Erro de configuração (Usuário fixo não encontrado).';
            }
            
            showLoginError(mensagemErro);
            
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
    
    // Se estiver na página da tabela, iniciar carregamento das torres
    // Esta função agora só é chamada DEPOIS do login
    if (typeof loadTowersFromFirebase === 'function') {
        loadTowersFromFirebase();
    }
}

// ===== MOSTRAR MENSAGEM DE ERRO =====
function showLoginError(message) {
    const errorMessage = document.getElementById('errorMessage');
    if (errorMessage) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
    }
}

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