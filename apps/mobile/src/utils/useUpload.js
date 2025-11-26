import * as React from "react";
import { UploadClient } from "@uploadcare/upload-client";
import { Platform } from "react-native";

const baseCdn =
  process.env.EXPO_PUBLIC_BASE_CREATE_USER_CONTENT_URL || "https://ucarecdn.com";
const uploadcarePublicKey = process.env.EXPO_PUBLIC_UPLOADCARE_PUBLIC_KEY;

const client = uploadcarePublicKey
  ? new UploadClient({
      publicKey: uploadcarePublicKey,
      baseCDN: baseCdn,
      integration: "networkzz-mobile/1.0.0",
    })
  : null;

const filenameFromAsset = (nameFromAsset, uri, mimeType) => {
  const fallback = nameFromAsset || (uri ? uri.split("/").pop() : "upload");
  if (!fallback) return "upload.bin";
  if (/\.[A-Za-z0-9]+$/.test(fallback)) {
    return fallback;
  }
  const type = (mimeType || "").toLowerCase();
  if (type.includes("video/mp4")) return `${fallback}.mp4`;
  if (type.includes("video/quicktime")) return `${fallback}.mov`;
  if (type.includes("image/jpeg")) return `${fallback}.jpg`;
  if (type.includes("image/png")) return `${fallback}.png`;
  return `${fallback}.bin`;
};

const base64Alphabet =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

const decodeBase64 = (value) => {
  if (!value) return new Uint8Array();
  const clean = value.replace(/[^0-9a-z+/=]/gi, "");
  if (typeof globalThis.atob === "function") {
    const binary = globalThis.atob(clean);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
  let buffer = 0;
  let bits = 0;
  const bytes = [];
  for (const char of clean) {
    if (char === "=") break;
    const valueIndex = base64Alphabet.indexOf(char);
    if (valueIndex === -1) continue;
    buffer = (buffer << 6) | valueIndex;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }
  return Uint8Array.from(bytes);
};

const base64ToBinary = (base64, mimeType = "application/octet-stream") => {
  const bytes = decodeBase64(base64);
  if (typeof Blob === "function") {
    return new Blob([bytes], { type: mimeType });
  }
  if (typeof globalThis !== "undefined" && globalThis.Buffer) {
    return globalThis.Buffer.from(bytes);
  }
  return bytes;
};

const toUploadResult = (fileInfo, fallbackType) => {
  const url = fileInfo.cdnUrl || `${baseCdn}/${fileInfo.uuid}/`;
  return {
    url,
    mimeType: fileInfo.mimeType || fallbackType || null,
  };
};

const signatureCache = {
  value: null,
  expiresAt: 0,
  inflight: null,
};

const fetchSecureOptions = async () => {
  const now = Date.now();
  if (signatureCache.value && now < signatureCache.expiresAt - 5000) {
    return signatureCache.value;
  }
  if (!signatureCache.inflight) {
    signatureCache.inflight = fetch("/api/upload/presign", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Unable to prepare secure upload.");
        }
        return res.json();
      })
      .then((data) => {
        if (!data?.secureSignature || !data?.secureExpire) {
          throw new Error("Invalid secure upload payload.");
        }
        signatureCache.value = {
          secureSignature: data.secureSignature,
          secureExpire: data.secureExpire,
        };
        signatureCache.expiresAt = Number(data.secureExpire) * 1000;
        return signatureCache.value;
      })
      .catch(() => {
        signatureCache.value = null;
        signatureCache.expiresAt = 0;
        return null;
      })
      .finally(() => {
        signatureCache.inflight = null;
      });
  }
  return signatureCache.inflight;
};

const buildUploadOptions = async ({ fileName, contentType }) => {
  const secure = await fetchSecureOptions().catch(() => null);
  return {
    fileName,
    contentType,
    ...(secure || {}),
  };
};

const formatUploadError = (error) => {
  const message =
    typeof error === "string"
      ? error
      : error instanceof Error
        ? error.message
        : "";
  if (message.includes("Uploading of these file types is not allowed")) {
    return "Upload failed: Uploadcare rejected this video. Please ensure it is MP4 and try again.";
  }
  if (message.includes("secureSignature") || message.includes("secure upload")) {
    return "Upload failed: Unable to authorize Uploadcare. Please try again shortly.";
  }
  return message || "Upload failed";
};

let cachedVideoCompressor;
const getVideoCompressor = () => {
  if (cachedVideoCompressor !== undefined) {
    return cachedVideoCompressor;
  }
  if (Platform.OS === "web") {
    cachedVideoCompressor = null;
    return cachedVideoCompressor;
  }
  try {
    cachedVideoCompressor = require("react-native-compressor").Video;
  } catch (_err) {
    cachedVideoCompressor = null;
  }
  return cachedVideoCompressor;
};

const ensureMp4ReactNativeAsset = async (asset) => {
  const type = (asset?.type || asset?.mimeType || "").toLowerCase();
  if (!type.startsWith("video/") || type === "video/mp4") {
    return asset;
  }
  const compressor = getVideoCompressor();
  if (!compressor?.compress) {
    console.warn("[Upload] Video compressor not available; sending original format.");
    return asset;
  }
  if (!asset?.uri) {
    return asset;
  }
  try {
    const convertedUri = await compressor.compress(asset.uri, {
      compressionMethod: "auto",
      minimumFileSizeForCompress: 0,
    });
    const baseName =
      asset?.name?.replace(/\.[^.]+$/, "") ||
      asset?.fileName?.replace(/\.[^.]+$/, "") ||
      "upload";
    const normalizedName = `${baseName}.mp4`;
    return {
      ...asset,
      uri: convertedUri,
      file: asset.file ? { ...asset.file, uri: convertedUri } : asset.file,
      type: "video/mp4",
      mimeType: "video/mp4",
      name: normalizedName,
      fileName: normalizedName,
    };
  } catch (conversionError) {
    console.warn("[Upload] Video conversion failed; sending original file.", conversionError);
    return asset;
  }
};

const normalizeReactNativeAsset = async (asset) => {
  const uri = asset?.file?.uri || asset?.uri;
  if (!uri) {
    throw new Error("Upload failed: missing file URI.");
  }
  const mimeType = asset?.mimeType || asset?.type || "application/octet-stream";
  const name = filenameFromAsset(asset?.name || asset?.fileName, uri, mimeType);
  const normalized = {
    uri,
    type: mimeType,
    mimeType,
    name,
    fileName: name,
    file: asset?.file ? { ...asset.file, uri, name } : asset?.file,
  };
  return ensureMp4ReactNativeAsset(normalized);
};

function useUpload() {
  const [loading, setLoading] = React.useState(false);

  const upload = React.useCallback(async (input) => {
    let fileInfo;
    try {
      if (!client) {
        throw new Error("Upload failed: Uploadcare public key is not configured.");
      }
      setLoading(true);

      if ("reactNativeAsset" in input && input.reactNativeAsset) {
        const normalized = await normalizeReactNativeAsset(input.reactNativeAsset);
        const options = await buildUploadOptions({
          fileName: normalized.name,
          contentType: normalized.type,
        });
        fileInfo = await client.uploadFile(normalized, options);
        return toUploadResult(fileInfo, normalized.type);
      }

      if ("file" in input && input.file) {
        const file = input.file;
        const options = await buildUploadOptions({
          fileName: file.name,
          contentType: file.type || "application/octet-stream",
        });
        fileInfo = await client.uploadFile(file, options);
        return toUploadResult(fileInfo, file.type);
      }

      if ("url" in input && input.url) {
        const options = await buildUploadOptions({
          fileName: input.fileName,
          contentType: input.mimeType,
        });
        fileInfo = await client.uploadFile(input.url, options);
        return toUploadResult(fileInfo, input.mimeType);
      }

      if ("base64" in input && input.base64) {
        const binary = base64ToBinary(
          input.base64,
          input.mimeType || "application/octet-stream",
        );
        const options = await buildUploadOptions({
          fileName: input.fileName || "upload.bin",
          contentType: input.mimeType || binary.type || "application/octet-stream",
        });
        fileInfo = await client.uploadFile(binary, options);
        return toUploadResult(
          fileInfo,
          input.mimeType || binary.type || "application/octet-stream",
        );
      }

      if ("buffer" in input && input.buffer) {
        const options = await buildUploadOptions({
          fileName: input.fileName || "upload.bin",
          contentType: input.mimeType || "application/octet-stream",
        });
        fileInfo = await client.uploadFile(input.buffer, options);
        return toUploadResult(fileInfo, input.mimeType);
      }

      throw new Error("Upload failed: Unsupported input payload.");
    } catch (uploadError) {
      return { error: formatUploadError(uploadError) };
    } finally {
      setLoading(false);
    }
  }, []);

  return [upload, { loading }];
}

export { useUpload };
export default useUpload;
