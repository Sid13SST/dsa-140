import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Day, Progress } from '../types'
import { computeAnalytics } from './analytics'

type RGB = [number, number, number]

const COLOR = {
  ink: [18, 38, 63] as RGB,
  muted: [91, 107, 127] as RGB,
  rule: [211, 218, 228] as RGB,
  ac: [14, 124, 102] as RGB,
  acSoft: [223, 240, 236] as RGB,
  warn: [199, 125, 34] as RGB,
  warnSoft: [246, 232, 216] as RGB,
  miss: [163, 59, 74] as RGB,
  missSoft: [242, 222, 226] as RGB,
  brand: [79, 70, 229] as RGB,
  brandDeep: [55, 48, 163] as RGB,
  brandSoft: [235, 233, 252] as RGB,
  ground: [238, 241, 246] as RGB,
  white: [255, 255, 255] as RGB,
}

function fmtDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function statusLabel(st: Progress[string] | undefined, dateIsPast: boolean) {
  if (st?.status === 'done') return 'Done'
  if (st?.status === 'absent') return 'Absent'
  if (dateIsPast) return 'Missed'
  return 'Upcoming'
}

interface ReportOptions {
  studentName?: string
}

export function generatePdfReport(
  schedule: Day[],
  progress: Progress,
  todayIso: string,
  opts: ReportOptions = {},
) {
  const a = computeAnalytics(schedule, progress, todayIso)
  const pace = a.expected === 0 ? 0 : Math.round((a.solved / a.expected) * 100)

  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const margin = 40
  const contentW = pageW - margin * 2

  /* ---------------------------- Cover banner ---------------------------- */
  doc.setFillColor(...COLOR.ink)
  doc.rect(0, 0, pageW, 118, 'F')
  doc.setFillColor(...COLOR.brand)
  doc.rect(0, 112, pageW, 5, 'F')

  doc.setTextColor(...COLOR.white)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(27)
  doc.text('DSA 140', margin, 48)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(13)
  doc.text('Interview Prep — Progress Report', margin, 68)

  doc.setFontSize(9)
  doc.setTextColor(198, 204, 220)
  const rangeLabel = `${fmtDate(schedule[0].date)} → ${fmtDate(schedule[schedule.length - 1].date)}`
  doc.text(`Plan window: ${rangeLabel}`, margin, 88)
  doc.text(
    `Generated ${fmtDate(todayIso)}${opts.studentName ? `  ·  Prepared for ${opts.studentName}` : ''}`,
    margin,
    101,
  )

  let y = 148

  /* ------------------------------ KPI tiles ------------------------------ */
  const kpis = [
    { label: 'PROBLEMS SOLVED', value: `${a.solved}`, sub: `of ${a.totalUnique}` },
    { label: 'HOURS LOGGED', value: a.hours.toFixed(1), sub: 'total' },
    { label: 'CURRENT STREAK', value: `${a.streak}`, sub: 'days' },
    { label: 'BEST STREAK', value: `${a.bestStreak}`, sub: 'days' },
    { label: 'CONSISTENCY', value: `${a.consistencyPct}%`, sub: `${a.daysDone}/${a.elapsed} days` },
    { label: 'ON-PACE', value: `${pace}%`, sub: `${a.solved}/${a.expected} due` },
    { label: 'CONTESTS', value: `${a.contests}`, sub: 'rated' },
  ]

  const tileGap = 7
  const tileW = (contentW - tileGap * (kpis.length - 1)) / kpis.length
  const tileH = 60

  kpis.forEach((k, i) => {
    const x = margin + i * (tileW + tileGap)
    doc.setDrawColor(...COLOR.rule)
    doc.setFillColor(...COLOR.white)
    doc.roundedRect(x, y, tileW, tileH, 4, 4, 'FD')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.2)
    doc.setTextColor(...COLOR.muted)
    doc.text(k.label, x + 7, y + 14, { maxWidth: tileW - 12 })
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.setTextColor(...COLOR.ink)
    doc.text(k.value, x + 7, y + 36)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.8)
    doc.setTextColor(...COLOR.muted)
    doc.text(k.sub, x + 7, y + 49, { maxWidth: tileW - 12 })
  })

  y += tileH + 22

  /* --------------------- Difficulty mix + pace callout -------------------- */
  const halfGap = 14
  const colW = (contentW - halfGap) / 2

  // Difficulty distribution.
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.setTextColor(...COLOR.ink)
  doc.text('DIFFICULTY MIX', margin, y)

  const diffTotal = a.byDiff.Easy + a.byDiff.Medium + a.byDiff.Hard || 1
  const barY = y + 12
  const barH = 12
  let cx = margin
  const diffs: [keyof typeof a.byDiff, RGB][] = [
    ['Easy', COLOR.ac],
    ['Medium', COLOR.warn],
    ['Hard', COLOR.miss],
  ]
  for (const [k, color] of diffs) {
    const w = (a.byDiff[k] / diffTotal) * colW
    if (w > 0) {
      doc.setFillColor(...color)
      doc.rect(cx, barY, w, barH, 'F')
    }
    cx += w
  }
  doc.setDrawColor(...COLOR.rule)
  doc.roundedRect(margin, barY, colW, barH, 2, 2, 'S')

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  let legendY = barY + barH + 14
  const legendItems: [string, RGB, number][] = [
    ['Easy', COLOR.ac, a.byDiff.Easy],
    ['Medium', COLOR.warn, a.byDiff.Medium],
    ['Hard', COLOR.miss, a.byDiff.Hard],
  ]
  let lx = margin
  for (const [label, color, count] of legendItems) {
    doc.setFillColor(...color)
    doc.rect(lx, legendY - 7, 8, 8, 'F')
    doc.setTextColor(...COLOR.ink)
    doc.text(`${label} ${count}`, lx + 12, legendY)
    lx += 62
  }

  // Pace / projection callout.
  const px = margin + colW + halfGap
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.setTextColor(...COLOR.ink)
  doc.text('PACE & PROJECTION', px, y)

  doc.setDrawColor(...COLOR.rule)
  doc.setFillColor(...COLOR.brandSoft)
  doc.roundedRect(px, y + 8, colW, 62, 4, 4, 'FD')

  const paceText =
    a.paceDeltaDays > 0
      ? `${a.paceDeltaDays} day${a.paceDeltaDays === 1 ? '' : 's'} ahead of plan`
      : a.paceDeltaDays < 0
        ? `${Math.abs(a.paceDeltaDays)} day${Math.abs(a.paceDeltaDays) === 1 ? '' : 's'} behind plan`
        : 'Exactly on schedule'

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...COLOR.brandDeep)
  doc.text(paceText, px + 10, y + 28)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.2)
  doc.setTextColor(...COLOR.ink)
  doc.text(
    `Projected finish: ${a.projectedFinishIso ? fmtDate(a.projectedFinishIso) : 'not enough data yet'}`,
    px + 10,
    y + 43,
  )
  doc.text(
    `Avg ${a.avgProblemsPerActiveDay.toFixed(1)} solved / ${a.avgHoursPerActiveDay.toFixed(1)}h per active day`,
    px + 10,
    y + 56,
  )

  y += 100

  /* ------------------------------ Weekly table ---------------------------- */
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  doc.setTextColor(...COLOR.ink)
  doc.text('WEEKLY SUMMARY', margin, y)
  y += 8

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Week', 'Starting', 'Days done', 'Hours', 'Solved']],
    body: a.weekly.map((w, i) => [
      `W${i + 1}`,
      fmtDate(w.weekStart),
      `${schedule.slice(i * 7, i * 7 + 7).filter((d) => progress[d.date]?.status === 'done').length}`,
      w.hours.toFixed(1),
      `${w.solved}`,
    ]),
    theme: 'plain',
    styles: { fontSize: 8, cellPadding: 4, textColor: COLOR.ink, lineColor: COLOR.rule, lineWidth: 0.5 },
    headStyles: { fillColor: COLOR.ink, textColor: COLOR.white, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: COLOR.ground },
  })

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 24

  /* ---------------------------- Topic coverage ---------------------------- */
  const topicMap = new Map<string, { total: number; done: number }>()
  const solvedSlugs = new Set(Object.values(progress).flatMap((s) => s.solved))
  for (const d of schedule) {
    for (const p of d.problems) {
      if (p.revisit) continue
      const r = topicMap.get(p.topic) ?? { total: 0, done: 0 }
      r.total++
      if (solvedSlugs.has(p.slug)) r.done++
      topicMap.set(p.topic, r)
    }
  }
  const topicRows = [...topicMap.entries()].sort((x, y2) => y2[1].total - x[1].total)

  if (y > 700) {
    doc.addPage()
    y = margin
  }
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  doc.setTextColor(...COLOR.ink)
  doc.text('COVERAGE BY TOPIC', margin, y)
  y += 8

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Topic', 'Solved / Total', '%']],
    body: topicRows.map(([topic, r]) => [topic, `${r.done} / ${r.total}`, `${Math.round((r.done / r.total) * 100)}%`]),
    theme: 'plain',
    styles: { fontSize: 8, cellPadding: 4, textColor: COLOR.ink, lineColor: COLOR.rule, lineWidth: 0.5 },
    headStyles: { fillColor: COLOR.ink, textColor: COLOR.white, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: COLOR.ground },
    columnStyles: { 1: { halign: 'center' }, 2: { halign: 'center' } },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 2) {
        const pct = parseInt(String(data.cell.raw).replace('%', ''), 10)
        if (pct >= 80) data.cell.styles.textColor = COLOR.ac
        else if (pct >= 40) data.cell.styles.textColor = COLOR.warn
        else data.cell.styles.textColor = COLOR.miss
        data.cell.styles.fontStyle = 'bold'
      }
    },
  })

  /* ----------------------------- Full day log ----------------------------- */
  doc.addPage()
  y = margin
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  doc.setTextColor(...COLOR.ink)
  doc.text('DAY-BY-DAY LOG', margin, y)
  y += 8

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Day', 'Date', 'Topic', 'Status', 'Hours', 'Solved', 'Contest', 'Notes']],
    body: schedule.map((d) => {
      const st = progress[d.date]
      const target = d.problems.filter((p) => !p.revisit).length
      return [
        `${d.day}`,
        d.date.slice(5),
        d.topic,
        statusLabel(st, d.date < todayIso),
        st?.hours ? st.hours.toFixed(1) : '—',
        `${st?.solved.length ?? 0}/${target}`,
        st?.contestDone ? 'Yes' : '—',
        st?.notes?.trim() || '',
      ]
    }),
    theme: 'plain',
    styles: { fontSize: 7, cellPadding: 3.5, textColor: COLOR.ink, lineColor: COLOR.rule, lineWidth: 0.4, overflow: 'linebreak' },
    headStyles: { fillColor: COLOR.ink, textColor: COLOR.white, fontStyle: 'bold', fontSize: 7.5 },
    columnStyles: {
      0: { cellWidth: 26, halign: 'center' },
      1: { cellWidth: 34 },
      2: { cellWidth: 92 },
      3: { cellWidth: 46 },
      4: { cellWidth: 32, halign: 'center' },
      5: { cellWidth: 34, halign: 'center' },
      6: { cellWidth: 36, halign: 'center' },
      7: { cellWidth: 'auto' },
    },
    didParseCell: (data) => {
      if (data.section !== 'body') return
      const d = schedule[data.row.index]
      const status = statusLabel(progress[d.date], d.date < todayIso)
      if (status === 'Done') data.cell.styles.fillColor = COLOR.acSoft
      else if (status === 'Absent') data.cell.styles.fillColor = COLOR.missSoft
      else if (status === 'Missed') data.cell.styles.fillColor = COLOR.warnSoft
      if (data.column.index === 3) {
        data.cell.styles.fontStyle = 'bold'
        data.cell.styles.textColor =
          status === 'Done' ? COLOR.ac : status === 'Absent' ? COLOR.miss : status === 'Missed' ? COLOR.warn : COLOR.muted
      }
    },
  })

  /* --------------------------------- Footer -------------------------------- */
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    const pageH = doc.internal.pageSize.getHeight()
    doc.setDrawColor(...COLOR.rule)
    doc.line(margin, pageH - 28, pageW - margin, pageH - 28)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...COLOR.muted)
    doc.text('DSA 140 · Interview Prep Tracker', margin, pageH - 16)
    doc.text(`Page ${i} of ${pageCount}`, pageW - margin, pageH - 16, { align: 'right' })
  }

  doc.save(`dsa140-report-${todayIso}.pdf`)
}
