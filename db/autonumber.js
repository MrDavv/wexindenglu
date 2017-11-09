/**
 * 生成自增的数字ID
 * Created by Administrator on 2017/3/1.
 */
'use strict';

let mongoose = require('mongoose');
let db=require('./db');
let installGameIdModel = mongoose.models['InstallGameId'];

let schema=new mongoose.Schema({
    currentNumber: Number,
    collectionName: {
        type: String,
        required: true,
        index: {
            unique: true
        }
    }
});

schema.index( {collectionName : 1}, { unique : true } );

schema.statics={
    getNewNumber:async function(collectionName){
        let data=await this.findOne({collectionName:collectionName});
        if(data){
            await this.update({collectionName:collectionName,__v:data.__v},{$set:{currentNumber:data.currentNumber+1,__v:data.__v+1}}).exec();
            return data.currentNumber;
        }else{
            await this.create({collectionName:collectionName,currentNumber:100001});
            return 100000;
        }
    },
    otherGetNewNumber:async function(collectionName){
        let data= await this.findOne({collectionName:collectionName});
        let InstallGameId = await installGameIdModel.findOne({name:'InstallGameId'});
        await this.update({collectionName:collectionName,__v:data.__v},{$set:{currentNumber:data.currentNumber+1,__v:data.__v+1}}).exec();
        return {id:InstallGameId.arr[data.currentNumber], userid: data.currentNumber+1};
    }
};

module.exports= {
    load:function(){
        let model = mongoose.model('AutoNumber', schema);
        console.log('模块AutoNumber被注册');
    }
};