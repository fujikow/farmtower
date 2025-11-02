// ===== CONFIGURAÇÃO DO FIREBASE =====
// SUBSTITUA ESTAS CONFIGURAÇÕES PELAS SUAS DO FIREBASE CONSOLE

const firebaseConfig = {
    apiKey: "AIzaSyDEXAMPLE_KEY_SUBSTITUA_AQUI",
    authDomain: "anbu-farm-tower.firebaseapp.com",
    databaseURL: "https://anbu-farm-tower-default-rtdb.firebaseio.com",
    projectId: "anbu-farm-tower",
    storageBucket: "anbu-farm-tower.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abc123def456"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Referência ao banco de dados
const database = firebase.database();
const towersRef = database.ref('towers');

// Monitorar status de conexão
const connectedRef = database.ref('.info/connected');
connectedRef.on('value', (snapshot) => {
    const statusElement = document.getElementById('connectionStatus');
    if (statusElement) {
        if (snapshot.val() === true) {
            statusElement.innerHTML = '<span class="status-dot connected"></span><span class="status-text">Conectado</span>';
        } else {
            statusElement.innerHTML = '<span class="status-dot disconnected"></span><span class="status-text">Desconectado</span>';
        }
    }
});

// Limpar torres expiradas automaticamente (executar a cada 5 minutos)
setInterval(() => {
    cleanExpiredTowers();
}, 5 * 60 * 1000);

// Função para limpar torres expiradas
function cleanExpiredTowers() {
    const now = new Date().getTime();
    
    towersRef.once('value', (snapshot) => {
        const towers = snapshot.val();
        if (towers) {
            Object.keys(towers).forEach(key => {
                const torre = towers[key];
                const finalizacao = new Date(torre.horarioFinalizacao).getTime();
                
                // Remover se expirou há mais de 1 hora
                if (now - finalizacao > 60 * 60 * 1000) {
                    towersRef.child(key).remove();
                }
            });
        }
    });
}

// Executar limpeza ao carregar
cleanExpiredTowers();
