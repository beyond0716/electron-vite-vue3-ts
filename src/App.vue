<script setup lang="ts">
import { computed, ref } from 'vue';
import Download from '@/views/Download.vue';
import Setting from './views/Setting.vue';
import Epub from './views/Epub.vue';

const activeIndex = ref('1');
const activeComponent = computed(() => {
  switch (activeIndex.value) {
    case '1':
      return Download;
      break;
    case '2':
      return Setting;
      break;
    case '3':
      return Epub;
      break;
  }
});

const handleSelect = (index: string) => {
  activeIndex.value = index;
};
</script>

<template>
  <el-menu mode="horizontal" :default-active="activeIndex" @select="handleSelect">
    <el-menu-item index="1">下载中心</el-menu-item>
    <el-menu-item index="2">设置中心</el-menu-item>
    <el-menu-item index="3">生成Epub</el-menu-item>
  </el-menu>

  <KeepAlive>
    <component :is="activeComponent" />
  </KeepAlive>
</template>
