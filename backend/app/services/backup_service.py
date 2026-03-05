# -*- coding: utf-8 -*-
"""
数据库备份服务

提供 SQLite 数据库的定时备份功能：
- 每天凌晨 02:00 自动备份
- 最多保留 7 份备份文件
- 支持手动触发备份
"""

import os
import shutil
from datetime import datetime
from pathlib import Path
from typing import List, Optional

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger


class BackupService:
    """数据库备份服务"""
    
    # 默认配置
    DEFAULT_BACKUP_DIR = "backups"
    DEFAULT_MAX_BACKUPS = 7
    DEFAULT_BACKUP_HOUR = 2
    DEFAULT_BACKUP_MINUTE = 0
    
    def __init__(
        self,
        db_path: str = "./taskflow.db",
        backup_dir: Optional[str] = None,
        max_backups: int = DEFAULT_MAX_BACKUPS
    ):
        """
        初始化备份服务
        
        Args:
            db_path: 数据库文件路径
            backup_dir: 备份目录路径（默认: backups）
            max_backups: 最大备份数量（默认: 7）
        """
        self.db_path = Path(db_path)
        self.backup_dir = Path(backup_dir or self.DEFAULT_BACKUP_DIR)
        self.max_backups = max_backups
        self.scheduler: Optional[AsyncIOScheduler] = None
        
        # 确保备份目录存在
        self.backup_dir.mkdir(parents=True, exist_ok=True)
    
    def _get_backup_filename(self) -> str:
        """生成带时间戳的备份文件名"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        return f"taskflow_backup_{timestamp}.db"
    
    def _get_backup_files(self) -> List[Path]:
        """
        获取所有备份文件列表，按修改时间排序（最新的在前）
        
        Returns:
            备份文件路径列表
        """
        if not self.backup_dir.exists():
            return []
        
        backup_files = list(self.backup_dir.glob("taskflow_backup_*.db"))
        # 按修改时间降序排序（最新的在前）
        backup_files.sort(key=lambda f: f.stat().st_mtime, reverse=True)
        return backup_files
    
    def _cleanup_old_backups(self) -> int:
        """
        清理超出保留数量的旧备份
        
        Returns:
            删除的文件数量
        """
        backup_files = self._get_backup_files()
        deleted_count = 0
        
        # 删除超出最大数量的旧备份
        for old_file in backup_files[self.max_backups:]:
            try:
                old_file.unlink()
                deleted_count += 1
                print(f"🗑️  已删除旧备份: {old_file.name}")
            except Exception as e:
                print(f"⚠️  删除备份失败 {old_file.name}: {e}")
        
        return deleted_count
    
    async def backup(self) -> Optional[str]:
        """
        执行数据库备份
        
        使用 SQLite 的 backup API 进行热备份，确保数据一致性。
        WAL 模式下的未提交事务也会被正确处理。
        
        Returns:
            备份文件路径（成功）或 None（失败）
        """
        if not self.db_path.exists():
            print(f"⚠️  数据库文件不存在: {self.db_path}")
            return None
        
        backup_filename = self._get_backup_filename()
        backup_path = self.backup_dir / backup_filename
        
        try:
            import sqlite3
            
            # 使用 SQLite 的 backup API 进行热备份
            # 这会自动处理 WAL 模式，确保数据一致性
            source_conn = sqlite3.connect(str(self.db_path))
            backup_conn = sqlite3.connect(str(backup_path))
            
            with backup_conn:
                source_conn.backup(backup_conn)
            
            source_conn.close()
            backup_conn.close()
            
            backup_size = backup_path.stat().st_size / 1024  # KB
            print(f"✅ 数据库备份成功: {backup_filename} ({backup_size:.1f} KB)")
            
            # 清理旧备份
            self._cleanup_old_backups()
            
            return str(backup_path)
            
        except Exception as e:
            print(f"❌ 数据库备份失败: {e}")
            return None
    
    def get_backup_status(self) -> dict:
        """
        获取备份状态信息
        
        Returns:
            包含备份信息的字典
        """
        backup_files = self._get_backup_files()
        
        latest_backup = None
        if backup_files:
            latest_file = backup_files[0]
            latest_backup = {
                "filename": latest_file.name,
                "size_kb": latest_file.stat().st_size / 1024,
                "created_at": datetime.fromtimestamp(
                    latest_file.stat().st_mtime
                ).isoformat()
            }
        
        return {
            "enabled": self.scheduler is not None and self.scheduler.running,
            "backup_dir": str(self.backup_dir.absolute()),
            "max_backups": self.max_backups,
            "current_backup_count": len(backup_files),
            "latest_backup": latest_backup,
            "next_run": self._get_next_run_time()
        }
    
    def _get_next_run_time(self) -> Optional[str]:
        """获取下次运行时间"""
        if self.scheduler and self.scheduler.running:
            jobs = self.scheduler.get_jobs()
            if jobs:
                next_run = jobs[0].next_run_time
                if next_run:
                    return next_run.isoformat()
        return None
    
    def start_scheduler(
        self,
        hour: int = DEFAULT_BACKUP_HOUR,
        minute: int = DEFAULT_BACKUP_MINUTE
    ) -> None:
        """
        启动定时备份调度器
        
        Args:
            hour: 备份时间（小时，24小时制）
            minute: 备份时间（分钟）
        """
        if self.scheduler is not None:
            print("⚠️  调度器已在运行")
            return
        
        self.scheduler = AsyncIOScheduler()
        
        # 添加定时任务：每天指定时间执行备份
        self.scheduler.add_job(
            self.backup,
            trigger=CronTrigger(hour=hour, minute=minute),
            id="daily_backup",
            name="每日数据库备份",
            replace_existing=True
        )
        
        self.scheduler.start()
        print(f"📅 数据库备份调度器已启动 (每天 {hour:02d}:{minute:02d})")
    
    def stop_scheduler(self) -> None:
        """停止定时备份调度器"""
        if self.scheduler:
            self.scheduler.shutdown(wait=False)
            self.scheduler = None
            print("🛑 数据库备份调度器已停止")


# 全局备份服务实例
_backup_service: Optional[BackupService] = None


def get_backup_service() -> BackupService:
    """
    获取全局备份服务实例
    
    Returns:
        BackupService: 备份服务实例
    """
    global _backup_service
    if _backup_service is None:
        # 使用相对于 backend 目录的路径
        from app.models.base import get_database_url
        
        db_url = get_database_url()
        # 从 sqlite+aiosqlite:///./taskflow.db 提取数据库路径
        if "sqlite" in db_url:
            # 移除协议前缀
            db_path = db_url.split("///")[-1]
            # 转换相对路径
            if db_path.startswith("./"):
                db_path = db_path[2:]
        else:
            db_path = "taskflow.db"
        
        _backup_service = BackupService(
            db_path=db_path,
            backup_dir="backups",
            max_backups=7
        )
    
    return _backup_service
