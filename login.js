// login.js
function handleLogin(event) {
    // 1. IMPORTANT : Empêche le formulaire de recharger la page login.html
    if (event) event.preventDefault(); 
    
    const password = document.getElementById('password').value;
    
    // 2. Logique de validation (Remplacez par votre vrai code secret)
    if (password === "votre-code-securise") {
        localStorage.setItem('v2i_authenticated', 'true');
        
        // 3. IMPORTANT : On redirige explicitement vers accueil.html
        window.location.href = 'accueil.html';
    } else {
        alert("Code accès incorrect !");
    }
}

// Permettre la touche "Entrée" pour valider
document.getElementById('password').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        handleLogin(e);
    }
});
