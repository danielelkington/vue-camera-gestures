<template>
  <div>
    <button
      class="vue-button"
      @click="demoStarted = !demoStarted"
    >{{demoStarted ? 'Stop Demo' : 'Start Demo'}}</button>
    <div v-if="demoStarted">{{direction}}</div>
    <camera-gestures
      v-if="demoStarted"
      @left="direction = 'Left'"
      @right="direction = 'Right'"
    ></camera-gestures>
  </div>
</template>

<script>
import CameraGestures from "../../dist/vue-camera-gestures.es.js"
import '../../dist/style.css'
export default {
  components: {
    CameraGestures
  },
  data () {
    return {
      demoStarted: false,
      direction: "Left"
    }
  }
}
</script>

<style scoped>
.vue-button {
  color: #fff;
  margin: 0.2em 0;
  width: 200px;
  text-align: center;
  padding: 12px 24px;
  vertical-align: middle;
  font-weight: 600;
  border-radius: 2em;
  background-color: #4fc08d;
  border: 1px solid #4fc08d;
  cursor: pointer;
}
</style>