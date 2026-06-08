import { defineStore } from 'pinia';
import { ref } from 'vue';
import { api } from '@/api/http';
import type { Story } from '@/types';

export const useStoriesStore = defineStore('stories', () => {
  const stories = ref<Story[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchAll() {
    loading.value = true;
    error.value = null;
    try {
      stories.value = await api.listStories();
    } catch (e) {
      error.value = (e as Error).message;
    } finally {
      loading.value = false;
    }
  }

  async function create(input: { title: string; background: string }) {
    const s = await api.createStory(input);
    stories.value.unshift(s);
    return s;
  }

  async function update(id: number, input: Partial<Story>) {
    const updated = await api.updateStory(id, input);
    const idx = stories.value.findIndex((s) => s.id === id);
    if (idx >= 0) stories.value[idx] = updated;
    return updated;
  }

  async function remove(id: number) {
    await api.deleteStory(id);
    stories.value = stories.value.filter((s) => s.id !== id);
  }

  return { stories, loading, error, fetchAll, create, update, remove };
});
