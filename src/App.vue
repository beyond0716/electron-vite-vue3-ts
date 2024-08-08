<template>
  <h1>Hello World!</h1>
  <p>
    Current theme source: <strong id="theme-source">{{ theme }}</strong>
  </p>

  <el-button @click="handleToggleDarkMode">Toggle Dark Mode</el-button>
  <el-button @click="handleResetToSystem">Reset to System Theme</el-button>
</template>

<script setup lang="ts">
import { ref } from 'vue'

let theme = ref('System')

const handleToggleDarkMode = async () => {
  const isDarkMode = await window.darkMode.toggle()
  theme.value = isDarkMode ? 'Dark' : 'Light'
}

const handleResetToSystem = async () => {
  await window.darkMode.system()
  theme.value = 'System'
}
</script>
