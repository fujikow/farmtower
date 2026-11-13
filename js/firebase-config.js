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

// ===== SINCRONIZADOR DE HORA DO SERVIDOR =====
// O relógio do Windows só define o fuso da tela. O "agora" compartilhado
// vem do servidor, para um PC adiantado não gravar término diferente dos outros.
let serverTimeOffset = 0;
let serverTimeOffsetReady = false;
const serverTimeWaiters = [];

const offsetRef = database.ref('.info/serverTimeOffset');
offsetRef.on('value', (snapshot) => {
    const value = snapshot.val();
    serverTimeOffset = typeof value === 'number' && Number.isFinite(value) ? value : 0;
    console.log(`[Time Sync] Desvio do servidor: ${serverTimeOffset}ms`);
    if (!serverTimeOffsetReady) {
        serverTimeOffsetReady = true;
        const waiters = serverTimeWaiters.splice(0);
        waiters.forEach((resolve) => resolve());
    }
    if (typeof renderWindowsClock === 'function') renderWindowsClock();
    if (typeof updateSchedulePreview === 'function') updateSchedulePreview();
});

/**
 * Retorna um objeto Date com a hora atual estimada do servidor,
 * corrigindo erro do relógio local sem mudar o fuso do Windows.
 */
function getEstimatedServerTime() {
    return new Date(Date.now() + serverTimeOffset);
}

function isServerTimeReady() {
    return serverTimeOffsetReady === true;
}

function whenServerTimeReady(timeoutMs = 4000) {
    if (serverTimeOffsetReady) return Promise.resolve();
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            const index = serverTimeWaiters.indexOf(onReady);
            if (index >= 0) serverTimeWaiters.splice(index, 1);
            reject(new Error('offset-timeout'));
        }, timeoutMs);

        function onReady() {
            clearTimeout(timer);
            resolve();
        }

        serverTimeWaiters.push(onReady);
    });
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


// Tira da tabela as torres que expiraram há mais de 1 hora.
// O registro fica, com dono e lado, para o consolidado do evento.
function cleanExpiredTowers() {
    const cutoffMs = getEstimatedServerTime().getTime() - (60 * 60 * 1000);
    const cutoff = new Date(cutoffMs).toISOString();

    towersRef.orderByChild('horarioFinalizacao').endAt(cutoff).once('value', (snapshot) => {
        const updates = {};
        let kept = 0;
        const nowMs = getEstimatedServerTime().getTime();
        const admin = typeof isAdminUser === 'function' && isAdminUser(firebase.auth().currentUser);
        const identity = typeof editorIdentity === 'function' ? editorIdentity() : null;
        const em = new Date(nowMs).toISOString();
        snapshot.forEach((child) => {
            const value = child.val() || {};
            if (value.removida === true) return;
            const finalizacao = parseUtcInstant(value.horarioFinalizacao);
            if (!finalizacao || finalizacao.getTime() > cutoffMs) return;
            const expiredMs = typeof value.horarioFinalizacaoMs === 'number' && value.horarioFinalizacaoMs + 3600000 < nowMs;
            if (!admin && !expiredMs) return;
            if (!identity) return;
            updates[`towers/${child.key}/removida`] = true;
            updates[`towers/${child.key}/editadoPor`] = identity.nome;
            updates[`towers/${child.key}/editadoPorUid`] = identity.uid;
            updates[`towers/${child.key}/editadoEm`] = em;
            kept += 1;
            if (typeof auditPayload === 'function') {
                const auditKey = database.ref('audit').push().key;
                updates[`audit/${auditKey}`] = auditPayload('expiracao', value, child.key, identity, em);
            }
        });
        if (kept > 0) {
            database.ref().update(updates).then(() => {
                console.log(`[Limpeza] ${kept} torres saíram da tabela. O lado ficou guardado.`);
            }).catch((error) => {
                console.error('[Limpeza] Não foi possível arquivar torres expiradas:', error.code || error.message);
            });
        }
    });
}

// (As chamadas para cleanExpiredTowers() agora são iniciadas pelo auth.js após o login)

console.log('🔥 Firebase inicializado com sucesso!');