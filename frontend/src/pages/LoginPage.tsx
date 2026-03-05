/**
 * 登录页面
 */

import { useState } from 'react';
import { User, Lock, Eye, EyeOff, LogIn, UserPlus } from 'lucide-react';

interface LoginPageProps {
    onLogin: (token: string) => void;
    onRegister?: () => void;
}

export function LoginPage({ onLogin, onRegister: _onRegister }: LoginPageProps) {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        // 辅助函数：解析错误消息
        const parseError = (data: any): string => {
            if (typeof data.detail === 'string') {
                return data.detail;
            }
            if (Array.isArray(data.detail)) {
                // Pydantic 验证错误格式
                return data.detail.map((err: any) => {
                    const field = err.loc?.slice(-1)[0] || '';
                    const msg = err.msg || '';
                    return field ? `${field}: ${msg}` : msg;
                }).join('; ');
            }
            if (typeof data.detail === 'object') {
                return JSON.stringify(data.detail);
            }
            return '操作失败';
        };

        // 辅助函数：安全解析 JSON 响应
        const safeParseJson = async (response: Response): Promise<any> => {
            const text = await response.text();
            if (!text || text.trim() === '') {
                return null;
            }
            try {
                return JSON.parse(text);
            } catch {
                console.error('Failed to parse JSON:', text);
                return { detail: text || '服务器响应格式错误' };
            }
        };

        try {
            if (isLogin) {
                // 登录
                const formData = new FormData();
                formData.append('username', email);
                formData.append('password', password);

                const response = await fetch('/api/v1/auth/login', {
                    method: 'POST',
                    body: formData,
                });

                const data = await safeParseJson(response);

                if (!response.ok) {
                    throw new Error(data ? parseError(data) : `登录失败 (${response.status})`);
                }

                if (!data || !data.access_token) {
                    throw new Error('登录响应格式错误');
                }

                onLogin(data.access_token);
            } else {
                // 注册
                const response = await fetch('/api/v1/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username,
                        email,
                        password,
                        display_name: displayName || username,
                    }),
                });

                const regData = await safeParseJson(response);

                if (!response.ok) {
                    throw new Error(regData ? parseError(regData) : `注册失败 (${response.status})`);
                }

                // 注册成功后自动登录
                const formData = new FormData();
                formData.append('username', email);
                formData.append('password', password);

                const loginResponse = await fetch('/api/v1/auth/login', {
                    method: 'POST',
                    body: formData,
                });

                const loginData = await safeParseJson(loginResponse);

                if (loginResponse.ok && loginData?.access_token) {
                    onLogin(loginData.access_token);
                } else {
                    setIsLogin(true);
                    setError('注册成功，请登录');
                }
            }
        } catch (err) {
            setError((err as Error).message || '操作失败');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-900 via-primary-800 to-primary-900 p-4">
            {/* 背景装饰 */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-500/20 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent/20 rounded-full blur-3xl"></div>
            </div>

            {/* 登录卡片 */}
            <div className="relative w-full max-w-md">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
                    {/* 头部 */}
                    <div className="px-8 pt-8 pb-6 text-center">
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-accent bg-clip-text text-transparent">
                            TaskFlow
                        </h1>
                        <p className="mt-2 text-gray-500 dark:text-gray-400">
                            任务跟踪管理系统
                        </p>
                    </div>

                    {/* 切换标签 */}
                    <div className="px-8">
                        <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                            <button
                                onClick={() => setIsLogin(true)}
                                className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${isLogin
                                    ? 'bg-white dark:bg-gray-600 text-primary-600 dark:text-primary-400 shadow-sm'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                                    }`}
                            >
                                登录
                            </button>
                            <button
                                onClick={() => setIsLogin(false)}
                                className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${!isLogin
                                    ? 'bg-white dark:bg-gray-600 text-primary-600 dark:text-primary-400 shadow-sm'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                                    }`}
                            >
                                注册
                            </button>
                        </div>
                    </div>

                    {/* 表单 */}
                    <form onSubmit={handleSubmit} className="p-8 space-y-4">
                        {!isLogin && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        用户名
                                    </label>
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        required={!isLogin}
                                        placeholder="请输入用户名"
                                        className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        显示名称
                                    </label>
                                    <input
                                        type="text"
                                        value={displayName}
                                        onChange={(e) => setDisplayName(e.target.value)}
                                        placeholder="可选，用于显示"
                                        className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                                    />
                                </div>
                            </>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                {isLogin ? '用户名/邮箱' : '邮箱'}
                            </label>
                            <div className="relative">
                                <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type={isLogin ? 'text' : 'email'}
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    placeholder={isLogin ? '用户名或邮箱' : 'your@email.com'}
                                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                密码
                            </label>
                            <div className="relative">
                                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={8}
                                    placeholder="••••••••"
                                    className="w-full pl-10 pr-12 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-gradient-to-r from-primary-600 to-primary-700 text-white font-medium hover:from-primary-700 hover:to-primary-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary-500/25"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : isLogin ? (
                                <>
                                    <LogIn size={18} />
                                    登录
                                </>
                            ) : (
                                <>
                                    <UserPlus size={18} />
                                    注册
                                </>
                            )}
                        </button>

                        {isLogin && (
                            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                                默认管理员: admin 或 admin@taskflow.com / admin123
                            </p>
                        )}
                    </form>
                </div>
            </div>
        </div>
    );
}
