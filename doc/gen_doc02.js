const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, BorderStyle, WidthType, ShadingType, VerticalAlign,
  PageOrientation, HeadingLevel,
} = require('docx');
const fs = require('fs');
const path = require('path');

const border = { style: BorderStyle.SINGLE, size: 4, color: '000000' };
const borders = { top: border, bottom: border, left: border, right: border };
const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

function cell(text, opts = {}) {
  const { bold = false, shade = false, colSpan, rowSpan, align = AlignmentType.LEFT, vAlign = VerticalAlign.CENTER, fontSize = 20 } = opts;
  const tcPr = {
    borders,
    verticalAlign: vAlign,
    margins: { top: 60, bottom: 60, left: 120, right: 120 },
  };
  if (colSpan) tcPr.columnSpan = colSpan;
  if (rowSpan) tcPr.rowSpan = rowSpan;
  if (shade) {
    tcPr.shading = { fill: 'D9D9D9', type: ShadingType.CLEAR };
  }
  const runs = typeof text === 'string'
    ? [new TextRun({ text, bold, size: fontSize, font: '宋体' })]
    : text;
  return new TableCell({
    ...tcPr,
    children: [new Paragraph({ alignment: align, children: runs })],
  });
}

function headerCell(text, opts = {}) {
  return cell(text, { bold: true, shade: true, ...opts });
}

function boldText(t, size = 20) { return new TextRun({ text: t, bold: true, size, font: '宋体' }); }
function normalText(t, size = 20) { return new TextRun({ text: t, size, font: '宋体' }); }

// 总表宽
const TW = 9360;

const doc = new Document({
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1080, right: 900, bottom: 1080, left: 900 },
      },
    },
    children: [
      // 标题
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: '中国大学生计算机设计大赛', bold: true, size: 36, font: '华文中宋' })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: '作品信息概要表 (2025版)', bold: false, size: 28, font: '黑体' })],
        spacing: { after: 120 },
      }),

      // 主表格
      new Table({
        width: { size: TW, type: WidthType.DXA },
        columnWidths: [TW],
        rows: [
          // 作品编号 + 作品名称
          new TableRow({
            children: [
              new Table({
                width: { size: TW, type: WidthType.DXA },
                columnWidths: [1500, 3000, 1500, 3360],
                rows: [
                  new TableRow({
                    children: [
                      headerCell('作品编号', { colSpan: undefined }),
                      cell('（待填写）', {}),
                      headerCell('作品名称'),
                      cell('OpenClaw —— AI 智能编程助手'),
                    ]
                  }),
                  new TableRow({
                    children: [
                      headerCell('作品大类'),
                      cell('软件应用与开发类'),
                      headerCell('作品小类'),
                      cell('工具软件'),
                    ]
                  }),
                ]
              }).constructor === Table
                ? (() => { throw new Error('inner table not supported in this way') })()
                : cell('placeholder'),
            ]
          }),
        ]
      }),
    ]
  }]
});

// 简化方式：直接用多行表格
const mainTable = new Table({
  width: { size: TW, type: WidthType.DXA },
  columnWidths: [1400, 3080, 1400, 3480],
  rows: [
    new TableRow({
      children: [
        headerCell('作品编号'),
        cell('（参赛后填写）'),
        headerCell('作品名称'),
        cell('OpenClaw —— AI 智能编程助手'),
      ]
    }),
    new TableRow({
      children: [
        headerCell('作品大类'),
        cell('软件应用与开发类'),
        headerCell('作品小类'),
        cell('软件工具与开发辅助'),
      ]
    }),
    // 作品简介占整行
    new TableRow({
      children: [
        new TableCell({
          borders,
          columnSpan: 4,
          margins: { top: 60, bottom: 60, left: 120, right: 120 },
          children: [
            new Paragraph({
              children: [
                boldText('作品简介（100字以内）：'),
                normalText('OpenClaw 是一款面向开发者的 AI 智能编程助手，提供 CLI 与 Web 双模式交互界面，支持文件读写、代码搜索、命令执行、项目分析、多 Agent 协同、自定义 Skill、定时任务及 Ollama/DeepSeek/主流大模型接入，助力开发者高效完成日常编程任务。'),
              ]
            })
          ]
        })
      ]
    }),
    // 创新描述
    new TableRow({
      children: [
        new TableCell({
          borders,
          columnSpan: 4,
          margins: { top: 60, bottom: 60, left: 120, right: 120 },
          children: [
            new Paragraph({
              children: [
                boldText('创新描述（100字以内）：'),
                normalText('1. 首创"人设固化 + 多模型自动路由"机制，openclaw 人设 prompt 固化于代码，保证助手行为一致性；2. 支持 Prompt/Module 双模 Skill 扩展，用户可用自然语言或 JS/Python 脚本无缝扩展助手能力；3. 内置多 Agent 协同（Planner-Architect-Implementer-Reviewer）流水线，实现复杂开发任务自动化拆解。'),
              ]
            })
          ]
        })
      ]
    }),
    // 特别说明
    new TableRow({
      children: [
        new TableCell({
          borders,
          columnSpan: 4,
          shading: { fill: 'D9D9D9', type: ShadingType.CLEAR },
          margins: { top: 60, bottom: 60, left: 120, right: 120 },
          children: [new Paragraph({ children: [boldText('特别说明')] })]
        })
      ]
    }),
    new TableRow({
      children: [
        new TableCell({
          borders,
          columnSpan: 4,
          margins: { top: 60, bottom: 60, left: 120, right: 120 },
          children: [
            new Paragraph({ children: [normalText('1. 作品中未涉及疆域地图。')] }),
            new Paragraph({ children: [normalText('2. 本次参赛作品为原创项目，SmallClaw 为 OpenClaw 的功能演示 Demo，核心实现方案来源于 OpenClaw 正式版本；本次参赛主要工作为：Demo 演示框架搭建、Web/CLI 双模界面实现、多 Agent 流水线集成、Skill 管理系统开发及定时任务系统设计。')] }),
            new Paragraph({ children: [normalText('3. 本作品设计与开发过程中使用了 AI 辅助工具（WorkBuddy/CodeBuddy）用于代码补全与审查，生成内容占比约 20%，其余均由参赛队员独立设计与实现，所使用 AI 工具均来源合规，遵守相关服务协议。')] }),
          ]
        })
      ]
    }),
    // 作者分工标题行
    new TableRow({
      children: [
        new TableCell({
          borders,
          columnSpan: 4,
          shading: { fill: 'D9D9D9', type: ShadingType.CLEAR },
          margins: { top: 60, bottom: 60, left: 120, right: 120 },
          children: [new Paragraph({
            children: [boldText('作者及其分工比例（"姓名1"等请替换为作者姓名，并按实际作者人数增减；表中填写每位作者各项工作量的百分比）')]
          })]
        })
      ]
    }),
  ]
});

// 分工比例表（嵌入主文档）
const authorTable = new Table({
  width: { size: TW, type: WidthType.DXA },
  columnWidths: [2400, 2320, 2320, 2320],
  rows: [
    new TableRow({
      children: [
        headerCell('项目'),
        headerCell('姓名1（负责人）', { align: AlignmentType.CENTER }),
        headerCell('姓名2', { align: AlignmentType.CENTER }),
        headerCell('姓名3', { align: AlignmentType.CENTER }),
      ]
    }),
    new TableRow({
      children: [
        cell('组织协调'),
        cell('50%', { align: AlignmentType.CENTER }),
        cell('30%', { align: AlignmentType.CENTER }),
        cell('20%', { align: AlignmentType.CENTER }),
      ]
    }),
    new TableRow({
      children: [
        cell('作品创意'),
        cell('50%', { align: AlignmentType.CENTER }),
        cell('30%', { align: AlignmentType.CENTER }),
        cell('20%', { align: AlignmentType.CENTER }),
      ]
    }),
    new TableRow({
      children: [
        cell('后端开发'),
        cell('40%', { align: AlignmentType.CENTER }),
        cell('40%', { align: AlignmentType.CENTER }),
        cell('20%', { align: AlignmentType.CENTER }),
      ]
    }),
    new TableRow({
      children: [
        cell('前端开发'),
        cell('30%', { align: AlignmentType.CENTER }),
        cell('30%', { align: AlignmentType.CENTER }),
        cell('40%', { align: AlignmentType.CENTER }),
      ]
    }),
    new TableRow({
      children: [
        cell('测试与文档'),
        cell('40%', { align: AlignmentType.CENTER }),
        cell('30%', { align: AlignmentType.CENTER }),
        cell('30%', { align: AlignmentType.CENTER }),
      ]
    }),
  ]
});

// 相关文件表
const fileTable = new Table({
  width: { size: TW, type: WidthType.DXA },
  columnWidths: [600, 2400, 3360, 2460, 540],
  rows: [
    new TableRow({
      children: [
        headerCell('序号'),
        headerCell('文件名及说明'),
        headerCell('提交状态'),
        headerCell('版权状态'),
      ]
    }),
    new TableRow({
      children: [
        cell('1'),
        cell('SmallClaw 演示 Demo 源代码（ZIP）\n说明：含前端 Vue3 + 后端 Node.js/TypeScript 全部源码'),
        cell('■已上传到网盘', { colSpan: undefined }),
        cell('■自制'),
      ]
    }),
    new TableRow({
      children: [
        cell('2'),
        cell('作品演示视频（MP4）\n说明：展示 CLI/Web 双模式完整功能演示'),
        cell('■已上传到网盘'),
        cell('■自制'),
      ]
    }),
    new TableRow({
      children: [
        cell('3'),
        cell('设计与开发文档（PDF）\n说明：本文档，含需求分析、概要设计、详细设计、测试报告'),
        cell('■已上传到网盘'),
        cell('■自制'),
      ]
    }),
    new TableRow({
      children: [
        cell('4'),
        cell('作品信息概要表（PDF）\n说明：本文档'),
        cell('■已上传到网盘'),
        cell('■自制'),
      ]
    }),
  ]
});

// 承诺书
const promiseBlock = new Table({
  width: { size: TW, type: WidthType.DXA },
  columnWidths: [TW],
  rows: [
    new TableRow({
      children: [
        new TableCell({
          borders,
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [
            new Paragraph({ children: [boldText('本作品全体参赛队员郑重承诺：')] }),
            new Paragraph({ children: [normalText('本作品全体参赛队员确认本表所列内容是正式参赛内容的重要组成部分，并严格按照本大类参赛作品类别提交要求提交了评审必需的文档、数据等参赛材料，本表内容按照要求如实填写。')] }),
            new Paragraph({ children: [normalText('如因提交的参赛材料不符合要求，或本表填写内容不属实，将自愿承担因此导致奖项等级降低甚至终止本作品参加比赛的责任。')] }),
            new Paragraph({ children: [normalText('全体参赛队员签名：（可附授权使用的电子签名图片）')] }),
            new Paragraph({ children: [normalText('日期：     年     月     日')] }),
          ]
        })
      ]
    })
  ]
});

const doc2 = new Document({
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1080, right: 900, bottom: 1080, left: 900 },
      },
    },
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
        children: [new TextRun({ text: '中国大学生计算机设计大赛', bold: true, size: 36, font: '华文中宋' })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [new TextRun({ text: '作品信息概要表 (2025版)', size: 28, font: '黑体' })],
      }),
      mainTable,
      new Paragraph({ spacing: { before: 100, after: 100 }, children: [normalText('')] }),
      authorTable,
      new Paragraph({ spacing: { before: 100, after: 100 }, children: [normalText('')] }),
      new Paragraph({ children: [boldText('相关文件：')] }),
      fileTable,
      new Paragraph({ spacing: { before: 100, after: 100 }, children: [normalText('')] }),
      promiseBlock,
      new Paragraph({ spacing: { before: 200 }, children: [normalText('填写说明：')] }),
      new Paragraph({ children: [normalText('1. 所有□可根据需要变化为■；')] }),
      new Paragraph({ children: [normalText('2. "作者及其分工比例"以及"相关文件"可根据需要增加或减少项目或行数；')] }),
      new Paragraph({ children: [normalText('3. "作者及其分工比例"中的"姓名1"等，请修改为作者具体姓名；')] }),
      new Paragraph({ children: [normalText('4. 请将本表以PDF格式上传到作品目录的"03设计与开发文档"子目录中。')] }),
    ]
  }]
});

Packer.toBuffer(doc2).then(buf => {
  const out = path.join(__dirname, '01-2 作品信息摘要（已填写）.docx');
  fs.writeFileSync(out, buf);
  console.log('Done: ' + out);
}).catch(console.error);
