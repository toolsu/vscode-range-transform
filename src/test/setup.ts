// This file sets up path aliases for tests
import { addAliases } from 'module-alias'
import * as path from 'path'

// Register path aliases to match tsconfig.json paths
addAliases({
  '@': path.resolve(__dirname, '..'), // Points to out/ directory
  '@ROOT': path.resolve(__dirname, '..', '..'), // Points to project root
})
