// Objeto global para armazenar as traduções carregadas
let translations = {};

// Função para definir o idioma
async function setLanguage(lang) {
    // Salva a escolha do usuário no localStorage
    localStorage.setItem('lang', lang);
    await loadTranslations(lang);
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
function translatePage() {
    // Traduz elementos com 'data-i18n-key'
    document.querySelectorAll('[data-i18n-key]').forEach(element => {
        const key = element.getAttribute('data-i18n-key');
        const translation = translations[key];
        
        if (translation) {
            // Verifica se deve traduzir o placeholder ou o texto interno
            if (element.tagName === 'INPUT' && element.placeholder) {
                element.placeholder = translation;
            } else {
                element.innerHTML = translation;
            }
        }
    });

    // (Opcional) Atualiza o atributo lang da tag <html>
    document.documentElement.lang = localStorage.getItem('lang') || 'pt';
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
        
        if (['pt', 'en', 'es'].includes(browserLang)) {
            currentLang = browserLang;
        } else {
            currentLang = 'pt'; // Padrão
        }
    }
    
    setLanguage(currentLang);
});