// login.js
function handleLogin() {
    const password = document.getElementById('password').value;
    
    // Logique de validation
    if (password === "votre-code-securise") {
        localStorage.setItem('v2i_authenticated', 'true');
        window.location.href = 'index.html';
    } else {
        alert("Code accès incorrect !");
    }
}

// Optionnel : permettre la touche "Entrée" pour valider
document.getElementById('password').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') handleLogin();
});
