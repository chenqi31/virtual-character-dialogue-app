<script setup lang="ts">
import { computed } from 'vue';
import type { Message } from '@/types';

const props = defineProps<{ message: Message; streaming?: boolean }>();

const cls = computed(() => `bubble bubble--${props.message.role}${props.streaming ? ' streaming' : ''}`);
const roleLabel = computed(() => {
  switch (props.message.role) {
    case 'user': return '我';
    case 'char_a': return 'A';
    case 'char_b': return 'B';
    case 'system': return '系统';
  }
});
</script>

<template>
  <div :class="cls">
    <div class="meta">{{ roleLabel }} · #{{ message.id }}</div>
    <div class="content">{{ message.content }}</div>
  </div>
</template>

<style scoped>
.bubble { padding: 0.6rem 0.9rem; border-radius: 10px; margin-bottom: 0.6rem; max-width: 80%; white-space: pre-wrap; }
.bubble--user { background: #2563eb; color: #fff; margin-left: auto; }
.bubble--char_a { background: #f3f4f6; }
.bubble--char_b { background: #ecfeff; }
.bubble--system { background: #fef3c7; color: #92400e; font-size: 0.85rem; }
.meta { font-size: 0.7rem; opacity: 0.7; margin-bottom: 0.2rem; }
.streaming { outline: 1px dashed #93c5fd; }
</style>
