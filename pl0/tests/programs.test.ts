import { describe, it } from 'node:test';
import assert from 'node:assert';
import { runProgram, getTOS } from './test_helpers';

describe('Complete PL/0 Demonstration Programs', () => {
    describe('Factorial Program', () => {
        it('calculates 5! = 120 using an iterative loop', () => {
            // Variables:
            // offset 3: n (init 5)
            // offset 4: fact (init 1)
            // Loop: while (n > 1) { fact = fact * n; n = n - 1; }
            const code = [
                'INT 0, 5',      // 0: allocate stack slots (0,1,2 links; 3=n, 4=fact)
                'LIT 0, 5',      // 1: n = 5
                'STO 0, 3',      // 2
                'LIT 0, 1',      // 3: fact = 1
                'STO 0, 4',      // 4
                // Loop condition: n > 1
                'LOD 0, 3',      // 5: load n
                'LIT 0, 1',      // 6
                'OPR 0, 12',     // 7: n > 1
                'JMC 0, 19',     // 8: if false, jump to exit (19)
                // fact = fact * n
                'LOD 0, 4',      // 9: load fact
                'LOD 0, 3',      // 10: load n
                'OPR 0, 4',      // 11: fact * n
                'STO 0, 4',      // 12: store fact
                // n = n - 1
                'LOD 0, 3',      // 13: load n
                'LIT 0, 1',      // 14
                'OPR 0, 3',      // 15: n - 1
                'STO 0, 3',      // 16: store n
                'JMP 0, 5',      // 17: loop back
                // Exit:
                'LOD 0, 4',      // 18: load fact to TOS
                'RET 0, 0',      // 19: halt
            ].join('\n');

            const res = runProgram(code);
            assert.strictEqual(res.isEnd, true);
            assert.strictEqual(res.model.stack.stackItems[4].value, 120);
            assert.strictEqual(getTOS(res.model), 120);
        });

        it('calculates 4! = 24 using recursive procedure calls', () => {
            // Main: sets n = 4, res = 1, calls fact.
            // Procedure fact:
            //   if n <= 1 return;
            //   res = res * n;
            //   n = n - 1;
            //   call fact; // recursive call
            //   return;
            const code = [
                'JMP 0, 17',     // 0: jump over procedure definition to main
                // --- PROC fact (1..16) ---
                'INT 0, 3',      // 1: proc frame header
                'LOD 1, 3',      // 2: load n from main (level diff 1, offset 3)
                'LIT 0, 1',      // 3: 1
                'OPR 0, 13',     // 4: n <= 1
                'JMC 0, 7',      // 5: if false, jump to recursive case (line 7)
                'RET 0, 0',      // 6: base case, return
                // Recursive case:
                'LOD 1, 4',      // 7: load res
                'LOD 1, 3',      // 8: load n
                'OPR 0, 4',      // 9: res * n
                'STO 1, 4',      // 10: store back to res
                'LOD 1, 3',      // 11: load n
                'LIT 0, 1',      // 12: 1
                'OPR 0, 3',      // 13: n - 1
                'STO 1, 3',      // 14: store back to n
                'CAL 1, 1',      // 15: recursive call to fact (level diff 1)
                'RET 0, 0',      // 16: return from fact
                // --- MAIN (17..24) ---
                'INT 0, 5',      // 17: allocate 5 slots (0,1,2 links; 3=n, 4=res)
                'LIT 0, 4',      // 18: n = 4
                'STO 0, 3',      // 19
                'LIT 0, 1',      // 20: res = 1
                'STO 0, 4',      // 21
                'CAL 0, 1',      // 22: call fact (level diff 0)
                'LOD 0, 4',      // 23: load result to TOS
                'RET 0, 0',      // 24: halt
            ].join('\n');

            const res = runProgram(code);
            assert.strictEqual(res.isEnd, true);
            assert.strictEqual(res.model.stack.stackItems[4].value, 24);
            assert.strictEqual(getTOS(res.model), 24);
        });
    });

    describe('Fibonacci Program', () => {
        it('calculates 7th Fibonacci number (13)', () => {
            // Computes Fib(7) iteratively:
            // a = 0 (offset 3), b = 1 (offset 4), count = 7 (offset 5), temp (offset 6)
            // while (count > 0) { temp = a + b; a = b; b = temp; count--; }
            const code = [
                'INT 0, 7',      // 0: frame
                'LIT 0, 0',      // 1: a = 0
                'STO 0, 3',      // 2
                'LIT 0, 1',      // 3: b = 1
                'STO 0, 4',      // 4
                'LIT 0, 7',      // 5: count = 7
                'STO 0, 5',      // 6
                // Loop check: count > 0
                'LOD 0, 5',      // 7
                'LIT 0, 0',      // 8
                'OPR 0, 12',     // 9: count > 0
                'JMC 0, 24',     // 10: jump to end (line 24)
                // temp = a + b
                'LOD 0, 3',      // 11
                'LOD 0, 4',      // 12
                'OPR 0, 2',      // 13: a + b
                'STO 0, 6',      // 14: temp = a + b
                // a = b
                'LOD 0, 4',      // 15
                'STO 0, 3',      // 16
                // b = temp
                'LOD 0, 6',      // 17
                'STO 0, 4',      // 18
                // count--
                'LOD 0, 5',      // 19
                'LIT 0, 1',      // 20
                'OPR 0, 3',      // 21: count - 1
                'STO 0, 5',      // 22
                'JMP 0, 7',      // 23: loop back
                // End:
                'LOD 0, 3',      // 24: result in a (Fib(7) = 13)
                'RET 0, 0',      // 25
            ].join('\n');

            const res = runProgram(code);
            assert.strictEqual(res.isEnd, true);
            assert.strictEqual(getTOS(res.model), 13);
        });
    });

    describe('Euclidean GCD Program', () => {
        it('calculates GCD of 48 and 18 = 6', () => {
            // a = 48 (offset 3), b = 18 (offset 4)
            // while (b != 0) { t = b; b = a % b; a = t; }
            const code = [
                'INT 0, 6',      // 0: frame (3=a, 4=b, 5=t)
                'LIT 0, 48',     // 1: a = 48
                'STO 0, 3',      // 2
                'LIT 0, 18',     // 3: b = 18
                'STO 0, 4',      // 4
                // Loop check: b != 0
                'LOD 0, 4',      // 5
                'LIT 0, 0',      // 6
                'OPR 0, 9',      // 7: b != 0
                'JMC 0, 18',     // 8: jump to end (line 18)
                // t = b
                'LOD 0, 4',      // 9
                'STO 0, 5',      // 10
                // b = a % b
                'LOD 0, 3',      // 11
                'LOD 0, 4',      // 12
                'OPR 0, 6',      // 13: a % b
                'STO 0, 4',      // 14
                // a = t
                'LOD 0, 5',      // 15
                'STO 0, 3',      // 16
                'JMP 0, 5',      // 17
                // End:
                'LOD 0, 3',      // 18: result in a
                'RET 0, 0',      // 19
            ].join('\n');

            const res = runProgram(code);
            assert.strictEqual(res.isEnd, true);
            assert.strictEqual(getTOS(res.model), 6);
        });
    });

    describe('String Stream Processing Program', () => {
        it('reads a 3-character word, converts each to uppercase and prints newline', () => {
            // Input: 'cat'
            // Reads 'c' (99), 'a' (97), 't' (116)
            // Subtracts 32 from each, outputs 'CAT\n'
            const code = [
                // Read & write 1st char
                'REA 0, 0',
                'LIT 0, 32',
                'OPR 0, 3',
                'WRI 0, 0',
                // Read & write 2nd char
                'REA 0, 0',
                'LIT 0, 32',
                'OPR 0, 3',
                'WRI 0, 0',
                // Read & write 3rd char
                'REA 0, 0',
                'LIT 0, 32',
                'OPR 0, 3',
                'WRI 0, 0',
                // Write newline
                'LIT 0, 10',
                'WRI 0, 0',
                'RET 0, 0',
            ].join('\n');

            const res = runProgram(code, 'cat');
            assert.strictEqual(res.isEnd, true);
            assert.strictEqual(res.output, 'CAT\n');
        });
    });

    describe('Heap Dynamic Data Structure (Linked Nodes)', () => {
        it('allocates 2 nodes on heap, links them, sums their values, and frees them', () => {
            // Node format: 2 cells: [0: value, 1: next_ptr]
            // Node 1: at addr1 (e.g. 2): value = 10, next = addr2
            // Node 2: at addr2: value = 25, next = 0 (null)
            const code = [
                'INT 0, 6',      // 0: frame (3=node1, 4=node2, 5=sum)
                // Allocate node 1 (size 2)
                'LIT 0, 2',      // 1
                'NEW 0, 0',      // 2
                'STO 0, 3',      // 3: node1 = addr1
                // Allocate node 2 (size 2)
                'LIT 0, 2',      // 4
                'NEW 0, 0',      // 5
                'STO 0, 4',      // 6: node2 = addr2

                // Setup node 1: value = 10, next = node2
                'LOD 0, 3',      // 7: addr1
                'LIT 0, 10',     // 8: value 10
                'STA 0, 0',      // 9: heap[addr1] = 10
                'LOD 0, 3',      // 10: addr1
                'LIT 0, 1',      // 11
                'OPR 0, 2',      // 12: addr1 + 1 (next ptr cell)
                'LOD 0, 4',      // 13: addr2
                'STA 0, 0',      // 14: heap[addr1 + 1] = addr2

                // Setup node 2: value = 25, next = 0
                'LOD 0, 4',      // 15: addr2
                'LIT 0, 25',     // 16: value 25
                'STA 0, 0',      // 17: heap[addr2] = 25

                // Traverse: sum = node1.val + node1.next.val
                'LOD 0, 3',      // 18: addr1
                'LDA 0, 0',      // 19: load node1.val (10)
                // Find node2 from node1.next
                'LOD 0, 3',      // 20: addr1
                'LIT 0, 1',      // 21
                'OPR 0, 2',      // 22: addr1 + 1
                'LDA 0, 0',      // 23: loads addr2
                'LDA 0, 0',      // 24: loads node2.val (25)
                'OPR 0, 2',      // 25: 10 + 25 = 35
                'STO 0, 5',      // 26: sum = 35

                // Free both nodes
                'LOD 0, 3',      // 27: addr1
                'DEL 0, 0',      // 28: free node1
                'LOD 0, 4',      // 29: addr2
                'DEL 0, 0',      // 30: free node2

                'LOD 0, 5',      // 31: load sum
                'RET 0, 0',      // 32: halt
            ].join('\n');

            const res = runProgram(code);
            assert.strictEqual(res.isEnd, true);
            assert.strictEqual(getTOS(res.model), 35);
        });
    });
});
