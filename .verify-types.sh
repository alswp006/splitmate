#!/bin/sh
./node_modules/.bin/tsc --noEmit --strict --skipLibCheck --module esnext --target esnext src/types.ts src/lib/types.ts src/lib/storage.ts
