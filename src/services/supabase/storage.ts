import { getSupabase, isSupabaseConfigured } from './client';

export interface StorageUploadResult {
  url: string;
  path: string;
  bucket: string;
}

/**
 * Uploads a file (File, Blob, or base64 data URL) to a Supabase Storage bucket.
 * Falls back to returning the base64 data URL if Supabase is not yet configured.
 *
 * @param bucket Name of bucket ('store-assets' or 'payment-receipts')
 * @param file File object or Blob or base64 Data URL string
 * @param pathSuffix Optional custom filename or path suffix
 */
export async function uploadToStorage(
  bucket: 'store-assets' | 'payment-receipts',
  file: File | Blob | string,
  pathSuffix?: string
): Promise<string> {
  // If Supabase is not configured, or if input is already a web URL, return direct
  if (typeof file === 'string' && (file.startsWith('http://') || file.startsWith('https://'))) {
    return file;
  }

  if (!isSupabaseConfigured()) {
    // Return base64 directly as fallback
    if (typeof file === 'string') return file;
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  const supabase = getSupabase();
  const fileExt = pathSuffix?.split('.').pop() || 'jpg';
  const cleanSuffix = pathSuffix
    ? pathSuffix.replace(/[^a-zA-Z0-9._-]/g, '_')
    : `file_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;

  const filePath = `${cleanSuffix}`;

  let body: Blob | File | Uint8Array;
  let contentType = 'image/jpeg';

  if (typeof file === 'string') {
    // Parse data URL to blob
    if (file.startsWith('data:')) {
      const parts = file.split(',');
      const mimeMatch = parts[0].match(/:(.*?);/);
      if (mimeMatch) contentType = mimeMatch[1];
      const binary = atob(parts[1]);
      const array = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        array[i] = binary.charCodeAt(i);
      }
      body = new Blob([array], { type: contentType });
    } else {
      return file;
    }
  } else {
    body = file;
    contentType = file.type || 'image/jpeg';
  }

  try {
    const { error } = await supabase.storage.from(bucket).upload(filePath, body, {
      contentType,
      upsert: true,
    });

    if (error) {
      console.warn(`[Storage] Upload to ${bucket} error, falling back to data URL:`, error.message);
      if (typeof file === 'string') return file;
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(body as Blob);
      });
    }

    const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(filePath);
    return publicData?.publicUrl || filePath;
  } catch (err) {
    console.warn('[Storage] Exception during upload:', err);
    if (typeof file === 'string') return file;
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(body as Blob);
    });
  }
}
