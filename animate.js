/*
作者：阿木亮，QQ：982632988，时间：2017/8/1

为了实现大量的动画效果，统一管理动画，但是只提供最底层的封装
如果你有兴趣，可以自由拓展该脚本，并进行更高级别的封装

可配置属性：
	id: 0,
	target: null, // 必须的
	prop: null, // 必须的
	startValue: 0, // 默认为0，否则需要手动赋值
	endValue: 0, // 必须的
	formatValue: function(value) { return value; }, // 用于格式化输出结果
	getValue: function() { return this.target[this.prop]; }, // 获取值，这个函数实际上可能并没有用到
	setValue: function(value) { this.target[this.prop] = value; }, // 设置值
	dimension: 1, // 维度
	animateMode: "linear", // 动画插值模式，linear，fade，fadeIn，fadeOut，custom（规定使用自定插值函数）
	interval: 30, // 每帧时长
	duration: 500, // 持续时间
	loopType: "none", // 循环类型：none无循环， repeat重复循环， increment累加循环，reverse反向循环
	loopTimes: 1, // 0次,表示无限循环
	interpolatingFunction: null // 自定义插值函数
附加属性：
	startTime: 0, // 开始时间
	endTime: 0, // 结束时间
	prevFrameTime: 0, // 上一帧动画时间
	status: "animate" || "pause" || "finished"

示例：
	// 添加动画
	animate.push({
		target: document.getElementById("id1").style,
		prop: "width",
		endValue: 200
	});
	// 暂停动画
	animate.pause();
	// 继续动画
	animate.continue();
	// 停止animate运行
	animate.stop();
	// 运行animate
	animate.start();
	// animate重启
	animate.restart();
	// 停止某个动画
	animate.finishById(id);
	// 停止所有动画
	animate.finishAll();
	// 查找某个动画
	animate.find(id);
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

var animate = {
	version: "v1.0.0",
	status: "normal",
	count: 0,
	queue: [],
	interpolatingFunction: { // 插值函数
		linear: function(animate, item) {
			var startValue, endValue, newValue = [];
			if(item.dimension == 1) {
				startValue = [item.startValue];
				endValue = [item.endValue];
			}else {
				startValue = item.startValue;
				endValue = item.endValue;
			}
			for(var i = 0; i < item.dimension; i++) {
				var surplusTime = animate.count >= item.endTime ? 0 : item.endTime - animate.count;
				var surplusValue = (endValue[i] - startValue[i]) * surplusTime / (item.duration + 0.00000001);
				newValue.push(endValue[i] - surplusValue);
			}
			return item.dimension == 1 ? newValue[0] : newValue;
		},
		fade: function(animate, item) {
			var startValue, endValue, newValue = [];
			if(item.dimension == 1) {
				startValue = [item.startValue];
				endValue = [item.endValue];
			}else {
				startValue = item.startValue;
				endValue = item.endValue;
			}
			for(var i = 0; i < item.dimension; i++) {
				var surplusTime = animate.count >= item.endTime ? 0 : item.endTime - animate.count;
				var x = item.duration - surplusTime;
				var y = item.endValue - item.startValue;
				var w = 2 * Math.PI / (item.duration + 0.00000001);
				var k = y / (item.duration + 0.00000001);
				var value = - 0.75 * (k / w) * Math.sin(w * x) + k * x + item.startValue;
				newValue.push(value);
			}
			return item.dimension == 1 ? newValue[0] : newValue;
		},
		fadeIn: function(animate, item) {
			var startValue, endValue, newValue = [];
			if(item.dimension == 1) {
				startValue = [item.startValue];
				endValue = [item.endValue];
			}else {
				startValue = item.startValue;
				endValue = item.endValue;
			}
			for(var i = 0; i < item.dimension; i++) {
				var surplusTime = animate.count >= item.endTime ? 0 : item.endTime - animate.count;
				var x = item.duration - surplusTime;
				var y = item.endValue - item.startValue;
				var w = Math.PI / (item.duration + 0.00000001);
				var k = y / (item.duration + 0.00000001);
				var value = - 0.75 * (k / w) * Math.sin(w * x) + k * x + item.startValue;
				newValue.push(value);
			}
			return item.dimension == 1 ? newValue[0] : newValue;
		},
		fadeOut: function(animate, item) {
			var startValue, endValue, newValue = [];
			if(item.dimension == 1) {
				startValue = [item.startValue];
				endValue = [item.endValue];
			}else {
				startValue = item.startValue;
				endValue = item.endValue;
			}
			for(var i = 0; i < item.dimension; i++) {
				var surplusTime = animate.count >= item.endTime ? 0 : item.endTime - animate.count;
				var x = item.duration - surplusTime;
				var y = item.endValue - item.startValue;
				var w = 2 * Math.PI / (item.duration + 0.00000001);
				var k = y / (item.duration + 0.00000001);
				var value = - 0.75 * (k / w) * Math.sin(w * x + Math.PI) + k * x + item.startValue;
				newValue.push(value);
			}
			return item.dimension == 1 ? newValue[0] : newValue;
		},
		custom: function(animate, item) {
			return item.interpolatingFunction.call(animate, animate, item);
		}
	},
	push: function(config) {
		if(!config.target) return;
		if(!config.prop) return;
		if(typeof config.endValue == "undefined") return;
		if(!animate.interpolatingFunction[config.animateMode]) config.animateMode = "linear";
		var dimension, startValue;
		if(typeof config.endValue == "number") {
			dimension = 1;
			startValue = 0;
		}else {
			dimension = config.endValue.length;
			startValue = [];
			for(var i = 0; i < dimension; i++) {
				startValue.push(0);
			}
		}
		pushQueue(Object.assign({
			id: Date.now(),
			startValue: startValue,
			endValue: 0,
			formatValue: function(value) { return value; },
			target: null,
			prop: null,
			getValue: function() { return this.target[this.prop]; },
			setValue: function(value) { this.target[this.prop] = value; },
			dimension: dimension,
			animateMode: "linear",
			interval: 30,
			duration: 500,
			loopType: "none", // none无循环， repeat重复循环， increment累加循环，reverse反向循环
			loopTimes: 1, // 0次,表示无限循环
			interpolatingFunction: null
		}, config));
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
	Object.assign(item, {
		startTime: animate.count,
		endTime: animate.count + item.duration,
		prevFrameTime: animate.count,
		pauseTime: 0, // 暂停持续时间
		loopedTimes: 0, // 动画已经循环次数
		status: "animate"
	});
	for(var i = 0; i < animate.queue.length; i++) {
		if(item.target == animate.queue[i].target && item.prop == animate.queue[i].prop) {
			animate.queue[i] = item;
			return;
		}
	}
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
			if(item.status == "pause") {
				dealWithPause(item);
			}else if(animate.count - item.prevFrameTime >= item.interval) {
				activeQueue.push(item);
				values.push(getNewValue(item));
				item.prevFrameTime = animate.count;
				if(item.prevFrameTime >= item.endTime) {
					dealWithLoop(item);
				}
			}
		}
	}
	// 为了统一赋值，防止卡顿
	for(var i = 0; i < activeQueue.length; i++) {
		activeQueue[i].setValue(values[i]);
	}
	animate.queue = newQueue;
	return activeQueue;
}
// 计算得到新的插值
function getNewValue(item) {
	var value = animate.interpolatingFunction[item.animateMode](animate, item);
	return item.formatValue(value);
}
// 处理循环
function dealWithLoop(item) {
	item.loopedTimes++;
	if(item.loopType != "none" && (item.loopTimes == 0 || item.loopedTimes < item.loopTimes)) {
		item.startTime = animate.count;
		item.endTime = item.startTime + item.duration;
		if(item.loopType == "repeat") {
			//
		}else if(item.loopType == "increment") {
			var segment = item.endValue - item.startValue;
			item.startValue = item.endValue;
			item.endValue = item.endValue + segment;
		}else if(item.loopType == "reverse") {
			var temp = item.endValue;
			item.endValue = item.startValue;
			item.startValue = temp;
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
}

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
		px: function(value) { return value + "px"; },
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
	}
}











/*************************       *************************************************************/
return animate;
})();