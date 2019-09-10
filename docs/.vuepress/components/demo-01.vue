<template>
  <div>
    <div>{{direction}}</div>
    <camera-gestures @left="direction = 'Left'" @right="direction = 'Right'"></camera-gestures>
  </div>
</template>

<script>
import CameraGestures from "../../../dist/vue-camera-gestures.esm.js";
export default {
  components: {
    CameraGestures
  },
  data() {
    return {
      direction: "Left"
    };
  }
};
</script>