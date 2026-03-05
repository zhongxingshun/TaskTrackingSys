/**
 * 文件上传 API
 */

export interface UploadResponse {
    success: boolean;
    filename: string;
    url: string;
    size: number;
    content_type: string;
}

/**
 * 上传图片
 */
export async function uploadImage(file: File | Blob): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/v1/uploads/image', {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || '上传失败');
    }

    return response.json();
}

/**
 * 从剪贴板数据上传图片
 */
export async function uploadFromClipboard(clipboardData: DataTransfer): Promise<UploadResponse | null> {
    const items = clipboardData.items;

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
            const blob = item.getAsFile();
            if (blob) {
                return uploadImage(blob);
            }
        }
    }

    return null;
}

export const uploadsApi = {
    uploadImage,
    uploadFromClipboard,
};
