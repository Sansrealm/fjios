import express from 'express';
import crypto from 'crypto';
import multer from 'multer';
import { getSession } from '../../middleware/auth.js';
import upload from '../../utils/upload.js';
import { uploadVideoBuffer, validateCloudinaryConfig } from '../../utils/cloudinary.js';

const router = express.Router();

const storage = multer.memoryStorage();
const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
});

const getTtlSeconds = () => {
  const configured = Number(process.env.UPLOADCARE_SIGNED_UPLOAD_TTL);
  if (Number.isFinite(configured) && configured > 0) {
    return configured;
  }
  return 10 * 60;
};

const buildSecureSignature = () => {
  const publicKey =
    process.env.UPLOADCARE_PUBLIC_KEY || process.env.EXPO_PUBLIC_UPLOADCARE_PUBLIC_KEY;
  const secretKey = process.env.UPLOADCARE_SECRET_KEY;

  if (!publicKey || !secretKey) {
    const missing = [];
    if (!publicKey) missing.push('UPLOADCARE_PUBLIC_KEY');
    if (!secretKey) missing.push('UPLOADCARE_SECRET_KEY');
    const error = new Error(
      `Missing Uploadcare env vars: ${missing.join(', ')}. Please set them on the server.`,
    );
    error.status = 500;
    throw error;
  }

  const secureExpire = Math.floor(Date.now() / 1000) + getTtlSeconds();
  const signaturePayload = `${secretKey}${secureExpire}`;
  const secureSignature = crypto.createHash('md5').update(signaturePayload).digest('hex');

  return {
    secureSignature,
    secureExpire,
  };
};

router.post('/presign', (req, res, next) => {
  try {
    const payload = buildSecureSignature();
    res.json(payload);
  } catch (error) {
    next(error);
  }
});

router.get('/public-key', (req, res) => {
  const publicKey =
    process.env.UPLOADCARE_PUBLIC_KEY || process.env.EXPO_PUBLIC_UPLOADCARE_PUBLIC_KEY;
  if (!publicKey) {
    return res.status(500).json({ error: 'Uploadcare not configured' });
  }
  return res.json({ publicKey });
});

// Diagnostic endpoint to check Cloudinary configuration
router.get('/cloudinary/status', async (req, res) => {
  try {
    const validation = await validateCloudinaryConfig();
    return res.json(validation);
  } catch (error) {
    return res.status(500).json({
      valid: false,
      error: error.message,
    });
  }
});

router.post(
  '/',
  (req, res, next) => {
    uploadMiddleware.single('file')(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res
            .status(413)
            .json({ error: 'File too large. Maximum supported size is 100MB.' });
        }
        const status = err.name === 'MulterError' ? 400 : 500;
        return res.status(status).json({ error: err.message || 'Upload failed' });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      const session = await getSession(req);
      if (!session?.user?.id) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (req.file) {
        const result = await upload({
          buffer: req.file.buffer,
          mimeType: req.file.mimetype,
          fileName: req.file.originalname,
        });
        console.log('[Upload] File stored', {
          userId: session.user.id,
          fileName: req.file.originalname,
          mimeType: req.file.mimetype,
          size: req.file.size,
          url: result.url,
        });
        return res.json({
          url: result.url,
          mimeType: result.mimeType || req.file.mimetype || null,
        });
      }

      if (req.body?.url) {
        const result = await upload({ url: req.body.url });
        console.log('[Upload] Remote asset stored', {
          userId: session.user.id,
          source: req.body.url,
          url: result.url,
          mimeType: result.mimeType || null,
        });
        return res.json({
          url: result.url,
          mimeType: result.mimeType || null,
        });
      }

      if (req.body?.base64) {
        const result = await upload({
          base64: req.body.base64,
          mimeType: req.body.mimeType,
          fileName: req.body.fileName,
        });
        console.log('[Upload] Base64 asset stored', {
          userId: session.user.id,
          mimeType: req.body.mimeType,
          fileName: req.body.fileName,
          url: result.url,
        });
        return res.json({
          url: result.url,
          mimeType: result.mimeType || req.body.mimeType || null,
        });
      }

      return res
        .status(400)
        .json({ error: "Invalid request. Provide 'file', 'url', or 'base64'." });
    } catch (error) {
      console.error('[Upload] error:', error);
      return res.status(error.status || 500).json({
        error: error.message || 'Upload failed',
      });
    }
  },
);

// Upload a video file directly to Cloudinary
router.post(
  '/video',
  (req, res, next) => {
    uploadMiddleware.single('video')(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res
            .status(413)
            .json({ error: 'File too large. Maximum supported size is 100MB.' });
        }
        const status = err.name === 'MulterError' ? 400 : 500;
        return res.status(status).json({ error: err.message || 'Upload failed' });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      const session = await getSession(req);
      if (!session?.user?.id) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (!req.file) {
        return res.status(400).json({ error: "Invalid request. Provide 'video' file field." });
      }

      // Validate file type
      const allowedMimeTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
      const mimeType = req.file.mimetype?.toLowerCase();
      if (mimeType && !allowedMimeTypes.some(type => mimeType.includes(type))) {
        console.warn('[Upload] Unsupported video format:', mimeType);
        // Still try to upload, but log warning
      }

      console.log('[Upload] Starting video upload to Cloudinary', {
        userId: session.user.id,
        fileName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
      });

      // Pre-upload validation: Check Cloudinary config before attempting upload
      // This helps catch credential issues early
      const configCheck = await validateCloudinaryConfig().catch(() => ({
        valid: false,
        issues: ['Unable to validate Cloudinary configuration'],
      }));
      
      if (!configCheck.valid) {
        console.error('[Upload] Cloudinary configuration check failed:', configCheck);
        return res.status(500).json({
          error: 'Cloudinary configuration error. Please check server logs.',
          details: configCheck.issues || ['Unknown configuration error'],
          retryable: false,
        });
      }

      const result = await uploadVideoBuffer({
        buffer: req.file.buffer,
        fileName: req.file.originalname,
        maxRetries: 3,
        initialDelay: 1000,
      });

      console.log('[Upload] Video stored in Cloudinary', {
        userId: session.user.id,
        fileName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        url: result.secure_url || result.url,
        publicId: result.public_id,
        duration: result.duration,
      });

      return res.json({
        url: result.secure_url || result.url,
        publicId: result.public_id,
        duration: result.duration,
        resourceType: result.resource_type,
        format: result.format,
      });
    } catch (error) {
      const status = error.status || error.http_code || 500;
      const errorMessage = error.message || 'Video upload failed';
      
      console.error('[Upload] Cloudinary video upload error:', {
        status,
        message: errorMessage,
        http_code: error.http_code,
        originalError: error.originalError?.message || error.message,
        userId: req.session?.user?.id || session?.user?.id,
        cloudinaryError: error.cloudinaryError || error.originalError,
        fileName: req.file?.originalname,
        fileSize: req.file?.size,
        mimeType: req.file?.mimetype,
      });

      // Provide more helpful error messages
      let userMessage = errorMessage;
      if (status === 403) {
        userMessage = 'Upload failed: Access denied. This may be due to rate limiting. Please try again in a moment.';
      } else if (status === 429) {
        userMessage = 'Upload failed: Too many requests. Please wait a moment and try again.';
      } else if (status >= 500) {
        userMessage = 'Upload failed: Server error. Please try again in a moment.';
      }

      return res.status(status).json({
        error: userMessage,
        retryable: status === 403 || status === 429 || (status >= 500 && status < 600),
      });
    }
  },
);

export default router;

