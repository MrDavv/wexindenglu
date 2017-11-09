/**
 * Created by fengtaotao on 2017/7/26.
 */
'use strict';

const mongoose = require('mongoose');
const db=require('./db');
const modelName='RoomCardRecord';

const schema=new mongoose.Schema({
    aboutUserId: String,
    modifyType: String,
    preNumber: Number,
    curNumber: Number,
    afterNumber: Number,
    description: String,
    createTime: Date
});

schema.index( {aboutUserId : 1} );

module.exports= {
    load:function(){
        let model = mongoose.model(modelName, schema);     //把模型与数据中的表连接起来
        console.log(`模块${modelName}被注册`);
    }
};