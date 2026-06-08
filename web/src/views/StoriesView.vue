<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useStoriesStore } from '@/stores/stories';

const router = useRouter();
const store = useStoriesStore();
const showDialog = ref(false);
const form = ref({ title: '', background: '' });

onMounted(() => store.fetchAll());

async function submit() {
  if (!form.value.title.trim() || !form.value.background.trim()) return;
  const s = await store.create({ ...form.value });
  showDialog.value = false;
  form.value = { title: '', background: '' };
  router.push({ name: 'story-detail', params: { id: s.id } });
}

async function remove(id: number) {
  if (!confirm('确认删除该故事？')) return;
  await store.remove(id);
}
</script>

<template>
  <section class="p-4">
    <div class="flex items-center justify-between mb-3">
      <h1 class="text-xl font-semibold m-0">故事列表</h1>
      <button class="primary" @click="showDialog = true">+ 新建故事</button>
    </div>

    <p v-if="store.loading">加载中…</p>
    <p v-else-if="!store.stories.length" class="text-gray-500">
      还没有故事。点击右上角新建。
    </p>
    <ul v-else class="space-y-2 list-none p-0">
      <li
        v-for="s in store.stories"
        :key="s.id"
        class="border rounded p-3 flex items-center justify-between"
      >
        <div>
          <div class="font-medium">{{ s.title }}</div>
          <div class="text-sm text-gray-500 line-clamp-2">{{ s.background }}</div>
        </div>
        <div class="flex gap-2">
          <button @click="router.push({ name: 'story-detail', params: { id: s.id } })">打开</button>
          <button class="danger" @click="remove(s.id)">删除</button>
        </div>
      </li>
    </ul>

    <div v-if="showDialog" class="dialog-mask" @click.self="showDialog = false">
      <div class="dialog">
        <h2>新建故事</h2>
        <label>标题</label>
        <input v-model="form.title" maxlength="200" />
        <label>背景</label>
        <textarea v-model="form.background" rows="6"></textarea>
        <div class="flex gap-2 justify-end mt-3">
          <button @click="showDialog = false">取消</button>
          <button class="primary" :disabled="!form.title.trim() || !form.background.trim()" @click="submit">
            创建
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.dialog-mask {
  position: fixed; inset: 0; background: rgba(0,0,0,0.4);
  display: flex; align-items: center; justify-content: center;
}
.dialog {
  background: #fff; padding: 1.5rem; border-radius: 8px; min-width: 360px; max-width: 600px;
  display: flex; flex-direction: column; gap: 0.5rem;
}
label { font-size: 0.85rem; color: #4b5563; }
.space-y-2 > * + * { margin-top: 0.5rem; }
.flex { display: flex; }
.items-center { align-items: center; }
.justify-between { justify-content: space-between; }
.justify-end { justify-content: flex-end; }
.gap-2 { gap: 0.5rem; }
.mb-3 { margin-bottom: 0.75rem; }
.mt-3 { margin-top: 0.75rem; }
.text-xl { font-size: 1.25rem; }
.text-sm { font-size: 0.875rem; }
.text-gray-500 { color: #6b7280; }
.font-medium { font-weight: 500; }
.font-semibold { font-weight: 600; }
.line-clamp-2 {
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
