import type { ListeningRecap } from '../../shared/recap'
export const recapStyles = {
  aurora: {
    name: 'Spotlight',
    description: 'A bold headline and ranked favorites',
  },
  sunset: {
    name: 'Festival ticket',
    description: 'A perforated ticket with a listening barcode',
  },
  ink: {
    name: 'Editorial',
    description: 'A quiet magazine with generous typography',
  },
  vinyl: {
    name: 'Record sleeve',
    description: 'Vinyl grooves and a side-A track list',
  },
  dashboard: {
    name: 'Control room',
    description: 'A modular grid of listening metrics',
  },
  calendar: {
    name: 'Day by day',
    description: 'A calendar heatmap of your entire period',
  },
  orbit: {
    name: 'Orbit',
    description: 'Your media mix around a central listening total',
  },
  mixtape: {
    name: 'Mixtape',
    description: 'A cassette and handwritten-style track list',
  },
  newspaper: {
    name: 'The Listening Post',
    description: 'Columns, headlines and a daily listening report',
  },
  blueprint: {
    name: 'Signal map',
    description: 'A technical grid and listening waveform',
  },
  blocks: {
    name: 'Color blocks',
    description: 'Oversized stacked typography and geometric panels',
  },
  gallery: {
    name: 'Gallery wall',
    description: 'A collection of framed listening highlights',
  },
} as const
export type RecapStyle = keyof typeof recapStyles
export const recapPalettes = {
  ice: {
    name: 'Glacier',
    bg: '#f0f6fc',
    panel: '#e0eaf5',
    text: '#162b44',
    muted: '#506780',
    accent: '#245da8',
    second: '#75409c',
  },
  clay: {
    name: 'Terracotta',
    bg: '#f4e0d3',
    panel: '#e5c6b2',
    text: '#3c271f',
    muted: '#805c49',
    accent: '#94432d',
    second: '#496550',
  },
  slate: {
    name: 'Silver slate',
    bg: '#19212c',
    panel: '#293444',
    text: '#f2f5f9',
    muted: '#b8c6d6',
    accent: '#b6ccf5',
    second: '#b4d6c5',
  },
  matcha: {
    name: 'Matcha paper',
    bg: '#e8eddc',
    panel: '#d6ddc7',
    text: '#203427',
    muted: '#5b6b53',
    accent: '#375a3c',
    second: '#a54e2c',
  },

  mint: {
    name: 'Midnight mint',
    bg: '#10201e',
    panel: '#1b3430',
    text: '#f0fff8',
    muted: '#bbd6ce',
    accent: '#a7f3c6',
    second: '#c5b7ff',
  },
  peach: {
    name: 'Peach dusk',
    bg: '#2a1b27',
    panel: '#422a3c',
    text: '#fff3e5',
    muted: '#dcbfcd',
    accent: '#ffc096',
    second: '#efa7d3',
  },
  paper: {
    name: 'Warm paper',
    bg: '#f1e8d7',
    panel: '#e3d8c4',
    text: '#26231f',
    muted: '#655c4d',
    accent: '#843b29',
    second: '#406660',
  },
  blue: {
    name: 'Electric blue',
    bg: '#0d1839',
    panel: '#182952',
    text: '#eff5ff',
    muted: '#b4c6e3',
    accent: '#94c9ff',
    second: '#f6d987',
  },
  mono: {
    name: 'Monochrome',
    bg: '#111111',
    panel: '#262626',
    text: '#f6f3eb',
    muted: '#c3bfb5',
    accent: '#ffffff',
    second: '#a9a9a9',
  },
  plum: {
    name: 'Velvet plum',
    bg: '#25152e',
    panel: '#402547',
    text: '#fff2ff',
    muted: '#d6b6df',
    accent: '#e8b4ff',
    second: '#ffcda2',
  },
  lemon: {
    name: 'Citrus',
    bg: '#e8efb6',
    panel: '#d7e28b',
    text: '#233020',
    muted: '#536342',
    accent: '#344c23',
    second: '#9d4729',
  },
  coral: {
    name: 'Coral night',
    bg: '#241c22',
    panel: '#3d2930',
    text: '#fff5ee',
    muted: '#e0beb8',
    accent: '#ffb0a0',
    second: '#afd9e6',
  },
} as const
export type RecapPalette = keyof typeof recapPalettes
export const kindNames: Record<string, string> = {
  'music-track': 'Music',
  audiobook: 'Books',
  'podcast-episode': 'Podcasts',
  'local-file': 'Local',
  radio: 'Radio',
}
export function renderRecap(
  d: ListeningRecap,
  style: RecapStyle,
  palette: RecapPalette = 'mint',
  title = 'My listening story',
): string {
  const canvas = document.createElement('canvas')
  canvas.width = 1080
  canvas.height = 1440
  const c = canvas.getContext('2d')
  if (!c) throw Error('Image rendering is unavailable.')
  const p = recapPalettes[palette],
    W = 952,
    left = 64
  const rect = (
    x: number,
    y: number,
    w: number,
    h: number,
    color: string = p.panel,
    r = 0,
  ) => {
    c.fillStyle = color
    c.beginPath()
    c.roundRect(x, y, w, h, r)
    c.fill()
  }
  const txt = (
    s: string,
    x: number,
    y: number,
    size = 24,
    color: string = p.text,
    max = 952,
    font = 'Segoe UI',
    weight = 500,
  ) => {
    c.font = `${weight} ${size}px "${font}"`
    c.fillStyle = color
    let t = s
    while (c.measureText(t).width > max && t.length > 1)
      t = Array.from(t).slice(0, -2).join('') + '…'
    c.fillText(t, x, y)
  }
  const stroke = (
    x: number,
    y: number,
    w: number,
    h: number,
    color: string = p.muted,
  ) => {
    c.strokeStyle = color
    c.lineWidth = 1
    c.strokeRect(x, y, w, h)
  }
  const line = (y: number, x = 64, w = W) => rect(x, y, w, 1, p.muted)
  const fmt = (s: number) =>
    s < 60 ? `${Math.round(s)}s` : `${Math.floor(s / 60).toLocaleString()} min`
  const minutes =
      d.totalSeconds > 0 && d.totalSeconds < 60
        ? '<1'
        : Math.floor(d.totalSeconds / 60).toLocaleString(),
    period = `${d.start}  —  ${d.end}`
  const header = (label: string) => {
    txt('MEDIA CENTER   /   ' + label.toUpperCase(), 64, 64, 18, p.accent)
    txt(period, 64, 100, 19, p.muted)
  }
  const total = (x: number, y: number, size = 130, max = W) => {
    txt(minutes, x, y, size, p.accent, max, 'Segoe UI', 750)
    txt('MINUTES LISTENED', x, y + 40, 20, p.muted, max)
  }
  const list = (x: number, y: number, w = W, n = 5, step = 74) => {
    d.top.slice(0, n).forEach((t, i) => {
      txt(String(i + 1).padStart(2, '0'), x, y + i * step, 22, p.accent, 45)
      txt(t.title, x + 56, y + i * step, 26, p.text, w - 190, 'Segoe UI', 650)
      txt(
        t.subtitle || kindNames[t.kind],
        x + 56,
        y + i * step + 27,
        18,
        p.muted,
        w - 190,
      )
      c.textAlign = 'right'
      txt(fmt(t.seconds), x + w, y + i * step, 18, p.accent, 115)
      c.textAlign = 'left'
    })
  }
  const artists = (x: number, y: number, w = 430, n = 3) => {
    txt('ARTISTS ON REPEAT', x, y, 18, p.accent, w)
    if (!d.artists.length)
      txt('No music artists in this period', x, y + 45, 19, p.muted, w)
    d.artists.slice(0, n).forEach((a, i) => {
      txt(a.name, x, y + 48 + i * 62, 25, p.text, w - 90)
      txt(fmt(a.seconds), x, y + 72 + i * 62, 17, p.muted, w)
    })
  }
  const metric = (
    x: number,
    y: number,
    w: number,
    value: string,
    label: string,
  ) => {
    rect(x, y, w, 115, p.panel, 16)
    txt(value, x + 22, y + 52, 38, p.accent, w - 44, 'Segoe UI', 700)
    txt(label, x + 22, y + 87, 18, p.muted, w - 44)
  }
  const metrics = (y: number) => {
    metric(64, y, 304, String(d.activeDays), 'active days')
    metric(388, y, 304, String(d.uniqueItems), 'different listens')
    metric(712, y, 304, String(d.longestStreak), 'day longest streak')
  }
  const chart = (x: number, y: number, w: number, h: number) => {
    const count = Math.min(90, d.calendarDays),
      buckets = Array(count).fill(0)
    for (const day of d.days) {
      const i = Math.min(
        count - 1,
        Math.floor(
          ((Date.parse(day.day) - Date.parse(d.start)) /
            86400000 /
            d.calendarDays) *
            count,
        ),
      )
      buckets[i] += day.seconds
    }
    const max = Math.max(...buckets, 1),
      bw = w / count
    for (let i = 0; i < count; i++)
      rect(
        x + i * bw,
        y + h - Math.max(2, (buckets[i] / max) * h),
        Math.max(1, bw - 3),
        Math.max(2, (buckets[i] / max) * h),
        i % 2 ? p.second : p.accent,
        2,
      )
  }
  const mix = (x: number, y: number, w = W) => {
    txt('HOW YOU LISTENED', x, y, 18, p.accent, w)
    let off = x
    d.kinds.forEach((k, i) => {
      const size = (w * k.seconds) / Math.max(1, d.totalSeconds)
      rect(off, y + 23, size, 14, [p.accent, p.second, p.muted, p.text][i % 4])
      off += size
    })
    txt(
      d.kinds
        .map(
          (k) =>
            `${kindNames[k.kind] ?? k.kind} ${Math.round((k.seconds / Math.max(1, d.totalSeconds)) * 100)}%`,
        )
        .join(' · '),
      x,
      y + 70,
      20,
      p.muted,
      w,
    )
  }
  const comparison = (x: number, y: number, w = W) => {
    const change = d.comparison.changePercent
    txt(
      change === null
        ? 'Your story starts here'
        : `${change >= 0 ? '+' : ''}${Math.round(change)}% vs. the previous period`,
      x,
      y,
      27,
      p.accent,
      w,
    )
    txt(
      `${fmt(d.averageSeconds)} per calendar day · ${d.finishedBooks} books & ${d.finishedEpisodes} episodes finished`,
      x,
      y + 37,
      20,
      p.muted,
      w,
    )
  }
  const circle = (x: number, y: number, r: number, color: string) => {
    c.fillStyle = color
    c.beginPath()
    c.arc(x, y, r, 0, Math.PI * 2)
    c.fill()
  }
  rect(0, 0, 1080, 1440, p.bg)
  if (style === 'aurora') {
    header('Spotlight')
    txt(title, 64, 206, 66, p.text, W, 'Georgia')
    total(58, 392, 148)
    metrics(470)
    txt('THE LISTENS THAT DEFINED IT', 64, 658, 20, p.accent)
    list(64, 718)
    chart(64, 1090, W, 100)
    mix(64, 1230)
    comparison(64, 1330)
  } else if (style === 'sunset') {
    rect(44, 38, 992, 1360, p.panel, 36)
    stroke(70, 70, 940, 1300)
    header('Admit one / listening festival')
    txt(title, 88, 213, 68, p.text, 880, 'Georgia')
    total(88, 390, 148, 850)
    txt(
      `${d.activeDays} DAYS   /   ${d.uniqueItems} LISTENS   /   ${d.longestStreak} DAY STREAK`,
      88,
      492,
      24,
      p.text,
      880,
    )
    c.setLineDash([12, 10])
    c.strokeStyle = p.muted
    c.beginPath()
    c.moveTo(44, 555)
    c.lineTo(1036, 555)
    c.stroke()
    c.setLineDash([])
    circle(44, 555, 22, p.bg)
    circle(1036, 555, 22, p.bg)
    txt('YOUR HEADLINERS', 88, 621, 22, p.accent)
    list(88, 679, 904, 5, 76)
    comparison(88, 1100, 904)
    for (let i = 0; i < 90; i++)
      rect(88 + i * 10, 1210, 2 + (i % 4), 90 - (i % 3) * 8, p.text)
    txt('KEEP THIS MOMENT', 88, 1342, 20, p.muted)
  } else if (style === 'ink') {
    header('Volume 01 / editorial')
    line(127)
    txt(title, 64, 245, 79, p.text, W, 'Georgia')
    txt('A collection of time, spent well.', 64, 300, 29, p.muted, W, 'Georgia')
    total(64, 498, 166)
    line(575)
    txt(`${d.activeDays} active days`, 64, 640, 35)
    txt(`${d.longestStreak} day streak`, 585, 640, 35)
    txt('On repeat', 64, 744, 40, p.accent, W, 'Georgia')
    list(64, 808, W, 4, 83)
    mix(64, 1160)
    comparison(64, 1290)
  } else if (style === 'vinyl') {
    header('The record sleeve')
    txt(title, 64, 180, 55, p.text, W, 'Georgia')
    circle(540, 490, 276, p.text)
    for (let r = 90; r < 270; r += 9) {
      c.beginPath()
      c.arc(540, 490, r, 0, Math.PI * 2)
      c.strokeStyle = p.bg
      c.lineWidth = 2
      c.stroke()
    }
    circle(540, 490, 100, p.accent)
    circle(540, 490, 12, p.bg)
    c.textAlign = 'center'
    txt(minutes, 540, 475, 43, p.bg, 180, 'Segoe UI', 750)
    txt('MINUTES', 540, 517, 19, p.bg, 170)
    c.textAlign = 'left'
    txt('SIDE A / YOUR FAVORITES', 64, 824, 21, p.accent)
    list(64, 880, W, 4, 73)
    line(1170)
    txt(
      `${d.activeDays} active days · ${d.uniqueItems} listens · ${d.longestStreak} day streak`,
      64,
      1225,
      25,
      p.text,
    )
    comparison(64, 1310)
  } else if (style === 'dashboard') {
    header('Control room')
    txt(title, 64, 194, 58, p.text, W)
    rect(64, 238, 596, 280, p.panel, 24)
    total(92, 408, 135, 530)
    metric(680, 238, 336, String(d.activeDays), 'active days')
    metric(680, 376, 336, String(d.uniqueItems), 'different listens')
    metric(64, 544, 304, String(d.longestStreak), 'day longest streak')
    metric(388, 544, 304, fmt(d.averageSeconds), 'average per day')
    metric(
      712,
      544,
      304,
      String(d.finishedBooks + d.finishedEpisodes),
      'books & episodes finished',
    )
    rect(64, 686, W, 230, p.panel, 20)
    txt('DAILY SIGNAL', 88, 724, 18, p.accent)
    chart(88, 752, 904, 132)
    txt('TOP LISTENS', 64, 968, 18, p.accent)
    list(64, 1020, 565, 3, 80)
    artists(680, 968, 336, 3)
    comparison(64, 1320)
  } else if (style === 'calendar') {
    header('Day by day')
    txt(title, 64, 196, 62, p.text, W, 'Georgia')
    total(64, 350, 110)
    txt('Every square holds a little of your time.', 64, 440, 25, p.muted)
    const cells = Math.min(364, d.calendarDays),
      cols = cells <= 60 ? 7 : 14,
      rows = Math.ceil(cells / cols),
      step = W / cols,
      cell = Math.min(115, 620 / rows),
      max = Math.max(...d.days.map((v) => v.seconds), 1),
      values = new Map(d.days.map((v) => [v.day, v.seconds]))
    for (let i = 0; i < cells; i++) {
      const day = new Date(Date.parse(d.start) + i * 86400000)
          .toISOString()
          .slice(0, 10),
        v = values.get(day) || 0,
        x = 64 + (i % cols) * step,
        y = 480 + Math.floor(i / cols) * cell
      rect(x, y, step - 8, Math.max(4, cell - 8), v ? p.accent : p.panel, 8)
      if (v) {
        c.globalAlpha = 1 - (v / max) * 0.8
        rect(x, y, step - 8, Math.max(4, cell - 8), p.bg, 8)
        c.globalAlpha = 1
      }
      if (cells <= 60) {
        txt(day.slice(5), x + 12, y + 28, 18, v / max > 0.55 ? p.bg : p.muted, step - 24)
        txt(fmt(v), x + 12, y + cell - 28, 21, v / max > 0.55 ? p.bg : p.text, step - 24)
      }
    }
    txt(
      d.calendarDays > 364
        ? 'First 364 days shown; totals cover your whole period.'
        : `${d.start} to ${d.end} · lighter squares mean more listening`,
      64,
      1137,
      18,
      p.muted,
    )
    metrics(1170)
    comparison(64, 1330)
  } else if (style === 'orbit') {
    header('Orbit')
    txt(title, 64, 191, 63, p.text, W, 'Georgia')
    let angle = -Math.PI / 2
    d.kinds.forEach((k, i) => {
      const end =
        angle + (k.seconds / Math.max(1, d.totalSeconds)) * Math.PI * 2
      c.beginPath()
      c.arc(540, 525, 255, angle, end)
      c.lineWidth = 65
      c.strokeStyle = [p.accent, p.second, p.muted, p.text][i % 4]
      c.stroke()
      angle = end
    })
    c.textAlign = 'center'
    txt(minutes, 540, 530, 105, p.text, 420, 'Segoe UI', 750)
    txt('MINUTES IN YOUR ORBIT', 540, 582, 18, p.muted, 420)
    c.textAlign = 'left'
    mix(64, 869)
    metrics(980)
    artists(64, 1160, 440, 2)
    txt('LONGEST LISTENING STREAK', 585, 1160, 18, p.accent, 430)
    txt(`${d.longestStreak} days`, 585, 1243, 65, p.text, 430)
    txt(
      `${d.activeDays} of ${d.calendarDays} days active`,
      585,
      1290,
      23,
      p.muted,
      430,
    )
  } else if (style === 'mixtape') {
    header('Personal mixtape')
    txt(title, 64, 191, 65, p.text, W, 'Georgia')
    rect(64, 238, W, 464, p.panel, 44)
    rect(94, 268, 892, 175, p.accent, 12)
    txt('SIDE A', 118, 317, 22, p.bg)
    txt(`${minutes} minutes, just for me`, 118, 403, 49, p.bg, 836, 'Georgia')
    rect(157, 477, 766, 141, p.bg, 70)
    circle(269, 547, 48, p.muted)
    circle(811, 547, 48, p.muted)
    rect(360, 525, 360, 42, p.second, 4)
    txt('DO NOT ERASE', 424, 673, 18, p.muted)
    txt('THE TRACK LIST', 64, 780, 22, p.accent)
    list(64, 839, W, 5, 77)
    comparison(64, 1280)
  } else if (style === 'newspaper') {
    txt('THE LISTENING POST', 64, 145, 78, p.text, W, 'Georgia', 700)
    line(173)
    txt(period, 64, 211, 20, p.muted)
    txt('PERSONAL EDITION', 765, 211, 20, p.accent, 250)
    line(236)
    txt(title, 64, 328, 58, p.text, W, 'Georgia')
    total(64, 514, 148)
    txt('minutes shape a story.', 64, 611, 48, p.text, W, 'Georgia')
    line(650)
    txt('MOST LISTENED', 64, 706, 20, p.accent)
    list(64, 764, 610, 5, 92)
    stroke(710, 690, 1, 532)
    artists(744, 706, 272, 4)
    txt(`${d.activeDays} active days`, 744, 1060, 29, p.text, 272)
    txt(`${d.longestStreak} day streak`, 744, 1110, 29, p.text, 272)
    line(1240)
    comparison(64, 1300)
  } else if (style === 'blueprint') {
    for (let x = 0; x < 1080; x += 36) rect(x, 0, 1, 1440, p.panel)
    for (let y = 0; y < 1440; y += 36) rect(0, y, 1080, 1, p.panel)
    header('Signal map / personal telemetry')
    txt(title, 64, 210, 54, p.text, W, 'Consolas')
    total(64, 390, 135)
    stroke(64, 487, W, 282, p.accent)
    txt('01 / LISTENING SIGNAL', 88, 530, 19, p.accent)
    chart(88, 560, 904, 176)
    metrics(810)
    txt('02 / DOMINANT FREQUENCIES', 64, 990, 20, p.accent)
    list(64, 1048, W, 3, 77)
    comparison(64, 1320)
  } else if (style === 'blocks') {
    rect(0, 0, 1080, 490, p.accent)
    txt('MEDIA CENTER / PERSONAL EDITION', 64, 76, 19, p.bg)
    txt(title, 64, 190, 67, p.bg, W, 'Segoe UI', 750)
    txt(minutes, 56, 377, 175, p.bg, W, 'Segoe UI', 850)
    txt('MINUTES', 64, 446, 28, p.bg)
    rect(0, 490, 540, 235, p.second)
    txt(String(d.activeDays), 64, 622, 100, p.bg, 430, 'Segoe UI', 750)
    txt('ACTIVE DAYS', 64, 685, 22, p.bg, 430)
    rect(540, 490, 540, 235, p.text)
    txt(String(d.uniqueItems), 594, 622, 100, p.bg, 430, 'Segoe UI', 750)
    txt('DIFFERENT LISTENS', 594, 685, 22, p.bg, 430)
    txt('YOUR ESSENTIALS', 64, 793, 22, p.accent)
    list(64, 852, W, 5, 78)
    comparison(64, 1310)
  } else {
    header('Gallery wall')
    txt(title, 64, 190, 64, p.text, W, 'Georgia')
    rect(64, 239, 550, 360, p.panel)
    stroke(84, 259, 510, 320, p.accent)
    total(110, 446, 117, 460)
    rect(640, 239, 376, 360, p.accent)
    txt(String(d.activeDays), 676, 402, 113, p.bg, 300)
    txt('DAYS IN COLOR', 676, 466, 23, p.bg, 300)
    rect(64, 625, 400, 365, p.second)
    txt(String(d.longestStreak), 96, 762, 101, p.bg, 320)
    txt('DAY STREAK', 96, 816, 23, p.bg, 320)
    txt(`${d.uniqueItems} different listens`, 96, 924, 24, p.bg, 320)
    rect(490, 625, 526, 365, p.panel)
    artists(518, 673, 465, 3)
    txt('THE CENTERPIECE', 64, 1060, 20, p.accent)
    list(64, 1120, W, 2, 85)
    comparison(64, 1320)
  }
  txt('MEDIA CENTER · Recorded on this device', 64, 1412, 15, p.muted, W)
  return canvas.toDataURL('image/png')
}
