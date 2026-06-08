import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api } from '@/api/http';
import type { Character } from '@/types';

export const useCharactersStore = defineStore('characters', () => {
  const list = ref<Character[]>([]);
  const loading = ref(false);

  async function fetchByStory(storyId: number) {
    loading.value = true;
    try {
      list.value = await api.listCharacters(storyId);
    } finally {
      loading.value = false;
    }
  }

  async function create(input: Omit<Character, 'id' | 'createdAt' | 'updatedAt'>) {
    const c = await api.createCharacter(input);
    list.value.push(c);
    return c;
  }

  async function update(id: number, input: Partial<Character>) {
    const updated = await api.updateCharacter(id, input);
    const idx = list.value.findIndex((c) => c.id === id);
    if (idx >= 0) list.value[idx] = updated;
    return updated;
  }

  async function remove(id: number) {
    await api.deleteCharacter(id);
    list.value = list.value.filter((c) => c.id !== id);
  }

  function clear() {
    list.value = [];
  }

  return { list, loading, fetchByStory, create, update, remove, clear };
});
