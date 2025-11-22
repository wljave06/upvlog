// Cloudflare Pages Function to serve videos from R2
export async function onRequestGet(context) {
    try {
        const filename = context.params.filename;
        
        if (!context.env.VIDEO_BUCKET) {
            return new Response('Video storage not configured', { status: 500 });
        }
        
        // Get the video from R2
        const object = await context.env.VIDEO_BUCKET.get(filename);
        
        if (!object) {
            return new Response('Video not found', { status: 404 });
        }
        
        // Set appropriate headers for video streaming
        const headers = new Headers();
        object.writeHttpMetadata(headers);
        headers.set('etag', object.httpEtag);
        headers.set('Cache-Control', 'public, max-age=31536000');
        
        // Support range requests for video seeking
        const range = context.request.headers.get('Range');
        if (range) {
            const parts = range.replace(/bytes=/, '').split('-');
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : object.size - 1;
            const chunksize = (end - start) + 1;
            
            headers.set('Content-Range', `bytes ${start}-${end}/${object.size}`);
            headers.set('Accept-Ranges', 'bytes');
            headers.set('Content-Length', chunksize.toString());
            
            const stream = object.body;
            return new Response(stream, {
                status: 206,
                headers
            });
        }
        
        return new Response(object.body, {
            headers
        });
        
    } catch (error) {
        console.error('Error serving video:', error);
        return new Response('Error serving video', { status: 500 });
    }
}
