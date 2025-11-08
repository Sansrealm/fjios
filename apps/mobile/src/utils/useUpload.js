import * as React from "react";
import { UploadClient } from "@uploadcare/upload-client";
// ADD: native uploader for RN to improve large video uploads on iOS/Android
import { uploadAsync, FileSystemUploadType } from "expo-file-system";

const client = new UploadClient({
  publicKey: process.env.EXPO_PUBLIC_UPLOADCARE_PUBLIC_KEY,
});

function useUpload() {
  const [loading, setLoading] = React.useState(false);

  // Helper to ensure filename has a plausible extension
  const ensureFileName = (nameFromAsset, uri, mimeType) => {
    const fromName = nameFromAsset || (uri ? uri.split("/").pop() : "upload");
    const hasExt = fromName && /\.[A-Za-z0-9]+$/.test(fromName);
    if (hasExt) return fromName;
    const type = (mimeType || "").toLowerCase();
    let ext = "bin";
    if (type.includes("video/mp4")) ext = "mp4";
    else if (type.includes("video/quicktime")) ext = "mov";
    else if (type.includes("image/jpeg")) ext = "jpg";
    else if (type.includes("image/png")) ext = "png";
    return `${fromName}.${ext}`;
  };

  const upload = React.useCallback(async (input) => {
    try {
      setLoading(true);
      let response;

      if ("reactNativeAsset" in input && input.reactNativeAsset) {
        const asset = input.reactNativeAsset;
        const uri = asset.file?.uri || asset.uri;
        const mimeType =
          asset.mimeType || asset.type || "application/octet-stream";
        const name = ensureFileName(
          asset.name || asset.fileName,
          uri,
          mimeType,
        );

        // PRIMARY: use native multipart upload for RN
        if (uri) {
          try {
            const result = await uploadAsync("/_create/api/upload/", uri, {
              httpMethod: "POST",
              uploadType: FileSystemUploadType.MULTIPART,
              fieldName: "file",
              // Do not set Content-Type; boundary is added by the native layer
              parameters: undefined,
              headers: undefined,
            });
            if (result.status < 200 || result.status >= 300) {
              throw new Error(
                `Upload failed: HTTP ${result.status} ${result.body?.slice(0, 200) || ""}`,
              );
            }
            let parsed;
            try {
              parsed = JSON.parse(result.body || "{}");
            } catch (e) {
              parsed = {};
            }
            if (!parsed?.url) {
              throw new Error("Upload failed: No URL returned");
            }
            return {
              url: parsed.url,
              mimeType: parsed.mimeType || mimeType || null,
            };
          } catch (nativeErr) {
            // FALLBACK: FormData fetch if native path fails for any reason
            try {
              const formData = new FormData();
              formData.append("file", {
                uri,
                name,
                type: mimeType,
              });
              response = await fetch("/_create/api/upload/", {
                method: "POST",
                body: formData,
              });
            } catch (fdErr) {
              // If both native and FormData failed, try presigned Uploadcare as last resort
              const presignRes = await fetch("/_create/api/upload/presign/", {
                method: "POST",
              });
              const { secureSignature, secureExpire } = await presignRes.json();
              const result = await client.uploadFile(asset, {
                fileName: name,
                contentType: mimeType,
                secureSignature,
                secureExpire,
              });
              const baseCdn =
                process.env.EXPO_PUBLIC_BASE_CREATE_USER_CONTENT_URL ||
                "https://ucarecdn.com";
              return {
                url: `${baseCdn}/${result.uuid}/`,
                mimeType: result.mimeType || mimeType || null,
              };
            }
          }
        } else {
          // No URI -> use Uploadcare direct
          const presignRes = await fetch("/_create/api/upload/presign/", {
            method: "POST",
          });
          const { secureSignature, secureExpire } = await presignRes.json();
          const result = await client.uploadFile(asset, {
            fileName: name,
            contentType: mimeType,
            secureSignature,
            secureExpire,
          });
          const baseCdn =
            process.env.EXPO_PUBLIC_BASE_CREATE_USER_CONTENT_URL ||
            "https://ucarecdn.com";
          return {
            url: `${baseCdn}/${result.uuid}/`,
            mimeType: result.mimeType || mimeType || null,
          };
        }
      } else if ("url" in input) {
        response = await fetch("/_create/api/upload/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url: input.url }),
        });
      } else if ("base64" in input) {
        response = await fetch("/_create/api/upload/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ base64: input.base64 }),
        });
      } else {
        response = await fetch("/_create/api/upload/", {
          method: "POST",
          headers: {
            "Content-Type": "application/octet-stream",
          },
          body: input.buffer,
        });
      }

      if (response) {
        if (!response.ok) {
          const text = await response.text().catch(() => "");
          if (response.status === 413) {
            throw new Error("Upload failed: File too large.");
          }
          throw new Error(
            `Upload failed: [${response.status}] ${response.statusText}${text ? ` - ${text.slice(0, 120)}` : ""}`,
          );
        }
        const data = await response.json();
        return { url: data.url, mimeType: data.mimeType || null };
      }

      // Should not reach here
      throw new Error("Upload failed");
    } catch (uploadError) {
      if (uploadError instanceof Error) {
        return { error: uploadError.message };
      }
      if (typeof uploadError === "string") {
        return { error: uploadError };
      }
      return { error: "Upload failed" };
    } finally {
      setLoading(false);
    }
  }, []);

  return [upload, { loading }];
}

export { useUpload };
export default useUpload;
