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
    
    // Upload to server for public access
    const formData = new FormData();
    formData.append('video', selectedFile);
    formData.append('videoId', videoId);
    formData.append('title', title);
    formData.append('description', description);
    
    try {
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const error = await response.text();
            throw new Error(error || 'Upload failed');
        }
        
        const result = await response.json();
        
        // Save metadata to IndexedDB with public URL
        video.url = result.videoUrl; // Relative path: /videos/xxx.mp4
        video.publicUrl = result.publicUrl; // Full public URL
        
        const db = await openVideoDatabase();
        await saveVideoMetadata(db, video);
        
        // Show success with public .mp4 URL
        const message = `视频上传成功！

公开访问地址（.mp4文件）：
${result.publicUrl}

点击确定跳转到视频列表`;
        alert(message);
        
        // Copy URL to clipboard
        if (navigator.clipboard) {
            navigator.clipboard.writeText(result.publicUrl).catch(() => {});
        }
        
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 500);
        
    } catch (error) {
        console.error('Upload error:', error);
        alert('上传失败: ' + error.message + '\n\n请确保：\n1. 本地运行: npm start\n2. 或在Cloudflare Pages配置Functions');
        
        // Reset UI
        const uploadBtn = document.getElementById('uploadBtn');
        const cancelBtn = document.getElementById('cancelBtn');
        uploadBtn.disabled = false;
        cancelBtn.disabled = false;
        document.getElementById('uploadProgress').style.display = 'none';
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
