<script setup lang="ts">
function storeGet(key: string): any {
  return window.api.store.get(key);
}

/**
 * 安装证书
 */
function installLicence() {
  window.api.installLicence();
}
/**
 * 打开证书路径
 */
function openLicence() {
  console.log("🚀 ~ openLicence ~ storeGet('caPath'):", storeGet('caPath'));
  // window.api.openPath(storeGet('caPath'));
}
</script>

<template>
  <el-container>
    <el-header height="35px">
      首次运行需要安装证书(安装一次即可)，请手动完成此设置：
      <el-button type="primary" size="small" @click="installLicence">安装证书</el-button>
      <el-button type="primary" size="small" @click="openLicence">打开证书路径</el-button>
    </el-header>
  </el-container>
</template>
