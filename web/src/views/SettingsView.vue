<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { api } from '@/api/http';

const apiKey = ref('');
const baseUrl = ref('');
const dbType = ref<string>('unknown');
const status = ref<string>('unknown');

async function refresh() {
  try {
    const h = await api.getHealth();
    dbType.value = h.dbType;
    status.value = h.status || 'ok';
  } catch (e) {
    status.value = 'error';
  }
}

onMounted(refresh);

function save() {
  // 桌面端由 Electron 主进程写入 <userData>/config.json；dev 模式仅做本地占位
  const payload = { apiKey: apiKey.value, baseUrl: baseUrl.value };
  localStorage.setItem('app.config.draft', JSON.stringify(payload));
  alert('已保存到本地草稿。生产环境会通过 Electron IPC 写入 <userData>/config.json。');
}
</script>

<template>
  <section class="p-4">
    <h1 class="text-xl font-semibold m-0 mb-3">设置</h1>

    <div class="card">
      <h2>大模型</h2>
      <label>MINIMAX API Key</label>
      <input v-model="apiKey" type="password" placeholder="sk-..." />
      <label>MINIMAX Base URL</label>
      <input v-model="baseUrl" placeholder="https://api.minimax.chat/v1" />
      <button class="primary mt-2" @click="save">保存</button>
    </div>

    <div class="card mt-3">
      <h2>数据库</h2>
      <p>当前驱动：<b>{{ dbType }}</b>　健康：<b>{{ status }}</b></p>
      <button @click="refresh">刷新</button>
    </div>
  </section>
</template>

<style scoped>
.card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 1rem; }
label { display: block; font-size: 0.85rem; color: #4b5563; margin-top: 0.5rem; }
.text-xl { font-size: 1.25rem; }
.font-semibold { font-weight: 600; }
.mb-3 { margin-bottom: 0.75rem; }
.mt-2 { margin-top: 0.5rem; }
.mt-3 { margin-top: 0.75rem; }
.m-0 { margin: 0; }
.p-4 { padding: 1rem; }
</style>
