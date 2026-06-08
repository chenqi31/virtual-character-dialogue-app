<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useCharactersStore } from '@/stores/characters';
import { useStoriesStore } from '@/stores/stories';
import CharacterCard from '@/components/CharacterCard.vue';
import type { Character, Story } from '@/types';

const props = defineProps<{ id: string }>();
const router = useRouter();
const storiesStore = useStoriesStore();
const charsStore = useCharactersStore();
const story = ref<Story | null>(null);
const showDialog = ref(false);
const form = ref<Omit<Character, 'id' | 'createdAt' | 'updatedAt'>>({
  storyId: Number(props.id),
  name: '',
  persona: '',
  traits: [],
  initialRelation: '',
  avatar: '',
});

const charAId = ref<number | null>(null);
const charBId = ref<number | null>(null);

onMounted(async () => {
  story.value = storiesStore.stories.find((s) => s.id === Number(props.id)) || null;
  if (!story.value) story.value = await (await import('@/api/http')).api.getStory(Number(props.id));
  await charsStore.fetchByStory(Number(props.id));
});

async function submit() {
  if (!form.value.name.trim() || !form.value.persona.trim()) return;
  await charsStore.create({ ...form.value, storyId: Number(props.id) });
  showDialog.value = false;
  form.value = { storyId: Number(props.id), name: '', persona: '', traits: [], initialRelation: '', avatar: '' };
}

async function startSandbox() {
  if (!charAId.value || !charBId.value || charAId.value === charBId.value) {
    alert('请选择两个不同的人物');
    return;
  }
  const { api } = await import('@/api/http');
  const session = await api.createSession({
    storyId: Number(props.id),
    charAId: charAId.value,
    charBId: charBId.value,
  });
  router.push({ name: 'sandbox', params: { id: String(session.id) } });
}
</script>

<template>
  <section class="p-4">
    <h1 class="text-xl font-semibold">{{ story?.title || '...' }}</h1>
    <p class="text-gray-600 whitespace-pre-wrap">{{ story?.background }}</p>

    <div class="flex items-center justify-between mt-3 mb-2">
      <h2 class="text-lg m-0">人物</h2>
      <button class="primary" @click="showDialog = true">+ 新建人物</button>
    </div>

    <div class="grid">
      <CharacterCard
        v-for="c in charsStore.list"
        :key="c.id"
        :character="c"
        @edit="async (patch) => charsStore.update(c.id, patch)"
        @remove="() => charsStore.remove(c.id)"
      />
    </div>

    <div class="mt-4 border-t pt-3">
      <h2 class="text-lg m-0 mb-2">启动沙盒</h2>
      <div class="flex gap-3 items-end">
        <div>
          <label>角色 A</label>
          <select v-model="charAId">
            <option :value="null">— 请选择 —</option>
            <option v-for="c in charsStore.list" :key="`a-${c.id}`" :value="c.id">{{ c.name }}</option>
          </select>
        </div>
        <div>
          <label>角色 B</label>
          <select v-model="charBId">
            <option :value="null">— 请选择 —</option>
            <option v-for="c in charsStore.list" :key="`b-${c.id}`" :value="c.id">{{ c.name }}</option>
          </select>
        </div>
        <button class="primary" :disabled="!charAId || !charBId || charAId === charBId" @click="startSandbox">
          进入沙盒
        </button>
      </div>
    </div>

    <div v-if="showDialog" class="dialog-mask" @click.self="showDialog = false">
      <div class="dialog">
        <h2>新建人物</h2>
        <label>名称</label>
        <input v-model="form.name" maxlength="100" />
        <label>人设</label>
        <textarea v-model="form.persona" rows="3"></textarea>
        <label>性格标签（逗号分隔）</label>
        <input
          :value="form.traits.join('，')"
          @change="(e) => (form.traits = ((e.target as HTMLInputElement).value || '').split(/[,,]/).map(s => s.trim()).filter(Boolean))"
        />
        <label>与对方的初始关系</label>
        <textarea v-model="form.initialRelation" rows="2"></textarea>
        <div class="flex gap-2 justify-end mt-3">
          <button @click="showDialog = false">取消</button>
          <button class="primary" :disabled="!form.name.trim() || !form.persona.trim()" @click="submit">创建</button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 0.75rem; }
.dialog-mask { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; }
.dialog { background: #fff; padding: 1.5rem; border-radius: 8px; min-width: 360px; max-width: 600px; display: flex; flex-direction: column; gap: 0.5rem; }
label { font-size: 0.85rem; color: #4b5563; }
.flex { display: flex; }
.items-end { align-items: end; }
.justify-end { justify-content: flex-end; }
.justify-between { justify-content: space-between; }
.gap-2 { gap: 0.5rem; }
.gap-3 { gap: 0.75rem; }
.mt-3 { margin-top: 0.75rem; }
.mt-4 { margin-top: 1rem; }
.mb-2 { margin-bottom: 0.5rem; }
.pt-3 { padding-top: 0.75rem; }
.border-t { border-top: 1px solid #e5e7eb; }
.text-lg { font-size: 1.125rem; }
.text-xl { font-size: 1.25rem; }
.text-gray-600 { color: #4b5563; }
.font-semibold { font-weight: 600; }
.whitespace-pre-wrap { white-space: pre-wrap; }
</style>
