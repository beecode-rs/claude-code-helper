import { spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const electronDir = path.join(projectDir, 'node_modules', 'electron')

const isElectronPackageInstalled = () => {
  return existsSync(path.join(electronDir, 'package.json'))
}

const isElectronBinaryDownloaded = () => {
  const pathFilePath = path.join(electronDir, 'path.txt')
  if (!existsSync(pathFilePath)) {
    return false
  }
  const binaryRelativePath = readFileSync(pathFilePath, 'utf8').trim()
  return existsSync(path.join(electronDir, 'dist', binaryRelativePath))
}

const installElectronBinary = async () => {
  console.log('electron binary missing - downloading it now')
  const installProcess = spawn(process.execPath, [path.join(electronDir, 'install.js')], { stdio: 'inherit' })
  const exitCode = await new Promise((resolve) => {
    installProcess.on('close', resolve)
  })
  if (exitCode !== 0) {
    console.error(`electron download failed with exit code ${exitCode ?? 1}`)
    process.exit(exitCode ?? 1)
  }
  console.log('electron binary downloaded successfully')
}

if (!isElectronPackageInstalled()) {
  console.error('electron package not found - run `pnpm install` first')
  process.exit(1)
}

if (isElectronBinaryDownloaded()) {
  console.log('electron binary is ready')
} else {
  await installElectronBinary()
}
