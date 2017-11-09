/**
 * Created by wangwei on 2017/6/3.
 */
const schedule = require('node-schedule');
const mongoose = require('mongoose');
const activeModel = mongoose.models['Active'];
// const async = reuqire('async');
// 6个占位符从左到右分别代表：秒、分、时、日、月、周几
// '*'表示通配符，匹配任意，当秒是'*'时，表示任意秒数都触发，其它类推
// 下面可以看看以下传入参数分别代表的意思
// 每分钟的第30秒触发： '30 * * * * *'
// 每小时的1分30秒触发 ：'30 1 * * * *'
// 每天的凌晨1点1分30秒触发 ：'30 1 1 * * *'
// 每月的1日1点1分30秒触发 ：'30 1 1 1 * *'
// 2016年的1月1日1点1分30秒触发 ：'30 1 1 1 2016 *'
// 每周1的1点1分30秒触发 ：'30 1 1 * * 1'
var scheduleCronstyle = function(){
    schedule.scheduleJob('0 * * * * *',async function(){
        let activeCount = await activeModel.count({});
        if(activeCount > 0){
            console.log('清空activeModel');
            let result = await activeModel.remove({})
        }
    });
};
exports.scheduleCronstyle = scheduleCronstyle;