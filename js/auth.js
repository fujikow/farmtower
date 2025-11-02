// ===== SISTEMA DE AUTENTICAÇÃO UNIVERSAL =====

// DEFINA SUA SENHA AQUI (você pode mudar quando quiser)
const HASH_CORRETO = "7a9cb0b2fad22578c8e28b88586963f0591dbce61c314eae7496502c94afc352";
let autenticado = false;

// ===== VERIFICAR AUTENTICAÇÃO AO CARREGAR PÁGINA =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔒 Verificando autenticação...');
    
    // Verificar se já está autenticado na sessão
    const authSession = sessionStorage.getItem('anbu_auth');
    
    if (authSession === 'authenticated') {
        autenticado = true;
        showContent();
    } else {
        showLoginScreen();
    }
});

// ===== MOSTRAR TELA DE LOGIN =====
function showLoginScreen() {
    console.log('🔐 Mostrando tela de login...');
    
    // Esconder conteúdo principal (funciona para ambas as páginas)
    const mainContent = document.querySelector('.container-full') || document.querySelector('.container');
    if (mainContent) {
        mainContent.style.display = 'none';
    }
    
    // Mostrar tela de login
    const loginScreen = document.getElementById('loginScreen');
    if (loginScreen) {
        loginScreen.style.display = 'flex';
    }
    
    // Focar no campo de senha
    setTimeout(() => {
        const passwordInput = document.getElementById('passwordInput');
        if (passwordInput) {
            passwordInput.focus();
        }
    }, 100);
}

// ===== MOSTRAR CONTEÚDO =====
function showContent() {
    console.log('✅ Autenticado! Mostrando conteúdo...');
    
    // Esconder tela de login
    const loginScreen = document.getElementById('loginScreen');
    if (loginScreen) {
        loginScreen.style.display = 'none';
    }
    
    // Mostrar conteúdo principal (funciona para ambas as páginas)
    const mainContent = document.querySelector('.container-full') || document.querySelector('.container');
    if (mainContent) {
        mainContent.style.display = 'block';
    }
    
    // Se estiver na página da tabela, iniciar carregamento das torres
    if (typeof loadTowersFromFirebase === 'function') {
        loadTowersFromFirebase();
    }
}

// ===== VERIFICAR SENHA (VERSÃO SEGURA COM HASH) =====
function checkPassword() {
    const passwordInput = document.getElementById('passwordInput');
    const errorMessage = document.getElementById('errorMessage');
    const senha = passwordInput.value.trim();
    
    console.log('🔍 Verificando senha (via hash)...');
    
    if (senha === '') {
        showError('Por favor, digite a senha!');
        return;
    }

    // --- MUDANÇA PRINCIPAL AQUI ---
    // 1. Calcular o hash do que o usuário digitou
    const hashDigitado = sha256(senha); 
    
    // 2. Comparar o hash gerado com o hash correto
    if (hashDigitado === HASH_CORRETO) {


        console.log('✅ Hash correto! Acesso permitido.');
        
        // Salvar autenticação na sessão (lógica original mantida)
        sessionStorage.setItem('anbu_auth', 'authenticated');
        autenticado = true;
        
        // Limpar campo (lógica original mantida)
        passwordInput.value = '';
        
        // Esconder erro (lógica original mantida)
        if (errorMessage) {
            errorMessage.style.display = 'none';
        }
        
        // Mostrar conteúdo (lógica original mantida)
        showContent();
        
    } else {
        // A senha está incorreta
        console.log('❌ Hash incorreto! Acesso negado.');
        showError('❌ Senha incorreta! Tente novamente.');
        
        // Limpar campo (lógica original mantida)
        passwordInput.value = '';
        passwordInput.focus();
        
        // Adicionar animação de erro (lógica original mantida)
        passwordInput.classList.add('shake');
        setTimeout(() => {
            passwordInput.classList.remove('shake');
        }, 500);
    }
}

// ===== MOSTRAR MENSAGEM DE ERRO =====
function showError(message) {
    const errorMessage = document.getElementById('errorMessage');
    if (errorMessage) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
    }
}

// ===== PERMITIR ENTER PARA ENVIAR =====
document.addEventListener('DOMContentLoaded', function() {
    const passwordInput = document.getElementById('passwordInput');
    if (passwordInput) {
        passwordInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                checkPassword();
            }
        });
    }
});

// ===== LOGOUT =====
function logout() {
    console.log('🚪 Fazendo logout...');
    
    // Confirmar logout
    if (confirm('Deseja realmente sair?')) {
        sessionStorage.removeItem('anbu_auth');
        autenticado = false;
        
        // Recarregar página para mostrar tela de login
        window.location.reload();
    }
}
