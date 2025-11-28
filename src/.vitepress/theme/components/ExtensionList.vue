<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import ExtensionDetails from './ExtensionDetails.vue'
import './ExtensionList.css'
import {
  useExtensions,
  getContentRatingColor,
  getContentRatingBg,
  buildBaseUrl,
  saveCustomRepos as saveRepos,
  type Extension
} from '../lib/extensions'

const {
  extensions,
  loading,
  error,
  customRepos,
  loadRepos,
  fetchAllExtensions,
  addCustomRepo: addRepo,
  removeCustomRepo: removeRepo
} = useExtensions()

const searchQuery = ref('')
const selectedRatings = ref<Set<string>>(new Set())
const selectedExtensions = ref<Set<string>>(new Set())
const selectedExtension = ref<Extension | null>(null)
const showDetails = ref(false)
const showRepoManager = ref(false)
const newRepoUrl = ref('')
const selectedSources = ref<Set<string>>(new Set())
const checkingRepo = ref(false)
const selectedLanguages = ref<Set<string>>(new Set())
const selectedGenres = ref<Set<string>>(new Set())
const filtersExpanded = ref(false)

const availableRatings = ['SAFE', 'MATURE', 'ADULT']

const showNSFW = computed(() => {
  return selectedRatings.value.has('MATURE') || selectedRatings.value.has('ADULT')
})

const availableSources = computed(() => {
  const sources = ['inkdex']
  customRepos.value.forEach(repo => {
    sources.push(repo.id)
  })
  return sources
})

const getSourceDisplayName = (sourceId: string) => {
  if (sourceId === 'inkdex') return 'Inkdex'
  const repo = customRepos.value.find(r => r.id === sourceId)
  return repo?.displayName || sourceId
}

const availableLanguages = computed(() => {
  const languages = new Set<string>()
  extensions.value.forEach(ext => {
    if (ext.metadata?.language) {
      languages.add(ext.metadata.language)
    }
  })
  return Array.from(languages).sort()
})

const availableGenres = computed(() => {
  const genres = new Set<string>()
  extensions.value.forEach(ext => {
    if (ext.metadata?.badges) {
      ext.metadata.badges.forEach(badge => {
        genres.add(badge.label)
      })
    }
  })
  return Array.from(genres).sort()
})

const filteredExtensions = computed(() => {
  return extensions.value.filter(extension => {
    const matchesSearch = searchQuery.value === '' ||
      extension.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      extension.source.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      (extension.metadata?.description && extension.metadata.description.toLowerCase().includes(searchQuery.value.toLowerCase())) ||
      (extension.metadata?.badges && extension.metadata.badges.some(badge =>
        badge.label.toLowerCase().includes(searchQuery.value.toLowerCase())
      ))

    const matchesRating = selectedRatings.value.size === 0 ||
      (extension.metadata?.contentRating && selectedRatings.value.has(extension.metadata.contentRating))

    const matchesSource = selectedSources.value.size === 0 ||
      selectedSources.value.has(extension.source)

    const matchesLanguage = selectedLanguages.value.size === 0 ||
      (extension.metadata?.language && selectedLanguages.value.has(extension.metadata.language))

    const matchesGenre = selectedGenres.value.size === 0 ||
      (extension.metadata?.badges && extension.metadata.badges.some(badge =>
        selectedGenres.value.has(badge.label)
      ))

    return matchesSearch && matchesRating && matchesSource && matchesLanguage && matchesGenre
  })
})

const toggleLanguage = (language: string) => {
  if (selectedLanguages.value.has(language)) {
    selectedLanguages.value.delete(language)
  } else {
    selectedLanguages.value.add(language)
  }
  selectedLanguages.value = new Set(selectedLanguages.value)
}

const toggleGenre = (genre: string) => {
  if (selectedGenres.value.has(genre)) {
    selectedGenres.value.delete(genre)
  } else {
    selectedGenres.value.add(genre)
  }
  selectedGenres.value = new Set(selectedGenres.value)
}

const toggleSource = (source: string) => {
  if (selectedSources.value.has(source)) {
    selectedSources.value.delete(source)
  } else {
    selectedSources.value.add(source)
  }
  selectedSources.value = new Set(selectedSources.value)
}

const toggleRating = (rating: string) => {
  if (selectedRatings.value.has(rating)) {
    selectedRatings.value.delete(rating)
  } else {
    selectedRatings.value.add(rating)
  }
  selectedRatings.value = new Set(selectedRatings.value)
}

const clearAllFilters = () => {
  selectedLanguages.value = new Set()
  selectedGenres.value = new Set()
  selectedSources.value = new Set()
  selectedRatings.value = new Set()
}

const clearSearch = () => {
  searchQuery.value = ''
  selectedRatings.value = new Set()
  selectedSources.value = new Set()
  selectedLanguages.value = new Set()
  selectedGenres.value = new Set()
}

const toggleExtension = (extension: Extension) => {
  const key = `${extension.source}-${extension.name}`
  if (selectedExtensions.value.has(key)) {
    selectedExtensions.value.delete(key)
  } else {
    selectedExtensions.value.add(key)
  }
}

const getBaseUrl = (source: string) => {
  if (source === 'inkdex') {
    return 'https://raw.githubusercontent.com/inkdex/extensions/master/0.9/stable'
  }
  const repo = customRepos.value.find(r => r.id === source)
  if (repo) {
    return buildBaseUrl(repo)
  }
  return ''
}

const installSelectedExtensions = () => {
  if (selectedExtensions.value.size === 0) {
    alert('Please select at least one extension')
    return
  }
  
  const extensionsToInstall = Array.from(selectedExtensions.value).map(key => {
    const extension = extensions.value.find(ext => `${ext.source}-${ext.name}` === key)
    if (!extension) return null
    return [extension.name, getBaseUrl(extension.source)]
  }).filter(Boolean)
  
  const installUrl = `paperback://installExtensions?data=${btoa(JSON.stringify(extensionsToInstall))}`
  window.location.href = installUrl
}

const installExtension = (extension: Extension) => {
  const extensionToInstall = [extension.name, getBaseUrl(extension.source)]
  const installUrl = `paperback://installExtensions?data=${btoa(JSON.stringify([extensionToInstall]))}`
  window.location.href = installUrl
}

const showExtensionDetails = (extension: Extension) => {
  selectedExtension.value = extension
  showDetails.value = true
}

const hideExtensionDetails = () => {
  showDetails.value = false
  selectedExtension.value = null
}

const addCustomRepo = async () => {
  if (!newRepoUrl.value.trim()) {
    alert('Please enter a repository URL')
    return
  }

  checkingRepo.value = true

  try {
    const result = await addRepo(newRepoUrl.value)
    
    if (!result.success) {
      alert(result.error)
      return
    }
    
    newRepoUrl.value = ''
    loading.value = true
    await fetchAllExtensions()
    
  } catch (e) {
    alert('An error occurred while adding the repository')
    console.error(e)
  } finally {
    checkingRepo.value = false
  }
}

const removeCustomRepo = async (repoId: string) => {
  removeRepo(repoId)
  loading.value = true
  await fetchAllExtensions()
}

const handleAddRepoFromUrl = async () => {
  if (typeof window === 'undefined') return
  
  const urlParams = new URLSearchParams(window.location.search)
  const repoParam = urlParams.get('add-repo')
  
  if (repoParam) {
    const repoUrl = decodeURIComponent(repoParam)
    
    checkingRepo.value = true
    const result = await addRepo(repoUrl)
    checkingRepo.value = false
    
    if (result.success) {
      await fetchAllExtensions()
    }
    
    urlParams.delete('add-repo')
    const newUrl = urlParams.toString() 
      ? `${window.location.pathname}?${urlParams.toString()}`
      : window.location.pathname
    window.history.replaceState({}, '', newUrl)
  }
}

onMounted(async () => {
  loadRepos()
  await fetchAllExtensions()
  
  const urlParams = new URLSearchParams(window.location.search)
  const searchParam = urlParams.get('search')
  if (searchParam) {
    searchQuery.value = searchParam
  }
  
  await handleAddRepoFromUrl()
})
</script>

<template>
  <div class="extension-list">
    <div
      v-if="loading"
      class="loading"
    >
      <div class="spinner" />
      Loading extensions...
    </div>

    <div
      v-else-if="error"
      class="error"
    >
      Error loading extensions: {{ error }}
    </div>

    <div v-else>
      <!-- Search and Filter Section -->
      <div class="search-section">
        <div class="search-bar">
          <div class="search-input-container">
            <span class="search-icon">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              ><circle
                cx="11"
                cy="11"
                r="8"
              /><line
                x1="21"
                y1="21"
                x2="16.65"
                y2="16.65"
              /></svg>
            </span>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search extensions..."
              class="search-input"
            >
            <span
              v-if="!searchQuery && selectedRatings.size === 0 && selectedSources.size === 0 && selectedLanguages.size === 0 && selectedGenres.size === 0"
              class="search-shortcut"
            >
              <kbd>⌘</kbd><kbd>⇧</kbd><kbd>K</kbd>
            </span>
            <button
              v-if="searchQuery || selectedRatings.size > 0 || selectedSources.size > 0 || selectedLanguages.size > 0 || selectedGenres.size > 0"
              class="clear-btn"
              title="Clear search"
              @click="clearSearch"
            >
              ✕
            </button>
          </div>
        </div>

        <div class="filters-row">
          <div class="toggles-group">
            <button
              class="action-btn"
              :class="{ active: filtersExpanded || selectedSources.size > 0 || selectedRatings.size > 0 || selectedLanguages.size > 0 || selectedGenres.size > 0 }"
              @click="filtersExpanded = !filtersExpanded"
            >
              <span class="btn-text">Filters</span>
              <span
                v-if="selectedSources.size + selectedRatings.size + selectedLanguages.size + selectedGenres.size > 0"
                class="filter-count"
              >{{ selectedSources.size + selectedRatings.size + selectedLanguages.size + selectedGenres.size }}</span>
              <span
                class="expand-icon"
                :class="{ expanded: filtersExpanded }"
              >▼</span>
            </button>

            <button
              class="action-btn"
              :class="{ active: showRepoManager || customRepos.length > 0 }"
              @click="showRepoManager = !showRepoManager"
            >
              <span class="btn-text">Repos</span>
              <span
                v-if="customRepos.length > 0"
                class="filter-count"
              >{{ customRepos.length }}</span>
              <span
                class="expand-icon"
                :class="{ expanded: showRepoManager }"
              >▼</span>
            </button>
          </div>
        </div>

        <!-- Collapsible Filters Section -->
        <div
          class="advanced-filters"
          :class="{ expanded: filtersExpanded }"
        >
          <div class="filter-group">
            <div class="filter-header">
              <span class="filter-label">Content Rating</span>
              <button 
                v-if="selectedRatings.size > 0" 
                class="clear-filter-btn" 
                @click="selectedRatings = new Set()"
              >
                Clear
              </button>
            </div>
            <div class="filter-chips">
              <button
                v-for="rating in availableRatings"
                :key="rating"
                class="filter-chip"
                :class="{ 
                  active: selectedRatings.has(rating),
                  'rating-safe': rating === 'SAFE',
                  'rating-mature': rating === 'MATURE',
                  'rating-adult': rating === 'ADULT'
                }"
                @click="toggleRating(rating)"
              >
                {{ rating }}
              </button>
            </div>
          </div>

          <div class="filter-group">
            <div class="filter-header">
              <span class="filter-label">Sources</span>
              <button 
                v-if="selectedSources.size > 0" 
                class="clear-filter-btn" 
                @click="selectedSources = new Set()"
              >
                Clear
              </button>
            </div>
            <div class="filter-chips">
              <button
                v-for="source in availableSources"
                :key="source"
                class="filter-chip"
                :class="{ active: selectedSources.has(source) }"
                @click="toggleSource(source)"
              >
                {{ getSourceDisplayName(source) }}
              </button>
            </div>
          </div>

          <div class="filter-group">
            <div class="filter-header">
              <span class="filter-label">Languages</span>
              <button 
                v-if="selectedLanguages.size > 0" 
                class="clear-filter-btn" 
                @click="selectedLanguages = new Set()"
              >
                Clear
              </button>
            </div>
            <div class="filter-chips">
              <button
                v-for="language in availableLanguages"
                :key="language"
                class="filter-chip"
                :class="{ active: selectedLanguages.has(language) }"
                @click="toggleLanguage(language)"
              >
                {{ language }}
              </button>
            </div>
          </div>

          <div class="filter-group">
            <div class="filter-header">
              <span class="filter-label">Genres</span>
              <button 
                v-if="selectedGenres.size > 0" 
                class="clear-filter-btn" 
                @click="selectedGenres = new Set()"
              >
                Clear
              </button>
            </div>
            <div class="filter-chips">
              <button
                v-for="genre in availableGenres"
                :key="genre"
                class="filter-chip"
                :class="{ active: selectedGenres.has(genre) }"
                @click="toggleGenre(genre)"
              >
                {{ genre }}
              </button>
            </div>
          </div>

          <div
            v-if="selectedLanguages.size > 0 || selectedGenres.size > 0"
            class="filter-actions"
          >
            <button
              class="clear-all-btn"
              @click="clearAllFilters"
            >
              Clear All Filters
            </button>
          </div>
        </div>

        <!-- Collapsible Repository Manager -->
        <div
          class="advanced-filters repos-section"
          :class="{ expanded: showRepoManager }"
        >
          <div class="filter-group">
            <div class="filter-header">
              <span class="filter-label">Add Repository</span>
            </div>
            <div class="add-repo-inline">
              <input
                v-model="newRepoUrl"
                type="text"
                placeholder="owner/repo or https://github.com/owner/repo"
                class="repo-input-inline"
                @keyup.enter="addCustomRepo"
              >
              <button 
                class="add-repo-btn-inline" 
                :disabled="checkingRepo"
                @click="addCustomRepo"
              >
                {{ checkingRepo ? 'Adding...' : 'Add' }}
              </button>
            </div>
          </div>

          <div
            v-if="customRepos.length > 0"
            class="filter-group"
          >
            <div class="filter-header">
              <span class="filter-label">Custom Repositories</span>
              <button 
                v-if="customRepos.length > 0" 
                class="clear-filter-btn" 
                @click="customRepos.forEach(r => removeCustomRepo(r.id))"
              >
                Remove All
              </button>
            </div>
            <div class="filter-chips">
              <div
                v-for="repo in customRepos"
                :key="repo.id"
                class="repo-chip"
              >
                <span class="repo-chip-name">{{ repo.displayName }}</span>
                <button
                  class="repo-chip-remove"
                  @click="removeCustomRepo(repo.id)"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>

          <div
            v-if="customRepos.length === 0"
            class="no-repos-hint"
          >
            <span>No custom repositories added. Add a GitHub repository above.</span>
          </div>
        </div>
      </div>

      <!-- Results Summary -->
      <div class="results-summary">
        <span class="results-count">
          Showing {{ filteredExtensions.length }} of {{ extensions.length }} extensions
        </span>
        <span
          v-if="searchQuery || selectedRatings.size > 0 || selectedSources.size > 0 || selectedLanguages.size > 0 || selectedGenres.size > 0"
          class="active-filters"
        >
          <span
            v-if="searchQuery"
            class="filter-tag"
          >Search: "{{ searchQuery }}"</span>
          <span
            v-for="rating in selectedRatings"
            :key="`rating-${rating}`"
            class="filter-tag rating-tag"
            :class="`rating-${rating.toLowerCase()}`"
          >{{ rating }}</span>
          <span
            v-for="source in selectedSources"
            :key="`source-${source}`"
            class="filter-tag source-tag"
          >{{ getSourceDisplayName(source) }}</span>
          <span
            v-for="lang in selectedLanguages"
            :key="`lang-${lang}`"
            class="filter-tag language-tag"
          >{{ lang }}</span>
          <span
            v-for="genre in selectedGenres"
            :key="`genre-${genre}`"
            class="filter-tag genre-tag"
          >{{ genre }}</span>
        </span>
      </div>

      <div class="extensions-grid">
        <div
          v-for="extension in filteredExtensions"
          :key="`${extension.source}-${extension.name}`"
          class="extension-card"
          :class="{
            'selected': selectedExtensions.has(`${extension.source}-${extension.name}`),
            'nsfw-blur': !showNSFW && extension.metadata && (extension.metadata.contentRating === 'MATURE' || extension.metadata.contentRating === 'ADULT')
          }"
          :style="!showNSFW && extension.metadata && (extension.metadata.contentRating === 'MATURE' || extension.metadata.contentRating === 'ADULT') ? { backgroundImage: `url(${extension.iconUrl})`, backgroundSize: '100% 100%', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' } : {}"
          @click="toggleExtension(extension)"
        >
          <div class="extension-header">
            <img 
              :src="extension.iconUrl" 
              :alt="`${extension.name} icon`"
              class="extension-icon"
              loading="lazy"
              @error="(e) => (e.target as HTMLImageElement).src = 'https://paperback.moe/pb-placeholder.png'"
            >
            <div class="extension-header-text">
              <h3 class="extension-name">
                {{ extension.name }}
              </h3>
              <div
                v-if="extension.metadata"
                class="header-badges"
              >
                <span
                  class="rating-badge"
                  :style="{
                    color: getContentRatingColor(extension.metadata.contentRating),
                    backgroundColor: getContentRatingBg(extension.metadata.contentRating)
                  }"
                >
                  {{ extension.metadata.contentRating }}
                </span>
                <span class="version-badge">v{{ extension.metadata.version }}</span>
              </div>
            </div>
          </div>

          <div
            v-if="extension.metadata"
            class="extension-meta"
          >
            <div
              v-if="extension.metadata.description"
              class="extension-description"
            >
              {{ extension.metadata.description }}
            </div>

            <div
              v-if="extension.metadata.badges && extension.metadata.badges.length > 0"
              class="extension-badges"
            >
              <span
                v-for="badge in extension.metadata.badges.slice(0, 3)"
                :key="badge.label"
                class="genre-badge"
                :style="{
                  color: badge.textColor,
                  backgroundColor: badge.backgroundColor
                }"
              >
                {{ badge.label }}
              </span>
            </div>

            <div
              v-if="extension.metadata.language"
              class="extension-language"
            >
              <span class="language-badge">{{ extension.metadata.language }}</span>
            </div>
          </div>

          <div
            class="extension-actions"
            @click.stop
          >
            <button
              class="details-btn"
              @click="showExtensionDetails(extension)"
            >
              Details
            </button>
          </div>
          
          <div
            v-if="selectedExtensions.has(`${extension.source}-${extension.name}`)"
            class="selected-indicator"
          >
            <span class="selected-checkmark">✓ Selected</span>
          </div>
        </div>
      </div>
      
      <!-- Floating Install Button -->
      <div
        v-if="selectedExtensions.size > 0"
        class="floating-install-btn"
      >
        <button
          class="install-selected-btn"
          @click="installSelectedExtensions"
        >
          <span>Install Selected</span>
          <span class="selected-count">{{ selectedExtensions.size }}</span>
        </button>
      </div>

      <div
        v-if="filteredExtensions.length === 0"
        class="no-results"
      >
        <div class="no-results-icon">
          🔍
        </div>
        <h3>No sources found</h3>
        <p>Try adjusting your search terms or filters.</p>
        <button
          class="clear-search-btn"
          @click="clearSearch"
        >
          Clear Search
        </button>
      </div>

      <div
        v-if="!loading && !error"
        class="stats"
      >
        Total sources: {{ extensions.length }}
      </div>
    </div>

    <!-- Extension Details Component -->
    <ExtensionDetails
      :extension="selectedExtension"
      :show="showDetails"
      @hide="hideExtensionDetails"
      @install="installExtension"
    />
  </div>
</template>