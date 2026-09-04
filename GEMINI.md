# PL/0 Online Interpreter & Stack CPU Simulator

## Project Goal
The primary goal of this project is to provide a simple, interactive **CPU simulator of a stack architecture** for **Niklaus Wirth's PL/0 code (P-code / Bytecode)**. It serves as a target execution environment for students experimenting with their own compilers (e.g. during university compiler construction courses), allowing them to:
- Inspect code execution step-by-step or continuously.
- Visualize the stack, activation records (stack frames), lexical nesting levels, and heap memory.
- Debug and verify compiler code generation for PL/0 programs.

---

## Language Support (Bilingual: Czech & English)
The project is strictly **bilingual (Czech and English)**, and **it is essential to maintain parity between both languages**:
- All UI labels, buttons, tooltips, and dialogues must be translated in both `cs` and `en`.
- All execution explanations, pre-validation error messages, and runtime simulator errors must have corresponding entries in both:
  - [pl0/localization/cs/core.json](file:///f:/Vyvoj/AI/PL0/pl0/localization/cs/core.json) & [pl0/localization/en/core.json](file:///f:/Vyvoj/AI/PL0/pl0/localization/en/core.json) (Core engine, compiler, allocator, step explainer)
  - [pl0/localization/cs/ui.json](file:///f:/Vyvoj/AI/PL0/pl0/localization/cs/ui.json) & [pl0/localization/en/ui.json](file:///f:/Vyvoj/AI/PL0/pl0/localization/en/ui.json) (UI controls, panels, settings, alerts)
- Localization configuration is managed via [pl0/i18n.js](file:///f:/Vyvoj/AI/PL0/pl0/i18n.js) using `react-i18next`. Any new user-visible message or key must be added to both language files simultaneously.

---

## Architecture Overview

### 1. Virtual Machine & Execution State ([pl0/core/model.ts](file:///f:/Vyvoj/AI/PL0/pl0/core/model.ts))
The simulator executes instructions against a `DataModel` CPU state:
- **`pc` (Program Counter)**: Index of the current instruction to execute.
- **`sp` (Stack Pointer)**: Current top-of-stack index (`-1` when empty).
- **`base` (Base Pointer)**: Starting index of the current activation record / stack frame.
- **`stack`**: Stack memory consisting of `StackItem[]` (values can be numbers or strings) and `StackFrame[]` metadata:
  - Relative offset `0`: Static base (link to enclosing lexical scope, traversed via `FindBase`).
  - Relative offset `1`: Dynamic base (caller's frame base pointer).
  - Relative offset `2`: Return program counter (`pc`).
  - Remaining slots: Local variables, allocated space (`INT`), and temporary expression evaluation values.
- **`heap`**: Dynamic memory managed via explicit allocation and deallocation ([pl0/core/allocator.ts](file:///f:/Vyvoj/AI/PL0/pl0/core/allocator.ts)).
- **`input` / `output`**: Interactive character stream buffers for I/O operations (`REA`, `WRI`).

---

## Instruction Set Architecture (Classic & Extended PL/0)

### 1. Classic Wirth's PL/0 Instructions
- **`LIT 0, A`**: Push literal integer/constant `A` onto the stack.
- **`OPR 0, A`**: Perform arithmetic, relational, or logical operation `A` on stack operands (e.g. unary minus, add, subtract, multiply, divide, modulo, odd check, comparisons: `==`, `!=`, `<`, `>=`, `>`, `<=`).
- **`LOD L, A`**: Load variable from lexical level difference `L` and offset `A` onto the stack.
- **`STO L, A`**: Store value from top of stack into variable at level difference `L` and offset `A`.
- **`CAL L, A`**: Call procedure at instruction `A` with static link resolved for level difference `L`.
- **`INT 0, A`**: Increment stack pointer by `A` (allocate space for local variables in the current activation record).
- **`JMP 0, A`**: Unconditional jump to instruction index `A`.
- **`JMC 0, A`**: Conditional jump to instruction index `A` if top-of-stack is zero (false).
- **`RET 0, 0`**: Return from current procedure, popping frame and restoring caller base and program counter.

### 2. Extended Instructions: Heap Manipulation
- **`NEW 0, 0`**: Pops requested block size `N` from stack, allocates block on the heap, and pushes allocated start data address onto the stack (or `-1` if allocation fails).
- **`DEL 0, 0`**: Pops heap address from stack and deallocates/frees the block on the heap.
- **`LDA 0, 0` (Load from Address)**: Pops heap address from stack, reads the value stored at that heap memory location, and pushes it onto the stack.
- **`STA 0, 0` (Store to Address)**: Pops value and target heap address from stack, storing the value into that heap cell.

### 3. Extended Instructions: Pointers & Indirect Addressing
- **`PLD 0, 0` (Pointer Load)**: Pops level difference `L` and variable offset `A` from the stack, navigates lexical scopes via static link to resolve target base address, and pushes the pointed stack value onto the stack.
- **`PST 0, 0` (Pointer Store)**: Pops level difference `L`, variable offset `A`, and source `value` from the stack, navigates lexical scopes to find base, and writes the value to that target stack location.

### 4. Extended Instructions: Strings & Character I/O
- **String Literals via `LIT`**: `LIT` supports string literals (`LIT 0, "hello"`), pushing string values onto the stack (`StackItem.value` accommodates `number | string`).
- **`REA 0, 0` (Read)**: Reads one character from the input stream and pushes its character code onto the stack.
- **`WRI 0, 0` (Write)**: Pops top of stack and writes it as a character / ASCII symbol to the output stream (handles newlines `\n`).

### 5. Extended Instructions: Floating-Point & Interrupts
- **`OPF 0, A`**: Floating-point operations (add, sub, mul, div, comparisons).
- **`ITR 0, 0`**: Convert integer components on stack to real (floating-point) representation with mantissa and exponent.
- **`RTI 0, 0`**: Convert real to integer representation or return from interrupt.

---

## Directory Structure
- [pl0/](file:///f:/Vyvoj/AI/PL0/pl0): Next.js web application root.
  - [pl0/core/](file:///f:/Vyvoj/AI/PL0/pl0/core):
    - [model.ts](file:///f:/Vyvoj/AI/PL0/pl0/core/model.ts): CPU state, instruction execution loop (`DoStep`), stack frame management (`FindBase`).
    - [allocator.ts](file:///f:/Vyvoj/AI/PL0/pl0/core/allocator.ts): Heap allocator implementation (`Allocate`, `Free`, block tracking).
    - [explainer.ts](file:///f:/Vyvoj/AI/PL0/pl0/core/explainer.ts): Generates step explanations for CPU instructions in Czech/English.
    - [validator.ts](file:///f:/Vyvoj/AI/PL0/pl0/core/validator.ts): Validates assembly input, instruction mnemonics, operands, and structure.
    - [highlighting.ts](file:///f:/Vyvoj/AI/PL0/pl0/core/highlighting.ts): UI step and variable highlighting helpers.
  - [pl0/localization/](file:///f:/Vyvoj/AI/PL0/pl0/localization):
    - `cs/core.json`, `cs/ui.json`: Czech localizations.
    - `en/core.json`, `en/ui.json`: English localizations.
  - [pl0/components/](file:///f:/Vyvoj/AI/PL0/pl0/components): UI components visualizing CPU registers, stack frames, heap, and instructions.
  - [pl0/tests/](file:///f:/Vyvoj/AI/PL0/pl0/tests): Automated unit tests verifying each PL/0 instruction and demonstration programs.
  - [pl0/pages/](file:///f:/Vyvoj/AI/PL0/pl0/pages): Next.js route entry points.

---

## Development & Workflow Commands
All commands should be run inside the `pl0/` directory:
- **Install dependencies**: `npm install`
- **Start development server**: `npm run dev`
- **Build production bundle**: `npm run build`
- **Export static site**: `npm run export`
- **Run tests**: `npm test`
- **Lint**: `npm run lint`

---

## Guiding Principles for Contributions
1. **Educational Clarity First**: The simulator's primary audience is students learning compiler construction. Visualizations, errors, and step explanations must remain clear, unambiguous, and faithful to stack-based CPU concepts.
2. **Bilingual Parity**: Never add or change a localization string in only one language. Czech (`cs`) and English (`en`) must always remain in lockstep.
3. **Predictable Semantics**: Instructions must strictly obey PL/0 stack machine semantics (stack pointer manipulations, static and dynamic links, frame scoping).
4. **Robust Error Handling**: Handle stack overflows, underflows, heap boundary violations, division by zero, and invalid memory dereferences gracefully with helpful warnings and localized errors rather than unhandled crashes.
