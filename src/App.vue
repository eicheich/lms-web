<script setup lang="ts">
import { onMounted, onUnmounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppShell from '@/layouts/AppShell.vue'
import ToastContainer from '@/components/common/ToastContainer.vue'
import { useTenantStore } from '@/stores/tenant'
import { useAuthStore } from '@/stores/auth'

const route = useRoute()
const router = useRouter()
const tenantStore = useTenantStore()
const authStore = useAuthStore()

const isPublicPage = computed(() => Boolean(route.meta.public))

function onSessionExpired() {
  authStore.logout()
  router.push('/login')
}

onMounted(() => {
  tenantStore.fetchPublicBranding(tenantStore.activeSlug)
  window.addEventListener('aliman:session-expired', onSessionExpired)
})

onUnmounted(() => {
  window.removeEventListener('aliman:session-expired', onSessionExpired)
})
</script>

<template>
  <ToastContainer />
  <router-view v-if="isPublicPage" />
  <AppShell v-else>
    <router-view />
  </AppShell>
</template>
