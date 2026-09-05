# PL/0 Online Interpreter & Stack CPU Simulator

An interactive educational CPU simulator of a stack architecture for **Niklaus Wirth's PL/0 bytecode (P-code / Bytecode)**, featuring an interactive browser GUI, an automated headless CLI runner for compiler verification, and comprehensive execution profiling.

Strictly **bilingual (Czech and English)** with complete localization parity.

---

## Key Features

- 🖥️ **Interactive Web Simulator**: Step-by-step or continuous execution, visual representation of stack frames (activation records with static/dynamic links), dynamic heap blocks, CPU registers, and I/O buffers.
- ⚙️ **Headless CLI Testing Runner**: Execute PL/0 programs directly from the terminal or in automated CI/CD pipelines with text or structured JSON reporting.
- 🔍 **Comment Directives for Debugging**: Embed non-intrusive testing directives (`&REGS`, `&STK`, `&STKA`, `&STKN`, `&STKRG`, `&ECHO`, `&MEM`, `&HEAP`, `&ASSERT_TOS`, `&STATS`) on standalone lines or inside comments to verify compiler code generation without modifying instruction indices.
- 🎯 **Hardware-Realistic CPU/FPU Semantics**:
  - **Integer division by zero (`OPR 0, 5`)**: Halts execution with a fatal CPU exception.
  - **Floating-point division by zero (`OPF 0, 5`)**: Follows IEEE-754 hardware semantics, generating `Infinity` / `NaN` with soft warnings while allowing calculations to continue safely.
- 📊 **Execution Profiling & Statistics**: Detailed metrics on instruction frequency breakdown, call stack depth, conditional branch decisions (taken vs not taken), and memory footprint.
- 🌐 **100% Bilingual**: Instant language switching between Czech (`cs`) and English (`en`) for all UI labels, step explanations, pre-validation syntax errors, runtime faults, and CLI output.

---

## Quick Start

All project code, tests, and CLI entry points are located in the [`pl0/`](file:///f:/Vyvoj/AI/PL0/pl0) directory.

```bash
# Navigate to the project directory
cd pl0

# Install dependencies
npm install

# Start local interactive web application (http://localhost:3000)
npm run dev

# Run automated test suite (140+ unit tests)
npm test

# Run headless CLI interpreter
npm run cli -- program.pl0

# Run headless CLI with input, execution trace, and profiling
npm run cli -- program.pl0 -i "test input" --trace --stats

# Export static website build (to pl0/out/)
npm run export
```

---

## Instruction Set Architecture (ISA)

The simulator implements classic Wirth PL/0 instructions along with practical extensions for systems programming and compiler courses:

| Category | Instructions | Description |
| :--- | :--- | :--- |
| **Classic Wirth PL/0** | `LIT`, `OPR`, `LOD`, `STO`, `CAL`, `INT`, `JMP`, `JMC`, `RET` | Core stack manipulation, procedure calls with static/dynamic links, and arithmetic/logic. |
| **Heap Memory** | `NEW`, `DEL`, `LDA`, `STA` | Dynamic block allocation, deallocation, and indirect heap memory access. |
| **Pointers & Addressing** | `PLD`, `PST` | Indirect lexical stack load and store across arbitrary procedure scopes. |
| **Character & String I/O** | `LIT` strings, `REA`, `WRI` | Interactive ASCII character input, output with newline support, and string literals. |
| **Floating-Point** | `ITR`, `RTI`, `OPF` | Real number conversion, floating-point arithmetic (IEEE-754), and comparisons. |

---

## Comment Directives for Compiler Debugging

Directives allow students and testing scripts to inspect virtual machine state during execution:

| Directive | Description |
| :--- | :--- |
| `&REGS` | Output Base register (`BASE`), Stack Pointer (`SP`), and Program Counter (`PC`). |
| `&STK` | Dump entire stack contents from index `0` to `SP`. |
| `&STKA` | Dump current activation record (`BASE` to `SP`). |
| `&STKN <n>` | Dump top `<n>` values from the stack. |
| `&STKRG <a> <b>` | Dump stack contents within index range `[a, b]`. |
| `&ECHO <text>` | Print arbitrary debugging message or marker. |
| `&MEM` | Print stack and heap memory footprint. |
| `&HEAP` | Dump active heap blocks and allocated data. |
| `&ASSERT_TOS <val>` | Assert that top-of-stack equals `<val>` without popping. Halts if mismatch. |
| `&STATS` | Output snapshot of execution profiling counters. |

Directives stream directly to standard output (`model.output` in GUI and terminal stdout in CLI) without altering calculation state.

---

## Repository Structure

- [`pl0/`](file:///f:/Vyvoj/AI/PL0/pl0): Web application & CLI root
  - [`pl0/cli/`](file:///f:/Vyvoj/AI/PL0/pl0/cli): Headless CLI runner (`index.ts`, `runner.ts`)
  - [`pl0/core/`](file:///f:/Vyvoj/AI/PL0/pl0/core): VM engine (`model.ts`, `directives.ts`, `allocator.ts`, `explainer.ts`, `validator.ts`)
  - [`pl0/components/`](file:///f:/Vyvoj/AI/PL0/pl0/components): UI components (Instructions, Stack, Heap, Controls, Statistics, Help)
  - [`pl0/localization/`](file:///f:/Vyvoj/AI/PL0/pl0/localization): Bilingual dictionaries (`cs` and `en`)
  - [`pl0/tests/`](file:///f:/Vyvoj/AI/PL0/pl0/tests): Automated unit tests (140+ test cases)
  - [`pl0/pages/`](file:///f:/Vyvoj/AI/PL0/pl0/pages): Next.js entry points
- [`GEMINI.md`](file:///f:/Vyvoj/AI/PL0/GEMINI.md): Project specification, ISA details, and design guidelines
- [`pl0/README.md`](file:///f:/Vyvoj/AI/PL0/pl0/README.md): Detailed technical documentation, VM internals, and component architecture

---

## Development & Verification

```bash
# Run all tests
npm test

# Run linter
npm run lint

# Build production bundle
npm run build
```

---

## License & Credits
Developed for compiler construction courses at the University of West Bohemia (ZČU). Based on Niklaus Wirth's PL/0 architecture.
