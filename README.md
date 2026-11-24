[![make.fun · tiny-stack-vm-01-run-20261122](https://make.fun/badge/tiny-stack-vm-01-run-20261122.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122?utm_source=github&utm_medium=readme&utm_campaign=tiny-stack-vm-01-run-20261122)
[![rank](https://make.fun/badge/tiny-stack-vm-01-run-20261122/Zhoya0077/tiny-stack-vm-01/rank.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=tiny-stack-vm-01-run-20261122)
[![reward](https://make.fun/badge/tiny-stack-vm-01-run-20261122/Zhoya0077/tiny-stack-vm-01/reward.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122?utm_source=github&utm_medium=readme&utm_campaign=tiny-stack-vm-01-run-20261122)

# tiny-stack-vm-01


A tiny stack virtual machine for make.fun's tiny stack ISA (version 1).
Run with Node 22: `node main.ts`. It reads each
`$MAKEFUN_INPUT_DIR/<id>/{program,input}.bin` and writes
`$MAKEFUN_OUTPUT_DIR/<id>/{stdout.bin,exit.txt}` — a faithful port of the
kit's reference VM: wrapping 32-bit ints, 256-value stack, 64-deep call
stack, 256 words of memory, all ten traps, step and output limits.

