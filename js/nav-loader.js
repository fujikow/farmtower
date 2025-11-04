// ARQUIVO: /js/nav-loader.js

document.addEventListener("DOMContentLoaded", () => {
    
    // Pega o título da página atual (ex: "Calculadora Custo-Benefício")
    const pageTitle = document.title; 

    const headerPlaceholder = document.getElementById("header-placeholder");
    
    if (headerPlaceholder) {
        // Busca o conteúdo do arquivo header.html (que está na raiz)
        fetch("header.html")
            .then(response => {
                if (!response.ok) {
                    throw new Error("Erro ao carregar o cabeçalho.");
                }
                return response.text();
            })
            .then(data => {
                // 1. Insere o HTML do cabeçalho no local
                headerPlaceholder.innerHTML = data;
                
                // 2. Procura o elemento <h2> que acabamos de inserir
                const titleElement = document.getElementById("page-title");
                
                // 3. Se encontrou o elemento e a página tem um título, insere o título
                if (titleElement && pageTitle) {
                    titleElement.textContent = pageTitle;
                }
            })
            .catch(error => {
                console.error(error);
                headerPlaceholder.innerHTML = "<p style='color:red; text-align:center;'>Erro ao carregar o menu de navegação.</p>";
            });
    }
});