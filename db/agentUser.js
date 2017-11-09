'use strict';

let mongoose = require('mongoose');
let db=require('./db');
let autoNumber = mongoose.models['AutoNumber'];
let modelName='AgentUser';

let schema=new mongoose.Schema({
    id: {           //游戏Id
        type: Number,
        required: true,
        index: {
            unique: true
        }
    },
    gameUid : {  //绑定玩家的_id
        type: String
    },
    realName: { //代理姓名
        type: String
    },
    tel:{//手机号
        type: String
    },
    weixinName : {//微信昵称
        type: String
    },
    address : {//地址
        type: String
    },
    status: {//状态
        type: Number,
        default: 1   //1启用，100禁用
    },
    grade: {
        type: Number, //3:总代，1:一级，2:二级，
    },
    nextAgents: {//下级代理个数
        type: Number,
        default: 0
    },
    spaceAgents: {//隔级代理个数
        type: Number,
        default: 0
    },
    gameUsers: {
        type: Number,//玩家个数
        default: 0
    },
    contributionMoney: { //贡献金额
        type: Number,
        default: 0
    },
    selfBenefit: {//自身收益
        type: Number,
        default: 0
    },
    useMoney: {//已提现总额
        type: Number,
        default: 0
    },
    //
    inReviewMoney: {//审核中总额
        type: Number,
        default: 0
    },
    remainedMoney: {//可提现总额
        type: Number,
        default: 0
    },
    parentId:{
        type:String
    },
    abutmentMan:{
        type:String
    },
    agentType:{
        type:String
    },
    password:  {
        type: String,
    },
    userName : {
        type : String
    },
    createTime :{
        type:Date
    }
    //操作 ： 查看，修改，删除
});
schema.index( {id : 1} , { unique : true });
schema.index( {userName : 1} , { unique : true });
schema.index( {grade: 1},{unique : false} );
schema.statics={
    /**
     * 根据openid查找用户，不存在返回null
     * */
    findByOpenId:async function(openid){
        const data = await this.findOne({ openid : openid });
        return data;
    },
    /**
     * 检测用户是否存在，存在则更新用户信息，不存在则注册
     * */
    register:async function(obj){
        if(!obj.id){
            let id = await autoNumber.getNewNumber(modelName);
            obj.id = id;
        }
        return await this.create(obj);
    },

    /**
     * 登陆
     * */
    checkLogin:async function(obj){
        const gameUser = await this.findOne({ userName : obj.userName , password:obj.password });
        return gameUser;
    },
    toObject : function(param){
        var obj = {};
        for(var key in this.schema.obj){
            console.log(param[key]);
            if(param[key]){
                obj[key] = param[key];
            }
        }
        return obj;
    }
};

module.exports= {
    load:function(){
        let model = mongoose.model(modelName, schema);
        console.log(`模块${modelName}被注册`);
    }
};