// Dashboard functionality
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    const user = checkAuth();
    
    // Load videos from IndexedDB
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

async function loadVideos() {
    try {
        // First try to load from cloud (KV)
        const cloudResponse = await fetch('/api/videos');
        if (cloudResponse.ok) {
            const data = await cloudResponse.json();
            const videos = data.videos || [];
            
            // Sync to IndexedDB for offline access
            try {
                const db = await openVideoDatabase();
                for (const video of videos) {
                    await saveVideoMetadata(db, video);
                }
            } catch (dbError) {
                console.error('IndexedDB sync error:', dbError);
            }
            
            renderVideos(videos);
            return;
        }
    } catch (error) {
        console.error('Cloud load error:', error);
    }
    
    // Fallback to IndexedDB if cloud fails
    try {
        const db = await openVideoDatabase();
        const videos = await getAllVideos(db);
        renderVideos(videos);
    } catch (error) {
        console.error('Error loading videos:', error);
        // Final fallback to localStorage
        loadVideosFromLocalStorage();
    }
}

function renderVideos(videos) {
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
                <div class="video-card">
                    <div class="video-thumbnail" onclick="playVideo('${video.id}')" style="cursor: pointer; position: relative;">
                        <img src="${video.thumbnail || 'https://via.placeholder.com/320x180/6366f1/ffffff?text=Video'}" alt="${video.title}" 
                            onerror="this.src='https://via.placeholder.com/320x180/6366f1/ffffff?text=Video'">
                        <span class="video-duration">${video.duration || '00:00'}</span>
                        <button onclick="deleteVideo(event, '${video.id}')" 
                            style="position: absolute; top: 8px; right: 8px; width: 32px; height: 32px; background: rgba(239, 68, 68, 0.9); color: white; border: none; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 18px; z-index: 10;"
                            onmouseover="this.style.background='rgba(220, 38, 38, 1)'" 
                            onmouseout="this.style.background='rgba(239, 68, 68, 0.9)'" 
                            title="删除视频">
                            ×
                        </button>
                    </div>
                    <div class="video-card-info">
                        <h3 class="video-card-title" onclick="playVideo('${video.id}')" style="cursor: pointer;">${video.title}</h3>
                        <div class="video-card-meta">
                            <span>${video.views || 0} 次播放</span>
                            <span>${formatDate(video.uploadDate)}</span>
                        </div>
                        ${video.publicUrl ? `
                        <div class="video-public-url" style="margin-top: 8px; padding: 8px; background: #f3f4f6; border-radius: 6px;">
                            <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                                <input type="text" value="${video.publicUrl}" readonly 
                                    style="flex: 1; padding: 6px 8px; border: 1px solid #e5e7eb; border-radius: 4px; font-size: 12px; background: white;"
                                    onclick="this.select()">
                                <button onclick="copyUrl(event, '${video.publicUrl}')" 
                                    style="padding: 6px 12px; background: #6366f1; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; white-space: nowrap;"
                                    onmouseover="this.style.background='#4f46e5'" 
                                    onmouseout="this.style.background='#6366f1'">
                                    复制链接
                                </button>
                            </div>
                        </div>
                        ` : ''}
                    </div>
                </div>
            `).join('');
        }
}

function loadVideosFromLocalStorage() {
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
            <div class="video-card">
                <div class="video-thumbnail" onclick="playVideo('${video.id}')" style="cursor: pointer; position: relative;">
                    <img src="${video.thumbnail || 'https://via.placeholder.com/320x180/6366f1/ffffff?text=Video'}" alt="${video.title}"
                        onerror="this.src='https://via.placeholder.com/320x180/6366f1/ffffff?text=Video'">
                    <span class="video-duration">${video.duration || '00:00'}</span>
                    <button onclick="deleteVideo(event, '${video.id}')" 
                        style="position: absolute; top: 8px; right: 8px; width: 32px; height: 32px; background: rgba(239, 68, 68, 0.9); color: white; border: none; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 18px; z-index: 10;"
                        onmouseover="this.style.background='rgba(220, 38, 38, 1)'" 
                        onmouseout="this.style.background='rgba(239, 68, 68, 0.9)'" 
                        title="删除视频">
                        ×
                    </button>
                </div>
                <div class="video-card-info">
                    <h3 class="video-card-title" onclick="playVideo('${video.id}')" style="cursor: pointer;">${video.title}</h3>
                    <div class="video-card-meta">
                        <span>${video.views || 0} 次播放</span>
                        <span>${formatDate(video.uploadDate)}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }
}

async function updateStats() {
    try {
        const db = await openVideoDatabase();
        const videos = await getAllVideos(db);
        
        // Total videos
        document.getElementById('totalVideos').textContent = videos.length;
        
        // Total views
        const totalViews = videos.reduce((sum, video) => sum + (video.views || 0), 0);
        document.getElementById('totalViews').textContent = totalViews.toLocaleString();
        
        // Total storage (approximate)
        const totalStorage = videos.reduce((sum, video) => sum + (video.size || 0), 0);
        document.getElementById('totalStorage').textContent = formatFileSize(totalStorage);
    } catch (error) {
        console.error('Error updating stats:', error);
        // Fallback to localStorage
        const videos = JSON.parse(localStorage.getItem('videos') || '[]');
        document.getElementById('totalVideos').textContent = videos.length;
        const totalViews = videos.reduce((sum, video) => sum + (video.views || 0), 0);
        document.getElementById('totalViews').textContent = totalViews.toLocaleString();
        const totalStorage = videos.reduce((sum, video) => sum + (video.size || 0), 0);
        document.getElementById('totalStorage').textContent = formatFileSize(totalStorage);
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

function formatFileSize(bytes) {
    if (bytes === 0) return '0 MB';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

// IndexedDB helper functions
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

function getAllVideos(db) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['metadata'], 'readonly');
        const store = transaction.objectStore('metadata');
        const request = store.getAll();
        
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
    });
}

function saveVideoMetadata(db, video) {
    return new Promise((resolve, reject) => {
        try {
            const transaction = db.transaction(['metadata'], 'readwrite');
            const store = transaction.objectStore('metadata');
            const request = store.put(video);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        } catch (error) {
            resolve(); // Ignore errors if store doesn't exist
        }
    });
}

// Copy URL to clipboard
function copyUrl(event, url) {
    event.stopPropagation(); // Prevent triggering video play
    
    if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(() => {
            // Show success feedback
            const btn = event.target;
            const originalText = btn.textContent;
            btn.textContent = '✓ 已复制';
            btn.style.background = '#10b981';
            
            setTimeout(() => {
                btn.textContent = originalText;
                btn.style.background = '#6366f1';
            }, 2000);
        }).catch(err => {
            alert('复制失败，请手动复制：\n' + url);
        });
    } else {
        // Fallback for older browsers
        alert('链接地址：\n' + url);
    }
}

// Delete video
async function deleteVideo(event, videoId) {
    event.stopPropagation(); // Prevent triggering video play
    
    if (!confirm('确定要删除这个视频吗？此操作无法撤销！')) {
        return;
    }
    
    try {
        // Delete from cloud (KV + R2)
        try {
            const response = await fetch(`/api/videos?id=${videoId}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                console.error('Cloud delete failed');
            }
        } catch (cloudError) {
            console.error('Cloud delete error:', cloudError);
        }
        
        // Also delete from local IndexedDB
        const db = await openVideoDatabase();
        
        // Delete from metadata store
        await deleteFromStore(db, 'metadata', videoId);
        
        // Delete from videos store (IndexedDB stored videos)
        await deleteFromStore(db, 'videos', videoId);
        
        // Reload the page to refresh the video list
        alert('视频已删除！');
        location.reload();
        
    } catch (error) {
        console.error('Delete error:', error);
        alert('删除失败：' + error.message);
    }
}

function deleteFromStore(db, storeName, id) {
    return new Promise((resolve, reject) => {
        try {
            const transaction = db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.delete(id);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        } catch (error) {
            // Store might not exist, that's okay
            resolve();
        }
    });
}
