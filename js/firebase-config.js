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
        statusElement.replaceChildren();
        const dot = document.createElement('span');
        dot.className = snapshot.val() === true ? 'status-dot connected' : 'status-dot disconnected';
        const label = document.createElement('span');
        label.className = 'status-text';
        if (snapshot.val() === true) {
            label.setAttribute('data-i18n-key', 'connection_status_connected');
            label.textContent = 'Conectado';
        } else {
            label.setAttribute('data-i18n-key', 'connection_status_disconnected');
            label.textContent = 'Desconectado';
        }
        statusElement.append(dot, label);
        if (typeof translatePage === 'function' && Object.keys(translations || {}).length > 0) {
            translatePage();
        }
    }
});


// Remove torres que expiraram há mais de 1 hora.
// A consulta usa o índice horarioFinalizacao (veja database.rules.json).
function cleanExpiredTowers() {
    const cutoff = new Date(getEstimatedServerTime().getTime() - 60 * 60 * 1000).toISOString();

    towersRef.orderByChild('horarioFinalizacao').endAt(cutoff).once('value', (snapshot) => {
        const removals = [];
        snapshot.forEach((child) => {
            const finalizacao = child.child('horarioFinalizacao').val();
            if (typeof finalizacao === 'string' && finalizacao <= cutoff) {
                removals.push(child.ref.remove());
            }
        });
        if (removals.length > 0) {
            Promise.all(removals).then(() => {
                console.log(`[Limpeza] ${removals.length} torres expiradas há mais de 1h removidas.`);
            });
        }
    });
}

// (As chamadas para cleanExpiredTowers() agora são iniciadas pelo auth.js após o login)

console.log('🔥 Firebase inicializado com sucesso!');