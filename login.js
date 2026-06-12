// login.js
function handleLogin(event) {
    if (event) event.preventDefault(); // Empêche le formulaire de rafraîchir la page
    
    const password = document.getElementById('password').value;
    const username = document.getElementById('username').value;
    
    // Remplacez "votre-code-securise" par votre vrai code
    if (password === "votre-code-securise") {
        localStorage.setItem('v2i_authenticated', 'true');
        // Redirection vers la page d'accueil réelle
        window.location.href = 'index.html';
    } else {
        // Affichage de l'erreur dans le HTML
        const errorEl = document.getElementById('login-error');
        errorEl.textContent = "Identifiant ou code incorrect";
        errorEl.classList.remove('hidden');
    }
}
