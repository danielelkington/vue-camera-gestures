<template>
  <div>
    <video
      ref="video"
      autoplay
      playsinline
      width="227"
      height="227"
      @playing="videoPlaying = true"
      @pause="videoPlaying = false"
    ></video>
    <p>State: {{state}}</p>
    <p v-if="preparing">Prepare to</p>
    <p>Gesture: {{gestures[currentGestureIndex]}}</p>
    <p>Prediction: {{prediction}}</p>
    <button @click="reset">Reset</button>
  </div>
</template>

<script>
// Heavily inspired by Charlie Gerard's teachable-keyboard https://github.com/charliegerard/teachable-keyboard
import * as mobilenetModule from '@tensorflow-models/mobilenet'
import * as tf from '@tensorflow/tfjs'
import * as knnClassifier from '@tensorflow-models/knn-classifier'
// K value for KNN
const TOPK = 10

export default {
  mounted: async function () {
    this.knn = knnClassifier.create()
    this.mobilenet = await mobilenetModule.load()
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false
    })
    this.$refs.video.srcObject = stream
    this.$refs.video.play()
    this.animationFrameId = requestAnimationFrame(this.animate)
    this.intervalId = setInterval(this.updateState, 2000)
  },
  data: function () {
    return {
      videoPlaying: false,
      // can be "training", "testing" or "predicting"
      state: 'training',
      preparing: false,
      gestures: ['Neutral', 'Left', 'Right'],
      currentGestureIndex: -1,
      prediction: null
    }
  },
  methods: {
    async animate () {
      if (this.videoPlaying) {
        // Get image data from video element
        const image = tf.browser.fromPixels(this.$refs.video)
        switch (this.state) {
          case 'training':
            this.trainFrame(image)
            break
          case 'testing':
            this.testFrame(image)
            break
          case 'predicting':
            this.predictFrame(image)
            break
        }

        image.dispose()
      }
      this.animationFrameId = requestAnimationFrame(this.animate)
    },
    trainFrame (image) {
      if (this.currentGestureIndex !== -1 && !this.preparing) {
        const logits = this.mobilenet.infer(image, 'conv_preds')
        this.knn.addExample(logits, this.currentGestureIndex)
        logits.dispose()
      }
    },
    async testFrame (image) {
      if (this.currentGestureIndex !== -1) {
        const logits = this.mobilenet.infer(image, 'conv_preds')
        const res = await this.knn.predictClass(logits, TOPK)
        console.log('testing: predicting that current gesture is index ' + res.classIndex + ' with confidence ' + (res.confidences[res.classIndex] * 100) + '%')
        logits.dispose()
      }
    },
    async predictFrame (image) {
      const logits = this.mobilenet.infer(image, 'conv_preds')
      const res = await this.knn.predictClass(logits, TOPK)
      // console.log('testing: predicting that current gesture is index ' + res.classIndex + ' with confidence ' + (res.confidences[res.classIndex] * 100) + '%')
      this.prediction = this.gestures[res.classIndex]
      logits.dispose()
    },
    updateState () {
      if (this.preparing) {
        this.preparing = false
        return
      }
      if (this.currentGestureIndex < this.gestures.length - 1) {
        this.currentGestureIndex++
        this.preparing = true
      } else {
        // this.currentGestureIndex = 0
        if (this.state === 'training') {
          this.state = 'predicting'
        } else {
          this.state = 'predicting'
          clearInterval(this.intervalId)
        }
      }
    },
    reset () {
      this.knn.clearAllClasses()
      this.state = 'training'
      this.preparing = true
      this.currentGestureIndex = 0
      this.intervalId = setInterval(this.updateState, 2000)
    }
  }
}
</script>

<style scoped>
/* Mirror the video */
video {
  transform: rotateY(180deg);
  -webkit-transform: rotateY(180deg); /* Safari and Chrome */
  -moz-transform: rotateY(180deg); /* Firefox */
}
</style>
