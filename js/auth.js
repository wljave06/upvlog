// Authentication handling
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const remember = document.getElementById('remember').checked;
            
            // Validate credentials
            if (username === 'admin' && password === 'muen778@') {
                // Store user session
                const user = {
                    username: username,
                    loginTime: new Date().toISOString(),
                    remember: remember
                };
                
                if (remember) {
                    localStorage.setItem('user', JSON.stringify(user));
                } else {
                    sessionStorage.setItem('user', JSON.stringify(user));
                }
                
                // Redirect to dashboard
                window.location.href = 'dashboard.html';
            } else if (!username || !password) {
                alert('请输入用户名和密码');
            } else {
                alert('用户名或密码错误！\n正确账号: admin\n正确密码: muen778@');
            }
        });
    }
});

// Check authentication
function checkAuth() {
    const user = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (!user && window.location.pathname !== '/index.html' && !window.location.pathname.endsWith('/')) {
        window.location.href = 'index.html';
    }
    return user ? JSON.parse(user) : null;
}

// Logout function
function logout() {
    localStorage.removeItem('user');
    sessionStorage.removeItem('user');
    window.location.href = 'index.html';
}

// Add logout button listeners
document.addEventListener('DOMContentLoaded', function() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
    }
});
