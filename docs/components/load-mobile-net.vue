<!--Doesn't do much - just kicks off loading mobilenet for better performance-->
<template>
<span/>
</template>
<script>
import { loadMobilenet } from "../../dist/vue-camera-gestures.es.js"
export default {
  created () {
    loadMobilenet()
  }
}
</script>
