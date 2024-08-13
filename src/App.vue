<template>
  <h1>Hello World!</h1>
  <p>
    After launching this application, you should see the system notification.
  </p>
  <p>{{ CLICK_MESSAGE }}</p>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const NOTIFICATION_TITLE = 'Title'
const NOTIFICATION_BODY =
  'Notification from the Renderer process. Click to log to console.'
const CLICK_MESSAGE = ref('Click it to see the effect in this interface.')

new window.Notification(NOTIFICATION_TITLE, {
  body: NOTIFICATION_BODY,
}).onclick = () => {
  CLICK_MESSAGE.value = 'Notification clicked!'
}
</script>
