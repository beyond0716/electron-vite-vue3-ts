<template>
  <h1>💖 Hello World!</h1>
  <p>{{ msg }}</p>
  Title: <input v-model="title" />
  <button type="button" @click="handleClick">Set</button>
</template>

<script setup lang="ts">
import { ref } from 'vue'

console.log('👋 This message is being logged by "App.vue", included via Vite')
const msg = ref('Welcome to your Electron application.')

const title = ref('')
const handleClick = () => {
  window.electronAPI.setTitle(title.value)
}
</script>
