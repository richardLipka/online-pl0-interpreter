import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ParseAndValidate } from '../core/validator';
import { InitModel, NextStep } from '../core/operations';
import {
    extractProgramFromUrl,
    encodeProgramToUrl,
    encodeBase64Utf8,
} from '../utils/urlProgram';
import { DataModel } from '../core/model';

describe('User Requested Programs - Direct Interpreter & URL Tests', () => {
    // Program 1: Arithmetic expression with STO/LOD and conditional jump
    const prog1 = `0  JMP   0   1
1  INT   0   4
2  LIT   0   1
3  STO   0   3
4  LOD   0   3
5  LIT   0   1
6  OPR   0   8
7  JMC   0  16
8  LIT   0   1
9  LIT   0   2
10  OPR   0   4
11  LIT   0   3
12  LIT   0   4
13  OPR   0   4
14  OPR   0   2
15  STO   0   3
16  RET   0   0`;

    // Program 2: Loop counting from 1 to 3
    const prog2 = `0  JMP   0   1
1  INT   0   4
2  LIT   0   1
3  STO   0   3
4  LOD   0   3
5  LIT   0   3
6  OPR   0  10
7  JMC   0  13
8  LOD   0   3
9  LIT   0   1
10  OPR   0   2
11  STO   0   3
12  JMP   0   4
13  RET   0   0`;

    // Program 3: Procedures and nested lexical scope variable stores (STO across level diffs 0, 1, 2)
    const prog3 = `0  JMP   0  23
1  JMP   0  16
2  JMP   0   3
3  INT   0   4
4  LIT   0  11
5  STO   0   3
6  LIT   0  22
7  STO   1   3
8  LIT   0  33
9  STO   2   3
10  LIT   0   1
11  LIT   0   2
12  OPR   0   8
13  JMC   0  15
14  CAL   2   1
15  RET   0   0
16  INT   0   4
17  LIT   0  10
18  STO   1   3
19  LIT   0  20
20  STO   0   3
21  CAL   0   3
22  RET   0   0
23  INT   0   4
24  LIT   0 100
25  STO   0   3
26  CAL   0  16
27  RET   0   0`;

    function runProgram(instructions: any[], maxSteps = 1000): { model: DataModel; steps: number; isEnd: boolean } {
        const model = InitModel(1024, 250);
        let steps = 0;
        let isEnd = false;
        while (!isEnd && steps < maxSteps) {
            steps++;
            const res = NextStep({ model, instructions, input: '' });
            isEnd = res.isEnd;
        }
        return { model, steps, isEnd };
    }

    describe('1. Direct Interpreter Execution (Without URL)', () => {
        it('Program 1: parses, validates and executes to completion (calculates 1*2 + 3*4 = 14)', () => {
            const pav = ParseAndValidate(prog1);
            assert.strictEqual(pav.parseOK, true, 'Parse should succeed');
            assert.strictEqual(pav.validationOK, true, 'Validation should succeed');
            assert.strictEqual(pav.instructions.length, 17);

            const { model, steps, isEnd } = runProgram(pav.instructions);
            assert.strictEqual(isEnd, true, 'Program 1 should terminate via RET');
            // Check variable at slot 3: 1*2 + 3*4 = 14
            assert.strictEqual(model.stack.stackItems[3].value, 14);
            assert.ok(steps <= 20, `Executed in ${steps} steps`);
        });

        it('Program 2: parses, validates and executes loop from 1 to 3', () => {
            const pav = ParseAndValidate(prog2);
            assert.strictEqual(pav.parseOK, true, 'Parse should succeed');
            assert.strictEqual(pav.validationOK, true, 'Validation should succeed');
            assert.strictEqual(pav.instructions.length, 14);

            const { model, steps, isEnd } = runProgram(pav.instructions);
            assert.strictEqual(isEnd, true, 'Program 2 should terminate via RET');
            // Loop increments variable at slot 3 until it reaches 3
            assert.strictEqual(model.stack.stackItems[3].value, 3);
            assert.ok(steps > 15 && steps <= 30, `Executed in ${steps} steps`);
        });

        it('Program 3: parses, validates and executes nested procedure calls with lexical scoping', () => {
            const pav = ParseAndValidate(prog3);
            assert.strictEqual(pav.parseOK, true, 'Parse should succeed');
            assert.strictEqual(pav.validationOK, true, 'Validation should succeed');
            assert.strictEqual(pav.instructions.length, 28);

            const { model, steps, isEnd } = runProgram(pav.instructions);
            assert.strictEqual(isEnd, true, 'Program 3 should terminate via RET');
            // In main scope (base 0), slot 3 was initially 100, updated by proc 16 (level 1) to 10, then by proc 3 (level 2) to 33
            assert.strictEqual(model.stack.stackItems[3].value, 33);
            assert.ok(steps <= 50, `Executed in ${steps} steps`);
        });
    });

    describe('2. URL Parameter Execution (With Data in URL)', () => {
        it('Program 1 via ?code= query parameter', () => {
            const urlSearch = `?code=${encodeURIComponent(prog1)}`;
            const extracted = extractProgramFromUrl(urlSearch);
            assert.ok(extracted, 'Should extract program from URL');
            assert.strictEqual(extracted.code, prog1);

            const pav = ParseAndValidate(extracted.code);
            assert.strictEqual(pav.parseOK, true);
            assert.strictEqual(pav.validationOK, true);

            const { model, isEnd } = runProgram(pav.instructions);
            assert.strictEqual(isEnd, true);
            assert.strictEqual(model.stack.stackItems[3].value, 14);
        });

        it('Program 1 via ?instructions= alias parameter', () => {
            const urlSearch = `?instructions=${encodeURIComponent(prog1)}`;
            const extracted = extractProgramFromUrl(urlSearch);
            assert.ok(extracted, 'Should extract program from ?instructions=');

            const pav = ParseAndValidate(extracted.code);
            assert.strictEqual(pav.parseOK, true);
            const { isEnd } = runProgram(pav.instructions);
            assert.strictEqual(isEnd, true);
        });

        it('Program 2 via URL-safe Base64 parameter', () => {
            const b64 = encodeBase64Utf8(prog2, true);
            const urlSearch = `?code=${b64}`;
            const extracted = extractProgramFromUrl(urlSearch);
            assert.ok(extracted, 'Should extract Base64 program from URL');
            assert.strictEqual(extracted.code, prog2);

            const pav = ParseAndValidate(extracted.code);
            assert.strictEqual(pav.parseOK, true);
            assert.strictEqual(pav.validationOK, true);

            const { model, isEnd } = runProgram(pav.instructions);
            assert.strictEqual(isEnd, true);
            assert.strictEqual(model.stack.stackItems[3].value, 3);
        });

        it('Program 3 via Hash Fragment (#code=...)', () => {
            const hash = `#code=${encodeURIComponent(prog3)}`;
            const extracted = extractProgramFromUrl('', hash);
            assert.ok(extracted, 'Should extract program from hash fragment');
            assert.strictEqual(extracted.code, prog3);

            const pav = ParseAndValidate(extracted.code);
            assert.strictEqual(pav.parseOK, true);
            assert.strictEqual(pav.validationOK, true);

            const { model, isEnd } = runProgram(pav.instructions);
            assert.strictEqual(isEnd, true);
            assert.strictEqual(model.stack.stackItems[3].value, 33);
        });

        it('Program 3 round-trip: encode to URL, extract, and execute', () => {
            const generatedUrl = encodeProgramToUrl('https://interpreter.local/pl0', prog3);
            const searchPart = generatedUrl.substring(generatedUrl.indexOf('?'));
            const extracted = extractProgramFromUrl(searchPart);
            assert.ok(extracted);
            assert.strictEqual(extracted.code, prog3);

            const pav = ParseAndValidate(extracted.code);
            assert.strictEqual(pav.parseOK, true);
            assert.strictEqual(pav.validationOK, true);

            const { model, isEnd } = runProgram(pav.instructions);
            assert.strictEqual(isEnd, true);
            assert.strictEqual(model.stack.stackItems[3].value, 33);
        });
    });

    describe('3. Symbolic Labels & Directives Execution Tests', () => {
        // VM Exercise Example: loop with symbolic labels @loop and @konec
        const progLabels = `INT 0  4
       LIT 0  1
       STO 0  3
@loop  LOD 0  3
       LIT 0  3
       OPR 0 10
       JMC 0  @konec
       LOD 0  3
       LIT 0  1
       OPR 0  2
       STO 0  3
       JMP 0  @loop
@konec RET 0  0`;

        // VM Exercise Example: with directives &REGS, &STK, &ECHO, &STKN
        const progDirectives = `INT 0  4
&REGS
&STK
       LIT 0  1
       STO 0  3
@loop  LOD 0  3
       LIT 0  3
       OPR 0 10
       JMC 0  @konec
       LOD 0  3
       LIT 0  1
       OPR 0  2
&ECHO hodnota a je na vrcholu zasobniku:
&STKN 1
       STO 0  3
       JMP 0  @loop
@konec RET 0  0`;

        it('parses, validates and executes program with symbolic labels (@loop, @konec)', () => {
            const pav = ParseAndValidate(progLabels);
            assert.strictEqual(pav.parseOK, true, 'Parse should succeed');
            assert.strictEqual(pav.validationOK, true, 'Validation should succeed');
            assert.strictEqual(pav.instructions.length, 13);
            
            // Check that @konec resolved to index 12 and @loop resolved to index 3
            assert.strictEqual(pav.instructions[6].parameter, 12, 'JMC should target @konec at index 12');
            assert.strictEqual(pav.instructions[11].parameter, 3, 'JMP should target @loop at index 3');

            const { model, isEnd } = runProgram(pav.instructions);
            assert.strictEqual(isEnd, true, 'Program should execute to completion');
            assert.strictEqual(model.stack.stackItems[3].value, 3, 'Variable a at slot 3 should be 3');
        });

        it('parses, validates and executes program with directives and symbolic labels', () => {
            const pav = ParseAndValidate(progDirectives);
            assert.strictEqual(pav.parseOK, true, 'Parse should succeed with directives and labels');
            assert.strictEqual(pav.validationOK, true, 'Validation should succeed');
            assert.strictEqual(pav.instructions.length, 13);

            // Verify preDirectives are attached
            assert.ok(pav.instructions[1].preDirectives.length >= 2, 'LIT 0 1 should have &REGS and &STK directives');
            assert.ok(pav.instructions[10].preDirectives.length >= 2, 'STO 0 3 should have &ECHO and &STKN directives');

            const { model, isEnd } = runProgram(pav.instructions);
            assert.strictEqual(isEnd, true, 'Program should execute to completion');
            assert.strictEqual(model.stack.stackItems[3].value, 3, 'Variable a at slot 3 should be 3');
        });

        it('executes program with directives & labels passed via URL query parameter', () => {
            const url = `https://interpreter.local/pl0?code=${encodeURIComponent(progDirectives)}`;
            const searchPart = url.substring(url.indexOf('?'));
            const extracted = extractProgramFromUrl(searchPart);
            assert.ok(extracted, 'Should extract code from URL');

            const pav = ParseAndValidate(extracted.code);
            assert.strictEqual(pav.parseOK, true);
            assert.strictEqual(pav.validationOK, true);

            const { model, isEnd } = runProgram(pav.instructions);
            assert.strictEqual(isEnd, true);
            assert.strictEqual(model.stack.stackItems[3].value, 3);
        });
    });
});
