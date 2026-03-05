/**
 * 认证上下文
 * 在全局共享用户信息和权限
 */

import { createContext, useContext, ReactNode } from 'react';

interface UserInfo {
    id: string;
    username: string;
    email: string;
    display_name: string | null;
    is_active: boolean;
    is_superuser: boolean;
    roles: string[];
    permissions: string[];
}

interface AuthContextType {
    user: UserInfo | null;
    token: string | null;
    isAdmin: boolean;
    hasPermission: (permission: string) => boolean;
    hasAnyPermission: (permissions: string[]) => boolean;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
}

interface AuthProviderProps {
    children: ReactNode;
    user: UserInfo | null;
    token: string | null;
    onLogout: () => void;
}

export function AuthProvider({ children, user, token, onLogout }: AuthProviderProps) {
    // 检查是否是管理员
    const isAdmin = user?.is_superuser ||
        user?.roles?.includes('superadmin') ||
        user?.roles?.includes('admin') ||
        false;

    // 检查是否有特定权限
    const hasPermission = (permission: string): boolean => {
        if (!user) return false;
        if (user.is_superuser) return true;
        if (user.roles?.includes('superadmin')) return true;
        return user.permissions?.includes(permission) || false;
    };

    // 检查是否有任一权限
    const hasAnyPermission = (permissions: string[]): boolean => {
        if (!user) return false;
        if (user.is_superuser) return true;
        if (user.roles?.includes('superadmin')) return true;
        return permissions.some(p => user.permissions?.includes(p));
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                isAdmin,
                hasPermission,
                hasAnyPermission,
                logout: onLogout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}
