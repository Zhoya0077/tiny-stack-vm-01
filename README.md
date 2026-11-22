# tiny-stack-vm-01

A tiny stack virtual machine for make.fun's tiny stack ISA (version 1).
Run with Node 22: `node main.ts`. It reads each
`$MAKEFUN_INPUT_DIR/<id>/{program,input}.bin` and writes
`$MAKEFUN_OUTPUT_DIR/<id>/{stdout.bin,exit.txt}` — a faithful port of the
kit's reference VM: wrapping 32-bit ints, 256-value stack, 64-deep call
stack, 256 words of memory, all ten traps, step and output limits.
