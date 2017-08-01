# 介绍
该脚本设计初衷是为了满足浏览器页面的动画效果，支持IE、谷歌、火狐，设计的最后脚本更为通用，不仅是应用到页面元素。

为了处理的高效，所有动画是统一管理的。核心函数为setInterval，没有这个函数也无法实现动画效果。脚本只会开一个setInterval，刷新周期为5毫秒，所有动画都在队列之中，当一个周期之后，队列将会被刷新一次，例如动画间隔为30毫秒的动画将会在六个周期之后被更新，而已完成的动画将会被排除在队列之外。

# 属性方法

### 可配置属性：
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
### 附加属性：
	startTime: 0, // 开始时间
	endTime: 0, // 结束时间
	prevFrameTime: 0, // 上一帧动画时间
	status: "animate" || "pause" || "finished"
### 方法
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

# 使用示例
添加一个元素宽度的动画如下所示：
```
animate.push({
    target: document.getElementById("id").style,
    prop: "width",
    endValue: 200,
    formatValue: animate.formats.css.px;
});
```
同时改变一个元素的宽度和颜色，并进行循环：
```
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