# 介绍
该脚本设计初衷是为了满足浏览器页面的动画效果，支持IE、谷歌、火狐，设计的最后脚本更为通用，不仅是应用到页面元素。

为了处理的高效，所有动画是统一管理的。核心函数为setInterval，没有这个函数也无法实现动画效果。脚本只会开一个setInterval，刷新周期为5毫秒，所有动画都在队列之中，当一个周期之后，队列将会被刷新一次，例如动画间隔为30毫秒的动画将会在六个周期之后被更新，而已完成的动画将会被排除在队列之外。

在此版本中，循环的动画将会被缓存，这也意味着动画在循环阶段几乎不会消耗浏览器的计算资源。

数值计算及赋值分四个步骤，每一个步骤都可以人为进行干涉：
- 插值计算 interpolationFunction：根据基础属性计算插值，如linear，fade；在循环状态，插值计算结果将从缓存中读取出来；
- 表达式计算 expression：在插值运算结果的基础上再次进行处理；
- 格式化 formatValue：将表达式运算结果进行处理，如对于元素的宽度值10将被处理成"10px",此时值可能无法再参与计算；
- 赋值 setValue：将格式化结果赋值给目标属性。

# 属性方法

### 可配置属性：
``` javascript
id: 0,
target: null, // 必须的
targets: [], // 必须的，多个目标。target和targets必须有一个被指定
prop: null, // 必须的
startValue: 0, // 默认为0，否则需要手动赋值
keyFrames: [], // 关键帧数组，如：[{value:10,duration:200},{value:50,duration:100}]
endValue: 0, // 指定结束值或者指定keyFrames
formatValue: function(value, item, animate) { return value; }, // 用于格式化输出结果
getValue: function() { return this.prop ? this.target[this.prop] : this.startValue; }, // 获取值，这个函数实际上可能并没有用到
setValue: function(value, item, animate) { if(this.prop) this.target[this.prop] = value; }, // 设置值
expression: function(value, item, animate) { return value; }, // 表达式
dimension: 1, // 维度
interpolationType: "linear", // 动画插值类型，linear，fade，fadeIn，fadeOut，custom（将使用自定插值函数interpolationFunction）
interval: 20, // 每帧时长,只能为5的倍数，因为每5毫秒刷新一次，非5的倍数没有意义
duration: 500, // 持续时间
delay: 0, // 延迟时间
loopType: "none", // 循环类型：none无循环， repeat重复循环， increment累加循环，reverse反向循环
loopTimes: 1, // 0次,表示无限循环
interpolationFunction: null, // 自定义插值函数
allowCache: false // 允许缓存，对于循环动画将自动缓存，非循环动画是否缓存取决于该值
```
### 附加属性：
``` javascript
startTime: 0, // 开始时间
endTime: 0, // 结束时间
prevFrameTime: 0, // 上一帧动画时间
pauseTime: 0, // 暂停持续时间
loopedTimes: 0, // 动画已经循环次数
status: "ready" || "animate" || "looping" || "pause" || "finished",
cache: {
	pointer: 0,
	baseValue: 0,
	data: [0]
}
```
### 方法
``` javascript
// 添加
animate.push(config);
// 添加多个
animate.mulPush(configArr, commonConfig)
// 暂停
animate.pause();
// 继续
animate.continue();
// 停止animate运行
animate.stop();
// 运行animate
animate.start();
// animate重启，队列清空，重新执行一个setInterval
animate.restart();
// 停止某个动画
animate.finishById(id);
// 停止所有动画
animate.finishAll();
// 暂停某个动画
animate.pauseById(id);
// 继续某个动画
animate.continueById(id);
// 查找某个动画
animate.find(id);
```
# 使用示例
添加一个元素宽度的动画如下所示：
``` javascript
animate.push({
    target: document.getElementById("id").style,
    prop: "width",
    endValue: 200,
    formatValue: animate.formats.css.px
});
```
同时改变一个元素的宽度和颜色，并进行循环：
``` javascript
animate.mulPush( [
    {
        prop: "width",
        endValue: 400,
        formatValue: animate.formats.css.px
    }, {
        prop: "backgroundColor",
        startValue: [255, 56, 123], // 如果不指定开始值，默认为[0,0,0]
        endValue: [123, 56, 255],
        formatValue: animate.formats.css.rgb
    }
], {
    target: document.getElementById("block").style,
    duration: 1000,
    loopType: "repeat",
    loopTimes: 0
});
```
带关键帧的动画：
``` javascript
animate.push({
    target: document.getElementById("id").style,
    prop: "width",
	keyFrames: [
		{ value: 10, duration: 500 },
		{ value: 20, duration: 300 }
	],
    formatValue: animate.formats.css.px
});
```
带表达式的动画：
``` javascript
animate.push({
    target: document.getElementById("id").style,
    prop: "width",
	keyFrames: [
		{ value: 10, duration: 500 },
		{ value: 20, duration: 300 }
	],
    expression: function(value) {
        return Math.floor(value / 2) * 2; // 只输出偶数值
    },
    formatValue: animate.formats.css.px
});
```