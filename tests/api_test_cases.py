#!/usr/bin/env python3
"""
TaskFlow API 自测用例
基于 API_DOCUMENTATION.md 编写的自动化测试脚本

测试模块:
1. 认证模块 (/api/v1/auth)
2. 任务模块 (/api/v1/tasks)
3. 设备模块 (/api/v1/devices)
4. 用户管理模块 (/api/v1/users)
"""

import requests
import json
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from typing import Optional, List
import uuid
import time

# 配置
BASE_URL = "http://localhost:8000/api/v1"
ADMIN_EMAIL = "admin@taskflow.com"
ADMIN_PASSWORD = "admin123"

# 测试结果收集
@dataclass
class TestResult:
    name: str
    module: str
    passed: bool
    message: str
    response_code: Optional[int] = None
    duration: float = 0.0

@dataclass
class TestReport:
    results: List[TestResult] = field(default_factory=list)
    start_time: datetime = field(default_factory=datetime.now)
    end_time: Optional[datetime] = None
    
    def add_result(self, result: TestResult):
        self.results.append(result)
    
    def passed_count(self) -> int:
        return sum(1 for r in self.results if r.passed)
    
    def failed_count(self) -> int:
        return sum(1 for r in self.results if not r.passed)
    
    def total_count(self) -> int:
        return len(self.results)
    
    def pass_rate(self) -> float:
        if self.total_count() == 0:
            return 0.0
        return self.passed_count() / self.total_count() * 100
    
    def generate_markdown(self) -> str:
        self.end_time = datetime.now()
        duration = (self.end_time - self.start_time).total_seconds()
        
        md = f"""# TaskFlow API 自测报告

## 测试概况

| 项目 | 结果 |
|------|------|
| 测试时间 | {self.start_time.strftime('%Y-%m-%d %H:%M:%S')} |
| 测试耗时 | {duration:.2f} 秒 |
| 总用例数 | {self.total_count()} |
| 通过数 | {self.passed_count()} |
| 失败数 | {self.failed_count()} |
| 通过率 | {self.pass_rate():.1f}% |

## 测试结果详情

"""
        
        # 按模块分组
        modules = {}
        for result in self.results:
            if result.module not in modules:
                modules[result.module] = []
            modules[result.module].append(result)
        
        for module, results in modules.items():
            passed = sum(1 for r in results if r.passed)
            failed = sum(1 for r in results if not r.passed)
            md += f"### {module}\n\n"
            md += f"✅ 通过: {passed} | ❌ 失败: {failed}\n\n"
            md += "| 用例名称 | 状态 | HTTP状态码 | 耗时 | 说明 |\n"
            md += "|----------|------|-----------|------|------|\n"
            for r in results:
                status = "✅ 通过" if r.passed else "❌ 失败"
                code = str(r.response_code) if r.response_code else "-"
                md += f"| {r.name} | {status} | {code} | {r.duration:.3f}s | {r.message} |\n"
            md += "\n"
        
        # 失败详情
        failed_results = [r for r in self.results if not r.passed]
        if failed_results:
            md += "## 失败用例详情\n\n"
            for r in failed_results:
                md += f"### ❌ {r.module} - {r.name}\n"
                md += f"- HTTP 状态码: {r.response_code}\n"
                md += f"- 错误信息: {r.message}\n\n"
        
        return md


class APITestRunner:
    def __init__(self):
        self.report = TestReport()
        self.token: Optional[str] = None
        self.test_user_id: Optional[str] = None
        self.test_device_id: Optional[str] = None
        self.test_task_id: Optional[str] = None
        self.test_role_id: Optional[str] = None
    
    def run_test(self, name: str, module: str, test_func):
        """运行单个测试用例"""
        start_time = time.time()
        try:
            response_code, passed, message = test_func()
            duration = time.time() - start_time
            result = TestResult(
                name=name,
                module=module,
                passed=passed,
                message=message,
                response_code=response_code,
                duration=duration
            )
        except Exception as e:
            duration = time.time() - start_time
            result = TestResult(
                name=name,
                module=module,
                passed=False,
                message=f"异常: {str(e)}",
                duration=duration
            )
        self.report.add_result(result)
        status = "✅" if result.passed else "❌"
        print(f"  {status} {name}: {result.message}")
    
    def get_headers(self, with_auth=True):
        """获取请求头"""
        headers = {"Content-Type": "application/json"}
        if with_auth and self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        return headers
    
    # ==================== 认证模块测试 ====================
    
    def test_auth_module(self):
        print("\n📦 认证模块 (/api/v1/auth)")
        print("=" * 50)
        
        # 1.1 用户登录 (OAuth2 格式) - 正确凭据
        def test_login_oauth2_success():
            resp = requests.post(
                f"{BASE_URL}/auth/login",
                data={"username": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            if resp.status_code == 200:
                data = resp.json()
                self.token = data.get("access_token")
                if self.token:
                    return resp.status_code, True, "成功获取 access_token"
                return resp.status_code, False, "响应中缺少 access_token"
            return resp.status_code, False, resp.text[:100]
        
        self.run_test("用户登录(OAuth2格式)-正确凭据", "认证模块", test_login_oauth2_success)
        
        # 1.2 用户登录 (OAuth2 格式) - 错误密码
        def test_login_oauth2_wrong_password():
            resp = requests.post(
                f"{BASE_URL}/auth/login",
                data={"username": ADMIN_EMAIL, "password": "wrongpassword"},
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            return resp.status_code, resp.status_code == 401, "正确返回 401 未授权" if resp.status_code == 401 else f"期望 401，实际 {resp.status_code}"
        
        self.run_test("用户登录(OAuth2格式)-错误密码", "认证模块", test_login_oauth2_wrong_password)
        
        # 1.3 用户登录 (JSON 格式) - 正确凭据
        def test_login_json_success():
            resp = requests.post(
                f"{BASE_URL}/auth/login/json",
                json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
            )
            if resp.status_code == 200:
                data = resp.json()
                if data.get("access_token"):
                    return resp.status_code, True, "成功获取 access_token"
                return resp.status_code, False, "响应中缺少 access_token"
            return resp.status_code, False, resp.text[:100]
        
        self.run_test("用户登录(JSON格式)-正确凭据", "认证模块", test_login_json_success)
        
        # 1.4 获取当前用户信息
        def test_get_current_user():
            resp = requests.get(f"{BASE_URL}/auth/me", headers=self.get_headers())
            if resp.status_code == 200:
                data = resp.json()
                if data.get("email") == ADMIN_EMAIL:
                    return resp.status_code, True, f"用户: {data.get('username')}"
                return resp.status_code, False, "返回的用户信息不匹配"
            return resp.status_code, False, resp.text[:100]
        
        self.run_test("获取当前用户信息", "认证模块", test_get_current_user)
        
        # 1.5 无 Token 访问受保护资源
        def test_access_without_token():
            resp = requests.get(f"{BASE_URL}/auth/me")
            return resp.status_code, resp.status_code == 401, "正确返回 401" if resp.status_code == 401 else f"期望 401，实际 {resp.status_code}"
        
        self.run_test("无Token访问受保护资源", "认证模块", test_access_without_token)
        
        # 1.6 用户注册
        test_username = f"testuser_{uuid.uuid4().hex[:8]}"
        test_email = f"{test_username}@test.com"
        def test_register():
            resp = requests.post(
                f"{BASE_URL}/auth/register",
                json={
                    "username": test_username,
                    "email": test_email,
                    "password": "test123456",
                    "display_name": "测试用户"
                }
            )
            if resp.status_code == 201:
                data = resp.json()
                self.test_user_id = data.get("id")
                return resp.status_code, True, f"注册成功: {test_username}"
            return resp.status_code, False, resp.text[:100]
        
        self.run_test("用户注册", "认证模块", test_register)
        
        # 1.7 重复注册（应失败）
        def test_duplicate_register():
            resp = requests.post(
                f"{BASE_URL}/auth/register",
                json={
                    "username": test_username,
                    "email": test_email,
                    "password": "test123456"
                }
            )
            return resp.status_code, resp.status_code == 400, "正确返回 400 重复注册" if resp.status_code == 400 else f"期望 400，实际 {resp.status_code}"
        
        self.run_test("重复注册(应失败)", "认证模块", test_duplicate_register)
        
        # 1.8 修改密码
        def test_change_password():
            # 先用新用户登录
            login_resp = requests.post(
                f"{BASE_URL}/auth/login/json",
                json={"email": test_email, "password": "test123456"}
            )
            if login_resp.status_code != 200:
                return login_resp.status_code, False, "登录失败"
            
            new_token = login_resp.json().get("access_token")
            
            # 修改密码
            resp = requests.post(
                f"{BASE_URL}/auth/change-password",
                json={"old_password": "test123456", "new_password": "newpass123"},
                headers={"Authorization": f"Bearer {new_token}", "Content-Type": "application/json"}
            )
            if resp.status_code == 200:
                return resp.status_code, True, "密码修改成功"
            return resp.status_code, False, resp.text[:100]
        
        self.run_test("修改密码", "认证模块", test_change_password)
    
    # ==================== 设备模块测试 ====================
    
    def test_device_module(self):
        print("\n📦 设备模块 (/api/v1/devices)")
        print("=" * 50)
        
        # 3.1 创建设备
        test_device_name = f"TestDevice_{uuid.uuid4().hex[:8]}"
        def test_create_device():
            resp = requests.post(
                f"{BASE_URL}/devices",
                json={
                    "name": test_device_name,
                    "category": "嵌入式室内机",
                    "description": "自动化测试创建的设备"
                },
                headers=self.get_headers()
            )
            if resp.status_code == 201:
                data = resp.json()
                self.test_device_id = data.get("id")
                return resp.status_code, True, f"设备创建成功: {test_device_name}"
            return resp.status_code, False, resp.text[:100]
        
        self.run_test("创建设备", "设备模块", test_create_device)
        
        # 3.2 获取设备列表
        def test_get_device_list():
            resp = requests.get(f"{BASE_URL}/devices", headers=self.get_headers())
            if resp.status_code == 200:
                data = resp.json()
                return resp.status_code, True, f"获取 {data.get('total', 0)} 个设备"
            return resp.status_code, False, resp.text[:100]
        
        self.run_test("获取设备列表", "设备模块", test_get_device_list)
        
        # 3.3 获取所有设备（不分页）
        def test_get_all_devices():
            resp = requests.get(f"{BASE_URL}/devices/all", headers=self.get_headers())
            if resp.status_code == 200:
                data = resp.json()
                return resp.status_code, True, f"获取 {len(data)} 个设备"
            return resp.status_code, False, resp.text[:100]
        
        self.run_test("获取所有设备(不分页)", "设备模块", test_get_all_devices)
        
        # 3.4 获取设备类别列表
        def test_get_device_categories():
            resp = requests.get(f"{BASE_URL}/devices/categories", headers=self.get_headers())
            if resp.status_code == 200:
                data = resp.json()
                return resp.status_code, True, f"获取 {len(data)} 个类别"
            return resp.status_code, False, resp.text[:100]
        
        self.run_test("获取设备类别列表", "设备模块", test_get_device_categories)
        
        # 3.5 获取设备详情
        def test_get_device_detail():
            if not self.test_device_id:
                return None, False, "无测试设备ID"
            resp = requests.get(f"{BASE_URL}/devices/{self.test_device_id}", headers=self.get_headers())
            if resp.status_code == 200:
                data = resp.json()
                return resp.status_code, True, f"设备: {data.get('name')}"
            return resp.status_code, False, resp.text[:100]
        
        self.run_test("获取设备详情", "设备模块", test_get_device_detail)
        
        # 3.6 更新设备
        def test_update_device():
            if not self.test_device_id:
                return None, False, "无测试设备ID"
            resp = requests.put(
                f"{BASE_URL}/devices/{self.test_device_id}",
                json={"description": "更新后的描述"},
                headers=self.get_headers()
            )
            if resp.status_code == 200:
                return resp.status_code, True, "设备更新成功"
            return resp.status_code, False, resp.text[:100]
        
        self.run_test("更新设备", "设备模块", test_update_device)
        
        # 3.7 按类别筛选设备
        def test_filter_devices_by_category():
            resp = requests.get(
                f"{BASE_URL}/devices",
                params={"category": "嵌入式室内机"},
                headers=self.get_headers()
            )
            if resp.status_code == 200:
                data = resp.json()
                return resp.status_code, True, f"筛选到 {data.get('total', 0)} 个设备"
            return resp.status_code, False, resp.text[:100]
        
        self.run_test("按类别筛选设备", "设备模块", test_filter_devices_by_category)
        
        # 3.8 创建重复设备（应失败）
        def test_create_duplicate_device():
            resp = requests.post(
                f"{BASE_URL}/devices",
                json={"name": test_device_name, "category": "测试"},
                headers=self.get_headers()
            )
            return resp.status_code, resp.status_code == 400, "正确返回 400" if resp.status_code == 400 else f"期望 400，实际 {resp.status_code}"
        
        self.run_test("创建重复设备(应失败)", "设备模块", test_create_duplicate_device)
    
    # ==================== 任务模块测试 ====================
    
    def test_task_module(self):
        print("\n📦 任务模块 (/api/v1/tasks)")
        print("=" * 50)
        
        # 2.1 创建任务
        def test_create_task():
            device_ids = [self.test_device_id] if self.test_device_id else []
            resp = requests.post(
                f"{BASE_URL}/tasks",
                json={
                    "title": f"测试任务_{uuid.uuid4().hex[:8]}",
                    "source": "Internal_RD",
                    "description": "自动化测试创建的任务",
                    "priority": 3,
                    "target_date": (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d"),
                    "device_ids": device_ids
                },
                headers=self.get_headers()
            )
            if resp.status_code == 201:
                data = resp.json()
                self.test_task_id = data.get("id")
                return resp.status_code, True, f"任务创建成功: {data.get('task_id')}"
            return resp.status_code, False, resp.text[:100]
        
        self.run_test("创建任务", "任务模块", test_create_task)
        
        # 2.2 获取任务列表
        def test_get_task_list():
            resp = requests.get(f"{BASE_URL}/tasks", headers=self.get_headers())
            if resp.status_code == 200:
                data = resp.json()
                return resp.status_code, True, f"获取 {data.get('total', 0)} 个任务"
            return resp.status_code, False, resp.text[:100]
        
        self.run_test("获取任务列表", "任务模块", test_get_task_list)
        
        # 2.3 获取任务详情
        def test_get_task_detail():
            if not self.test_task_id:
                return None, False, "无测试任务ID"
            resp = requests.get(f"{BASE_URL}/tasks/{self.test_task_id}", headers=self.get_headers())
            if resp.status_code == 200:
                data = resp.json()
                return resp.status_code, True, f"任务: {data.get('title')}"
            return resp.status_code, False, resp.text[:100]
        
        self.run_test("获取任务详情", "任务模块", test_get_task_detail)
        
        # 2.4 更新任务
        def test_update_task():
            if not self.test_task_id:
                return None, False, "无测试任务ID"
            resp = requests.put(
                f"{BASE_URL}/tasks/{self.test_task_id}",
                json={"title": "更新后的任务标题", "priority": 4},
                headers=self.get_headers()
            )
            if resp.status_code == 200:
                return resp.status_code, True, "任务更新成功"
            return resp.status_code, False, resp.text[:100]
        
        self.run_test("更新任务", "任务模块", test_update_task)
        
        # 2.5 更新任务状态 - Backlog -> In_Progress
        def test_update_task_status_in_progress():
            if not self.test_task_id:
                return None, False, "无测试任务ID"
            resp = requests.patch(
                f"{BASE_URL}/tasks/{self.test_task_id}/status",
                json={"status": "In_Progress", "comment": "开始开发"},
                headers=self.get_headers()
            )
            if resp.status_code == 200:
                data = resp.json()
                return resp.status_code, True, f"状态变更为: {data.get('status')}"
            return resp.status_code, False, resp.text[:100]
        
        self.run_test("更新任务状态(Backlog->In_Progress)", "任务模块", test_update_task_status_in_progress)
        
        # 2.6 更新任务进度
        def test_update_task_progress():
            if not self.test_task_id:
                return None, False, "无测试任务ID"
            resp = requests.patch(
                f"{BASE_URL}/tasks/{self.test_task_id}/progress",
                json={"progress": 50, "comment": "完成50%"},
                headers=self.get_headers()
            )
            if resp.status_code == 200:
                data = resp.json()
                return resp.status_code, True, f"进度: {data.get('progress')}%"
            return resp.status_code, False, resp.text[:100]
        
        self.run_test("更新任务进度", "任务模块", test_update_task_progress)
        
        # 2.7 更新任务状态 - In_Progress -> Testing
        def test_update_task_status_testing():
            if not self.test_task_id:
                return None, False, "无测试任务ID"
            resp = requests.patch(
                f"{BASE_URL}/tasks/{self.test_task_id}/status",
                json={"status": "Testing", "comment": "进入测试阶段"},
                headers=self.get_headers()
            )
            if resp.status_code == 200:
                data = resp.json()
                return resp.status_code, True, f"状态变更为: {data.get('status')}"
            return resp.status_code, False, resp.text[:100]
        
        self.run_test("更新任务状态(In_Progress->Testing)", "任务模块", test_update_task_status_testing)
        
        # 2.8 按状态筛选任务
        def test_filter_tasks_by_status():
            resp = requests.get(
                f"{BASE_URL}/tasks",
                params={"status": "Testing"},
                headers=self.get_headers()
            )
            if resp.status_code == 200:
                data = resp.json()
                return resp.status_code, True, f"筛选到 {data.get('total', 0)} 个测试中任务"
            return resp.status_code, False, resp.text[:100]
        
        self.run_test("按状态筛选任务", "任务模块", test_filter_tasks_by_status)
        
        # 2.9 搜索任务
        def test_search_tasks():
            resp = requests.get(
                f"{BASE_URL}/tasks",
                params={"search": "更新后"},
                headers=self.get_headers()
            )
            if resp.status_code == 200:
                data = resp.json()
                return resp.status_code, True, f"搜索到 {data.get('total', 0)} 个任务"
            return resp.status_code, False, resp.text[:100]
        
        self.run_test("搜索任务", "任务模块", test_search_tasks)
        
        # 2.10 更新设备状态
        def test_update_device_status():
            if not self.test_task_id or not self.test_device_id:
                return None, False, "无测试任务或设备ID"
            resp = requests.patch(
                f"{BASE_URL}/tasks/{self.test_task_id}/devices/{self.test_device_id}/status",
                params={"new_status": "in_progress"},
                headers=self.get_headers()
            )
            if resp.status_code == 200:
                return resp.status_code, True, "设备状态更新成功"
            return resp.status_code, False, resp.text[:100]
        
        self.run_test("更新设备状态", "任务模块", test_update_device_status)
        
        # 2.11 添加禅道关联
        def test_add_zentao():
            if not self.test_task_id or not self.test_device_id:
                return None, False, "无测试任务或设备ID"
            resp = requests.post(
                f"{BASE_URL}/tasks/{self.test_task_id}/devices/{self.test_device_id}/zentao",
                params={
                    "zentao_type": "story",
                    "zentao_id": "12345",
                    "zentao_title": "测试需求",
                    "zentao_url": "http://zentao.example.com/story-12345.html"
                },
                headers=self.get_headers()
            )
            if resp.status_code == 200:
                return resp.status_code, True, "禅道关联添加成功"
            return resp.status_code, False, resp.text[:100]
        
        self.run_test("添加禅道关联", "任务模块", test_add_zentao)
        
        # 2.12 删除禅道关联
        def test_remove_zentao():
            if not self.test_task_id or not self.test_device_id:
                return None, False, "无测试任务或设备ID"
            resp = requests.delete(
                f"{BASE_URL}/tasks/{self.test_task_id}/devices/{self.test_device_id}/zentao",
                headers=self.get_headers()
            )
            if resp.status_code == 200:
                return resp.status_code, True, "禅道关联删除成功"
            return resp.status_code, False, resp.text[:100]
        
        self.run_test("删除禅道关联", "任务模块", test_remove_zentao)
        
        # 2.13 更新任务状态 - Testing -> Closed
        def test_update_task_status_closed():
            if not self.test_task_id:
                return None, False, "无测试任务ID"
            resp = requests.patch(
                f"{BASE_URL}/tasks/{self.test_task_id}/status",
                json={
                    "status": "Closed",
                    "actual_date": datetime.now().strftime("%Y-%m-%d"),
                    "comment": "任务完成"
                },
                headers=self.get_headers()
            )
            if resp.status_code == 200:
                data = resp.json()
                return resp.status_code, True, f"状态变更为: {data.get('status')}"
            return resp.status_code, False, resp.text[:100]
        
        self.run_test("更新任务状态(Testing->Closed)", "任务模块", test_update_task_status_closed)
        
        # 2.14 归档任务
        def test_archive_task():
            if not self.test_task_id:
                return None, False, "无测试任务ID"
            resp = requests.post(
                f"{BASE_URL}/tasks/{self.test_task_id}/archive",
                headers=self.get_headers()
            )
            if resp.status_code == 200:
                data = resp.json()
                return resp.status_code, True, f"任务已归档: {data.get('status')}"
            return resp.status_code, False, resp.text[:100]
        
        self.run_test("归档任务", "任务模块", test_archive_task)
        
        # 2.15 获取不存在的任务
        def test_get_nonexistent_task():
            fake_id = str(uuid.uuid4())
            resp = requests.get(f"{BASE_URL}/tasks/{fake_id}", headers=self.get_headers())
            return resp.status_code, resp.status_code == 404, "正确返回 404" if resp.status_code == 404 else f"期望 404，实际 {resp.status_code}"
        
        self.run_test("获取不存在的任务(应404)", "任务模块", test_get_nonexistent_task)
    
    # ==================== 用户管理模块测试 ====================
    
    def test_user_module(self):
        print("\n📦 用户管理模块 (/api/v1/users)")
        print("=" * 50)
        
        # 4.1 获取用户列表
        def test_get_user_list():
            resp = requests.get(f"{BASE_URL}/users", headers=self.get_headers())
            if resp.status_code == 200:
                data = resp.json()
                return resp.status_code, True, f"获取 {data.get('total', 0)} 个用户"
            return resp.status_code, False, resp.text[:100]
        
        self.run_test("获取用户列表", "用户管理模块", test_get_user_list)
        
        # 4.2 创建用户
        new_user_name = f"newuser_{uuid.uuid4().hex[:8]}"
        def test_create_user():
            resp = requests.post(
                f"{BASE_URL}/users",
                json={
                    "username": new_user_name,
                    "email": f"{new_user_name}@test.com",
                    "password": "test123456",
                    "display_name": "新创建的用户",
                    "department": "测试部门"
                },
                headers=self.get_headers()
            )
            if resp.status_code == 201:
                data = resp.json()
                return resp.status_code, True, f"用户创建成功: {data.get('username')}"
            return resp.status_code, False, resp.text[:100]
        
        self.run_test("创建用户", "用户管理模块", test_create_user)
        
        # 4.3 获取用户详情
        def test_get_user_detail():
            if not self.test_user_id:
                return None, False, "无测试用户ID"
            resp = requests.get(f"{BASE_URL}/users/{self.test_user_id}", headers=self.get_headers())
            if resp.status_code == 200:
                data = resp.json()
                return resp.status_code, True, f"用户: {data.get('username')}"
            return resp.status_code, False, resp.text[:100]
        
        self.run_test("获取用户详情", "用户管理模块", test_get_user_detail)
        
        # 4.4 更新用户
        def test_update_user():
            if not self.test_user_id:
                return None, False, "无测试用户ID"
            resp = requests.put(
                f"{BASE_URL}/users/{self.test_user_id}",
                json={"display_name": "更新后的显示名", "department": "研发部"},
                headers=self.get_headers()
            )
            if resp.status_code == 200:
                return resp.status_code, True, "用户更新成功"
            return resp.status_code, False, resp.text[:100]
        
        self.run_test("更新用户", "用户管理模块", test_update_user)
        
        # 4.5 按部门筛选用户
        def test_filter_users_by_department():
            resp = requests.get(
                f"{BASE_URL}/users",
                params={"department": "研发部"},
                headers=self.get_headers()
            )
            if resp.status_code == 200:
                data = resp.json()
                return resp.status_code, True, f"筛选到 {data.get('total', 0)} 个用户"
            return resp.status_code, False, resp.text[:100]
        
        self.run_test("按部门筛选用户", "用户管理模块", test_filter_users_by_department)
        
        # 4.6 获取角色列表
        def test_get_role_list():
            resp = requests.get(f"{BASE_URL}/users/roles/list", headers=self.get_headers())
            if resp.status_code == 200:
                data = resp.json()
                items = data.get("items", [])
                if items:
                    self.test_role_id = items[0].get("id")
                return resp.status_code, True, f"获取 {data.get('total', 0)} 个角色"
            return resp.status_code, False, resp.text[:100]
        
        self.run_test("获取角色列表", "用户管理模块", test_get_role_list)
        
        # 4.7 创建角色
        new_role_code = f"test_role_{uuid.uuid4().hex[:8]}"
        created_role_id = None
        def test_create_role():
            nonlocal created_role_id
            resp = requests.post(
                f"{BASE_URL}/users/roles",
                json={
                    "code": new_role_code,
                    "name": "测试角色",
                    "description": "自动化测试创建的角色",
                    "permission_codes": ["task:view", "task:edit"]
                },
                headers=self.get_headers()
            )
            if resp.status_code == 201:
                data = resp.json()
                created_role_id = data.get("id")
                return resp.status_code, True, f"角色创建成功: {data.get('name')}"
            return resp.status_code, False, resp.text[:100]
        
        self.run_test("创建角色", "用户管理模块", test_create_role)
        
        # 4.8 更新角色
        def test_update_role():
            if not created_role_id:
                return None, False, "无测试角色ID"
            resp = requests.put(
                f"{BASE_URL}/users/roles/{created_role_id}",
                json={"name": "更新后的角色名", "permission_codes": ["task:view"]},
                headers=self.get_headers()
            )
            if resp.status_code == 200:
                return resp.status_code, True, "角色更新成功"
            return resp.status_code, False, resp.text[:100]
        
        self.run_test("更新角色", "用户管理模块", test_update_role)
        
        # 4.9 分配用户角色
        def test_assign_user_role():
            if not self.test_user_id or not self.test_role_id:
                return None, False, "无测试用户或角色ID"
            resp = requests.put(
                f"{BASE_URL}/users/{self.test_user_id}/roles",
                json=[self.test_role_id],
                headers=self.get_headers()
            )
            if resp.status_code == 200:
                return resp.status_code, True, "角色分配成功"
            return resp.status_code, False, resp.text[:100]
        
        self.run_test("分配用户角色", "用户管理模块", test_assign_user_role)
        
        # 4.10 获取权限列表
        def test_get_permission_list():
            resp = requests.get(f"{BASE_URL}/users/permissions/list", headers=self.get_headers())
            if resp.status_code == 200:
                data = resp.json()
                return resp.status_code, True, f"获取 {len(data)} 个权限"
            return resp.status_code, False, resp.text[:100]
        
        self.run_test("获取权限列表", "用户管理模块", test_get_permission_list)
        
        # 4.11 删除角色
        def test_delete_role():
            if not created_role_id:
                return None, False, "无测试角色ID"
            resp = requests.delete(
                f"{BASE_URL}/users/roles/{created_role_id}",
                headers=self.get_headers()
            )
            if resp.status_code == 200:
                return resp.status_code, True, "角色删除成功"
            return resp.status_code, False, resp.text[:100]
        
        self.run_test("删除角色", "用户管理模块", test_delete_role)
    
    # ==================== 清理测试数据 ====================
    
    def cleanup(self):
        print("\n🧹 清理测试数据")
        print("=" * 50)
        
        # 删除测试任务
        def test_delete_task():
            if not self.test_task_id:
                return None, False, "无测试任务ID"
            resp = requests.delete(
                f"{BASE_URL}/tasks/{self.test_task_id}",
                headers=self.get_headers()
            )
            if resp.status_code == 200:
                return resp.status_code, True, "任务删除成功"
            return resp.status_code, False, resp.text[:100]
        
        self.run_test("删除测试任务", "清理", test_delete_task)
        
        # 删除测试设备
        def test_delete_device():
            if not self.test_device_id:
                return None, False, "无测试设备ID"
            resp = requests.delete(
                f"{BASE_URL}/devices/{self.test_device_id}",
                headers=self.get_headers()
            )
            if resp.status_code == 200:
                return resp.status_code, True, "设备删除成功"
            return resp.status_code, False, resp.text[:100]
        
        self.run_test("删除测试设备", "清理", test_delete_device)
        
        # 删除测试用户
        def test_delete_user():
            if not self.test_user_id:
                return None, False, "无测试用户ID"
            resp = requests.delete(
                f"{BASE_URL}/users/{self.test_user_id}",
                headers=self.get_headers()
            )
            if resp.status_code == 200:
                return resp.status_code, True, "用户删除成功"
            return resp.status_code, False, resp.text[:100]
        
        self.run_test("删除测试用户", "清理", test_delete_user)
    
    # ==================== 运行所有测试 ====================
    
    def run_all_tests(self):
        print("\n" + "=" * 60)
        print("🚀 TaskFlow API 自动化测试")
        print("=" * 60)
        print(f"📅 测试时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"🔗 API 地址: {BASE_URL}")
        
        # 运行各模块测试
        self.test_auth_module()
        self.test_device_module()
        self.test_task_module()
        self.test_user_module()
        self.cleanup()
        
        # 生成报告
        print("\n" + "=" * 60)
        print("📊 测试完成")
        print("=" * 60)
        print(f"✅ 通过: {self.report.passed_count()}")
        print(f"❌ 失败: {self.report.failed_count()}")
        print(f"📈 通过率: {self.report.pass_rate():.1f}%")
        
        return self.report


def main():
    runner = APITestRunner()
    report = runner.run_all_tests()
    
    # 保存报告
    report_content = report.generate_markdown()
    report_path = "test_report.md"
    with open(report_path, "w", encoding="utf-8") as f:
        f.write(report_content)
    print(f"\n📄 测试报告已保存到: {report_path}")


if __name__ == "__main__":
    main()
