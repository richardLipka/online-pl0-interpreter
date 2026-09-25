import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert';
import i18next from 'i18next';
import { runProgram, runSteps, getTOS } from './test_helpers';
import { ParseAndValidate } from '../core/validator';
import { InitModel, NextStep } from '../core/operations';
import { ExplainInstruction } from '../core/explainer';
import { runHeadless } from '../cli/runner';
import { encodeProgramToUrl, extractProgramFromUrl } from '../utils/urlProgram';
import csCore from '../localization/cs/core.json';
import enCore from '../localization/en/core.json';
import csUi from '../localization/cs/ui.json';
import enUi from '../localization/en/ui.json';

function stackValues(code: string, input: string = ''): (number | string)[] {
    const res = runProgram(code, input);
    return res.model.stack.stackItems.slice(0, res.model.sp + 1).map((i) => i.value);
}

// Steps through `steps` instructions and returns the explanation of the next one with placeholders filled in
function explainAfter(code: string, steps: number, input: string = ''): string {
    const pav = ParseAndValidate(code);
    assert.ok(pav.parseOK && pav.validationOK, JSON.stringify(pav.parseErrors.concat(pav.validationErrors)));
    const model = InitModel(1024, 250);
    let currentInput = input;
    for (let i = 0; i < steps; i++) {
        currentInput = NextStep({ model, instructions: pav.instructions, input: currentInput }).inputNextStep;
    }
    const explanation = ExplainInstruction({ model, instructions: pav.instructions, input: currentInput });
    let message = explanation.message;
    for (const p of explanation.placeholders) {
        message = message.split('%' + p.placeholder).join(String(p.value));
    }
    return message;
}

describe('Review fixes', () => {
    afterEach(() => {
        i18next.changeLanguage('en');
    });

    describe('Integer division and modulo', () => {
        it('OPR 0, 5 truncates towards zero like OPR 0, 6, so that a = (a / b) * b + a mod b', () => {
            for (const [a, b] of [[-7, 2], [7, -2], [-7, -2], [7, 2]]) {
                const [q] = stackValues(`LIT 0 ${a}\nLIT 0 ${b}\nOPR 0 5`);
                const [r] = stackValues(`LIT 0 ${a}\nLIT 0 ${b}\nOPR 0 6`);
                assert.strictEqual(q, Math.trunc(a / b), `${a} / ${b}`);
                assert.strictEqual(Number(q) * b + Number(r), a, `${a} = (${a} / ${b}) * ${b} + ${a} mod ${b}`);
            }
        });
    });

    describe('Real numbers', () => {
        it('RTI appends the exponent zeros to multi-digit mantissas (12 * 10^2 = 1200)', () => {
            assert.deepStrictEqual(stackValues('LIT 0 2\nLIT 0 12\nRTI 0 0'), ['1200', '0']);
            assert.deepStrictEqual(stackValues('LIT 0 1\nLIT 0 -12\nRTI 0 1'), ['-120']);
        });

        it('RTI keeps the sign of negative numbers smaller than one', () => {
            assert.deepStrictEqual(stackValues('LIT 0 -1\nLIT 0 -5\nRTI 0 0'), ['-0', '5']);
            assert.deepStrictEqual(stackValues('LIT 0 -3\nLIT 0 -5\nRTI 0 0'), ['-0', '005']);
            assert.deepStrictEqual(stackValues('LIT 0 -2\nLIT 0 -314\nRTI 0 0'), ['-3', '14']);
            // the integer conversion truncates towards zero
            assert.deepStrictEqual(stackValues('LIT 0 -1\nLIT 0 -5\nRTI 0 1'), ['0']);
        });

        it('ITR keeps leading zeros of the fractional part (3 and 05 is 3.05)', () => {
            assert.deepStrictEqual(stackValues('LIT 0 3\nLIT 0 05\nITR 0 0'), [-2, 305]);
            // RTI converts it back
            assert.deepStrictEqual(stackValues('LIT 0 3\nLIT 0 05\nITR 0 0\nRTI 0 0'), ['3', '05']);
            // the literal still behaves as the number 5 in integer arithmetic
            assert.deepStrictEqual(stackValues('LIT 0 05\nLIT 0 1\nOPR 0 2'), [6]);
        });

        it('results keep 6 significant digits regardless of the sign', () => {
            assert.deepStrictEqual(stackValues('LIT 0 1234567\nLIT 0 0\nITR 0 0'), [1, 123456]);
            assert.deepStrictEqual(stackValues('LIT 0 -1234567\nLIT 0 0\nITR 0 0'), [1, -123456]);
            // 1 / 3 - the leading zero of 0.333... must not count as a digit
            assert.deepStrictEqual(
                stackValues('LIT 0 1\nLIT 0 0\nITR 0 0\nLIT 0 3\nLIT 0 0\nITR 0 0\nOPF 0 5'),
                [-6, 333333]
            );
        });

        it('OPF 0, 7 tests whether the number (not just its mantissa) is odd', () => {
            // 3 * 10^1 = 30 is even
            assert.deepStrictEqual(stackValues('LIT 0 1\nLIT 0 3\nOPF 0 7'), [0]);
            // 70 * 10^-1 = 7 is odd
            assert.deepStrictEqual(stackValues('LIT 0 -1\nLIT 0 70\nOPF 0 7'), [1]);
            // 2.5 is not an odd integer
            assert.deepStrictEqual(stackValues('LIT 0 -1\nLIT 0 25\nOPF 0 7'), [0]);
        });

        it('OPF 0, 1 does not produce "-NaN"', () => {
            assert.deepStrictEqual(stackValues('LIT 0 0\nLIT 0 NaN\nOPF 0 1'), [0, 'NaN']);
        });
    });

    describe('Localized runtime errors instead of JavaScript exceptions', () => {
        const cases: [string, string, RegExp, RegExp][] = [
            ['LOD below the bottom of the stack', 'INT 0 3\nLOD 0 -5', /negative stack index -5/, /záporný index zásobníku -5/],
            ['STO below the bottom of the stack', 'INT 0 3\nLIT 0 1\nSTO 0 -9', /negative stack index -9/, /záporný index zásobníku -9/],
            ['PLD below the bottom of the stack', 'INT 0 3\nLIT 0 0\nLIT 0 -9\nPLD 0 0', /negative stack index -9/, /záporný index zásobníku -9/],
            ['PLD with a negative level', 'INT 0 3\nLIT 0 -1\nLIT 0 1\nPLD 0 0', /Invalid level -1/, /Neplatný level -1/],
            ['PST with a non-integer offset', 'INT 0 3\nLIT 0 7\nLIT 0 0\nLIT 0 1.5\nPST 0 0', /Invalid stack address 1\.5/, /Neplatná adresa zásobníku 1\.5/],
            ['unary minus on an empty stack', 'OPR 0 1', /required 1, found 0/, /vyžadováno 1, nalezeno 0/],
            ['stack overflow', 'INT 0 5000', /maximum is 1024 cells\)$/, /maximum je 1024 buněk\)$/],
            ['LDA with a non-integer address', 'LIT 0 2.5\nLDA 0 0', /undefined index 2\.5/, /nedefinovaném indexu 2\.5/],
            ['REA of a character above 255', 'REA 0 0', /'č' \(code 269\)/, /'č' \(kód 269\)/],
        ];
        for (const [name, code, en, cs] of cases) {
            it(name, () => {
                const input = code.startsWith('REA') ? 'č' : '';
                assert.throws(() => runProgram(code, input), en);
                i18next.changeLanguage('cs');
                assert.throws(() => runProgram(code, input), cs);
            });
        }

        it('a negative address below the frame base works (e.g. reading an argument) and logs a warning', () => {
            const code = [
                'INT 0 3',
                'LIT 0 42', // argument pushed by the caller at stack index 3
                'CAL 0 4',
                'RET 0 0',
                'INT 0 3', // procedure frame starts at stack index 4
                'LOD 0 -1', // reads the argument
                'LIT 0 1',
                'OPR 0 2',
                'STO 0 -1', // writes the result back to the caller
                'LIT 0 7',
                'LIT 0 0',
                'LIT 0 -1',
                'PLD 0 0', // the same through a pointer
                'RET 0 0',
            ].join('\n');
            const res = runProgram(code);
            assert.strictEqual(res.isEnd, true);
            assert.strictEqual(res.model.stack.stackItems[3].value, 43);
            assert.deepStrictEqual(res.warnings, [
                'Warning: Reading with negative address -1 below the frame base (stack index 3)',
                'Warning: Writing with negative address -1 below the frame base (stack index 3)',
                'Warning: Reading with negative address -1 below the frame base (stack index 3)',
            ]);
            i18next.changeLanguage('cs');
            assert.strictEqual(
                runProgram(code).warnings[0],
                'Varování: Čtení se zápornou adresou -1 pod bází rámce (index zásobníku 3)'
            );
        });

        it('a failing DEL keeps PC at the DEL instruction', () => {
            const pav = ParseAndValidate('LIT 0 5\nDEL 0 0');
            const model = InitModel(1024, 250);
            NextStep({ model, instructions: pav.instructions, input: '' });
            assert.throws(() => NextStep({ model, instructions: pav.instructions, input: '' }));
            assert.strictEqual(model.pc, 1);
        });

        it('a RET with a corrupted return address does not change the registers', () => {
            const pav = ParseAndValidate('INT 0 3\nCAL 0 3\nRET 0 0\nINT 0 3\nLIT 0 99\nSTO 0 2\nRET 0 0');
            const model = InitModel(1024, 250);
            for (let i = 0; i < 5; i++) NextStep({ model, instructions: pav.instructions, input: '' });
            const before = { pc: model.pc, base: model.base, sp: model.sp };
            assert.throws(() => NextStep({ model, instructions: pav.instructions, input: '' }), /instruction index 99/);
            assert.deepStrictEqual({ pc: model.pc, base: model.base, sp: model.sp }, before);
        });

        it('NEW with a non-integer size fails with -1 and leaves the heap intact', () => {
            const res = runProgram('LIT 0 2.5\nNEW 0 0');
            assert.strictEqual(getTOS(res.model), -1);
            assert.strictEqual(res.warnings.length, 1);
            assert.strictEqual(res.model.heap.heapBlocks.length, 1);
            assert.strictEqual(res.model.heap.heapBlocks[0].free, true);
        });

        it('writing "\\" and "n" produces a line break without touching earlier directive output', () => {
            // 92 = '\', 110 = 'n'
            const res = runProgram('LIT 0 92\nWRI 0 0\nLIT 0 110\nWRI 0 0');
            assert.strictEqual(res.output, '\n');
            const echo = runProgram('&ECHO C:\\new\nLIT 0 65\nWRI 0 0');
            assert.ok(echo.output.includes('C:\\new'), echo.output);
        });
    });

    describe('Negative heap addresses', () => {
        const wrapWarning = (from: number, to: number) => `Warning: Negative heap address ${from} wraps around to address ${to} (heap size 250)`;

        it('LDA and STA wrap a negative address around to the end of the heap with a warning', () => {
            const res = runProgram('LIT 0 -1\nLIT 0 7\nSTA 0 0\nLIT 0 249\nLDA 0 0\nLIT 0 -1\nLDA 0 0');
            assert.deepStrictEqual(stackValues('LIT 0 -1\nLIT 0 7\nSTA 0 0\nLIT 0 249\nLDA 0 0\nLIT 0 -1\nLDA 0 0'), [7, 7]);
            assert.strictEqual(res.model.heap.values[249], 7);
            assert.strictEqual(res.warnings.filter((w) => w === wrapWarning(-1, 249)).length, 2);
            // -heap size is the first cell
            assert.deepStrictEqual(stackValues('LIT 0 -250\nLDA 0 0'), [248]);
            i18next.changeLanguage('cs');
            assert.ok(
                runProgram('LIT 0 -1\nLDA 0 0').warnings.includes('Varování: Záporná adresa haldy -1 se přetočí na adresu 249 (velikost haldy 250)')
            );
        });

        it('DEL wraps a negative address too; it still has to be the start of an allocated block', () => {
            const res = runProgram('LIT 0 10\nNEW 0 0\nLIT 0 -248\nDEL 0 0');
            assert.deepStrictEqual(res.warnings, [wrapWarning(-248, 2)]);
            assert.strictEqual(res.model.heap.heapBlocks.length, 1);
            assert.strictEqual(res.model.heap.heapBlocks[0].free, true);
            assert.throws(() => runProgram('LIT 0 -1\nDEL 0 0'), /address 249 \(-1\)/);
        });

        it('addresses below -heap size are still out of bounds', () => {
            assert.throws(() => runProgram('LIT 0 -251\nLDA 0 0'), /undefined index -251/);
            assert.throws(() => runProgram('LIT 0 -251\nLIT 0 1\nSTA 0 0'), /undefined index -251/);
        });

        it('the explanation shows the wrapped address', () => {
            assert.strictEqual(
                explainAfter('LIT 0 -1\nLIT 0 7\nSTA 0 0', 2),
                'Access on unallocated heap address 249 (the negative address -1 wraps around to 249)'
            );
            assert.strictEqual(
                explainAfter('LIT 0 10\nNEW 0 0\nLIT 0 -248\nDEL 0 0', 3),
                'Deallocates 10 heap cells from address 2 (the negative address -248 wraps around to 2)'
            );
        });
    });

    describe('Validator', () => {
        it('rejects non-integer addresses, levels and indices but allows non-integer literals', () => {
            for (const code of ['JMP 0 1.5', 'INT 0 2.5', 'LOD 0.5 3', '0.5 LIT 0 1']) {
                const pav = ParseAndValidate(code);
                assert.strictEqual(pav.parseOK, false, code);
            }
            assert.strictEqual(ParseAndValidate('LIT 0 1.5').parseOK, true);
        });

        it('accepts operands separated by a comma without a space', () => {
            const pav = ParseAndValidate('LIT 0,5\nLIT 0,"a, b"');
            assert.strictEqual(pav.parseOK, true);
            assert.strictEqual(pav.instructions[0].parameter, 5);
            assert.strictEqual(pav.instructions[1].parameter_str, 'a, b');
        });

        it('reports unresolved and duplicate labels in the selected language', () => {
            const code = '@a LIT 0 1\n@a LIT 0 2\nJMP 0 @missing';
            let pav = ParseAndValidate(code);
            assert.deepStrictEqual(
                pav.parseErrors.map((e) => [e.rowIndex, e.error]),
                [[1, 'Duplicate label: @a'], [2, 'Unresolved label: @missing']]
            );
            i18next.changeLanguage('cs');
            pav = ParseAndValidate(code);
            assert.deepStrictEqual(
                pav.parseErrors.map((e) => e.error),
                ['Duplicitní návěští: @a', 'Neznámé návěští: @missing']
            );
        });

        it('reports validation errors on the source line of the instruction', () => {
            const pav = ParseAndValidate('; comment\n\nLIT 0 1\nOPR 0 99');
            assert.deepStrictEqual(pav.validationErrors.map((e) => e.rowIndex), [3]);
            const cli = runHeadless('; comment\n\nLIT 0 1\nOPR 0 99', { language: 'cs' });
            assert.match(cli.errorMessage ?? '', /^Řádek 4: /);
        });

        it('keeps a directive written in the comment of a label line', () => {
            const pav = ParseAndValidate('LIT 0 1\n@loop ; &ECHO here\nLIT 0 2');
            assert.strictEqual(pav.parseOK, true);
            assert.deepStrictEqual(pav.instructions[1].preDirectives?.map((d) => d.type), ['ECHO']);
        });
    });

    describe('Explainer', () => {
        it('explains STO, PST and PLD (in both languages)', () => {
            const code = 'INT 0 5\nLIT 0 7\nSTO 0 3\nLIT 0 42\nLIT 0 0\nLIT 0 4\nPST 0 0\nLIT 0 0\nLIT 0 4\nPLD 0 0';
            assert.strictEqual(
                explainAfter(code, 2),
                'Saves the value on top of the stack (7) to level 0 address 3 of the stack (index 3)'
            );
            assert.strictEqual(explainAfter(code, 6), 'Saves the value 42 to level 0 and address 4 of the stack (index 4)');
            assert.strictEqual(
                explainAfter(code, 9),
                'Loads the value from level 0 and address 4 of the stack (index 4, value 42) and adds it to the top'
            );
            i18next.changeLanguage('cs');
            assert.strictEqual(
                explainAfter(code, 9),
                'Načte hodnotu z levelu 0 adresy 4 zásobníku (index 4, hodnota 42) a přidá ji na vrchol'
            );
        });

        it('explains a DEL of an address that does not start a block as an error, like the VM', () => {
            assert.strictEqual(
                explainAfter('LIT 0 5\nNEW 0 0\nLIT 0 5\nDEL 0 0', 3),
                'Error while deallocating address 5 - out of bounds or not allocated'
            );
            assert.strictEqual(
                explainAfter('LIT 0 5\nNEW 0 0\nDEL 0 0', 2),
                'Deallocates 5 heap cells from address 2'
            );
        });

        it('shows the character read or written as a value, including special characters', () => {
            assert.strictEqual(explainAfter('REA 0 0', 0, '%'), "Adds a character from the input to the top of the stack - character '%' (37)");
            assert.strictEqual(explainAfter('LIT 0 10\nWRI 0 0', 1), "Prints the value on top of the stack (10) as ASCII '\\n'");
        });
    });

    describe('Directives', () => {
        it('&REGS after a jump shows the current PC register', () => {
            const res = runHeadless('JMP 0 2 ; &REGS\nLIT 0 1\nLIT 0 2');
            assert.ok(res.debugLogs[0].startsWith('[DIRECTIVE &REGS at PC 0] PC: 2,'), res.debugLogs[0]);
        });

        it('&ASSERT_TOS without an expected value fails', () => {
            const res = runHeadless('LIT 0 0\n&ASSERT_TOS');
            assert.strictEqual(res.assertions.failed, 1);
        });
    });

    describe('Program links', () => {
        it('keeps "+" and "%" in the shared program and input', () => {
            for (const [code, input] of [
                ['LIT 0 "+"\nWRI 0 0 ; a+b', '3+4'],
                ['LIT 0 "%20"\nWRI 0 0 ; 50% of a+b', '3+4 %25'],
            ]) {
                const url = encodeProgramToUrl('https://example.com/pl0', code, input);
                const extracted = extractProgramFromUrl(url.substring(url.indexOf('?')), '');
                assert.deepStrictEqual(extracted, { code, input });
            }
        });
    });

    describe('Localization', () => {
        it('uses the same %N placeholders in Czech and English', () => {
            const placeholders = (s: string) => (s.match(/%\d/g) ?? []).sort().join(',');
            for (const [cs, en] of [[csCore, enCore], [csUi, enUi]] as Record<string, string>[][]) {
                for (const key of Object.keys(en)) {
                    assert.strictEqual(placeholders(cs[key]), placeholders(en[key]), key);
                }
            }
        });
    });
});
