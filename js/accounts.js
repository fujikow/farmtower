// Contas individuais. A senha fica no Firebase Auth.
// O nome gravado na planilha tem de ser o do perfil deste login:
// a regra do banco recusa um nome de outra pessoa.

const ADMIN_EMAIL = 'fujikow.kontarski@gmail.com';
const SHARED_ADMIN_EMAIL = 'admin@anbu-farm-tower.firebaseapp.com';
const USER_EMAIL_DOMAIN = 'anbu-farm-tower.firebaseapp.com';

let profilesByUid = {};
let auditEntries = [];
let accountWatchersStarted = false;
// createUserWithEmailAndPassword no auth principal dispara onAuthStateChanged
// antes do perfil existir. auth.js ignora o evento enquanto o cadastro corre.
let accountSignupInProgress = false;
let sessionDenial = '';

function isAccountSignupInProgress() {
    return accountSignupInProgress;
}

function setAccountSignupInProgress(active) {
    accountSignupInProgress = active === true;
}

function sessionDenialReason() {
    return sessionDenial;
}

function accountSituacao(profile) {
    if (profile && (profile.situacao === 'pendente' || profile.situacao === 'ativo' || profile.situacao === 'bloqueado' || profile.situacao === 'recusado')) {
        return profile.situacao;
    }
    return profile && profile.ativo === false ? 'bloqueado' : 'ativo';
}

function pendingAccountCount() {
    return Object.values(profilesByUid).filter((profile) => accountSituacao(profile) === 'pendente').length;
}

const ACCOUNT_LIST_ORDER = ['pendente', 'ativo', 'recusado', 'bloqueado'];

function accountListEntries(profiles) {
    const rank = Object.fromEntries(ACCOUNT_LIST_ORDER.map((situacao, index) => [situacao, index]));
    return Object.entries(profiles || {}).sort((a, b) => {
        const byStatus = (rank[accountSituacao(a[1])] ?? 1) - (rank[accountSituacao(b[1])] ?? 1);
        if (byStatus) return byStatus;
        return String(a[1].username || '').localeCompare(String(b[1].username || ''), undefined, { sensitivity: 'base' });
    });
}

function rankingText(value) {
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
    return '';
}

function rankingPersonKey(uid, nome) {
    const id = rankingText(uid);
    const name = rankingText(nome);
    return id || (name ? `nome:${name.toLowerCase()}` : '');
}

function rankingPersonLabel(uid, nome, profiles) {
    const profile = uid && profiles ? profiles[rankingText(uid)] : null;
    return rankingText(profile && profile.nome) || rankingText(nome) || rankingText(profile && profile.username) || '—';
}

function rankingBoard(activeTowers, auditEvents, profiles) {
    const rows = new Map();
    const cadastroTowerIds = new Set();
    function slot(key, nome) {
        let row = rows.get(key);
        if (!row) {
            row = { nome: nome || '—', ativas: 0, acumulado: 0 };
            rows.set(key, row);
        }
        if (nome && nome !== '—') row.nome = nome;
        return row;
    }
    (auditEvents || []).forEach((event) => {
        if (!event || event.acao !== 'cadastro') return;
        const key = rankingPersonKey(event.uid, event.nome);
        if (!key) return;
        slot(key, rankingPersonLabel(event.uid, event.nome, profiles)).acumulado += 1;
        if (event.torreId) cadastroTowerIds.add(String(event.torreId));
    });
    (activeTowers || []).forEach((torre) => {
        if (!torre || typeof torre !== 'object') return;
        const key = rankingPersonKey(torre.cadastradoPorUid, torre.cadastradoPor);
        if (!key) return;
        const row = slot(key, rankingPersonLabel(torre.cadastradoPorUid, torre.cadastradoPor, profiles));
        row.ativas += 1;
        const id = rankingText(torre.id);
        if (!id || !cadastroTowerIds.has(id)) row.acumulado += 1;
    });
    return [...rows.values()].sort((a, b) => b.acumulado - a.acumulado || b.ativas - a.ativas || a.nome.localeCompare(b.nome, undefined, { sensitivity: 'base' }));
}

function overwriteReport(auditEvents, activeTowers, profiles) {
    const events = Array.isArray(auditEvents) ? auditEvents : [];
    const active = new Map();
    (activeTowers || []).forEach((torre) => {
        if (torre && torre.id) active.set(String(torre.id), torre);
    });
    const authors = new Map();
    events.forEach((event) => {
        if (!event || event.acao !== 'cadastro' || !event.torreId) return;
        const id = String(event.torreId);
        const prev = authors.get(id);
        if (!prev || String(event.em || '') < String(prev.em || '')) authors.set(id, event);
    });
    return events.filter((event) => event && event.acao === 'sobrescrita').map((event) => {
        const id = String(event.torreId || '');
        const torre = active.get(id);
        const cadastro = authors.get(id);
        return {
            em: String(event.em || ''),
            nome: String(event.nome || ''),
            mapa: String(event.mapa || (torre && torre.mapa) || ''),
            servidor: String(event.servidor || (torre && torre.servidor) || ''),
            torreId: id,
            ativa: !!torre,
            autor: rankingPersonLabel((torre && torre.cadastradoPorUid) || (cadastro && cadastro.uid), (torre && torre.cadastradoPor) || (cadastro && cadastro.nome), profiles),
            horarioAnterior: auditScheduleIso(event.horarioAnterior),
            horarioNovo: auditScheduleIso(event.horarioNovo)
        };
    }).sort((a, b) => b.em.localeCompare(a.em) || a.mapa.localeCompare(b.mapa) || a.servidor.localeCompare(b.servidor, undefined, { numeric: true }));
}

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

function isAdminEmail(email) {
    const value = String(email || '').trim().toLowerCase();
    return value === ADMIN_EMAIL || value === SHARED_ADMIN_EMAIL;
}

function isAdminUser(user) {
    if (!user) return false;
    if (isAdminEmail(user.email)) return true;
    const providers = user.providerData || [];
    for (let i = 0; i < providers.length; i += 1) {
        if (isAdminEmail(providers[i] && providers[i].email)) return true;
    }
    const profile = profilesByUid[user.uid];
    return !!(profile && isAdminEmail(profile.email));
}

function isModeratorUser(user) {
    if (!user || isAdminUser(user)) return false;
    const profile = profilesByUid[user.uid];
    return !!(profile && profile.moderador === true && profile.ativo === true && accountSituacao(profile) === 'ativo');
}

function canApproveMembers(user) {
    return isAdminUser(user) || isModeratorUser(user);
}

function userRecord(profile, situacao, moderador) {
    const record = {
        username: profile.username,
        nome: profile.nome,
        email: profile.email,
        ativo: situacao === 'ativo',
        situacao: situacao
    };
    if (profile.criadoEm) record.criadoEm = profile.criadoEm;
    if (profile.criadoPor) record.criadoPor = profile.criadoPor;
    const flag = typeof moderador === 'boolean' ? moderador : profile.moderador;
    if (flag === true || flag === false) record.moderador = flag;
    return record;
}

function adminProfileSeed(user) {
    const shared = user.email === SHARED_ADMIN_EMAIL;
    return {
        username: 'admin',
        nome: shared ? 'Admin da equipe' : 'Administrador',
        email: user.email,
        ativo: true,
        situacao: 'ativo',
        criadoEm: new Date().toISOString()
    };
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
    if (!isAdminUser(user) && (profile.ativo !== true || (profile.situacao && profile.situacao !== 'ativo'))) return null;
    return { uid: user.uid, nome: profile.nome };
}

function provisioningAuth() {
    const name = 'anbu-provision';
    const existing = firebase.apps.find((app) => app.name === name);
    const app = existing || firebase.initializeApp(firebaseConfig, name);
    return app.auth();
}

async function ensureSessionProfile(user) {
    sessionDenial = '';
    const ref = database.ref(`users/${user.uid}`);
    try {
        const snapshot = await ref.once('value');
        const profile = snapshot.val();
        if (profile) profilesByUid[user.uid] = profile;
        if (isAdminUser(user) && (!profile || accountSituacao(profile) !== 'ativo' || profile.ativo !== true)) {
            const created = adminProfileSeed(user);
            if (profile && profile.criadoEm) created.criadoEm = profile.criadoEm;
            if (profile && profile.criadoPor) created.criadoPor = profile.criadoPor;
            await ref.set(created);
            profilesByUid[user.uid] = created;
            return created;
        }
        if (!isAdminUser(user)) {
            const situacao = profile ? accountSituacao(profile) : 'bloqueado';
            if (!profile || profile.ativo !== true || situacao !== 'ativo') {
                sessionDenial = situacao === 'pendente' ? 'pending' : (situacao === 'recusado' ? 'refused' : 'blocked');
                return null;
            }
        }
        if (profile) profilesByUid[user.uid] = profile;
        return profile;
    } catch (error) {
        if (isAdminUser(user)) {
            const fallback = profilesByUid[user.uid] || adminProfileSeed(user);
            if (!fallback.situacao) fallback.situacao = 'ativo';
            profilesByUid[user.uid] = fallback;
            return fallback;
        }
        if (error && (error.code === 'PERMISSION_DENIED' || error.code === 'permission-denied')) {
            sessionDenial = 'blocked';
            return null;
        }
        throw error;
    }
}

function startAccountWatchers() {
    if (accountWatchersStarted) return;
    accountWatchersStarted = true;
    database.ref('users').on('value', (snapshot) => {
        profilesByUid = snapshot.val() || {};
        renderSessionChrome();
        const accountModal = document.getElementById('accountModal');
        if (accountModal && accountModal.classList.contains('active') && typeof labelAccountModal === 'function') labelAccountModal();
        renderUserList();
    }, () => {
        renderSessionChrome();
    });
    database.ref('config/servidores').on('value', (snapshot) => {
        if (typeof applyServerCatalog === 'function' && applyServerCatalog(snapshot.val())) {
            if (!serverDraftDirty) {
                serverDraft = null;
                renderServerEditor();
            }
        }
    });
    if (!isAdminUser(firebase.auth().currentUser)) return;
    database.ref('audit').on('value', (snapshot) => {
        auditEntries = [];
        snapshot.forEach((child) => {
            const value = child.val();
            if (value && typeof value === 'object') auditEntries.push(value);
        });
        auditEntries.sort((a, b) => String(b.em || '').localeCompare(String(a.em || '')));
        renderAuditList();
        renderRegistrarRanking();
        renderOverwriteReport();
    }, () => {
        auditEntries = [];
        renderAuditList();
        renderRegistrarRanking();
        renderOverwriteReport();
    });
}

function stopAccountWatchers() {
    if (!accountWatchersStarted) return;
    database.ref('users').off();
    database.ref('audit').off();
    database.ref('config/servidores').off();
    accountWatchersStarted = false;
    profilesByUid = {};
    auditEntries = [];
}

function auditScheduleIso(value) {
    if (typeof parseUtcInstant !== 'function' || typeof toUtcIso !== 'function') return '';
    const instant = parseUtcInstant(value);
    if (!instant) return '';
    const iso = toUtcIso(instant);
    return /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$/.test(iso) ? iso : '';
}

function auditPayload(acao, torre, torreId, identity, em, previous) {
    const payload = {
        acao: acao,
        uid: identity.uid,
        nome: identity.nome,
        em: em,
        mapa: String(torre.mapa || '').slice(0, 40),
        servidor: String(torre.servidor || '').slice(0, 2),
        torreId: String(torreId || '').slice(0, 40)
    };
    if (acao === 'sobrescrita') {
        const antigo = auditScheduleIso(previous && previous.horarioFinalizacao);
        const novo = auditScheduleIso(torre && torre.horarioFinalizacao);
        if (antigo) payload.horarioAnterior = antigo;
        if (novo) payload.horarioNovo = novo;
    }
    return payload;
}

function commitTowerWrite(torre, existingId, acao, previous) {
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
    updates[`audit/${auditKey}`] = auditPayload(acao, stamped, id, identity, em, previous);
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
        if (ms > nowMs - 600000 && ms <= nowMs + FIELD_LIMITS.duracaoSegundos * 1000 + 300000) {
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
    if (!isAdminUser(user)) {
        closeAuditModal();
        closeRankingModal();
        closeOverwriteModal();
        renderRegistrarRanking();
        renderOverwriteReport();
    }
    if (!user) return;

    const profile = profilesByUid[user.uid];
    const nome = (profile && profile.nome) || user.email;
    const chip = document.createElement('span');
    chip.className = 'user-chip';
    chip.textContent = getTranslation('current_user', { nome: nome });

    const accountButton = document.createElement('button');
    accountButton.type = 'button';
    accountButton.className = 'btn-account';
    if (canApproveMembers(user)) {
        const pending = pendingAccountCount();
        const label = getTranslation('btn_users');
        accountButton.textContent = pending > 0 ? `${label} (${pending})` : label;
    } else {
        accountButton.textContent = getTranslation('btn_change_password');
    }
    accountButton.addEventListener('click', openAccountModal);

    host.append(chip);
    if (isAdminUser(user)) {
        const auditButton = document.createElement('button');
        auditButton.type = 'button';
        auditButton.className = 'btn-account';
        auditButton.textContent = getTranslation('btn_audit');
        auditButton.addEventListener('click', openAuditModal);
        host.append(auditButton);
        const rankingButton = document.createElement('button');
        rankingButton.type = 'button';
        rankingButton.className = 'btn-account';
        rankingButton.textContent = getTranslation('btn_ranking');
        rankingButton.addEventListener('click', openRankingModal);
        host.append(rankingButton);
        const overwriteButton = document.createElement('button');
        overwriteButton.type = 'button';
        overwriteButton.className = 'btn-account';
        overwriteButton.textContent = getTranslation('btn_overwrites');
        overwriteButton.addEventListener('click', openOverwriteModal);
        host.append(overwriteButton);
    }
    host.append(accountButton);
    syncEditorColumn();
}

function syncEditorColumn() {
    const table = document.getElementById('towersTable');
    if (!table) return;
    table.classList.toggle('hide-editor', !isAdminUser(firebase.auth().currentUser));
}

function ensureAccountModals() {
    if (!document.body || document.getElementById('accountModal')) return;
    document.body.appendChild(buildAccountModal());
    document.body.appendChild(buildAuditModal());
    document.body.appendChild(buildRankingModal());
    document.body.appendChild(buildOverwriteModal());
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
            <p class="ranking-hint" id="accountModeratorHint" hidden></p>
            <section id="accountAdminSection">
                <details class="account-create" id="accountCreateDetails">
                    <summary id="accountCreateTitle"></summary>
                    <div class="account-form">
                        <input type="text" id="accountUsername" maxlength="24" autocomplete="off">
                        <input type="text" id="accountNome" maxlength="40" autocomplete="off">
                        <input type="password" id="accountPassword" maxlength="64" autocomplete="new-password">
                        <button type="button" class="btn btn-submit" id="accountCreateBtn"></button>
                    </div>
                </details>
                <details class="account-servers" id="accountServersDetails">
                    <summary id="accountServersTitle"></summary>
                    <p class="account-servers-hint" id="accountServersHint"></p>
                    <div id="accountServerList" class="account-server-list"></div>
                    <button type="button" class="btn btn-submit" id="accountServerSave"></button>
                </details>
            </section>
            <section id="accountMembersSection">
                <div class="account-list-head">
                    <h3 id="accountListTitle"></h3>
                    <span id="accountListCount" class="account-list-count"></span>
                </div>
                <input type="search" id="accountSearch" class="account-search" autocomplete="off">
                <div class="account-filters" id="accountFilters">
                    <button type="button" data-account-filter="all"></button>
                    <button type="button" data-account-filter="pendente"></button>
                    <button type="button" data-account-filter="ativo"></button>
                    <button type="button" data-account-filter="recusado"></button>
                    <button type="button" data-account-filter="bloqueado"></button>
                </div>
                <div id="accountUserList" class="account-list"></div>
            </section>
            <section class="account-password-section">
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

function buildRankingModal() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'rankingModal';
    overlay.addEventListener('click', (event) => {
        if (event.target === overlay) closeRankingModal();
    });
    const content = document.createElement('div');
    content.className = 'modal-content modal-account';
    content.innerHTML = `
        <div class="modal-header">
            <h2 id="rankingModalTitle"></h2>
            <button class="modal-close" type="button" id="rankingModalClose">✕</button>
        </div>
        <div class="modal-body">
            <p class="ranking-hint" id="rankingHint"></p>
            <div class="ranking-head" id="rankingHead">
                <span></span>
                <span id="rankingColName"></span>
                <span id="rankingColActive"></span>
                <span id="rankingColTotal"></span>
            </div>
            <div id="rankingList" class="ranking-list"></div>
        </div>`;
    overlay.appendChild(content);
    return overlay;
}

function buildOverwriteModal() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'overwriteModal';
    overlay.addEventListener('click', (event) => {
        if (event.target === overlay) closeOverwriteModal();
    });
    const content = document.createElement('div');
    content.className = 'modal-content modal-account modal-overwrite';
    content.innerHTML = `
        <div class="modal-header">
            <h2 id="overwriteModalTitle"></h2>
            <button class="modal-close" type="button" id="overwriteModalClose">✕</button>
        </div>
        <div class="modal-body">
            <p class="ranking-hint" id="overwriteSummary"></p>
            <p class="ranking-hint" id="overwriteHint"></p>
            <div class="overwrite-toolbar">
                <input type="search" id="overwriteSearch" autocomplete="off">
                <button type="button" class="btn btn-view" id="overwriteDownload"></button>
            </div>
            <div id="overwriteList" class="overwrite-list"></div>
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
    const moderator = isModeratorUser(user);
    const title = document.getElementById('accountModalTitle');
    const warning = document.getElementById('accountSharedWarning');
    const adminSection = document.getElementById('accountAdminSection');
    const membersSection = document.getElementById('accountMembersSection');
    const moderatorHint = document.getElementById('accountModeratorHint');
    if (title) title.textContent = getTranslation(admin ? 'account_modal_title' : (moderator ? 'account_moderator_title' : 'account_password_title'));
    if (warning) {
        warning.textContent = admin ? getTranslation('account_shared_warning') : '';
        warning.style.display = admin ? 'block' : 'none';
    }
    if (adminSection) adminSection.style.display = admin ? 'flex' : 'none';
    if (membersSection) membersSection.style.display = (admin || moderator) ? 'flex' : 'none';
    if (moderatorHint) {
        moderatorHint.hidden = !moderator;
        moderatorHint.textContent = moderator ? getTranslation('account_moderator_hint') : '';
    }
    setText('accountCreateTitle', 'account_create_title');
    setText('accountListTitle', moderator ? 'account_moderator_list' : 'account_list_title');
    setText('accountPasswordTitle', 'account_password_title');
    setText('accountCreateBtn', 'account_create_button');
    setText('accountServersTitle', 'servers_title');
    setText('accountServersHint', 'servers_hint');
    setText('accountServerSave', 'servers_save');
    renderServerEditor();
    setText('accountPasswordBtn', 'btn_change_password');
    setPlaceholder('accountUsername', 'account_username');
    setPlaceholder('accountNome', 'account_name');
    setPlaceholder('accountPassword', 'account_password');
    setPlaceholder('accountNewPassword', 'account_new_password');
    setPlaceholder('accountSearch', 'account_search');
    document.querySelectorAll('[data-account-filter]').forEach((button) => {
        const filter = button.getAttribute('data-account-filter');
        const selected = filter === accountListFilter;
        button.classList.toggle('is-selected', selected);
        button.setAttribute('aria-pressed', selected ? 'true' : 'false');
    });
    const auditTitle = document.getElementById('auditModalTitle');
    if (auditTitle) auditTitle.textContent = getTranslation('audit_modal_title');
    setText('rankingModalTitle', 'ranking_modal_title');
    setText('rankingHint', 'ranking_hint');
    setText('rankingColName', 'ranking_col_name');
    setText('rankingColActive', 'ranking_col_active');
    setText('rankingColTotal', 'ranking_col_total');
    setText('overwriteModalTitle', 'overwrite_modal_title');
    setText('overwriteHint', 'overwrite_hint');
    setText('overwriteDownload', 'overwrite_download');
    setPlaceholder('overwriteSearch', 'overwrite_search');
    renderRegistrarRanking();
    renderOverwriteReport();
    renderUserList();
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
    if (!serverDraftDirty) serverDraft = null;
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
    if (!isAdminUser(firebase.auth().currentUser)) return;
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

function openRankingModal() {
    if (!isAdminUser(firebase.auth().currentUser)) return;
    ensureAccountModals();
    wireAccountModal();
    labelAccountModal();
    const modal = document.getElementById('rankingModal');
    modal.classList.add('active');
    modal.style.display = 'flex';
}

function closeRankingModal() {
    const modal = document.getElementById('rankingModal');
    if (!modal) return;
    modal.classList.remove('active');
    modal.style.display = 'none';
}

function openOverwriteModal() {
    if (!isAdminUser(firebase.auth().currentUser)) return;
    ensureAccountModals();
    wireAccountModal();
    labelAccountModal();
    const modal = document.getElementById('overwriteModal');
    modal.classList.add('active');
    modal.style.display = 'flex';
}

function closeOverwriteModal() {
    const modal = document.getElementById('overwriteModal');
    if (!modal) return;
    modal.classList.remove('active');
    modal.style.display = 'none';
}

function renderRegistrarRanking() {
    const list = document.getElementById('rankingList');
    const head = document.getElementById('rankingHead');
    if (!list || typeof getTranslation !== 'function') return;
    list.replaceChildren();
    if (!isAdminUser(firebase.auth().currentUser)) {
        if (head) head.hidden = true;
        return;
    }
    const rows = rankingBoard(typeof allTowers !== 'undefined' ? allTowers : [], auditEntries, profilesByUid);
    if (head) head.hidden = !rows.length;
    if (!rows.length) {
        const empty = document.createElement('p');
        empty.className = 'account-list-empty';
        empty.textContent = getTranslation('ranking_empty');
        list.appendChild(empty);
        return;
    }
    const top = rows[0].acumulado || 1;
    rows.forEach((row, index) => {
        const item = document.createElement('div');
        item.className = 'ranking-row';
        const place = document.createElement('span');
        place.className = 'ranking-place';
        place.textContent = String(index + 1);
        const nome = document.createElement('span');
        nome.className = 'ranking-name';
        nome.textContent = row.nome;
        nome.title = row.nome;
        const ativas = document.createElement('span');
        ativas.className = 'ranking-count';
        ativas.textContent = String(row.ativas);
        const acumulado = document.createElement('span');
        acumulado.className = 'ranking-count';
        acumulado.textContent = String(row.acumulado);
        const track = document.createElement('div');
        track.className = 'ranking-bar';
        const fill = document.createElement('span');
        fill.style.width = `${Math.max(8, Math.round((row.acumulado / top) * 100))}%`;
        track.appendChild(fill);
        item.append(place, nome, ativas, acumulado, track);
        list.appendChild(item);
    });
}

function visibleOverwriteRows() {
    const towers = typeof allTowers !== 'undefined' ? allTowers : [];
    const rows = overwriteReport(auditEntries, towers, profilesByUid);
    const query = String((document.getElementById('overwriteSearch') || {}).value || '').trim().toLowerCase();
    const visible = query ? rows.filter((row) => `${row.nome} ${row.mapa} ${row.servidor} ${row.autor}`.toLowerCase().includes(query)) : rows;
    return { rows: rows, visible: visible };
}

function renderOverwriteReport() {
    const list = document.getElementById('overwriteList');
    if (!list || typeof getTranslation !== 'function') return;
    list.replaceChildren();
    const summary = document.getElementById('overwriteSummary');
    if (!isAdminUser(firebase.auth().currentUser)) {
        if (summary) summary.textContent = '';
        return;
    }
    const report = visibleOverwriteRows();
    const towers = new Set(report.rows.map((row) => row.torreId || `${row.mapa}|${row.servidor}|${row.em}`));
    if (summary) {
        const total = getTranslation('overwrite_summary', { towers: towers.size, events: report.rows.length });
        summary.textContent = report.visible.length === report.rows.length ? total : `${total} · ${getTranslation('overwrite_shown', { shown: report.visible.length })}`;
    }
    const head = document.createElement('div');
    head.className = 'overwrite-row is-head';
    ['overwrite_col_when', 'overwrite_col_who', 'overwrite_col_map', 'overwrite_col_server', 'overwrite_col_old', 'overwrite_col_new', 'overwrite_col_status', 'overwrite_col_author'].forEach((key) => {
        const cell = document.createElement('span');
        cell.textContent = getTranslation(key);
        head.appendChild(cell);
    });
    list.appendChild(head);
    if (!report.visible.length) {
        const empty = document.createElement('p');
        empty.className = 'account-list-empty';
        empty.textContent = getTranslation(report.rows.length ? 'overwrite_filter_empty' : 'overwrite_empty');
        list.appendChild(empty);
        return;
    }
    report.visible.forEach((row) => {
        const item = document.createElement('div');
        item.className = 'overwrite-row';
        item.title = row.torreId;
        const when = document.createElement('span');
        when.textContent = typeof formatDateTime === 'function' ? formatDateTime(row.em) : row.em;
        const who = document.createElement('span');
        who.textContent = row.nome;
        const mapa = document.createElement('span');
        mapa.textContent = row.mapa;
        const servidor = document.createElement('span');
        servidor.textContent = row.servidor;
        const antigo = document.createElement('span');
        antigo.textContent = overwriteClock(row.horarioAnterior);
        const novo = document.createElement('span');
        novo.textContent = overwriteClock(row.horarioNovo);
        const status = document.createElement('span');
        status.textContent = getTranslation(row.ativa ? 'overwrite_active' : 'overwrite_closed');
        const autor = document.createElement('span');
        autor.textContent = row.autor || '—';
        item.append(when, who, mapa, servidor, antigo, novo, status, autor);
        list.appendChild(item);
    });
}

function downloadOverwriteReport() {
    if (!isAdminUser(firebase.auth().currentUser)) return;
    const report = overwriteReport(auditEntries, typeof allTowers !== 'undefined' ? allTowers : [], profilesByUid);
    const header = ['Quando', 'Quem sobrescreveu', 'Mapa', 'Servidor', 'Horário antigo', 'Horário novo', 'Situação', 'Autor do cadastro', 'Torre'];
    const lines = [header.map(csvCell).join(';')];
    report.forEach((row) => {
        lines.push([
            row.em,
            row.nome,
            row.mapa,
            row.servidor,
            row.horarioAnterior,
            row.horarioNovo,
            row.ativa ? 'Ativa' : 'Encerrada',
            row.autor,
            row.torreId
        ].map(csvCell).join(';'));
    });
    const blob = new Blob([`\uFEFF${lines.join('\n')}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'relatorio-sobrescritas.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

function overwriteClock(iso) {
    if (!iso) return '—';
    return typeof formatDateTime === 'function' ? formatDateTime(iso) : iso;
}

function csvCell(value) {
    const text = String(value == null ? '' : value);
    if (/[;"\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
    return text;
}

let accountModalWired = false;
let accountListFilter = 'all';
let serverDraft = null;
let serverDraftDirty = false;

function wireAccountModal() {
    if (accountModalWired) return;
    accountModalWired = true;
    document.getElementById('accountModalClose').addEventListener('click', closeAccountModal);
    document.getElementById('auditModalClose').addEventListener('click', closeAuditModal);
    document.getElementById('rankingModalClose').addEventListener('click', closeRankingModal);
    document.getElementById('overwriteModalClose').addEventListener('click', closeOverwriteModal);
    document.getElementById('overwriteDownload').addEventListener('click', downloadOverwriteReport);
    const overwriteSearch = document.getElementById('overwriteSearch');
    if (overwriteSearch) overwriteSearch.addEventListener('input', renderOverwriteReport);
    document.getElementById('accountCreateBtn').addEventListener('click', submitNewAccount);
    document.getElementById('accountPasswordBtn').addEventListener('click', submitPasswordChange);
    const search = document.getElementById('accountSearch');
    if (search) search.addEventListener('input', renderUserList);
    const filters = document.getElementById('accountFilters');
    if (filters) {
        filters.addEventListener('click', (event) => {
            const button = event.target.closest('[data-account-filter]');
            if (!button) return;
            accountListFilter = button.getAttribute('data-account-filter') || 'all';
            labelAccountModal();
            renderUserList();
        });
    }
    const serverList = document.getElementById('accountServerList');
    if (serverList) {
        serverList.addEventListener('change', (event) => {
            const input = event.target;
            if (!(input instanceof HTMLInputElement)) return;
            const id = input.getAttribute('data-server-id');
            if (!normalizeServerId(id)) return;
            const draft = currentServerDraft();
            const index = draft.findIndex((entry) => entry.id === id);
            if (input.hasAttribute('data-use-server')) {
                if (input.checked && index < 0) draft.push({ id: id, aleatorio: false });
                if (!input.checked && index >= 0) draft.splice(index, 1);
                draft.sort((a, b) => Number(a.id) - Number(b.id));
                serverDraftDirty = true;
                renderServerEditor();
                return;
            }
            if (input.hasAttribute('data-random-server') && index >= 0) {
                draft[index].aleatorio = input.checked;
                serverDraftDirty = true;
            }
        });
    }
    const saveServers = document.getElementById('accountServerSave');
    if (saveServers) saveServers.addEventListener('click', saveServerDraft);
}

function currentServerDraft() {
    if (serverDraft) return serverDraft;
    const numeros = (typeof SERVIDORES !== 'undefined' ? SERVIDORES : []).map(String);
    const aleatorios = typeof SERVIDORES_ALEATORIOS !== 'undefined' ? SERVIDORES_ALEATORIOS : [];
    serverDraft = typeof serverCatalogFromLists === 'function'
        ? serverCatalogFromLists(numeros, aleatorios)
        : numeros.map((id) => ({ id: id, aleatorio: aleatorios.map(String).includes(id) }));
    return serverDraft;
}

function renderServerEditor() {
    const list = document.getElementById('accountServerList');
    if (!list || typeof getTranslation !== 'function') return;
    const draft = currentServerDraft();
    list.replaceChildren();
    for (let number = 1; number <= 19; number += 1) {
        const id = String(number);
        const entry = draft.find((item) => item.id === id);
        const row = document.createElement('div');
        row.className = entry ? 'account-server-row is-on' : 'account-server-row is-off';

        const title = document.createElement('strong');
        title.textContent = id;

        const useLabel = document.createElement('label');
        useLabel.className = 'account-server-random';
        const use = document.createElement('input');
        use.type = 'checkbox';
        use.checked = !!entry;
        use.setAttribute('data-server-id', id);
        use.setAttribute('data-use-server', '');
        const useCaption = document.createElement('span');
        useCaption.textContent = getTranslation('servers_available');
        useLabel.append(use, useCaption);

        const randomLabel = document.createElement('label');
        randomLabel.className = 'account-server-random';
        const random = document.createElement('input');
        random.type = 'checkbox';
        random.checked = !!(entry && entry.aleatorio);
        random.disabled = !entry;
        random.setAttribute('data-server-id', id);
        random.setAttribute('data-random-server', '');
        const randomCaption = document.createElement('span');
        randomCaption.textContent = getTranslation('servers_random');
        randomLabel.append(random, randomCaption);

        row.append(title, useLabel, randomLabel);
        list.appendChild(row);
    }
}

async function saveServerDraft() {
    const button = document.getElementById('accountServerSave');
    if (!isAdminUser(firebase.auth().currentUser)) return;
    const draft = currentServerDraft();
    if (!draft.length) {
        showAccountMessage(getTranslation('servers_empty'), false);
        return;
    }
    const payload = {};
    draft.forEach((entry) => {
        payload[entry.id] = entry.aleatorio === true;
    });
    if (button) button.disabled = true;
    try {
        await database.ref('config/servidores').set(payload);
        serverDraftDirty = false;
        showAccountMessage(getTranslation('servers_saved'), true);
    } catch (error) {
        showAccountMessage(getTranslation('error_save_tower'), false);
    } finally {
        if (button) button.disabled = false;
    }
}

function renderUserList() {
    const list = document.getElementById('accountUserList');
    if (!list) return;
    list.replaceChildren();
    const current = firebase.auth().currentUser;
    if (!canApproveMembers(current)) return;
    const rows = accountListEntries(profilesByUid);
    const query = String((document.getElementById('accountSearch') || {}).value || '').trim().toLowerCase();
    const visible = rows.filter(([, profile]) => {
        const situacao = accountSituacao(profile);
        if (accountListFilter !== 'all' && situacao !== accountListFilter) return false;
        if (!query) return true;
        return `${profile.nome || ''} ${profile.username || ''}`.toLowerCase().includes(query);
    });
    const counts = { pendente: 0, ativo: 0, recusado: 0, bloqueado: 0 };
    rows.forEach(([, profile]) => {
        const situacao = accountSituacao(profile);
        if (counts[situacao] != null) counts[situacao] += 1;
    });
    const filterLabels = {
        all: 'account_filter_all',
        pendente: 'account_filter_pending',
        ativo: 'account_filter_active',
        bloqueado: 'account_filter_blocked',
        recusado: 'account_filter_refused'
    };
    document.querySelectorAll('[data-account-filter]').forEach((button) => {
        const filter = button.getAttribute('data-account-filter');
        const label = getTranslation(filterLabels[filter] || 'account_filter_all');
        button.textContent = filter === 'all' || counts[filter] == null ? label : `${label} (${counts[filter]})`;
    });
    const count = document.getElementById('accountListCount');
    if (count) {
        count.textContent = getTranslation('account_list_count', { shown: visible.length, total: rows.length });
    }
    if (!visible.length) {
        const empty = document.createElement('p');
        empty.className = 'account-list-empty';
        empty.textContent = getTranslation('account_list_empty');
        list.appendChild(empty);
        return;
    }
    let lastGroup = '';
    visible.forEach(([uid, profile]) => {
        const situacao = accountSituacao(profile);
        if (situacao !== lastGroup) {
            lastGroup = situacao;
            const heading = document.createElement('div');
            heading.className = situacao === 'bloqueado' ? 'account-group is-blocked' : 'account-group';
            const title = document.createElement('span');
            title.textContent = getTranslation(filterLabels[situacao] || 'account_filter_all');
            const total = document.createElement('span');
            total.textContent = String(visible.filter(([, item]) => accountSituacao(item) === situacao).length);
            heading.append(title, total);
            list.appendChild(heading);
            if (situacao === 'bloqueado') {
                const note = document.createElement('p');
                note.className = 'account-group-note';
                note.textContent = getTranslation('account_blocked_note');
                list.appendChild(note);
            }
        }
        const row = document.createElement('div');
        row.className = `account-row is-${situacao}`;
        const main = document.createElement('span');
        main.className = 'account-row-main';
        const name = document.createElement('span');
        name.className = 'account-row-name';
        const label = document.createElement('span');
        label.className = 'account-row-label';
        label.textContent = profile.nome || profile.username || '';
        label.title = `${profile.nome || ''} (${profile.username || ''})`;
        name.appendChild(label);
        if (current && current.uid === uid) {
            const you = document.createElement('span');
            you.className = 'account-you';
            you.textContent = getTranslation('account_you');
            name.appendChild(you);
        }
        const meta = document.createElement('span');
        meta.className = 'account-row-meta';
        const username = document.createElement('span');
        username.className = 'account-row-user';
        username.textContent = profile.username || '';
        const status = document.createElement('span');
        const statusKey = situacao === 'pendente' ? 'account_pending' : (situacao === 'recusado' ? 'account_refused' : (situacao === 'bloqueado' ? 'account_inactive' : 'account_active'));
        status.className = `account-status is-${situacao}`;
        status.textContent = getTranslation(statusKey);
        meta.append(username, status);
        if (profile.moderador === true && !isAdminEmail(profile.email)) {
            const badge = document.createElement('span');
            badge.className = 'account-status is-moderador';
            badge.textContent = getTranslation('account_moderator');
            meta.appendChild(badge);
        }
        main.append(name, meta);
        const actions = document.createElement('span');
        actions.className = 'account-row-actions';
        const admin = isAdminUser(current);
        const moderator = isModeratorUser(current);
        const self = !!(current && current.uid === uid);
        if (admin && !self && !isAdminEmail(profile.email) && (situacao === 'ativo' || profile.moderador === true)) {
            const modButton = document.createElement('button');
            modButton.type = 'button';
            modButton.className = 'btn-account';
            const enabling = profile.moderador !== true;
            modButton.textContent = getTranslation(enabling ? 'account_make_moderator' : 'account_remove_moderator');
            modButton.addEventListener('click', () => setUserModerator(uid, profile, enabling));
            actions.appendChild(modButton);
        }
        const addStatusButton = (actionKey, nextSituacao, tone) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = `btn-account ${tone}`;
            button.textContent = getTranslation(actionKey);
            button.disabled = self;
            button.addEventListener('click', () => setUserSituacao(uid, profile, nextSituacao));
            actions.appendChild(button);
        };
        if (situacao === 'pendente' && (admin || moderator)) {
            addStatusButton('account_approve', 'ativo', 'is-approve');
            addStatusButton('account_refuse', 'recusado', 'is-blocked');
        } else if (admin && situacao === 'ativo') {
            addStatusButton('account_block', 'bloqueado', 'is-blocked');
        } else if (admin && situacao === 'bloqueado') {
            addStatusButton('account_reactivate', 'ativo', 'is-quiet');
        } else if (admin && situacao === 'recusado') {
            addStatusButton('account_approve', 'ativo', 'is-quiet');
        }
        row.append(main, actions);
        list.appendChild(row);
    });
}

function renderAuditList() {
    const list = document.getElementById('auditList');
    if (!list || typeof getTranslation !== 'function') return;
    const recent = auditEntries.slice(0, 80);
    if (!recent.length) {
        list.textContent = getTranslation('audit_empty');
        return;
    }
    list.replaceChildren();
    recent.forEach((entry) => {
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
                situacao: 'ativo',
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

async function setUserSituacao(uid, profile, situacao) {
    const current = firebase.auth().currentUser;
    if (!profile || !current || current.uid === uid) return;
    if (situacao !== 'ativo' && situacao !== 'bloqueado' && situacao !== 'recusado') return;
    const currentSituacao = accountSituacao(profile);
    const reviewing = currentSituacao === 'pendente' && (situacao === 'ativo' || situacao === 'recusado');
    if (situacao === 'recusado' && currentSituacao !== 'pendente') return;
    if (!isAdminUser(current) && !(isModeratorUser(current) && reviewing)) return;
    try {
        await database.ref(`users/${uid}`).set(userRecord(profile, situacao));
        showAccountMessage(getTranslation(situacao === 'recusado' ? 'success_user_refused' : 'success_user_updated'), true);
    } catch (error) {
        showAccountMessage(getTranslation('error_save_tower'), false);
    }
}

async function setUserModerator(uid, profile, enabled) {
    const current = firebase.auth().currentUser;
    if (!isAdminUser(current) || !profile || !current || current.uid === uid) return;
    if (isAdminEmail(profile.email)) return;
    const situacao = accountSituacao(profile);
    if (enabled === true && situacao !== 'ativo') return;
    if (enabled !== true && profile.moderador !== true) return;
    try {
        await database.ref(`users/${uid}`).set(userRecord(profile, situacao, enabled === true));
        showAccountMessage(getTranslation('success_moderator_updated'), true);
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
