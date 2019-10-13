<template>
  <div>
    <video
      ref="video"
      autoplay
      playsinline
      width="227"
      @playing="videoPlaying = true"
      @pause="videoPlaying = false"
    ></video>
    <slot
      name="progress"
      :inProgress="showProgressBar"
      :progress="progress"
    >
      <div
        :style="{width: (progress * 227.0) + 'px'}"
        :class="{invisible: !showProgressBar}"
        class="progress-bar"
      ></div>
    </slot>
    <slot
      name="instructions"
      :training="state === 'training'"
      :verifying="state === 'verifying'"
      :event="currentEvent"
      :eventName="currentEventName"
    >
      <p v-show="currentInstruction">{{currentInstruction}}</p>
    </slot>

    <button @click="reset">Reset</button>
  </div>
</template>

<script>
// Heavily inspired by Charlie Gerard's teachable-keyboard https://github.com/charliegerard/teachable-keyboard
import { load as loadMobilenetModule } from '@tensorflow-models/mobilenet'
import { browser as tfBrowser } from '@tensorflow/tfjs'
import { create as createKnnClassifier } from '@tensorflow-models/knn-classifier'
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
    neutralTrainingPrompt: {
      type: String,
      default: 'Maintain a neutral position'
    },
    neutralVerificationPrompt: {
      type: String,
      default: 'Verify neutral position'
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
    trainNeutralLast: {
      type: Boolean,
      default: false
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
        const filteredEventNames = Object.keys(this.$listeners).filter(x => !reservedEventNames.includes(x.toUpperCase()))
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
    },
    currentGesture: function () {
      return this.currentGestureIndex > -1
        ? this.computedGestures[this.currentGestureIndex]
        : undefined
    },
    currentEvent: function () {
      switch (this.currentGestureIndex) {
        case -2: return 'neutral'
        case -1: return undefined
        default: return this.currentGesture.event
      }
    },
    currentEventName: function () {
      return this.currentGesture === undefined
        ? undefined
        : this.currentGesture.name
    },
    currentInstruction: function () {
      if (this.state === 'training') {
        switch (this.currentGestureIndex) {
          case -2: return this.neutralTrainingPrompt
          case -1: return undefined
          default: return this.currentGesture.trainingPrompt
        }
      } else if (this.state === 'testing') {
        switch (this.currentGestureIndex) {
          case -2: return this.neutralVerificationPrompt
          case -1: return undefined
          default: return this.currentGesture.verificationPrompt
        }
      }
      return undefined
    },
    showProgressBar: function () {
      return this.currentGestureIndex !== -1 && !this.preparing
    }
  },
  mounted: async function () {
    this.knn = createKnnClassifier()
    this.mobilenet = await loadMobilenetModule()
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false
    })
    this.$refs.video.srcObject = stream
    this.$refs.video.play()
    this.animationFrameId = requestAnimationFrame(this.animate)
    this.updateState()
  },
  data: function () {
    return {
      videoPlaying: false,
      // can be "training", "testing" or "predicting"
      state: 'training',
      preparing: false,
      // -1 indicates nothing, -2 indicates neutral
      currentGestureIndex: -1,
      prediction: null,
      timeStartedWaiting: null,
      timeToFinishWaiting: null,
      progress: 0,
      gestureVerifyingCorrectSamples: 0,
      gestureVerifyingIncorrectSamples: 0,
      verifyingRetried: false
    }
  },
  methods: {
    async animate () {
      if (this.videoPlaying) {
        // Get image data from video element
        const image = tfBrowser.fromPixels(this.$refs.video)
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
        const classIndex = this.classIndexFromGestureIndex(this.currentGestureIndex)
        const logits = this.mobilenet.infer(image, 'conv_preds')
        this.knn.addExample(logits, classIndex)
        logits.dispose()
      }
    },
    async testFrame (image) {
      if (this.currentGestureIndex !== -1 && !this.preparing) {
        const logits = this.mobilenet.infer(image, 'conv_preds')
        const res = await this.knn.predictClass(logits, TOPK)
        const gestureIndex = this.gestureIndexFromClassIndex(res.classIndex)
        if (gestureIndex === this.currentGestureIndex) {
          this.gestureVerifyingCorrectSamples++
        } else {
          this.gestureVerifyingIncorrectSamples++
        }
        logits.dispose()
      }
    },
    async predictFrame (image) {
      const logits = this.mobilenet.infer(image, 'conv_preds')
      const res = await this.knn.predictClass(logits, TOPK)
      const gestureIndex = this.gestureIndexFromClassIndex(res.classIndex)
      if (gestureIndex === -2) {
        this.$emit('neutral')
      } else {
        this.prediction = this.computedGestures[gestureIndex]
        this.$emit(this.prediction.event)
      }
      logits.dispose()
    },
    updateState () {
      if (this.preparing) {
        this.preparing = false
        this.scheduleUpdateState()
        requestAnimationFrame(this.updateProgress)
        return
      }

      // If testing, retry if necessary
      if (this.state === 'testing') {
        const accuracy = (this.gestureVerifyingCorrectSamples + 0.0) * 100 / (this.gestureVerifyingCorrectSamples + this.gestureVerifyingIncorrectSamples)
        const requiredAccuracy = this.currentGestureIndex === -2
          ? this.requiredAccuracy
          : this.currentGesture.requiredAccuracy
        if (accuracy < requiredAccuracy) {
          if (this.verifyingRetried) {
            // Go back to start
            this.reset()
            return
          } else {
            this.verifyingRetried = true
            this.preparing = true
            this.gestureVerifyingIncorrectSamples = this.gestureVerifyingCorrectSamples = 0
            this.scheduleUpdateState()
            return
          }
        }
        this.verifyingRetried = false
        this.gestureVerifyingIncorrectSamples = this.gestureVerifyingCorrectSamples = 0
      }

      // Go to neutral in current cycle if necessary
      const doneLastGesture = this.currentGestureIndex === this.computedGestures.length - 1
      if ((this.currentGestureIndex === -1 && !this.trainNeutralLast) ||
        (doneLastGesture && this.trainNeutralLast)) {
        this.currentGestureIndex = -2 // neutral
        this.preparing = true
        this.scheduleUpdateState()
        return
      }

      // Move state up one
      if ((this.currentGestureIndex === -2 && this.trainNeutralLast) ||
        doneLastGesture) {
        if (this.state === 'training') {
          this.state = 'testing'
          this.currentGestureIndex = !this.trainNeutralLast ? -2 : 0
          this.preparing = true
        } else {
          this.state = 'predicting'
          this.currentGestureIndex = -1
        }
        this.scheduleUpdateState()
        return
      }
      // Otherwise move gesture up one
      this.currentGestureIndex = this.currentGestureIndex === -2
        ? 0
        : this.currentGestureIndex + 1
      this.preparing = true
      this.scheduleUpdateState()
    },
    scheduleUpdateState () {
      let millisecondsToWait
      if (this.state === 'training') {
        if (this.currentGestureIndex === -2) {
          millisecondsToWait = this.preparing
            ? this.trainingDelay
            : this.trainingTime
        } else if (this.currentGestureIndex > -1) {
          millisecondsToWait = this.preparing
            ? this.currentGesture.trainingDelay
            : this.currentGesture.trainingTime
        } else {
          return
        }
      } else if (this.state === 'testing') {
        if (this.currentGestureIndex === -2) {
          millisecondsToWait = this.preparing
            ? this.verificationDelay
            : this.verificationTime
        } else if (this.currentGestureIndex > -1) {
          millisecondsToWait = this.preparing
            ? this.currentGesture.verificationDelay
            : this.verificationTime
        } else {
          return
        }
      } else {
        return
      }
      this.timeStartedWaiting = new Date().getTime()
      this.timeToFinishWaiting = this.timeStartedWaiting + millisecondsToWait
      this.updateStateTimeoutId = setTimeout(this.updateState, millisecondsToWait)
    },
    updateProgress () {
      const total = this.timeToFinishWaiting - this.timeStartedWaiting
      const currentMilliseconds = new Date().getTime() - this.timeStartedWaiting
      if (currentMilliseconds > total) {
        this.progress = 1.0
      } else {
        this.progress = currentMilliseconds / total
      }
      if (this.showProgressBar) {
        requestAnimationFrame(this.updateProgress)
      }
    },
    reset () {
      this.knn.clearAllClasses()
      this.state = 'training'
      this.preparing = false
      this.currentGestureIndex = -1
      clearTimeout(this.updateStateTimeoutId)
      this.updateState()
    },
    // Class indexes must be in order of training!
    classIndexFromGestureIndex (gestureIndex) {
      if (this.trainNeutralLast) {
        return gestureIndex === -2 ? this.computedGestures.length : gestureIndex
      } else {
        return gestureIndex === -2 ? 0 : gestureIndex + 1
      }
    },
    gestureIndexFromClassIndex (classIndex) {
      if (this.trainNeutralLast) {
        return classIndex === this.computedGestures.length ? -2 : classIndex
      } else {
        return classIndex === 0 ? -2 : classIndex - 1
      }
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
.progress-bar {
  height: 5px;
  background: #41b883;
  border-radius: 5px 0 0 5px;
}
.progress-bar.invisible {
  background: none;
}
</style>
