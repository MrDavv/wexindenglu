/**
 * Created by Chester.S.Liu on 2017/8/27.
 */

'use strict';
const mongoose = require('mongoose');
let db = require('./db');
let autoNumber = mongoose.models['AutoNumber'];
const modelName = 'signShare';

let schema = new mongoose.Schema({
    uid :{
        type:String
    },
    //  总签到次数
    totalSignCount : {
        type: Number,
        default: 0
    },
    //  签到次数
    signCount : {
        type: Number,
        default: 0
    },
    //  签到时间
    createTime : {
        type : Number,
        default: 0
    },
    // 分享次数
    shareCount: {
        type: Number,
        default: 0
    },
    //
    newShareCount: {
        type: Number,
        default: 0
    },
    // 最近分享时间
    lastShareTime: {
        type: Number,
        default: 0
    }
});


schema.index( {uid : 1});
schema.index( {gameId : 1});


schema.statics={

};

module.exports= {
    load:function(){
        let model = mongoose.model(modelName, schema);
        console.log(`模块${modelName}被注册`);
    }
};