// Player functionality
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    checkAuth();
    
    // Get video ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    const videoId = urlParams.get('id');
    
    if (videoId) {
        loadVideo(videoId);
    } else {
        document.getElementById('videoTitle').textContent = '未找到视频';
        document.getElementById('videoDescription').textContent = '请从视频列表中选择要播放的视频。';
    }
    
    // Load related videos
    loadRelatedVideos(videoId);
});

function loadVideo(videoId) {
    const videos = JSON.parse(localStorage.getItem('videos') || '[]');
    const video = videos.find(v => v.id === videoId);
    
    if (!video) {
        document.getElementById('videoTitle').textContent = '未找到视频';
        document.getElementById('videoDescription').textContent = '请从视频列表中选择要播放的视频。';
        return;
    }
    
    // Update video info
    document.getElementById('videoTitle').textContent = video.title;
    document.getElementById('videoDescription').textContent = video.description || '暂无描述';
    document.getElementById('videoViews').textContent = (video.views || 0) + ' 次播放';
    document.getElementById('videoDate').textContent = formatDate(video.uploadDate);
    
    // Load video source
    const mainPlayer = document.getElementById('mainPlayer');
    
    // Try to load from server first
    if (video.url) {
        mainPlayer.src = video.url;
    } else {
        // Fallback to localStorage
        const videoData = localStorage.getItem('video_' + videoId);
        if (videoData) {
            mainPlayer.src = videoData;
        } else {
            // Try to fetch from server
            mainPlayer.src = `/videos/${video.filename}`;
        }
    }
    
    // Update view count
    video.views = (video.views || 0) + 1;
    const videoIndex = videos.findIndex(v => v.id === videoId);
    videos[videoIndex] = video;
    localStorage.setItem('videos', JSON.stringify(videos));
    
    // Update view display
    document.getElementById('videoViews').textContent = video.views + ' 次播放';
}

function loadRelatedVideos(currentVideoId) {
    const videos = JSON.parse(localStorage.getItem('videos') || '[]');
    const relatedVideos = videos.filter(v => v.id !== currentVideoId).slice(0, 10);
    
    const relatedContainer = document.getElementById('relatedVideos');
    
    if (relatedVideos.length === 0) {
        relatedContainer.innerHTML = `
            <div class="empty-state-small">
                <p>暂无相关视频</p>
            </div>
        `;
    } else {
        relatedContainer.innerHTML = relatedVideos.map(video => `
            <div class="related-video" onclick="playVideo('${video.id}')">
                <div class="related-thumbnail">
                    <img src="${video.thumbnail || 'https://via.placeholder.com/120x68/6366f1/ffffff?text=Video'}" alt="${video.title}">
                </div>
                <div class="related-info">
                    <h4>${video.title}</h4>
                    <p>${video.views || 0} 次播放 · ${formatDate(video.uploadDate)}</p>
                </div>
            </div>
        `).join('');
    }
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
