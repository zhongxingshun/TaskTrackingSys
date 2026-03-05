/**
 * Markdown 内容渲染组件
 * 支持渲染图片、链接等 Markdown 元素
 */

import { useState, useCallback, useMemo, memo } from 'react';
import ReactMarkdown, { Components } from 'react-markdown';

interface MarkdownContentProps {
    content: string;
    className?: string;
}

function MarkdownImage({ src, alt }: { src?: string; alt?: string }) {
    const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
    const [retryCount, setRetryCount] = useState(0);

    const handleError = useCallback(() => {
        if (retryCount < 3) {
            setRetryCount((c) => c + 1);
            setStatus('loading');
        } else {
            setStatus('error');
        }
    }, [retryCount]);

    if (status === 'error') {
        return (
            <div className="text-sm text-red-500 bg-red-50 p-2 rounded my-2">
                图片加载失败: {src}
            </div>
        );
    }

    return (
        <img
            key={retryCount}
            src={src}
            alt={alt || '图片'}
            className="max-w-full h-auto rounded-lg my-2 shadow-sm border border-gray-200"
            onLoad={() => setStatus('loaded')}
            onError={handleError}
        />
    );
}

const markdownComponents: Components = {
    img: ({ src, alt }) => <MarkdownImage src={src} alt={alt} />,
    a: ({ href, children }) => (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-600 hover:text-primary-700 underline"
        >
            {children}
        </a>
    ),
    p: ({ children }) => (
        <p className="whitespace-pre-wrap mb-2 last:mb-0">{children}</p>
    ),
    code: ({ children, className }) => {
        const isInline = !className;
        if (isInline) {
            return (
                <code className="bg-gray-100 text-primary-700 px-1.5 py-0.5 rounded text-sm font-mono">
                    {children}
                </code>
            );
        }
        return (
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto my-2">
                <code className="text-sm font-mono">{children}</code>
            </pre>
        );
    },
};

export const MarkdownContent = memo(function MarkdownContent({ content, className = '' }: MarkdownContentProps) {
    return (
        <div className={`markdown-content ${className}`}>
            <ReactMarkdown components={markdownComponents}>
                {content}
            </ReactMarkdown>
        </div>
    );
});
