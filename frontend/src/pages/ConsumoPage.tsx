import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { ProcessRanking } from '../components/ProcessRanking';
import { useRealtimeData } from '../hooks/useRealtimeData';

export function ConsumoPage(): JSX.Element {
  const processSectionRef = useRef<HTMLDivElement | null>(null)
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [processSectionHighlighted, setProcessSectionHighlighted] = useState(false)

  useEffect(() => {
    const handleFocusProcesses = () => {
      processSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setProcessSectionHighlighted(true)

      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current)
      }
      highlightTimeoutRef.current = setTimeout(() => {
        setProcessSectionHighlighted(false)
      }, 1800)
    }

    window.addEventListener('wifi-acelerator:focus-processes', handleFocusProcesses)
    return () => {
      window.removeEventListener('wifi-acelerator:focus-processes', handleFocusProcesses)
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current)
      }
    }
  }, [])

  const { processes, loading, error } = useRealtimeData()

  if (loading && !processes) {
    return (
      <div className="glass-panel rounded-2xl p-8 text-center text-slate-300">
        Cargando consumo de procesos...
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-danger/50 bg-danger/10 p-6 text-danger">
        Error de comunicacion con backend: {error}
      </div>
    )
  }

  return (
    <div
      ref={processSectionRef}
      className={`relative rounded-2xl transition-all duration-500 ${processSectionHighlighted ? 'ring-2 ring-warning/70 shadow-[0_0_32px_rgba(245,158,11,0.32)]' : ''}`}
    >
      <AnimatePresence>
        {processSectionHighlighted && (
          <motion.div
            className="absolute -top-2 right-3 z-10 rounded-full border border-warning/50 bg-warning/20 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-warning"
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.24, ease: 'easeOut' }}
          >
            Procesos priorizados
          </motion.div>
        )}
      </AnimatePresence>
      <ProcessRanking processes={processes} />
    </div>
  )
}
