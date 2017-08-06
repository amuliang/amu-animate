/*
作者：阿木亮，QQ：982632988，时间：2017/8/5

为了实现大量的动画效果，统一管理动画，但是只提供最底层的封装
如果你有兴趣，可以自由拓展该脚本，并进行更高级别的封装
 */
// 兼容处理
if(!Object.assign) {
	Object.assign = function() {
		var len = arguments.length;
		var result = Array.prototype.shift.call(arguments);
		for(var i = 0; i < len; i++) {
			for(var key in arguments[i]) {
				result[key] = arguments[i][key];
			}
		}
		return result;
	}
}




;var animate = (function() {
/************************* animate 底层封装 *************************************************************/
var interval = 5; // 默认每5毫秒刷新一次
var animate_si = null; // setInterval句柄
var default_id = 1000000000;

var animate = {
	version: "v1.2.3",
	status: "normal",
	count: 0,
	queue: [],
	allowCache: false,
	interpolationFunction: { // 插值函数
		linear: function(currentSegment, item, animate) {
			var newValue = new Array(item.dimension);
			for(var i = 0; i < item.dimension; i++) {
				var surplusTime = animate.count >= currentSegment.endTime ? 0 : currentSegment.endTime - animate.count;
				var surplusValue = (currentSegment.endValue[i] - currentSegment.startValue[i]) * surplusTime / (currentSegment.duration + 0.00000001);
				newValue[i] = currentSegment.endValue[i] - surplusValue;
			}
			return newValue;
		},
		fade: function(currentSegment, item, animate) {
			var newValue = new Array(item.dimension);

			for(var i = 0; i < item.dimension; i++) {
				var surplusTime = animate.count >= currentSegment.endTime ? 0 : currentSegment.endTime - animate.count;
				var x = currentSegment.duration - surplusTime;
				var y = currentSegment.endValue[i] - currentSegment.startValue[i];
				var w = 2 * Math.PI / (currentSegment.duration + 0.00000001);
				var k = y / (currentSegment.duration + 0.00000001);
				newValue[i] = currentSegment.startValue[i] - 1 * (k / w) * Math.sin(w * x) + k * x;
			}
			return newValue;
		},
		fadeIn: function(currentSegment, item, animate) {
			var newValue = new Array(item.dimension);
			for(var i = 0; i < item.dimension; i++) {
				var surplusTime = animate.count >= currentSegment.endTime ? 0 : currentSegment.endTime - animate.count;
				var x = currentSegment.duration - surplusTime;
				var y = currentSegment.endValue[i] - currentSegment.startValue[i];
				var w = Math.PI / (currentSegment.duration + 0.00000001);
				var k = y / (currentSegment.duration + 0.00000001);
				newValue[i] = currentSegment.startValue[i] - 1 * (k / w) * Math.sin(w * x) + k * x;
			}
			return newValue;
		},
		fadeOut: function(currentSegment, item, animate) {
			var newValue = new Array(item.dimension);
			for(var i = 0; i < item.dimension; i++) {
				var surplusTime = animate.count >= currentSegment.endTime ? 0 : currentSegment.endTime - animate.count;
				var x = currentSegment.duration - surplusTime;
				var y = currentSegment.endValue[i] - currentSegment.startValue[i];
				var w = Math.PI / (currentSegment.duration + 0.00000001);
				var k = y / (currentSegment.duration + 0.00000001);
				newValue[i] = currentSegment.startValue[i] - 1 * (k / w) * Math.sin(w * x + Math.PI) + k * x;
			}
			return newValue;
		},
		custom: function(currentSegment, item, animate) {
			return item.interpolationFunction.call(animate, animate, item);
		}
	},
	push: function(config) {
		if(!config.target && !config.targets) return;
		// if(!config.prop) return;
		if(typeof config.endValue == "undefined") {
			if(config.keyFrames && config.keyFrames.length) {
				config.endValue = config.keyFrames[config.keyFrames.length - 1].value;
			}else {
				config.endValue = 0;
			}
		}
		if(typeof config.keyFrames == "undefined") {
			config.keyFrames = [{ value: config.endValue, duration: config.duration || 500 }];
		}else {
			config.duration = 0;
			for(var i = 0; i < config.keyFrames.length; i++) {
				config.duration += config.keyFrames[i].duration;
			}
			if(config.keyFrames[0].duration == 0) config.startValue = config.keyFrames[0].value;
			config.endValue = config.keyFrames[config.keyFrames.length - 1].value;
		}
		if(!animate.interpolationFunction[config.interpolationType]) config.interpolationType = "linear";
		var dimension, startValue;
		if(typeof config.endValue == "number") {
			dimension = 1;
			startValue = 0;
		}else {
			dimension = config.endValue.length;
			startValue = new Array(dimension);
			for(var i = 0; i < dimension; i++) {
				startValue[i] = 0;
			}
		}
		if(config.interval) {
			config.interval = Math.round(config.interval / interval) * interval;
			if(config.interval == 0) config.interval = interval;
		}
		// if(config.delay) {
		// 	config.delay = Math.round(config.delay / interval) * interval;
		// }
		
		var item = Object.assign({
			id: default_id++,
			startValue: startValue,
			endValue: 0,
			keyFrames: [],
			formatValue: function(value, item, animate) { return value; },
			target: null,
			prop: null,
			getValue: function() { return this.prop ? this.target[this.prop] : this.startValue; },
			setValue: function(value, item, animate) { if(this.prop) this.target[this.prop] = value; },
			expression: function(value, item, animate) { return value; },
			dimension: dimension,
			interpolationType: "linear",
			interval: interval * 4,
			delay: 0,
			duration: 500,
			loopType: "none", // none无循环， repeat重复循环， increment累加循环，reverse反向循环
			loopTimes: 1, // 0次,表示无限循环
			interpolationFunction: null,
			allowCache: animate.allowCache
		}, config);

		if(item.targets) {
			for(var i = 0; i < item.targets.length; i++) {
				item.target = item.targes[i];
				pushQueue(item);
			}
		}else {
			pushQueue(item);
		}
	},
	mulPush: function(pushArr, commonConfig) {
		commonConfig = commonConfig || {};
		for(var i = 0; i < pushArr.length; i++) {
			animate.push(Object.assign({}, commonConfig, pushArr[i]));
		}
	},
	finishAll: function() {
		for(var i = 0; i < animate.queue.length; i++) {
			animate.queue[i].status = "finished";
		}
	},
	finishById: function(id) {
		changeItemStatus(id, "finished");
	},
	findById: function(id) {
		for(var i = 0; i < animate.queue.length; i++) {
			if(animate.queue[i].id == id) {
				return animate.queue[i];
			}
		}
		return null;
	},
	pauseById: function(id) {
		changeItemStatus(id, "pause");
	},
	continueById: function(id) {
		changeItemStatus(id, "animate");
	},
	pause: function() {
		animate.status = "pause";
	},
	stop: function() {
		animate.status = "stop";
	},
	"continue": function() {
		animate.status = "normal";
	},
	start: function() {// 开启动画
		animate.status = "normal";
		if(animate_si) clearInterval(animate_si);
		animate_si = setInterval(function() {
			if(animate.status == "normal") {
				refreshQueue();
				animate.count += interval;
			}else if(animate.status == "pause") {
				return;
			}else if(animate.status == "stop") {
				clearInterval(animate_si);
				return;
			}
		}, interval);
	},
	restart: function() {
		animate.count = 0;
		animate.queue = [];
		animate.start();
	}
};
// 将新的动画配置添加到动画队列中
function pushQueue(config) {
	// 基础属性
	var item = config;
	// 附加属性
	var baseValue = item.expression(item.startValue, item, animate);
	Object.assign(item, {
		startTime: animate.count + item.delay,
		endTime: animate.count + item.duration + item.delay,
		prevFrameTime: animate.count + item.delay,
		pauseTime: 0, // 暂停持续时间
		loopedTimes: 0, // 动画已经循环次数
		status: "ready",
		cache: {
			pointer: 0,
			baseValue: baseValue,
			data: [arrMinus(baseValue, baseValue)]
		}
		//getCacheFrame: getCacheFrame
	});
	for(var i = 0; i < animate.queue.length; i++) {
		if(item.target == animate.queue[i].target && item.prop == animate.queue[i].prop) {
			animate.queue[i] = item;
			return;
		}
	}

	item.setValue(item.formatValue(baseValue, item, animate), item, animate); // 设置初始值

	// 添加到队列
	animate.queue.push(item);
}
// 刷新队列
function refreshQueue() {
	var oldQueue = animate.queue;
	var num = oldQueue.length;
	var newQueue = [];
	var activeQueue = [];
	var values = [];
	for(var i = 0; i < num; i++) {
		var item = oldQueue[i];
		if(item.status != "finished") {
			newQueue.push(item);
			if(item.status == "ready") {
				if(item.startTime >= animate.count) {
					item.status = "animate";
				}
			}
			if(item.status == "animate") {
				if(item.loopedTimes > 0) item.status = "looping";
			}
			if(item.status == "pause") {
				dealWithPause(item);
			}else if(animate.count - item.prevFrameTime >= item.interval) {
				activeQueue.push(item);
				if(item.status == "animate") {
					values.push(getNewValue(item));
				}else if(item.status == "looping") {
					values.push(dealWithCache(item));
				}
				item.prevFrameTime = item.prevFrameTime + item.interval;
				if(item.prevFrameTime >= item.endTime) {
					dealWithLoop(item);
				}
			}
		}
	}
	// 为了统一赋值，防止卡顿
	for(var i = 0; i < activeQueue.length; i++) {
		activeQueue[i].setValue(activeQueue[i].formatValue(values[i], activeQueue[i], animate), activeQueue[i], animate);
	}
	animate.queue = newQueue;
	return activeQueue;
}
// 计算得到新的插值
function getNewValue(item) {
	var currentSegment = {
		endTime: 0,
		startValue: 0,
		endValue: 0,
		duration: 0
	};
	
	var startValue = item.startValue, endValue = item.endValue;
	var duration, endTime = item.startTime + item.pauseTime;
	for(var i = 0; i < item.keyFrames.length; i++) {
		endTime += item.keyFrames[i].duration;
		if(endTime > animate.count - interval) {
			duration = item.keyFrames[i].duration;
			endValue = item.keyFrames[i].value;
			break;
		}
		startValue = item.keyFrames[i].value;
	}
	if(item.dimension == 1) {
		startValue = [startValue];
		endValue = [endValue];
	}

	currentSegment.endTime = endTime;
	currentSegment.startValue = startValue;
	currentSegment.endValue = endValue;
	currentSegment.duration = duration;

	var value = animate.interpolationFunction[item.interpolationType](currentSegment, item, animate);
	value = item.expression(item.dimension == 1 ? value[0] : value, item, animate);
	if(item.allowCache || item.loopType != "none" && item.loopTimes != 1) item.cache.data.push(arrMinus(value, item.cache.baseValue));
	return value;
}
// 处理循环
function dealWithLoop(item) {
	item.loopedTimes++;
	if(item.loopType != "none" && (item.loopTimes == 0 || item.loopedTimes < item.loopTimes)) {
		item.startTime = item.prevFrameTime;
		item.endTime = item.startTime + item.duration;
		if(item.loopType == "repeat") {
			item.status = "looping";
		}else if(item.loopType == "increment") {
			item.status = "looping";
			var temp = arrMinus(item.cache.data[item.cache.data.length - 1], item.cache.data[0]);
			item.cache.baseValue = arrPlus(item.cache.baseValue, temp); // 递增处理
		}else if(item.loopType == "reverse") {
			item.status = "looping";
			item.cache.data.reverse(); // 将缓存数值反向处理
		}else {
			item.status = "finished";
		}
	}else {
		item.status = "finished";
	}
}
// 改变item状态
function changeItemStatus(id, status) {
	var item = animate.findById(id);
	if(item) {
		item.status = status;
	}
}
// 处理动画暂停
function dealWithPause(item) {
	item.pauseTime += interval;
	item.endTime += interval;
	item.prevFrameTime += interval;
}
// 处理缓存，缓存取值
function dealWithCache(item) {
	if(item.cache.data.length > 1) {
		item.cache.pointer = (item.cache.pointer + 1) % item.cache.data.length;
		if(item.cache.pointer == 0) {
			item.cache.pointer++;
		}
	}
	return arrPlus(item.cache.baseValue, item.cache.data[item.cache.pointer]);
}

function arrPlus(base, value) {
	if(typeof base == "string") {
		return value;
	}else if(typeof base == "number") {
		return base + value;
	}else {
		var newArr = new Array(base.length);
		for(var i = 0; i < base.length; i++) {
			newArr[i] = base[i] + value[i];
		}
		return newArr;
	}
}
function arrMinus(value, base) {
	if(typeof value == "string") {
		return value;
	}else 
	if(typeof value == "number") {
		return value - base;
	}else {
		var newArr = new Array(value.length);
		for(var i = 0; i < value.length; i++) {
			newArr[i] = value[i] - base[i];
		}
		return newArr;
	}
}

// function getCacheFrame(index) { // 0代表第一帧，-1代表最后一帧
// 	var len = this.cache.data.length;
// 	//var frameNum = this.loopedTimes > 0 ? len * this.loopedTimes + this.cache.pointer : len;
// 	if(index > len - 1) index = len - 1;
// 	else if(index < -len) index = 0;
// 	else if(index < 0) index = index + len;
// 	return this.cache.data[index];
// }


animate.start();

/************************* animate 高级封装 *************************************************************/
/*
                           _ooOoo_ 
                          o8888888o     _ _ 嗨
                          88" . "88   /
                          (| -_- |)  /
                          O\  =  /O
                       ____/`---'\____
                     .'  \\|     |//  `.
                    /  \\|||  :  |||//  \
                   /  _||||| -:- |||||-  \
                   |   | \\\  -  /// |   |
                   | \_|  ''\---/''  |   |
                   \  .-\__  `-`  ___/-. /
                 ___`. .'  /--.--\  `. . __
              ."" '<  `.___\_<|>_/___.'  >'"".
             | | :  `- \`.;`\ _ /`;.`/ - ` : | |
             \  \ `-.   \_ __\ /__ _/   .-` /  /
        ======`-.____`-.___\_____/___.-`____.-'======
                           `=---='
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                 佛祖保佑       永无BUG
        */

animate.formats = {
	css: {
		px: function(value) { return Math.round(value) + "px"; },
		percent: function(value) { return value + "%"; },
		em: function(value) { return value + "em"; },
		rgb: function(value) { 
			return "rgb(" + 
				Math.round(value[0]) + "," + 
				Math.round(value[1]) + "," + 
				Math.round(value[2]) + ")";
		},
		rgba: function(value) { 
			return "rgba(" + 
				Math.round(value[0]) + "," + 
				Math.round(value[1]) + "," + 
				Math.round(value[2]) + "," + 
				value[3] + ")";
		},
		rotate: function(value) { 
			return "rotate(" + Math.round(value) + "deg)";
		}
	},
	number: {
		round: function(value) { return Math.round(value); },
		floor: function(value) { return Math.floor(value); },
		ceil: function(value) { return Math.ceil(value); }
	}
}











/*************************       *************************************************************/
return animate;
})();