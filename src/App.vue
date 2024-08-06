<template>
  <h1>💖 Hello World!</h1>
  <p>{{ msg }}</p>
</template>

<script setup lang="ts">
import { ref } from 'vue'

console.log('👋 This message is being logged by "App.vue", included via Vite')
const msg = ref('Welcome to your Electron application.')
</script>
