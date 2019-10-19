# [Vue Camera Gestures](https://vue.cameragestures.com)

Let users control your Vue app using AI, their camera, and gestures of their choice in just 1 line of HTML!

[Demo and full documentation](https://vue.cameragestures.com)

## Installation
```bash
npm i vue-camera-gestures --save
```
Register the component globally
```js
import CameraGestures from 'vue-camera-gestures'

Vue.component('camera-gestures', CameraGestures)
```

## Getting Started
```html
<camera-gestures @fancyGesture="doSomething()"></camera-gestures>
```
This will prompt the user to train and verify a 'Fancy Gesture'. When they perform this gesture the `doSomething()` method will be called.

The name and number of the events is completely configurable - subscribe to as many as you need.

To find out how to customize the component further, check out the [docs](https://vue.cameragestures.com).