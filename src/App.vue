<template>
  <h1>💖 Hello World!</h1>
  <p>{{ msg }}</p>

  <div>
    Title: <input v-model="title" />
    <button type="button" @click="handleClick">Set</button>
  </div>

  <div>
    <button type="button" @click="handleOpen">Open a File</button>
    File path: <strong>{{ filePath }}</strong>
  </div>

  <div>
    Current value: <strong>{{ counter }}</strong>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

console.log('👋 This message is being logged by "App.vue", included via Vite')
const msg = ref('Welcome to your Electron application.')

const title = ref('')
const handleClick = () => {
  window.electronAPI.setTitle(title.value)
}

let filePath = ref('')
const handleOpen = async () => {
  filePath.value = await window.electronAPI.openFile()
}

let counter = ref(0)
onMounted(() => {
  window.electronAPI.onUpdateCounter((value) => {
    const oldValue = Number(counter.value)
    const newValue = oldValue + value
    counter.value = newValue
    window.electronAPI.counterValue(counter.value)
  })
})
</script>
