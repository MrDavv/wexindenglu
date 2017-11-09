/**
 * Created by yaoyao on 2017/8/16.
 */
//微信支付订单
'use strict';

let mongoose = require('mongoose');
let db=require('./db');
let autoNumber = mongoose.models['AutoNumber'];
let modelName='WxOrder';

let schema=new mongoose.Schema({
    openid: {
        type: String,
        required: true
    },
    body:String, //支付描述
    total_fee:Number, //支付金额 单位为分
    trade_type:String, //支付类型 目前为Native
    prepay_id:String, //微信返回的订单ID
    appPayMsg:Object,
    created_at: {
        type: Date,
        "default": Date.now
    },
    status:{
        type: Number,
        "default": 0  //0未支付  20支付完成  100错误
    },
    // spreadId: {//推广人_id
    //     type: String
    // }
});
schema.index( {openid : 1} , { unique : false });
schema.index( {created_at : 1} , { unique : false });
// schema.index( {spreadId : 1} , { unique : false });
schema.statics={
};

module.exports= {
    load:function(){
        let model = mongoose.model(modelName, schema);
        console.log(`模块${modelName}被注册`);
    }
};