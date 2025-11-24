// API for managing video metadata
// Stores metadata in Cloudflare KV for persistence across devices

export async function onRequestGet(context) {
    try {
        const KV = context.env.VIDEO_METADATA;
        if (!KV) {
            return new Response(JSON.stringify({ error: 'KV namespace not configured' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        // Get all video IDs from KV
        const list = await KV.list();
        const videos = [];
        
        for (const key of list.keys) {
            const metadata = await KV.get(key.name, 'json');
            if (metadata) {
                videos.push(metadata);
            }
        }
        
        // Sort by upload date (newest first)
        videos.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
        
        return new Response(JSON.stringify({ videos }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Get videos error:', error);
        return new Response(JSON.stringify({ error: 'Failed to get videos' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

export async function onRequestPost(context) {
    try {
        const KV = context.env.VIDEO_METADATA;
        if (!KV) {
            return new Response(JSON.stringify({ error: 'KV namespace not configured' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        const video = await context.request.json();
        
        if (!video.id) {
            return new Response(JSON.stringify({ error: 'Video ID is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        // Save metadata to KV
        await KV.put(video.id, JSON.stringify(video));
        
        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Save video error:', error);
        return new Response(JSON.stringify({ error: 'Failed to save video metadata' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

export async function onRequestDelete(context) {
    try {
        const KV = context.env.VIDEO_METADATA;
        const R2 = context.env.VLOG_VIDEOS;
        
        if (!KV || !R2) {
            return new Response(JSON.stringify({ error: 'Storage not configured' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        const url = new URL(context.request.url);
        const videoId = url.searchParams.get('id');
        
        if (!videoId) {
            return new Response(JSON.stringify({ error: 'Video ID is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        // Delete from KV
        await KV.delete(videoId);
        
        // Delete from R2
        const filename = `${videoId}.mp4`;
        await R2.delete(filename);
        
        return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Delete video error:', error);
        return new Response(JSON.stringify({ error: 'Failed to delete video' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
