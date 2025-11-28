<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue'
import { useRouter } from 'vitepress'
import { useExtensions, getContentRatingColor, getContentRatingBg, type Extension } from '../lib/extensions'

const router = useRouter()

const { extensions, loading, loadRepos, fetchAllExtensions } = useExtensions()

const isOpen = ref(false)
const searchQuery = ref('')
const selectedIndex = ref(0)
const searchInputRef = ref<HTMLInputElement | null>(null)

const filteredExtensions = computed(() => {
  if (!searchQuery.value.trim()) return []
  
  const query = searchQuery.value.toLowerCase()
  return extensions.value.filter(ext => {
    return ext.name.toLowerCase().includes(query) ||
      ext.metadata?.description?.toLowerCase().includes(query) ||
      ext.metadata?.badges?.some(b => b.label.toLowerCase().includes(query))
  }).slice(0, 10)
})

const open = () => {
  isOpen.value = true
  selectedIndex.value = 0
  nextTick(() => {
    searchInputRef.value?.focus()
  })
}

const close = () => {
  isOpen.value = false
  searchQuery.value = ''
  selectedIndex.value = 0
}

const selectExtension = (ext: Extension) => {
  router.go(`/extension-list?search=${encodeURIComponent(ext.name)}`)
  close()
}

const handleKeydown = (e: KeyboardEvent) => {
  if (!isOpen.value) {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'K') {
      e.preventDefault()
      open()
    }
    return
  }

  switch (e.key) {
    case 'Escape':
      e.preventDefault()
      close()
      break
    case 'ArrowDown':
      e.preventDefault()
      if (filteredExtensions.value.length > 0) {
        selectedIndex.value = Math.min(selectedIndex.value + 1, filteredExtensions.value.length - 1)
      }
      break
    case 'ArrowUp':
      e.preventDefault()
      selectedIndex.value = Math.max(selectedIndex.value - 1, 0)
      break
    case 'Enter':
      e.preventDefault()
      const selected = filteredExtensions.value[selectedIndex.value]
      if (selected) {
        selectExtension(selected)
      }
      break
  }
}

watch(searchQuery, () => {
  selectedIndex.value = 0
})

onMounted(() => {
  loadRepos()
  fetchAllExtensions(false)
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})

defineExpose({ open })
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isOpen" class="extension-search-overlay" @click.self="close">
        <div class="extension-search-modal">
          <div class="search-header">
            <div class="search-input-wrapper">
              <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input
                ref="searchInputRef"
                v-model="searchQuery"
                type="text"
                placeholder="Search extensions..."
                class="search-input"
                @keydown.stop
              />
              <kbd class="search-kbd">⇧K</kbd>
            </div>
          </div>

          <div class="search-results">
            <div v-if="loading" class="search-loading">
              <div class="spinner"></div>
              <span>Loading extensions...</span>
            </div>

            <div v-else-if="searchQuery && filteredExtensions.length === 0" class="search-empty">
              <span>No extensions found for "{{ searchQuery }}"</span>
            </div>

            <div v-else-if="!searchQuery" class="search-hint">
              <span>Type to search extensions by name, description, or tags</span>
            </div>

            <div v-else class="results-list">
              <button
                v-for="(ext, index) in filteredExtensions"
                :key="`${ext.source}-${ext.name}`"
                class="result-item"
                :class="{ selected: index === selectedIndex }"
                @click="selectExtension(ext)"
                @mouseenter="selectedIndex = index"
              >
                <img 
                  :src="ext.iconUrl" 
                  :alt="ext.name"
                  class="result-icon"
                  @error="(e) => (e.target as HTMLImageElement).src = 'https://paperback.moe/pb-placeholder.png'"
                />
                <div class="result-info">
                  <div class="result-name">
                    {{ ext.metadata?.name || ext.name }}
                    <span 
                      v-if="ext.metadata?.contentRating"
                      class="result-rating"
                      :style="{
                        color: getContentRatingColor(ext.metadata.contentRating),
                        backgroundColor: getContentRatingBg(ext.metadata.contentRating)
                      }"
                    >
                      {{ ext.metadata.contentRating }}
                    </span>
                  </div>
                  <div v-if="ext.metadata?.description" class="result-description">
                    {{ ext.metadata.description }}
                  </div>
                </div>
                <div class="result-source">
                  {{ ext.source }}
                </div>
              </button>
            </div>
          </div>

          <div class="search-footer">
            <div class="footer-hint">
              <kbd>↑</kbd><kbd>↓</kbd> to navigate
              <kbd>↵</kbd> to select
              <kbd>ESC</kbd> to close
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
