// Contas individuais. A senha fica no Firebase Auth.
// O nome gravado na planilha tem de ser o do perfil deste login:
// a regra do banco recusa um nome de outra pessoa.

const ADMIN_EMAIL = 'fujikow.kontarski@gmail.com';
const USER_EMAIL_DOMAIN = 'anbu-farm-tower.firebaseapp.com';

let profilesByUid = {};
let auditEntries = [];
let accountWatchersStarted = false;

function normalizeUsername(value) {
    const username = String(value || '').trim().toLowerCase();
    if (!/^[a-z0-9._-]{3,24}$/.test(username)) return '';
    return username;
}

function sanitizePersonName(value) {
    const nome = String(value || '').replace(/[\u0000-\u001F\u007F]/g, '').trim();
    if (!nome || nome.length > 40) return '';
    return nome;
}

function usernameToEmail(username) {
    return `${username}@${USER_EMAIL_DOMAIN}`;
}

function isAdminUser(user) {
    return !!(user && user.email === ADMIN_EMAIL);
}

function loginEmailFromInput(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (raw.includes('@')) return raw.toLowerCase();
    const username = normalizeUsername(raw);
    if (!username) return '';
    return usernameToEmail(username);
}

function editorIdentity() {
    const user = firebase.auth().currentUser;
    if (!user) return null;
    const profile = profilesByUid[user.uid];
    if (!profile || !profile.nome || profile.ativo === false) return null;
    if (!isAdminUser(user) && profile.ativo !== true) return null;
    return { uid: user.uid, nome: profile.nome };
}

function provisioningAuth() {
    const name = 'anbu-provision';
    const existing = firebase.apps.find((app) => app.name === name);
    const app = existing || firebase.initializeApp(firebaseConfig, name);
    return app.auth();
}

async function ensureSessionProfile(user) {
    const ref = database.ref(`users/${user.uid}`);
    try {
        const snapshot = await ref.once('value');
        const profile = snapshot.val();
        if (isAdminUser(user) && !profile) {
            const created = {
                username: 'admin',
                nome: 'Administrador',
                email: user.email,
                ativo: true,
                criadoEm: new Date().toISOString()
            };
            await ref.set(created);
            profilesByUid[user.uid] = created;
            return created;
        }
        if (!isAdminUser(user) && (!profile || profile.ativo !== true)) return null;
        if (profile) profilesByUid[user.uid] = profile;
        return profile;
    } catch (error) {
        if (isAdminUser(user)) {
            const fallback = profilesByUid[user.uid] || {
                username: 'admin',
                nome: 'Administrador',
                email: user.email,
                ativo: true
            };
            profilesByUid[user.uid] = fallback;
            return fallback;
        }
        if (error && (error.code === 'PERMISSION_DENIED' || error.code === 'permission-denied')) return null;
        throw error;
    }
}

function startAccountWatchers() {
    if (accountWatchersStarted) return;
    accountWatchersStarted = true;
    database.ref('users').on('value', (snapshot) => {
        profilesByUid = snapshot.val() || {};
        renderSessionChrome();
        renderUserList();
    }, () => {
        renderSessionChrome();
    });
    database.ref('audit').limitToLast(80).on('value', (snapshot) => {
        auditEntries = [];
        snapshot.forEach((child) => {
            const value = child.val();
            if (value && typeof value === 'object') auditEntries.push(value);
        });
        auditEntries.reverse();
        renderAuditList();
    }, () => {
        auditEntries = [];
        renderAuditList();
    });
}

function stopAccountWatchers() {
    if (!accountWatchersStarted) return;
    database.ref('users').off();
    database.ref('audit').off();
    accountWatchersStarted = false;
    profilesByUid = {};
    auditEntries = [];
}

function auditPayload(acao, torre, torreId, identity, em) {
    return {
        acao: acao,
        uid: identity.uid,
        nome: identity.nome,
        em: em,
        mapa: String(torre.mapa || '').slice(0, 40),
        servidor: String(torre.servidor || '').slice(0, 2),
        torreId: String(torreId || '').slice(0, 40)
    };
}

function commitTowerWrite(torre, existingId, acao) {
    const identity = editorIdentity();
    if (!identity) return Promise.reject(new Error('profile'));
    const end = parseUtcInstant(torre.horarioFinalizacao);
    if (!end) return Promise.reject(new Error('schedule'));

    const em = toUtcIso(typeof getEstimatedServerTime === 'function' ? getEstimatedServerTime() : new Date());
    const stamped = Object.assign({}, torre, {
        editadoPor: identity.nome,
        editadoPorUid: identity.uid,
        editadoEm: em,
        horarioFinalizacaoMs: end.getTime()
    });
    if (!stamped.cadastradoPorUid) {
        stamped.cadastradoPor = identity.nome;
        stamped.cadastradoPorUid = identity.uid;
    }

    const id = existingId || towersRef.push().key;
    const auditKey = database.ref('audit').push().key;
    const updates = {};
    updates[`towers/${id}`] = stamped;
    updates[`audit/${auditKey}`] = auditPayload(acao, stamped, id, identity, em);
    return database.ref().update(updates);
}

function commitTowerHide(torre) {
    const identity = editorIdentity();
    if (!identity || !torre || !torre.id) return Promise.reject(new Error('profile'));
    const end = parseUtcInstant(torre.horarioFinalizacao);
    const em = toUtcIso(typeof getEstimatedServerTime === 'function' ? getEstimatedServerTime() : new Date());
    const updates = {};
    updates[`towers/${torre.id}/removida`] = true;
    updates[`towers/${torre.id}/editadoPor`] = identity.nome;
    updates[`towers/${torre.id}/editadoPorUid`] = identity.uid;
    updates[`towers/${torre.id}/editadoEm`] = em;
    // O milissegundo original permanece. Reescrevê-lo com um término antigo
    // faria a regra recusar a exclusão de uma torre que já passou de 10 minutos.
    if (typeof torre.horarioFinalizacaoMs !== 'number' && end) {
        const nowMs = (typeof getEstimatedServerTime === 'function' ? getEstimatedServerTime() : new Date()).getTime();
        const ms = end.getTime();
        if (ms > nowMs - 600000 && ms <= nowMs + 172800000 + 300000) {
            updates[`towers/${torre.id}/horarioFinalizacaoMs`] = ms;
        }
    }
    const auditKey = database.ref('audit').push().key;
    updates[`audit/${auditKey}`] = auditPayload('exclusao', torre, torre.id, identity, em);
    return database.ref().update(updates);
}

function renderSessionChrome() {
    const host = document.getElementById('accountTools');
    if (!host || typeof getTranslation !== 'function') return;
    const user = firebase.auth().currentUser;
    host.replaceChildren();
    if (!user) return;

    const profile = profilesByUid[user.uid];
    const nome = (profile && profile.nome) || user.email;
    const chip = document.createElement('span');
    chip.className = 'user-chip';
    chip.textContent = getTranslation('current_user', { nome: nome });

    const auditButton = document.createElement('button');
    auditButton.type = 'button';
    auditButton.className = 'btn-account';
    auditButton.textContent = getTranslation('btn_audit');
    auditButton.addEventListener('click', openAuditModal);

    const accountButton = document.createElement('button');
    accountButton.type = 'button';
    accountButton.className = 'btn-account';
    accountButton.textContent = getTranslation(isAdminUser(user) ? 'btn_users' : 'btn_change_password');
    accountButton.addEventListener('click', openAccountModal);

    host.append(chip, auditButton, accountButton);
}

function ensureAccountModals() {
    if (!document.body || document.getElementById('accountModal')) return;
    document.body.appendChild(buildAccountModal());
    document.body.appendChild(buildAuditModal());
}

function buildAccountModal() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'accountModal';
    overlay.addEventListener('click', (event) => {
        if (event.target === overlay) closeAccountModal();
    });

    const content = document.createElement('div');
    content.className = 'modal-content modal-account';
    content.innerHTML = `
        <div class="modal-header">
            <h2 id="accountModalTitle"></h2>
            <button class="modal-close" type="button" id="accountModalClose">✕</button>
        </div>
        <div class="modal-body">
            <p class="account-warning" id="accountSharedWarning"></p>
            <section id="accountAdminSection">
                <h3 id="accountCreateTitle"></h3>
                <div class="account-form">
                    <input type="text" id="accountUsername" maxlength="24" autocomplete="off">
                    <input type="text" id="accountNome" maxlength="40" autocomplete="off">
                    <input type="password" id="accountPassword" maxlength="64" autocomplete="new-password">
                    <button type="button" class="btn btn-submit" id="accountCreateBtn"></button>
                </div>
                <h3 id="accountListTitle"></h3>
                <div id="accountUserList" class="account-list"></div>
            </section>
            <section>
                <h3 id="accountPasswordTitle"></h3>
                <div class="account-form">
                    <input type="password" id="accountNewPassword" maxlength="64" autocomplete="new-password">
                    <button type="button" class="btn btn-view" id="accountPasswordBtn"></button>
                </div>
            </section>
            <p class="account-message" id="accountMessage"></p>
        </div>`;
    overlay.appendChild(content);
    return overlay;
}

function buildAuditModal() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'auditModal';
    overlay.addEventListener('click', (event) => {
        if (event.target === overlay) closeAuditModal();
    });
    const content = document.createElement('div');
    content.className = 'modal-content modal-account';
    content.innerHTML = `
        <div class="modal-header">
            <h2 id="auditModalTitle"></h2>
            <button class="modal-close" type="button" id="auditModalClose">✕</button>
        </div>
        <div class="modal-body">
            <div id="auditList" class="audit-list"></div>
        </div>`;
    overlay.appendChild(content);
    return overlay;
}

function labelAccountModal() {
    const user = firebase.auth().currentUser;
    const admin = isAdminUser(user);
    const title = document.getElementById('accountModalTitle');
    const warning = document.getElementById('accountSharedWarning');
    const adminSection = document.getElementById('accountAdminSection');
    if (title) title.textContent = getTranslation(admin ? 'account_modal_title' : 'account_password_title');
    if (warning) {
        warning.textContent = admin ? getTranslation('account_shared_warning') : '';
        warning.style.display = admin ? 'block' : 'none';
    }
    if (adminSection) adminSection.style.display = admin ? 'block' : 'none';
    setText('accountCreateTitle', 'account_create_title');
    setText('accountListTitle', 'account_list_title');
    setText('accountPasswordTitle', 'account_password_title');
    setText('accountCreateBtn', 'account_create_button');
    setText('accountPasswordBtn', 'btn_change_password');
    setPlaceholder('accountUsername', 'account_username');
    setPlaceholder('accountNome', 'account_name');
    setPlaceholder('accountPassword', 'account_password');
    setPlaceholder('accountNewPassword', 'account_new_password');
    const auditTitle = document.getElementById('auditModalTitle');
    if (auditTitle) auditTitle.textContent = getTranslation('audit_modal_title');
}

function setText(id, key) {
    const element = document.getElementById(id);
    if (element) element.textContent = getTranslation(key);
}

function setPlaceholder(id, key) {
    const element = document.getElementById(id);
    if (element) element.placeholder = getTranslation(key);
}

function showAccountMessage(message, ok) {
    const element = document.getElementById('accountMessage');
    if (!element) return;
    element.textContent = message;
    element.style.color = ok ? '#0a58ca' : '#dc3545';
}

function openAccountModal() {
    ensureAccountModals();
    wireAccountModal();
    labelAccountModal();
    renderUserList();
    showAccountMessage('', true);
    const modal = document.getElementById('accountModal');
    modal.classList.add('active');
    modal.style.display = 'flex';
}

function closeAccountModal() {
    const modal = document.getElementById('accountModal');
    if (!modal) return;
    modal.classList.remove('active');
    modal.style.display = 'none';
}

function openAuditModal() {
    ensureAccountModals();
    wireAccountModal();
    labelAccountModal();
    renderAuditList();
    const modal = document.getElementById('auditModal');
    modal.classList.add('active');
    modal.style.display = 'flex';
}

function closeAuditModal() {
    const modal = document.getElementById('auditModal');
    if (!modal) return;
    modal.classList.remove('active');
    modal.style.display = 'none';
}

let accountModalWired = false;

function wireAccountModal() {
    if (accountModalWired) return;
    accountModalWired = true;
    document.getElementById('accountModalClose').addEventListener('click', closeAccountModal);
    document.getElementById('auditModalClose').addEventListener('click', closeAuditModal);
    document.getElementById('accountCreateBtn').addEventListener('click', submitNewAccount);
    document.getElementById('accountPasswordBtn').addEventListener('click', submitPasswordChange);
}

function renderUserList() {
    const list = document.getElementById('accountUserList');
    if (!list) return;
    list.replaceChildren();
    const current = firebase.auth().currentUser;
    const rows = Object.entries(profilesByUid).sort((a, b) => {
        return String(a[1].username || '').localeCompare(String(b[1].username || ''));
    });
    rows.forEach(([uid, profile]) => {
        const row = document.createElement('div');
        row.className = 'account-row';
        const label = document.createElement('span');
        label.textContent = `${profile.nome || ''} (${profile.username || ''})`;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = profile.ativo === false ? 'btn-account is-blocked' : 'btn-account';
        button.textContent = getTranslation(profile.ativo === false ? 'account_inactive' : 'account_active');
        button.disabled = !!(current && current.uid === uid);
        button.addEventListener('click', () => toggleUserActive(uid, profile));
        row.append(label, button);
        list.appendChild(row);
    });
}

function renderAuditList() {
    const list = document.getElementById('auditList');
    if (!list || typeof getTranslation !== 'function') return;
    if (!auditEntries.length) {
        list.textContent = getTranslation('audit_empty');
        return;
    }
    list.replaceChildren();
    auditEntries.forEach((entry) => {
        const row = document.createElement('div');
        row.className = 'audit-row';
        const when = typeof formatDateTime === 'function' ? formatDateTime(entry.em) : entry.em;
        const action = getTranslation(`audit_action_${entry.acao}`);
        row.textContent = `${when} — ${entry.nome || ''} — ${action} — ${entry.mapa || ''} / ${entry.servidor || ''}`;
        list.appendChild(row);
    });
}

async function submitNewAccount() {
    const button = document.getElementById('accountCreateBtn');
    if (button) button.disabled = true;
    try {
        if (!isAdminUser(firebase.auth().currentUser)) {
            showAccountMessage(getTranslation('error_not_admin'), false);
            return;
        }
        const username = normalizeUsername(document.getElementById('accountUsername').value);
        const nome = sanitizePersonName(document.getElementById('accountNome').value);
        const password = document.getElementById('accountPassword').value;
        if (!username) {
            showAccountMessage(getTranslation('error_username_invalid'), false);
            return;
        }
        if (!nome) {
            showAccountMessage(getTranslation('error_name_invalid'), false);
            return;
        }
        if (!password || password.length < 6) {
            showAccountMessage(getTranslation('error_password_short'), false);
            return;
        }

        const secondary = provisioningAuth();
        let uid = '';
        try {
            const created = await secondary.createUserWithEmailAndPassword(usernameToEmail(username), password);
            uid = created.user.uid;
            await secondary.signOut();
        } catch (error) {
            try { await secondary.signOut(); } catch (ignore) { /* sessão auxiliar já encerrada */ }
            if (error && error.code === 'auth/email-already-in-use') {
                showAccountMessage(getTranslation('error_user_exists'), false);
            } else if (error && error.code === 'auth/weak-password') {
                showAccountMessage(getTranslation('error_password_short'), false);
            } else {
                showAccountMessage(getTranslation('error_save_tower'), false);
            }
            return;
        }

        try {
            await database.ref(`users/${uid}`).set({
                username: username,
                nome: nome,
                email: usernameToEmail(username),
                ativo: true,
                criadoEm: new Date().toISOString(),
                criadoPor: firebase.auth().currentUser.uid
            });
        } catch (error) {
            try {
                const orphan = await secondary.signInWithEmailAndPassword(usernameToEmail(username), password);
                await orphan.user.delete();
                await secondary.signOut();
            } catch (ignore) { /* a conta órfã fica sem permissão de escrita */ }
            showAccountMessage(getTranslation('error_save_tower'), false);
            return;
        }
        document.getElementById('accountUsername').value = '';
        document.getElementById('accountNome').value = '';
        document.getElementById('accountPassword').value = '';
        showAccountMessage(getTranslation('success_user_created', { username: username }), true);
    } finally {
        if (button) button.disabled = false;
    }
}

async function toggleUserActive(uid, profile) {
    const current = firebase.auth().currentUser;
    if (!isAdminUser(current) || !profile || current.uid === uid) return;
    const next = {
        username: profile.username,
        nome: profile.nome,
        email: profile.email,
        ativo: profile.ativo === false,
        criadoEm: profile.criadoEm || new Date().toISOString(),
        criadoPor: profile.criadoPor || current.uid
    };
    try {
        await database.ref(`users/${uid}`).set(next);
        showAccountMessage(getTranslation('success_user_updated'), true);
    } catch (error) {
        showAccountMessage(getTranslation('error_save_tower'), false);
    }
}

async function submitPasswordChange() {
    const user = firebase.auth().currentUser;
    const password = document.getElementById('accountNewPassword').value;
    if (!user) return;
    if (!password || password.length < 6) {
        showAccountMessage(getTranslation('error_password_short'), false);
        return;
    }
    try {
        await user.updatePassword(password);
        document.getElementById('accountNewPassword').value = '';
        showAccountMessage(getTranslation('success_password_changed'), true);
    } catch (error) {
        if (error && error.code === 'auth/requires-recent-login') {
            showAccountMessage(getTranslation('error_recent_login'), false);
        } else {
            showAccountMessage(getTranslation('error_save_tower'), false);
        }
    }
}

if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', ensureAccountModals);
}
