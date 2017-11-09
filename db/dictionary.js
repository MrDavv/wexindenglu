/**
 * 字典
 * Created by 王伟 on 2017/5/15.
 */
'use strict';

const mongoose = require('mongoose');
const db=require('./db');
const modelName='Dictionary';

const schema=new mongoose.Schema({
    name:{type:String,index:{unique:true}}, //字典名
    value:{type:Object}//字典值
});

schema.statics={
};

module.exports= {
    load:function(){
        let model = mongoose.model(modelName, schema);
        console.log(`模块${modelName}被注册`);
    }
};