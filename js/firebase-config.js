// ===== CONFIGURAÇÃO DO FIREBASE =====
// SUBSTITUA ESTAS CONFIGURAÇÕES PELAS SUAS DO FIREBASE CONSOLE

const firebaseConfig = {
  apiKey: "AIzaSyCbZ2OC1HTPbg-MHvFpve3LN4tRDKc8MCI",
  authDomain: "anbu-farm-tower.firebaseapp.com",
  databaseURL: "https://anbu-farm-tower-default-rtdb.firebaseio.com",
  projectId: "anbu-farm-tower",
  storageBucket: "anbu-farm-tower.firebasestorage.app",
  messagingSenderId: "280009511261",
  appId: "1:280009511261:web:d0fccc9bd795bab44ed8b4"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Referência ao banco de dados
const database = firebase.database();
const towersRef = database.ref('towers');

// ===== NOVO: SINCRONIZADOR DE HORA DO SERVIDOR =====
let serverTimeOffset = 0; // Armazena a diferença entre o cliente e o servidor

const offsetRef = database.ref('.info/serverTimeOffset');
offsetRef.on('value', (snapshot) => {
    serverTimeOffset = snapshot.val() || 0;
    console.log(`[Time Sync] Desvio do servidor: ${serverTimeOffset}ms`);
});

/**
 * Retorna um objeto Date com a hora atual estimada do servidor (em UTC),
 * corrigindo qualquer erro no relógio local do usuário.
 */
function getEstimatedServerTime() {
    return new Date(new Date().getTime() + serverTimeOffset);
}
// ===== FIM DO SINCRONIZADOR =====


// Monitorar status de conexão
const connectedRef = database.ref('.info/connected');
connectedRef.on('value', (snapshot) => {
    const statusElement = document.getElementById('connectionStatus');
    if (statusElement) {
        if (snapshot.val() === true) {
            statusElement.innerHTML = '<span class="status-dot connected"></span><span class="status-text" data-i18n-key="connection_status_connected">Conectado</span>'; // (Chave de tradução atualizada recomendada)
        } else {
            statusElement.innerHTML = '<span class="status-dot disconnected"></span><span class="status-text" data-i18n-key="connection_status_disconnected">Desconectado</span>'; // (Chave de tradução atualizada recomendada)
        }
    }
});


// Função para limpar torres expiradas
function cleanExpiredTowers() {
    // Usamos a hora corrigida do servidor aqui também
    const now = getEstimatedServerTime().getTime(); 
    
    towersRef.once('value', (snapshot) => {
        const towers = snapshot.val();
        if (towers) {
            Object.keys(towers).forEach(key => {
                const torre = towers[key];
                const finalizacao = new Date(torre.horarioFinalizacao).getTime();
                
                // Remover se expirou há mais de 1 hora
                if (now - finalizacao > 60 * 60 * 1000) {
                    towersRef.child(key).remove();
                    console.log('🗑️ Torre expirada removida:', key);
                }
            });
        }
    });
}

// (As chamadas para cleanExpiredTowers() agora são iniciadas pelo auth.js após o login)

console.log('🔥 Firebase inicializado com sucesso!');