/**
 * Created by 王伟 on 2017/10/17.
 */
//添加提成记录表

'use strict';

let mongoose = require('mongoose');
let db=require('./db');
let autoNumber = mongoose.models['AutoNumber'];
let modelName='RoyaltyRecord';

let schema=new mongoose.Schema({
    gameUid: {//玩家ID
        type: String
    },
    agentUid: {//代理_id
        type: String
    },
    percent:{//本次提成百分比
        type: Number,
        default: 0
    },
    preMoney:{//提成之前的总的已提成金额，单位为分，不会自动减去已提现部分
        type: Number,
        default: 0
    },
    money: {//提成金额，单位为分
        type: Number,
        default: 0
    },
});
schema.index( {agentUid : 1} , { unique : false });
schema.statics={
};

module.exports= {
    load:function(){
        let model = mongoose.model(modelName, schema);
        console.log(`模块${modelName}被注册`);
    }
};