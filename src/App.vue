<template>
  <h1>Hello World!</h1>
  <p>
    Drag the boxes below to somewhere in your OS (Finder/Explorer, Desktop,
    etc.) to copy an example markdown file.
  </p>
  <div
    style="
      border: 2px solid black;
      border-radius: 3px;
      padding: 5px;
      display: inline-block;
    "
    draggable="true"
    id="drag1"
    @dragstart="handleDrag1"
  >
    Drag me - File 1
  </div>
  <div
    style="
      border: 2px solid black;
      border-radius: 3px;
      padding: 5px;
      display: inline-block;
    "
    draggable="true"
    id="drag2"
    @dragstart="handleDrag2"
  >
    Drag me - File 2
  </div>
</template>

<script setup lang="ts">
const handleDrag1 = (event: MouseEvent) => {
  event.preventDefault()
  window.electron.startDrag('drag-and-drop-1.md')
}

const handleDrag2 = (event: MouseEvent) => {
  event.preventDefault()
  window.electron.startDrag('drag-and-drop-2.md')
}
</script>
