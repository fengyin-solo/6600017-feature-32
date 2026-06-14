import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { STARS, CONSTELLATIONS } from '../data/stars'
import type { Star } from '../types'

export const SPECTRAL_TYPES = ['O', 'B', 'A', 'F', 'G', 'K', 'M'] as const
export type SpectralType = typeof SPECTRAL_TYPES[number]

export const SPECTRAL_INFO: Record<SpectralType, { color: string; name: string; desc: string; temp: string }> = {
  'O': { color: '#9bb0ff', name: 'O 型星', desc: '蓝超巨星，温度最高，质量最大', temp: '30,000K+' },
  'B': { color: '#aabfff', name: 'B 型星', desc: '蓝巨星，炽热明亮', temp: '10,000-30,000K' },
  'A': { color: '#cad7ff', name: 'A 型星', desc: '蓝白星，氢线最强', temp: '7,500-10,000K' },
  'F': { color: '#f8f7ff', name: 'F 型星', desc: '黄白星，金属线开始显现', temp: '6,000-7,500K' },
  'G': { color: '#fff4ea', name: 'G 型星', desc: '黄星，太阳即属于此类', temp: '5,000-6,000K' },
  'K': { color: '#ffd2a1', name: 'K 型星', desc: '橙星，温度较低', temp: '3,500-5,000K' },
  'M': { color: '#ffcc6f', name: 'M 型星', desc: '红矮星/红巨星，温度最低', temp: '2,500-3,500K' }
}

export const useSkyStore = defineStore('sky', () => {
  const viewDate = ref(new Date())
  const zoom = ref(1.0)
  const panX = ref(0)
  const panY = ref(0)
  const showLabels = ref(true)
  const showConstLines = ref(true)
  const showGrid = ref(true)
  const selectedStar = ref<Star | null>(null)
  const searchQuery = ref('')
  const latitude = ref(39.9) // Beijing default
  const spectralFilter = ref<SpectralType | 'ALL'>('ALL')

  const localSiderealTime = computed(() => {
    const d = viewDate.value
    const jd = d.getTime() / 86400000 + 2440587.5
    const T = (jd - 2451545.0) / 36525.0
    let lst = 280.46061837 + 360.98564736629 * (jd - 2451545.0) + T * T * (0.000387933 - T / 38710000)
    lst = ((lst % 360) + 360) % 360
    return lst / 15 // convert to hours
  })

  const filteredStars = computed(() => {
    let stars = STARS
    if (spectralFilter.value !== 'ALL') {
      stars = stars.filter(s => s.spectral === spectralFilter.value)
    }
    if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase()
      stars = stars.filter(s => s.name.toLowerCase().includes(q))
    }
    return stars.slice(0, 5)
  })

  const visibleStars = computed(() => {
    if (spectralFilter.value === 'ALL') return STARS
    return STARS.filter(s => s.spectral === spectralFilter.value)
  })

  function projectStar(ra: number, dec: number, cx: number, cy: number, scale: number): [number, number] {
    const ha = (localSiderealTime.value - ra) * 15 * Math.PI / 180
    const decRad = dec * Math.PI / 180
    const latRad = latitude.value * Math.PI / 180

    const alt = Math.asin(Math.sin(decRad) * Math.sin(latRad) + Math.cos(decRad) * Math.cos(latRad) * Math.cos(ha))
    const az = Math.atan2(-Math.cos(decRad) * Math.sin(ha), Math.sin(decRad) * Math.cos(latRad) - Math.cos(decRad) * Math.sin(latRad) * Math.cos(ha))

    if (alt < -0.1) return [-999, -999] // below horizon

    const r = (Math.PI / 2 - alt) * scale * 0.45
    const x = cx + panX.value + r * Math.sin(az)
    const y = cy + panY.value - r * Math.cos(az)
    return [x, y]
  }

  function starRadius(mag: number): number {
    return Math.max(1, 5 - mag) * zoom.value
  }

  function spectralColor(spectral: string): string {
    const colors: Record<string, string> = {
      'O': '#9bb0ff', 'B': '#aabfff', 'A': '#cad7ff',
      'F': '#f8f7ff', 'G': '#fff4ea', 'K': '#ffd2a1', 'M': '#ffcc6f'
    }
    return colors[spectral] || '#ffffff'
  }

  function selectStar(x: number, y: number, cx: number, cy: number, scale: number) {
    let closest: Star | null = null
    let minDist = 20
    for (const star of visibleStars.value) {
      const [sx, sy] = projectStar(star.ra, star.dec, cx, cy, scale)
      const dist = Math.hypot(sx - x, sy - y)
      if (dist < minDist) { minDist = dist; closest = star }
    }
    selectedStar.value = closest
  }

  return {
    viewDate, zoom, panX, panY, showLabels, showConstLines, showGrid,
    selectedStar, searchQuery, latitude, localSiderealTime, filteredStars,
    spectralFilter, visibleStars,
    projectStar, starRadius, spectralColor, selectStar,
    STARS, CONSTELLATIONS, SPECTRAL_TYPES, SPECTRAL_INFO
  }
})
