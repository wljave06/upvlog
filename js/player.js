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

async function loadVideo(videoId) {
    try {
        let video = null;
        
        // First try to load from cloud (KV)
        try {
            const cloudResponse = await fetch('/api/videos');
            if (cloudResponse.ok) {
                const data = await cloudResponse.json();
                const videos = data.videos || [];
                video = videos.find(v => v.id === videoId);
            }
        } catch (cloudError) {
            console.error('Cloud load error:', cloudError);
        }
        
        // Fallback to IndexedDB if cloud fails
        if (!video) {
            const db = await openVideoDatabase();
            video = await getVideoMetadata(db, videoId);
        }
        
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
        
        // Priority: publicUrl (direct .mp4) > url (relative path) > IndexedDB
        if (video.publicUrl) {
            // Use public .mp4 URL directly
            mainPlayer.src = video.publicUrl;
        } else if (video.url && video.url.startsWith('/videos/')) {
            // Use relative path for server-stored videos
            mainPlayer.src = video.url;
        } else {
            // Fallback to IndexedDB for old videos
            const db = await openVideoDatabase();
            const videoData = await loadVideoData(db, videoId);
            if (videoData) {
                mainPlayer.src = videoData;
            } else if (video.url) {
                mainPlayer.src = video.url;
            } else {
                mainPlayer.innerHTML = '<p style="color: white; padding: 20px;">视频文件未找到</p>';
                return;
            }
        }
        
        // Update view count
        video.views = (video.views || 0) + 1;
        
        // Save to cloud (KV)
        try {
            await fetch('/api/videos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(video)
            });
        } catch (kvError) {
            console.error('KV update error:', kvError);
        }
        
        // Also update IndexedDB
        try {
            const db = await openVideoDatabase();
            await updateVideoMetadata(db, video);
        } catch (dbError) {
            console.error('IndexedDB update error:', dbError);
        }
        
        // Update view display
        document.getElementById('videoViews').textContent = video.views + ' 次播放';
    } catch (error) {
        console.error('Error loading video:', error);
        document.getElementById('videoTitle').textContent = '加载视频失败';
        document.getElementById('videoDescription').textContent = '请检查浏览器存储权限或网络连接';
    }
}

// Load video data from IndexedDB
async function loadVideoData(db, videoId) {
    try {
        const transaction = db.transaction(['videos'], 'readonly');
        const store = transaction.objectStore('videos');
        const request = store.get(videoId);
        
        return new Promise((resolve) => {
            request.onsuccess = () => {
                if (request.result) {
                    resolve(request.result.data);
                } else {
                    resolve(null);
                }
            };
            request.onerror = () => resolve(null);
        });
    } catch (error) {
        return null;
    }
}

function getVideoMetadata(db, videoId) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['metadata'], 'readonly');
        const store = transaction.objectStore('metadata');
        const request = store.get(videoId);
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

function updateVideoMetadata(db, video) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['metadata'], 'readwrite');
        const store = transaction.objectStore('metadata');
        const request = store.put(video);
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// IndexedDB helper
function openVideoDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('VideoDatabase', 2);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('videos')) {
                db.createObjectStore('videos', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('metadata')) {
                const metaStore = db.createObjectStore('metadata', { keyPath: 'id' });
                metaStore.createIndex('uploadDate', 'uploadDate', { unique: false });
            }
        };
    });
}

async function loadRelatedVideos(currentVideoId) {
    let videos = [];
    
    // Try to load from cloud first
    try {
        const cloudResponse = await fetch('/api/videos');
        if (cloudResponse.ok) {
            const data = await cloudResponse.json();
            videos = data.videos || [];
        }
    } catch (error) {
        console.error('Cloud load error:', error);
    }
    
    // Fallback to IndexedDB
    if (videos.length === 0) {
        try {
            const db = await openVideoDatabase();
            const transaction = db.transaction(['metadata'], 'readonly');
            const store = transaction.objectStore('metadata');
            const request = store.getAll();
            
            videos = await new Promise((resolve) => {
                request.onsuccess = () => resolve(request.result || []);
                request.onerror = () => resolve([]);
            });
        } catch (error) {
            console.error('IndexedDB load error:', error);
        }
    }
    
    // Filter and display related videos
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
