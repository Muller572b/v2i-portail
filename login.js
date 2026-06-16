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
        "1": "DON", "2": "A36", "3": "LUP", "4": "BAB", "6": "LIS", "7": "A67",
        "9": "A40", "10": "BAA", "11": "BOR", "12": "AOS", "16": "BFO", "18": "ILE", "22": "O2C",
        "23": "COR", "24": "PAA", "25": "PLU", "28": "BOB", "29": "ROC", "31": "LAR",       
        "33": "CCA", "34": "COZ", "35": "OBP", "36": "CCB", "37": "CCF", "39": "OBR", "41": "CAO",
        "42": "FAA","43": "FCA", "44": "FAL", "46": "BAO", "47": "POB", "48": "BOF", "49": "O2B",
         "50": "ATS", "51": "OSM", "52": "OBB", "53": "ONA", "56": "OBS", "57": "OPM",
         "58": "OBV", "59": "ATB", "60": "KBO", "62": "OBO","99": "TEST99", "ADMIN": "COSIUM2026"
    };
    
    // 3. VÉRIFICATION DU COMPTE
    // On regarde si l'identifiant existe dans la liste ET si le mot de passe associé est le bon
    if (listeMagasins[username] !== undefined && listeMagasins[username] === password) {
        
        // On valide la session pour le "Gardien" d'accueil.html
        localStorage.setItem('v2i_authenticated', 'true');
        
        // On mémorise le numéro du magasin connecté pour pouvoir personnaliser l'accueil après
        localStorage.setItem('v2i_client_id', username); 
        
        // CORRECTION : Ajout de './' pour sécuriser le chemin relatif sur GitHub Pages
        window.location.href = './accueil.html';
    } else {
        // Si l'identifiant n'existe pas ou que le code est faux -> Message rouge
        errorBlock.innerText = "Identifiant ou code Cosium incorrect.";
        errorBlock.classList.remove('hidden');
    }
}
