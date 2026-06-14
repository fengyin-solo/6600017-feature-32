<template>
  <div class="flex h-screen">
    <!-- Sidebar -->
    <div class="w-72 bg-gray-900 p-4 flex flex-col gap-4 overflow-y-auto">
      <h1 class="text-xl font-bold text-blue-400">天文星图渲染器</h1>

      <!-- Search -->
      <div>
        <input v-model="store.searchQuery" placeholder="搜索天体..." class="w-full bg-gray-800 rounded px-3 py-2 text-sm" />
        <div v-if="store.filteredStars.length" class="mt-1">
          <div v-for="s in store.filteredStars" :key="s.name"
            @click="store.selectedStar = s"
            class="bg-gray-800 p-2 rounded mt-1 cursor-pointer hover:bg-gray-700 text-sm flex items-center gap-2">
            <span class="w-2 h-2 rounded-full" :style="{ backgroundColor: store.spectralColor(s.spectral) }"></span>
            <span>{{ s.name }}</span>
            <span class="text-gray-400 ml-auto">mag {{ s.mag }}</span>
          </div>
        </div>
      </div>

      <!-- Spectral Filter -->
      <div>
        <label class="text-gray-400 text-xs mb-2 block">光谱类型筛选</label>
        <div class="flex flex-wrap gap-1">
          <button
            @click="store.spectralFilter = 'ALL'"
            :class="[
              'px-2 py-1 text-xs rounded transition-colors',
              store.spectralFilter === 'ALL' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            ]">
            全部
          </button>
          <button
            v-for="type in store.SPECTRAL_TYPES"
            :key="type"
            @click="store.spectralFilter = type"
            :class="[
              'px-2 py-1 text-xs rounded flex items-center gap-1 transition-colors',
              store.spectralFilter === type ? 'ring-2 ring-blue-400' : ''
            ]"
            :style="{ backgroundColor: store.SPECTRAL_INFO[type].color + '33', color: store.SPECTRAL_INFO[type].color }">
            <span class="w-2 h-2 rounded-full" :style="{ backgroundColor: store.SPECTRAL_INFO[type].color }"></span>
            {{ type }}
          </button>
        </div>
      </div>

      <!-- Time Travel -->
      <div>
        <label class="text-gray-400 text-xs">时间旅行</label>
        <input type="datetime-local" v-model="dateStr" @input="updateDate"
          class="w-full bg-gray-800 rounded px-3 py-2 text-sm" />
      </div>

      <!-- Location -->
      <div>
        <label class="text-gray-400 text-xs">纬度: {{ store.latitude.toFixed(1) }}°</label>
        <input type="range" v-model.number="store.latitude" min="-90" max="90" step="0.1" class="w-full" />
      </div>

      <!-- Zoom -->
      <div>
        <label class="text-gray-400 text-xs">缩放: {{ store.zoom.toFixed(1) }}x</label>
        <input type="range" v-model.number="store.zoom" min="0.3" max="3" step="0.1" class="w-full" />
      </div>

      <!-- Toggles -->
      <div class="flex flex-col gap-2">
        <label class="flex items-center gap-2 text-sm">
          <input type="checkbox" v-model="store.showLabels" /> 星名标签
        </label>
        <label class="flex items-center gap-2 text-sm">
          <input type="checkbox" v-model="store.showConstLines" /> 星座连线
        </label>
        <label class="flex items-center gap-2 text-sm">
          <input type="checkbox" v-model="store.showGrid" /> 坐标网格
        </label>
      </div>

      <!-- Star Info -->
      <div v-if="store.selectedStar" class="bg-gray-800 rounded-xl p-3">
        <h3 class="text-amber-400 font-bold">{{ store.selectedStar.name }}</h3>
        <div class="text-xs text-gray-300 mt-2 space-y-1">
          <p>赤经: {{ store.selectedStar.ra.toFixed(2) }}h</p>
          <p>赤纬: {{ store.selectedStar.dec.toFixed(2) }}°</p>
          <p>视星等: {{ store.selectedStar.mag }}</p>
          <div class="flex items-center gap-2">
            <span>光谱型:</span>
            <span
              class="w-4 h-4 rounded-full"
              :style="{ backgroundColor: store.spectralColor(store.selectedStar.spectral) }"></span>
            <span>{{ store.selectedStar.spectral }}</span>
          </div>
        </div>
        <div
          v-if="store.SPECTRAL_INFO[store.selectedStar.spectral as keyof typeof store.SPECTRAL_INFO]"
          class="mt-3 pt-3 border-t border-gray-700">
          <div class="flex items-center gap-2 mb-2">
            <span
              class="w-3 h-3 rounded-full"
              :style="{ backgroundColor: store.SPECTRAL_INFO[store.selectedStar.spectral as keyof typeof store.SPECTRAL_INFO].color }"></span>
            <span class="text-sm font-semibold"
              :style="{ color: store.SPECTRAL_INFO[store.selectedStar.spectral as keyof typeof store.SPECTRAL_INFO].color }">
              {{ store.SPECTRAL_INFO[store.selectedStar.spectral as keyof typeof store.SPECTRAL_INFO].name }}
            </span>
          </div>
          <p class="text-xs text-gray-400 mb-1">
            {{ store.SPECTRAL_INFO[store.selectedStar.spectral as keyof typeof store.SPECTRAL_INFO].desc }}
          </p>
          <p class="text-xs text-gray-500">
            表面温度: {{ store.SPECTRAL_INFO[store.selectedStar.spectral as keyof typeof store.SPECTRAL_INFO].temp }}
          </p>
        </div>
      </div>

      <!-- Spectral Legend -->
      <div class="text-xs">
        <h4 class="text-gray-400 mb-2">光谱类型说明</h4>
        <div class="space-y-1">
          <div
            v-for="type in store.SPECTRAL_TYPES"
            :key="type"
            class="flex items-center gap-2 text-gray-300">
            <span
              class="w-3 h-3 rounded-full flex-shrink-0"
              :style="{ backgroundColor: store.SPECTRAL_INFO[type].color }"></span>
            <span class="font-mono" :style="{ color: store.SPECTRAL_INFO[type].color }">{{ type }}</span>
            <span class="text-gray-500 text-xs">{{ store.SPECTRAL_INFO[type].temp }}</span>
          </div>
        </div>
      </div>

      <!-- Constellation list -->
      <div class="text-xs">
        <h4 class="text-gray-400 mb-1">可见星座</h4>
        <div v-for="c in store.CONSTELLATIONS" :key="c.name" class="py-1 text-gray-300">
          {{ c.nameCn }} <span class="text-gray-500">({{ c.name }})</span>
        </div>
      </div>

      <div class="text-xs text-gray-500 mt-auto">
        LST: {{ store.localSiderealTime.toFixed(2) }}h
      </div>
    </div>

    <!-- Sky Canvas -->
    <div class="flex-1 relative">
      <StarCanvas />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useSkyStore } from './store/sky'
import StarCanvas from './components/StarCanvas.vue'

const store = useSkyStore()
const dateStr = ref(new Date().toISOString().slice(0, 16))
function updateDate() { store.viewDate = new Date(dateStr.value) }
</script>
