import express from 'express';
import crypto from 'crypto';
import multer from 'multer';
import { getSession } from '../../middleware/auth.js';
import upload from '../../utils/upload.js';

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

export default router;

