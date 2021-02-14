<template>
  <div class="camera-gestures-container">
    <slot
      name="loading"
      :loading="busyLoadingMobilenet"
    >
      <div
        v-if="busyLoadingMobilenet"
        class="camera-gestures-loader-container"
      >
        <div class="camera-gestures-lds-ring">
          <div></div>
          <div></div>
          <div></div>
          <div></div>
        </div>
      </div>
    </slot>
    <video
      v-show="!busyLoadingMobilenet && showCameraFeed"
      ref="video"
      autoplay
      playsinline
      class="camera-gestures-camera-feed"
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
        class="camera-gestures-progress-bar"
      ></div>
    </slot>
    <slot
      name="instructions"
      :training="state === 'training'"
      :verifying="state === 'testing'"
      :event="currentEvent"
      :eventName="currentEventName"
    >
      <p
        v-show="currentInstruction"
        class="camera-gestures-instructions"
      >{{currentInstruction}}</p>
    </slot>
  </div>
</template>

<script>
// Heavily inspired by Charlie Gerard's teachable-keyboard https://github.com/charliegerard/teachable-keyboard
import loadMobilenet from './loadMobilenet'
import { browser as tfBrowser, tensor } from '@tensorflow/tfjs'
import { create as createKnnClassifier } from '@tensorflow-models/knn-classifier'
// K value for KNN
const TOPK = 10

export default {
  name: 'CameraGestures',
  props: {
    doVerification: {
      type: Boolean,
      default: true
    },
    fireOnce: {
      type: Boolean,
      default: true
    },
    gestures: {
      type: Array,
      default: undefined
    },
    model: {
      type: String,
      default: undefined
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
    showCameraFeedAfterTrainingCycle: {
      type: Boolean,
      default: true
    },
    showCameraFeedDuringTraining: {
      type: Boolean,
      default: true
    },
    showCameraFeedDuringVerification: {
      type: Boolean,
      default: true
    },
    throttleEvents: {
      type: Number,
      default: 0
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
  emits: ['done-training', 'done-verification', 'neutral', 'verification-failed'],
  data: function () {
    return {
      videoPlaying: false,
      busyLoadingMobilenet: true,
      // can be "training", "testing" or "predicting"
      state: 'training',
      preparing: false,
      // -1 indicates nothing, -2 indicates neutral
      currentGestureIndex: -1,
      timeStartedWaiting: null,
      timeToFinishWaiting: null,
      progress: 0,
      gestureVerifyingCorrectSamples: 0,
      gestureVerifyingIncorrectSamples: 0,
      verifyingRetried: false,
      lastGestureIndexDetected: -1,
      lastGestureDetectedTime: null
    }
  },
  computed: {
    computedGestures: function () {
      if (this.gestures === undefined) {
        const filteredEventNames = 
          Object.keys(this.$attrs)
            .filter(x => x.startsWith('on')) // events only
            .map(x => x.substring(2)) // remove "on" prefix
            .map(x => x.toLowerCase())
        return filteredEventNames.map(x => {
          // convert event name from camelCase to Sentence Case
          let name = x.replace(/([A-Z])/g, ' $1')
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
          name = x.event.replace(/([A-Z])/g, ' $1')
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
          verificationDelay: x.verificationDelay === undefined ? this.verificationDelay : x.verificationDelay,
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
    showCameraFeed: function () {
      switch (this.state) {
        case 'training': return this.showCameraFeedDuringTraining
        case 'testing': return this.showCameraFeedDuringVerification
        default: return this.showCameraFeedAfterTrainingCycle
      }
    },
    showProgressBar: function () {
      return this.currentGestureIndex !== -1 && !this.preparing
    }
  },
  mounted: async function () {
    this.knn = createKnnClassifier()
    this.mobilenet = await loadMobilenet()
    this.busyLoadingMobilenet = false
    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false
    })
    this.$refs.video.srcObject = this.mediaStream
    this.$refs.video.play()
    this.animationFrameId = requestAnimationFrame(this.animate)
    this.updateState()
    this.silenceWarnings()
  },
  unmounted: function () {
    if (this.knn) {
      this.knn.dispose()
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(x => x.stop())
    }
    this.unsilenceWarnings()
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
      const classIndex = parseInt(res.label)
      const gestureIndex = this.gestureIndexFromClassIndex(classIndex)
      const neutralDetected = gestureIndex === -2
      const gesture = neutralDetected
        ? undefined
        : this.computedGestures[gestureIndex]
      const event = neutralDetected ? 'neutral' : this.computedGestures[gestureIndex].event
      const fireOnce = neutralDetected ? this.fireOnce : gesture.fireOnce
      const throttleEvent = neutralDetected ? this.throttleEvents : gesture.throttleEvent

      const lastGestureIndex = this.lastGestureIndexDetected
      this.lastGestureIndexDetected = gestureIndex

      if (gestureIndex !== lastGestureIndex) {
        this.silenceWarnings()
        this.$emit(event)
        this.unsilenceWarnings()
        this.lastGestureDetectedTime = new Date().getTime()
      } else if (!fireOnce) {
        if (throttleEvent > 0) {
          const time = new Date().getTime()
          if (time - this.lastGestureDetectedTime >= throttleEvent) {
            this.silenceWarnings()
            this.$emit(event)
            this.unsilenceWarnings()
            this.lastGestureDetectedTime = time
          }
        } else {
          // event is to be fired every frame it is detected
          this.silenceWarnings()
          this.$emit(event)
          this.unsilenceWarnings()
        }
      }
      logits.dispose()
    },
    updateState () {
      // Model provided - skip everything and just use the given model
      if (this.model) {
        this.loadModelFromJson(this.model)
        this.state = 'predicting'
        this.currentGestureIndex = -1
        return
      }
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
            this.getModelJson().then(x => this.$emit('verification-failed', x))
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
        if (this.state === 'training' && this.doVerification) {
          this.getModelJson().then(x => this.$emit('done-training', x))
          this.state = 'testing'
          this.currentGestureIndex = !this.trainNeutralLast ? -2 : 0
          this.preparing = true
        } else {
          if (this.state === 'testing') {
            // verification completed successfully!
            this.getModelJson().then(x => this.$emit('done-verification', x))
          }
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
            : this.currentGesture.verificationTime
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
      this.verifyingRetried = false
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
    },
    async getModelJson () {
      // With thanks to https://github.com/tensorflow/tfjs/issues/633#issuecomment-660642769
      const dataset = this.knn.getClassifierDataset()
      const data = []
      for (const label in dataset) {
        data.push({
          label,
          values: Array.from(await dataset[label].data()),
          shape: dataset[label].shape
        })
      }
      return JSON.stringify(data)
    },
    loadModelFromJson (json) {
      // With thanks to https://github.com/tensorflow/tfjs/issues/633#issuecomment-660642769
      const model = JSON.parse(json)
      // convert back to tensor
      const dataset = {}
      model.forEach(example => {
        dataset[example.label] = tensor(example.values, example.shape)
      })
      this.knn.setClassifierDataset(dataset)
    },
    silenceWarnings () {
      // Vue will warn you if you emit an event that is not declared in `emits`.
      // Since our component emits events dynamically, we don't want to emit this warning.
      // This approach inspired from https://github.com/vuejs/vue-test-utils-next/pull/198/files
      this.consoleWarnSave = console.warn
      console.warn = (msg, ...rest) => {
        if (msg.includes('[Vue warn]: Component emitted event')) {
          return
        } else {
          this.consoleWarnSave(msg, ...rest)
        }
      }
    },
    unsilenceWarnings () {
      console.warn = this.consoleWarnSave
    }
  }
}
</script>

<style scoped>
.camera-gestures-container {
  width: 227px;
}
/* Mirror the video */
video.camera-gestures-camera-feed {
  transform: rotateY(180deg);
  -webkit-transform: rotateY(180deg); /* Safari and Chrome */
  -moz-transform: rotateY(180deg); /* Firefox */
  width: 227px;
  max-width: 100%;
}
.camera-gestures-progress-bar {
  height: 5px;
  background: #41b883;
  border-radius: 5px 0 0 5px;
}
.camera-gestures-progress-bar.invisible {
  background: none;
}
.camera-gestures-instructions {
  text-align: center;
}

.camera-gestures-loader-container {
  width: 227px;
  height: 100px;
}
/* Loader CSS from https://loading.io/css/ */
.camera-gestures-lds-ring {
  display: block;
  position: relative;
  left: calc(50% - 32px);
  top: calc(50% - 32px);
  width: 64px;
  height: 64px;
}
.camera-gestures-lds-ring div {
  box-sizing: border-box;
  display: block;
  position: absolute;
  width: 51px;
  height: 51px;
  margin: 6px;
  border: 6px solid #41b883;
  border-radius: 50%;
  animation: camera-gestures-lds-ring 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite;
  border-color: #41b883 transparent transparent transparent;
}
.camera-gestures-lds-ring div:nth-child(1) {
  animation-delay: -0.45s;
}
.camera-gestures-lds-ring div:nth-child(2) {
  animation-delay: -0.3s;
}
.camera-gestures-lds-ring div:nth-child(3) {
  animation-delay: -0.15s;
}
@keyframes camera-gestures-lds-ring {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
