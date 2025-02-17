import { defineNuxtModule, isNuxt2 } from '@nuxt/kit'
import { resolve } from 'pathe'
import Critters from 'critters'
import type { Options } from 'critters'

export interface ModuleOptions {
  // Options passed directly to `critters`
  config?: Options
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'critters',
    configKey: 'critters',
  },
  defaults: {
    config: {
      preload: 'media',
    },
  },
  setup (options, nuxt) {
    // Only enable for production
    if (nuxt.options.dev) return

    // Enable css extraction
    // @ts-expect-error TODO: use @nuxt/bridge-schema
    nuxt.options.build.extractCSS = true

    // Nitro handler (for prerendering only)

    nuxt.hook('nitro:init', nitro => {
      const critters = new Critters({
        path: nitro.options.output.publicDir,
        publicPath: nitro.options.baseURL,
        ...options.config,
      })
      nitro.hooks.hook('prerender:generate', async route => {
        if (!route.fileName?.endsWith('.html') || route.error || !route.contents) return
        route.contents = await critters.process(route.contents)
      })
    })

    /* c8 ignore start */
    if (isNuxt2()) {
      const critters = new Critters({
        path: resolve(nuxt.options.buildDir, 'dist/client'),
        // @ts-expect-error TODO: use @nuxt/bridge-schema
        publicPath: nuxt.options.build.publicPath,
        ...options.config,
      })

      // Add transform step
      // @ts-expect-error TODO: use @nuxt/bridge-schema
      nuxt.hook('render:route', async (_url, result) => {
        if (!result.html || result.error) return
        try {
          result.html = await critters.process(result.html)
        } catch (e) {
          console.log(e)
        }
      })

      // @ts-expect-error TODO: use @nuxt/bridge-schema
      nuxt.hook('generate:page', async result => {
        if (!result.html || result.error) return
        result.html = await critters.process(result.html)
      })
    }
  },
})
