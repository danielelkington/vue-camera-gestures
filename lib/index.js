import cameraGestures from './cameraGestures.vue'
import loadMobilenet from './loadMobilenet'

// Declare global variable in case being installed via script tag
if (typeof window !== 'undefined') {
  window.CameraGesturesComponent = cameraGestures
} else if (typeof global !== 'undefined') {
  global.CameraGesturesComponent = cameraGestures
}

export { loadMobilenet }

export default cameraGestures