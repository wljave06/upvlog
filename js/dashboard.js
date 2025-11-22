// Dashboard functionality
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    const user = checkAuth();
    
    // Load videos from localStorage
    loadVideos();
    
    // Update stats
    updateStats();
    
    // View toggle
    const viewBtns = document.querySelectorAll('.view-btn');
    viewBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            viewBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            const view = this.dataset.view;
            const videoGrid = document.getElementById('videoGrid');
            
            if (view === 'list') {
                videoGrid.style.gridTemplateColumns = '1fr';
            } else {
                videoGrid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(280px, 1fr))';
            }
        });
    });
});

function loadVideos() {
    const videos = JSON.parse(localStorage.getItem('videos') || '[]');
    const videoGrid = document.getElementById('videoGrid');
    
    if (videos.length === 0) {
        videoGrid.innerHTML = `
            <div class="empty-state">
                <svg width="100" height="100" fill="none" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" stroke="#e5e7eb" stroke-width="2"/>
                    <path d="M40 35L65 50L40 65V35Z" fill="#9ca3af"/>
                </svg>
                <h3>还没有视频</h3>
                <p>点击上传按钮开始上传您的第一个视频</p>
                <a href="upload.html" class="btn btn-primary">立即上传</a>
            </div>
        `;
    } else {
        videoGrid.innerHTML = videos.map(video => `
            <div class="video-card" onclick="playVideo('${video.id}')">
                <div class="video-thumbnail">
                    <img src="${video.thumbnail || 'https://via.placeholder.com/320x180/6366f1/ffffff?text=Video'}" alt="${video.title}">
                    <span class="video-duration">${video.duration || '00:00'}</span>
                </div>
                <div class="video-card-info">
                    <h3 class="video-card-title">${video.title}</h3>
                    <div class="video-card-meta">
                        <span>${video.views || 0} 次播放</span>
                        <span>${formatDate(video.uploadDate)}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }
}

function updateStats() {
    const videos = JSON.parse(localStorage.getItem('videos') || '[]');
    
    // Total videos
    document.getElementById('totalVideos').textContent = videos.length;
    
    // Total views
    const totalViews = videos.reduce((sum, video) => sum + (video.views || 0), 0);
    document.getElementById('totalViews').textContent = totalViews.toLocaleString();
    
    // Total storage (approximate)
    const totalStorage = videos.reduce((sum, video) => sum + (video.size || 0), 0);
    document.getElementById('totalStorage').textContent = formatFileSize(totalStorage);
}

function playVideo(videoId) {
    window.location.href = `player.html?id=${videoId}`;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return '今天';
    if (days === 1) return '昨天';
    if (days < 7) return `${days}天前`;
    if (days < 30) return `${Math.floor(days / 7)}周前`;
    if (days < 365) return `${Math.floor(days / 30)}个月前`;
    return `${Math.floor(days / 365)}年前`;
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 MB';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
