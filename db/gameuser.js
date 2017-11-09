'use strict';

let mongoose = require('mongoose');
let db=require('./db');
let autoNumber = mongoose.models['AutoNumber'];
let modelName='GameUser';

let schema=new mongoose.Schema({
    id: {
        type: Number,
        required: true,
        index: {
            unique: true
        }
    },
    openid: {
        type: String,
        required: true,
        index: {
            unique: true
        }
    },
    roomCard:{
        type: Number,
        "default": 0
    },
    token: String,
    ipaddress: String,
    wxlogin: Object,
    wxuserinfo: Object,
    lastLoginTime:{
        type: Date,
        "default": Date.now
    },
    loginTimes:{type:Number,default:0},
    created_at: {
        type: Date,
        "default": Date.now
    },
    userIdentification:{
        type: Number,
    },
    money:{//充值金额
        type: Number,
        default: 0
    },
    spreadId: {//推广人_id
        type: String,
        default: null
    },
    upperSpreadId: {//上家推广人_id
        type: String,
        default: null
    },
    lastSpreadId: {//上上家推广人_id
        type: String,
        default: null
    },
    changeSpreadId_at: {//修改推广人时间
        type: Date,
        default: new Date()
    }
});
schema.index( {id : 1} , { unique : true });
schema.index( {openid : 1} , { unique : true });
schema.index( {spreadId : 1} , { unique : false });
schema.index( {upperSpreadId : 1} , { unique : false });
schema.index( {lastSpreadId : 1} , { unique : false });
schema.index( {userIdentification : 1}, {unique : false});

schema.statics={
    /**
     * 根据openid查找用户，不存在返回null
     * */
    findByOpenId:async function(openid){
        const data=await this.findOne({ openid : openid });
        return data;
    },
    /**
     * 检测用户是否存在，存在则更新用户信息，不存在则注册
     * */
    register:async function(obj){
        const data=await this.findOne({ openid : obj.openid });
        if(data){
            if(data.status===100)
            {
                throw new Error('您的帐号已经被封禁！');
            }
            await this.update({openid:obj.openid},obj);
        }else{
            let n=await autoNumber.getNewNumber(modelName);
            let gameUser=Object.assign({},obj,{id:n,roomCard:3});
            await this.create(gameUser,(error)=>{
                if(error) {
                    console.log(`新增用户失败 ${error.msg}`);
                } else {
                    console.log('新增用户成功');
                }
            });
        }
    },
    otherRegister:async function(obj){

        const data=await this.findOne({ openid : obj.openid });
        if(data){
            if(data.status===100)
            {
                throw new Error('您的帐号已经被封禁！');
            }
            await this.update({openid:obj.openid},obj);
        }else{
            let o =await autoNumber.otherGetNewNumber(modelName);
            console.log('otherRegister>>>>>>>>',JSON.stringify(o));
            let gameUser=Object.assign({},obj,{id:o.id,roomCard:10, userIdentification: o.userid});
            await this.create(gameUser,(error)=>{
                if(error) {
                    console.log(`新增用户失败 ${error.msg}`);
                } else {
                    console.log('新增用户成功');
                }
            });
        }
    },

    /**
     * 验证用户的openid与token是否对应
     * */
    checkLogin:async function(obj){
        const gameUser=await this.findOne({ openid : obj.openid,token:obj.token });
        return !!gameUser;
    },
    /**
     * 根据openid获取用户微信信息
     * */
    getWXUserInfo:async function(openid) {
        const gameUser = await this.findOne({openid: openid});
        return gameUser ? Object.assign(gameUser.wxuserinfo,{id:gameUser.id,roomCard:gameUser.roomCard}): null;
    },
};

module.exports= {
    load:function(){
        let model = mongoose.model(modelName, schema);
        console.log(`模块${modelName}被注册`);
    }
};