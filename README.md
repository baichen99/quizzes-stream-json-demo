[English](./README_EN.md) | 中文

---

2025年8月，ChatGPT 上线了 flashcard 测验功能，用户可针对任意主题生成交互式测验，无论是学术学习、职业技能还是兴趣知识，都能快速获得带选项和答案的完整测验内容。

https://www.bleepingcomputer.com/news/artificial-intelligence/chatgpt-can-now-create-flashcards-quiz-on-any-topic/

但实际使用中不难发现，该功能存在一个明显的体验短板：必须等待所有测验题目完整生成并传输完毕后，用户才能开始作答，即便第一题早已生成，也需忍受不必要的等待。

这一问题的根源，在于传统的全量 JSON 解析模式已无法适配 LLM流式生成的特性，而流式 JSON 解析技术的出现，恰好为这一痛点提供了完美解决方案。

## 核心逻辑

流式 JSON 解析的核心是将 JSON 数据按片段传输、逐段解析，一旦识别出完整的有效子结构（如单道测验题、单个数据对象），就立即输出并使用，无需等待整体完成。

其底层依赖分词器（Tokenizer）+ 解析器（Parser），前者负责拆分数据，后者负责组装解析。

## Tokenizer 与 Parser 概念

我们可以把流式 JSON 解析比作一条高效的数据加工流水线：

-   **Tokenizer（分词器）**  就像流水线的 “拆分工人”，不管收到的 JSON 数据是完整的还是碎片化的（哪怕是单个字符），都会把它们拆成 JSON 语法中的 “最小零件”—— 也就是 Token，比如`{`、`"`、`id`、`:`、`1`这些基础单元。它的工作只负责拆分，不关心这些零件最终要拼成什么，哪怕是逐字符传入，也能精准拆分出对应的 Token。
-   **Parser（解析器）**  则是流水线的 “组装工人”，它接收 Tokenizer 拆好的 “零件”，按照 JSON 的语法规则（比如`{`和`}`对应对象、`[`和`]`对应数组）进行组装。一旦组装出一个完整的有效子结构（比如单道测验题对象），就会立刻把它交出去供使用，不用等所有零件都拆完、所有子结构都组装好。

而我们使用的`JSONParser`，就是把这两个 “工人” 打包好的 “全自动流水线”，无需手动协调拆分和组装，直接向它喂数据就能实现流式解析。

## 逐字符解析 JSON 的实战演示

下面通过一个极简 Demo，模拟 LLM 流式返回 JSON 数据的场景，展示如何用`@streamparser/json`实现逐字符解析，即时输出有效数据：

```javascript
import { JSONParser } from '@streamparser/json';

// 模拟LLM生成的JSON数据（包含两道测验题的数组结构）
const jsonStr = JSON.stringify({
  quizzes: [
    { id: "1", question: "2+2等于几？", options: ["3", "4", "5"], answer: "4" },
    { id: "2", question: "三角形内角和是多少度？", options: ["180", "90", "360"], answer: "180" }
  ]
});
console.log("原始JSON字符串：", jsonStr);

// 初始化流式JSON解析器
// paths: ["$.quizzes.*"] 表示只解析quizzes数组下的每一个测验题对象
const parser = new JSONParser({
  paths: ["$.quizzes.*"]
});

// 解析出完整测验题时触发的回调（组装好一个就输出一个）
parser.onValue = ({ value }) => {
  console.log("即时解析出的测验题：", value);
  // 实际应用中可在此处直接渲染题目到页面，无需等待所有题生成
};

// 模拟流式传输：逐字符将JSON数据传入解析器
for (let i = 0; i < jsonStr.length; i++) {
  parser.write(jsonStr[i]); // 每次仅传入一个字符，模拟数据分片传输
}
```

运行结果

```javascript
原始JSON字符串： {"quizzes":[{"id":"1","question":"2+2等于几？","options":["3","4","5"],"answer":"4"},{"id":"2","question":"三角形内角和是多少度？","options":["180","90","360"],"answer":"180"}]}
即时解析出的测验题： { id: '1', question: '2+2等于几？', options: [ '3', '4', '5' ], answer: '4' }
即时解析出的测验题： { id: '2', question: '三角形内角和是多少度？', options: [ '180', '90', '360' ], answer: '180' }
```

### 说明

-   逐字符传入数据时，底层 Tokenizer 会实时拆分 Token，Parser 则同步组装，一旦完成单个测验题的组装，就通过`onValue`回调输出，实现 “解析出即使用”；
-   `paths`参数的作用是精准筛选需要解析的数据，避免解析无关内容。

## 核心价值：适配 LLM 的流式生成特性

这个 Demo 完美复刻了 ChatGPT 测验功能的优化方向：LLM 生成 JSON 数据时，无需等待完整字符串生成，生成一部分就传输一部分；客户端通过流式 JSON 解析，接收一个字符就处理一个字符，解析出一道测验题就立即展示，用户无需等待所有题目生成就能开始作答。

对于依赖 LLM 生成结构化 JSON 数据的应用（如智能测验、报告生成、多步骤指引等），流式 JSON 解析已成为提升用户体验的关键技术，它让 AI 交互从 “等待全量” 走向 “即时反馈”，真正适配了 LLM 流式生成的核心特性。


## 加餐：使用流式JSON解析，重新实现GPT quizzes

基于上述原理，我们重新实现了 GPT quizzes 的交互体验：

**核心实现思路**：

1. 使用 `JSONParser` 配置 `paths: ['$.quizzes.*']`，监听每道题的解析完成事件
2. 在 `parser.onValue` 回调中，每解析完一道题就立即添加到 React 状态，触发 UI 更新
3. 采用卡片堆叠组件（React bits Stack），新题目以动画方式加入堆栈，用户无需等待全部题目生成即可开始浏览



这样，用户在第一道题解析完成后就能立即看到并开始浏览。

