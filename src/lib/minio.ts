import { promises as fs } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Readable } from 'stream';

// Base directory for uploads
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

// Ensure upload directory exists
export async function ensureBucketExists(): Promise<void> {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  } catch (error) {
    console.error('Error ensuring upload directory exists:', error);
    throw error;
  }
}

// Upload a file to local storage
export async function uploadFile(
  file: Buffer | Readable,
  originalName: string,
  contentType: string,
  companyId: number,
  folder: string = "receipts"
): Promise<string> {
  await ensureBucketExists();

  // Sanitize filename and create path
  const fileExt = originalName.split('.').pop() || '';
  const uniqueId = uuidv4();
  // Safe relative path: companyId/folder/uniqueId.ext
  const relativePath = `${companyId}/${folder}/${uniqueId}.${fileExt}`;
  const fullPath = path.join(UPLOAD_DIR, companyId.toString(), folder);
  
  // Ensure the specific folder exists
  await fs.mkdir(fullPath, { recursive: true });

  const filePath = path.join(fullPath, `${uniqueId}.${fileExt}`);

  if (Buffer.isBuffer(file)) {
    await fs.writeFile(filePath, file);
  } else {
    // Handle stream
    const chunks: Buffer[] = [];
    for await (const chunk of file) {
      chunks.push(Buffer.from(chunk));
    }
    const buffer = Buffer.concat(chunks);
    await fs.writeFile(filePath, buffer);
  }
  
  return relativePath;
}

// Get a file (not really needed if we serve via public URL, but good for internal processing)
export async function getFile(fileName: string): Promise<Readable> {
  try {
    const filePath = path.join(UPLOAD_DIR, fileName);
    const buffer = await fs.readFile(filePath);
    return Readable.from(buffer);
  } catch (error) {
    console.error('Error getting file from local storage:', error);
    throw error;
  }
}

// Delete a file from local storage
export async function deleteFile(fileName: string): Promise<void> {
  try {
    const filePath = path.join(UPLOAD_DIR, fileName);
    await fs.unlink(filePath);
  } catch (error) {
    console.error('Error deleting file from local storage:', error);
    // Don't throw if file doesn't exist? standard Minio behavior might throw.
    // We'll throw to maintain compatibility with callers expecting errors.
    throw error;
  }
}

// Generate URL (for local storage, it's just the public path)
export async function getPresignedUrl(fileName: string, expires = 60 * 60): Promise<string> {
  // We don't need presigned URLs for public files. Just return the path.
  // Note: This exposes the file publicly. If privacy is required, we'd need a route handler to serve it.
  // Given user requirement "All files shared... stored locally... processing", public is acceptable for now 
  // or we can prefix with /uploads/
  return `/uploads/${fileName}`;
}

// Get a file URL (public path)
export function getFileUrl(fileName: string): string {
  if (fileName.startsWith('http')) return fileName;
  if (fileName.startsWith('/')) return fileName;
  return `/uploads/${fileName}`;
} 