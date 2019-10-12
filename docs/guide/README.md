# Guide 
Vue Camera Gestures is a component that when placed on a page will
- Request access to the user's camera
- Prompt the user to train a number of configurable gestures
- Prompt the user to repeat the gestures to verify the AI model
- Emit events when the user performs the gestures

## Demo
<ClientOnly>
  <demo-01></demo-01>
</ClientOnly>

```html
<template>
  <div>
    <div>{{direction}}</div>
    <camera-gestures @left="direction = 'Left'" @right="direction = 'Right'"></camera-gestures>
  </div>
</template>

<script>
export default {
  data () {
    return {
      direction: 'Left'
    }
  }
}
</script>
```

## Basic Example
```html
<camera-gestures @customEvent1="customEvent1()" @customEvent2="customEvent2()" @customEvent3="customEvent3()"></camera-gestures>
```
This will
- Prompt the user to train three separate gestures of their choice using their device's camera (as well as a neutral position)
- Once training is completed, the events will be fired when the user performs the gestures.

Note that __the name and number of the events is completely configurable__ - you can simply subscribe to as many as you need.
## Installation
### via npm
```bash
npm i vue-camera-gestures --save
```
Register the component globally
```js
import { CameraGestures } from 'vue-camera-gestures'

Vue.component('camera-gestures', CameraGestures)
```
Or register it in a Single File Component
```html
<script>
import { CameraGestures } from 'vue-camera-gestures'

export default {
  components: {
    CameraGestures
  }
}
</script>
```
You can ignore the peer dependency warning as the Tensorflow JS libraries are bundled with the component.
### via CDN
```html
<script src="https://unpkg.com/vue-camera-gestures"></script>
```
## Installing without the bundled version of Tensorflow
By default the Tensorflow JS library is bundled with the component, but this may not be the desired behaviour, such as if you are separately using Tensorflow in your project. The library can be imported without Tensorflow as follows:
### via npm
```bash
npm i @tensorflow/tfjs --save
npm i @tensorflow-models/knn-classifier --save
npm i @tensorflow-models/mobilenet --save
npm i vue-camera-gestures --save
```

Register the component globally
```js
import CameraGestures from 'vue-camera-gestures/dist/vue-camera-gestures-plain.esm.js'

Vue.component('camera-gestures', CameraGestures)
```
Or register it in a Single File Component
```html
<script>
import CameraGestures from 'vue-camera-gestures/dist/vue-camera-gestures-plain.esm.js'

export default {
  components: {
    CameraGestures
  }
}
</script>
```

### via CDN
```html
<script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs"></script>
<script src="https://cdn.jsdelivr.net/npm/@tensorflow-models/mobilenet"></script>
<script src="https://cdn.jsdelivr.net/npm/@tensorflow-models/knn-classifier"></script>
<script src="https://unpkg.com/vue-camera-gestures/dist/vue-camera-gestures-plain.min.js"></script>
```

# Getting Started
The simplest way to specify both the gestures to be trained and to subscribe to events is to simply subscribe to an event with a name of your choice. Please note that there are a number of reserved event names.
```html
<camera-gestures @fancyGesture="doSomething()"></camera-gestures>
```
Event names in pascal case or with hyphens will be split into separate capitalized words.
- When the gestures is being trained the user will see the prompt `Perform a gesture: Fancy Gesture`
- When the AI model is being tested, the user will see the prompt `Verify gesture: Fancy Gesture`
## Customizing prompts
The following code:
```html
<camera-gestures
  :gestures="[
    {event: 'left', name: 'Go Left'},
    {event: 'right', name: 'Go Right'}
  ]"
  @left="left()"
  @right="right()">
</camera-gestures>
```
will display prompts such as:
- `Perform a gesture: Go Left`
- `Verify gesture: Go Left`

Props are available to let you customize the training and verification prefixes. The following code:
```html
<camera-gestures
  trainingPromptPrefix="Signal with your hand: "
  verificationPromptPrefix="Again, signal with your hand: "
  :gestures="[
    {event: 'left', name: 'Go Left'},
    {event: 'right', name: 'Go Right'}
  ]"
  @left="left()"
  @right="right()">
</camera-gestures>
```
will display prompts such as:
- `Signal with your hand: Go Left`
- `Again, signal with your hand: Go Left`

To customize the full prompts for each event:
```html
<camera-gestures
  :gestures="[
    {event: 'left', trainingPrompt: 'Raise your left hand', verificationPrompt: 'Raise your left hand again'},
    {event: 'right', trainingPrompt: 'Now raise your right hand', verificationPrompt: 'Raise your right hand again'}
  ]"
  @left="left()"
  @right="right()">
</camera-gestures>
```
The default "neutral" prompts are:
- `Maintain a neutral position`
- `Verify neutral position`

These can be customized, as shown:
```html
<camera-gestures
  neutralTrainingPrompt="Do nothing"
  neutralVerificationPrompt="Again, do nothing">
</camera-gestures>
```
## Event frequency
By default, an event will be fired __once__ when the user makes the gesture, and will not be fired again until either
  - a different gesture is detected or
  - the user first returns to the neutral position.

This behaviour can be turned off using the `fireOnce` prop. If set to false events will be fired each frame they are detected.
```html
<camera-gestures :fireOnce="false"></camera-gestures>
```
To limit how often the same event can be fired, use the `throttleEvents` prop, specifying a number of milliseconds. If the user persists with a gesture, its event will be fired straight away, and then at the specified interval.

In the following example, if the user persisted the `up` gesture, the `up()` method would be called immediately, and then once every second. 
```html
<camera-gestures :fireOnce="false" :throttleEvents="1000" @up="up()"></camera-gestures>
```
These settings can also be customized per gesture.

```html
<camera-gestures
  :gestures="[
    {event: 'left', fireOnce: false, throttleEvent: 1000},
    {event: 'right', fireOnce: false, throttleEvent: 200}
  ]"
  @left="left()"
  @right="right()">
</camera-gestures>
```
## Customizing the appearance
By default the component displays a feed from the user's camera with a progress bar below it (when training or verifying), and then an instruction.
After the training cycle has completed, only the camera feed is displayed by default.
### Hiding the camera feed
The camera feed can be turned off at various points using the `showCameraFeedDuringTraining`, `showCameraFeedDuringVerification` and `showCameraFeedAfterTrainingCycle` props.
```html
<camera-gestures
  :showCameraFeedDuringTraining="false"
  :showCameraFeedDuringVerification="false"
  :showCameraFeedAfterTrainingCycle="false"
  ></camera-gestures>
```
### Customizing the progress bar
The progress bar can be customized using the `progress` slot. The slot props object contains the following properties:
- `inProgress`: `Boolean` Whether something is in progress and a progress bar should be displayed
- `progress`: `Number` A number between 0 and 1 indicating the current progress

For example, to instead render a custom progress bar (if you have elsewhere defined `my-progress-bar`):
```html
<camera-gestures>
  <template v-slot:progress="{inProgress, progress}">
    <my-progress-bar v-if="inProgress" :percent="progress * 100"></my-progress-bar>
  <template>
</camera-gestures>
```

### Customizing the instructions
The displayed instructions can be customized using the `instructions` slot. The slot props object contains the following properties:
- `training`: `Boolean` Whether a gesture is being trained
- `verifying`: `Boolean` Whether a gesture is being verified
- `event`: `String` The event being trained or verified. Could be `neutral`.
- `eventName`: `String` The custom name of the event being trained or verified, if provided
```html
<camera-gestures @left="left()" @right="right()">
  <template v-slot:instructions="{training, verifying, event}">
    <span v-if="training">Train the following event: <strong>{{event}}</strong></span>
    <span v-if="verifying">Verify the following event: <strong>{{event}}</strong></span>
  </template>
</camera-gestures>
```
## Training
By default, the component will begin training as soon as it is rendered onto the page and is given camera permission. It has the following behaviour by default:
1. Prompt the user to make a neutral position, and after one second delay, displays a progress bar for three seconds while it trains the neutral position based on the camera input.
1. Loops through each gesture. For each gesture, prompts the user to make the gesture, and after one second delay, displays a progress bar for three second while it trains that gesture based on the camera input.
1. Prompts the user to make the neutral position, and after one second delay, displays a progress bar for one second while it verifies the neutral position.
1. Loops through each gesture. For each gesture, prompts the user to make the gesture, and after one second delay, displays a progress bar for one second while it verifies the gesture.
1. If any gesture is identified with less than 90% accuracy, the user is given an extra second to verify it, and if it fails with less than 90% accuracy again, training will begin again from step 1.
1. Once all gestures are verified with more than 90% accuracy, the instructions will disappear (but the camera feed remains), and events will be fired when gestures are recognised.
### Starting training
The component will begin training each of the events as soon as it is rendered onto the page. You can customize when the training starts using the v-if prop. For example, the following code will only start training the gestures when the button is clicked.
```html
<template>
  <button v-if="!cameraGesturesOn" @click="cameraGesturesOn=true">Start Training</button>
  <camera-gestures v-if="cameraGesturesOn"></camera-gestures>
</template>

<script>
export default {
  data () {
    return {
      cameraGesturesOn: false
    }
  }
}
</script>
```
### Training the neutral position
By default the neutral position will be trained first, before any of the other events. You can train it last instead with the `trainNeutralLast` prop.
```html
<camera-gestures :trainNeutralLast="true"></camera-gestures>
```
### Disabling verification
Verification can be turned off with the `doVerification` prop.
```html
<camera-gestures :doVerification="false"></camera-gestures>
```
### Training/Verifying timing
By default,
- There is a delay of 1 second before gestures are trained/verified to give the user time to start doing them,
- Gestures are trained for 3 seconds
- Gestures are verified for 1 second

These values can be customized for all gestures (including neutral) by providing the following props with values in milliseconds:
```html
<camera-gestures
  :trainingDelay="2000"
  :verificationDelay="800"
  :trainingTime="1000"
  :verificationTime="500"></camera-gestures>
```
These can also be customized per gesture.
```html
<camera-gestures
  :gestures="[
    {event: 'left', trainingDelay: 2000, trainingTime: 2500},
    {event: 'right', verificationDelay: 800, verificationTime: 1500}
  ]"
  @left="left()"
  @right="right()">
</camera-gestures>
```

### Accuracy
By default 90% accuracy during verification is needed before events will be fired. This can be modified using the `requiredAccuracy` prop, which accepts a number between 0 and 100.
```html
<camera-gestures :requiredAccuracy="100"></camera-gestures>
```
This can also be customized per gesture.
```html
<camera-gestures
  :gestures="[
    {event: 'left', requiredAccuracy: 100},
    {event: 'right', requiredAccuracy: 50}
  ]"
  @left="left()"
  @right="right()">
</camera-gestures>
```
## Saving the generated model
Due to differences in lighting conditions, how far the user is positioned from the camera, background noise, choice of gestures, etc, for best results it is recommended that gestures be trained each time before the user uses them.

It is, however, possible to save and load models generated through training. A trained model can be retrieved by subscribing to the @doneTraining event.
```html
<template>
  <camera-gestures @doneTraining="doneTraining"></camera-gestures>
</template>

<script>
export default {
  methods: {
    async doneTraining: function (model) {
      await this.$axios.post('myapi/saveModel', model)
    }
  }
}
</script>
```

A model, in JSON format, can be provided using the `model` prop. If this is not `null` or `undefined`, training and verification will be skipped, and the provided model will be used.
```html
<template>
  <camera-gestures v-if="modelLoaded" :model="model"></camera-gestures>
</template>

<script>
export default {
  data () {
    return {
      model: null,
      modelLoaded: false
    }
  }
  async mounted () {
    const res = await this.$axios.get('myapi/getModel')
    this.model = res.data
    this.modelLoaded = true
  }
}
</script>
```