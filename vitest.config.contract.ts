import { ContractReporter } from '@beecode/msh-test-contractor/contract-reporter'
import { contractYamlPlugin } from '@beecode/msh-test-contractor/vitest-plugin'
import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vitest/config'

const srcAliasPlugin = (): Plugin => ({
  enforce: 'pre',
  name: 'alias-src-for-project-files',
  resolveId(source, importer, options) {
    if (!source.startsWith('#src/') || importer?.includes('node_modules')) {
      return null
    }
    return this.resolve(resolve('src', source.slice('#src/'.length)), importer, { ...options, skipSelf: true })
  },
})

export default defineConfig({
  plugins: [srcAliasPlugin(), contractYamlPlugin()],
  test: {
    include: ['src/**/*.contract.yaml'],
    mockReset: true,
    reporters: [new ContractReporter()],
    server: { deps: { inline: [/@beecode[\\/]msh-test-contractor/] } },
    watch: false,
  },
})
