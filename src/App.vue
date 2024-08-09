<template>
  <h1>Hello World!</h1>

  <p>Hit any key with this window focused to see it captured here.</p>
  <div>
    <span>Last Key Pressed: </span><span id="last-keypress">{{ key }}</span>
  </div>

  <p>Hit Ctrl+I to see a message printed to the console.</p>
</template>

<script setup lang="ts">
import { ref } from 'vue'

let key = ref('')

const handleKeyPress = (event: KeyboardEvent) => {
  // You can put code here to handle the keypress.
  key.value = event.key
  console.log(`You pressed ${event.key}`)
}

window.addEventListener('keyup', handleKeyPress, true)
</script>
