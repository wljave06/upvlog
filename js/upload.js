// Upload functionality
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
    // Check file size (500MB limit)
    const maxSize = 500 * 1024 * 1024;
    if (file.size > maxSize) {
        alert('文件大小超过500MB限制');
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
        // Upload video file to server
        const formData = new FormData();
        formData.append('video', selectedFile);
        formData.append('videoId', videoId);
        formData.append('metadata', JSON.stringify(video));
        
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error('Upload failed: ' + response.statusText);
        }
        
        const result = await response.json();
        video.url = result.url; // Get uploaded video URL
        
        // Get existing videos
        const videos = JSON.parse(localStorage.getItem('videos') || '[]');
        videos.unshift(video);
        
        // Save metadata to localStorage
        localStorage.setItem('videos', JSON.stringify(videos));
        
        // Show success and redirect
        alert('视频上传成功！');
        window.location.href = 'dashboard.html';
        
    } catch (error) {
        console.error('Upload error:', error);
        
        // Fallback to localStorage for development
        const reader = new FileReader();
        reader.onload = function(e) {
            video.url = e.target.result;
            localStorage.setItem('video_' + video.id, e.target.result);
            
            const videos = JSON.parse(localStorage.getItem('videos') || '[]');
            videos.unshift(video);
            localStorage.setItem('videos', JSON.stringify(videos));
            
            alert('视频已保存到本地（开发模式）');
            window.location.href = 'dashboard.html';
        };
        reader.readAsDataURL(selectedFile);
    }
}
