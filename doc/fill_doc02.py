"""
填写 01-2 作品信息摘要模板 - 修正版
"""
import re, shutil, subprocess, sys, os

SRC      = r"d:\Code\SmallClaw\doc\unpacked-02\word\document.xml"
DST_DIR  = r"d:\Code\SmallClaw\doc\unpacked-02-filled"
DST      = os.path.join(DST_DIR, "word", "document.xml")
ORIG     = r"d:\Code\SmallClaw\doc\01-2 作品信息摘要模板（2025版）V2.docx"
OUT      = r"d:\Code\SmallClaw\doc\01-2 作品信息摘要（已填写）.docx"
PACK_PY  = r"C:\Users\Administrator\.workbuddy\plugins\marketplaces\codebuddy-plugins-official\plugins\docx\scripts\office\pack.py"

# 复制解包目录
if os.path.exists(DST_DIR):
    shutil.rmtree(DST_DIR)
shutil.copytree(r"d:\Code\SmallClaw\doc\unpacked-02", DST_DIR)

with open(DST, 'r', encoding='utf-8') as f:
    xml = f.read()

# ====================================================================
# 辅助函数：只替换 <w:t> 或 <w:t xml:space="preserve"> 标签的内容
# ====================================================================
def replace_wt(xml, old_content, new_content, count=1):
    """替换 <w:t>old_content</w:t> 或 <w:t ...>old_content</w:t>"""
    # [^\n>]* 限制不跨行，防止贪婪匹配破坏其他属性
    pattern = r'(<w:t(?:[^\n>]*)>)' + re.escape(old_content) + r'(</w:t>)'
    repl = r'\g<1>' + new_content.replace('\\', '\\\\') + r'\g<2>'
    result = re.subn(pattern, repl, xml, count=count)
    if result[1] == 0:
        print(f"WARNING: replace_wt not found: {old_content!r}")
    return result[0]

def insert_run_before_endpara(xml, anchor_text, new_text):
    """在包含 anchor_text 的内容所在 <w:p> 的结束前，在下一个空 <w:p> 中插入文本。
    anchor_text 可以是普通文本或包含XML标签的字符串（如 '>字以内</w:t>'）。
    """
    pos = xml.find(anchor_text)
    if pos == -1:
        print(f"WARNING: insert_run_before_endpara: '{anchor_text}' not found")
        return xml
    # 找这个段落的结束
    para_end = xml.find('</w:p>', pos)
    if para_end == -1: return xml
    after = para_end + 6
    # 找下一个 <w:p
    next_p = xml.find('<w:p ', after)
    next_p2 = xml.find('<w:p>', after)
    if next_p == -1 and next_p2 == -1: return xml
    if next_p == -1: next_p = next_p2
    elif next_p2 != -1: next_p = min(next_p, next_p2)
    p_end = xml.find('</w:p>', next_p)
    para_slice = xml[next_p:p_end+6]
    if '<w:t' not in para_slice:
        run = f'<w:r><w:rPr><w:rFonts w:ascii="宋体" w:eastAsia="宋体" w:hAnsi="宋体"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t xml:space="preserve">{new_text}</w:t></w:r>'
        new_para = para_slice[:para_slice.rfind('</w:p>')] + run + '</w:p>'
        xml = xml[:next_p] + new_para + xml[p_end+6:]
    else:
        print(f"WARNING: next paragraph is not empty for anchor '{anchor_text}'")
    return xml

def fill_next_empty_tc(xml, after_text, fill_text, search_from=0):
    """在包含 after_text 的 <w:tc> 之后找第一个空 <w:tc>，插入 fill_text"""
    pos = xml.find(after_text, search_from)
    if pos == -1:
        print(f"WARNING: fill_next_empty_tc: '{after_text}' not found")
        return xml
    tc_end = xml.find('</w:tc>', pos)
    if tc_end == -1: return xml
    cursor = tc_end + 7
    next_tc_m = re.search(r'<w:tc[ >]', xml[cursor:])
    if not next_tc_m: return xml
    nt_start = cursor + next_tc_m.start()
    nt_end = xml.find('</w:tc>', nt_start)
    tc_content = xml[nt_start:nt_end+7]
    if '<w:t' not in tc_content:
        run = f'<w:r><w:rPr><w:rFonts w:ascii="宋体" w:eastAsia="宋体" w:hAnsi="宋体"/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t xml:space="preserve">{fill_text}</w:t></w:r>'
        p_end_pos = tc_content.rfind('</w:p>')
        new_tc = tc_content[:p_end_pos] + run + tc_content[p_end_pos:]
        xml = xml[:nt_start] + new_tc + xml[nt_end+7:]
    return xml

# ====================================================================
# 开始填写
# ====================================================================

# 1. 作品编号 / 名称 / 大类 / 小类 (找空单元格填写)
xml = fill_next_empty_tc(xml, '>作品编号</w:t>', '（参赛后填写）')
xml = fill_next_empty_tc(xml, '>作品名称</w:t>', 'OpenClaw —— AI 智能编程助手')
xml = fill_next_empty_tc(xml, '>作品大类</w:t>', '软件应用与开发类')
xml = fill_next_empty_tc(xml, '>作品小类</w:t>', '软件工具与开发辅助')

# 2. 作品简介 —— 找第一个 '字以内' 后的空段落（半角括号，作品简介行）
xml = insert_run_before_endpara(xml, '>字以内</w:t>',
    'OpenClaw 是一款面向开发者的 AI 智能编程助手，支持 CLI 命令行与 Web 可视化双模式交互，'
    '集成文件读写、代码搜索、命令执行、项目结构分析、多 Agent 协同、自定义 Skill 管理、'
    '定时任务调度及主流大模型接入（DeepSeek/Ollama/OpenRouter），帮助开发者高效完成日常编程与自动化任务。')

# 3. 创新描述 —— 找 '字以内）：' 后的空段落（全角括号冒号，创新描述行）
xml = insert_run_before_endpara(xml, '>字以内）：</w:t>',
    '1. 人设固化+多模型自动路由：openclaw 人设 prompt 固化于代码保证助手行为一致，支持 DeepSeek/通用API/Ollama 三级自动回退；'
    '2. 双模 Skill 扩展体系：支持 Prompt Skill 与 Module Skill（JS/Python），用户可用自然语言或脚本无缝扩展助手能力；'
    '3. 多 Agent 流水线：内置 Planner→Architect→Implementer→Reviewer 四 Agent 协同，实现复杂任务自动化拆解。')

# 4. 特别说明
xml = replace_wt(xml, '作品中如有涉及疆域的地图，请说明来源，并标注有效的地图审图号；',
    '作品中未涉及疆域地图，无需说明。')
xml = replace_wt(xml, '作品如有前期基础请具体说明，并注明本次参赛的主要工作；',
    '本作品以 SmallClaw 演示 Demo 为参赛版本，该 Demo 展示 OpenClaw AI 编程助手核心功能。'
    '本次参赛主要工作：CLI/Web 双模式架构设计、多 Agent 协同流水线实现、Skill 管理系统（Prompt+Module 双模）、'
    '定时任务系统、SQLite 持久化对话、前端 Vue3 组件化开发。')
xml = replace_wt(xml, '3.作品如使用人工智能辅助工具（含A',
    '3.')
xml = replace_wt(xml, 'IGC', '')
xml = replace_wt(xml, '）进行设计与开发，请具体说明使用人工智能辅助工具的名称、来源及合规性，以及所生成的内容及占整个作品的比例。',
    '本作品设计开发过程中使用了 WorkBuddy（腾讯云 CodeBuddy）进行代码补全与审查，来源合规，'
    '授权使用；AI 辅助生成代码约占总代码量的 20%，其余 80% 均由参赛队员独立设计实现。')

# 5. 作者名称替换（姓名1→张三 等）
xml = replace_wt(xml, '姓名1', '张三（负责人）', count=2)
xml = replace_wt(xml, '姓名2', '李四', count=2)
xml = replace_wt(xml, '姓名3', '王五', count=2)

# 6. 分工百分比
AUTHOR_DATA = [
    ('组织协调', ['50%', '30%', '20%', '-', '-']),
    ('作品创意', ['50%', '30%', '20%', '-', '-']),
    ('竞品分析', ['40%', '40%', '20%', '-', '-']),
    ('方案设计', ['40%', '40%', '20%', '-', '-']),
    ('技术实现', ['40%', '40%', '20%', '-', '-']),
    ('文献阅读', ['30%', '30%', '40%', '-', '-']),
    ('测试分析', ['40%', '30%', '30%', '-', '-']),
]

for row_name, percents in AUTHOR_DATA:
    pos = xml.find(f'>{row_name}</w:t>')
    if pos == -1:
        print(f"WARNING: row '{row_name}' not found")
        continue
    tc_end = xml.find('</w:tc>', pos)
    cursor = tc_end + 7
    for val in percents:
        m = re.search(r'<w:tc[ >]', xml[cursor:])
        if not m: break
        nt = cursor + m.start()
        ne = xml.find('</w:tc>', nt)
        tc_slice = xml[nt:ne+7]
        t_m = re.search(r'(<w:t[^>]*>)%(<\/w:t>)', tc_slice)
        if t_m:
            new_tc = tc_slice[:t_m.start()] + t_m.group(1) + val + t_m.group(2) + tc_slice[t_m.end():]
            xml = xml[:nt] + new_tc + xml[ne+7:]
        cursor = xml.find('</w:tc>', nt) + 7

# 7. 指导教师作用
xml = replace_wt(xml,
    '□作品创意 □理论指导 □技术方案 □实验场地 □硬件资源 ',
    '□作品创意 □理论指导 ■技术方案 □实验场地 □硬件资源 ')
xml = replace_wt(xml,
    '□数据提供 □后勤支持 □宣讲通知 □组织协调 □经费支持',
    '□数据提供 □后勤支持 □宣讲通知 ■组织协调 □经费支持')

# 8. 开发制作工具
xml = insert_run_before_endpara(xml, '>开发制作工具</w:t>',
    'Node.js v22 / TypeScript 5.3 / Vue 3 / Vite / Express 4 / better-sqlite3 / VS Code / pnpm')

# 9. 参考文献 —— 参考文献行内有很多空格 run，替换第一个空格 run 为文献内容
def fill_ref(xml, ref_anchor, ref_text):
    """在包含 ref_anchor 的段落内，找第一个全是空格的 <w:t> run，替换为 ref_text"""
    pos = xml.find(ref_anchor)
    if pos == -1:
        print(f"WARNING: fill_ref: '{ref_anchor}' not found")
        return xml
    para_end = xml.find('</w:p>', pos)
    # 在这个段落内找第一个 xml:space="preserve" 且内容只有空格的 run
    seg = xml[pos:para_end]
    m = re.search(r'(<w:t xml:space="preserve">)\s+(</w:t>)', seg)
    if m:
        new_seg = seg[:m.start()] + m.group(1) + ref_text + m.group(2) + seg[m.end():]
        xml = xml[:pos] + new_seg + xml[para_end:]
    else:
        print(f"WARNING: fill_ref: no space run found for '{ref_anchor}'")
    return xml

xml = fill_ref(xml, '>1、</w:t>',
    'Node.js Documentation. https://nodejs.org/en/docs/')
xml = fill_ref(xml, '>2、</w:t>',
    'Vue 3 官方文档. https://cn.vuejs.org/')
xml = fill_ref(xml, '>3、</w:t>',
    'OpenAI Chat Completions API. https://platform.openai.com/docs/api-reference/chat')

# 10. 相关文件
FILE_DATA = [
    ('SmallClaw-源代码.zip', 'SmallClaw Demo 全部源代码，含后端 Node.js/TypeScript 和前端 Vue3 项目'),
    ('SmallClaw-演示视频.mp4', 'CLI 与 Web 双模式完整功能演示视频'),
    ('01-3-设计与开发文档.pdf', '软件开发类作品设计与开发文档（本文档）'),
    ('01-2-作品信息摘要.pdf', '作品信息概要表（本文件）'),
]

# 正向逐个替换：每次只替换"第一个"未填写的
for fn, desc in FILE_DATA:
    # 替换第一个"文件名："为带内容版
    xml = re.sub(
        r'(<w:t(?:[^\n>]*)>)文件名：(</w:t>)',
        r'\g<1>' + f'文件名：{fn}' + r'\2',
        xml, count=1)
    # 替换第一个"描述："为带内容版
    xml = re.sub(
        r'(<w:t(?:[^\n>]*)>)描述：(</w:t>)',
        r'\g<1>' + f'描述：{desc}' + r'\2',
        xml, count=1)
    # 替换第一个 □已上传到网盘
    xml = re.sub(
        r'(<w:t(?:[^\n>]*)>)□已上传到网盘(</w:t>)',
        r'\g<1>■已上传到网盘\2',
        xml, count=1)
    # 替换第一个 □自制□未知版权
    xml = re.sub(
        r'(<w:t(?:[^\n>]*)>)□自制□未知版权(</w:t>)',
        r'\g<1>■自制□未知版权\2',
        xml, count=1)

# 写入
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
