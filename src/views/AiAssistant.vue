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
  /* 允许亚托莉页面进行文本选择 */
  user-select: text;
}

/* 确保所有子元素也可以选择 */
.atri-page * {
  user-select: text;
}

/* 但按钮和交互元素保持默认行为 */
.atri-page button,
.atri-page .el-button {
  user-select: none;
}

@media (max-width: 768px) {
  .atri-page {
    height: calc(100dvh - 60px);
  }
}

@media (max-width: 480px) {
  .atri-page {
    height: calc(100dvh - 56px);
  }
}
</style>
