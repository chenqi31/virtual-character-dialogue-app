<script setup lang="ts">
import type { Character } from '@/types';
import { ref } from 'vue';

const props = defineProps<{ character: Character }>();
const emit = defineEmits<{ (e: 'edit', patch: Partial<Character>): void; (e: 'remove'): void }>();
const editing = ref(false);
const draft = ref<Partial<Character>>({ ...props.character });

function save() {
  emit('edit', draft.value);
  editing.value = false;
}
</script>

<template>
  <div class="card">
    <div v-if="!editing">
      <h3 class="name">{{ character.name }}</h3>
      <p class="persona">{{ character.persona }}</p>
      <div v-if="character.traits?.length" class="traits">
        <span v-for="t in character.traits" :key="t" class="tag">{{ t }}</span>
      </div>
      <p v-if="character.initialRelation" class="rel">↔ {{ character.initialRelation }}</p>
      <div class="actions">
        <button @click="editing = true">编辑</button>
        <button class="danger" @click="$emit('remove')">删除</button>
      </div>
    </div>
    <div v-else>
      <input v-model="draft.name" maxlength="100" />
      <textarea v-model="draft.persona" rows="3"></textarea>
      <textarea v-model="draft.initialRelation" rows="2" placeholder="与对方的关系"></textarea>
      <div class="actions">
        <button @click="editing = false">取消</button>
        <button class="primary" @click="save">保存</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 0.75rem; background: #fff; }
.name { font-weight: 600; margin: 0 0 0.25rem; }
.persona { color: #374151; font-size: 0.9rem; margin: 0 0 0.5rem; white-space: pre-wrap; }
.traits { display: flex; flex-wrap: wrap; gap: 0.25rem; margin-bottom: 0.5rem; }
.tag { background: #e0e7ff; color: #3730a3; border-radius: 999px; padding: 0.1rem 0.5rem; font-size: 0.75rem; }
.rel { color: #6b7280; font-size: 0.8rem; margin: 0 0 0.5rem; }
.actions { display: flex; gap: 0.5rem; }
input, textarea { margin-bottom: 0.4rem; }
</style>
