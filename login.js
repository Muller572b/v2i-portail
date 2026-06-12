// login.js
function handleLogin(event) {
    // 1. Empêche le rechargement de la page
    if (event) event.preventDefault(); 
    
    const username = document.getElementById('username').value.trim();
    // On passe le mot de passe en majuscules pour éviter les erreurs de saisie
    const password = document.getElementById('password').value.trim().toUpperCase(); 
    const errorBlock = document.getElementById('login-error');
    
    // On cache l'erreur à chaque nouvelle tentative
    errorBlock.classList.add('hidden');
    
    // 2. AJUSTEMENT DE VOTRE SÉCURITÉ DE TEST
    // REMPLACEZ "COSIUM2026" PAR LE MOT DE PASSE GÉNÉRAL DE VOTRE CHOIX
    // Si vous voulez temporairement laisser passer TOUS les mots de passe non vides, écrivez : if (password !== "")
    if (password === "COSIUM2026" || password === "V2I") {
        
        // On enregistre la session pour le "Gardien" d'accueil.html
        localStorage.setItem('v2i_authenticated', 'true');
        
        // Optionnel : Enregistre le numéro client si vous voulez personnaliser l'accueil
        localStorage.setItem('v2i_client_id', username); 
        
        // 3. Redirection fluide vers l'accueil
        window.location.href = 'accueil.html';
    } else {
        // Affiche proprement le message d'erreur rouge dans l'interface
        errorBlock.innerText = "Identifiant ou code Cosium incorrect.";
        errorBlock.classList.remove('hidden');
    }
}

// Permet de valider proprement avec la touche "Entrée" sans bégaiement du formulaire
document.getElementById('password').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        handleLogin(e);
    }
});
