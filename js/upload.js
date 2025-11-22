// Upload functionality
// Note: For local testing with small videos (<10MB)
// Videos are uploaded to /videos folder via Node.js server

let selectedFile = null;

document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    checkAuth();
    
    const uploadArea = document.getElementById('uploadArea');
    const videoInput = document.getElementById('videoInput');
    const selectFileBtn = document.getElementById('selectFileBtn');
    const uploadPreview = document.getElementById('uploadPreview');
    const previewPlayer = document.getElementById('previewPlayer');
    const cancelBtn = document.getElementById('cancelBtn');
    const uploadBtn = document.getElementById('uploadBtn');
    
    // File selection
    selectFileBtn.addEventListener('click', () => {
        videoInput.click();
    });
    
    videoInput.addEventListener('change', handleFileSelect);
    
    // Drag and drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('drag-over');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            if (file.type.startsWith('video/')) {
                handleFile(file);
            } else {
                alert('请选择视频文件');
            }
        }
    });
    
    // Cancel button
    cancelBtn.addEventListener('click', resetUpload);
    
    // Upload button
    uploadBtn.addEventListener('click', uploadVideo);
});

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        handleFile(file);
    }
}

function handleFile(file) {
    // Check file size (10MB limit for local testing)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
        alert('文件大小超过10MB限制');
        return;
    }
    
    selectedFile = file;
    
    // Show preview
    const uploadArea = document.getElementById('uploadArea');
    const uploadPreview = document.getElementById('uploadPreview');
    const previewPlayer = document.getElementById('previewPlayer');
    
    uploadArea.style.display = 'none';
    uploadPreview.style.display = 'block';
    
    // Load video preview
    const reader = new FileReader();
    reader.onload = function(e) {
        previewPlayer.src = e.target.result;
    };
    reader.readAsDataURL(file);
    
    // Auto-fill title with filename
    const videoTitle = document.getElementById('videoTitle');
    videoTitle.value = file.name.replace(/\.[^/.]+$/, '');
}

function resetUpload() {
    selectedFile = null;
    document.getElementById('uploadArea').style.display = 'block';
    document.getElementById('uploadPreview').style.display = 'none';
    document.getElementById('videoInput').value = '';
    document.getElementById('videoTitle').value = '';
    document.getElementById('videoDescription').value = '';
    document.getElementById('videoCategory').value = 'entertainment';
    document.getElementById('videoVisibility').value = 'public';
}

function uploadVideo() {
    const title = document.getElementById('videoTitle').value.trim();
    const description = document.getElementById('videoDescription').value.trim();
    const category = document.getElementById('videoCategory').value;
    const visibility = document.getElementById('videoVisibility').value;
    
    if (!title) {
        alert('请输入视频标题');
        return;
    }
    
    if (!selectedFile) {
        alert('请选择视频文件');
        return;
    }
    
    // Show progress
    const uploadProgress = document.getElementById('uploadProgress');
    const uploadBtn = document.getElementById('uploadBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    
    uploadProgress.style.display = 'block';
    uploadBtn.disabled = true;
    cancelBtn.disabled = true;
    
    // Simulate upload progress
    simulateUpload(title, description, category, visibility);
}

function simulateUpload(title, description, category, visibility) {
    const progressFill = document.getElementById('progressFill');
    const progressPercent = document.getElementById('progressPercent');
    const progressText = document.getElementById('progressText');
    
    let progress = 0;
    const interval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress > 100) progress = 100;
        
        progressFill.style.width = progress + '%';
        progressPercent.textContent = Math.floor(progress) + '%';
        
        if (progress >= 100) {
            clearInterval(interval);
            progressText.textContent = '处理中...';
            
            setTimeout(() => {
                saveVideo(title, description, category, visibility);
            }, 1000);
        }
    }, 200);
}

async function saveVideo(title, description, category, visibility) {
    // Create video object
    const videoId = 'video_' + Date.now();
    const video = {
        id: videoId,
        title: title,
        description: description,
        category: category,
        visibility: visibility,
        filename: selectedFile.name,
        size: selectedFile.size,
        uploadDate: new Date().toISOString(),
        views: 0,
        duration: '00:00',
        thumbnail: ''
    };
    
    try {
        // For Cloudflare Pages: Store video in IndexedDB
        const reader = new FileReader();
        
        reader.onload = async function(e) {
            video.url = e.target.result;
            
            // Save video data and metadata to IndexedDB (avoid localStorage quota)
            try {
                const db = await openVideoDatabase();
                await saveToIndexedDB(db, videoId, e.target.result);
                
                // Save metadata separately in IndexedDB
                await saveVideoMetadata(db, video);
                
            } catch (dbError) {
                console.error('Storage error:', dbError);
                alert('存储空间不足或浏览器不支持。请尝试：\n1. 清理浏览器缓存\n2. 使用更小的视频文件');
                return;
            }
            
            // Generate shareable URL
            const shareUrl = `${window.location.origin}/player.html?id=${videoId}`;
            
            // Show success with share URL
            const message = `视频上传成功！

分享链接：
${shareUrl}

点击确定跳转到视频列表`;
            alert(message);
            
            // Copy URL to clipboard
            if (navigator.clipboard) {
                navigator.clipboard.writeText(shareUrl).catch(() => {});
            }
            
            window.location.href = 'dashboard.html';
        };
        
        reader.onerror = function() {
            alert('读取视频文件失败');
        };
        
        reader.readAsDataURL(selectedFile);
        
    } catch (error) {
        console.error('Upload error:', error);
        alert('上传失败: ' + error.message);
    }
}

// IndexedDB helper functions for Cloudflare Pages
function openVideoDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('VideoDatabase', 2);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            // Create videos store for video data
            if (!db.objectStoreNames.contains('videos')) {
                db.createObjectStore('videos', { keyPath: 'id' });
            }
            
            // Create metadata store for video metadata
            if (!db.objectStoreNames.contains('metadata')) {
                const metaStore = db.createObjectStore('metadata', { keyPath: 'id' });
                metaStore.createIndex('uploadDate', 'uploadDate', { unique: false });
            }
        };
    });
}

function saveToIndexedDB(db, videoId, videoData) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['videos'], 'readwrite');
        const store = transaction.objectStore('videos');
        const request = store.put({ id: videoId, data: videoData });
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

function saveVideoMetadata(db, video) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['metadata'], 'readwrite');
        const store = transaction.objectStore('metadata');
        const request = store.put(video);
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}
