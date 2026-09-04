import { describe, it } from 'node:test';
import assert from 'node:assert';
import { runProgram, getTOS } from './test_helpers';

describe('Extended Pointer Instructions (PST, PLD)', () => {
    it('PST stores a value indirectly and PLD loads it back (level 0)', () => {
        const code = [
            'INT 0, 4',     // allocate slots: 0,1,2 (overhead), 3 (target var)
            // PST takes: source_value, level, offset
            'LIT 0, 999',   // source value
            'LIT 0, 0',     // level diff = 0
            'LIT 0, 3',     // offset = 3
            'PST 0, 0',     // stack[base + 3] = 999
            // PLD takes: level, offset
            'LIT 0, 0',     // level diff = 0
            'LIT 0, 3',     // offset = 3
            'PLD 0, 0',     // pushes stack[base + 3]
        ].join('\n');

        const res = runProgram(code);
        assert.strictEqual(getTOS(res.model), 999);
        assert.strictEqual(res.model.sp, 4); // slot 4 holds the loaded TOS
    });

    it('PST and PLD operate across procedure lexical scopes (level 1)', () => {
        const code = [
            'INT 0, 4',     // 0: main frame (offset 3 is x)
            'LIT 0, 100',   // 1
            'STO 0, 3',     // 2: main.x = 100
            'CAL 0, 5',     // 3: call proc
            'RET 0, 0',     // 4: halt main
            // Proc at line 5:
            'INT 0, 3',     // 5: proc frame
            // Read main.x via PLD with level 1, offset 3
            'LIT 0, 1',     // 6: level = 1
            'LIT 0, 3',     // 7: offset = 3
            'PLD 0, 0',     // 8: loads 100 onto stack
            'LIT 0, 50',    // 9
            'OPR 0, 2',     // 10: 100 + 50 = 150
            // Write 150 back to main.x via PST with level 1, offset 3
            'LIT 0, 1',     // 11: level = 1
            'LIT 0, 3',     // 12: offset = 3
            'PST 0, 0',     // 13: main.x = 150
            'RET 0, 0',     // 14: return to main
        ].join('\n');

        const res = runProgram(code);
        assert.strictEqual(res.isEnd, true);
        // Verify main.x at offset 3 is now 150
        assert.strictEqual(res.model.stack.stackItems[3].value, 150);
    });
});
