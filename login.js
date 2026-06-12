// login.js
function handleLogin(event) {
    // 1. Empêche le rechargement de la page
    if (event) event.preventDefault(); 
    
    const username = document.getElementById('username').value.trim();
    // On passe le mot de passe en majuscules pour éviter les erreurs de minuscules/majuscules
    const password = document.getElementById('password').value.trim().toUpperCase(); 
    const errorBlock = document.getElementById('login-error');
    
    // On cache l'erreur à chaque nouvelle tentative
    errorBlock.classList.add('hidden');
    
    // 2. RÉPERTOIRE DES COMPTES MAGASINS
    // Structure : "N° Client": "CODE COSIUM"
    const listeMagasins = {
        "1": "DON",
        "2": "A36",
        "3": "LUP",
        "4": "BAB",
        "6": "LIS",
        "7": "A67",
        "9": "A40",
        "10": "BAA",
        "12": "AOS",
        "16": "BFO",
        "18": "ILE",
        "22": "O2C",
        "23": "COR",
        "24": "PAA",
        "25": "PLU",
        "28": "BOB",
        "29": "ROC",
        "31": "LAR",       // Mettez ici le vrai code Cosium du magasin 16
        "33": "33",       // Mettez ici le vrai code Cosium du magasin 18
        "99": "TEST99",      // Magasin de test
        "ADMIN": "COSIUM2026" // Votre pass général pour vos démos
    };
    
    // 3. VÉRIFICATION DU COMPTE
    // On regarde si l'identifiant existe dans la liste ET si le mot de passe associé est le bon
    if (listeMagasins[username] !== undefined && listeMagasins[username] === password) {
        
        // On valide la session pour le "Gardien" d'accueil.html
        localStorage.setItem('v2i_authenticated', 'true');
        
        // On mémorise le numéro du magasin connecté pour pouvoir personnaliser l'accueil après
        localStorage.setItem('v2i_client_id', username); 
        
        // Redirection vers la page d'accueil
        window.location.href = 'accueil.html';
    } else {
        // Si l'identifiant n'existe pas ou que le code est faux -> Message rouge
        errorBlock.innerText = "Identifiant ou code Cosium incorrect.";
        errorBlock.classList.remove('hidden');
    }
}

// Permet de valider avec la touche "Entrée"
document.getElementById('password').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        handleLogin(e);
    }
});
