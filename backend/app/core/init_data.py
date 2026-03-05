# -*- coding: utf-8 -*-
"""
初始化数据

创建预设的角色、权限和管理员账号。
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.user import User
from app.models.role import Role
from app.models.permission import Permission
from app.models.user_role import UserRole
from app.models.role_permission import RolePermission
from app.core.security import get_password_hash


# 预设权限
PRESET_PERMISSIONS = [
    # 任务管理
    {"code": "task:view", "name": "查看任务", "category": "任务管理", "description": "查看任务列表和详情"},
    {"code": "task:create", "name": "创建任务", "category": "任务管理", "description": "创建新任务"},
    {"code": "task:edit", "name": "编辑任务", "category": "任务管理", "description": "编辑任务信息"},
    {"code": "task:delete", "name": "删除任务", "category": "任务管理", "description": "删除任务"},
    {"code": "task:archive", "name": "归档任务", "category": "任务管理", "description": "归档任务"},
    {"code": "task:assign", "name": "分配负责人", "category": "任务管理", "description": "为设备分配负责人"},
    
    # 设备管理
    {"code": "device:view", "name": "查看设备", "category": "设备管理", "description": "查看设备列表和详情"},
    {"code": "device:create", "name": "创建设备", "category": "设备管理", "description": "创建新设备"},
    {"code": "device:edit", "name": "编辑设备", "category": "设备管理", "description": "编辑设备信息"},
    {"code": "device:delete", "name": "删除设备", "category": "设备管理", "description": "删除设备"},
    
    # 用户管理
    {"code": "user:view", "name": "查看用户", "category": "用户管理", "description": "查看用户列表和详情"},
    {"code": "user:create", "name": "创建用户", "category": "用户管理", "description": "创建新用户"},
    {"code": "user:edit", "name": "编辑用户", "category": "用户管理", "description": "编辑用户信息"},
    {"code": "user:delete", "name": "删除用户", "category": "用户管理", "description": "删除用户"},
    {"code": "user:assign_role", "name": "分配角色", "category": "用户管理", "description": "为用户分配角色"},
]

# 预设角色
PRESET_ROLES = [
    {
        "code": "superadmin",
        "name": "超级管理员",
        "description": "拥有所有权限",
        "is_system": True,
        "permissions": ["*"]  # 所有权限
    },
    {
        "code": "admin",
        "name": "管理员",
        "description": "可以管理任务和设备",
        "is_system": True,
        "permissions": [
            "task:view", "task:create", "task:edit", "task:archive", "task:assign",
            "device:view", "device:create", "device:edit",
            "user:view"
        ]
    },
    {
        "code": "user",
        "name": "普通用户",
        "description": "可以查看和编辑自己的任务",
        "is_system": True,
        "permissions": [
            "task:view", "task:create", "task:edit",
            "device:view"
        ]
    },
    {
        "code": "guest",
        "name": "访客",
        "description": "只能查看",
        "is_system": True,
        "permissions": [
            "task:view",
            "device:view"
        ]
    }
]


async def init_permissions(session: AsyncSession) -> dict:
    """初始化权限"""
    permission_map = {}
    
    for perm_data in PRESET_PERMISSIONS:
        # 检查是否已存在
        stmt = select(Permission).where(Permission.code == perm_data["code"])
        result = await session.execute(stmt)
        perm = result.scalar_one_or_none()
        
        if not perm:
            perm = Permission(**perm_data)
            session.add(perm)
            await session.flush()
        
        permission_map[perm_data["code"]] = perm.id
    
    await session.commit()
    return permission_map


async def init_roles(session: AsyncSession, permission_map: dict) -> dict:
    """初始化角色"""
    role_map = {}
    
    for role_data in PRESET_ROLES:
        # 检查是否已存在
        stmt = select(Role).where(Role.code == role_data["code"])
        result = await session.execute(stmt)
        role = result.scalar_one_or_none()
        
        if not role:
            role = Role(
                code=role_data["code"],
                name=role_data["name"],
                description=role_data["description"],
                is_system=role_data["is_system"]
            )
            session.add(role)
            await session.flush()
            
            # 分配权限
            if role_data["permissions"] != ["*"]:
                for perm_code in role_data["permissions"]:
                    if perm_code in permission_map:
                        rp = RolePermission(
                            role_id=role.id,
                            permission_id=permission_map[perm_code]
                        )
                        session.add(rp)
        
        role_map[role_data["code"]] = role.id
    
    await session.commit()
    return role_map


async def init_admin_user(session: AsyncSession, role_map: dict) -> None:
    """初始化管理员账号"""
    # 检查是否已存在管理员
    stmt = select(User).where(User.email == "admin@taskflow.com")
    result = await session.execute(stmt)
    admin = result.scalar_one_or_none()
    
    if not admin:
        admin = User(
            username="admin",
            email="admin@taskflow.com",
            password_hash=get_password_hash("admin123"),  # 默认密码
            display_name="系统管理员",
            is_active=True,
            is_superuser=True
        )
        session.add(admin)
        await session.flush()
        
        # 分配超级管理员角色
        if "superadmin" in role_map:
            ur = UserRole(user_id=admin.id, role_id=role_map["superadmin"])
            session.add(ur)
        
        await session.commit()
        print("✅ 默认管理员账号已创建: admin@taskflow.com / admin123")


async def init_data(session: AsyncSession) -> None:
    """初始化所有预设数据"""
    print("📦 正在初始化预设数据...")
    
    # 初始化权限
    permission_map = await init_permissions(session)
    print(f"  ✓ 权限初始化完成: {len(permission_map)} 个")
    
    # 初始化角色
    role_map = await init_roles(session, permission_map)
    print(f"  ✓ 角色初始化完成: {len(role_map)} 个")
    
    # 初始化管理员
    await init_admin_user(session, role_map)
    
    print("✅ 预设数据初始化完成")
