export interface MediaItem {
    id: string;
    name: string;
    type: 'image' | 'video';
    blob: Blob;
    thumbnail: string; // Base64 data URL for quick rendering in lists
    isDefault: boolean;
    createdAt: number;
}

const DB_NAME = 'led-planner-media';
const STORE_NAME = 'media';
const DB_VERSION = 1;

function getDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (e) => {
            const db = (e.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
    });
}

function generateThumbnail(file: File): Promise<string> {
    return new Promise((resolve) => {
        if (file.type.startsWith('image/')) {
            const img = new Image();
            const objectUrl = URL.createObjectURL(file);
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const MAX = 150;
                let w = img.width;
                let h = img.height;
                if (w > h) {
                    h *= MAX / w;
                    w = MAX;
                } else {
                    w *= MAX / h;
                    h = MAX;
                }
                canvas.width = w;
                canvas.height = h;
                ctx?.drawImage(img, 0, 0, w, h);
                resolve(canvas.toDataURL('image/jpeg', 0.8));
                URL.revokeObjectURL(objectUrl);
            };
            img.onerror = () => {
                resolve('');
                URL.revokeObjectURL(objectUrl);
            };
            img.src = objectUrl;
        } else if (file.type.startsWith('video/')) {
            const video = document.createElement('video');
            const objectUrl = URL.createObjectURL(file);
            video.onloadeddata = () => {
                video.currentTime = Math.min(1, video.duration / 2 || 0);
            };
            video.onseeked = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const MAX = 150;
                let w = video.videoWidth;
                let h = video.videoHeight;
                if (w > h) {
                    h *= MAX / w;
                    w = MAX;
                } else {
                    w *= MAX / h;
                    h = MAX;
                }
                canvas.width = w;
                canvas.height = h;
                ctx?.drawImage(video, 0, 0, w, h);
                resolve(canvas.toDataURL('image/jpeg', 0.8));
                URL.revokeObjectURL(objectUrl);
            };
            video.onerror = () => {
                resolve('');
                URL.revokeObjectURL(objectUrl);
            };
            video.src = objectUrl;
            video.muted = true;
        } else {
            resolve('');
        }
    });
}

export async function saveMedia(file: File, isDefault = false): Promise<MediaItem> {
    const db = await getDB();
    const thumbnail = await generateThumbnail(file);
    const item: MediaItem = {
        id: `media_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: file.name,
        type: file.type.startsWith('video/') ? 'video' : 'image',
        blob: file,
        thumbnail,
        isDefault,
        createdAt: Date.now()
    };

    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(item);
        req.onsuccess = () => resolve(item);
        req.onerror = () => reject(req.error);
    });
}

export async function getMedia(id: string): Promise<MediaItem | null> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(id);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
    });
}

export async function listMedia(): Promise<MediaItem[]> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
    });
}

export async function deleteMedia(id: string): Promise<void> {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}
