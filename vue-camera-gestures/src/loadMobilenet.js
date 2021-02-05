import { load as loadMobilenetModule } from '@tensorflow-models/mobilenet'

export default async () => {
  if (window.vueCameraGestures_loadMobilenetPromise) {
    await window.vueCameraGestures_loadMobilenetPromise
    return window.vueCameraGestures_mobilenet
  }
  if (window.vueCameraGestures_mobilenet) {
    return window.vueCameraGestures_mobilenet
  }
  window.vueCameraGestures_loadMobilenetPromise = loadMobilenetModule()
    .then(x => { window.vueCameraGestures_mobilenet = x })
    .catch(x => {
      window.vueCameraGestures_loadMobilenetPromise = undefined
      throw x
    })
  await window.vueCameraGestures_loadMobilenetPromise
  return window.vueCameraGestures_mobilenet
}
