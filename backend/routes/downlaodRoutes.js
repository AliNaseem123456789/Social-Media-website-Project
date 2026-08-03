// routes/downloadRoutes.js
import express from 'express';
import {
  downloadAllImages,
  downloadBucketWithName,
  listAllImages,
  getBucketStats
} from '../controllers/downloads.controller.js';

const router = express.Router();

// PUBLIC ROUTES - No authentication required!

// Download all images as ZIP (streaming)
router.get('/public/download-all', downloadAllImages);

// Download with custom filename
router.get('/public/download/:filename', downloadBucketWithName);

// List all images in bucket
router.get('/public/list-images', listAllImages);

// Get bucket statistics
router.get('/public/bucket-stats', getBucketStats);

export default router;