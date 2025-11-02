// ===== SISTEMA DE AUTENTICAÇÃO UNIVERSAL =====

// DEFINA SUA SENHA AQUI (você pode mudar quando quiser)
const SENHA_CORRETA = "nars"; // ← MUDE AQUI PARA SUA SENHA

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

// ===== VERIFICAR SENHA =====
function checkPassword() {
    const passwordInput = document.getElementById('passwordInput');
    const errorMessage = document.getElementById('errorMessage');
    const senha = passwordInput.value.trim();
    
    console.log('🔍 Verificando senha...');
    
    if (senha === '') {
        showError('Por favor, digite a senha!');
        return;
    }
    
    if (senha === SENHA_CORRETA) {
        console.log('✅ Senha correta!');
        
        // Salvar autenticação na sessão
        sessionStorage.setItem('anbu_auth', 'authenticated');
        autenticado = true;
        
        // Limpar campo
        passwordInput.value = '';
        
        // Esconder erro
        if (errorMessage) {
            errorMessage.style.display = 'none';
        }
        
        // Mostrar conteúdo
        showContent();
        
    } else {
        console.log('❌ Senha incorreta!');
        showError('❌ Senha incorreta! Tente novamente.');
        
        // Limpar campo
        passwordInput.value = '';
        passwordInput.focus();
        
        // Adicionar animação de erro
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
