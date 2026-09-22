import { put, del } from '@vercel/blob';
import { randomBytes } from 'crypto';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
const ALLOWED_MEDIA_TYPES = [...ALLOWED_IMAGE_TYPES, 'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/aac', 'audio/mp4', 'video/mp4', 'video/webm', 'video/ogg'];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;  // 10MB
const MAX_MEDIA_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_LOGO_SIZE  = 5 * 1024 * 1024;   // 5MB

export interface UploadResult {
  url: string;
  pathname: string;
}

// Upload image to Vercel Blob
export async function uploadImage(file: File, folder = 'news'): Promise<UploadResult> {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error(`نوع الملف غير مدعوم. المسموح: ${ALLOWED_IMAGE_TYPES.map(t => t.split('/')[1]).join(', ')}`);
  }
  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error('حجم الصورة لا يتجاوز 10 ميغابايت');
  }
  return uploadFile(file, folder);
}

// Upload logo — accepts SVG too
export async function uploadLogo(file: File): Promise<UploadResult> {
  const allowed = [...ALLOWED_IMAGE_TYPES, 'image/svg+xml'];
  if (!allowed.includes(file.type) && !file.name.endsWith('.svg')) {
    throw new Error('نوع غير مدعوم. المسموح: PNG, JPG, SVG, WebP');
  }
  if (file.size > MAX_LOGO_SIZE) throw new Error('حجم الشعار لا يتجاوز 5 ميغابايت');
  return uploadFile(file, 'logos');
}

// Upload media (audio/video for editor)
export async function uploadMedia(file: File): Promise<UploadResult & { kind: 'image' | 'audio' | 'video' }> {
  if (!ALLOWED_MEDIA_TYPES.includes(file.type)) {
    throw new Error('نوع الملف غير مدعوم');
  }
  if (file.size > MAX_MEDIA_SIZE) throw new Error('حجم الملف لا يتجاوز 100 ميغابايت');
  const result = await uploadFile(file, 'media');
  let kind: 'image' | 'audio' | 'video' = 'image';
  if (file.type.startsWith('audio/')) kind = 'audio';
  else if (file.type.startsWith('video/')) kind = 'video';
  return { ...result, kind };
}

// Upload background image for theme
export async function uploadBgImage(file: File): Promise<UploadResult> {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) throw new Error('نوع غير مدعوم');
  if (file.size > MAX_IMAGE_SIZE) throw new Error('حجم الملف لا يتجاوز 10 ميغابايت');
  return uploadFile(file, 'backgrounds');
}

// Core upload function
async function uploadFile(file: File, folder: string): Promise<UploadResult> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error('Vercel Blob غير مُهيأ — أضف BLOB_READ_WRITE_TOKEN');
  }
  const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
  const uniqueName = `${folder}/${Date.now()}-${randomBytes(8).toString('hex')}.${ext}`;
  const blob = await put(uniqueName, file, {
    access: 'public',
    contentType: file.type,
  });
  return { url: blob.url, pathname: blob.pathname };
}

// Delete a blob by URL
export async function deleteBlob(url: string): Promise<void> {
  try {
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      await del(url);
    }
  } catch (e) {
    console.error('[BLOB DELETE]', e);
  }
}

// Parse multipart form to extract files
export async function parseFormData(req: Request) {
  const contentType = req.headers.get('content-type') || '';
  if (!contentType.includes('multipart/form-data')) {
    throw new Error('Content-Type must be multipart/form-data');
  }
  return req.formData();
}

// Helper — extract file from FormData safely
export function getFile(fd: FormData, key: string): File | null {
  const val = fd.get(key);
  return val instanceof File && val.size > 0 ? val : null;
}

export function getFiles(fd: FormData, key: string): File[] {
  return fd.getAll(key).filter((v): v is File => v instanceof File && v.size > 0);
}
