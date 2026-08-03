// controllers/downloads.controller.js
import archiver from 'archiver';
import supabase from '../supabaseClient.js';

/**
 * PUBLIC API: Download entire bucket as ZIP
 * GET /api/public/download-bucket
 * 
 * No authentication required - completely public endpoint
 * Perfect for testing streaming with chunked encoding
 */
export const downloadAllImages = async (req, res) => {
  console.log('🚀 Public bucket download started...');
  const startTime = Date.now();

  try {
    // 1. List ALL files from avatars bucket
    const { data: files, error: listError } = await supabase
      .storage
      .from('avatars')
      .list('', { 
        limit: 10000 // Get as many as possible
      });

    if (listError) {
      console.error(' List error:', listError);
      return res.status(500).json({ 
        success: false, 
        error: listError.message 
      });
    }

    // Filter out folders and get only image files
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
    const imageFiles = files.filter(f => {
      // Check if it has metadata (not a folder)
      if (!f.metadata?.size > 0) return false;
      // Check if it's an image
      const ext = f.name.toLowerCase().substring(f.name.lastIndexOf('.'));
      return imageExtensions.includes(ext) || f.metadata?.mimetype?.startsWith('image/');
    });
    
    if (imageFiles.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'No images found in bucket' 
      });
    }

    console.log(`📁 Found ${imageFiles.length} images in bucket`);

    // 2. Set headers for streaming download
    const timestamp = Date.now();
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="images_backup_${timestamp}.zip"`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // 3. Create archiver instance
    const archive = archiver('zip', {
      zlib: { level: 6 } // Balanced compression
    });

    // 4. Pipe archive to response - THIS ENABLES CHUNKED ENCODING
    archive.pipe(res);

    // 5. Handle archive events for monitoring
    let processedCount = 0;
    let failedCount = 0;
    let totalBytes = 0;

    archive.on('entry', (entry) => {
      processedCount++;
      totalBytes += entry.stats?.size || 0;
      console.log(`📦 Archived: ${entry.name} (${processedCount}/${imageFiles.length})`);
    });

    archive.on('warning', (err) => {
      if (err.code === 'ENOENT') {
        console.warn('⚠️ Warning:', err.message);
      } else {
        throw err;
      }
    });

    archive.on('error', (err) => {
      console.error('❌ Archive error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Archive creation failed' });
      }
      res.end();
    });

    // 6. Stream each image from Supabase into the ZIP
    for (const file of imageFiles) {
      try {
        // Get public URL (completely public, no auth required!)
        const { data: publicUrlData } = supabase
          .storage
          .from('avatars')
          .getPublicUrl(file.name);

        if (!publicUrlData?.publicUrl) {
          console.warn(`⚠️ No public URL for: ${file.name}`);
          failedCount++;
          continue;
        }

        // Fetch the image as a stream
        const response = await fetch(publicUrlData.publicUrl);
        
        if (!response.ok) {
          console.warn(`⚠️ Failed to fetch ${file.name}: ${response.status}`);
          failedCount++;
          continue;
        }

        // Add to ZIP with original filename
        archive.append(response.body, { 
          name: file.name,
          date: file.created_at ? new Date(file.created_at) : new Date()
        });

      } catch (err) {
        console.error(`❌ Error processing ${file.name}:`, err.message);
        failedCount++;
        // Continue with next file
      }
    }

    // 7. Finalize the archive (this writes the ZIP central directory)
    await archive.finalize();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ Download complete!`);
    console.log(`   - Images archived: ${processedCount}`);
    console.log(`   - Failed: ${failedCount}`);
    console.log(`   - Total size: ${(totalBytes / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   - Duration: ${duration}s`);
    console.log(`   - Transfer-Encoding: chunked (automatically applied)`);

  } catch (err) {
    console.error('🔥 Fatal error:', err);
    if (!res.headersSent) {
      res.status(500).json({ 
        success: false, 
        error: err.message 
      });
    }
    res.end();
  }
};

/**
 * PUBLIC API: Download bucket as ZIP with custom filename
 * GET /api/public/download-bucket/:filename
 */
export const downloadBucketWithName = async (req, res) => {
  try {
    const { filename } = req.params;
    const safeFilename = filename.replace(/[^a-zA-Z0-9-_]/g, '_') || 'backup';
    
    // Same logic as downloadAllImages but with custom filename
    const { data: files, error: listError } = await supabase
      .storage
      .from('avatars')
      .list('', { limit: 10000 });

    if (listError) {
      return res.status(500).json({ success: false, error: listError.message });
    }

    const imageFiles = files.filter(f => f.metadata?.size > 0);
    
    if (imageFiles.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'No images found in bucket' 
      });
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}_${Date.now()}.zip"`);
    res.setHeader('Cache-Control', 'no-cache');

    const archive = archiver('zip', { zlib: { level: 6 } });
    archive.pipe(res);

    for (const file of imageFiles) {
      try {
        const { data: publicUrlData } = supabase
          .storage
          .from('avatars')
          .getPublicUrl(file.name);

        if (publicUrlData?.publicUrl) {
          const response = await fetch(publicUrlData.publicUrl);
          if (response.ok) {
            archive.append(response.body, { name: file.name });
          }
        }
      } catch (err) {
        console.error(`Error processing ${file.name}:`, err.message);
      }
    }

    await archive.finalize();

  } catch (err) {
    console.error('Download error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
    res.end();
  }
};

/**
 * PUBLIC API: List all images in bucket
 * GET /api/public/list-images
 */
export const listAllImages = async (req, res) => {
  try {
    const { data: files, error } = await supabase
      .storage
      .from('avatars')
      .list('', { limit: 1000 });

    if (error) throw error;

    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
    const imageFiles = files.filter(f => {
      if (!f.metadata?.size > 0) return false;
      const ext = f.name.toLowerCase().substring(f.name.lastIndexOf('.'));
      return imageExtensions.includes(ext) || f.metadata?.mimetype?.startsWith('image/');
    });

    res.json({
      success: true,
      totalImages: imageFiles.length,
      totalSize: imageFiles.reduce((acc, f) => acc + (f.metadata?.size || 0), 0),
      images: imageFiles.map(f => ({
        name: f.name,
        size: f.metadata?.size || 0,
        created: f.created_at,
        url: supabase.storage.from('avatars').getPublicUrl(f.name).data.publicUrl
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * PUBLIC API: Get bucket statistics
 * GET /api/public/bucket-stats
 */
export const getBucketStats = async (req, res) => {
  try {
    const { data: files, error } = await supabase
      .storage
      .from('avatars')
      .list('', { limit: 10000 });

    if (error) throw error;

    const imageFiles = files.filter(f => f.metadata?.size > 0);
    const totalSize = imageFiles.reduce((acc, f) => acc + (f.metadata?.size || 0), 0);

    res.json({
      success: true,
      stats: {
        totalFiles: files.length,
        imageCount: imageFiles.length,
        totalSize: totalSize,
        totalSizeFormatted: formatBytes(totalSize),
        lastModified: files[0]?.created_at || null
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Helper function
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}