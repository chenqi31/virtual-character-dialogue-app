<script setup lang="ts">
const text = defineModel<string>({ default: '' });
defineEmits<{ (e: 'submit'): void; (e: 'cancel'): void }>();
</script>

<template>
  <div class="event-injector">
    <label>事件 / 话题</label>
    <textarea v-model="text" rows="2" placeholder="例如：突然下起了大雨"></textarea>
    <div class="actions">
      <button @click="$emit('cancel')">取消</button>
      <button class="primary" :disabled="!text.trim()" @click="$emit('submit')">注入</button>
    </div>
  </div>
</template>

<style scoped>
.event-injector { display: flex; flex-direction: column; gap: 0.4rem; }
label { font-size: 0.85rem; color: #4b5563; }
.actions { display: flex; gap: 0.5rem; justify-content: flex-end; }
</style>
