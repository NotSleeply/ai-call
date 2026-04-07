const pptxgen = require("pptxgenjs");

let pres = new pptxgen();
pres.layout = "LAYOUT_16x9";
pres.author = "QClaw";
pres.title = "认识 QClaw";

// 配色方案 - 科技蓝
const C = {
  dark: "0F172A",    // 深蓝黑
  primary: "3B82F6", // 蓝色
  accent: "06B6D4",  // 青色
  light: "F8FAFC",    // 浅灰白
  text: "1E293B",     // 深灰文字
  muted: "64748B",   // 柔和灰
  white: "FFFFFF",
};

// =====================
// Slide 1: 封面
// =====================
{
  let slide = pres.addSlide();
  slide.background = { color: C.dark };

  // 装饰圆形
  slide.addShape(pres.shapes.OVAL, {
    x: 7.5, y: -1.5, w: 5, h: 5,
    fill: { color: C.primary, transparency: 80 }
  });
  slide.addShape(pres.shapes.OVAL, {
    x: 8.5, y: 3.5, w: 3, h: 3,
    fill: { color: C.accent, transparency: 85 }
  });

  // 标题
  slide.addText("认识 QClaw", {
    x: 0.8, y: 1.8, w: 8, h: 1.2,
    fontSize: 54, fontFace: "Microsoft YaHei", bold: true,
    color: C.white, align: "left", margin: 0
  });

  // 副标题
  slide.addText("你的 AI 桌面助手，让一切更简单", {
    x: 0.8, y: 3.1, w: 7, h: 0.6,
    fontSize: 20, fontFace: "Microsoft YaHei",
    color: C.accent, align: "left", margin: 0
  });

  // 底部信息条
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 5.1, w: 10, h: 0.525,
    fill: { color: C.primary, transparency: 60 }
  });
  slide.addText("QClaw AI 助手 · 介绍演示", {
    x: 0.8, y: 5.15, w: 8, h: 0.45,
    fontSize: 12, fontFace: "Microsoft YaHei",
    color: C.white, align: "left", valign: "middle", margin: 0
  });
}

// =====================
// Slide 2: 什么是 QClaw
// =====================
{
  let slide = pres.addSlide();
  slide.background = { color: C.light };

  // 左侧强调条
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 0.12, h: 5.625,
    fill: { color: C.primary }
  });

  // 标题
  slide.addText("什么是 QClaw？", {
    x: 0.5, y: 0.4, w: 9, h: 0.8,
    fontSize: 36, fontFace: "Microsoft YaHei", bold: true,
    color: C.text, align: "left", margin: 0
  });

  // 核心定义卡片
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 1.4, w: 9, h: 1.4,
    fill: { color: C.white },
    shadow: { type: "outer", color: "000000", blur: 8, offset: 2, angle: 135, opacity: 0.08 }
  });
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 1.4, w: 0.08, h: 1.4,
    fill: { color: C.accent }
  });
  slide.addText("QClaw 是一款运行在电脑上的 AI 桌面助手，基于大语言模型，能够理解自然语言指令，帮助用户完成各种电脑操作和任务。", {
    x: 0.75, y: 1.5, w: 8.5, h: 1.2,
    fontSize: 17, fontFace: "Microsoft YaHei",
    color: C.text, align: "left", valign: "middle", margin: 0
  });

  // 三个特点卡片
  const features = [
    { title: "智能化", desc: "深度理解意图，精准完成任务" },
    { title: "全交互", desc: "文字、语音、文件多模态输入" },
    { title: "本地化", desc: "数据留在本地，保护隐私安全" },
  ];
  features.forEach((f, i) => {
    let x = 0.5 + i * 3.1;
    slide.addShape(pres.shapes.RECTANGLE, {
      x, y: 3.2, w: 2.9, h: 2,
      fill: { color: C.white },
      shadow: { type: "outer", color: "000000", blur: 6, offset: 2, angle: 135, opacity: 0.06 }
    });
    slide.addShape(pres.shapes.RECTANGLE, {
      x, y: 3.2, w: 2.9, h: 0.08,
      fill: { color: C.primary }
    });
    slide.addText(f.title, {
      x, y: 3.45, w: 2.9, h: 0.55,
      fontSize: 18, fontFace: "Microsoft YaHei", bold: true,
      color: C.primary, align: "center", margin: 0
    });
    slide.addText(f.desc, {
      x: x + 0.15, y: 4.05, w: 2.6, h: 0.9,
      fontSize: 13, fontFace: "Microsoft YaHei",
      color: C.muted, align: "center", valign: "top", margin: 0
    });
  });
}

// =====================
// Slide 3: 核心功能
// =====================
{
  let slide = pres.addSlide();
  slide.background = { color: C.light };

  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 0.12, h: 5.625,
    fill: { color: C.primary }
  });

  slide.addText("核心功能", {
    x: 0.5, y: 0.4, w: 9, h: 0.8,
    fontSize: 36, fontFace: "Microsoft YaHei", bold: true,
    color: C.text, align: "left", margin: 0
  });

  const funcs = [
    { num: "01", title: "文件管理", items: ["查找、复制、移动、删除文件", "整理桌面和文件夹", "批量处理文件任务"] },
    { num: "02", title: "文档处理", items: ["生成 Word / Excel / PPT", "读取和总结 PDF 内容", "写作、翻译、润色文章"] },
    { num: "03", title: "系统操作", items: ["执行终端命令", "管理系统设置", "自动化重复操作"] },
    { num: "04", title: "信息检索", items: ["联网搜索最新资讯", "查天气、股票、新闻", "追踪热点和趋势"] },
  ];

  funcs.forEach((f, i) => {
    let row = Math.floor(i / 2), col = i % 2;
    let x = 0.5 + col * 4.7, y = 1.35 + row * 2.05;
    slide.addShape(pres.shapes.RECTANGLE, {
      x, y, w: 4.5, h: 1.9,
      fill: { color: C.white },
      shadow: { type: "outer", color: "000000", blur: 6, offset: 2, angle: 135, opacity: 0.06 }
    });
    slide.addText(f.num, {
      x, y: y + 0.1, w: 0.7, h: 0.55,
      fontSize: 28, fontFace: "Arial Black", bold: true,
      color: C.primary, align: "center", margin: 0
    });
    slide.addText(f.title, {
      x: x + 0.7, y: y + 0.15, w: 3.5, h: 0.45,
      fontSize: 17, fontFace: "Microsoft YaHei", bold: true,
      color: C.text, align: "left", valign: "middle", margin: 0
    });
    f.items.forEach((item, j) => {
      slide.addText([
        { text: "·  ", options: { color: C.accent } },
        { text: item, options: { color: C.muted } }
      ], {
        x: x + 0.7, y: y + 0.6 + j * 0.4, w: 3.6, h: 0.38,
        fontSize: 12, fontFace: "Microsoft YaHei",
        align: "left", valign: "middle", margin: 0
      });
    });
  });
}

// =====================
// Slide 4: 工作流程
// =====================
{
  let slide = pres.addSlide();
  slide.background = { color: C.dark };

  slide.addText("如何与 QClaw 协作？", {
    x: 0.5, y: 0.35, w: 9, h: 0.8,
    fontSize: 36, fontFace: "Microsoft YaHei", bold: true,
    color: C.white, align: "left", margin: 0
  });

  slide.addText("用自然语言描述你的需求，QClaw 自动规划并执行", {
    x: 0.5, y: 1.0, w: 9, h: 0.5,
    fontSize: 15, fontFace: "Microsoft YaHei",
    color: C.accent, align: "left", margin: 0
  });

  const steps = [
    { icon: "💬", title: "说出需求", desc: "用自然语言描述你想完成的任务" },
    { icon: "🧠", title: "AI 理解", desc: "QClaw 分析意图，制定执行计划" },
    { icon: "⚡", title: "自动执行", desc: "调用工具完成文件、代码、信息等操作" },
    { icon: "✅", title: "结果反馈", desc: "清晰展示执行结果，随时可修正" },
  ];

  steps.forEach((s, i) => {
    let x = 0.5 + i * 2.4;
    // 卡片背景
    slide.addShape(pres.shapes.RECTANGLE, {
      x, y: 1.7, w: 2.2, h: 3.4,
      fill: { color: "1E293B" }
    });
    // 顶部色条
    slide.addShape(pres.shapes.RECTANGLE, {
      x, y: 1.7, w: 2.2, h: 0.08,
      fill: { color: C.primary }
    });
    // 图标
    slide.addText(s.icon, {
      x, y: 1.95, w: 2.2, h: 0.8,
      fontSize: 40, align: "center", margin: 0
    });
    // 步骤编号
    slide.addText("0" + (i + 1), {
      x, y: 2.75, w: 2.2, h: 0.45,
      fontSize: 22, fontFace: "Arial Black", bold: true,
      color: C.primary, align: "center", margin: 0
    });
    // 标题
    slide.addText(s.title, {
      x, y: 3.2, w: 2.2, h: 0.5,
      fontSize: 16, fontFace: "Microsoft YaHei", bold: true,
      color: C.white, align: "center", margin: 0
    });
    // 描述
    slide.addText(s.desc, {
      x: x + 0.1, y: 3.7, w: 2.0, h: 1.2,
      fontSize: 11, fontFace: "Microsoft YaHei",
      color: C.muted, align: "center", valign: "top", margin: 0
    });
  });
}

// =====================
// Slide 5: 适用人群
// =====================
{
  let slide = pres.addSlide();
  slide.background = { color: C.light };

  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 0.12, h: 5.625,
    fill: { color: C.accent }
  });

  slide.addText("谁在使用 QClaw？", {
    x: 0.5, y: 0.4, w: 9, h: 0.8,
    fontSize: 36, fontFace: "Microsoft YaHei", bold: true,
    color: C.text, align: "left", margin: 0
  });

  const users = [
    { title: "职场人士", desc: "自动化办公、邮件处理、报表生成" },
    { title: "开发者", desc: "代码编写、调试、文档处理" },
    { title: "学生党", desc: "资料整理、论文写作、学习规划" },
    { title: "创作者", desc: "内容策划、文案撰写、素材管理" },
    { title: "研究人员", desc: "文献检索、论文阅读、数据分析" },
    { title: "每个人", desc: "电脑上的大多数操作，QClaw 都能帮忙" },
  ];

  users.forEach((u, i) => {
    let row = Math.floor(i / 3), col = i % 3;
    let x = 0.5 + col * 3.1, y = 1.35 + row * 2.0;
    slide.addShape(pres.shapes.RECTANGLE, {
      x, y, w: 2.9, h: 1.8,
      fill: { color: C.white },
      shadow: { type: "outer", color: "000000", blur: 6, offset: 2, angle: 135, opacity: 0.06 }
    });
    slide.addShape(pres.shapes.RECTANGLE, {
      x, y, w: 2.9, h: 0.08,
      fill: { color: col === 2 ? C.accent : C.primary }
    });
    slide.addText(u.title, {
      x, y: y + 0.25, w: 2.9, h: 0.55,
      fontSize: 17, fontFace: "Microsoft YaHei", bold: true,
      color: C.text, align: "center", margin: 0
    });
    slide.addText(u.desc, {
      x: x + 0.15, y: y + 0.85, w: 2.6, h: 0.75,
      fontSize: 12, fontFace: "Microsoft YaHei",
      color: C.muted, align: "center", valign: "top", margin: 0
    });
  });
}

// =====================
// Slide 6: 技术特点
// =====================
{
  let slide = pres.addSlide();
  slide.background = { color: C.dark };

  slide.addText("技术特点", {
    x: 0.5, y: 0.35, w: 9, h: 0.75,
    fontSize: 36, fontFace: "Microsoft YaHei", bold: true,
    color: C.white, align: "left", margin: 0
  });

  const techs = [
    { title: "大模型驱动", desc: "基于先进大语言模型，强大的理解和生成能力" },
    { title: "多工具集成", desc: "文件系统、浏览器、代码执行器等丰富工具" },
    { title: "多平台支持", desc: "Windows / macOS / Linux 桌面端均可运行" },
    { title: "安全隐私优先", desc: "本地化处理，数据不外传，用得安心" },
  ];

  techs.forEach((t, i) => {
    let y = 1.2 + i * 1.05;
    slide.addShape(pres.shapes.RECTANGLE, {
      x: 0.5, y, w: 9, h: 0.9,
      fill: { color: "1E293B" }
    });
    slide.addShape(pres.shapes.RECTANGLE, {
      x: 0.5, y, w: 0.08, h: 0.9,
      fill: { color: C.accent }
    });
    slide.addText(t.title, {
      x: 0.8, y: y + 0.08, w: 2.8, h: 0.75,
      fontSize: 17, fontFace: "Microsoft YaHei", bold: true,
      color: C.primary, align: "left", valign: "middle", margin: 0
    });
    slide.addText(t.desc, {
      x: 3.6, y: y + 0.08, w: 5.7, h: 0.75,
      fontSize: 14, fontFace: "Microsoft YaHei",
      color: C.white, align: "left", valign: "middle", margin: 0
    });
  });
}

// =====================
// Slide 7: 应用场景
// =====================
{
  let slide = pres.addSlide();
  slide.background = { color: C.light };

  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 0.12, h: 5.625,
    fill: { color: C.primary }
  });

  slide.addText("典型应用场景", {
    x: 0.5, y: 0.4, w: 9, h: 0.8,
    fontSize: 36, fontFace: "Microsoft YaHei", bold: true,
    color: C.text, align: "left", margin: 0
  });

  const scenes = [
    ["一键整理桌面文件", "自动按类型归类桌面图标和文件夹"],
    ["生成工作汇报文档", "快速创建结构清晰的 Word / PPT"],
    ["联网调研写报告", "自动搜索信息并整理成文"],
    ["批量处理数据", "Excel 批量操作，数据分析自动化"],
    ["快速查找文件", "描述内容即可定位电脑上的文件"],
    ["设置定时提醒", "自然语言设置闹钟、日程、循环任务"],
  ];

  scenes.forEach((s, i) => {
    let row = Math.floor(i / 2), col = i % 2;
    let x = 0.5 + col * 4.7, y = 1.3 + row * 1.35;
    slide.addShape(pres.shapes.RECTANGLE, {
      x, y, w: 4.5, h: 1.2,
      fill: { color: C.white },
      shadow: { type: "outer", color: "000000", blur: 6, offset: 2, angle: 135, opacity: 0.06 }
    });
    slide.addShape(pres.shapes.RECTANGLE, {
      x, y, w: 0.08, h: 1.2,
      fill: { color: col === 0 ? C.primary : C.accent }
    });
    slide.addText(s[0], {
      x: x + 0.25, y: y + 0.15, w: 4.0, h: 0.45,
      fontSize: 15, fontFace: "Microsoft YaHei", bold: true,
      color: C.text, align: "left", margin: 0
    });
    slide.addText(s[1], {
      x: x + 0.25, y: y + 0.6, w: 4.0, h: 0.45,
      fontSize: 12, fontFace: "Microsoft YaHei",
      color: C.muted, align: "left", margin: 0
    });
  });
}

// =====================
// Slide 8: 快速上手
// =====================
{
  let slide = pres.addSlide();
  slide.background = { color: C.dark };

  slide.addText("快速上手", {
    x: 0.5, y: 0.35, w: 9, h: 0.75,
    fontSize: 36, fontFace: "Microsoft YaHei", bold: true,
    color: C.white, align: "left", margin: 0
  });

  slide.addText("只需要会打字，就能用好 QClaw", {
    x: 0.5, y: 1.0, w: 9, h: 0.5,
    fontSize: 16, fontFace: "Microsoft YaHei",
    color: C.accent, align: "left", margin: 0
  });

  const tips = [
    { q: "帮我把桌面上的图片整理到图片文件夹", a: "自动识别文件类型并移动" },
    { q: "写一份周报，包含本周完成的工作", a: "生成规范的 Word 文档" },
    { q: "搜一下最近 AI 领域有什么热点", a: "联网检索并整理摘要" },
    { q: "提醒我明天上午10点开会", a: "设置日历提醒" },
  ];

  tips.forEach((t, i) => {
    let y = 1.65 + i * 0.95;
    slide.addShape(pres.shapes.RECTANGLE, {
      x: 0.5, y, w: 9, h: 0.85,
      fill: { color: "1E293B" }
    });
    slide.addShape(pres.shapes.RECTANGLE, {
      x: 0.5, y, w: 0.08, h: 0.85,
      fill: { color: i % 2 === 0 ? C.primary : C.accent }
    });
    slide.addText("❯ " + t.q, {
      x: 0.75, y: y + 0.08, w: 8.5, h: 0.38,
      fontSize: 14, fontFace: "Microsoft YaHei", bold: true,
      color: C.white, align: "left", margin: 0
    });
    slide.addText("→ " + t.a, {
      x: 0.75, y: y + 0.45, w: 8.5, h: 0.35,
      fontSize: 12, fontFace: "Microsoft YaHei",
      color: C.muted, align: "left", margin: 0
    });
  });
}

// =====================
// Slide 9: 常见问题
// =====================
{
  let slide = pres.addSlide();
  slide.background = { color: C.light };

  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 0.12, h: 5.625,
    fill: { color: C.accent }
  });

  slide.addText("常见问题", {
    x: 0.5, y: 0.4, w: 9, h: 0.8,
    fontSize: 36, fontFace: "Microsoft YaHei", bold: true,
    color: C.text, align: "left", margin: 0
  });

  const qas = [
    { q: "Q: QClaw 需要联网吗？", a: "A: 基础功能离线可用；AI 对话和搜索功能需要联网。" },
    { q: "Q: 我的文件数据安全吗？", a: "A: 数据优先本地处理，不经第三方服务器，隐私有保障。" },
    { q: "Q: 支持哪些语言？", a: "A: 中文、英文均完美支持，也支持其他主流语言。" },
    { q: "Q: 需要编程知识吗？", a: "A: 完全不需要！像聊天一样说话，QClaw 自动完成操作。" },
  ];

  qas.forEach((qa, i) => {
    let y = 1.3 + i * 1.02;
    slide.addShape(pres.shapes.RECTANGLE, {
      x: 0.5, y, w: 9, h: 0.92,
      fill: { color: C.white },
      shadow: { type: "outer", color: "000000", blur: 5, offset: 1, angle: 135, opacity: 0.05 }
    });
    slide.addShape(pres.shapes.RECTANGLE, {
      x: 0.5, y, w: 0.08, h: 0.92,
      fill: { color: C.primary }
    });
    slide.addText(qa.q, {
      x: 0.75, y: y + 0.1, w: 8.5, h: 0.38,
      fontSize: 14, fontFace: "Microsoft YaHei", bold: true,
      color: C.text, align: "left", margin: 0
    });
    slide.addText(qa.a, {
      x: 0.75, y: y + 0.48, w: 8.5, h: 0.38,
      fontSize: 12, fontFace: "Microsoft YaHei",
      color: C.muted, align: "left", margin: 0
    });
  });
}

// =====================
// Slide 10: 结束页
// =====================
{
  let slide = pres.addSlide();
  slide.background = { color: C.dark };

  slide.addShape(pres.shapes.OVAL, {
    x: -2, y: -2, w: 6, h: 6,
    fill: { color: C.primary, transparency: 85 }
  });
  slide.addShape(pres.shapes.OVAL, {
    x: 7, y: 2.5, w: 4, h: 4,
    fill: { color: C.accent, transparency: 85 }
  });

  slide.addText("开始使用 QClaw", {
    x: 0.5, y: 1.6, w: 9, h: 1.0,
    fontSize: 48, fontFace: "Microsoft YaHei", bold: true,
    color: C.white, align: "center", margin: 0
  });

  slide.addText("让 AI 成为你电脑上的得力助手", {
    x: 0.5, y: 2.7, w: 9, h: 0.6,
    fontSize: 20, fontFace: "Microsoft YaHei",
    color: C.accent, align: "center", margin: 0
  });

  slide.addShape(pres.shapes.RECTANGLE, {
    x: 3.5, y: 3.5, w: 3, h: 0.06,
    fill: { color: C.primary }
  });

  slide.addText("QClaw · 让一切都更简单", {
    x: 0.5, y: 3.8, w: 9, h: 0.5,
    fontSize: 14, fontFace: "Microsoft YaHei",
    color: C.muted, align: "center", margin: 0
  });
}

// 输出文件
pres.writeFile({ fileName: "C:\\Users\\Administrator\\Desktop\\认识QClaw.pptx" })
  .then(() => console.log("PPT 生成成功！"))
  .catch(err => console.error("错误:", err));
