<script setup>
import { VueFlow } from '@vue-flow/core'
import { MiniMap } from '@vue-flow/additional-components'

defineProps({
  nodes: {
    type: Array,
    default: () => [],
  },
  edges: {
    type: Array,
    default: () => [],
  },
})
</script>

<template>
  <VueFlow :nodes="nodes" :edges="edges">
    <MiniMap />
  </VueFlow>
</template>
