import { AnimatePresence, motion } from 'framer-motion';
import {
    Activity,
    AlertTriangle,
    Cpu,
    GaugeCircle,
    Menu,
    RotateCcw,
    Settings2,
    ShieldCheck,
    X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useRealtimeData } from '../hooks/useRealtimeData';

interface AppShellProps {
  children: React.ReactNode
}

const items = [
  { icon: GaugeCircle, label: 'Dashboard', path: '/' },
  { icon: Activity, label: 'Dispositivos', path: '/dispositivos' },
  { icon: Cpu, label: 'Consumo', path: '/consumo' },
  { icon: ShieldCheck, label: 'Acelerator Insights', path: '/insights' },
]

export function AppShell({ children }: AppShellProps): JSX.Element {
  const location = useLocation()
  const navigate = useNavigate()
  const { processes } = useRealtimeData()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [hasSeenSwipeHint, setHasSeenSwipeHint] = useState(false)
  const [reduceMotion, setReduceMotion] = useState(false)
  const [compactNav, setCompactNav] = useState(false)
  const [alwaysShowGestureHint, setAlwaysShowGestureHint] = useState(false)
  const [processAlertThreshold, setProcessAlertThreshold] = useState(7)
  const drawerTouchStartX = useRef<number | null>(null)
  const edgeTouchStartX = useRef<number | null>(null)
  const settingsContainerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const storedValue = localStorage.getItem('wifi-acelerator-mobile-swipe-hint-seen')
    if (storedValue === '1') {
      setHasSeenSwipeHint(true)
    }

    if (localStorage.getItem('wifi-acelerator-ui-reduce-motion') === '1') {
      setReduceMotion(true)
    }
    if (localStorage.getItem('wifi-acelerator-ui-compact-nav') === '1') {
      setCompactNav(true)
    }
    if (localStorage.getItem('wifi-acelerator-ui-always-show-gesture-hint') === '1') {
      setAlwaysShowGestureHint(true)
    }

    const savedThreshold = Number(localStorage.getItem('wifi-acelerator-process-alert-threshold'))
    if (Number.isFinite(savedThreshold) && savedThreshold >= 1 && savedThreshold <= 20) {
      setProcessAlertThreshold(savedThreshold)
    }
  }, [])

  useEffect(() => {
    const handleStorage = (): void => {
      const savedThreshold = Number(localStorage.getItem('wifi-acelerator-process-alert-threshold'))
      if (Number.isFinite(savedThreshold) && savedThreshold >= 1 && savedThreshold <= 20) {
        setProcessAlertThreshold(savedThreshold)
      }
    }

    const handleThresholdUpdate = (event: Event): void => {
      const customEvent = event as CustomEvent<number>
      const value = customEvent.detail
      if (Number.isFinite(value) && value >= 1 && value <= 20) {
        setProcessAlertThreshold(value)
      }
    }

    window.addEventListener('storage', handleStorage)
    window.addEventListener('wifi-acelerator:process-threshold-update', handleThresholdUpdate)

    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('wifi-acelerator:process-threshold-update', handleThresholdUpdate)
    }
  }, [])

  const highUsageCount = processes.filter(
    (item) => item.estimatedUsageScore >= processAlertThreshold,
  ).length

  useEffect(() => {
    setMobileNavOpen(false)
    setSettingsOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!mobileNavOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    if (!hasSeenSwipeHint) {
      setHasSeenSwipeHint(true)
      localStorage.setItem('wifi-acelerator-mobile-swipe-hint-seen', '1')
    }

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [hasSeenSwipeHint, mobileNavOpen])

  useEffect(() => {
    if (!settingsOpen) return

    const handlePointerDown = (event: MouseEvent | TouchEvent): void => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (!settingsContainerRef.current?.contains(target)) {
        setSettingsOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setSettingsOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [settingsOpen])

  const handleTouchStart = (event: React.TouchEvent<HTMLElement>): void => {
    drawerTouchStartX.current = event.touches[0]?.clientX ?? null
  }

  const handleTouchEnd = (event: React.TouchEvent<HTMLElement>): void => {
    if (drawerTouchStartX.current === null) return
    const endX = event.changedTouches[0]?.clientX ?? drawerTouchStartX.current
    const swipeDistance = endX - drawerTouchStartX.current
    if (swipeDistance < -60) {
      setMobileNavOpen(false)
    }
    drawerTouchStartX.current = null
  }

  const handleEdgeTouchStart = (event: React.TouchEvent<HTMLElement>): void => {
    if (mobileNavOpen) return
    const startX = event.touches[0]?.clientX ?? 0
    edgeTouchStartX.current = startX <= 28 ? startX : null
  }

  const handleEdgeTouchEnd = (event: React.TouchEvent<HTMLElement>): void => {
    if (mobileNavOpen || edgeTouchStartX.current === null) return
    const endX = event.changedTouches[0]?.clientX ?? edgeTouchStartX.current
    const swipeDistance = endX - edgeTouchStartX.current
    if (swipeDistance > 70) {
      setMobileNavOpen(true)
    }
    edgeTouchStartX.current = null
  }

  const navItemClass = ({ isActive }: { isActive: boolean }): string =>
    [
      'flex w-full items-center gap-3 rounded-xl border px-4 text-left transition',
      compactNav ? 'py-2.5 text-[13px]' : 'py-3 text-sm',
      isActive
        ? 'border-accent/40 bg-accent/10 text-accent'
        : 'border-white/5 bg-white/5 text-slate-200 hover:border-accent/40 hover:bg-accent/10',
    ].join(' ')

  const resetSwipeHint = (): void => {
    localStorage.removeItem('wifi-acelerator-mobile-swipe-hint-seen')
    setHasSeenSwipeHint(false)
  }

  const toggleReduceMotion = (): void => {
    setReduceMotion((prev) => {
      const next = !prev
      localStorage.setItem('wifi-acelerator-ui-reduce-motion', next ? '1' : '0')
      return next
    })
  }

  const toggleCompactNav = (): void => {
    setCompactNav((prev) => {
      const next = !prev
      localStorage.setItem('wifi-acelerator-ui-compact-nav', next ? '1' : '0')
      return next
    })
  }

  const toggleAlwaysShowGestureHint = (): void => {
    setAlwaysShowGestureHint((prev) => {
      const next = !prev
      localStorage.setItem('wifi-acelerator-ui-always-show-gesture-hint', next ? '1' : '0')
      return next
    })
  }

  const focusProcessesSection = (): void => {
    const emitFocusEvent = () => {
      window.dispatchEvent(new Event('wifi-acelerator:focus-processes'))
    }

    if (location.pathname === '/' || location.pathname === '/consumo') {
      emitFocusEvent()
      return
    }

    navigate('/consumo')
    window.setTimeout(emitFocusEvent, 240)
  }

  return (
    <div
      className="min-h-screen grid-overlay"
      onTouchStart={handleEdgeTouchStart}
      onTouchEnd={handleEdgeTouchEnd}
    >
      <AnimatePresence>
        {!mobileNavOpen && (!hasSeenSwipeHint || alwaysShowGestureHint) && (
          <motion.div
            aria-hidden="true"
            className="pointer-events-none fixed left-0 top-1/2 z-30 h-14 w-1 -translate-y-1/2 rounded-r-full bg-accent/60 shadow-[0_0_18px_rgba(45,212,191,0.6)] md:hidden"
            initial={reduceMotion ? false : { opacity: 0, x: -6 }}
            animate={{ opacity: 0.7, x: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -6 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.28, ease: 'easeOut' }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {mobileNavOpen && (
          <>
            <motion.button
              type="button"
              aria-label="Cerrar menu"
              className="fixed inset-0 z-40 bg-slate-950/70 md:hidden"
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileNavOpen(false)}
            />

            <motion.aside
              className="glass-panel fixed inset-y-0 left-0 z-50 w-72 rounded-r-3xl p-5 shadow-blueGlow md:hidden"
              initial={reduceMotion ? false : { x: -320, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -320, opacity: 0 }}
              transition={reduceMotion ? { duration: 0 } : { duration: 0.22, ease: 'easeOut' }}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <div className="flex items-center justify-between">
                <p className="metric-label text-xs uppercase tracking-[0.24em] text-accentBlue/80">
                  Wifi Acelerator
                </p>
                <button
                  type="button"
                  onClick={() => setMobileNavOpen(false)}
                  className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-200"
                  aria-label="Cerrar menu"
                >
                  <X size={16} />
                </button>
              </div>

              <h1 className="mt-3 text-2xl font-bold text-white">Control Center</h1>

              <nav className="mt-8 space-y-2">
                {items.map((item, index) => (
                  <motion.div
                    key={`mobile-${item.label}`}
                    initial={reduceMotion ? false : { opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={reduceMotion ? { duration: 0 } : { delay: 0.05 * index }}
                  >
                    <NavLink to={item.path} className={navItemClass} end={item.path === '/'}>
                      <item.icon size={17} className="text-accent" />
                      {item.label}
                    </NavLink>
                  </motion.div>
                ))}
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="mx-auto flex w-full max-w-[1640px] gap-5 p-4 md:p-6">
        <aside className="glass-panel sticky top-4 hidden h-[calc(100vh-2rem)] w-64 rounded-3xl p-5 shadow-blueGlow md:block">
          <p className="metric-label text-xs uppercase tracking-[0.24em] text-accentBlue/80">
            Wifi Acelerator
          </p>
          <h1 className="mt-2 text-2xl font-bold text-white">Control Center</h1>

          <nav className="mt-8 space-y-2">
            {items.map((item, index) => (
              <motion.div
                key={item.label}
                initial={reduceMotion ? false : { opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={reduceMotion ? { duration: 0 } : { delay: 0.08 * index }}
              >
                <NavLink to={item.path} className={navItemClass} end={item.path === '/'}>
                  <item.icon size={17} className="text-accent" />
                  {item.label}
                </NavLink>
              </motion.div>
            ))}
          </nav>
        </aside>

        <main className="w-full">
          <header className="glass-panel relative mb-5 flex items-center justify-between rounded-2xl px-5 py-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-200 md:hidden"
                aria-label="Abrir menu"
                onClick={() => setMobileNavOpen(true)}
              >
                <Menu size={16} />
              </button>

              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  Realtime Security Dashboard
                </p>
                <h2 className="metric-label text-xl font-semibold text-white">
                  Home WiFi Operations
                </h2>
              </div>
            </div>
            <div className="flex items-center gap-2" ref={settingsContainerRef}>
              {highUsageCount > 0 && (
                <button
                  type="button"
                  onClick={focusProcessesSection}
                  className="hidden items-center gap-1.5 rounded-full border border-warning/40 bg-warning/10 px-3 py-1 text-xs text-warning transition hover:border-warning/70 hover:bg-warning/20 lg:flex"
                  title="Ir a procesos de alto consumo"
                  aria-label="Ir a procesos de alto consumo"
                >
                  <AlertTriangle size={12} />
                  {highUsageCount} en alto consumo
                </button>
              )}

              <button
                type="button"
                onClick={() => setSettingsOpen((prev) => !prev)}
                className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:border-accent/40 hover:text-accent"
                aria-label="Abrir ajustes de interfaz"
                title="Ajustes de interfaz"
              >
                <Settings2 size={14} />
              </button>

              <button
                type="button"
                onClick={resetSwipeHint}
                className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-300 transition hover:border-accent/40 hover:text-accent md:hidden"
                aria-label="Mostrar pista de gesto"
                title="Mostrar pista de gesto"
              >
                <RotateCcw size={14} />
              </button>

              <div className="flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-xs text-accent">
                <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-accent" />
                LIVE
              </div>
            </div>

            <AnimatePresence>
              {settingsOpen && (
                <motion.div
                  className="absolute right-4 top-[calc(100%+10px)] z-20 w-64 rounded-2xl border border-white/10 bg-slate-950/90 p-3 shadow-blueGlow backdrop-blur"
                  initial={reduceMotion ? false : { opacity: 0, y: -6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }}
                  transition={reduceMotion ? { duration: 0 } : { duration: 0.18, ease: 'easeOut' }}
                >
                  <p className="px-1 pb-2 text-xs uppercase tracking-[0.16em] text-slate-400">
                    UX Settings
                  </p>

                  <button
                    type="button"
                    onClick={toggleReduceMotion}
                    className="mb-2 flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left text-sm text-slate-200 transition hover:border-accent/40"
                  >
                    <span>Reducir animaciones</span>
                    <span className={reduceMotion ? 'text-accent' : 'text-slate-500'}>
                      {reduceMotion ? 'ON' : 'OFF'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={toggleCompactNav}
                    className="mb-2 flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left text-sm text-slate-200 transition hover:border-accent/40"
                  >
                    <span>Navegacion compacta</span>
                    <span className={compactNav ? 'text-accent' : 'text-slate-500'}>
                      {compactNav ? 'ON' : 'OFF'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={toggleAlwaysShowGestureHint}
                    className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left text-sm text-slate-200 transition hover:border-accent/40"
                  >
                    <span>Mostrar pista de gesto</span>
                    <span className={alwaysShowGestureHint ? 'text-accent' : 'text-slate-500'}>
                      {alwaysShowGestureHint ? 'ON' : 'OFF'}
                    </span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </header>
          {children}
        </main>
      </div>
    </div>
  )
}
