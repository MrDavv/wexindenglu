/**
 * Created by Administrator on 2017/9/19 0019.
 */
const mongoose = require('mongoose');
const modelName = 'Active';

let schema = new mongoose.Schema({
    // 玩家_id
    gameUserId: {
        type: String,
        require: true
    },
    // 抽奖次数
    lotteryCount: {
        type: Number,
        'default': 0
    },
    // 签到总次数
    totalSignCount: {
        type: Number,
        'default': 0
    },
    // 签到次数
    signCount: {
        type: Number,
        'default': 0
    },
    lastSignTime: {
        type: Number,
        'default': 0
    },
    // 分享次数
    shareCount: {
        type: Number,
        'default': 0
    },
    // 最近分享时间
    lastShareTime: {
        type: Number,
        'default': 0
    },
    // 游戏局数
    gameRound: {
        type: Number,
        'default': 0
    }
});

schema.index({gameUserId: 1}, {unique: true});

module.exports = {
    load: function () {
        mongoose.model(modelName, schema);
        console.log(`${modelName}模块已注册`);
    }
};