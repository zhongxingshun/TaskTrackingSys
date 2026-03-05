# -*- coding: utf-8 -*-
"""
文件上传 API

支持图片等文件的上传和访问。
"""

import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, File, UploadFile, HTTPException
from fastapi.responses import FileResponse

router = APIRouter()

# 上传文件存储目录（支持环境变量配置）
UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", str(Path(__file__).parent.parent.parent.parent / "uploads")))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# 允许的图片类型
ALLOWED_IMAGE_TYPES = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/svg+xml": "svg",
}

# 最大文件大小 (10MB)
MAX_FILE_SIZE = 10 * 1024 * 1024


@router.post("/image", summary="上传图片")
async def upload_image(
    file: UploadFile = File(..., description="要上传的图片文件")
):
    """
    上传图片文件
    
    - 支持格式: PNG, JPEG, GIF, WebP, SVG
    - 最大大小: 10MB
    - 返回图片访问 URL
    """
    # 验证文件类型
    content_type = file.content_type or ""
    if content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"不支持的图片类型: {content_type}。支持的类型: {', '.join(ALLOWED_IMAGE_TYPES.keys())}"
        )
    
    # 读取文件内容
    content = await file.read()
    
    # 验证文件大小
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"文件过大，最大允许 {MAX_FILE_SIZE // 1024 // 1024}MB"
        )
    
    # 生成唯一文件名
    ext = ALLOWED_IMAGE_TYPES[content_type]
    date_prefix = datetime.now().strftime("%Y%m%d")
    unique_id = uuid.uuid4().hex[:8]
    filename = f"{date_prefix}_{unique_id}.{ext}"
    
    # 保存文件
    file_path = UPLOAD_DIR / filename
    with open(file_path, "wb") as f:
        f.write(content)
    
    # 返回访问 URL
    return {
        "success": True,
        "filename": filename,
        "url": f"/api/v1/uploads/files/{filename}",
        "size": len(content),
        "content_type": content_type
    }


@router.get("/files/{filename}", summary="获取上传的文件")
async def get_uploaded_file(filename: str):
    """
    获取上传的文件
    
    通过文件名访问已上传的文件。
    """
    # 安全性检查：防止路径遍历
    if ".." in filename or "/" in filename or "\\" in filename:
        raise HTTPException(status_code=400, detail="无效的文件名")
    
    file_path = UPLOAD_DIR / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="文件不存在")
    
    # 根据扩展名确定 content-type
    ext = filename.split(".")[-1].lower()
    content_types = {
        "png": "image/png",
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "gif": "image/gif",
        "webp": "image/webp",
        "svg": "image/svg+xml",
    }
    
    return FileResponse(
        path=file_path,
        media_type=content_types.get(ext, "application/octet-stream"),
    )


@router.delete("/files/{filename}", summary="删除上传的文件")
async def delete_uploaded_file(filename: str):
    """
    删除上传的文件
    """
    # 安全性检查
    if ".." in filename or "/" in filename or "\\" in filename:
        raise HTTPException(status_code=400, detail="无效的文件名")
    
    file_path = UPLOAD_DIR / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="文件不存在")
    
    os.remove(file_path)
    
    return {"success": True, "message": "文件已删除"}
