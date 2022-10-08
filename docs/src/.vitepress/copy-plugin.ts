import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'
import type { Plugin } from 'vite'

const copyFile = (path: string, pkgName: string) => {
  const filePath = resolve(__dirname, `${path}/${pkgName}`)
  if (!existsSync(filePath)) {
    throw new Error(`${pkgName} not built. ` + `Run "pnpm -w build" first.`)
  }

  ;(this as any).emitFile({
    type: 'asset',
    fileName: pkgName,
    source: readFileSync(filePath, 'utf-8'),
  })
}

export function copyVueFlowPlugin(): Plugin {
  return {
    name: 'copy-vue-flow',
    generateBundle() {
      ;[
        { path: '../../node_modules/@vue-flow/core/dist/', pkgName: 'vue-flow.es.js' },
        { path: '../../node_modules/@vue-flow/additional-components/dist/', pkgName: 'additional-components.es.js' },
      ].forEach((pkg) => {
        copyFile.call(this, pkg.path, pkg.pkgName)
      })
    },
  }
}
