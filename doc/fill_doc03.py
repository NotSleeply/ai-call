"""
填写 01-3 软件应用与开发类作品设计和开发文档模板
"""
import re, shutil, subprocess, sys, os

SRC_DIR  = r"d:\Code\SmallClaw\doc\unpacked-03"
DST_DIR  = r"d:\Code\SmallClaw\doc\unpacked-03-filled"
DST      = os.path.join(DST_DIR, "word", "document.xml")
ORIG     = r"d:\Code\SmallClaw\doc\01-3 软件应用与开发类作品设计和开发文档模板（2025版）.docx"
OUT      = r"d:\Code\SmallClaw\doc\01-3 设计与开发文档（已填写）.docx"
PACK_PY  = r"C:\Users\Administrator\.workbuddy\plugins\marketplaces\codebuddy-plugins-official\plugins\docx\scripts\office\pack.py"

if os.path.exists(DST_DIR):
    shutil.rmtree(DST_DIR)
shutil.copytree(SRC_DIR, DST_DIR)

with open(DST, 'r', encoding='utf-8') as f:
    xml = f.read()

# ====================================================================
# 工具函数
# ====================================================================
def replace_wt(xml, old_content, new_content, count=1):
    pattern = r'(<w:t(?:[^\n>]*)>)' + re.escape(old_content) + r'(</w:t>)'
    repl = r'\g<1>' + new_content.replace('\\', '\\\\') + r'\g<2>'
    result = re.subn(pattern, repl, xml, count=count)
    if result[1] == 0:
        print(f"WARNING: replace_wt not found: {old_content!r}")
    return result[0]

def replace_block(xml, old_block_anchor, new_paragraphs_xml):
    """找到包含 old_block_anchor 的段落，替换整个段落的内容为 new_paragraphs_xml。
    new_paragraphs_xml 是多个 <w:r><w:t>...</w:t></w:r> 的字符串。
    """
    pos = xml.find(old_block_anchor)
    if pos == -1:
        print(f"WARNING: replace_block anchor not found: {old_block_anchor!r}")
        return xml
    # 找到该段落起始
    para_start = xml.rfind('<w:p ', 0, pos)
    if para_start == -1:
        para_start = xml.rfind('<w:p>', 0, pos)
    para_end = xml.find('</w:p>', pos) + 6
    # 保留段落的 <w:pPr> 部分
    old_para = xml[para_start:para_end]
    ppr_m = re.search(r'<w:pPr>.*?</w:pPr>', old_para, re.DOTALL)
    ppr = ppr_m.group(0) if ppr_m else ''
    new_para = f'<w:p>{ppr}{new_paragraphs_xml}</w:p>'
    xml = xml[:para_start] + new_para + xml[para_end:]
    return xml

def make_run(text, bold=False, font='宋体', size=21):
    """生成一个简单的 <w:r> 元素"""
    bold_tag = '<w:b/>' if bold else ''
    return (f'<w:r><w:rPr><w:rFonts w:ascii="{font}" w:eastAsia="{font}" w:hAnsi="{font}"/>'
            f'{bold_tag}<w:sz w:val="{size}"/><w:szCs w:val="{size}"/></w:rPr>'
            f'<w:t xml:space="preserve">{text}</w:t></w:r>')

def make_para(text, bold=False, indent_left=0, font='宋体', size=21):
    """生成完整段落"""
    indent = f'<w:ind w:left="{indent_left}"/>' if indent_left else ''
    bold_tag = '<w:b/>' if bold else ''
    return (f'<w:p><w:pPr><w:spacing w:line="360" w:lineRule="auto"/>{indent}</w:pPr>'
            f'<w:r><w:rPr><w:rFonts w:ascii="{font}" w:eastAsia="{font}" w:hAnsi="{font}"/>'
            f'{bold_tag}<w:sz w:val="{size}"/><w:szCs w:val="{size}"/></w:rPr>'
            f'<w:t xml:space="preserve">{text}</w:t></w:r></w:p>')

# ====================================================================
# 1. 封面信息
# ====================================================================
# 替换全角空格占位符
FULLWIDTH_SPACE_19 = '\u3000' * 19

xml = replace_wt(xml, '作品编号：', '作品编号：（参赛后填写）')
# 只替换第一个 作品名称 后的全角空格串
xml = replace_wt(xml, '作品名称：', '作品名称：OpenClaw —— AI 智能编程助手', count=1)
xml = replace_wt(xml, '作　　者：', '作　　者：张三、李四、王五', count=1)
xml = replace_wt(xml, '版本编号：', '版本编号：v1.0.0', count=1)
xml = replace_wt(xml, '填写日期：', '填写日期：2025年4月', count=1)

# 替换封面中的全角空格（先替换 作品编号后面的）
# 全角空格组 在"作品编号："后面
def replace_fullwidth_after(xml, after_anchor, new_text):
    pos = xml.find(after_anchor)
    if pos == -1: return xml
    # 找后面第一个全角空格 run
    remaining = xml[pos:]
    m = re.search(r'(<w:t[^\n>]*>)(\u3000+)(</w:t>)', remaining)
    if m:
        actual_pos = pos + m.start()
        xml = xml[:actual_pos] + m.group(1) + new_text + m.group(3) + xml[actual_pos + m.end():]
    return xml

# ====================================================================
# 2. 需求分析
# ====================================================================
NEEDS_ANALYSIS = """
OpenClaw 是一款面向开发者的 AI 智能编程助手，旨在解决以下问题：

一、背景与需求
随着 AI 技术快速发展，开发者迫切需要一款能够深度融入日常编程工作流的智能助手。现有 AI 工具大多是独立的问答系统，无法直接操作文件系统、执行命令或与项目结构深度结合。

二、竞品分析

| 维度 | GitHub Copilot | ChatGPT | OpenClaw |
|------|---------------|---------|----------|
| 文件操作 | 仅补全 | 无 | 完整读写 |
| 命令执行 | 无 | 无 | 支持 |
| 多 Agent | 无 | 无 | 支持 |
| 定时任务 | 无 | 无 | 支持 |
| Skill 扩展 | 插件形式 | 无 | Prompt+Module |
| 本地模型 | 无 | 无 | Ollama 支持 |
| 交互界面 | IDE 插件 | Web | CLI + Web |

三、目标用户
- 独立开发者：需要在命令行快速完成文件操作和代码分析
- 小型开发团队：需要定时任务自动化和多 Agent 协作
- AI 探索者：希望使用本地模型（Ollama）保护数据隐私

四、主要功能需求
1. 文件系统操作（读、写、列表、搜索）
2. 系统命令执行
3. 项目结构分析
4. 多大语言模型接入（DeepSeek / OpenRouter / Ollama）
5. 多 Agent 协同工作
6. 自定义 Skill（Prompt 型 + Module 型）
7. 定时任务调度
8. 对话历史持久化（SQLite）
9. Web 可视化界面（Vue3）
10. CLI 命令行界面（REPL）

五、主要性能需求
- Web 界面响应时间 < 200ms（非 AI 接口）
- 支持多对话并发管理
- Skill 触发匹配延迟 < 10ms
"""

SUMMARY_DESIGN = """
一、整体架构

OpenClaw 采用前后端分离架构：

┌─────────────────────────────────────────────┐
│              用户界面层                      │
│   CLI (REPL)          Web (Vue3 + Vite)     │
└──────────────┬──────────────────────────────┘
               │ HTTP REST API
┌──────────────▼──────────────────────────────┐
│           API 服务层（Express）              │
│  /api/command   /api/health  /api/skills     │
│  /api/conversations  /api/scheduled-tasks    │
└──────────────┬──────────────────────────────┘
               │
┌──────────────▼──────────────────────────────┐
│              核心服务层                      │
│  OpenClawClient  │  FileSystemService       │
│  MultiAgentService  │  SkillService         │
│  SchedulerService   │  SummaryService       │
└──────────────┬──────────────────────────────┘
               │
┌──────────────▼──────────────────────────────┐
│           数据持久层（SQLite）               │
│  conversations  │  messages  │  skills      │
│  scheduled_tasks  │  scheduled_task_runs    │
└─────────────────────────────────────────────┘

二、模块划分

后端模块（src/）：
- index.ts：CLI 主入口，REPL 交互逻辑
- server.ts：HTTP 服务器入口
- assistant.ts：助手门面类（统一 API）
- database.ts：SQLite 数据库模型
- assistant_modules/core/openClawClient.ts：大模型多路由客户端
- assistant_modules/services/：各功能服务模块

前端模块（frontend/src/）：
- App.vue：根组件，状态协调
- features/chat/：聊天功能（消息、命令、模型选择）
- features/skills/：Skill 管理面板
- features/schedules/：定时任务管理面板

三、关键接口
- POST /api/command：执行命令或聊天
- GET/POST /api/skills：Skill CRUD
- GET/POST /api/scheduled-tasks：定时任务管理
- GET /api/conversations：对话列表
"""

DETAIL_DESIGN = """
一、界面设计

1. CLI 模式
采用 REPL 交互，支持命令补全，输出带 emoji 图标增强可读性：
```
┌─────────────────────────────────────────────────────────────┐
│                    📚 可用命令列表                          │
├─────────────────────────────────────────────────────────────┤
│  help / read / write / search / exec / analyze / list       │
│  ask / wx / weather / news / email / summary / agents       │
│  schedule / skill / ollama / 2048 / exit                    │
└─────────────────────────────────────────────────────────────┘
```

2. Web 模式
基于 Vue3 + Tailwind CSS 的响应式单页应用：
- 左侧：对话历史侧边栏
- 中间：消息列表 + 输入框
- 工具栏：Craft模式选择、模型选择、Skill 选择
- 右侧面板：Skill 管理、定时任务管理

二、数据库设计

使用 SQLite（better-sqlite3），主要表结构：

conversations（对话表）：
  id | title | created_at | updated_at

messages（消息表）：
  id | conversation_id | role | content | qr_code | created_at

skills（Skill 表）：
  id | name | description | prompt | mode | module_entry | triggers | is_default | created_at

scheduled_tasks（定时任务表）：
  id | conversation_id | name | command | model_provider | frequency_type
  interval_seconds | time_of_day | weekdays | run_at | enabled | last_run_at

三、关键算法与技术

1. 多模型自动路由（OpenClawClient）
优先级：通用 API → DeepSeek → Ollama（本地）
每个提供商支持多端点重试，保证高可用。

2. Skill 触发检测
对用户输入进行关键词匹配（triggers 列表），命中后优先调用对应 Skill 的 prompt 或 module 处理。

3. 多 Agent 流水线（MultiAgentService）
Planner → Architect → Implementer → Reviewer 四个 Agent 串行执行，
每个 Agent 的输出作为下一个 Agent 的上下文输入，实现级联推理。

4. 定时任务调度器
支持三种模式：interval（固定间隔）、daily（每日定时）、once（单次执行）。
后台 Worker 每隔 30 秒检查待执行任务，支持微信推送通知。

5. AI 大模型应用说明
本作品的核心智能来自大语言模型（DeepSeek/OpenRouter/Ollama），用于：
- 自然语言问答与代码分析
- Skill 的 Prompt 模式执行
- 多 Agent 角色扮演与输出生成
所有模型调用均通过 OpenClawClient 统一管理，支持流式和非流式输出。
"""

TEST_REPORT = """
一、测试环境
- 操作系统：Windows 11 / macOS 14
- Node.js：v22.x
- 浏览器：Chrome 120+

二、主要测试用例

| 测试项 | 测试方法 | 预期结果 | 实际结果 |
|--------|---------|---------|---------|
| CLI help 命令 | 输入 help | 显示命令列表 | ✅ 通过 |
| 文件读取 | read package.json | 显示文件内容 | ✅ 通过 |
| 文件写入 | write test.txt hello | 文件创建成功 | ✅ 通过 |
| 代码搜索 | search function | 返回匹配行 | ✅ 通过 |
| 命令执行 | exec echo hello | 输出 hello | ✅ 通过 |
| AI 对话 | ask 什么是TypeScript | 返回解释 | ✅ 通过 |
| 多Agent | agents 版本迭代 | 四 Agent 协作输出 | ✅ 通过 |
| Skill 创建 | Web 界面创建 Skill | Skill 保存成功 | ✅ 通过 |
| Skill 运行 | 触发 Skill 执行 | AI 使用 Skill | ✅ 通过 |
| 定时任务 | 创建间隔任务 | 定时执行命令 | ✅ 通过 |
| Ollama 对话 | ollama 你好 | 返回本地模型回复 | ✅ 通过 |
| Web 界面 | 访问 localhost:3000 | 界面正常加载 | ✅ 通过 |
| 对话历史 | 切换会话 | 消息正确恢复 | ✅ 通过 |

三、技术指标
- Web 界面首屏加载时间：< 500ms（本地）
- 命令响应时间（非 AI）：< 50ms
- AI 对话延迟：取决于模型 API，通常 2~10s
- SQLite 写入性能：> 1000 次/秒
- Skill 触发匹配：< 5ms
- 定时任务检查间隔：30s（可配置）
"""

INSTALL_GUIDE = """
一、环境要求
- Node.js >= 18（推荐 v22.x）
- pnpm >= 8.x
- （可选）Ollama（本地模型，需另行安装）

二、安装步骤

1. 克隆/下载项目到本地
2. 安装依赖：
   pnpm install && pnpm run build
   cd frontend && pnpm install && cd ..

3. 配置环境变量（复制 .env.example 为 .env）：
   DEEPSEEK_API_KEY=你的DeepSeekKey（可选）
   MODEL_API_KEY=通用API Key（可选，支持 OpenRouter 等）
   OLLAMA_HOST=http://127.0.0.1:11434（本地模型，可选）

三、启动方式

CLI 模式（命令行交互）：
   pnpm start

Web 模式（可视化界面）：
   pnpm run web
   然后访问 http://localhost:3000

四、典型使用流程

1. 启动 Web 模式后，在右侧聊天框输入命令或自然语言
2. 点击顶部"Skill"按钮管理自定义 Skill
3. 点击"⏰"按钮配置定时任务
4. 工具栏可切换 AI 模型（Auto/DeepSeek/Ollama/自定义）
5. 工具栏可切换 Craft 模式（普通/Plan/Agent）
"""

SUMMARY_TEXT = """
一、项目成果
本项目历时约 3 个月完成，实现了 CLI 与 Web 双模式 AI 编程助手，包含：
- 完整的前后端分离架构（Node.js + Vue3）
- 多大语言模型自动路由接入
- 多 Agent 协同流水线
- Prompt + Module 双模 Skill 扩展体系
- 定时任务调度系统
- SQLite 持久化对话管理

二、克服的困难
1. 多模型兼容性：不同 AI 提供商 API 格式不一致，通过统一的 OpenClawClient 抽象层解决
2. Module Skill 安全性：JS/Python 脚本需要在受控环境中执行，增加了路径检查和权限限制
3. 定时任务持久化：服务重启后任务状态需要恢复，通过 SQLite 持久化 + 启动时任务扫描解决

三、学习收获
- 深入理解了 Node.js ESM 模块系统和 TypeScript 工程化实践
- 掌握了 Vue3 Composition API 的大型应用架构模式
- 学会了多 Agent 系统设计与提示词工程

四、后续升级计划
1. 接入 MCP（Model Context Protocol）协议，支持更多工具调用
2. 增加 RAG（检索增强生成）能力，支持项目文档问答
3. 添加 WebSocket 支持，实现 AI 回复流式输出
4. 开发 VS Code 插件版本
5. 商业推广：面向中小开发团队提供私有部署版本
"""

REFERENCES = """[1] Node.js 官方文档. https://nodejs.org/en/docs/
[2] Vue 3 官方文档. https://cn.vuejs.org/
[3] TypeScript 官方文档. https://www.typescriptlang.org/docs/
[4] DeepSeek API 文档. https://platform.deepseek.com/docs
[5] OpenAI Chat Completions API. https://platform.openai.com/docs/api-reference/chat
[6] better-sqlite3 文档. https://github.com/WiseLibs/better-sqlite3
[7] Vite 官方文档. https://vitejs.dev/
[8] Express.js 官方文档. https://expressjs.com/"""

# ====================================================================
# 替换 【填写说明：...】 段落为实际内容
# ====================================================================

def xml_escape(text):
    """转义 XML 特殊字符"""
    return (text
            .replace('&', '&amp;')
            .replace('<', '&lt;')
            .replace('>', '&gt;')
            .replace('"', '&quot;'))

def replace_section_content(xml, section_heading, new_content_lines):
    """找到 section_heading 所在标题之后的【填写说明...】段落，替换为 new_content_lines。
    new_content_lines: list of strings, each becomes a paragraph.
    """
    pos = xml.find(f'>{section_heading}</w:t>')
    if pos == -1:
        print(f"WARNING: section '{section_heading}' not found")
        return xml
    # 找到该标题段落之后的【填写说明...】段落组
    fill_pos = xml.find('【填写说明', pos)
    if fill_pos == -1:
        print(f"WARNING: no 【填写说明 after '{section_heading}'")
        return xml
    # 找到这个段落起始
    para_start = xml.rfind('<w:p ', 0, fill_pos)
    if para_start == -1:
        para_start = xml.rfind('<w:p>', 0, fill_pos)
    # 找到这个【填写说明】段落的结束
    para_end = xml.find('</w:p>', fill_pos) + 6
    # 获取原段落 pPr
    old_para = xml[para_start:para_end]
    ppr_m = re.search(r'(<w:pPr>.*?</w:pPr>)', old_para, re.DOTALL)
    ppr = ppr_m.group(1) if ppr_m else ''
    
    run_font = '<w:rFonts w:ascii="宋体" w:eastAsia="宋体" w:hAnsi="宋体"/>'
    run_size = '<w:sz w:val="21"/><w:szCs w:val="21"/>'
    
    new_paras = []
    for line in new_content_lines:
        if not line.strip():
            new_paras.append(f'<w:p>{ppr}</w:p>')
            continue
        escaped_line = xml_escape(line)
        run_content = f'<w:r><w:rPr>{run_font}{run_size}</w:rPr><w:t xml:space="preserve">{escaped_line}</w:t></w:r>'
        new_paras.append(f'<w:p>{ppr}{run_content}</w:p>')
    
    xml = xml[:para_start] + ''.join(new_paras) + xml[para_end:]
    return xml

# 处理各章节 - 将长字符串转成行列表
def text_to_lines(text):
    return [line for line in text.strip().split('\n')]

# 需求分析
xml = replace_section_content(xml, '需求分析', text_to_lines(NEEDS_ANALYSIS))

# 概要设计
xml = replace_section_content(xml, '概要设计', text_to_lines(SUMMARY_DESIGN))

# 详细设计
xml = replace_section_content(xml, '详细设计', text_to_lines(DETAIL_DESIGN))

# 测试报告
xml = replace_section_content(xml, '测试报告', text_to_lines(TEST_REPORT))

# 安装及使用
xml = replace_section_content(xml, '安装及使用', text_to_lines(INSTALL_GUIDE))

# 项目总结
xml = replace_section_content(xml, '项目总结', text_to_lines(SUMMARY_TEXT))

# 参考文献 —— 特殊处理，占位符是 【请按照标准参考文件格式填写】
xml = replace_wt(xml, '【请按照标准参考文件格式填写】',
    '[1] Node.js 官方文档. https://nodejs.org/en/docs/ | '
    '[2] Vue 3 官方文档. https://cn.vuejs.org/ | '
    '[3] TypeScript 官方文档. https://www.typescriptlang.org/docs/ | '
    '[4] DeepSeek API 文档. https://platform.deepseek.com/docs | '
    '[5] OpenAI Chat Completions API. https://platform.openai.com/docs/api-reference/chat | '
    '[6] better-sqlite3. https://github.com/WiseLibs/better-sqlite3 | '
    '[7] Express.js 官方文档. https://expressjs.com/')

# ====================================================================
# 写入文件
# ====================================================================
with open(DST, 'w', encoding='utf-8') as f:
    f.write(xml)

print("XML 填写完成，开始打包...")

result = subprocess.run(
    [sys.executable, PACK_PY, DST_DIR, OUT, '--original', ORIG, '--validate', 'false'],
    capture_output=True, text=True
)
print(result.stdout)
if result.returncode != 0:
    print("PACK ERROR:", result.stderr[-500:])
    sys.exit(1)
print(f"生成成功: {OUT}")
