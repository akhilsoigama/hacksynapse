import { configApp } from '@adonisjs/eslint-config'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default Promise.resolve(configApp()).then((configs) => {
  return [
    ...configs,
    {
      languageOptions: {
        parserOptions: {
          tsconfigRootDir: __dirname,
        }
      }
    }
  ]
})
