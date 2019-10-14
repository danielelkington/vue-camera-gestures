<!--Doesn't do much - just kicks off loading mobilenet for better performance-->
<template>
</template>

<script>
import { loadMobilenet } from "../../../dist/vue-camera-gestures.esm.js";
export default {
  created () {
    loadMobilenet()
  }
};
</script>
