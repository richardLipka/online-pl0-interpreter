# PL/0 Online Interpreter & Stack CPU Simulator

An interactive stack architecture CPU simulator and headless verification tool for Niklaus Wirth's PL/0 bytecode (P-code). Designed for students and instructors in compiler construction courses to inspect, debug, profile, and verify compiler code generation both visually in the browser and automatically via a headless CLI.

---

## Table of Contents
1. [Quick Start & Scripts](#quick-start--scripts)
2. [Instruction Set Architecture (ISA)](#instruction-set-architecture-isa)
   - [Classic Instructions](#1-classic-wirths-pl0-instructions)
   - [Compatibility with Wirth's Original PL/0](#compatibility-with-wirths-original-pl0)
   - [Extended Heap Instructions](#2-extended-instructions-heap-manipulation)
   - [Extended Pointer Instructions](#3-extended-instructions-pointers--indirect-addressing)
   - [Extended String & I/O Instructions](#4-extended-instructions-strings--character-io)
   - [Extended Floating-Point Instructions](#5-extended-instructions-floating-point)
   - [Division by Zero Hardware Semantics](#6-division-by-zero-hardware-semantics)
3. [Comment Directives for Debugging](#comment-directives-for-debugging)
4. [Headless CLI Testing Environment](#headless-cli-testing-environment)
5. [Architecture & Core Engine](#architecture--core-engine)
   - [Data Model & CPU State](#data-model--cpu-state)
   - [Stack Frame Layout](#stack-frame-layout)
   - [Heap Allocator](#heap-allocator)
   - [Explainer & UI Highlighting](#explainer--ui-highlighting)
   - [Validator](#validator)
   - [Profiling & Execution Statistics](#profiling--execution-statistics)
6. [UI & Component Structure](#ui--component-structure)
7. [Bilingual Localization (CS / EN)](#bilingual-localization-cs--en)
8. [Automated Testing](#automated-testing)
9. [Build & Deployment](#build--deployment)

---

## Quick Start & Scripts

This project uses **Node.js (>= 18)** and **npm**.

```bash
# Install dependencies
npm install

# Start local interactive web application (Next.js dev server on http://localhost:3000)
npm run dev

# Run automated unit test suite (all instructions & features)
npm test

# Run headless CLI interpreter on a PL/0 file
npm run cli -- program.pl0

# Run headless CLI with input, profiling statistics, and execution trace
npm run cli -- program.pl0 -i "sample input" --stats -t

# Run ESLint linter
npm run lint

# Build production bundle
npm run build

# Export static website to the /out folder
npm run export
```

---

## Instruction Set Architecture (ISA)

### 1. Classic Wirth's PL/0 Instructions

| Instruction | Level (L) | Parameter (A) | Halts on Error? | Description |
| :--- | :---: | :---: | :---: | :--- |
| **`LIT`** | `0` | `value` | No | Pushes literal constant `value` onto the stack top. Also supports string literals (e.g. `LIT 0, "hello"`). |
| **`INT`** | `0` | `offset` | Yes | Increments the stack pointer `sp` by `offset` to allocate or deallocate local variable space in the current frame. |
| **`OPR`** | `0` | `operation` | Yes | Executes arithmetic, relational, or logical operation `operation` on stack operands. Halts on divide/modulo by zero or insufficient operands. |
| **`LOD`** | `L` | `offset` | Yes | Loads variable from lexical scope difference `L` and relative address `offset` onto the stack. A negative `offset` (e.g. `LOD 0, -1` reading an argument pushed by the caller) reaches below the frame base; it works but logs a soft warning. |
| **`STO`** | `L` | `offset` | Yes | Pops top of stack and stores it into variable at lexical scope difference `L` and relative address `offset`. A negative `offset` works like in `LOD` and logs a soft warning. |
| **`CAL`** | `L` | `address` | Yes | Calls procedure at instruction index `address`. Sets up activation record with Static Link (resolved across `L` scopes), Dynamic Link, and return `PC`. |
| **`RET`** | `0` | `0` | Yes | Returns from current procedure, pops the activation record, and restores caller's `base` and `PC`. |
| **`JMP`** | `0` | `address` | Yes | Unconditional jump to instruction index `address`. |
| **`JMC`** | `0` | `address` | Yes | Conditional jump to instruction index `address` if top of stack is `0` (false). Pops condition from stack. |

#### OPR Operations (`OPR 0, A`)
- `0`: Return from procedure (Wirth's original; accepted as an alias of `RET`)
- `1`: Unary minus (`-TOS`)
- `2`: Addition (`+`)
- `3`: Subtraction (`-`)
- `4`: Multiplication (`*`)
- `5`: Integer Division (`/`, rounded towards zero, e.g. `-7 / 2 = -3`) — *halts on division by zero*
- `6`: Modulo (`%`, the result has the sign of the dividend, e.g. `-7 % 2 = -1`) — *halts on modulo by zero*
- `7`: Odd check (`TOS % 2 != 0`)
- `8`: Equality check (`==`)
- `9`: Non-equality check (`!=`)
- `10`: Less than (`<`)
- `11`: Greater or equal (`>=`)
- `12`: Greater than (`>`)
- `13`: Less or equal (`<=`)

---

#### Compatibility with Wirth's Original PL/0

The classic instructions execute exactly like procedure `interpret` of Wirth's PL/0 compiler ([plzero.pas](http://www.standardpascal.org/plzero.pas), see also the [p-code description](https://blackmesatech.com/2011/12/pl0/pl0.xhtml)). `tests/wirth_reference.test.ts` contains a literal translation of the original interpreter and runs generated programs with nested procedures, recursion and outer-scope variables on both machines, comparing `P`, `B`, `T` and the whole stack after every instruction (this also covers the static and dynamic chains). Differences from the original:

- **Mnemonics**: the conditional jump is `JMC` and return is `RET 0, 0`; Wirth's `JPC` and `OPR 0, 0` are accepted as aliases.
- **`OPR 0, 6` / `OPR 0, 7`**: in the original, operation 6 is *odd* and there is no modulo; here 6 is modulo and 7 is *odd*. Programs for the original must use `OPR 0, 7` for `odd`.
- **Stack indices start at 0** (Pascal `s[1]` is index 0 here), so stored bases are one lower than in the original; behaviour is identical.
- **End of program**: the original stops whenever `P` becomes 0 (e.g. after `JMP 0, 0`); here the program ends by `RET` in the main block or by running past the last instruction. Code generated by Wirth's compiler ends the same way in both.
- **Safety checks**: where the original has undefined behaviour (static link search above the main block, `INT` below the current frame, a negative stack index), the simulator halts with a localized error. A negative *address* (e.g. `LOD 0, -1` reading a value pushed by the caller) works like in the original and only logs a warning.
- `STO` of the original prints every stored value; the simulator has `WRI` and debug directives instead.

### 2. Extended Instructions: Heap Manipulation

| Instruction | Level (L) | Parameter (A) | Halts on Error? | Description |
| :--- | :---: | :---: | :---: | :--- |
| **`NEW`** | `0` | `0` | Yes | Pops block size `N` from stack. Allocates `N` cells on heap and pushes start data address onto stack (`-1` with a warning when the allocation fails). Halts only on an empty stack. |
| **`DEL`** | `0` | `0` | Yes | Pops heap address from stack and frees allocated memory block. Halts on double-free or invalid address. |
| **`LDA`** | `0` | `0` | Yes | Pops heap address from stack and loads the stored value onto stack. Halts on invalid/out-of-bounds address. |
| **`STA`** | `0` | `0` | Yes | Pops value and heap destination address from stack, storing value in heap cell. Halts on invalid/out-of-bounds address. |

A negative heap address (`-heap size` to `-1`) wraps around to the end of the heap like an unsigned address (`-1` is the last cell) and logs a soft warning; this applies to `LDA`, `STA` and `DEL` (e.g. using the `-1` returned by a failed `NEW`). Addresses below `-heap size` or at or above the heap size halt.

---

### 3. Extended Instructions: Pointers & Indirect Addressing

| Instruction | Level (L) | Parameter (A) | Halts on Error? | Description |
| :--- | :---: | :---: | :---: | :--- |
| **`PLD`** | `0` | `0` | Yes | Pops level difference `L` and variable offset `A` from stack, resolves target base via static links, and pushes pointed stack value. |
| **`PST`** | `0` | `0` | Yes | Pops level `L`, offset `A`, and `value` from stack, resolves target base, and stores `value` at that stack address. |

---

### 4. Extended Instructions: Strings & Character I/O

| Instruction | Level (L) | Parameter (A) | Halts on Error? | Description |
| :--- | :---: | :---: | :---: | :--- |
| **`LIT`** | `0` | `"text"` | No | String literal support. Pushes string onto the stack (`StackItem.value: number \| string`). |
| **`REA`** | `0` | `0` | Yes | Reads one character from interactive input buffer and pushes its ASCII code onto stack. Halts if input is empty. |
| **`WRI`** | `0` | `0` | Yes | Pops ASCII code or string from stack top and outputs it to output stream (supports `\n`). Halts on invalid code. |

---

### 5. Extended Instructions: Floating-Point

| Instruction | Level (L) | Parameter (A) | Halts on Error? | Description |
| :--- | :---: | :---: | :---: | :--- |
| **`ITR`** | `0` | `0` | Yes | Converts the whole part (`SP - 1`) and the fractional part (TOS) to a real number (exponent, mantissa on TOS). Leading zeros of the fractional part are significant: `LIT 0, 3` + `LIT 0, 05` is 3.05. |
| **`RTI`** | `0` | `0` or `1` | Yes | Converts a real number (exponent, mantissa on TOS) to integers: `RTI 0, 0` pushes the whole and the fractional part, `RTI 0, 1` only the whole part (truncated towards zero). |
| **`OPF`** | `0` | `operation` | Yes | Executes floating-point operation on stack operands (add, sub, mul, div, mod, comparisons). |

---

### 6. Division by Zero Hardware Semantics

The simulator faithfully replicates real CPU & FPU hardware execution:
- **Integer Division / Modulo (`OPR 0, 5`, `OPR 0, 6`)**:
  - Halts execution immediately with a fatal runtime exception.
  - Emits localized error message: *"Division by zero / Dělení nulou"*.
  - Matches CPU integer divider exception (e.g. x86 `#DE` Division Error).
- **Floating-Point Division / Modulo (`OPF 0, 5`, `OPF 0, 6`)**:
  - Does **not** crash or halt the CPU.
  - Generates IEEE-754 standard special values: signed `Infinity` (`-Infinity`) or `NaN` (for `0.0 / 0.0` or `float % 0.0`).
  - Logs a descriptive soft warning to the warning log and execution report.
  - Subsequent instructions continue executing normally, enabling cascading mathematical algorithms to complete.

---

## Comment Directives for Debugging

Comment directives allow students and compiler construction test harnesses to inspect machine state at specific execution points without affecting instruction addresses, program counter (`pc`), or stack calculations.

Directives can be placed on a standalone line or inside comments:
```pl0
; Standalone:
&REGS

; Inside comments:
LOD 0, 3  ; &STKN 1
STO 0, 4  // &ASSERT_TOS 42
```

### Directive Reference Table

| Directive | Arguments | Output / Action |
| :--- | :--- | :--- |
| **`&REGS`** | — | Prints CPU register contents: `BASE`, Stack Pointer `SP`, and Program Counter `PC`. |
| **`&STK`** | — | Dumps entire stack contents from index `0` up to `SP`. |
| **`&STKA`** | — | Dumps current activation record from `BASE` up to `SP`. |
| **`&STKN`** | `<n>` | Dumps top `<n>` values from the stack top. |
| **`&STKRG`** | `<a> <b>` | Dumps stack contents in range `[a, b]` inclusive. |
| **`&ECHO`** | `<text>` | Outputs arbitrary debugging message to output stream. |
| **`&MEM`** | — | Outputs memory footprint: stack depth, active heap cells, and block counts. |
| **`&HEAP`** | — | Dumps detailed state and data contents of all active heap blocks. |
| **`&ASSERT_TOS`** | `<expected>` | Verifies top-of-stack equals `<expected>` without popping. A mismatch is reported as `[ASSERTION FAIL ...]` and execution continues. |
| **`&STATS`** | — | Outputs snapshot of instruction profiling counters and cycle counts. |

Directives stream directly to standard output (`model.output` in GUI and stdout in CLI).

---

## Headless CLI Testing Environment

The headless CLI runner allows automated batch testing of compiler outputs without running the browser UI.

### Usage
```bash
npm run cli -- [options] <files.pl0 ...>
# or
npx tsx cli/index.ts [options] <files.pl0 ...>
```

### CLI Options
- `-i, --input <text|file>`: String or file path providing input characters for `REA`.
- `-s, --max-steps <num>`: Execution step limit per program (default: `100000`).
- `-t, --trace`: Enable detailed per-step instruction trace (Step, PC, Opcode, TOS).
- `--stats`: Output comprehensive instruction profiling and memory footprint report.
- `--no-debug`: Disable execution of comment directives.
- `-n, --ignore-line-numbers`: Ignore leading line numbers before instructions (strips them automatically).
- `-f, --format <text|json>`: Output format: `text` (terminal readable) or `json` (for CI/CD automation and auto-graders).
- `--lang <en|cs>`: Localization language for diagnostics and reports (default: `en`).
- `-h, --help`: Display help and directive usage.

### Automated CI/CD Example
```bash
# Run multiple tests in JSON format for automated validation
npm run cli -- test1.pl0 test2.pl0 -f json
```

Exit code is `0` when all programs execute successfully, `1` if any program halts on a runtime error or an assertion fails, `2` on a validation error or a missing file and `3` when the step limit is reached.

---

## Architecture & Core Engine

```
pl0/
├── cli/                 # Headless CLI entry point & test runner
│   ├── index.ts         # CLI argument parser and binary entry
│   └── runner.ts        # Headless runner & text/JSON report formatters
├── core/                # Core virtual machine engine
│   ├── model.ts         # DataModel, CPU state, DoStep loop, ExecutionStats
│   ├── directives.ts    # Comment directive parser and execution engine
│   ├── allocator.ts     # Heap memory manager (Allocate, Free, UpdateHeapBlocks)
│   ├── explainer.ts     # Step explainer and UI highlighting generator
│   ├── validator.ts     # Assembly parser, mnemonic validation, syntax checks
│   └── highlighting.ts  # Visual highlighting tokens
├── components/          # React 18 UI components
│   ├── controlpanel/    # Play, Step, Reset, Speed, Language controls
│   ├── instructions/    # Instruction viewer, PC pointer, step explanations
│   ├── stack/           # Stack visualization with activation record boundaries
│   ├── heap/            # Dynamic heap visualizer and allocation blocks
│   ├── io/              # Input/output stream panes
│   ├── statistics/      # Profiling and execution metrics modal
│   └── help/            # Interactive help modal (Instructions & CLI tabs)
├── localization/        # Bilingual i18n dictionaries
│   ├── cs/ (core.json, ui.json)
│   └── en/ (core.json, ui.json)
└── tests/               # 140+ unit tests across all VM components
```

### Data Model & CPU State
Implemented in `core/model.ts`:
- `pc`: Program counter (current instruction index).
- `sp`: Stack pointer (`-1` when empty).
- `base`: Base pointer of current activation record.
- `stack`: `Stack` interface holding `StackItem[]` values (`number | string`) and `StackFrame[]` metadata.
- `heap`: `Heap` interface managing dynamically allocated cells and blocks.
- `input`: Character stream buffer for `REA`.
- `output`: Output text buffer for `WRI` and directives.
- `stats`: `ExecutionStats` tracking instruction counts, branch statistics, call stack depth, memory footprint, and soft warnings.

### Stack Frame Layout
Activation records maintain lexical and dynamic links:
- **Offset 0**: Static Base (SB) — points to enclosing lexical scope (traversed via `FindBase(stack, base, level)`).
- **Offset 1**: Dynamic Base (DB) — points to caller's frame base pointer.
- **Offset 2**: Return Program Counter (Return `PC`).
- **Offset 3+**: Local variables (allocated via `INT`) and temporary expression values.

### Heap Allocator
Implemented in `core/allocator.ts`, first-fit allocation in both variants (selectable in the heap panel):
- **Single-linked (implicit list)**: every block has a 2-cell header `[size, allocated]`, so a block only knows the next one. `DEL` merges the freed block with all directly following free blocks; free blocks to its left are merged later, when `NEW` walks over them (deferred coalescing). A block is split only if the rest can hold a header, so a block may be one cell larger than requested.
- **Doubly-linked**: 3-cell header `[size, allocated, previous block]`; `DEL` merges immediately with free neighbours on both sides, so no two free blocks are ever adjacent. A block may be up to two cells larger than requested.
- Freed data cells are zeroed; `DEL` of an address that is not the start of an allocated block (including double free) halts.
- Provides `Allocate`, `Free`, `GetValueFromHeap`, and `PutValueOnHeap`; `AllocateDummy`/`FreeDummy` predict the result for the step explanation.
- `UpdateHeapBlocks` converts raw heap memory into high-level blocks (`HeapBlock[]`) for UI visualization.

### Explainer & UI Highlighting
Implemented in `core/explainer.ts`:
- Simulates the next instruction non-destructively before execution.
- Generates human-readable explanations in Czech and English.
- Emits placeholder tokens indicating stack indices, heap cells, and registers to highlight in the UI.

### Profiling & Execution Statistics
The simulator tracks fine-grained execution metrics:
- Total instructions executed and cycle count.
- Breakdown by category (Arithmetic, Data Movement, Control Flow, Procedure Calls, Heap, I/O, Floating-Point).
- Procedure call and return counts, and maximum call stack depth.
- Conditional branch decisions (branches taken vs branches not taken).
- Maximum stack pointer depth and peak heap memory allocation.
- Soft warning occurrences (float divide by zero, out-of-bounds stack/heap dereferences).

---

## Bilingual Localization (CS / EN)

The simulator is strictly **bilingual (Czech and English)**:
- Managed via `react-i18next` and configured in `i18n.js`.
- Two namespaces per language:
  - `core.json`: Compiler error messages, runtime exceptions, instruction explanations, soft warnings, and directive outputs.
  - `ui.json`: Button labels, headings, modal dialogs, instruction help texts, and statistics keys.
- **Strict parity**: All keys exist in both `cs` and `en` dictionaries. Automated tests enforce parity between language files.

---

## Automated Testing

The project includes an extensive test suite executed via Node's native test runner (`tsx --test`):

```bash
npm test
```

### Test Coverage
- `instructions_classic.test.ts`: LIT, INT, OPR, LOD, STO, CAL, RET, JMP, JMC.
- `instructions_heap.test.ts`: NEW, DEL, LDA, STA, boundary handling, double-free prevention.
- `instructions_pointer.test.ts`: PLD, PST across lexical scope levels.
- `instructions_io.test.ts`: LIT strings, REA, WRI, newline handling.
- `instructions_float.test.ts`: ITR, RTI, OPF, floating-point math, IEEE-754 division by zero.
- `warnings_unexpected_operations.test.ts`: Hardware-realistic division by zero, memory boundary warnings, jumping to empty memory.
- `cli_and_directives.test.ts`: Headless CLI options, comment directives (`&REGS`, `&STK`, `&ASSERT_TOS`, etc.), text/JSON report generation.
- `statistics_and_help.test.ts`: Profiling metrics, instruction halting tags, bilingual localization parity.
- `wirth_reference.test.ts`: Lockstep comparison with Wirth's original interpreter (classic instructions, static and dynamic chains, `PLD`/`PST` against `LOD`/`STO`, stack view frames).
- `allocator_properties.test.ts`: Random `NEW`/`DEL` sequences for both allocators checking first fit, splitting, coalescing, data integrity and the heap view blocks.
- `review_fixes.test.ts`: Regression tests for integer division, real number conversions, localized runtime errors, validator line numbers and labels, explanations and program links.
- `programs.test.ts`: Complete PL/0 demo programs (Factorial iterative/recursive, Fibonacci, Euclidean GCD, String stream processing, Linked list on heap).

---

## Build & Deployment

### Local Development
```bash
npm run dev
```

### Static Production Export
To deploy on static web hosting without a Node.js runtime (e.g. Apache, Nginx, GitLab Pages, GitHub Pages):
```bash
npm run export
```
The static HTML, CSS, and JS bundle is generated in the `pl0/out/` directory. Simply serve or copy the contents of `out/` to any web server.
