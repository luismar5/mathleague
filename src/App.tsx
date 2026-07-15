import { useEffect, useMemo, useState } from 'react'

type Screen = 'home' | 'battle' | 'reward' | 'profile'
type Mode = 'story' | 'training' | 'match' | 'boss'

type SaveState = {
  player: string
  xp: number
  coins: number
  level: number
  streak: number
  bestStreak: number
  wins: number
  losses: number
  lastWin: string
}

type Creature = { name: string; emoji: string; hp: number; attack: number }
type Enemy = { name: string; emoji: string; hp: number; attack: number; rewardXp: number; rewardCoins: number }
type Question = { prompt: string; answer: number; hint: string }

const STORAGE_KEY = 'math-league-clean-v3'

const DEFAULT_STATE: SaveState = {
  player: '',
  xp: 0,
  coins: 0,
  level: 1,
  streak: 0,
  bestStreak: 0,
  wins: 0,
  losses: 0,
  lastWin: 'Aún no hay logros.',
}

const CREATURE: Creature = { name: 'Volt', emoji: '⚡', hp: 100, attack: 24 }

const ENEMIES: Enemy[] = [
  { name: 'Entrenador Sombra', emoji: '🕶️', hp: 120, attack: 18, rewardXp: 35, rewardCoins: 20 },
  { name: 'Portero Titán', emoji: '🧤', hp: 135, attack: 19, rewardXp: 40, rewardCoins: 22 },
  { name: 'Defensa Imbatible', emoji: '🧱', hp: 140, attack: 20, rewardXp: 45, rewardCoins: 25 },
  { name: 'Dragón Solar', emoji: '🐉', hp: 150, attack: 22, rewardXp: 55, rewardCoins: 30 },
]

const MODE_LABEL: Record<Mode, string> = {
  story: 'Historia',
  training: 'Entrenamiento',
  match: 'Partido',
  boss: 'Jefe final',
}

const MODE_HINT: Record<Mode, string> = {
  story: 'Empieza por una misión corta.',
  training: 'Más cálculo y más ritmo.',
  match: 'Cada acierto es un gol.',
  boss: 'El rival es más duro.',
}

function loadState(): SaveState {
  if (typeof window === 'undefined') return DEFAULT_STATE
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return DEFAULT_STATE
  try {
    return { ...DEFAULT_STATE, ...JSON.parse(raw) } as SaveState
  } catch {
    return DEFAULT_STATE
  }
}

function levelFromXp(xp: number) {
  return Math.max(1, Math.floor(xp / 120) + 1)
}

function xpProgress(xp: number) {
  const level = levelFromXp(xp)
  const current = (level - 1) * 120
  const next = level * 120
  return Math.round(((xp - current) / (next - current)) * 100)
}

function makeQuestion(mode: Mode, seed: number): Question {
  const r = Math.abs(Math.sin(seed)) * 1000

  if (mode === 'match') {
    const goals = 1 + Math.floor(r % 4)
    const matches = 2 + Math.floor((r / 3) % 4)
    const bonus = 1 + Math.floor((r / 5) % 3)
    return {
      prompt: `Partido: ${goals} goles por partido durante ${matches} partidos y luego ${bonus} goles extra. Total = ?`,
      answer: goals * matches + bonus,
      hint: 'Multiplica primero y después suma el bonus.',
    }
  }

  if (mode === 'boss') {
    const a = 30 + Math.floor(r % 60)
    const b = 10 + Math.floor((r / 7) % 40)
    const c = 2 + Math.floor((r / 11) % 9)
    return {
      prompt: `Jefe final: ${a} + ${b} - ${c} = ?`,
      answer: a + b - c,
      hint: 'Suma primero y luego resta.',
    }
  }

  if (mode === 'training') {
    const n = 40 + Math.floor(r % 80)
    return {
      prompt: `¿Cuánto es el 25% de ${n}?`,
      answer: Math.round(n / 4),
      hint: 'El 25% es una cuarta parte.',
    }
  }

  const kind = Math.floor(r % 3)
  if (kind === 0) {
    const a = 100 + Math.floor(r % 400)
    const b = 20 + Math.floor((r / 13) % 150)
    return {
      prompt: `${a} + ${b} = ?`,
      answer: a + b,
      hint: 'Suma por partes.',
    }
  }
  if (kind === 1) {
    const a = 200 + Math.floor(r % 500)
    const b = 20 + Math.floor((r / 17) % 180)
    return {
      prompt: `${a} - ${b} = ?`,
      answer: a - b,
      hint: 'Redondea y compensa.',
    }
  }

  const d = 3 + Math.floor(r % 9)
  const q = 6 + Math.floor((r / 19) % 12)
  return {
    prompt: `${d * q} ÷ ${d} = ?`,
    answer: q,
    hint: 'Piensa cuántas veces cabe.',
  }
}

function randomEnemy(level: number) {
  if (level >= 12) return ENEMIES[3]
  if (level >= 9) return ENEMIES[2]
  if (level >= 6) return ENEMIES[1]
  return ENEMIES[0]
}

export default function App() {
  const [save, setSave] = useState<SaveState>(loadState)
  const [nameDraft, setNameDraft] = useState(save.player)
  const [screen, setScreen] = useState<Screen>('home')
  const [mode, setMode] = useState<Mode>('story')
  const [questionSeed, setQuestionSeed] = useState(Date.now() % 100000)
  const [question, setQuestion] = useState<Question>(() => makeQuestion('story', Date.now() % 100000))
  const [answer, setAnswer] = useState('')
  const [message, setMessage] = useState('Pulsa CONTINUAR para empezar a jugar.')
  const [showHint, setShowHint] = useState(false)
  const [battlePlayerHp, setBattlePlayerHp] = useState(CREATURE.hp)
  const [battleEnemyHp, setBattleEnemyHp] = useState(120)
  const [enemy, setEnemy] = useState<Enemy>(randomEnemy(levelFromXp(save.xp)))

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(save))
  }, [save])

  const level = useMemo(() => levelFromXp(save.xp), [save.xp])
  const progress = useMemo(() => xpProgress(save.xp), [save.xp])

  function saveName() {
    const trimmed = nameDraft.trim()
    if (!trimmed) return
    setSave((prev) => ({ ...prev, player: trimmed }))
    setMessage(`Bienvenido, ${trimmed}.`)
  }

  function resetProgress() {
    setSave(DEFAULT_STATE)
    setNameDraft('')
    setScreen('home')
    setMode('story')
    setQuestionSeed(Date.now() % 100000)
    setQuestion(makeQuestion('story', Date.now() % 100000))
    setAnswer('')
    setMessage('Progreso reiniciado.')
  }

  function startGame(nextMode: Mode = mode) {
    if (!save.player) saveName()
    const nextSeed = Date.now() % 100000
    const nextQuestion = makeQuestion(nextMode, nextSeed)
    const nextEnemy = randomEnemy(level)
    setMode(nextMode)
    setQuestionSeed(nextSeed)
    setQuestion(nextQuestion)
    setEnemy(nextEnemy)
    setBattlePlayerHp(CREATURE.hp)
    setBattleEnemyHp(nextEnemy.hp)
    setShowHint(false)
    setAnswer('')
    setScreen('battle')
    setMessage(`Modo ${MODE_LABEL[nextMode]} activado.`)
  }

  function nextQuestion(nextMode: Mode = mode) {
    const nextSeed = Date.now() % 100000
    setQuestionSeed(nextSeed)
    setQuestion(makeQuestion(nextMode, nextSeed))
    setShowHint(false)
    setAnswer('')
  }

  function completeBattle(win: boolean) {
    if (win) {
      const gainedXp = enemy.rewardXp
      const gainedCoins = enemy.rewardCoins
      const nextXp = save.xp + gainedXp
      const nextLevel = levelFromXp(nextXp)
      const nextStreak = save.streak + 1
      setSave((prev) => ({
        ...prev,
        xp: nextXp,
        level: nextLevel,
        coins: prev.coins + gainedCoins,
        streak: nextStreak,
        bestStreak: Math.max(prev.bestStreak, nextStreak),
        wins: prev.wins + 1,
        lastWin: `Derrotó a ${enemy.name} (+${gainedXp} XP, +${gainedCoins} monedas).`,
      }))
      setMessage(`¡Victoria! +${gainedXp} XP y +${gainedCoins} monedas.`)
    } else {
      setSave((prev) => ({ ...prev, streak: 0, losses: prev.losses + 1 }))
      setMessage(`Derrota... ${enemy.name} ganó esta ronda.`)
    }
    setScreen('reward')
  }

  function submitAnswer() {
    const n = Number(answer)
    if (answer.trim() === '' || Number.isNaN(n)) {
      setMessage('Escribe un número antes de atacar.')
      return
    }

    if (n === question.answer) {
      const damage = CREATURE.attack + Math.floor(questionSeed % 12) + Math.floor(save.level / 2)
      const nextHp = Math.max(0, battleEnemyHp - damage)
      setSave((prev) => ({
        ...prev,
        xp: prev.xp + 10,
        coins: prev.coins + 5,
        streak: prev.streak + 1,
        bestStreak: Math.max(prev.bestStreak, prev.streak + 1),
      }))
      setBattleEnemyHp(nextHp)
      setMessage(`¡Correcto! El rival pierde ${damage} de vida.`)
      setAnswer('')
      setShowHint(false)
      if (nextHp <= 0) {
        completeBattle(true)
        return
      }
      nextQuestion()
      return
    }

    const damage = enemy.attack
    const nextHp = Math.max(0, battlePlayerHp - damage)
    setBattlePlayerHp(nextHp)
    setSave((prev) => ({ ...prev, streak: 0, losses: prev.losses + 1 }))
    setMessage(`Casi. Pista: ${question.hint}`)
    if (nextHp <= 0) {
      completeBattle(false)
    }
  }

  function continueAfterReward() {
    const nextSeed = Date.now() % 100000
    const nextLevel = levelFromXp(save.xp)
    const nextMode: Mode = nextLevel >= 6 ? 'boss' : nextLevel >= 3 ? 'match' : 'training'
    const nextEnemy = randomEnemy(nextLevel)
    setMode(nextMode)
    setQuestionSeed(nextSeed)
    setQuestion(makeQuestion(nextMode, nextSeed))
    setEnemy(nextEnemy)
    setBattlePlayerHp(CREATURE.hp)
    setBattleEnemyHp(nextEnemy.hp)
    setAnswer('')
    setShowHint(false)
    setScreen('battle')
  }

  return (
    <div className="page">
      <div className="ambient a" />
      <div className="ambient b" />
      <div className="ambient c" />

      <div className="shell">
        <header className="header">
          <div>
            <p className="eyebrow">Math League Arcade</p>
            <h1 className="title">Road to Champion</h1>
          </div>
          <button onClick={resetProgress} className="smallBtn">Reiniciar</button>
        </header>

        <section className={`section ${screen === 'home' ? 'active' : ''}`}>
          <div className="grid">
            <section className="card">
              <div className="tagRow">
                <Tag text="Verano 6.º Primaria" tone="green" />
                <Tag text="Fútbol + aventura" tone="blue" />
                <Tag text="Cálculo mental" tone="orange" />
              </div>

              <div className="hero">
                <div className="heroTop">
                  <div className="bigEmoji">⚽</div>
                  <div>
                    <div className="eyebrow" style={{ letterSpacing: '.12em' }}>Bienvenido</div>
                    <h2 className="playerName">{save.player || 'Jugador'}</h2>
                    <div className="muted">Nivel {level} · {save.coins} monedas</div>
                  </div>
                </div>

                <div className="quickGrid">
                  <Stat label="XP" value={save.xp} />
                  <Stat label="Racha" value={save.streak} />
                  <Stat label="Mejor" value={save.bestStreak} />
                </div>

                <div className="barWrap">
                  <div className="barRow"><span>Progreso</span><span>{progress}%</span></div>
                  <div className="bar"><div className="barFill" style={{ width: `${progress}%` }} /></div>
                </div>

                <div className="win">
                  Último logro: <strong>{save.lastWin}</strong>
                </div>
              </div>

              <div style={{ marginTop: 16 }}>
                <div className="quickGrid" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
                  <button onClick={() => setScreen('profile')} className="smallBtn">👤 Perfil</button>
                  <button onClick={() => setScreen('reward')} className="smallBtn">🏆 Logros</button>
                  <button onClick={() => startGame('training')} className="smallBtn">🎒 Jugar</button>
                  <button onClick={() => setMessage('Mapa aún en desarrollo.')} className="smallBtn">🗺️ Mapa</button>
                </div>
              </div>
            </section>

            <aside className="sidebar">
              <section className="sideCard">
                <h3 className="cardTitle">Perfil del jugador</h3>
                <div style={{ marginTop: 12 }} className="row">
                  <input
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    placeholder="Escribe el nombre"
                    className="input"
                  />
                  <button onClick={saveName} className="primaryBtn">Guardar</button>
                </div>
              </section>

              <section className="sideCard">
                <h3 className="cardTitle">Acción principal</h3>
                <p className="muted">Solo un botón grande para empezar a jugar.</p>
                <button onClick={() => startGame(mode)} className="mainBtn" style={{ marginTop: 12, width: '100%' }}>
                  <span style={{ fontSize: 26 }}>▶</span> CONTINUAR
                </button>
              </section>

              <section className="sideCard">
                <h3 className="cardTitle">Modo actual</h3>
                <p className="muted">{MODE_LABEL[mode]} · {MODE_HINT[mode]}</p>
                <div className="modeRow">
                  {(['story', 'training', 'match', 'boss'] as Mode[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => setMode(m)}
                      className={`pillBtn ${mode === m ? 'active' : ''}`}
                    >
                      {MODE_LABEL[m]}
                    </button>
                  ))}
                </div>
              </section>
            </aside>
          </div>
        </section>

        <section className={`section ${screen === 'battle' ? 'active' : ''}`}>
          <div className="grid">
            <section className="card">
              <div className="battleHeader">
                <div>
                  <div className="eyebrow" style={{ letterSpacing: '.12em' }}>Combate</div>
                  <h2 className="playerName" style={{ fontSize: '2.2rem' }}>{enemy.emoji} {enemy.name}</h2>
                </div>
                <button onClick={() => setScreen('home')} className="smallBtn">Volver</button>
              </div>

              <div className="fighterGrid">
                <FighterCard title="Tu criatura" creature={CREATURE} hp={battlePlayerHp} maxHp={CREATURE.hp} good />
                <FighterCard title="Rival" enemy={enemy} hp={battleEnemyHp} maxHp={enemy.hp} />
              </div>

              <div className="questionCard">
                <div className="qTags">
                  <Tag text={MODE_LABEL[mode]} tone="neutral" />
                  <Tag text={`Turno ${save.streak + 1}`} tone="neutral" />
                  <Tag text="En combate" tone="neutral" />
                </div>
                <div className="question">{question.prompt}</div>
                <p className="muted">{showHint ? `Pista: ${question.hint}` : 'Pulsa pista si la necesita.'}</p>

                <div className="actionRow">
                  <input
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder="Escribe la respuesta"
                    inputMode="numeric"
                    className="input"
                    style={{ flex: 1, minWidth: 0 }}
                  />
                  <button onClick={submitAnswer} className="primaryBtn">ATACAR</button>
                </div>

                <div className="actionRow">
                  <button onClick={() => setShowHint((v) => !v)} className="smallBtn">Pista</button>
                  <button onClick={() => setAnswer(String(question.answer))} className="smallBtn">Mostrar respuesta</button>
                </div>

                <div className="message">{message}</div>
              </div>
            </section>

            <aside className="sidebar">
              <section className="sideCard">
                <h3 className="cardTitle">Marcador</h3>
                <div className="quickGrid" style={{ marginTop: 12, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                  <Stat label="Nivel" value={save.level} />
                  <Stat label="XP" value={save.xp} />
                  <Stat label="Monedas" value={save.coins} />
                  <Stat label="Racha" value={save.streak} />
                </div>
                <div className="barWrap">
                  <div className="barRow"><span>Progreso</span><span>{progress}%</span></div>
                  <div className="bar"><div className="barFill" style={{ width: `${progress}%` }} /></div>
                </div>
              </section>

              <section className="sideCard">
                <h3 className="cardTitle">Siguiente paso</h3>
                <p className="muted">Cuando derrote al rival verá la pantalla de recompensa y pasará al siguiente combate.</p>
              </section>
            </aside>
          </div>
        </section>

        <section className={`section ${screen === 'reward' ? 'active' : ''}`}>
          <main className="rewardWrap">
            <div className="rewardCard">
              <div style={{ fontSize: 68 }}>🏆</div>
              <h2 className="rewardTitle">{battleEnemyHp <= 0 ? 'VICTORIA' : 'DERROTA'}</h2>
              <p className="muted">{message}</p>
              <div className="quickGrid" style={{ marginTop: 18 }}>
                <Stat label="XP" value={save.xp} />
                <Stat label="Monedas" value={save.coins} />
                <Stat label="Nivel" value={save.level} />
              </div>
              <button onClick={continueAfterReward} className="mainBtn" style={{ marginTop: 20, width: '100%' }}>
                CONTINUAR
              </button>
            </div>
          </main>
        </section>

        <section className={`section ${screen === 'profile' ? 'active' : ''}`}>
          <main className="rewardWrap">
            <div className="rewardCard">
              <div className="battleHeader">
                <h2 className="rewardTitle" style={{ margin: 0, fontSize: '2.2rem' }}>Perfil</h2>
                <button onClick={() => setScreen('home')} className="smallBtn">Cerrar</button>
              </div>
              <div className="quickGrid" style={{ marginTop: 18 }}>
                <Stat label="Jugador" value={save.player ? 1 : 0} suffix={save.player || 'Sin nombre'} />
                <Stat label="Nivel" value={save.level} />
                <Stat label="XP" value={save.xp} />
                <Stat label="Monedas" value={save.coins} />
                <Stat label="Victorias" value={save.wins} />
                <Stat label="Derrotas" value={save.losses} />
              </div>
            </div>
          </main>
        </section>
      </div>
    </div>
  )
}

function Tag({ text, tone }: { text: string; tone: 'green' | 'blue' | 'orange' | 'neutral' }) {
  const bg = tone === 'green'
    ? 'rgba(54,211,153,0.16)'
    : tone === 'blue'
      ? 'rgba(106,169,255,0.16)'
      : tone === 'orange'
        ? 'rgba(246,169,74,0.16)'
        : 'rgba(255,255,255,0.06)'
  const color = tone === 'green'
    ? '#d8fff0'
    : tone === 'blue'
      ? '#dbeaff'
      : tone === 'orange'
        ? '#ffe8c8'
        : '#eef4ff'
  return <span className="tag" style={{ background: bg, color }}>{text}</span>
}

function Stat({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="stat">
      <div className="statLabel">{label}</div>
      <div className="statValue">{value}</div>
      {suffix ? <div className="statSub">{suffix}</div> : null}
    </div>
  )
}

function FighterCard({
  title,
  creature,
  enemy,
  hp,
  maxHp,
  good,
}: {
  title: string
  creature?: Creature
  enemy?: Enemy
  hp: number
  maxHp: number
  good?: boolean
}) {
  const label = creature ?? enemy
  const pct = Math.max(0, Math.min(100, (hp / maxHp) * 100))

  return (
    <div className="fighter">
      <div className="fighterHead">
        <h3 className="cardTitle">{title}</h3>
        <span className="badge">{label?.name}</span>
      </div>
      <div className="fighterEmoji">{label?.emoji}</div>
      <div className="fighterSub">Vida {hp}/{maxHp}</div>
      <div className="bar" style={{ marginTop: 10 }}>
        <div
          className="barFill"
          style={{ width: `${pct}%`, background: good ? 'linear-gradient(90deg,#36d399,#a7f3d0)' : 'linear-gradient(90deg,#ff6b6b,#ff9c9c)' }}
        />
      </div>
    </div>
  )
}
