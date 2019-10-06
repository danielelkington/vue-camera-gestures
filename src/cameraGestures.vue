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
    <p v-if="currentGestureIndex > -1">Gesture: {{computedGestures[currentGestureIndex].name}}</p>
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
  name: 'CameraGestures',
  props: {
    fireOnce: {
      type: Boolean,
      default: true
    },
    gestures: {
      type: Array
    },
    requiredAccuracy: {
      type: Number,
      default: 90
    },
    throttleEvents: {
      type: Boolean,
      default: false
    },
    trainingDelay: {
      type: Number,
      default: 1000
    },
    trainingPromptPrefix: {
      type: String,
      default: 'Perform a gesture: '
    },
    trainingTime: {
      type: Number,
      default: 3000
    },
    verificationDelay: {
      type: Number,
      default: 1000
    },
    verificationPromptPrefix: {
      type: String,
      default: 'Verify gesture: '
    },
    verificationTime: {
      type: Number,
      default: 1000
    }
  },
  computed: {
    computedGestures: function () {
      if (this.gestures === undefined) {
        const reservedEventNames = [
          'DONETRAINING',
          'DONEVERIFICATION',
          'NEUTRAL',
          'VERIFICATIONFAILED'
        ]
        const filteredEventNames = Object.keys(this.$listeners).filter(x => !reservedEventNames.includes(x.toUpperCase))
        return filteredEventNames.map(x => {
          // convert event name from camelCase to Sentence Case
          let name = x.replace(/(A-Z)/g, ' $1')
          name = name.charAt(0).toUpperCase() + name.slice(1)
          return {
            event: x,
            fireOnce: this.fireOnce,
            name,
            requiredAccuracy: this.requiredAccuracy,
            throttleEvent: this.throttleEvents,
            trainingDelay: this.trainingDelay,
            trainingPrompt: this.trainingPromptPrefix + name,
            trainingTime: this.trainingTime,
            verificationDelay: this.verificationDelay,
            verificationPrompt: this.verificationPromptPrefix + name,
            verificationTime: this.verificationTime,
            isNeutral: false
          }
        })
      }
      return this.gestures.map(x => {
        let name
        if (x.name) {
          name = x.name
        } else {
          name = x.event.replace(/(A-Z)/g, ' $1')
          name = name.charAt(0).toUpperCase() + name.slice(1)
        }
        return {
          event: x.event,
          fireOnce: x.fireOnce === undefined ? this.fireOnce : x.fireOnce,
          name,
          requiredAccuracy: x.requiredAccuracy === undefined ? this.requiredAccuracy : x.requiredAccuracy,
          throttleEvent: x.throttleEvent === undefined ? this.throttleEvents : x.throttleEvent,
          trainingDelay: x.trainingDelay === undefined ? this.trainingDelay : x.trainingDelay,
          trainingPrompt: x.trainingPrompt === undefined ? this.trainingPromptPrefix + name : x.trainingPrompt,
          trainingTime: x.trainingTime === undefined ? this.trainingTime : x.trainingTime,
          verificationDelay: x.verificationPromptPrefix === undefined ? this.verificationPromptPrefix : x.verificationPromptPrefix,
          verificationPrompt: x.verificationPrompt === undefined ? this.verificationPromptPrefix + name : x.verificationPrompt,
          verificationTime: x.verificationTime === undefined ? this.verificationTime : x.verificationTime
        }
      })
    }
  },
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
      this.prediction = this.computedGestures[res.classIndex]
      this.$emit(this.prediction.event)
      logits.dispose()
    },
    updateState () {
      if (this.preparing) {
        this.preparing = false
        return
      }
      if (this.currentGestureIndex < this.computedGestures.length - 1) {
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
