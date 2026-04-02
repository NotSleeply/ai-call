/**
 * 自动演示脚本
 * 展示大虾的主要功能
 */

import { DaxiaAssistant } from './assistant.js';

async function demo() {
  const assistant = new DaxiaAssistant();
  
  console.log('\n🎬 开始自动演示...\n');
  
  // 等待函数
  const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  
  // 演示1：显示帮助
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📌 演示1: 显示帮助信息');
  console.log('═══════════════════════════════════════════════════════════');
  assistant.showHelp();
  await wait(2000);
  
  // 演示2：读取文件
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📌 演示2: 读取文件内容');
  console.log('═══════════════════════════════════════════════════════════');
  await assistant.readFile('package.json');
  await wait(2000);
  
  // 演示3：列出目录
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📌 演示3: 列出目录内容');
  console.log('═══════════════════════════════════════════════════════════');
  await assistant.listFiles('.');
  await wait(2000);
  
  // 演示4：搜索代码
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📌 演示4: 搜索代码内容');
  console.log('═══════════════════════════════════════════════════════════');
  await assistant.searchContent('class');
  await wait(2000);
  
  // 演示5：项目分析
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📌 演示5: 分析项目结构');
  console.log('═══════════════════════════════════════════════════════════');
  await assistant.analyzeProject();
  await wait(2000);
  
  // 演示6：智能问答
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📌 演示6: 智能问答');
  console.log('═══════════════════════════════════════════════════════════');
  await assistant.askQuestion('什么是TypeScript?');
  await wait(1500);
  
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📌 演示7: 自然语言交互');
  console.log('═══════════════════════════════════════════════════════════');
  await assistant.smartChat('你好');
  await wait(1000);
  await assistant.smartChat('谢谢');
  await wait(1000);
  
  // 结束
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('🎬 演示完成！');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('\n💡 提示: 运行 "npm start" 进入交互模式，亲自体验所有功能！\n');
}

demo().catch(console.error);
