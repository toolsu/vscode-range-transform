export type Locale = 'en' | 'zh-CN' | 'fr'

export function localeOf(routeLocale: string | undefined): Locale {
  return routeLocale === 'zh-cn' ? 'zh-CN' : routeLocale === 'fr' ? 'fr' : 'en'
}

export const text = {
  en: {
    eyebrowTag: 'Built on',
    eyebrow: 'convnum, numbers in every numeral system',
    copyInstall: 'Copy install command',
    copied: 'Copied',
    pauseDemo: 'Pause the demo',
    playDemo: 'Play the demo',
    rtDemoLabel: 'Range & Transform demo',
    rtHint: 'Enter to apply, Esc to cancel',
    rtSelections: (n: number) => `${n} selections`,
    rtScenarios: {
      weekdays: 'Weekdays',
      chinese: 'Chinese numerals',
      dates: 'Dates',
      arithmetic: 'Arithmetic',
      anyNumeral: 'Any numeral',
    },
  },
  'zh-CN': {
    eyebrowTag: '基于',
    eyebrow: 'convnum：支持各种数字体系的数字库',
    copyInstall: '复制安装命令',
    copied: '已复制',
    pauseDemo: '暂停演示',
    playDemo: '播放演示',
    rtDemoLabel: 'Range & Transform 演示',
    rtHint: 'Enter 应用，Esc 取消',
    rtSelections: (n: number) => `${n} 个选区`,
    rtScenarios: {
      weekdays: '星期',
      chinese: '中文数字',
      dates: '日期',
      arithmetic: '算术',
      anyNumeral: '任意数字',
    },
  },
  fr: {
    eyebrowTag: 'Basé sur',
    eyebrow: 'convnum, les nombres dans tous les systèmes',
    copyInstall: 'Copier la commande d’installation',
    copied: 'Copié',
    pauseDemo: 'Mettre la démo en pause',
    playDemo: 'Lancer la démo',
    rtDemoLabel: 'Démo de Range & Transform',
    rtHint: 'Entrée pour appliquer, Échap pour annuler',
    rtSelections: (n: number) => `${n} sélections`,
    rtScenarios: {
      weekdays: 'Jours',
      chinese: 'Nombres chinois',
      dates: 'Dates',
      arithmetic: 'Calcul',
      anyNumeral: 'Tout nombre',
    },
  },
} as const

export const CONVNUM_URL: Record<Locale, string> = {
  en: 'https://toolsu.com/convnum/',
  'zh-CN': 'https://toolsu.com/convnum/zh-cn/',
  fr: 'https://toolsu.com/convnum/fr/',
}
