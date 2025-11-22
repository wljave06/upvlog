// Simple Node.js server for local development with file upload support
// Saves videos to /videos folder (max 10MB per file)
const http = require('http');
const fs = require('fs');
const path = require('path');
const formidable = require('formidable');

const PORT = 8000;
const VIDEOS_DIR = path.join(__dirname, 'videos');

// Create videos directory if it doesn't exist
if (!fs.existsSync(VIDEOS_DIR)) {
    fs.mkdirSync(VIDEOS_DIR, { recursive: true });
}

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.ogg': 'video/ogg',
    '.mov': 'video/quicktime',
    '.avi': 'video/x-msvideo',
    '.mkv': 'video/x-matroska'
};

const server = http.createServer((req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Handle file upload
    if (req.url === '/api/upload' && req.method === 'POST') {
        const form = formidable({
            uploadDir: VIDEOS_DIR,
            keepExtensions: true,
            maxFileSize: 10 * 1024 * 1024 // 10MB for local testing
        });

        form.parse(req, (err, fields, files) => {
            if (err) {
                console.error('Upload error:', err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Upload failed', message: err.message }));
                return;
            }

            const videoFile = files.video;
            if (!videoFile) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'No video file provided' }));
                return;
            }

            // Handle both array and string for videoId
            const videoId = Array.isArray(fields.videoId) ? fields.videoId[0] : fields.videoId;
            
            // Handle both array and object for video file
            const videoFileObj = Array.isArray(videoFile) ? videoFile[0] : videoFile;
            const oldPath = videoFileObj.filepath;
            const extension = path.extname(videoFileObj.originalFilename || videoFileObj.name);
            const newFilename = `${videoId}${extension}`;
            const newPath = path.join(VIDEOS_DIR, newFilename);

            // Move file to proper location
            fs.rename(oldPath, newPath, (err) => {
                if (err) {
                    console.error('File move error:', err);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Failed to save file', message: err.message }));
                    return;
                }

                // Return full public URL
                const publicUrl = `http://localhost:${PORT}/videos/${newFilename}`;
                console.log(`✅ Video uploaded: ${newFilename}`);
                console.log(`📺 Public URL: ${publicUrl}`);
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    url: `/videos/${newFilename}`,
                    publicUrl: publicUrl,
                    filename: newFilename,
                    message: 'Upload successful'
                }));
            });
        });
        return;
    }

    // Serve static files
    let filePath = '.' + req.url;
    if (filePath === './') {
        filePath = './index.html';
    }

    const extname = String(path.extname(filePath)).toLowerCase();
    const contentType = MIME_TYPES[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404 - File Not Found</h1>', 'utf-8');
            } else {
                res.writeHead(500);
                res.end('Server Error: ' + error.code);
            }
        } else {
            // Support range requests for video streaming
            if (extname === '.mp4' || extname === '.webm' || extname === '.ogg' || extname === '.mov' || extname === '.avi' || extname === '.mkv') {
                const range = req.headers.range;
                if (range) {
                    const parts = range.replace(/bytes=/, '').split('-');
                    const start = parseInt(parts[0], 10);
                    const fileSize = content.length;
                    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
                    const chunksize = (end - start) + 1;
                    const chunk = content.slice(start, end + 1);

                    res.writeHead(206, {
                        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                        'Accept-Ranges': 'bytes',
                        'Content-Length': chunksize,
                        'Content-Type': contentType
                    });
                    res.end(chunk);
                    return;
                }
            }

            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log(`\n🚀 Server running at http://localhost:${PORT}/`);
    console.log(`📁 Videos will be saved to: ${VIDEOS_DIR}`);
    console.log(`\n📝 Quick start:`);
    console.log(`   1. Open http://localhost:${PORT}/start.html`);
    console.log(`   2. Login with any username/password`);
    console.log(`   3. Upload videos - they will be saved to the videos folder\n`);
});
