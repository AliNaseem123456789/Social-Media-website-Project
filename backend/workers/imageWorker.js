// workers/imageWorker.js
import { parentPort, workerData } from 'worker_threads';
import sharp from 'sharp';
import supabase from '../supabaseClient.js';
import { supabaseAdmin } from '../supabaseAdmin.js';

// Get data from main thread
const { userId, imageBuffer, imageType, imageName } = workerData;

async function processImage() {
    try {
        console.log(`[Worker] Processing image for user ${userId}`);
        
        // 1. Process the image
        const image = sharp(imageBuffer);
        const metadata = await image.metadata();
        
        // 2. Resize profile image (300x300)
        const resizedBuffer = await image
            .resize(300, 300, {
                fit: 'cover',
                position: 'center'
            })
            .jpeg({ quality: 80 })  // Compress to JPEG
            .toBuffer();
        
        // 3. Generate thumbnail (100x100) - we'll use this but not save to DB
        const thumbnailBuffer = await sharp(imageBuffer)
            .resize(100, 100, {
                fit: 'cover',
                position: 'center'
            })
            .jpeg({ quality: 70 })
            .toBuffer();
        
        // 4. Upload to Supabase
        const fileName = `profile_${userId}.jpg`;
        const { data, error } = await supabaseAdmin.storage
            .from('avatars')
            .upload(fileName, resizedBuffer, {
                contentType: 'image/jpeg',
                upsert: false
            });
        
        if (error) throw error;
        
        // 5. Upload thumbnail (for cache/performance, but won't be saved to DB)
        const thumbName = `profile_${userId}_thumb_${Date.now()}.jpg`;
        await supabaseAdmin.storage
            .from('avatars')
            .upload(thumbName, thumbnailBuffer, {
                contentType: 'image/jpeg',
                upsert: false
            });
        
        // 6. Get public URLs
        const { data: { publicUrl: imageUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(fileName);
            
        const { data: { publicUrl: thumbUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(thumbName);
        
        // 7. Send success back to main thread
        parentPort.postMessage({
            success: true,
            data: {
                imageUrl,
                thumbUrl,  // This is returned but NOT saved to DB
                originalSize: imageBuffer.length,
                processedSize: resizedBuffer.length,
                metadata: {
                    width: metadata.width,
                    height: metadata.height,
                    size: resizedBuffer.length
                }
            }
        });
        
    } catch (error) {
        console.error('[Worker] Error processing image:', error);
        parentPort.postMessage({
            success: false,
            error: error.message
        });
    }
}

// Start processing
processImage();