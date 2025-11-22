export async function onRequestPost(context) {
    try {
        const formData = await context.request.formData();
        const videoFile = formData.get('video');
        const videoId = formData.get('videoId');
        const title = formData.get('title');
        
        if (!videoFile || !videoId) {
            return new Response(JSON.stringify({ error: 'Missing required fields' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        // Check file size (10MB limit)
        const maxSize = 10 * 1024 * 1024;
        if (videoFile.size > maxSize) {
            return new Response(JSON.stringify({ error: 'File size exceeds 10MB limit' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        // Get R2 bucket from environment
        const R2 = context.env.VLOG_VIDEOS;
        if (!R2) {
            return new Response(JSON.stringify({ error: 'R2 bucket not configured' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        // Generate filename
        const filename = `${videoId}.mp4`;
        
        // Upload to R2
        await R2.put(filename, videoFile.stream(), {
            httpMetadata: {
                contentType: videoFile.type || 'video/mp4'
            },
            customMetadata: {
                title: title || 'Untitled',
                uploadDate: new Date().toISOString()
            }
        });
        
        // Generate public URL (you need to configure R2 public domain)
        const publicDomain = context.env.R2_PUBLIC_DOMAIN || 'https://pub-your-r2-domain.r2.dev';
        const publicUrl = `${publicDomain}/${filename}`;
        const videoUrl = `/videos/${filename}`;
        
        return new Response(JSON.stringify({
            success: true,
            videoId: videoId,
            videoUrl: videoUrl,
            publicUrl: publicUrl,
            filename: filename
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
        
    } catch (error) {
        console.error('Upload error:', error);
        return new Response(JSON.stringify({ 
            error: 'Upload failed: ' + error.message 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
