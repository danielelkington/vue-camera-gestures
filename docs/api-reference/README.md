# API Reference
## Props
|Prop name | Type | Default Value | Description|
| -------- | ---- | ------------- | ---- |
| __doVerification__ | `Boolean`| `true`     | If true, after training gestures the user will be prompted to verify them to establish that the model has been trained correctly. If false, the verification stage will be skipped.|
| __fireOnce__ | `Boolean`| `true`     | If true, an event will be fired when a user makes a gesture, but will not be fired again until either a different gesture is detected, or the user first returns to the neutral position.|
| __gestures__ | `array`| `undefined`     | See the [Gestures prop](#gestures-prop) notes|
| __model__ | `String`| `undefined`     | A trained model, in JSON format. If this is not `null` or `undefined`, training and verification will be skipped, and the provided model will be used.|
| __neutralTrainingPrompt__ | `String` | `'Maintain a neutral position'` | Displayed while training the neutral position.|
| __neutralVerification Prompt__ | `String` | `'Verify neutral position'` | Displayed while training the neutral position.|
| __requiredAccuracy__ | `Number` | `90` | A number between 0 and 100. Each gesture must have at least this percent accuracy during verification, otherwise the training cycle will repeat.|
| __showCameraFeed AfterTrainingCycle__ | `Boolean` | `true` | Whether the camera feed will be displayed after the training cycle has finished.|
| __showCameraFeed DuringTraining__ | `Boolean` | `true` | Whether the camera feed will be displayed while training gestures.|
| __showCameraFeed DuringVerification__ | `Boolean` | `true` | Whether the camera feed will be displayed while verifying gestures.|
| __throttleEvents__ | `Number` | `0` | Only has an effect if `fireOnce` is false. Throttles how often an event gets fired (in milliseconds) if the user persists with a gesture. If 0, the event will be fired each frame the user continues persisting with the gesture.|
| __trainingDelay__ | `Number` | `1000` | The number of milliseconds to wait after first displaying a prompt to train a gesture before the training of that gesture commences. Should be high enough to give the user time to start doing that gesture.|
| __trainingPromptPrefix__ | `String` | `'Perform a gesture: '` | Displayed before a gesture name when training the model.|
| __trainingTime__ | `Number` | `3000` | The number of milliseconds to spend taking snapshots from the camera feed and using them to train a model for a gesture.|
| __trainNeutralLast__ | `Boolean` | `false` | By default, the neutral gesture is trained and verified first. If this prop is true, it will be trained and verified last.|
| __verificationDelay__ | `Number` | `1000` | The number of milliseconds to wait after first displaying a prompt to verify a gesture before the verification of that gesture commences. Should be high enough to give the user time to start doing that gesture.|
| __verificationPrompt Prefix__ | `String` | `'Verify gesture: '` | Displayed before a gesture name when verifying the model.|
| __verificationTime__ | `Number` | `1000` | The number of milliseconds to spend taking snapshots from the camera feed and using them to verify that a gesture has been successfully trained.|
### gestures prop
The gestures prop is an array of objects for each gesture. Each object can have the following properties:
|Property name | Type  | Description|
| -------- | ---- |  ---- |
| __event__ | `String`| _Mandatory._ The name of the event that will be fired when this gesture is detected.|
| __fireOnce__ | `Boolean`| If true, an event will be fired when a user makes the gesture, but will not be fired again until either a different gesture is detected, or the user first returns to the neutral position.|
| __name__ | `String`| The name of the gesture shown in prompts.|
| __requiredAccuracy__ | `Number`| A number between 0 and 100. The gesture must have at least this percent accuracy during verification, otherwise the training cycle will repeat.|
| __throttleEvent__ | `Number`| Only has an effect if `fireOnce` is false (on this object or in a prop). Throttles how often an event gets fired (in milliseconds) if the user persists with this gesture. If 0, the event will be fired each frame the user continues persisting with the gesture.|
| __trainingDelay__ | `Number`| How many milliseconds to spend showing the user the prompt before starting to train the gesture.|
| __trainingPrompt__ | `String`| The prompt displayed before and while this gesture is being trained.|
| __trainingTime__ | `Number`| How many milliseconds to spend training the gesture.|
| __verificationDelay__ | `Number`| How many milliseconds to spend showing the user the prompt before starting to verify the gesture.|
| __verificationPrompt__ | `String`| The prompt displayed before and while this gesture is being verified.|
| __verificationTime__ | `Number`| How many milliseconds to spend verifying the gesture.|
## Events
|Event | Argument | Description|
| -------- | ---- | ------------- |
| __doneTraining__ |The trained model as a JSON string| Emitted when training has finished, and verification is about to start|
| __doneVerification__ |The trained model as a JSON string| Emitted when verification has successfully finished. At this point events will be fired if the user repeats the gestures.|
| __neutral__ ||Emitted when the neutral position is detected. The frequency is determined by the `fireOnce` and `throttleEvents` props.|
| __verificationFailed__ |The failed model as a JSON string| Emitted when verification has failed to meet the required accuracy. The training cycle will begin again.|

### Custom events
The `gestures` prop contains an array of objects where the `event` property has the name of an event that will be fired when the user performs that gesture.

If the `gestures` prop is not provided, gestures will be determined based on any events being listened to that are not one of the reserved events listed above.
## Slots
|Slot | Slot Props | Description|
| -------- | ---- | ------------- |
| __instructions__ |See the [guide](../guide/#customizing-the-instructions)| Customizes the appearance of the instructions|
| __loading__ |See the [guide](../guide/#customizing-the-initial-loading-indicator)| Customizes the appearance of the loading indicator that initially appears while the Mobilenet model is loading|
| __progress__ |See the [guide](../guide/#customizing-the-progress-bar)| Customizes the appearance of the progress bar|

<ClientOnly>
  <load-mobile-net></load-mobile-net>
</ClientOnly>