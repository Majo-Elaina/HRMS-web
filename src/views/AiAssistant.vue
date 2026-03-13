<script setup>
import AtriChatPanel from '@/components/ai/AtriChatPanel.vue'

const atriAvatar = new URL('../../ai-docs/亚托莉.webp', import.meta.url).href
</script>

<template>
  <div class="atri-page">
    <AtriChatPanel :avatar="atriAvatar" />
  </div>
</template>

<style scoped>
.atri-page {
  height: calc(100vh - 72px); /* 减去header高度 */
  overflow: hidden;
}
</style>
