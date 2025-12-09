import { v2 as cloudinary } from 'cloudinary';

const {
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
  CLOUDINARY_FOLDER,
  CLOUDINARY_UPLOAD_TIMEOUT,
} = process.env;

// Default timeout: 10 minutes (600000ms) for video uploads
// Can be overridden with CLOUDINARY_UPLOAD_TIMEOUT environment variable (in milliseconds)
const DEFAULT_UPLOAD_TIMEOUT = 600000;
const getUploadTimeout = () => {
  const configured = Number(CLOUDINARY_UPLOAD_TIMEOUT);
  if (Number.isFinite(configured) && configured > 0) {
    return configured;
  }
  return DEFAULT_UPLOAD_TIMEOUT;
};

if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
  console.warn(
    '[Cloudinary] Missing Cloudinary configuration. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.',
  );
} else {
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
  });
}

const getVideoFolder = () => {
  if (CLOUDINARY_FOLDER) return CLOUDINARY_FOLDER;
  return 'networkzz/videos';
};

/**
 * Sleep utility for retry delays
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Check if an error is retryable (403, 429, 500, 502, 503, 504)
 */
const isRetryableError = (error) => {
  if (!error) return false;
  
  // Check HTTP status code
  const status = error.http_code || error.status || error.statusCode;
  if (status) {
    // Retry on: 403 (Forbidden - might be rate limit), 429 (Too Many Requests), 5xx errors
    return status === 403 || status === 429 || (status >= 500 && status < 600);
  }
  
  // Check error message for common retryable errors
  const message = error.message || String(error);
  const retryableMessages = [
    'rate limit',
    'too many requests',
    'timeout',
    'network',
    'connection',
    'ECONNRESET',
    'ETIMEDOUT',
  ];
  
  return retryableMessages.some((msg) => 
    message.toLowerCase().includes(msg.toLowerCase())
  );
};

/**
 * Upload video buffer to Cloudinary with retry logic
 * @param {Object} params - Upload parameters
 * @param {Buffer} params.buffer - Video buffer to upload
 * @param {string} params.fileName - Optional file name
 * @param {number} params.maxRetries - Maximum number of retries (default: 3)
 * @param {number} params.initialDelay - Initial delay in ms (default: 1000)
 * @returns {Promise<Object>} Cloudinary upload result
 */
export const uploadVideoBuffer = async ({ 
  buffer, 
  fileName,
  maxRetries = 3,
  initialDelay = 1000,
}) => {
  if (!buffer) {
    throw new Error('No video buffer provided.');
  }

  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    const error = new Error(
      'Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.',
    );
    error.status = 500;
    throw error;
  }

  const folder = getVideoFolder();
  let lastError;
  let attempt = 0;

  // Log upload attempt details for debugging
  console.log('[Cloudinary] Starting video upload:', {
    fileName: fileName || 'unnamed',
    bufferSize: buffer.length,
    folder,
    cloudName: CLOUDINARY_CLOUD_NAME ? `${CLOUDINARY_CLOUD_NAME.substring(0, 3)}***` : 'NOT SET',
    hasCredentials: !!(CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET),
  });

  while (attempt <= maxRetries) {
    try {
      // Build upload options with better error handling
      const uploadTimeout = getUploadTimeout();
      const uploadOptions = {
        resource_type: 'video',
        folder,
        timeout: uploadTimeout, // Configurable timeout (default: 10 minutes)
        chunk_size: 6000000, // 6MB chunks for better reliability
        eager: [], // No eager transformations
        eager_async: false,
      };

      // Add public_id only if fileName is provided and valid
      if (fileName) {
        // Clean filename - remove extension and sanitize
        const cleanName = fileName
          .replace(/\.[^/.]+$/, '') // Remove extension
          .replace(/[^a-zA-Z0-9_-]/g, '_') // Replace invalid chars
          .substring(0, 100); // Limit length
        if (cleanName) {
          uploadOptions.public_id = cleanName;
        }
      }

      // Log upload options (without sensitive data)
      console.log('[Cloudinary] Upload options:', {
        resource_type: uploadOptions.resource_type,
        folder: uploadOptions.folder,
        hasPublicId: !!uploadOptions.public_id,
        timeout: uploadOptions.timeout,
        chunk_size: uploadOptions.chunk_size,
      });

      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          uploadOptions,
          (error, result) => {
            if (error) {
              // Capture full error details
              const errorInfo = {
                http_code: error.http_code,
                status: error.status,
                statusCode: error.statusCode,
                message: error.message,
                name: error.name,
                ...(error.http_code && { http_code: error.http_code }),
              };
              console.error('[Cloudinary] Upload stream error:', errorInfo);
              return reject(error);
            }
            resolve(result);
          },
        );

        // Handle stream errors
        uploadStream.on('error', (streamError) => {
          console.error('[Cloudinary] Stream error:', {
            message: streamError.message,
            code: streamError.code,
          });
        });

        uploadStream.end(buffer);
      });

      // Success - return result
      if (attempt > 0) {
        console.log(`[Cloudinary] Upload succeeded after ${attempt} retry(ies)`);
      }
      return result;
    } catch (error) {
      lastError = error;
      const status = error.http_code || error.status || error.statusCode;
      
      // Enhanced error logging for 403 errors
      const errorDetails = {
        status,
        http_code: error.http_code,
        message: error.message,
        name: error.name,
        ...(error.http_code === 403 && {
          // Common 403 causes from Cloudinary
          possibleCauses: [
            'Invalid API credentials (check CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET)',
            'Account storage/bandwidth quota exceeded',
            'Rate limiting (too many requests)',
            'Account restrictions (free tier limitations)',
            'Invalid cloud_name',
          ],
          cloudName: CLOUDINARY_CLOUD_NAME ? `${CLOUDINARY_CLOUD_NAME.substring(0, 3)}***` : 'NOT SET',
          hasApiKey: !!CLOUDINARY_API_KEY,
          hasApiSecret: !!CLOUDINARY_API_SECRET,
        }),
      };
      
      console.error(`[Cloudinary] Upload attempt ${attempt + 1} failed:`, errorDetails);
      
      // Log full error object for debugging
      try {
        const fullErrorInfo = {
          message: error.message,
          http_code: error.http_code,
          status: error.status,
          statusCode: error.statusCode,
          name: error.name,
          code: error.code,
          errno: error.errno,
          syscall: error.syscall,
          ...(error.response && {
            response_status: error.response.status,
            response_statusText: error.response.statusText,
          }),
        };
        
        // Log all error properties
        console.error('[Cloudinary] Full error details:', fullErrorInfo);
        
        // Log error stack in development
        if (process.env.NODE_ENV === 'development' && error.stack) {
          console.error('[Cloudinary] Error stack:', error.stack);
        }
      } catch (e) {
        console.error('[Cloudinary] Error logging failed:', e.message);
      }

      // If this is the last attempt or error is not retryable, throw
      if (attempt >= maxRetries || !isRetryableError(error)) {
        // Enhance error with better message for 403
        if (status === 403) {
          let detailedMessage = 'Upload failed: Access denied by Cloudinary. ';
          
          // Check for specific Cloudinary error messages
          const errorMsg = (error.message || '').toLowerCase();
          if (errorMsg.includes('invalid') || errorMsg.includes('authentication')) {
            detailedMessage += 'This appears to be an authentication issue. Please verify your Cloudinary API credentials (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET) are correct.';
          } else if (errorMsg.includes('quota') || errorMsg.includes('limit')) {
            detailedMessage += 'Your Cloudinary account may have exceeded storage or bandwidth limits. Please check your Cloudinary dashboard.';
          } else if (errorMsg.includes('rate')) {
            detailedMessage += 'Rate limit exceeded. Please wait a moment and try again.';
          } else {
            detailedMessage += 'This may be due to rate limiting, account restrictions, or invalid credentials. Please check your Cloudinary account settings.';
          }
          
          const enhancedError = new Error(detailedMessage);
          enhancedError.status = 403;
          enhancedError.http_code = 403;
          enhancedError.originalError = error;
          enhancedError.cloudinaryError = errorDetails;
          throw enhancedError;
        }
        throw error;
      }

      // Calculate exponential backoff delay
      const delay = initialDelay * Math.pow(2, attempt);
      console.log(`[Cloudinary] Retrying upload in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
      
      await sleep(delay);
      attempt++;
    }
  }

  // Should never reach here, but just in case
  throw lastError || new Error('Upload failed after retries');
};

/**
 * Validate Cloudinary configuration and test connection
 * This helps diagnose 403 errors
 */
export const validateCloudinaryConfig = async () => {
  const issues = [];
  const warnings = [];
  
  // Check required environment variables
  if (!CLOUDINARY_CLOUD_NAME) {
    issues.push('CLOUDINARY_CLOUD_NAME is not set');
  } else if (CLOUDINARY_CLOUD_NAME.trim() !== CLOUDINARY_CLOUD_NAME) {
    warnings.push('CLOUDINARY_CLOUD_NAME has leading/trailing spaces');
  }
  
  if (!CLOUDINARY_API_KEY) {
    issues.push('CLOUDINARY_API_KEY is not set');
  } else if (CLOUDINARY_API_KEY.trim() !== CLOUDINARY_API_KEY) {
    warnings.push('CLOUDINARY_API_KEY has leading/trailing spaces');
  }
  
  if (!CLOUDINARY_API_SECRET) {
    issues.push('CLOUDINARY_API_SECRET is not set');
  } else if (CLOUDINARY_API_SECRET.trim() !== CLOUDINARY_API_SECRET) {
    warnings.push('CLOUDINARY_API_SECRET has leading/trailing spaces');
  }
  
  if (issues.length > 0) {
    return {
      valid: false,
      issues,
      warnings,
      message: 'Cloudinary is not properly configured',
    };
  }
  
  // Verify credentials format (basic checks)
  if (CLOUDINARY_CLOUD_NAME.length < 3) {
    warnings.push('CLOUDINARY_CLOUD_NAME seems too short');
  }
  if (CLOUDINARY_API_KEY.length < 10) {
    warnings.push('CLOUDINARY_API_KEY seems too short');
  }
  if (CLOUDINARY_API_SECRET.length < 10) {
    warnings.push('CLOUDINARY_API_SECRET seems too short');
  }
  
  // Try to ping Cloudinary API to verify credentials
  try {
    // Use admin API to check account status (requires valid credentials)
    const result = await cloudinary.api.ping();
    return {
      valid: true,
      message: 'Cloudinary credentials are valid',
      cloudName: CLOUDINARY_CLOUD_NAME,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (error) {
    const status = error.http_code || error.status || 500;
    const errorMessage = error.message || 'Unknown error';
    
    // Provide specific guidance based on error
    let guidance = '';
    if (status === 401 || status === 403) {
      guidance = 'Invalid API credentials. Please verify CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET match your Cloudinary dashboard.';
    } else if (status === 404) {
      guidance = 'Cloud name not found. Verify CLOUDINARY_CLOUD_NAME is correct.';
    }
    
    return {
      valid: false,
      issues: [`Cloudinary API test failed with status ${status}: ${errorMessage}`, guidance].filter(Boolean),
      warnings,
      message: 'Cloudinary credentials may be invalid',
      error: {
        status,
        http_code: error.http_code,
        message: errorMessage,
      },
    };
  }
};

export default {
  uploadVideoBuffer,
  validateCloudinaryConfig,
};




