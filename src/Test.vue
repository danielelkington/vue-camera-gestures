<template>
  <div>
    <div>{{direction}}</div>
    <camera-gestures @left="direction = 'Left'" @right="direction = 'Right'"></camera-gestures>
  </div>
</template>

<script>
import CameraGestures from '../lib/cameraGestures.vue'
export default {
  components: {
    CameraGestures
  },
  data () {
    return {
      direction: 'Left'
    }
  }
}
</script>
