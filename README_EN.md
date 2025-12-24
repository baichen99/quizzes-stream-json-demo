English | [中文](./README.md)

---

In August 2025, ChatGPT launched the flashcard quiz feature, allowing users to generate interactive quizzes on any topic - whether for academic learning, professional skills, or personal interests - to quickly obtain complete quiz content with options and answers.

https://www.bleepingcomputer.com/news/artificial-intelligence/chatgpt-can-now-create-flashcards-quiz-on-any-topic/

However, a significant UX issue becomes apparent in practice: users must wait for all quiz questions to be fully generated and transmitted before they can start answering, even though the first question may have been generated much earlier.

The root cause lies in traditional full JSON parsing mode being unable to adapt to LLM's streaming generation characteristics. Streaming JSON parsing technology provides the perfect solution to this pain point.

## Core Logic

The core of streaming JSON parsing is to transmit JSON data in fragments and parse incrementally. Once a complete valid substructure (such as a single quiz question or data object) is identified, it is immediately output and used without waiting for the entire structure to complete.

It relies on a Tokenizer + Parser at the underlying level, where the former splits data and the latter assembles and parses.

## Tokenizer and Parser Concepts

We can compare streaming JSON parsing to an efficient data processing pipeline:

- **Tokenizer** is like the "splitter" in the pipeline. Regardless of whether the received JSON data is complete or fragmented (even single characters), it splits them into the "smallest parts" in JSON syntax - Tokens, such as `{`, `"`, `id`, `:`, `1`. It only handles splitting and doesn't care what these parts will eventually form. Even when characters are passed one by one, it can accurately split corresponding Tokens.

- **Parser** is the "assembler" in the pipeline. It receives the "parts" split by the Tokenizer and assembles them according to JSON syntax rules (e.g., `{` and `}` correspond to objects, `[` and `]` correspond to arrays). Once a complete valid substructure (such as a single quiz question object) is assembled, it immediately outputs it for use, without waiting for all parts to be split or all substructures to be assembled.

The `JSONParser` we use is a "fully automated pipeline" that packages these two "workers" together, requiring no manual coordination of splitting and assembly - just feed data to it directly to achieve streaming parsing.

## Practical Demo: Character-by-Character JSON Parsing

The following minimal demo simulates an LLM streaming JSON data scenario, demonstrating how to use `@streamparser/json` for character-by-character parsing with instant output of valid data:

```javascript
import { JSONParser } from '@streamparser/json';

// Simulate LLM-generated JSON data (array structure containing two quiz questions)
const jsonStr = JSON.stringify({
  quizzes: [
    { id: "1", question: "What is 2+2?", options: ["3", "4", "5"], answer: "4" },
    { id: "2", question: "What is the sum of angles in a triangle?", options: ["180", "90", "360"], answer: "180" }
  ]
});
console.log("Original JSON string:", jsonStr);

// Initialize streaming JSON parser
// paths: ["$.quizzes.*"] means only parse each quiz question object under the quizzes array
const parser = new JSONParser({
  paths: ["$.quizzes.*"]
});

// Callback triggered when a complete quiz question is parsed (output one as soon as it's assembled)
parser.onValue = ({ value }) => {
  console.log("Instantly parsed quiz question:", value);
  // In actual applications, you can directly render questions to the page here without waiting for all questions to be generated
};

// Simulate streaming transmission: pass JSON data to parser character by character
for (let i = 0; i < jsonStr.length; i++) {
  parser.write(jsonStr[i]); // Pass only one character at a time, simulating fragmented data transmission
}
```

Results:

```javascript
Original JSON string: {"quizzes":[{"id":"1","question":"2+2等于几？","options":["3","4","5"],"answer":"4"},{"id":"2","question":"三角形内角和是多少度？","options":["180","90","360"],"answer":"180"}]}
Instantly parsed quiz question: { id: '1', question: '2+2等于几？', options: [ '3', '4', '5' ], answer: '4' }
Instantly parsed quiz question: { id: '2', question: '三角形内角和是多少度？', options: [ '180', '90', '360' ], answer: '180' }
```

### Notes

- When data is passed character by character, the underlying Tokenizer splits Tokens in real-time, and the Parser assembles synchronously. Once a single quiz question is assembled, it's output through the `onValue` callback, achieving "parse and use immediately";
- The `paths` parameter precisely filters the data to be parsed, avoiding parsing irrelevant content.

## Core Value: Adapting to LLM's Streaming Generation Characteristics

This demo perfectly replicates the optimization direction for ChatGPT's quiz feature: when LLMs generate JSON data, there's no need to wait for the complete string to be generated - generate and transmit in parts; clients use streaming JSON parsing to process character by character as received, display quiz questions immediately as they're parsed, and users can start answering without waiting for all questions to be generated.

For applications that rely on LLMs to generate structured JSON data (such as intelligent quizzes, report generation, multi-step guides, etc.), streaming JSON parsing has become a key technology for improving user experience, transforming AI interaction from "wait for all" to "instant feedback", truly adapting to the core characteristics of LLM streaming generation.

## Bonus: Re-implementing GPT Quizzes Using Streaming JSON Parsing

Based on the above principles, we re-implemented the GPT quizzes interaction experience:

**Core Implementation Approach**:

1. **Streaming Parsing**: Use `JSONParser` with `paths: ['$.quizzes.*']` configuration to listen for completion events of each question's parsing
2. **Instant Rendering**: In the `parser.onValue` callback, immediately add each parsed question to React state, triggering UI updates
3. **Progressive Display**: Use a card stacking component (React Bits Stack), where new questions join the stack with animation. Users can start browsing without waiting for all questions to be generated

**Key Optimizations**:
- Character-by-character simulation of streaming transmission (10ms intervals), clearly demonstrating the parsing process
- Real-time display of loading progress and raw JSON data, visually presenting streaming parsing effects
- Support for card switching interactions with smooth and natural experience

This way, users can immediately see and start browsing as soon as the first question is parsed, truly achieving an "instant feedback" experience of "parse and use immediately".


