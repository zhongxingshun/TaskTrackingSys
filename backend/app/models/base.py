# -*- coding: utf-8 -*-
"""
数据库基础配置模块

提供 SQLAlchemy 2.0 异步引擎与会话工厂。
本地开发使用 SQLite (WAL 模式)，预留 PostgreSQL 迁移能力。
"""

import os
from typing import AsyncGenerator

from sqlalchemy import event
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    """
    所有 ORM 模型的基类。
    
    使用 SQLAlchemy 2.0 声明式基类，支持类型提示。
    """
    pass


def get_database_url() -> str:
    """
    获取数据库连接 URL。
    
    优先从环境变量读取，默认使用 SQLite。
    
    Returns:
        str: 数据库连接字符串
    """
    return os.getenv(
        "DATABASE_URL",
        "sqlite+aiosqlite:///./taskflow.db"
    )


def get_engine():
    """
    创建异步数据库引擎。
    
    对于 SQLite，启用 WAL 模式以提升并发性能。
    
    Returns:
        AsyncEngine: SQLAlchemy 异步引擎实例
    """
    database_url = get_database_url()
    
    engine = create_async_engine(
        database_url,
        echo=os.getenv("SQL_ECHO", "false").lower() == "true",
        future=True,
    )
    
    # SQLite WAL 模式配置
    if "sqlite" in database_url:
        @event.listens_for(engine.sync_engine, "connect")
        def set_sqlite_pragma(dbapi_connection, connection_record):
            """启用 SQLite WAL 模式和外键约束"""
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA journal_mode=WAL")
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()
    
    return engine


# 全局引擎实例（延迟初始化）
_engine = None


def _get_engine_singleton():
    """获取全局引擎单例"""
    global _engine
    if _engine is None:
        _engine = get_engine()
    return _engine


# 异步会话工厂
AsyncSessionLocal = async_sessionmaker(
    bind=_get_engine_singleton(),
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    """
    获取异步数据库会话的依赖注入函数。
    
    用于 FastAPI Depends 注入。
    
    Yields:
        AsyncSession: 数据库会话实例
    
    Example:
        ```python
        @app.get("/tasks")
        async def get_tasks(session: AsyncSession = Depends(get_async_session)):
            ...
        ```
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db() -> None:
    """
    初始化数据库，创建所有表。
    
    应在应用启动时调用。
    """
    engine = _get_engine_singleton()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def drop_db() -> None:
    """
    删除所有表（仅用于测试环境）。
    
    ⚠️ 危险操作，生产环境禁用。
    """
    engine = _get_engine_singleton()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
