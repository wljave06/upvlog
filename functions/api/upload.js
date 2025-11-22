// Cloudflare Pages Function for handling video uploads
export async function onRequestPost(context) {
    try {
        const formData = await context.request.formData();
        const videoFile = formData.get('video');
        const videoId = formData.get('videoId');
        const metadata = JSON.parse(formData.get('metadata'));
        
        if (!videoFile) {
            return new Response(JSON.stringify({ error: 'No video file provided' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        // Get file extension
        const filename = videoFile.name;
        const extension = filename.substring(filename.lastIndexOf('.'));
        const savedFilename = `${videoId}${extension}`;
        
        // For Cloudflare Pages, we need to use R2 or KV for storage
        // If R2 is configured:
        if (context.env.VIDEO_BUCKET) {
            // Upload to Cloudflare R2
            const arrayBuffer = await videoFile.arrayBuffer();
            await context.env.VIDEO_BUCKET.put(savedFilename, arrayBuffer, {
                httpMetadata: {
                    contentType: videoFile.type,
                },
                customMetadata: {
                    originalName: filename,
                    uploadDate: metadata.uploadDate,
                    title: metadata.title
                }
            });
            
            // Return the URL to access the video
            const videoUrl = `/videos/${savedFilename}`;
            
            return new Response(JSON.stringify({ 
                success: true,
                url: videoUrl,
                filename: savedFilename
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } else {
            // Fallback: Save to local development (won't work on Cloudflare Pages)
            // This is just for local testing with Wrangler
            return new Response(JSON.stringify({ 
                error: 'R2 bucket not configured. Please set up VIDEO_BUCKET binding.',
                message: 'For local development, the upload will fallback to localStorage'
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
    } catch (error) {
        console.error('Upload error:', error);
        return new Response(JSON.stringify({ 
            error: 'Upload failed',
            message: error.message 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
