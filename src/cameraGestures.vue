<template>
  <div>
    <video ref="video" autoplay playsinline width="227" height="227"></video>
  </div>
</template>

<script>
// Heavily inspired by Charlie Gerard's teachable-keyboard https://github.com/charliegerard/teachable-keyboard
// import "@babel/polyfill";
import * as mobilenetModule from "@tensorflow-models/mobilenet";
import * as tf from "@tensorflow/tfjs";
import * as knnClassifier from "@tensorflow-models/knn-classifier";
export default {
  mounted: async function() {
    console.log("alsdjf lkasjd flka sjdfkl");
    this.knn = knnClassifier.create();
    this.mobilenet = await mobilenetModule.load();
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false
    });
    this.$refs.video.srcObject = stream;
    this.$refs.video.play();
    // this.timer = requestAnimationFrame(this.animate.bind(this));
  }
};
</script>

<style>
</style>