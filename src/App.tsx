import { useEffect, useMemo, useState } from 'react';

type Mode = 'story' | 'training' | 'match' | 'boss';
type Screen = 'home' | 'battle' | 'parent';
type QuestionKind = 'math' | 'football' | 'boss';

type Question = {
  prompt: string;
  answer: number;
  xp: number;
  coins: number;
  kind: QuestionKind;
  hint: string;
};

type Creature = {
  id: string;
  name: string;
  emoji: string;
  element: string;
  hp: number;
  attack: number;
};

type Enemy = {
  id: string;
  name: string;
  emoji: string;
  hp: number;
  attack: number;
  rewardXP: number;
  rewardCoins: number;
};

type SaveState = {
  player: string;
  avatar: string;
  creature: string;
  xp: number;
  coins: number;
  streak: number;
  bestStreak: number;
  solved: number;
  correct: number;
  wrong: number;
  unlockedSkins: string[];
  completedDays: number;
  mode: Mode;
};

const STORAGE_KEY = 'math-league-arcade-state-v1';

const avatars = [
  { id: 'striker', emoji: '\u26BD', name: 'Delantero' },
  { id: 'speed', emoji: '\u26A1', name: 'Velocidad' },
  { id: 'tactic', emoji: '\U0001F9E0', name: 'Tactico' },
  { id: 'keeper', emoji: '\U0001F9E4', name: 'Portero' },
];

const creatures: Creature[] = [
  { id: 'volt', name: 'Volt', emoji: '\u26A1', element: 'Electrico', hp: 100, attack: 24 },
  { id: 'ignis', name: 'Ignis', emoji: '\U0001F525', element: 'Fuego', hp: 110, attack: 22 },
  { id: 'sprout', name: 'Sprout', emoji: '\U0001F33F', element: 'Planta', hp: 120, attack: 20 },
  { id: 'aqua', name: 'Aqua', emoji: '\U0001F4A7', element: 'Agua', hp: 115, attack: 21 },
];

const enemies: Enemy[] = [
  { id: 'shadow', name: 'Entrenador Sombra', emoji: '\U0001F576', hp: 120, attack: 18, rewardXP: 35, rewardCoins: 20 },
  { id: 'wall', name: 'Defensa Imbatible', emoji: '\U0001F9F1', hp: 140, attack: 20, rewardXP: 45, rewardCoins: 25 },
  { id: 'keeper', name: 'Portero Titan', emoji: '\U0001F9E4', hp: 135, attack: 19, rewardXP: 40, rewardCoins: 22 },
  { id: 'dragon', name: 'Dragon Solar', emoji: '\U0001F409', hp: 150, attack: 22, rewardXP: 55, rewardCoins: 30 },
];

const shopItems = [
  { id: 'ball', name: 'Balon dorado', icon: '\U0001F3C0', cost: 40, desc: 'Desbloquea un estilo dorado.' },
  { id: 'boots', name: 'Botas turbo', icon: '\U0001F45F', cost: 65, desc: 'Aumenta la sensacion de progreso.' },
  { id: 'shield', name: 'Escudo campeon', icon: '\U0001F6E1', cost: 90, desc: 'Insignia de campeon.' },
  { id: 'crown', name: 'Corona legendaria', icon: '\U0001F451', cost: 120, desc: 'Maximo estilo.' },
];

const modes: Array<{ id: Mode; title: string; subtitle: string }> = [
  { id: 'story', title: 'Historia', subtitle: 'Mapa y progreso' },
  { id: 'training', title: 'Entrenamiento', subtitle: 'Calculo mental' },
  { id: 'match', title: 'Partido', subtitle: 'Futbol arcade' },
  { id: 'boss', title: 'Jefe final', subtitle: 'Combate duro' },
];

const zones = [
  { level: 1, name: 'Pueblo Inicio', emoji: '\U0001F3E1' },
  { level: 3, name: 'Bosque del Calculo', emoji: '\U0001F332' },
  { level: 6, name: 'Estadio Relampago', emoji: '\u26A1' },
  { level: 9, name: 'Isla de los Retos', emoji: '\U0001F3DD' },
  { level: 12, name: 'Liga Campeon', emoji: '\U0001F3C6' },
];

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function levelFromXp(xp: number) {
  return Math.max(1, Math.floor(xp / 140) + 1);
}

function xpToNext(level: number, xp: number) {
  const current = (level - 1) * 140;
  const next = level * 140;
  const value = xp - current;
  const total = next - current;
  return { value, total, pct: clamp((value / total) * 100, 0, 100) };
}

function seedRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function enemyForLevel(level: number) {
  if (level >= 12) return enemies[3];
  if (level >= 9) return enemies[2];
  if (level >= 6) return enemies[1];
  return enemies[0];
}

function makeQuestion(mode: Mode, seed: number, index: number): Question {
  const r = seedRandom(seed + index * 37);
  const bucket = index % 6;

  if (mode === 'match' || bucket === 2) {
    const goals = 1 + Math.floor(r * 4);
    const matches = 2 + Math.floor(seedRandom(seed + index + 11) * 4);
    const bonus = 1 + Math.floor(seedRandom(seed + index + 19) * 3);
    return {
      prompt: `Partido: ${goals} goles por partido durante ${matches} partidos y luego ${bonus} goles extra. Total = ?`,
      answer: goals * matches + bonus,
      xp: 24,
      coins: 14,
      kind: 'football',
      hint: 'Multiplica primero y suma el bonus.',
    };
  }

  if (mode === 'boss' || bucket === 5) {
    const a = 30 + Math.floor(r * 60);
    const b = 10 + Math.floor(seedRandom(seed + index + 9) * 40);
    const c = 2 + Math.floor(seedRandom(seed + index + 21) * 9);
    return {
      prompt: `Jefe final: ${a} + ${b} - ${c} = ?`,
      answer: a + b - c,
      xp: 35,
      coins: 20,
      kind: 'boss',
      hint: 'Suma primero y luego resta.',
    };
  }

  if (mode === 'training' && bucket === 3) {
    const n = 40 + Math.floor(r * 80);
    return {
      prompt: `Cuanto es el 25% de ${n}?`,
      answer: Math.round(n / 4),
      xp: 18,
      coins: 10,
      kind: 'math',
      hint: 'El 25% es una cuarta parte.',
    };
  }

  if (bucket === 1) {
    const a = 20 + Math.floor(r * 80);
    const b = 10 + Math.floor(seedRandom(seed + index + 3) * 50);
    return {
      prompt: `Combo rapido: ${a} x 2 - ${b} = ?`,
      answer: a * 2 - b,
      xp: 16,
      coins: 10,
      kind: 'math',
      hint: 'Dobla el primer numero y resta.',
    };
  }

  if (bucket === 4) {
    const a = 6 + Math.floor(r * 13);
    const b = 3 + Math.floor(seedRandom(seed + index + 7) * 8);
    return {
      prompt: `${a} x ${b} = ?`,
      answer: a * b,
      xp: 14,
      coins: 8,
      kind: 'math',
      hint: 'Puedes descomponer si hace falta.',
    };
  }

  const modePick = Math.floor(r * 3);
  if (modePick === 0) {
    const a = 100 + Math.floor(r * 400);
    const b = 20 + Math.floor(seedRandom(seed + index + 5) * 150);
    return {
      prompt: `${a} + ${b} = ?`,
      answer: a + b,
      xp: 10,
      coins: 6,
      kind: 'math',
      hint: 'Suma por partes.',
    };
  }
  if (modePick === 1) {
    const a = 200 + Math.floor(r * 500);
    const b = 20 + Math.floor(seedRandom(seed + index + 9) * 180);
    return {
      prompt: `${a} - ${b} = ?`,
      answer: a - b,
      xp: 10,
      coins: 6,
      kind: 'math',
      hint: 'Redondea y compensa.',
    };
  }

  const d = 3 + Math.floor(r * 9);
  const q = 6 + Math.floor(seedRandom(seed + index + 13) * 12);
  return {
    prompt: `${d * q} / ${d} = ?`,
    answer: q,
    xp: 12,
    coins: 7,
    kind: 'math',
    hint: 'Piensa cuantas veces cabe.',
  };
}

function createSession(mode: Mode, seed: number) {
  const length = mode === 'boss' ? 8 : mode === 'match' ? 10 : 12;
  return Array.from({ length }, (_, i) => makeQuestion(mode, seed, i));
}

function loadState(): SaveState {
  if (typeof window === 'undefined') {
    return {
      player: '',
      avatar: 'striker',
      creature: 'volt',
      xp: 0,
      coins: 0,
      streak: 0,
      bestStreak: 0,
      solved: 0,
      correct: 0,
      wrong: 0,
      unlockedSkins: ['classic'],
      completedDays: 0,
      mode: 'story',
    };
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try { return JSON.parse(raw); } catch {}
  }

  return {
    player: '',
    avatar: 'striker',
    creature: 'volt',
    xp: 0,
    coins: 0,
    streak: 0,
    bestStreak: 0,
    solved: 0,
    correct: 0,
    wrong: 0,
    unlockedSkins: ['classic'],
    completedDays: 0,
    mode: 'story',
  };
}

function Stat({ label, value, sub }: { label: string; value: number; sub: string }) {
  return (
    <div className="stat">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{sub}</small>
    </div>
  );
}

export default function App() {
  const [save, setSave] = useState<SaveState>(loadState);
  const [screen, setScreen] = useState<Screen>('home');
  const [nameDraft, setNameDraft] = useState(save.player || '');
  const [answer, setAnswer] = useState('');
  const [message, setMessage] = useState('Crea tu perfil para empezar.');
  const [showHint, setShowHint] = useState(false);
  const [battleEnemy, setBattleEnemy] = useState<Enemy>(enemyForLevel(levelFromXp(save.xp)));
  const [battleCreature, setBattleCreature] = useState<Creature>(() => creatures.find((c) => c.id === save.creature) ?? creatures[0]);
  const [battlePlayerHp, setBattlePlayerHp] = useState(100);
  const [battleEnemyHp, setBattleEnemyHp] = useState(100);
  const [battleTurns, setBattleTurns] = useState(0);
  const [mode, setMode] = useState<Mode>(save.mode || 'story');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [session, setSession] = useState<Question[]>(() => createSession(save.mode || 'story', Date.now() % 100000));
  const [activity, setActivity] = useState<Array<{ id: string; text: string; good: boolean }>>([]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
  }, [save]);

  useEffect(() => {
    const seed = Date.now() % 100000;
    setSession(createSession(mode, seed));
    setQuestionIndex(0);
    setAnswer('');
    setShowHint(false);
  }, [mode]);

  const level = levelFromXp(save.xp);
  const zone = [...zones].reverse().find((z) => level >= z.level) ?? zones[0];
  const nextZone = zones.find((z) => z.level > level) ?? null;
  const xp = xpToNext(level, save.xp);
  const current = session[questionIndex];
  const selectedAvatar = avatars.find((a) => a.id === save.avatar) ?? avatars[0];
  const selectedCreature = creatures.find((c) => c.id === save.creature) ?? creatures[0];

  function addActivity(text: string, good = true) {
    setActivity((prev) => [{ id: Math.random().toString(36).slice(2), text, good }, ...prev].slice(0, 5));
  }

  function startGame() {
    const trimmed = nameDraft.trim();
    if (!trimmed) { setMessage('Escribe un nombre antes de empezar.'); return; }
    setSave((prev) => ({ ...prev, player: trimmed }));
    setMessage(`Bienvenido, ${trimmed}!`);
  }

  function chooseAvatar(id: string) { setSave((prev) => ({ ...prev, avatar: id })); }
  function chooseCreature(id: string) { setSave((prev) => ({ ...prev, creature: id })); }

  function resetRun() {
    setSave((prev) => ({
      ...prev,
      xp: 0, coins: 0, streak: 0, bestStreak: 0, solved: 0, correct: 0, wrong: 0,
      completedDays: 0, unlockedSkins: ['classic'],
    }));
    setMode('story');
    setSession(createSession('story', Date.now() % 100000));
    setQuestionIndex(0);
    setAnswer('');
    setMessage('Nueva temporada preparada.');
  }

  function submitAnswer() {
    if (!current) return;
    const n = Number(answer);
    if (answer.trim() === '' || Number.isNaN(n)) { setMessage('Escribe un numero antes de lanzar.'); addActivity('Intento vacio', false); return; }

    if (n === current.answer) {
      const nextXp = save.xp + current.xp;
      const nextCoins = save.coins + current.coins;
      const nextStreak = save.streak + 1;
      const nextBest = Math.max(save.bestStreak, nextStreak);
      const nextCorrect = save.correct + 1;
      const nextSolved = save.solved + 1;
      const nextSkinUnlocks = new Set(save.unlockedSkins);
      if (nextCoins >= 40) nextSkinUnlocks.add('ball');
      if (nextCoins >= 65) nextSkinUnlocks.add('boots');
      if (nextCoins >= 90) nextSkinUnlocks.add('shield');
      if (nextCoins >= 120) nextSkinUnlocks.add('crown');

      setSave((prev) => ({
        ...prev, xp: nextXp, coins: nextCoins, streak: nextStreak, bestStreak: nextBest,
        correct: nextCorrect, solved: nextSolved, unlockedSkins: Array.from(nextSkinUnlocks),
        completedDays: prev.completedDays + (mode === 'story' ? 1 : 0),
      }));
      setMessage(`Correcto! +${current.xp} XP y +${current.coins} monedas.`);
      addActivity(`Bien: ${current.prompt}`, true);

      if (screen === 'battle') {
        const damage = battleCreature.attack + Math.floor(current.xp / 4);
        setBattleEnemyHp((hp) => Math.max(0, hp - damage));
        setBattleTurns((t) => t + 1);
      }

      if (questionIndex + 1 >= session.length) {
        setQuestionIndex(0);
        setSession(createSession(mode, Date.now() % 100000));
      } else {
        setQuestionIndex((i) => i + 1);
      }
      setAnswer('');
      setShowHint(false);
      return;
    }

    setSave((prev) => ({ ...prev, streak: 0, wrong: prev.wrong + 1 }));
    setMessage(`Casi. Pista: ${current.hint}`);
    addActivity(`Mal: ${current.prompt}`, false);

    if (screen === 'battle') {
      setBattlePlayerHp((hp) => Math.max(0, hp - battleEnemy.attack));
      setBattleTurns((t) => t + 1);
    }
  }

  function beginBattle() {
    const e = enemyForLevel(level);
    const creature = creatures.find((c) => c.id === save.creature) ?? creatures[0];
    setBattleEnemy(e);
    setBattleCreature(creature);
    setBattlePlayerHp(creature.hp);
    setBattleEnemyHp(e.hp);
    setBattleTurns(0);
    setScreen('battle');
    setMode(level >= 6 ? 'boss' : 'training');
    setQuestionIndex(0);
    setSession(createSession(level >= 6 ? 'boss' : 'training', Date.now() % 100000));
    setMessage(`Combate contra ${e.name}!`);
  }

  function finishBattleIfNeeded() {
    if (battleEnemyHp <= 0) {
      setSave((prev) => ({ ...prev, xp: prev.xp + battleEnemy.rewardXP, coins: prev.coins + battleEnemy.rewardCoins, solved: prev.solved + 1, correct: prev.correct + 1 }));
      addActivity(`Victoria contra ${battleEnemy.name}`, true);
      setMessage(`Victoria! +${battleEnemy.rewardXP} XP y +${battleEnemy.rewardCoins} monedas.`);
      setScreen('home');
      return;
    }
    if (battlePlayerHp <= 0) {
      addActivity(`Derrota contra ${battleEnemy.name}`, false);
      setMessage(`Derrota... ${battleEnemy.name} gano esta ronda.`);
      setScreen('home');
    }
  }

  useEffect(() => { finishBattleIfNeeded(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battlePlayerHp, battleEnemyHp]);

  function buyItem(cost: number, itemName: string) {
    if (save.coins < cost) { setMessage(`No tienes suficientes monedas para ${itemName}.`); return; }
    setSave((prev) => ({ ...prev, coins: prev.coins - cost }));
    setMessage(`Has comprado ${itemName}.`);
    addActivity(`Compra: ${itemName}`, true);
  }

  const missionProgress = session.length > 0 ? Math.round(((questionIndex + 1) / session.length) * 100) : 0;
  const statsPct = Math.round(xp.pct);
  const profileReady = Boolean(save.player);

  return (
    <div className="app">
      <div className="glow g1" />
      <div className="glow g2" />
      <div className="glow g3" />

      <header className="top">
        <div>
          <p className="kicker">Math League Arcade</p>
          <h1>Camino al Campeon</h1>
        </div>
        <div className="top-actions">
          <button className="ghost" onClick={() => setScreen('parent')}>Modo padre</button>
          <button className="ghost" onClick={() => setScreen('home')}>Juego</button>
          <button className="ghost" onClick={resetRun}>Reiniciar</button>
        </div>
      </header>

      <main className="grid">
        <section className="hero card">
          <div className="hero-grid">
            <div>
              <div className="tags">
                <span className="tag green">Verano 6o Primaria</span>
                <span className="tag blue">Futbol + aventura</span>
                <span className="tag orange">Calculo mental</span>
              </div>
              <h2>Un videojuego para practicar matematicas sin que parezca un cuaderno.</h2>
              <p>
                Elige avatar, criatura y modo de juego. Cada acierto da XP, monedas y medallas.
                El progreso se guarda automaticamente en el navegador.
              </p>

              <div className="profile">
                <div className="field-row">
                  <label className="label">
                    Nombre del jugador
                    <input value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} placeholder="Escribe su nombre" />
                  </label>
                  <button className="primary" onClick={startGame}>Crear perfil</button>
                </div>

                <div className="pick-grid">
                  <div>
                    <p className="kicker">Avatar</p>
                    <div className="pick-row">
                      {avatars.map((a) => (
                        <button key={a.id} className={`pick ${save.avatar === a.id ? 'selected' : ''}`} onClick={() => chooseAvatar(a.id)}>
                          <span className="em">{a.emoji}</span>
                          <span>{a.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="kicker">Criatura</p>
                    <div className="pick-row">
                      {creatures.map((c) => (
                        <button key={c.id} className={`pick ${save.creature === c.id ? 'selected' : ''}`} onClick={() => chooseCreature(c.id)}>
                          <span className="em">{c.emoji}</span>
                          <span>{c.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="side">
              <div className="player card-soft">
                <div className="big">{selectedAvatar.emoji}</div>
                <div>
                  <p className="kicker">Jugador</p>
                  <h3>{save.player || 'Sin nombre'}</h3>
                  <p className="muted">Nivel {level} {zone.emoji} {zone.name}</p>
                </div>
              </div>

              <div className="stats">
                <Stat label="XP" value={save.xp} sub={`${Math.max(0, xp.total - xp.value)} para subir`} />
                <Stat label="Monedas" value={save.coins} sub="Tienda arcade" />
                <Stat label="Racha" value={save.streak} sub={`Mejor: ${save.bestStreak}`} />
                <Stat label="Resueltas" value={save.solved} sub={`Correctas: ${save.correct} Fallos: ${save.wrong}`} />
              </div>

              <div className="bar-wrap">
                <div className="row"><span>Experiencia</span><span>{statsPct}%</span></div>
                <div className="bar"><div className="fill" style={{ width: `${statsPct}%` }} /></div>
              </div>

              <div className="notice">{message}</div>
            </div>
          </div>
        </section>

        <section className="two">
          <div className="card">
            <div className="head">
              <h3>Modo de juego</h3>
              <span className="badge">Sesion activa</span>
            </div>
            <div className="mode-grid">
              {modes.map((m) => (
                <button key={m.id} className={`mode ${mode === m.id ? 'selected' : ''}`} onClick={() => { setMode(m.id); setScreen('home'); setMessage(`Modo ${m.title} activado.`); }}>
                  <strong>{m.title}</strong>
                  <span>{m.subtitle}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="head">
              <h3>Mapa de progreso</h3>
              <span className="badge">{nextZone ? 'Siguiente meta' : 'Maximo nivel'}</span>
            </div>
            <div className="map">
              {zones.map((z) => {
                const open = level >= z.level;
                return (
                  <div key={z.name} className={`map-row ${open ? 'open' : ''}`}>
                    <div>
                      <strong>{z.emoji} {z.name}</strong>
                      <span>Nivel {z.level}+</span>
                    </div>
                    <span>{open ? 'Abierto' : 'Bloqueado'}</span>
                  </div>
                );
              })}
            </div>
            {nextZone && <p className="muted" style={{ marginTop: 12 }}>Siguiente zona: {nextZone.emoji} {nextZone.name}</p>}
          </div>
        </section>

        <section className="two">
          <div className="card">
            <div className="head">
              <h3>Ronda actual</h3>
              <span className="badge">{mode.toUpperCase()}</span>
            </div>

            {screen === 'battle' ? (
              <div className="battle-top">
                <div className="battle-box">
                  <p className="kicker">Tu criatura</p>
                  <div className="battle-emoji">{battleCreature.emoji}</div>
                  <div className="battle-stats">Ataque {battleCreature.attack} Vida {battlePlayerHp}/{battleCreature.hp}</div>
                  <div className="bar"><div className="fill green-fill" style={{ width: `${(battlePlayerHp / battleCreature.hp) * 100}%` }} /></div>
                </div>
                <div className="battle-box">
                  <p className="kicker">Rival</p>
                  <div className="battle-emoji">{battleEnemy.emoji}</div>
                  <div className="battle-stats">Ataque {battleEnemy.attack} Vida {battleEnemyHp}/{battleEnemy.hp}</div>
                  <div className="bar"><div className="fill red-fill" style={{ width: `${(battleEnemyHp / battleEnemy.hp) * 100}%` }} /></div>
                </div>
              </div>
            ) : null}

            {profileReady ? (
              <>
                <div className="question-box">
                  <div className="meta">
                    <span className="badge soft">{current?.kind === 'football' ? 'Futbol' : current?.kind === 'boss' ? 'Jefe' : 'Calculo'}</span>
                    <span className="badge soft">+{current?.xp ?? 0} XP</span>
                    <span className="badge soft">+{current?.coins ?? 0} monedas</span>
                    <span className="badge soft">{questionIndex + 1}/{session.length}</span>
                  </div>
                  <div className="question">{current?.prompt}</div>
                  <p className="hint">{showHint ? `Pista: ${current?.hint}` : 'Haz clic en pista para ver una ayuda.'}</p>
                </div>

                <div className="answer-row">
                  <input value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Escribe la respuesta" inputMode="numeric" />
                  <button className="primary" onClick={submitAnswer}>Atacar</button>
                </div>

                <div className="actions">
                  <button className="ghost" onClick={() => setShowHint((s) => !s)}>Pista</button>
                  <button className="ghost" onClick={() => setAnswer(String(current?.answer ?? ''))}>Mostrar respuesta</button>
                  <button className="ghost" onClick={beginBattle}>Combate rapido</button>
                </div>

                <div className="bar-wrap" style={{ marginTop: 14 }}>
                  <div className="row"><span>Progreso de mision</span><span>{missionProgress}%</span></div>
                  <div className="bar"><div className="fill blue-fill" style={{ width: `${missionProgress}%` }} /></div>
                </div>

                <div className="notice">{message}</div>
              </>
            ) : (
              <div className="empty">Añade un nombre y pulsa <strong>Crear perfil</strong> para empezar.</div>
            )}
          </div>

          <div className="stack">
            <div className="card">
              <div className="head">
                <h3>Medallas</h3>
                <span className="badge">Logros</span>
              </div>
              <div className="medals">
                {['Rayo', 'Fenix', 'Dragon', 'Balon de Oro', 'Leyenda'].map((m, i) => {
                  const active = save.coins >= [0, 40, 65, 90, 120][i];
                  return <span key={m} className={`medal ${active ? 'active' : ''}`}>{m}</span>;
                })}
              </div>
            </div>

            <div className="card">
              <div className="head">
                <h3>Tienda arcade</h3>
                <span className="badge">{save.coins} monedas</span>
              </div>
              <div className="shop-list">
                {shopItems.map((item) => (
                  <button key={item.id} className="shop" onClick={() => buyItem(item.cost, item.name)}>
                    <div className="shop-left">
                      <span className="icon">{item.icon}</span>
                      <div>
                        <strong>{item.name}</strong>
                        <span>{item.desc}</span>
                      </div>
                    </div>
                    <span className={`badge ${save.coins >= item.cost ? 'ok' : ''}`}>{save.coins >= item.cost ? 'Comprar' : 'Sin monedas'}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="head">
                <h3>Estado del jugador</h3>
                <span className="badge">{selectedCreature.emoji} {selectedCreature.name}</span>
              </div>
              <div className="states">
                <div><strong>Avatar</strong><span>{selectedAvatar.name}</span></div>
                <div><strong>Dias jugados</strong><span>{save.completedDays}</span></div>
                <div><strong>Combates</strong><span>{battleTurns}</span></div>
                <div><strong>Skin</strong><span>{save.unlockedSkins.join(', ')}</span></div>
              </div>
            </div>

            <div className="card">
              <div className="head">
                <h3>Actividad reciente</h3>
                <span className="badge">5 ultimas</span>
              </div>
              <div className="activities">
                {activity.length === 0 ? (
                  <div className="empty">Todavia no hay actividad.</div>
                ) : (
                  activity.map((item) => (
                    <div key={item.id} className={`activity ${item.good ? 'good' : 'bad'}`}>{item.text}</div>
                  ))
                )}
              </div>
            </div>

            <div className="card">
              <div className="head">
                <h3>Acciones rapidas</h3>
                <span className="badge">Control</span>
              </div>
              <div className="quick">
                <button className="ghost" onClick={() => setScreen('home')}>Juego</button>
                <button className="ghost" onClick={() => setScreen('parent')}>Modo padre</button>
                <button className="ghost" onClick={() => beginBattle()}>Combate</button>
                <button className="ghost" onClick={resetRun}>Reiniciar</button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {screen === 'parent' && (
        <div className="overlay">
          <div className="modal">
            <div className="head">
              <h3>Modo padre</h3>
              <button className="ghost" onClick={() => setScreen('home')}>Cerrar</button>
            </div>
            <div className="parent-grid">
              <div className="parent-box">
                <strong>Actividad</strong>
                <span>Resueltas: {save.solved}</span>
                <span>Correctas: {save.correct}</span>
                <span>Fallos: {save.wrong}</span>
                <span>Mejor racha: {save.bestStreak}</span>
              </div>
              <div className="parent-box">
                <strong>Progreso</strong>
                <span>XP: {save.xp}</span>
                <span>Nivel: {level}</span>
                <span>Monedas: {save.coins}</span>
                <span>Medallas: {save.unlockedSkins.join(', ')}</span>
              </div>
            </div>
            <p className="muted">Sugerencia: usa recompensas reales cuando llegue a hitos como 500 monedas o 30 dias de racha.</p>
          </div>
        </div>
      )}
    </div>
  );
}
