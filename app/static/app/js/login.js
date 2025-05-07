document.addEventListener('DOMContentLoaded', function() {
    // Animer les champs du formulaire
    const formFields = document.querySelectorAll('.form-fields p');
    
    formFields.forEach((field, index) => {
        field.style.opacity = '0';
        field.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            field.style.transition = 'all 0.5s ease';
            field.style.opacity = '1';
            field.style.transform = 'translateY(0)';
        }, 100 * (index + 1));
    });
    
    // Animation bouton
    const loginBtn = document.querySelector('.btn-login');
    loginBtn.style.opacity = '0';
    
    setTimeout(() => {
        loginBtn.style.transition = 'all 0.5s ease';
        loginBtn.style.opacity = '1';
    }, 400);
    
    // Animation de feedback au clic du bouton
    const loginForm = document.getElementById('login-form');
    
    loginForm.addEventListener('submit', function(e) {
        const btn = document.querySelector('.btn-login');
        btn.innerHTML = '<span class="loading-text">Connexion en cours...</span>';
        btn.style.backgroundColor = '#3a5cbe';
    });
    
    // Effet focus sur les champs
    const inputFields = document.querySelectorAll('input[type="text"], input[type="password"], input[type="email"]');
    
    inputFields.forEach(input => {
        input.addEventListener('focus', function() {
            this.parentNode.classList.add('input-focused');
        });
        
        input.addEventListener('blur', function() {
            if (!this.value) {
                this.parentNode.classList.remove('input-focused');
            }
        });
    });
});