/**
 * 支持粘贴图片的 Markdown 描述编辑器
 */

import { useState, useRef, useCallback } from 'react';
import { Image, Loader2 } from 'lucide-react';
import { uploadsApi } from '@/api';

interface MarkdownEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    rows?: number;
    className?: string;
}

export function MarkdownEditor({
    value,
    onChange,
    placeholder = '输入描述（支持 Markdown，可粘贴图片）',
    rows = 5,
    className = '',
}: MarkdownEditorProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // 在光标位置插入文本
    const insertAtCursor = useCallback((text: string) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const before = value.substring(0, start);
        const after = value.substring(end);

        const newValue = before + text + after;
        onChange(newValue);

        // 设置光标位置到插入文本之后
        setTimeout(() => {
            textarea.focus();
            textarea.selectionStart = textarea.selectionEnd = start + text.length;
        }, 0);
    }, [value, onChange]);

    // 上传图片并插入 Markdown
    const uploadAndInsertImage = useCallback(async (file: File | Blob) => {
        setIsUploading(true);
        setUploadProgress('上传中...');

        try {
            const result = await uploadsApi.uploadImage(file);

            // 插入 Markdown 图片语法
            const imageMarkdown = `\n![图片](${result.url})\n`;
            insertAtCursor(imageMarkdown);

            setUploadProgress('上传成功！');
            setTimeout(() => setUploadProgress(''), 2000);
        } catch (error) {
            console.error('上传失败:', error);
            setUploadProgress('上传失败: ' + (error as Error).message);
            setTimeout(() => setUploadProgress(''), 3000);
        } finally {
            setIsUploading(false);
        }
    }, [insertAtCursor]);

    // 处理粘贴事件
    const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
        const clipboardData = e.clipboardData;
        const items = clipboardData.items;

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.type.startsWith('image/')) {
                e.preventDefault(); // 阻止默认粘贴行为
                const blob = item.getAsFile();
                if (blob) {
                    await uploadAndInsertImage(blob);
                }
                return;
            }
        }
        // 如果不是图片，让默认粘贴行为继续
    }, [uploadAndInsertImage]);

    // 处理拖放
    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault();
        const files = e.dataTransfer.files;

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (file.type.startsWith('image/')) {
                await uploadAndInsertImage(file);
                return;
            }
        }
    }, [uploadAndInsertImage]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
    }, []);

    // 点击上传按钮
    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    // 文件选择
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type.startsWith('image/')) {
            await uploadAndInsertImage(file);
        }
        // 清空 input，允许再次选择同一文件
        e.target.value = '';
    };

    return (
        <div className="relative">
            {/* 编辑器工具栏 */}
            <div className="flex items-center gap-2 mb-2">
                <button
                    type="button"
                    onClick={handleUploadClick}
                    disabled={isUploading}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-text-secondary bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
                >
                    {isUploading ? (
                        <Loader2 size={14} className="animate-spin" />
                    ) : (
                        <Image size={14} />
                    )}
                    插入图片
                </button>

                {uploadProgress && (
                    <span className={`text-sm ${uploadProgress.includes('失败') ? 'text-red-500' : 'text-primary-600'}`}>
                        {uploadProgress}
                    </span>
                )}

                <span className="text-xs text-text-muted ml-auto">
                    支持粘贴/拖放图片
                </span>
            </div>

            {/* 隐藏的文件 input */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
            />

            {/* 文本域 */}
            <textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onPaste={handlePaste}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                placeholder={placeholder}
                rows={rows}
                className={`input-field resize-y min-h-[120px] ${className}`}
            />

            {/* 上传中遮罩 */}
            {isUploading && (
                <div className="absolute inset-0 top-10 bg-white/80 backdrop-blur-sm rounded-xl flex items-center justify-center z-10">
                    <div className="flex items-center gap-2 text-primary-600">
                        <Loader2 size={20} className="animate-spin" />
                        <span className="font-medium">正在上传图片...</span>
                    </div>
                </div>
            )}
        </div>
    );
}
