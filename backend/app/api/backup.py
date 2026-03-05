# -*- coding: utf-8 -*-
"""
备份管理 API

提供数据库备份的状态查询和手动触发功能。
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from app.services.backup_service import get_backup_service


router = APIRouter(prefix="/backup", tags=["Backup"])


class BackupInfo(BaseModel):
    """备份文件信息"""
    filename: str
    size_kb: float
    created_at: str


class BackupStatus(BaseModel):
    """备份状态响应"""
    enabled: bool
    backup_dir: str
    max_backups: int
    current_backup_count: int
    latest_backup: Optional[BackupInfo] = None
    next_run: Optional[str] = None


class BackupResult(BaseModel):
    """备份结果响应"""
    success: bool
    message: str
    backup_path: Optional[str] = None


@router.get("/status", response_model=BackupStatus, summary="获取备份状态")
async def get_backup_status():
    """
    获取数据库备份服务的状态信息
    
    包括：
    - 是否启用
    - 备份目录
    - 最大保留数量
    - 当前备份数量
    - 最新备份信息
    - 下次运行时间
    """
    backup_service = get_backup_service()
    status = backup_service.get_backup_status()
    return BackupStatus(**status)


@router.post("/trigger", response_model=BackupResult, summary="手动触发备份")
async def trigger_backup():
    """
    手动触发一次数据库备份
    
    备份完成后会自动清理超出保留数量的旧备份。
    """
    backup_service = get_backup_service()
    backup_path = await backup_service.backup()
    
    if backup_path:
        return BackupResult(
            success=True,
            message="数据库备份成功",
            backup_path=backup_path
        )
    else:
        return BackupResult(
            success=False,
            message="数据库备份失败，请检查日志"
        )


@router.get("/list", summary="获取备份列表")
async def list_backups():
    """
    获取所有备份文件列表
    
    返回按时间降序排列的备份文件信息。
    """
    backup_service = get_backup_service()
    backup_files = backup_service._get_backup_files()
    
    backups = []
    for f in backup_files:
        stat = f.stat()
        backups.append({
            "filename": f.name,
            "size_kb": round(stat.st_size / 1024, 2),
            "created_at": datetime.fromtimestamp(stat.st_mtime).isoformat()
        })
    
    return {
        "total": len(backups),
        "backups": backups
    }
