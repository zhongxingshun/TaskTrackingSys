/**
 * Markdown 内容渲染组件
 * 支持渲染图片、链接等 Markdown 元素
 */

import ReactMarkdown from 'react-markdown';

interface MarkdownContentProps {
    content: string;
    className?: string;
}

export function MarkdownContent({ content, className = '' }: MarkdownContentProps) {
    return (
        <div className={`markdown-content ${className}`}>
            <ReactMarkdown
                components={{
                    // 自定义图片渲染
                    img: ({ src, alt }) => (
                        <img
                            src={src}
                            alt={alt || '图片'}
                            className="max-w-full h-auto rounded-lg my-2 shadow-sm border border-gray-200"
                            loading="lazy"
                            onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                // 创建错误提示
                                const errorDiv = document.createElement('div');
                                errorDiv.className = 'text-sm text-red-500 bg-red-50 p-2 rounded my-2';
                                errorDiv.textContent = `图片加载失败: ${src}`;
                                target.parentNode?.insertBefore(errorDiv, target);
                            }}
                        />
                    ),
                    // 自定义链接渲染
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
                    // 自定义段落渲染
                    p: ({ children }) => (
                        <p className="whitespace-pre-wrap mb-2 last:mb-0">{children}</p>
                    ),
                    // 自定义代码块渲染
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
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
}
