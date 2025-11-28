<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import {
  type Extension,
  getContentRatingColor,
  getContentRatingBg
} from '../lib/extensions'

interface Props {
  extension: Extension | null
  show: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  hide: []
  install: [extension: Extension]
}>()

const detailsContainer = ref<HTMLElement | null>(null)
const windowWidth = ref(1024) // Default desktop width

const isMobile = computed(() => windowWidth.value < 768)

const handleResize = () => {
  windowWidth.value = window.innerWidth
}

const handleScroll = (event: Event) => {
  if (!isMobile.value) return // Only handle scroll on mobile
  
  const target = event.target as HTMLElement
  if (target.scrollTop < -50) {
    emit('hide')
  }
}

const handleInstall = () => {
  if (props.extension) {
    emit('install', props.extension)
  }
}

onMounted(() => {
  windowWidth.value = window.innerWidth
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<template>
  <div
    v-if="show && extension"
    class="details-overlay"
    :class="{ 'desktop': !isMobile }"
    @click="$emit('hide')"
  >
    <div
      ref="detailsContainer"
      class="details-container"
      :class="{ 'desktop': !isMobile }"
      @click.stop
      @scroll="handleScroll"
    >
      <!-- Mobile handle bar -->
      <div
        v-if="isMobile"
        class="details-handle"
      >
        <div class="handle-bar" />
      </div>

      <!-- Desktop close button -->
      <button
        v-else
        class="details-close-btn"
        @click="$emit('hide')"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <line
            x1="18"
            y1="6"
            x2="6"
            y2="18"
          />
          <line
            x1="6"
            y1="6"
            x2="18"
            y2="18"
          />
        </svg>
      </button>

      <div
        class="details-content"
        :class="{ 'desktop': !isMobile }"
      >
        <div class="details-header">
          <img
            :src="extension.iconUrl"
            :alt="`${extension.name} icon`"
            class="details-icon"
            @error="(e) => (e.target as HTMLImageElement).src = 'https://paperback.moe/pb-placeholder.png'"
          >
          <div class="details-header-text">
            <h2 class="details-title">
              {{ extension.name }}
            </h2>
            <span
              class="details-source-badge"
              :class="extension.source"
            >
              {{ extension.source === 'inkdex' ? 'Inkdex' : extension.repoId || extension.source }}
            </span>
          </div>
        </div>

        <div
          v-if="extension.metadata"
          class="details-meta"
        >
          <div class="details-section">
            <h3>Content Rating</h3>
            <span
              class="details-rating-badge"
              :style="{
                color: getContentRatingColor(extension.metadata.contentRating),
                backgroundColor: getContentRatingBg(extension.metadata.contentRating)
              }"
            >
              {{ extension.metadata.contentRating }}
            </span>
          </div>

          <div
            v-if="extension.metadata.language"
            class="details-section"
          >
            <h3>Language</h3>
            <span class="details-language-badge">{{ extension.metadata.language }}</span>
          </div>

          <div
            v-if="extension.metadata.version"
            class="details-section"
          >
            <h3>Version</h3>
            <span class="details-version-badge">{{ extension.metadata.version }}</span>
          </div>

          <div
            v-if="extension.metadata.badges && extension.metadata.badges.length > 0"
            class="details-section"
          >
            <h3>Tags</h3>
            <div class="details-badges">
              <span
                v-for="badge in extension.metadata.badges"
                :key="badge.label"
                class="details-genre-badge"
                :style="{
                  color: badge.textColor,
                  backgroundColor: badge.backgroundColor
                }"
              >
                {{ badge.label }}
              </span>
            </div>
          </div>

          <div
            v-if="extension.metadata.developers && extension.metadata.developers.length > 0"
            class="details-section"
          >
            <h3>Developers</h3>
            <div class="details-developers">
              <div
                v-for="dev in extension.metadata.developers"
                :key="dev.name"
                class="details-developer"
              >
                <span class="dev-name">{{ dev.name }}</span>
                <a
                  v-if="dev.github"
                  :href="dev.github"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="dev-link"
                >
                  GitHub
                </a>
                <a
                  v-if="dev.website"
                  :href="dev.website"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="dev-link"
                >
                  Website
                </a>
              </div>
            </div>
          </div>
        </div>

        <div
          v-if="extension.metadata?.description"
          class="details-description"
        >
          <h3>Description</h3>
          <p>{{ extension.metadata.description }}</p>
        </div>

        <div class="details-actions">
          <button
            class="details-install-btn"
            @click="handleInstall"
          >
            Install Extension
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

