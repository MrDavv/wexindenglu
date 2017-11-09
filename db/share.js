/**
 * Created by Chester.S.Liu on 2017/8/27.
 */

'use strict';
const mongoose = require('mongoose');
let db = require('./db');
let autoNumber = mongoose.models['AutoNumber'];
const modelName = 'Share';

let schema = new mongoose.Schema({
    aboutUserId :{
        type:String
    },
    status: {
        type: Number,
        default: 1, //1.未使用，0，已使用
    },
    createTime: {
        type: Date
    }
});


schema.index( {aboutUserId : 1});



schema.statics={

};

module.exports= {
    load:function(){
        let model = mongoose.model(modelName, schema);
        console.log(`模块${modelName}被注册`);
    }
};