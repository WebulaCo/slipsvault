import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface StorageService {
    saveFile(file: File): Promise<string>;
    deleteFile(url: string): Promise<void>;
    getUrl(path: string): string;
}

class LocalStorageService implements StorageService {
    private uploadDir = path.join(process.cwd(), 'public', 'uploads');

    constructor() {
        this.ensureUploadDir();
    }

    private async ensureUploadDir() {
        try {
            await fs.access(this.uploadDir);
        } catch {
            await fs.mkdir(this.uploadDir, { recursive: true });
        }
    }

    async saveFile(file: File): Promise<string> {
        await this.ensureUploadDir();

        const buffer = Buffer.from(await file.arrayBuffer());
        const extension = file.name.split('.').pop();
        const filename = `${uuidv4()}.${extension}`;
        const filepath = path.join(this.uploadDir, filename);

        await fs.writeFile(filepath, buffer);

        return `/uploads/${filename}`;
    }

    async deleteFile(url: string): Promise<void> {
        const filename = url.split('/').pop();
        if (!filename) return;

        const filepath = path.join(this.uploadDir, filename);
        try {
            await fs.unlink(filepath);
        } catch (error) {
            console.error(`Failed to delete file: ${filepath}`, error);
        }
    }

    getUrl(path: string): string {
        return path;
    }
}

import { put, del } from '@vercel/blob';

// ... (LocalStorageService implementation remains the same)

class VercelBlobStorageService implements StorageService {
    async saveFile(file: File): Promise<string> {
        const blob = await put(file.name, file, {
            access: 'public',
        });
        return blob.url;
    }

    async deleteFile(url: string): Promise<void> {
        await del(url);
    }

    getUrl(path: string): string {
        return path;
    }
}

// Factory to get the storage service
export function getStorageService(): StorageService {
    // Use Vercel Blob if the token is present (Production)
    if (process.env.BLOB_READ_WRITE_TOKEN) {
        return new VercelBlobStorageService();
    }
    // Fallback to Local Storage (Development)
    return new LocalStorageService();
}
