/**
 * An image attached to a chat message, sent to the model (Gemini) as base64.
 */
export interface ChatImage {
    mimeType: string;
    data: string;
}

/** Longest side, in pixels, of images sent to the model. */
const MAX_DIMENSION = 1600;

/**
 * Reads an image file for the chat, scaled down to MAX_DIMENSION and encoded
 * as JPEG. This keeps requests well under the backend's 10MB body limit while
 * leaving plenty of detail for the model to read.
 */
export async function fileToChatImage(file: File): Promise<ChatImage> {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);

    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not read the image');
    // White background so transparent PNGs don't turn black in JPEG.
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
    return { mimeType: 'image/jpeg', data: dataUrl.slice(dataUrl.indexOf(',') + 1) };
}
