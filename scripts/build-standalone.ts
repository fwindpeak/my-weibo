import { spawnSync } from 'child_process'
import { existsSync, mkdirSync, rmSync, cpSync, statSync } from 'fs'
import { join, dirname } from 'path'

const projectRoot = process.cwd()
const nextBin = require.resolve('next/dist/bin/next')

function runBuild() {
  const result = spawnSync('node', [nextBin, 'build'], {
    stdio: 'inherit',
    cwd: projectRoot,
    env: process.env,
  })

  if (result.status !== 0) {
    throw new Error('next build failed')
  }
}

function prepareOutput() {
  const standaloneDir = join(projectRoot, '.next', 'standalone')
  const staticDir = join(projectRoot, '.next', 'static')

  if (!existsSync(standaloneDir)) {
    throw new Error('Missing .next/standalone output. Ensure next.config.ts sets output = "standalone".')
  }

  const distDir = join(projectRoot, 'dist')

  if (existsSync(distDir)) {
    rmSync(distDir, { recursive: true, force: true })
  }

  mkdirSync(distDir, { recursive: true })

  const appDir = join(distDir, 'app')
  mkdirSync(appDir, { recursive: true })

  cpSync(standaloneDir, appDir, { recursive: true })

  const targetStaticDir = join(appDir, '.next', 'static')
  mkdirSync(dirname(targetStaticDir), { recursive: true })

  if (existsSync(staticDir)) {
    cpSync(staticDir, targetStaticDir, { recursive: true })
  }

  console.log('\n✅ Standalone build ready in ./dist/app')
  console.log('   启动命令：')
  console.log('   cd dist/app && NODE_ENV=production node server.js')
  console.log('\n   如需打包部署，可直接压缩 dist/app 目录。')

  const serverPath = join(appDir, 'server.js')
  if (existsSync(serverPath)) {
    const size = statSync(serverPath).size
    console.log(`   server.js 大小：${(size / 1024).toFixed(2)} KB`)
  }
}

async function main() {
  runBuild()
  prepareOutput()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
