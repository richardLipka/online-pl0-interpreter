import { describe, it } from 'node:test';
import assert from 'node:assert';
import i18next from 'i18next';
import { runProgram, runSteps, getTOS } from './test_helpers';
import { InitModel, NextStep } from '../core/operations';
import { InstructionType } from '../core/model';
import csCore from '../localization/cs/core.json';
import enCore from '../localization/en/core.json';
import csUi from '../localization/cs/ui.json';
import enUi from '../localization/en/ui.json';

describe('Warning Log & Unexpected Operations Detection', () => {
    describe('1. Division by Zero', () => {
        it('OPR 0, 5: throws and logs error on division by zero', () => {
            assert.throws(() => {
                runSteps('LIT 0, 10\nLIT 0, 0\nOPR 0, 5', 3);
            }, /Division by zero|Dělení nulou/);
        });

        it('OPR 0, 6: throws and logs error on modulo by zero', () => {
            assert.throws(() => {
                runSteps('LIT 0, 10\nLIT 0, 0\nOPR 0, 6', 3);
            }, /Division by zero|Dělení nulou/);
        });

        it('OPF 0, 5: does not throw on positive float / 0, emits warning and pushes Infinity onto stack', () => {
            const model = InitModel(1024, 250);
            const instructions = [
                { index: 0, instruction: InstructionType.LIT, level: 0, parameter: 10, parameter_str: '10', explanationParts: null },
                { index: 1, instruction: InstructionType.LIT, level: 0, parameter: 0, parameter_str: '0', explanationParts: null },
                { index: 2, instruction: InstructionType.ITR, level: 0, parameter: 0, parameter_str: '0', explanationParts: null },
                { index: 3, instruction: InstructionType.LIT, level: 0, parameter: 0, parameter_str: '0', explanationParts: null },
                { index: 4, instruction: InstructionType.LIT, level: 0, parameter: 0, parameter_str: '0', explanationParts: null },
                { index: 5, instruction: InstructionType.ITR, level: 0, parameter: 0, parameter_str: '0', explanationParts: null },
                { index: 6, instruction: InstructionType.OPF, level: 0, parameter: 5, parameter_str: '5', explanationParts: null },
            ];
            for (let i = 0; i < 6; i++) {
                NextStep({ model, instructions, input: '' });
            }
            const res = NextStep({ model, instructions, input: '' });
            assert.strictEqual(res.warnings.length, 1);
            assert.match(res.warnings[0], /Floating-point division by zero|Dělení nulou v plovoucí řádové čárce/);
            assert.strictEqual(model.stack.stackItems[model.sp].value, 'Infinity');
        });

        it('OPF 0, 5: does not throw on negative float / 0, emits warning and pushes -Infinity onto stack', () => {
            const model = InitModel(1024, 250);
            const instructions = [
                { index: 0, instruction: InstructionType.LIT, level: 0, parameter: 10, parameter_str: '10', explanationParts: null },
                { index: 1, instruction: InstructionType.LIT, level: 0, parameter: 0, parameter_str: '0', explanationParts: null },
                { index: 2, instruction: InstructionType.ITR, level: 0, parameter: 0, parameter_str: '0', explanationParts: null },
                { index: 3, instruction: InstructionType.OPF, level: 0, parameter: 1, parameter_str: '1', explanationParts: null }, // U_MINUS -> -10.0
                { index: 4, instruction: InstructionType.LIT, level: 0, parameter: 0, parameter_str: '0', explanationParts: null },
                { index: 5, instruction: InstructionType.LIT, level: 0, parameter: 0, parameter_str: '0', explanationParts: null },
                { index: 6, instruction: InstructionType.ITR, level: 0, parameter: 0, parameter_str: '0', explanationParts: null }, // 0.0
                { index: 7, instruction: InstructionType.OPF, level: 0, parameter: 5, parameter_str: '5', explanationParts: null }, // -10.0 / 0.0
            ];
            for (let i = 0; i < 7; i++) {
                NextStep({ model, instructions, input: '' });
            }
            const res = NextStep({ model, instructions, input: '' });
            assert.strictEqual(res.warnings.length, 1);
            assert.match(res.warnings[0], /Floating-point division by zero|Dělení nulou v plovoucí řádové čárce/);
            assert.strictEqual(model.stack.stackItems[model.sp].value, '-Infinity');
        });

        it('OPF 0, 5: does not throw on 0.0 / 0.0, emits warning and pushes NaN onto stack', () => {
            const model = InitModel(1024, 250);
            const instructions = [
                { index: 0, instruction: InstructionType.LIT, level: 0, parameter: 0, parameter_str: '0', explanationParts: null },
                { index: 1, instruction: InstructionType.LIT, level: 0, parameter: 0, parameter_str: '0', explanationParts: null },
                { index: 2, instruction: InstructionType.ITR, level: 0, parameter: 0, parameter_str: '0', explanationParts: null }, // 0.0
                { index: 3, instruction: InstructionType.LIT, level: 0, parameter: 0, parameter_str: '0', explanationParts: null },
                { index: 4, instruction: InstructionType.LIT, level: 0, parameter: 0, parameter_str: '0', explanationParts: null },
                { index: 5, instruction: InstructionType.ITR, level: 0, parameter: 0, parameter_str: '0', explanationParts: null }, // 0.0
                { index: 6, instruction: InstructionType.OPF, level: 0, parameter: 5, parameter_str: '5', explanationParts: null }, // 0.0 / 0.0
            ];
            for (let i = 0; i < 6; i++) {
                NextStep({ model, instructions, input: '' });
            }
            const res = NextStep({ model, instructions, input: '' });
            assert.strictEqual(res.warnings.length, 1);
            assert.match(res.warnings[0], /Floating-point division by zero|Dělení nulou v plovoucí řádové čárce/);
            assert.strictEqual(model.stack.stackItems[model.sp].value, 'NaN');
        });

        it('OPF 0, 6: does not throw on float modulo by zero, emits warning and pushes NaN onto stack', () => {
            const model = InitModel(1024, 250);
            const instructions = [
                { index: 0, instruction: InstructionType.LIT, level: 0, parameter: 10, parameter_str: '10', explanationParts: null },
                { index: 1, instruction: InstructionType.LIT, level: 0, parameter: 0, parameter_str: '0', explanationParts: null },
                { index: 2, instruction: InstructionType.ITR, level: 0, parameter: 0, parameter_str: '0', explanationParts: null },
                { index: 3, instruction: InstructionType.LIT, level: 0, parameter: 0, parameter_str: '0', explanationParts: null },
                { index: 4, instruction: InstructionType.LIT, level: 0, parameter: 0, parameter_str: '0', explanationParts: null },
                { index: 5, instruction: InstructionType.ITR, level: 0, parameter: 0, parameter_str: '0', explanationParts: null },
                { index: 6, instruction: InstructionType.OPF, level: 0, parameter: 6, parameter_str: '6', explanationParts: null },
            ];
            for (let i = 0; i < 6; i++) {
                NextStep({ model, instructions, input: '' });
            }
            const res = NextStep({ model, instructions, input: '' });
            assert.strictEqual(res.warnings.length, 1);
            assert.match(res.warnings[0], /Floating-point modulo by zero|Modulo nulou v plovoucí řádové čárce/);
            assert.strictEqual(model.stack.stackItems[model.sp].value, 'NaN');
        });

        it('Cascading calculations: Infinity propagates safely and program completes without crashing', () => {
            const code = [
                'LIT 0, 10',
                'LIT 0, 0',
                'ITR 0, 0',   // 10.0
                'LIT 0, 0',
                'LIT 0, 0',
                'ITR 0, 0',   // 0.0
                'OPF 0, 5',   // 10.0 / 0.0 = Infinity
                'LIT 0, 5',
                'LIT 0, 0',
                'ITR 0, 0',   // 5.0
                'OPF 0, 2',   // Infinity + 5.0 = Infinity
                'LIT 0, 100',
                'LIT 0, 0',
                'ITR 0, 0',   // 100.0
                'OPF 0, 12',  // Infinity > 100.0 -> 1 (true)
            ].join('\n');

            const res = runProgram(code);
            assert.strictEqual(res.isEnd, true);
            assert.strictEqual(getTOS(res.model), 1);
            assert.strictEqual(res.warnings.length, 1);
        });

        it('Hardware realism contrast: integer divide halts immediately, float divide continues', () => {
            // Integer division by zero halts on step 3
            assert.throws(() => {
                runProgram('LIT 0, 10\nLIT 0, 0\nOPR 0, 5\nLIT 0, 999');
            }, /Division by zero|Dělení nulou/);

            // Float division by zero continues and executes subsequent instructions
            const floatCode = [
                'LIT 0, 10',
                'LIT 0, 0',
                'ITR 0, 0',
                'LIT 0, 0',
                'LIT 0, 0',
                'ITR 0, 0',
                'OPF 0, 5',   // Divide by zero -> Infinity
                'LIT 0, 999', // Executes subsequent instruction!
            ].join('\n');

            const res = runProgram(floatCode);
            assert.strictEqual(res.isEnd, true);
            assert.strictEqual(getTOS(res.model), 999);
            assert.strictEqual(res.warnings.length, 1);
        });

        it('Bilingual warning format check for OPF divide by zero (CS and EN)', () => {
            // English check
            i18next.changeLanguage('en');
            const enRes = runProgram('LIT 0, 10\nLIT 0, 0\nITR 0, 0\nLIT 0, 0\nLIT 0, 0\nITR 0, 0\nOPF 0, 5');
            assert.strictEqual(enRes.warnings[0], 'Warning: Floating-point division by zero at instruction 6 (result is Infinity)');

            // Czech check
            i18next.changeLanguage('cs');
            const csRes = runProgram('LIT 0, 10\nLIT 0, 0\nITR 0, 0\nLIT 0, 0\nLIT 0, 0\nITR 0, 0\nOPF 0, 5');
            assert.strictEqual(csRes.warnings[0], 'Varování: Dělení nulou v plovoucí řádové čárce na instrukci 6 (výsledek je Infinity)');

            // Restore English default
            i18next.changeLanguage('en');
        });
    });

    describe('2. Jump to Negative Address', () => {
        it('JMP with negative address throws specific negative address message', () => {
            const model = InitModel(1024, 250);
            const instructions = [
                { index: 0, instruction: InstructionType.JMP, level: 0, parameter: -3, parameter_str: '-3', explanationParts: null },
            ];
            assert.throws(() => {
                NextStep({ model, instructions, input: '' });
            }, /negative address -3|zápornou adresu -3/);
        });

        it('JMC with negative address throws when condition is met', () => {
            const model = InitModel(1024, 250);
            const instructions = [
                { index: 0, instruction: InstructionType.LIT, level: 0, parameter: 0, parameter_str: '0', explanationParts: null },
                { index: 1, instruction: InstructionType.JMC, level: 0, parameter: -1, parameter_str: '-1', explanationParts: null },
            ];
            NextStep({ model, instructions, input: '' });
            assert.throws(() => {
                NextStep({ model, instructions, input: '' });
            }, /negative address -1|zápornou adresu -1/);
        });

        it('CAL with negative address throws negative address error', () => {
            const model = InitModel(1024, 250);
            const instructions = [
                { index: 0, instruction: InstructionType.CAL, level: 0, parameter: -2, parameter_str: '-2', explanationParts: null },
            ];
            assert.throws(() => {
                NextStep({ model, instructions, input: '' });
            }, /negative address -2|zápornou adresu -2/);
        });
    });

    describe('3. Overwrite & Access of Unexpected Memory (Stack & Heap)', () => {
        it('STO to relative offset 0 (static base SB) emits specific soft warning', () => {
            const code = [
                'INT 0, 4',
                'LIT 0, 99',
                'STO 0, 0', // Overwrites static base at offset 0
            ].join('\n');
            const res = runProgram(code);
            assert.ok(res.warnings.length > 0, 'Should emit warning');
            assert.match(res.warnings[0], /static base|statické báze|SB/i);
        });

        it('STO to relative offset 1 (dynamic base DB) emits specific soft warning', () => {
            const code = [
                'INT 0, 4',
                'LIT 0, 99',
                'STO 0, 1', // Overwrites dynamic base at offset 1
            ].join('\n');
            const res = runProgram(code);
            assert.ok(res.warnings.length > 0, 'Should emit warning');
            assert.match(res.warnings[0], /dynamic base|dynamické báze|DB/i);
        });

        it('STO to relative offset 2 (return PC) emits specific soft warning', () => {
            const code = [
                'INT 0, 4',
                'LIT 0, 99',
                'STO 0, 2', // Overwrites return PC at offset 2
            ].join('\n');
            const res = runProgram(code);
            assert.ok(res.warnings.length > 0, 'Should emit warning');
            assert.match(res.warnings[0], /return PC|návratového PC|PC/i);
        });

        it('STO to unallocated stack memory beyond SP emits soft warning', () => {
            const code = [
                'LIT 0, 42',
                'STO 0, 5', // SP is 0, storing at offset 5 (unallocated)
            ].join('\n');
            const res = runProgram(code);
            assert.ok(res.warnings.length > 0, 'Should emit warning');
            assert.match(res.warnings[0], /unallocated|nealokované/i);
        });

        it('LOD from unallocated stack memory beyond SP emits soft warning', () => {
            const code = [
                'INT 0, 3', // SP is 2
                'LOD 0, 5', // Reading unallocated offset 5
            ].join('\n');
            const res = runProgram(code);
            assert.ok(res.warnings.length > 0, 'Should emit warning');
            assert.match(res.warnings[0], /unallocated|nealokované/i);
        });

        it('PST to offset 1 (DB metadata) emits soft warning', () => {
            const code = [
                'INT 0, 4',
                'LIT 0, 123', // value
                'LIT 0, 0',   // level
                'LIT 0, 1',   // offset (dynamic base)
                'PST 0, 0',
            ].join('\n');
            const res = runProgram(code);
            assert.ok(res.warnings.length > 0, 'Should emit warning');
            assert.match(res.warnings[0], /dynamic base|dynamické báze|DB/i);
        });

        it('PST to unallocated stack slot emits soft warning', () => {
            const code = [
                'LIT 0, 777', // value
                'LIT 0, 0',   // level
                'LIT 0, 10',  // offset beyond SP
                'PST 0, 0',
            ].join('\n');
            const res = runProgram(code);
            assert.ok(res.warnings.length > 0, 'Should emit warning');
            assert.match(res.warnings[0], /unallocated|nealokované/i);
        });

        it('PLD from unallocated stack slot emits soft warning', () => {
            const code = [
                'INT 0, 3',
                'LIT 0, 0',  // level
                'LIT 0, 10', // offset beyond SP
                'PLD 0, 0',
            ].join('\n');
            const res = runProgram(code);
            assert.ok(res.warnings.length > 0, 'Should emit warning');
            assert.match(res.warnings[0], /unallocated|nealokované/i);
        });

        it('STA to heap metadata cell emits soft warning', () => {
            const code = [
                'LIT 0, 0',  // Address 0 (metadata size cell)
                'LIT 0, 99', // Value to store
                'STA 0, 0',
            ].join('\n');
            const res = runProgram(code);
            assert.ok(res.warnings.length > 0, 'Should emit warning');
            assert.match(res.warnings[0], /metadata|metadat/i);
        });

        it('STA to unallocated heap memory emits soft warning', () => {
            const code = [
                'LIT 0, 20', // Unallocated heap address
                'LIT 0, 99', // Value to store
                'STA 0, 0',
            ].join('\n');
            const res = runProgram(code);
            assert.ok(res.warnings.length > 0, 'Should emit warning');
            assert.match(res.warnings[0], /unallocated|nealokované/i);
        });

        it('LDA from unallocated heap memory emits soft warning', () => {
            const code = [
                'LIT 0, 15', // Unallocated heap address
                'LDA 0, 0',
            ].join('\n');
            const res = runProgram(code);
            assert.ok(res.warnings.length > 0, 'Should emit warning');
            assert.match(res.warnings[0], /unallocated|nealokované/i);
        });

        it('NEW with invalid size emits warning and returns -1', () => {
            const code = [
                'LIT 0, 0', // Invalid allocation size 0
                'NEW 0, 0',
            ].join('\n');
            const res = runProgram(code);
            assert.ok(res.warnings.length > 0, 'Should emit warning on failed allocation');
            assert.match(res.warnings[0], /failed|selhala/i);
        });
    });

    describe('4. Jump to Empty Part of Memory & Procedure Control Flow', () => {
        it('JMP past the end of instructions throws jump to empty memory error', () => {
            assert.throws(() => {
                runSteps('JMP 0, 100', 1);
            }, /empty part of memory|prázdné části paměti/);
        });

        it('JMC past the end of instructions throws when jump is taken', () => {
            assert.throws(() => {
                runSteps('LIT 0, 0\nJMC 0, 50', 2);
            }, /empty part of memory|prázdné části paměti/);
        });

        it('CAL past the end of instructions throws jump to empty memory error', () => {
            assert.throws(() => {
                runSteps('CAL 0, 50', 1);
            }, /empty part of memory|prázdné části paměti/);
        });

        it('RET with corrupted return PC pointing past program throws jump to empty memory', () => {
            const model = InitModel(1024, 250);
            // Stack frame at base 0 with return PC = 999
            model.stack.stackItems[2] = { value: 999 };
            model.base = 1; // Non-zero base so RET executes return
            model.stack.stackFrames.push({ index: 1, size: 3 });
            model.stack.stackItems[1 + 2] = { value: 999 }; // return PC = 999
            model.stack.stackItems[1 + 1] = { value: 0 };   // dynamic base = 0
            const instructions = [
                { index: 0, instruction: InstructionType.RET, level: 0, parameter: 0, parameter_str: '0', explanationParts: null },
            ];
            assert.throws(() => {
                NextStep({ model, instructions, input: '' });
            }, /empty part of memory|prázdné části paměti/);
        });
    });

    describe('5. No Operands in Stack to Continue', () => {
        it('OPR 0, 2 (ADD) on empty stack throws insufficient operands error', () => {
            assert.throws(() => {
                runSteps('OPR 0, 2', 1);
            }, /Not enough operands on stack|Nedostatek operandů na zásobníku/);
        });

        it('OPR with only 1 operand when 2 required throws error', () => {
            assert.throws(() => {
                runSteps('LIT 0, 5\nOPR 0, 2', 2);
            }, /Not enough operands on stack|Nedostatek operandů na zásobníku/);
        });

        it('STO on empty stack throws insufficient operands error', () => {
            assert.throws(() => {
                runSteps('STO 0, 3', 1);
            }, /Not enough operands on stack|Nedostatek operandů na zásobníku/);
        });

        it('PST on insufficient operands (< 3) throws error', () => {
            assert.throws(() => {
                runSteps('LIT 0, 1\nLIT 0, 2\nPST 0, 0', 3);
            }, /Not enough operands on stack|Nedostatek operandů na zásobníku/);
        });

        it('WRI on empty stack throws insufficient operands error', () => {
            assert.throws(() => {
                runSteps('WRI 0, 0', 1);
            }, /Not enough operands on stack|Nedostatek operandů na zásobníku/);
        });
    });

    describe('6. Bilingual Localization Parity', () => {
        it('core.json has identical keys in CS and EN', () => {
            const csKeys = Object.keys(csCore).sort();
            const enKeys = Object.keys(enCore).sort();
            assert.deepStrictEqual(csKeys, enKeys);
        });

        it('ui.json has identical keys in CS and EN', () => {
            const csKeys = Object.keys(csUi).sort();
            const enKeys = Object.keys(enUi).sort();
            assert.deepStrictEqual(csKeys, enKeys);
        });
    });
});
