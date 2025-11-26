import { UploadClient } from '@uploadcare/upload-client';

const baseCdn = process.env.UPLOADCARE_BASE_CDN || 'https://ucarecdn.com';
const publicKey =
  process.env.UPLOADCARE_PUBLIC_KEY || process.env.EXPO_PUBLIC_UPLOADCARE_PUBLIC_KEY;

const client = publicKey
  ? new UploadClient({
      publicKey,
      baseCDN: baseCdn,
      integration: 'networkzz-node/1.0.0',
    })
  : null;

const ensureClient = () => {
  if (!client) {
    throw new Error('Uploadcare is not configured on the server.');
  }
  return client;
};

const toUploadResult = (fileInfo, fallbackType) => {
  const url = fileInfo.cdnUrl || `${baseCdn}/${fileInfo.uuid}/`;
  return {
    url,
    mimeType: fileInfo.mimeType || fallbackType || null,
  };
};

async function upload({ url, buffer, base64, mimeType, fileName }) {
  const uploadClient = ensureClient();
  const options = {
    contentType: mimeType,
    fileName,
    store: true,
  };

  let source = null;
  if (url) {
    source = url;
  } else if (buffer) {
    source = buffer;
  } else if (base64) {
    source = Buffer.from(base64, 'base64');
  }

  if (!source) {
    throw new Error('Upload requires a url, buffer, or base64 payload.');
  }

  const fileInfo = await uploadClient.uploadFile(source, options);
  return toUploadResult(fileInfo, mimeType || null);
}

export { upload };
export default upload;

