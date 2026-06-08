<script setup lang="ts">
import { RouterView, RouterLink } from 'vue-router';
</script>

<template>
  <div class="app">
    <header class="app__nav">
      <RouterLink to="/">故事</RouterLink>
      <RouterLink to="/settings">设置</RouterLink>
    </header>
    <main>
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
}
.app__nav {
  display: flex;
  gap: 1rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
}
.app__nav a {
  text-decoration: none;
  color: #374151;
}
.app__nav a.router-link-active {
  color: #2563eb;
  font-weight: 600;
}
main {
  flex: 1;
  overflow: auto;
}
</style>
