import { useEffect, useState } from 'react'
import { text, type Locale } from './i18n'

type Kind = 'insert' | 'transform'
type ScenarioId = keyof (typeof text)['en']['rtScenarios']
type Phase = 'select' | 'typing' | 'preview' | 'applied'

interface Line {
  before: string
  /** Selected text; empty for a bare cursor. */
  sel: string
  after: string
  /** What the extension writes over `sel`. */
  out: string
}

interface Scenario {
  id: ScenarioId
  kind: Kind
  file: string
  input: string
  lines: Line[]
}

const COMMANDS: Record<Kind, string> = {
  insert: 'Range & Transform: Insert Sequence from Range',
  transform: 'Range & Transform: Transform Selections',
}

// Every `out` below is what the extension itself produces for `input`
// (generateSequence / runTransform in vscode-range-transform), not a mock-up.
const SCENARIOS: Scenario[] = [
  {
    id: 'weekdays',
    kind: 'insert',
    file: 'rota.yaml',
    input: 'Mon:Fri',
    lines: ['ana', 'ben', 'chloé', 'dev', 'eli'].map((host, i) => ({
      before: '- { day: ',
      sel: '',
      after: `, host: ${host} }`,
      out: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'][i],
    })),
  },
  {
    id: 'chinese',
    kind: 'insert',
    file: '目录.md',
    input: '一:五',
    lines: ['一', '二', '三', '四', '五'].map((out) => ({
      before: '## 第',
      sel: '',
      after: '章',
      out,
    })),
  },
  {
    id: 'dates',
    kind: 'insert',
    file: 'backups.csv',
    input: '2024-02-27:2024-03-02',
    lines: ['2024-02-27', '2024-02-28', '2024-02-29', '2024-03-01', '2024-03-02'].map((out) => ({
      before: '',
      sel: '',
      after: ',nightly,ok',
      out,
    })),
  },
  {
    id: 'arithmetic',
    kind: 'transform',
    file: 'prices.csv',
    input: '*3',
    lines: [
      ['apple', '12', '36'],
      ['pear', '7', '21'],
      ['melon', '40', '120'],
      ['lime', '3', '9'],
      ['kiwi', '25', '75'],
    ].map(([fruit, sel, out]) => ({ before: `${fruit},`, sel, after: ',EUR', out })),
  },
  {
    id: 'anyNumeral',
    kind: 'transform',
    file: 'notes.txt',
    input: 'cn',
    lines: [
      { before: 'Chapter ', sel: 'IV', after: '', out: '4' },
      { before: '第', sel: '十二', after: '章', out: '12' },
      { before: 'mask = ', sel: '0xff', after: '', out: '255' },
      { before: 'weekday: ', sel: 'Wednesday', after: '', out: '3' },
      { before: 'il a ', sel: 'vingt', after: ' ans', out: '20' },
    ],
  },
]

const HOLD_MS: Record<Phase, number> = { select: 900, typing: 0, preview: 1900, applied: 2000 }
const TYPE_MS = 95

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export default function RangeTransformDemo({ locale = 'en' }: { locale?: Locale }) {
  const t = text[locale]
  const [index, setIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>('select')
  const [typed, setTyped] = useState(0)
  const [playing, setPlaying] = useState(true)

  const scenario = SCENARIOS[index]
  const chars = [...scenario.input]

  // Start paused, on a finished preview, for people who asked for less motion.
  useEffect(() => {
    if (!prefersReducedMotion()) return
    setPlaying(false)
    setTyped(chars.length)
    setPhase('preview')
  }, [])

  useEffect(() => {
    if (!playing) return
    let next: () => void
    let delay = HOLD_MS[phase]
    if (phase === 'select') {
      next = () => setPhase('typing')
    } else if (phase === 'typing') {
      delay = TYPE_MS
      next = () => (typed < chars.length ? setTyped(typed + 1) : setPhase('preview'))
    } else if (phase === 'preview') {
      next = () => setPhase('applied')
    } else {
      next = () => {
        setIndex((index + 1) % SCENARIOS.length)
        setTyped(0)
        setPhase('select')
      }
    }
    const id = window.setTimeout(next, delay)
    return () => window.clearTimeout(id)
  }, [playing, phase, typed, index, chars.length])

  const pick = (i: number) => {
    setIndex(i)
    if (playing) {
      setTyped(0)
      setPhase('select')
    } else {
      setTyped([...SCENARIOS[i].input].length)
      setPhase('preview')
    }
  }

  const quickOpen = phase !== 'applied'
  const summary = `${COMMANDS[scenario.kind]}: ${scenario.input} → ${scenario.lines.map((l) => l.out).join(', ')}`

  return (
    <figure className="rt-demo not-content" aria-label={t.rtDemoLabel}>
      <div className="rt-window" aria-hidden="true">
        <div className="rt-titlebar">
          <span className="rt-dots">
            <i />
            <i />
            <i />
          </span>
          <span className="rt-tab">{scenario.file}</span>
        </div>

        <div className="rt-editor">
          <div className={quickOpen ? 'rt-quick rt-quick-open' : 'rt-quick'}>
            <div className="rt-quick-title">{COMMANDS[scenario.kind]}</div>
            <div className="rt-quick-input">
              <span>{chars.slice(0, typed).join('')}</span>
              <span className="rt-quick-caret" />
            </div>
            <div className="rt-quick-hint">{t.rtHint}</div>
          </div>

          <ol className="rt-lines">
            {scenario.lines.map((line, i) => (
              <li key={`${scenario.id}-${i}`} className="rt-line">
                <span className="rt-ln">{i + 1}</span>
                <span className="rt-code">
                  {line.before}
                  {phase === 'applied' ? (
                    <span className="rt-done" style={{ animationDelay: `${i * 45}ms` }}>
                      {line.out}
                    </span>
                  ) : phase === 'preview' ? (
                    <>
                      {line.sel && <del className="rt-del">{line.sel}</del>}
                      <ins className="rt-ins" style={{ animationDelay: `${i * 45}ms` }}>
                        {line.out}
                      </ins>
                    </>
                  ) : (
                    <>
                      {line.sel && <span className="rt-sel">{line.sel}</span>}
                      <span className="rt-caret" />
                    </>
                  )}
                  {line.after}
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div className="rt-status">
          <span>{t.rtSelections(scenario.lines.length)}</span>
          <span>UTF-8</span>
        </div>
      </div>
      <figcaption className="sr-only">{summary}</figcaption>

      <div className="rt-controls">
        <div className="rt-chips" role="group" aria-label={t.rtDemoLabel}>
          {SCENARIOS.map((s, i) => (
            <button
              key={s.id}
              type="button"
              className="rt-chip"
              aria-pressed={i === index}
              onClick={() => pick(i)}
            >
              {t.rtScenarios[s.id]}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="rt-play"
          aria-label={playing ? t.pauseDemo : t.playDemo}
          title={playing ? t.pauseDemo : t.playDemo}
          aria-pressed={!playing}
          onClick={() => setPlaying((p) => !p)}
        >
          {playing ? (
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="6" y="5" width="4" height="14" rx="1.2" />
              <rect x="14" y="5" width="4" height="14" rx="1.2" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" />
            </svg>
          )}
        </button>
      </div>
    </figure>
  )
}
