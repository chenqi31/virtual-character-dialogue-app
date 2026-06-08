import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'stories', component: () => import('@/views/StoriesView.vue') },
  { path: '/story/:id', name: 'story-detail', component: () => import('@/views/StoryDetailView.vue'), props: true },
  { path: '/sandbox/:id', name: 'sandbox', component: () => import('@/views/SandboxView.vue'), props: true },
  { path: '/settings', name: 'settings', component: () => import('@/views/SettingsView.vue') },
];

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
});
