<script setup lang="ts">
import { computed, ref } from 'vue';
import Download from '@/views/Download.vue';
import Setting from './views/Setting.vue';
import Epub from './views/Epub.vue';

const activeIndex = ref('1');
const activeComponent = computed(() => {
  switch (activeIndex.value) {
    case '2':
      return Setting;
    case '3':
      return Epub;
    default:
      return Download;
  }
});

const handleSelect = (index: string) => {
  activeIndex.value = index;
};
</script>

<template>
  <el-menu class="fxx-menu" mode="horizontal" :default-active="activeIndex" @select="handleSelect">
    <el-menu-item index="1">下载中心</el-menu-item>
    <el-menu-item index="2">设置中心</el-menu-item>
    <el-menu-item index="3">生成Epub</el-menu-item>
  </el-menu>

  <KeepAlive>
    <component :is="activeComponent" />
  </KeepAlive>
</template>

<style scoped lang="scss">
.fxx-menu {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 35px;
}
</style>
