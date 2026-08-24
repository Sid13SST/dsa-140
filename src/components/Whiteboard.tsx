import { useCallback, useEffect, useRef, useState } from 'react'

export type Tool = 'pen' | 'box' | 'arrow' | 'text' | 'erase'

interface Shape {
  tool: Tool
  points: { x: number; y: number }[]
  text?: string
}

interface Props {
  onSnapshot: (base64: string) => void
  busy?: boolean
}

/**
 * A deliberately small whiteboard: boxes, arrows, freehand and labels are
 * everything a system design diagram needs, and every extra tool is one more
 * thing to fight while a timer runs.
 *
 * It always renders on a white background with dark strokes regardless of the
 * app theme — the image is sent to a vision model, and a dark-on-dark PNG is
 * much harder for it to read than plain black on white.
 */
export default function Whiteboard({ onSnapshot, busy }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [tool, setTool] = useState<Tool>('box')
  const [shapes, setShapes] = useState<Shape[]>([])
  const [drawing, setDrawing] = useState<Shape | null>(null)

  const redraw = useCallback(() => {
    const cv = canvasRef.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, cv.width, cv.height)

    // Faint grid, purely to help the eye keep boxes aligned.
    ctx.strokeStyle = '#E8ECF2'
    ctx.lineWidth = 1
    for (let x = 0; x < cv.width; x += 24) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, cv.height)
      ctx.stroke()
    }
    for (let y = 0; y < cv.height; y += 24) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(cv.width, y)
      ctx.stroke()
    }

    const all = drawing ? [...shapes, drawing] : shapes
    ctx.strokeStyle = '#111827'
    ctx.fillStyle = '#111827'
    ctx.lineWidth = 2.5
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'

    for (const s of all) {
      const p = s.points
      if (p.length === 0) continue

      if (s.tool === 'pen' || s.tool === 'erase') {
        ctx.save()
        if (s.tool === 'erase') {
          ctx.strokeStyle = '#FFFFFF'
          ctx.lineWidth = 18
        }
        ctx.beginPath()
        ctx.moveTo(p[0].x, p[0].y)
        for (const q of p.slice(1)) ctx.lineTo(q.x, q.y)
        ctx.stroke()
        ctx.restore()
      } else if (s.tool === 'box' && p.length >= 2) {
        const [a, b] = [p[0], p[p.length - 1]]
        ctx.strokeRect(Math.min(a.x, b.x), Math.min(a.y, b.y), Math.abs(b.x - a.x), Math.abs(b.y - a.y))
      } else if (s.tool === 'arrow' && p.length >= 2) {
        const [a, b] = [p[0], p[p.length - 1]]
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.stroke()
        const ang = Math.atan2(b.y - a.y, b.x - a.x)
        const head = 11
        ctx.beginPath()
        ctx.moveTo(b.x, b.y)
        ctx.lineTo(b.x - head * Math.cos(ang - Math.PI / 7), b.y - head * Math.sin(ang - Math.PI / 7))
        ctx.moveTo(b.x, b.y)
        ctx.lineTo(b.x - head * Math.cos(ang + Math.PI / 7), b.y - head * Math.sin(ang + Math.PI / 7))
        ctx.stroke()
      } else if (s.tool === 'text' && s.text) {
        ctx.font = '600 15px ui-sans-serif, system-ui, sans-serif'
        ctx.fillText(s.text, p[0].x, p[0].y)
      }
    }
  }, [shapes, drawing])

  useEffect(redraw, [redraw])

  const pos = (e: React.PointerEvent) => {
    const cv = canvasRef.current!
    const r = cv.getBoundingClientRect()
    // Canvas backing store is larger than its CSS size, so scale the pointer.
    return {
      x: ((e.clientX - r.left) / r.width) * cv.width,
      y: ((e.clientY - r.top) / r.height) * cv.height,
    }
  }

  const down = (e: React.PointerEvent) => {
    // Capture keeps a drag alive if the pointer leaves the canvas, but it is a
    // nicety — if the browser refuses it, drawing must still work rather than
    // dying on an exception before the stroke ever starts.
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      /* non-fatal */
    }
    const p = pos(e)
    if (tool === 'text') {
      const text = window.prompt('Label:')
      if (text) setShapes((s) => [...s, { tool: 'text', points: [p], text }])
      return
    }
    setDrawing({ tool, points: [p] })
  }

  const move = (e: React.PointerEvent) => {
    if (!drawing) return
    const p = pos(e)
    setDrawing((d) =>
      d ? { ...d, points: d.tool === 'pen' || d.tool === 'erase' ? [...d.points, p] : [d.points[0], p] } : d,
    )
  }

  const up = () => {
    if (drawing && drawing.points.length > 0) setShapes((s) => [...s, drawing])
    setDrawing(null)
  }

  const snapshot = () => {
    const cv = canvasRef.current
    if (!cv) return
    onSnapshot(cv.toDataURL('image/png').split(',')[1])
  }

  const isEmpty = shapes.length === 0

  const TOOLS: { id: Tool; label: string }[] = [
    { id: 'box', label: '▭ box' },
    { id: 'arrow', label: '→ arrow' },
    { id: 'text', label: 'T label' },
    { id: 'pen', label: '✎ pen' },
    { id: 'erase', label: '⌫ erase' },
  ]

  return (
    <div className="card p-2">
      <div className="flex flex-wrap items-center gap-1 mb-2">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTool(t.id)}
            className={`btn text-xs ${tool === t.id ? 'btn-primary' : ''}`}
          >
            {t.label}
          </button>
        ))}
        <button
          className="btn text-xs ml-auto"
          onClick={() => setShapes((s) => s.slice(0, -1))}
          disabled={isEmpty}
        >
          Undo
        </button>
        <button className="btn text-xs" onClick={() => setShapes([])} disabled={isEmpty}>
          Clear
        </button>
        <button className="btn btn-primary text-xs" onClick={snapshot} disabled={isEmpty || busy}>
          Send to interviewer
        </button>
      </div>

      <canvas
        ref={canvasRef}
        width={1100}
        height={620}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerLeave={up}
        className="w-full rounded-lg border border-rule touch-none cursor-crosshair bg-white"
        style={{ aspectRatio: '1100 / 620' }}
      />

      <p className="text-[11px] text-muted mt-1.5">
        Drag to draw. The board is always black-on-white so the model can read it, whichever theme
        you are using.
      </p>
    </div>
  )
}
