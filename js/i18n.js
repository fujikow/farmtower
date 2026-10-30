// Objeto global para armazenar as traduções carregadas
let translations = {};
const SUPPORTED_LANGS = ['pt', 'en', 'es', 'vi'];

// Função para definir o idioma
async function setLanguage(lang) {
    const nextLang = SUPPORTED_LANGS.includes(lang) ? lang : 'pt';
    // Salva a escolha do usuário no localStorage
    localStorage.setItem('lang', nextLang);
    await loadTranslations(nextLang);
}

// Função para carregar o arquivo JSON de tradução
async function loadTranslations(lang) {
    try {
        const response = await fetch(`lang/${lang}.json`);
        if (!response.ok) {
            console.error(`Não foi possível carregar o arquivo de idioma: ${lang}.json`);
            return;
        }
        translations = await response.json();
        translatePage();
    } catch (error) {
        console.error('Erro ao carregar traduções:', error);
    }
}

// Função para aplicar as traduções na página
function markSelectedLanguage(lang) {
    document.querySelectorAll('.language-switcher [data-lang]').forEach((button) => {
        const selected = button.getAttribute('data-lang') === lang;
        button.classList.toggle('is-selected', selected);
        button.setAttribute('aria-pressed', selected ? 'true' : 'false');
    });
}

function translatePage() {
    const offset = typeof getWindowsClockOffsetLabel === 'function' ? getWindowsClockOffsetLabel() : '';
    // Traduz elementos com 'data-i18n-key'
    document.querySelectorAll('[data-i18n-key]').forEach(element => {
        const key = element.getAttribute('data-i18n-key');
        const translation = getTranslation(key, { offset: offset });
        
        if (translation && translation !== key) {
            // Verifica se deve traduzir o placeholder ou o texto interno
            if (element.tagName === 'INPUT' && element.placeholder) {
                element.placeholder = translation;
            } else {
                element.innerHTML = translation;
            }
        }
    });

    // (Opcional) Atualiza o atributo lang da tag <html>
    const lang = localStorage.getItem('lang') || 'pt';
    document.documentElement.lang = lang;
    markSelectedLanguage(lang);
    localizeSelectPrompt('mapa', 'form_map_placeholder');
    localizeSelectPrompt('servidor', 'form_server_placeholder');
    localizeSelectPrompt('filterMapa', 'filter_all');
    localizeSelectPrompt('filterServidor', 'filter_all');
    localizeSelectPrompt('filterMissingMapa', 'filter_all');
    localizeSelectPrompt('filterMissingServidor', 'filter_all');
    if (typeof updateSchedulePreview === 'function') updateSchedulePreview();
    if (typeof renderWindowsClock === 'function') renderWindowsClock();
}

function localizeSelectPrompt(id, key) {
    const select = document.getElementById(id);
    if (!select) return;
    const empty = [...select.options].find((option) => option.value === '');
    if (empty) empty.textContent = getTranslation(key);
}

// Função para obter a tradução de uma chave (para usar em outros scripts JS)
// Ex: getTranslation('error_all_fields')
function getTranslation(key, replacements = {}) {
    let translation = translations[key] || key;
    
    // Substitui placeholders (ex: {mapa} e {servidor})
    for (const placeholder in replacements) {
        translation = translation.replace(`{${placeholder}}`, replacements[placeholder]);
    }
    
    return translation;
}

// Inicialização: Tenta carregar o idioma salvo ou detecta o idioma do navegador
document.addEventListener('DOMContentLoaded', () => {
    let currentLang = localStorage.getItem('lang');
    
    if (!currentLang) {
        // Detecta o idioma do navegador
        let browserLang = navigator.language || navigator.userLanguage;
        browserLang = browserLang.split('-')[0]; // Pega 'pt' de 'pt-BR'
        
        if (SUPPORTED_LANGS.includes(browserLang)) {
            currentLang = browserLang;
        } else {
            currentLang = 'pt'; // Padrão
        }
    }

    if (!SUPPORTED_LANGS.includes(currentLang)) {
        currentLang = 'pt';
    }
    
    setLanguage(currentLang);
});