(function (global, factory) {
            typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('@tensorflow-models/mobilenet'), require('@tensorflow/tfjs'), require('@tensorflow-models/knn-classifier')) :
            typeof define === 'function' && define.amd ? define(['exports', '@tensorflow-models/mobilenet', '@tensorflow/tfjs', '@tensorflow-models/knn-classifier'], factory) :
            (global = global || self, factory(global.CameraGestures = {}, global.mobilenet, global.tf, global.knnClassifier));
}(this, (function (exports, mobilenet, tfjs, knnClassifier) { 'use strict';

            var global$1 = (typeof global !== "undefined" ? global :
                        typeof self !== "undefined" ? self :
                        typeof window !== "undefined" ? window : {});

            async function loadMobilenet () {
              if (window.vueCameraGestures_loadMobilenetPromise) {
                await window.vueCameraGestures_loadMobilenetPromise;
                return window.vueCameraGestures_mobilenet
              }
              if (window.vueCameraGestures_mobilenet) {
                return window.vueCameraGestures_mobilenet
              }
              window.vueCameraGestures_loadMobilenetPromise = mobilenet.load()
                .then(function (x) { window.vueCameraGestures_mobilenet = x; })
                .catch(function (x) {
                  window.vueCameraGestures_loadMobilenetPromise = undefined;
                  throw x
                });
              await window.vueCameraGestures_loadMobilenetPromise;
              return window.vueCameraGestures_mobilenet
            }

            //
            // K value for KNN
            var TOPK = 10;

            var script = {
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
                  type: Array
                },
                model: {
                  type: String
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
              computed: {
                computedGestures: function () {
                  var this$1 = this;

                  if (this.gestures === undefined) {
                    var reservedEventNames = [
                      'DONETRAINING',
                      'DONEVERIFICATION',
                      'NEUTRAL',
                      'VERIFICATIONFAILED'
                    ];
                    var filteredEventNames = Object.keys(this.$listeners).filter(function (x) { return !reservedEventNames.includes(x.toUpperCase()); });
                    return filteredEventNames.map(function (x) {
                      // convert event name from camelCase to Sentence Case
                      var name = x.replace(/([A-Z])/g, ' $1');
                      name = name.charAt(0).toUpperCase() + name.slice(1);
                      return {
                        event: x,
                        fireOnce: this$1.fireOnce,
                        name: name,
                        requiredAccuracy: this$1.requiredAccuracy,
                        throttleEvent: this$1.throttleEvents,
                        trainingDelay: this$1.trainingDelay,
                        trainingPrompt: this$1.trainingPromptPrefix + name,
                        trainingTime: this$1.trainingTime,
                        verificationDelay: this$1.verificationDelay,
                        verificationPrompt: this$1.verificationPromptPrefix + name,
                        verificationTime: this$1.verificationTime,
                        isNeutral: false
                      }
                    })
                  }
                  return this.gestures.map(function (x) {
                    var name;
                    if (x.name) {
                      name = x.name;
                    } else {
                      name = x.event.replace(/([A-Z])/g, ' $1');
                      name = name.charAt(0).toUpperCase() + name.slice(1);
                    }
                    return {
                      event: x.event,
                      fireOnce: x.fireOnce === undefined ? this$1.fireOnce : x.fireOnce,
                      name: name,
                      requiredAccuracy: x.requiredAccuracy === undefined ? this$1.requiredAccuracy : x.requiredAccuracy,
                      throttleEvent: x.throttleEvent === undefined ? this$1.throttleEvents : x.throttleEvent,
                      trainingDelay: x.trainingDelay === undefined ? this$1.trainingDelay : x.trainingDelay,
                      trainingPrompt: x.trainingPrompt === undefined ? this$1.trainingPromptPrefix + name : x.trainingPrompt,
                      trainingTime: x.trainingTime === undefined ? this$1.trainingTime : x.trainingTime,
                      verificationDelay: x.verificationDelay === undefined ? this$1.verificationDelay : x.verificationDelay,
                      verificationPrompt: x.verificationPrompt === undefined ? this$1.verificationPromptPrefix + name : x.verificationPrompt,
                      verificationTime: x.verificationTime === undefined ? this$1.verificationTime : x.verificationTime
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
                this.knn = knnClassifier.create();
                this.mobilenet = await loadMobilenet();
                this.busyLoadingMobilenet = false;
                this.mediaStream = await navigator.mediaDevices.getUserMedia({
                  video: true,
                  audio: false
                });
                this.$refs.video.srcObject = this.mediaStream;
                this.$refs.video.play();
                this.animationFrameId = requestAnimationFrame(this.animate);
                this.updateState();
              },
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
              methods: {
                animate: async function animate () {
                  if (this.videoPlaying) {
                    // Get image data from video element
                    var image = tfjs.browser.fromPixels(this.$refs.video);
                    switch (this.state) {
                      case 'training':
                        this.trainFrame(image);
                        break
                      case 'testing':
                        this.testFrame(image);
                        break
                      case 'predicting':
                        this.predictFrame(image);
                        break
                    }

                    image.dispose();
                  }
                  this.animationFrameId = requestAnimationFrame(this.animate);
                },
                trainFrame: function trainFrame (image) {
                  if (this.currentGestureIndex !== -1 && !this.preparing) {
                    var classIndex = this.classIndexFromGestureIndex(this.currentGestureIndex);
                    var logits = this.mobilenet.infer(image, 'conv_preds');
                    this.knn.addExample(logits, classIndex);
                    logits.dispose();
                  }
                },
                testFrame: async function testFrame (image) {
                  if (this.currentGestureIndex !== -1 && !this.preparing) {
                    var logits = this.mobilenet.infer(image, 'conv_preds');
                    var res = await this.knn.predictClass(logits, TOPK);
                    var gestureIndex = this.gestureIndexFromClassIndex(res.classIndex);
                    if (gestureIndex === this.currentGestureIndex) {
                      this.gestureVerifyingCorrectSamples++;
                    } else {
                      this.gestureVerifyingIncorrectSamples++;
                    }
                    logits.dispose();
                  }
                },
                predictFrame: async function predictFrame (image) {
                  var logits = this.mobilenet.infer(image, 'conv_preds');
                  var res = await this.knn.predictClass(logits, TOPK);
                  var classIndex = parseInt(res.label);
                  var gestureIndex = this.gestureIndexFromClassIndex(classIndex);
                  var neutralDetected = gestureIndex === -2;
                  var gesture = neutralDetected
                    ? undefined
                    : this.computedGestures[gestureIndex];
                  var event = neutralDetected ? 'neutral' : this.computedGestures[gestureIndex].event;
                  var fireOnce = neutralDetected ? this.fireOnce : gesture.fireOnce;
                  var throttleEvent = neutralDetected ? this.throttleEvents : gesture.throttleEvent;

                  var lastGestureIndex = this.lastGestureIndexDetected;
                  this.lastGestureIndexDetected = gestureIndex;

                  if (gestureIndex !== lastGestureIndex) {
                    this.$emit(event);
                    this.lastGestureDetectedTime = new Date().getTime();
                  } else if (!fireOnce) {
                    if (throttleEvent > 0) {
                      var time = new Date().getTime();
                      if (time - this.lastGestureDetectedTime >= throttleEvent) {
                        this.$emit(event);
                        this.lastGestureDetectedTime = time;
                      }
                    } else {
                      // event is to be fired every frame it is detected
                      this.$emit(event);
                    }
                  }
                  logits.dispose();
                },
                updateState: function updateState () {
                  var this$1 = this;

                  // Model provided - skip everything and just use the given model
                  if (this.model) {
                    this.loadModelFromJson(this.model);
                    this.state = 'predicting';
                    this.currentGestureIndex = -1;
                    return
                  }
                  if (this.preparing) {
                    this.preparing = false;
                    this.scheduleUpdateState();
                    requestAnimationFrame(this.updateProgress);
                    return
                  }

                  // If testing, retry if necessary
                  if (this.state === 'testing') {
                    var accuracy = (this.gestureVerifyingCorrectSamples + 0.0) * 100 / (this.gestureVerifyingCorrectSamples + this.gestureVerifyingIncorrectSamples);
                    var requiredAccuracy = this.currentGestureIndex === -2
                      ? this.requiredAccuracy
                      : this.currentGesture.requiredAccuracy;
                    if (accuracy < requiredAccuracy) {
                      if (this.verifyingRetried) {
                        // Go back to start
                        this.getModelJson().then(function (x) { return this$1.$emit('verificationFailed', x); });
                        this.reset();
                        return
                      } else {
                        this.verifyingRetried = true;
                        this.preparing = true;
                        this.gestureVerifyingIncorrectSamples = this.gestureVerifyingCorrectSamples = 0;
                        this.scheduleUpdateState();
                        return
                      }
                    }
                    this.verifyingRetried = false;
                    this.gestureVerifyingIncorrectSamples = this.gestureVerifyingCorrectSamples = 0;
                  }

                  // Go to neutral in current cycle if necessary
                  var doneLastGesture = this.currentGestureIndex === this.computedGestures.length - 1;
                  if ((this.currentGestureIndex === -1 && !this.trainNeutralLast) ||
                    (doneLastGesture && this.trainNeutralLast)) {
                    this.currentGestureIndex = -2; // neutral
                    this.preparing = true;
                    this.scheduleUpdateState();
                    return
                  }

                  // Move state up one
                  if ((this.currentGestureIndex === -2 && this.trainNeutralLast) ||
                    doneLastGesture) {
                    if (this.state === 'training' && this.doVerification) {
                      this.getModelJson().then(function (x) { return this$1.$emit('doneTraining', x); });
                      this.state = 'testing';
                      this.currentGestureIndex = !this.trainNeutralLast ? -2 : 0;
                      this.preparing = true;
                    } else {
                      if (this.state === 'testing') {
                        // verification completed successfully!
                        this.getModelJson().then(function (x) { return this$1.$emit('doneVerification', x); });
                      }
                      this.state = 'predicting';
                      this.currentGestureIndex = -1;
                    }
                    this.scheduleUpdateState();
                    return
                  }
                  // Otherwise move gesture up one
                  this.currentGestureIndex = this.currentGestureIndex === -2
                    ? 0
                    : this.currentGestureIndex + 1;
                  this.preparing = true;
                  this.scheduleUpdateState();
                },
                scheduleUpdateState: function scheduleUpdateState () {
                  var millisecondsToWait;
                  if (this.state === 'training') {
                    if (this.currentGestureIndex === -2) {
                      millisecondsToWait = this.preparing
                        ? this.trainingDelay
                        : this.trainingTime;
                    } else if (this.currentGestureIndex > -1) {
                      millisecondsToWait = this.preparing
                        ? this.currentGesture.trainingDelay
                        : this.currentGesture.trainingTime;
                    } else {
                      return
                    }
                  } else if (this.state === 'testing') {
                    if (this.currentGestureIndex === -2) {
                      millisecondsToWait = this.preparing
                        ? this.verificationDelay
                        : this.verificationTime;
                    } else if (this.currentGestureIndex > -1) {
                      millisecondsToWait = this.preparing
                        ? this.currentGesture.verificationDelay
                        : this.currentGesture.verificationTime;
                    } else {
                      return
                    }
                  } else {
                    return
                  }
                  this.timeStartedWaiting = new Date().getTime();
                  this.timeToFinishWaiting = this.timeStartedWaiting + millisecondsToWait;
                  this.updateStateTimeoutId = setTimeout(this.updateState, millisecondsToWait);
                },
                updateProgress: function updateProgress () {
                  var total = this.timeToFinishWaiting - this.timeStartedWaiting;
                  var currentMilliseconds = new Date().getTime() - this.timeStartedWaiting;
                  if (currentMilliseconds > total) {
                    this.progress = 1.0;
                  } else {
                    this.progress = currentMilliseconds / total;
                  }
                  if (this.showProgressBar) {
                    requestAnimationFrame(this.updateProgress);
                  }
                },
                reset: function reset () {
                  this.knn.clearAllClasses();
                  this.state = 'training';
                  this.preparing = false;
                  this.currentGestureIndex = -1;
                  this.verifyingRetried = false;
                  clearTimeout(this.updateStateTimeoutId);
                  this.updateState();
                },
                // Class indexes must be in order of training!
                classIndexFromGestureIndex: function classIndexFromGestureIndex (gestureIndex) {
                  if (this.trainNeutralLast) {
                    return gestureIndex === -2 ? this.computedGestures.length : gestureIndex
                  } else {
                    return gestureIndex === -2 ? 0 : gestureIndex + 1
                  }
                },
                gestureIndexFromClassIndex: function gestureIndexFromClassIndex (classIndex) {
                  if (this.trainNeutralLast) {
                    return classIndex === this.computedGestures.length ? -2 : classIndex
                  } else {
                    return classIndex === 0 ? -2 : classIndex - 1
                  }
                },
                getModelJson: async function getModelJson () {
                  // With thanks to https://github.com/tensorflow/tfjs/issues/633#issuecomment-660642769
                  var dataset = this.knn.getClassifierDataset();
                  var data = [];
                  for (var label in dataset) {
                    data.push({
                      label: label,
                      values: Array.from(await dataset[label].data()),
                      shape: dataset[label].shape
                    });
                  }
                  return JSON.stringify(data)
                },
                loadModelFromJson: function loadModelFromJson (json) {
                  // With thanks to https://github.com/tensorflow/tfjs/issues/633#issuecomment-660642769
                  var model = JSON.parse(json);
                  // convert back to tensor
                  var dataset = {};
                  model.forEach(function (example) {
                    dataset[example.label] = tfjs.tensor(example.values, example.shape);
                  });
                  this.knn.setClassifierDataset(dataset);
                }
              },
              destroyed: function () {
                if (this.knn) {
                  this.knn.dispose();
                }
                if (this.mediaStream) {
                  this.mediaStream.getTracks().forEach(function (x) { return x.stop(); });
                }
              }
            };

            function normalizeComponent(template, style, script, scopeId, isFunctionalTemplate, moduleIdentifier /* server only */, shadowMode, createInjector, createInjectorSSR, createInjectorShadow) {
                if (typeof shadowMode !== 'boolean') {
                    createInjectorSSR = createInjector;
                    createInjector = shadowMode;
                    shadowMode = false;
                }
                // Vue.extend constructor export interop.
                var options = typeof script === 'function' ? script.options : script;
                // render functions
                if (template && template.render) {
                    options.render = template.render;
                    options.staticRenderFns = template.staticRenderFns;
                    options._compiled = true;
                    // functional template
                    if (isFunctionalTemplate) {
                        options.functional = true;
                    }
                }
                // scopedId
                if (scopeId) {
                    options._scopeId = scopeId;
                }
                var hook;
                if (moduleIdentifier) {
                    // server build
                    hook = function (context) {
                        // 2.3 injection
                        context =
                            context || // cached call
                                (this.$vnode && this.$vnode.ssrContext) || // stateful
                                (this.parent && this.parent.$vnode && this.parent.$vnode.ssrContext); // functional
                        // 2.2 with runInNewContext: true
                        if (!context && typeof __VUE_SSR_CONTEXT__ !== 'undefined') {
                            context = __VUE_SSR_CONTEXT__;
                        }
                        // inject component styles
                        if (style) {
                            style.call(this, createInjectorSSR(context));
                        }
                        // register component module identifier for async chunk inference
                        if (context && context._registeredComponents) {
                            context._registeredComponents.add(moduleIdentifier);
                        }
                    };
                    // used by ssr in case component is cached and beforeCreate
                    // never gets called
                    options._ssrRegister = hook;
                }
                else if (style) {
                    hook = shadowMode
                        ? function (context) {
                            style.call(this, createInjectorShadow(context, this.$root.$options.shadowRoot));
                        }
                        : function (context) {
                            style.call(this, createInjector(context));
                        };
                }
                if (hook) {
                    if (options.functional) {
                        // register for functional component in vue file
                        var originalRender = options.render;
                        options.render = function renderWithStyleInjection(h, context) {
                            hook.call(context);
                            return originalRender(h, context);
                        };
                    }
                    else {
                        // inject component registration as beforeCreate hook
                        var existing = options.beforeCreate;
                        options.beforeCreate = existing ? [].concat(existing, hook) : [hook];
                    }
                }
                return script;
            }

            var isOldIE = typeof navigator !== 'undefined' &&
                /msie [6-9]\\b/.test(navigator.userAgent.toLowerCase());
            function createInjector(context) {
                return function (id, style) { return addStyle(id, style); };
            }
            var HEAD;
            var styles = {};
            function addStyle(id, css) {
                var group = isOldIE ? css.media || 'default' : id;
                var style = styles[group] || (styles[group] = { ids: new Set(), styles: [] });
                if (!style.ids.has(id)) {
                    style.ids.add(id);
                    var code = css.source;
                    if (css.map) {
                        // https://developer.chrome.com/devtools/docs/javascript-debugging
                        // this makes source maps inside style tags work properly in Chrome
                        code += '\n/*# sourceURL=' + css.map.sources[0] + ' */';
                        // http://stackoverflow.com/a/26603875
                        code +=
                            '\n/*# sourceMappingURL=data:application/json;base64,' +
                                btoa(unescape(encodeURIComponent(JSON.stringify(css.map)))) +
                                ' */';
                    }
                    if (!style.element) {
                        style.element = document.createElement('style');
                        style.element.type = 'text/css';
                        if (css.media)
                            { style.element.setAttribute('media', css.media); }
                        if (HEAD === undefined) {
                            HEAD = document.head || document.getElementsByTagName('head')[0];
                        }
                        HEAD.appendChild(style.element);
                    }
                    if ('styleSheet' in style.element) {
                        style.styles.push(code);
                        style.element.styleSheet.cssText = style.styles
                            .filter(Boolean)
                            .join('\n');
                    }
                    else {
                        var index = style.ids.size - 1;
                        var textNode = document.createTextNode(code);
                        var nodes = style.element.childNodes;
                        if (nodes[index])
                            { style.element.removeChild(nodes[index]); }
                        if (nodes.length)
                            { style.element.insertBefore(textNode, nodes[index]); }
                        else
                            { style.element.appendChild(textNode); }
                    }
                }
            }

            /* script */
            var __vue_script__ = script;

            /* template */
            var __vue_render__ = function () {var _vm=this;var _h=_vm.$createElement;var _c=_vm._self._c||_h;return _c('div',{staticClass:"camera-gestures-container"},[_vm._t("loading",[(_vm.busyLoadingMobilenet)?_c('div',{staticClass:"camera-gestures-loader-container"},[_vm._m(0)]):_vm._e()],{"loading":_vm.busyLoadingMobilenet}),_vm._v(" "),_c('video',{directives:[{name:"show",rawName:"v-show",value:(!_vm.busyLoadingMobilenet && _vm.showCameraFeed),expression:"!busyLoadingMobilenet && showCameraFeed"}],ref:"video",staticClass:"camera-gestures-camera-feed",attrs:{"autoplay":"","playsinline":""},on:{"playing":function($event){_vm.videoPlaying = true;},"pause":function($event){_vm.videoPlaying = false;}}}),_vm._v(" "),_vm._t("progress",[_c('div',{staticClass:"camera-gestures-progress-bar",class:{invisible: !_vm.showProgressBar},style:({width: (_vm.progress * 227.0) + 'px'})})],{"inProgress":_vm.showProgressBar,"progress":_vm.progress}),_vm._v(" "),_vm._t("instructions",[_c('p',{directives:[{name:"show",rawName:"v-show",value:(_vm.currentInstruction),expression:"currentInstruction"}],staticClass:"camera-gestures-instructions"},[_vm._v(_vm._s(_vm.currentInstruction))])],{"training":_vm.state === 'training',"verifying":_vm.state === 'testing',"event":_vm.currentEvent,"eventName":_vm.currentEventName})],2)};
            var __vue_staticRenderFns__ = [function () {var _vm=this;var _h=_vm.$createElement;var _c=_vm._self._c||_h;return _c('div',{staticClass:"camera-gestures-lds-ring"},[_c('div'),_vm._v(" "),_c('div'),_vm._v(" "),_c('div'),_vm._v(" "),_c('div')])}];

              /* style */
              var __vue_inject_styles__ = function (inject) {
                if (!inject) { return }
                inject("data-v-776e4379_0", { source: ".camera-gestures-container[data-v-776e4379]{width:227px}video.camera-gestures-camera-feed[data-v-776e4379]{transform:rotateY(180deg);-webkit-transform:rotateY(180deg);-moz-transform:rotateY(180deg);width:227px;max-width:100%}.camera-gestures-progress-bar[data-v-776e4379]{height:5px;background:#41b883;border-radius:5px 0 0 5px}.camera-gestures-progress-bar.invisible[data-v-776e4379]{background:0 0}.camera-gestures-instructions[data-v-776e4379]{text-align:center}.camera-gestures-loader-container[data-v-776e4379]{width:227px;height:100px}.camera-gestures-lds-ring[data-v-776e4379]{display:block;position:relative;left:calc(50% - 32px);top:calc(50% - 32px);width:64px;height:64px}.camera-gestures-lds-ring div[data-v-776e4379]{box-sizing:border-box;display:block;position:absolute;width:51px;height:51px;margin:6px;border:6px solid #41b883;border-radius:50%;animation:camera-gestures-lds-ring-data-v-776e4379 1.2s cubic-bezier(.5,0,.5,1) infinite;border-color:#41b883 transparent transparent transparent}.camera-gestures-lds-ring div[data-v-776e4379]:nth-child(1){animation-delay:-.45s}.camera-gestures-lds-ring div[data-v-776e4379]:nth-child(2){animation-delay:-.3s}.camera-gestures-lds-ring div[data-v-776e4379]:nth-child(3){animation-delay:-.15s}@keyframes camera-gestures-lds-ring-data-v-776e4379{0%{transform:rotate(0)}100%{transform:rotate(360deg)}}", map: undefined, media: undefined });

              };
              /* scoped */
              var __vue_scope_id__ = "data-v-776e4379";
              /* module identifier */
              var __vue_module_identifier__ = undefined;
              /* functional template */
              var __vue_is_functional_template__ = false;
              /* style inject SSR */
              
              /* style inject shadow dom */
              

              
              var __vue_component__ = /*#__PURE__*/normalizeComponent(
                { render: __vue_render__, staticRenderFns: __vue_staticRenderFns__ },
                __vue_inject_styles__,
                __vue_script__,
                __vue_scope_id__,
                __vue_is_functional_template__,
                __vue_module_identifier__,
                false,
                createInjector,
                undefined,
                undefined
              );

            // Declare install function executed by Vue.use()
            function install(Vue) {
              if (install.installed) { return; }
              install.installed = true;
              Vue.component('CameraGestures', __vue_component__);
            }

            // Create module definition for Vue.use()
            var plugin = {
              install: install,
            };

            // Auto-install when vue is found (eg. in browser via <script> tag)
            var GlobalVue = null;
            if (typeof window !== 'undefined') {
              GlobalVue = window.Vue;
            } else if (typeof global$1 !== 'undefined') {
              GlobalVue = global$1.Vue;
            }
            if (GlobalVue) {
              GlobalVue.use(plugin);
            }

            exports.default = __vue_component__;
            exports.install = install;
            exports.loadMobilenet = loadMobilenet;

            Object.defineProperty(exports, '__esModule', { value: true });

})));
