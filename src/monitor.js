import tryJS from './try'
import {
  debounce,
  merge
} from './util'

var monitor = {}
monitor.tryJS = tryJS

// 错误日志列表
var errorList = []

var config = {
  delay: 2000, // 错误处理间隔时间
  maxError: 16, // 异常报错数量限制
  sampling: 1, // 采样率
  report: function() {
    console.table(errorList)
    console.log('发送请求')
  }
}

monitor.config = function(opts) {
  merge(opts, config)
}

// 定义的错误类型码
var ERROR_RUNTIME = 1
var ERROR_SCRIPT = 2
var ERROR_STYLE = 3
var ERROR_IMAGE = 4
var ERROR_AUDIO = 5
var ERROR_VIDEO = 6
var ERROR_CONSOLE = 7

var LOAD_ERROR_TYPE = {
  SCRIPT: ERROR_SCRIPT,
  LINK: ERROR_STYLE,
  IMG: ERROR_IMAGE,
  AUDIO: ERROR_AUDIO,
  VIDEO: ERROR_VIDEO
}

var report = debounce(config.report, config.delay)


// 监听 JavaScript 报错异常(JavaScript runtime error)
window.onerror = function(messageOrEvent, source, lineno, colno, error) {
  var errorLog = formatRuntimerError(messageOrEvent, source, lineno, colno, error)

  handleError(errorLog)
}

// 监听资源加载错误(JavaScript Scource failed to load)
window.addEventListener('error', function(err) {
  // 过滤 target 为 window 的异常，避免与上面的 onerror 重复
  var errorTarget = err.target
  if (errorTarget !== window && errorTarget.nodeName && LOAD_ERROR_TYPE[errorTarget.nodeName.toUpperCase()]) {
    handleError(formatLoadError(errorTarget))
  }
}, true)

// 针对 vue 报错重写 console.error
console.error = (function(origin) {
  return function(info) {
    var errorLog = {
      type: ERROR_CONSOLE,
      desc: info
    }

    handleError(errorLog)
    origin.call(console, info)
  }
})(console.error)

/**
 * 生成 runtime 错误日志
 *
 * @param  {String} message 错误信息
 * @param  {String} source  发生错误的脚本 URL
 * @param  {Number} lineno  发生错误的行号
 * @param  {Number} colno   发生错误的列号
 * @return {Object}
 */
function formatRuntimerError(message, source, lineno, colno) {
  return {
    type: ERROR_RUNTIME,
    desc: message + ' at ' + source + ':' + lineno + ':' + colno
  }
}

/**
 * 生成 laod 错误日志
 *
 * @param  {Object} errorTarget
 * @return {Object}
 */
function formatLoadError(errorTarget) {
  return {
    type: LOAD_ERROR_TYPE[errorTarget.nodeName.toUpperCase()],
    desc: errorTarget.baseURI + '@' + (errorTarget.src || errorTarget.href)
  }
}

function handleError(errorLog) {
  pushError(errorLog)
  report()
}

/**
 * 往异常信息数组里面添加一条记录
 *
 * @param  {Object} errorLog 错误日志
 */
function pushError(errorLog) {
  if (needReport(config.sampling) && errorList.length < config.maxError) {
    errorList.push(errorLog)
  }
}

/**
 * 设置一个采样率，决定是否上报
 *
 * @param  {Number} sampling 0 - 1
 * @return {Boolean}
 */
function needReport(sampling) {
  return Math.random() < (sampling || 1)
}

export default monitor
