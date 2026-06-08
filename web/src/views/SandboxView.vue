<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue';
import { useSessionStore } from '@/stores/session';
import MessageBubble from '@/components/MessageBubble.vue';
import EventInjector from '@/components/EventInjector.vue';

const props = defineProps<{ id: string }>();
const store = useSessionStore();
const userInput = ref('');
const target = ref<'a' | 'b'>('a');
const showInjector = ref(false);
const eventText = ref('');
const listEl = ref<HTMLElement | null>(null);

onMounted(() => store.load(Number(props.id)));

const messages = computed(() => store.messages);

async function scrollToBottom() {
  await nextTick();
  if (listEl.value) listEl.value.scrollTop = listEl.value.scrollHeight;
}

async function start() { await store.command('start'); await store.refreshMessages(); scrollToBottom(); }
async function pause() { await store.command('pause'); }
async function resume() { await store.command('resume'); }
async function reset() { await store.reset(); scrollToBottom(); }
async function inject() {
  if (!eventText.value.trim()) return;
  await store.command('inject', eventText.value);
  await store.refreshMessages();
  eventText.value = '';
  showInjector.value = false;
  scrollToBottom();
}
async function send() {
  if (!userInput.value.trim()) return;
  const text = userInput.value;
  userInput.value = '';
  store.sendUserInput(target.value, text);
}
function stop() { store.stop(); }
</script>

<template>
  <section class="sandbox">
    <header class="bar">
      <div>会话 #{{ id }} · 状态：<b>{{ store.state }}</b></div>
      <div class="flex gap-2">
        <button v-if="store.state === 'idle'" class="primary" @click="start">▶ 开始</button>
        <button v-if="store.state === 'running'" @click="pause">⏸ 暂停</button>
        <button v-if="store.state === 'paused'" class="primary" @click="resume">▶ 继续</button>
        <button @click="reset">⟲ 重置</button>
        <button @click="showInjector = !showInjector">💡 注入事件</button>
        <button v-if="store.streamingFromChar" class="danger" @click="stop">■ 停止</button>
      </div>
    </header>

    <div v-if="showInjector" class="injector">
      <EventInjector v-model="eventText" @submit="inject" @cancel="showInjector = false" />
    </div>

    <div ref="listEl" class="messages">
      <MessageBubble
        v-for="m in messages"
        :key="m.id"
        :message="m"
        :streaming="false"
      />
      <p v-if="!messages.length" class="empty">还没有消息，点击「开始」让两位角色开始对话。</p>
    </div>

    <footer class="composer">
      <div class="flex gap-2 items-end">
        <div style="min-width:120px">
          <label>对谁说</label>
          <select v-model="target">
            <option value="a">角色 A</option>
            <option value="b">角色 B</option>
          </select>
        </div>
        <div class="flex-1">
          <label>用户发言</label>
          <textarea v-model="userInput" placeholder="说点什么…" rows="2"></textarea>
        </div>
        <button class="primary" :disabled="!userInput.trim() || !!store.streamingFromChar" @click="send">发送</button>
      </div>
    </footer>
  </section>
</template>

<style scoped>
.sandbox { display: flex; flex-direction: column; height: 100%; }
.bar { display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 1rem; border-bottom: 1px solid #e5e7eb; }
.messages { flex: 1; overflow: auto; padding: 1rem; }
.empty { color: #6b7280; text-align: center; margin-top: 3rem; }
.composer { border-top: 1px solid #e5e7eb; padding: 0.75rem 1rem; background: #f9fafb; }
.injector { padding: 0.5rem 1rem; border-bottom: 1px solid #e5e7eb; background: #fffbe6; }
.flex { display: flex; }
.flex-1 { flex: 1; }
.gap-2 { gap: 0.5rem; }
.items-end { align-items: end; }
label { font-size: 0.85rem; color: #4b5563; }
</style>
