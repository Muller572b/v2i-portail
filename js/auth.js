// js/auth.js
function handleLogin(event) {
    event.preventDefault();
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    const errorDiv = document.getElementById('login-error');

    // Ici, tu feras ta validation (via ton JSON ou ton API de test)
    if (user === "12345" && pass === "secret") { 
        localStorage.setItem('v2i_authenticated', 'true');
        localStorage.setItem('v2i_client_id', user);
        window.location.href = 'accueil.html'; // Redirection vers l'accueil
    } else {
        errorDiv.textContent = "Identifiants incorrects.";
        errorDiv.classList.remove('hidden');
    }
}

function logout() {
    localStorage.removeItem('v2i_authenticated');
    localStorage.removeItem('v2i_client_id');
    window.location.href = 'index.html';
}
