import react from '@astrojs/react'
import starlight from '@astrojs/starlight'
import { defineConfig } from 'astro/config'

// Served at https://toolsu.com/range-transform/ by a Cloudflare Worker with static
// assets (see wrangler.jsonc). `build:pages` nests the output under out/range-transform/
// so the files sit at the same paths as their URLs.
// https://astro.build/config
export default defineConfig({
  site: 'https://toolsu.com',
  base: '/range-transform',
  integrations: [
    react(),
    starlight({
      title: 'Range & Transform',
      description:
        'A VS Code extension that fills multi-cursor selections with a sequence, or rewrites them with a JavaScript expression, with a live inline diff preview.',
      locales: {
        root: { label: 'English', lang: 'en' },
        'zh-cn': { label: '简体中文', lang: 'zh-CN' },
        fr: { label: 'Français', lang: 'fr' },
      },
      logo: {
        src: './public/images/logo/icon.svg',
      },
      favicon: '/favicon.svg',
      head: [
        { tag: 'link', attrs: { rel: 'preconnect', href: 'https://fonts.googleapis.com' } },
        {
          tag: 'link',
          attrs: { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: true },
        },
        {
          tag: 'link',
          attrs: {
            rel: 'stylesheet',
            href: 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,400..800&family=Instrument+Sans:wdth,wght@75..100,400..700&family=JetBrains+Mono:wght@400;500;700&display=swap',
          },
        },
      ],
      components: {
        Header: './src/components/Header.astro',
        Hero: './src/components/Hero.astro',
        MobileMenuFooter: './src/components/MobileMenuFooter.astro',
        ThemeProvider: './src/components/ThemeProvider.astro',
      },
      editLink: {
        baseUrl: 'https://github.com/toolsu/vscode-range-transform/edit/main/site/',
      },
      customCss: ['./src/styles/custom.css'],
      sidebar: [
        {
          label: 'Home',
          translations: { 'zh-CN': '首页', fr: 'Accueil' },
          slug: 'index',
        },
        {
          label: 'Guide',
          translations: { 'zh-CN': '使用指南', fr: 'Guide' },
          items: [
            {
              label: 'Insert Sequence',
              translations: { 'zh-CN': '插入序列', fr: 'Insérer une séquence' },
              slug: 'insert-sequence',
            },
            {
              label: 'Transform Selections',
              translations: { 'zh-CN': '变换选区', fr: 'Transformer les sélections' },
              slug: 'transform',
            },
          ],
        },
        {
          label: 'convnum',
          translations: { 'zh-CN': 'convnum', fr: 'convnum' },
          items: [
            {
              label: 'Numeral Converter',
              translations: { 'zh-CN': '数字转换器', fr: 'Convertisseur de nombres' },
              link: 'https://toolsu.com/convnum/tools/numeral-conversion/',
              attrs: { target: '_blank', rel: 'noopener' },
            },
            {
              label: 'Sequence Generator',
              translations: { 'zh-CN': '序列生成器', fr: 'Générateur de séquences' },
              link: 'https://toolsu.com/convnum/tools/sequence-generator/',
              attrs: { target: '_blank', rel: 'noopener' },
            },
            {
              label: 'Library',
              translations: { 'zh-CN': 'JavaScript 库', fr: 'Bibliothèque' },
              link: 'https://toolsu.com/convnum/',
              attrs: { target: '_blank', rel: 'noopener' },
            },
          ],
        },
      ],
    }),
  ],
})
