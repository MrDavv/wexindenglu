//微信支付
const express = require('express');
const mongoose = require('mongoose');
const MD5 = require('md5');
const router = express.Router();
const fs = require('fs');
const wxPayment = require('wx-payment');
const config=require('../lib/config');

const wxOrdersModel = mongoose.models['WxOrder'];
const gameUserModel = mongoose.models['GameUser'];
const roomCardRecordModel = mongoose.models['RoomCardRecord'];
const agentUserModel = mongoose.models['AgentUser'];
const dictionaryModel = mongoose.models['Dictionary'];
const royaltyRecordModel = mongoose.models['RoyaltyRecord'];
//消息队列的处理，防止提成的时候出问题
const q=require('queue')();
q.autostart=true;



wxPayment.init({
    appid: config.appid,
    mch_id: config.mch_id,
    apiKey: config.apiKey, //微信商户平台API密钥
    pfx: fs.readFileSync('./cert/pay/apiclient_cert.p12'), //微信商户平台证书 (optional，部分API需要使用)
});

let createQueryString=function(options) {
    return Object.keys(options).filter(function(key){
        return options[key] !== undefined && options[key] !== '' && ['pfx', 'apiKey', 'sign', 'key'].indexOf(key) < 0;
    }).sort().map(function(key){
        return key + '=' + options[key];
    }).join("&");
};

let createSign=function(object, key) {
    var querystring = createQueryString(object);
    if(key) querystring += "&key=" + key;
    return MD5(querystring).toUpperCase();
};

router.get('/buycard', async function(req, res, next) {
    console.log('/buycard>>>>>>>>>>>>>');
    if(!req.query.openid){
        res.json({return_code:'FAIL',return_msg:'没有正确的openid参数'});
        return;
    }
    let gameUser=await gameUserModel.findOne({openid:req.query.openid});
    console.log('gameUser>>>>>>>>>>>>>>',JSON.stringify(gameUser));
    let order={
        body: '',
        // body: req.query.card==='40'?'购买四十张房卡':'购买四张房卡', // 商品或支付单简要描述
        out_trade_no: '', // 商户系统内部的订单号,32个字符内、可包含字母
        // total_fee: req.query.card==='40'?4800:500,
        total_fee: '',
        spbill_create_ip: '127.0.0.1',
        notify_url: 'http://'+config.domain+'/pay/notify',
        trade_type: 'NATIVE',
        product_id: '1',
        openid: req.query.openid
    };

    switch (req.query.card){
        case '12':
            order.body = '购买十二张房卡';
            order.total_fee = (!!gameUser.spreadId) ? 1200:1500;
            break;
        case '60':
            order.body = '购买六十张房卡';
            order.total_fee = (!!gameUser.spreadId) ? 5700:7000;
            break;
        case '100':
            order.body = '购买一百张房卡';
            order.total_fee = (!!gameUser.spreadId) ? 9000:10000;
            break;
        case '500':
            order.body = '购买五百张房卡';
            order.total_fee = (!!gameUser.spreadId) ? 45000:50000;
            break;
    }
    console.log(req.query.card, typeof req.query.card, JSON.stringify(order),'<<<<<<<<<<<<<<<<<<<');
    let orderModel=await wxOrdersModel.create(order);
    order.out_trade_no=orderModel._id.toString();
    wxPayment.createUnifiedOrder(order, function(err, result){
        console.log('>>>>>>>>>>>>>',result);
        if(result.return_code=="FAIL"){
            wxOrdersModel.update({_id:orderModel._id},{$set:{status:100}}).exec();
            res.json(result);
        }else{
            let payObj={
                appid:config.appid,
                partnerid:config.mch_id,
                prepayid:result.prepay_id,
                package:'Sign=WXPay',
                noncestr:result.nonce_str,
                timestamp:Math.ceil(new Date().getTime()/1000)
            };
            let sign=createSign(payObj,config.apiKey);
            res.json(Object.assign(payObj,{sign:sign,return_code:'SUCCESS'}));
            wxOrdersModel.update({_id:orderModel._id},{$set:{prepay_id:result.prepay_id,appPayMsg:payObj}}).exec();
        }
    });
});
let payConfig=null;
let getConfig=async function () {
    payConfig=await dictionaryModel.findOne({name:'代理商配置信息'});
};
getConfig();
//没过5分钟重新读取代理商配置，避免重复读取
setInterval(getConfig,300000);

router.post('/notify', async function(req, res, next) {

    console.log('threePay');
    //验证合法性
    console.log(createSign(req.body.xml,config.apiKey));
    if(req.body.xml.sign===createSign(req.body.xml,config.apiKey)){
        //由于后续数据库操作比较复杂，因此优先返回成功数据
        res.send("<xml><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[OK]]></return_msg></xml>");
        let order=await wxOrdersModel.findById(req.body.xml.out_trade_no);
        if(!!order&&order.status===0){ //等于0的订单才开启支付
            // let cardNum=order.body==="购买四十张房卡"?40:4;
            let cardNum;
            switch (order.body){
                case "购买十二张房卡":
                    cardNum = 12;
                    break;
                case "购买六十张房卡":
                    cardNum = 60;
                    break;
                case "购买一百张房卡":
                    cardNum = 100;
                    break;
                case "购买五百张房卡":
                    cardNum = 500;
                    break;
            }
            let total_fee = order.total_fee;
            //修改订单状态
            await wxOrdersModel.update({_id:order._id,__v:order.__v},{$set:{status:20,__v:order.__v+1}}).exec();
            console.log('订单状态修改完毕');
            //给用户加卡
            let gameUser=await gameUserModel.findOne({openid:order.openid});
            if(!!gameUser){
                console.log("用户存在加卡");
                await gameUserModel.update({_id:gameUser._id,__v:gameUser.__v},{$set:{roomCard:gameUser.roomCard+cardNum,money: gameUser.money+total_fee,__v:gameUser.__v+1}}).exec();
                console.log('写入房卡异动记录');
                await roomCardRecordModel.create({
                    aboutUserId: gameUser._id,
                    modifyType: 'system',
                    preNumber: gameUser.roomCard,
                    curNumber: cardNum,
                    afterNumber: gameUser.roomCard+cardNum,
                    description: order.body,
                    createTime: new Date(),
                });
                //判断该用户是否绑定了上家
                if(!!gameUser.spreadId) {
                    let agentUser = await agentUserModel.findOne({_id: gameUser.spreadId});
                    if(agentUser && agentUser.status != 100){
                        switch (agentUser.grade){
                            case 3:
                                //总代直属分成
                                q.push(async function (cb) {
                                    let percent=payConfig.value.highAgent.directProportion; //分成比例
                                    let directMoney=Math.round(order.total_fee*percent); //分成钱数，单位为分
                                    await agentUserModel.update(
                                        {_id:agentUser._id,__v:agentUser.__v},
                                        {$set:{
                                            selfBenefit:agentUser.selfBenefit+directMoney,
                                            remainedMoney:agentUser.remainedMoney+directMoney,
                                            __v:agentUser.__v+1
                                        }
                                        }).exec();
                                    await royaltyRecordModel.create({
                                        gameUid:gameUser._id,
                                        agentUid:agentUser._id,
                                        preMoney:agentUser.selfBenefit,
                                        percent:percent,
                                        money:directMoney
                                    });
                                });
                                break;
                            case 1:
                                //一级直属分成
                                q.push(async function (cb) {
                                    let percent=payConfig.value.oneAgent.directProportion; //分成比例
                                    let directMoney=Math.round(order.total_fee*percent); //分成钱数，单位为分
                                    await agentUserModel.update(
                                        {_id:agentUser._id,__v:agentUser.__v},
                                        {$set:{
                                            selfBenefit:agentUser.selfBenefit+directMoney,
                                            remainedMoney:agentUser.remainedMoney+directMoney,
                                            __v:agentUser.__v+1
                                        }
                                        }).exec();
                                    await royaltyRecordModel.create({
                                        gameUid:gameUser._id,
                                        agentUid:agentUser._id,
                                        preMoney:agentUser.selfBenefit,
                                        percent:percent,
                                        money:directMoney
                                    });
                                });
                                break;
                            case 2:
                                //二级直属分成
                                q.push(async function (cb) {
                                    let percent=payConfig.value.twoAgent.directProportion; //分成比例
                                    let directMoney=Math.round(order.total_fee*percent); //分成钱数，单位为分
                                    await agentUserModel.update(
                                        {_id:agentUser._id,__v:agentUser.__v},
                                        {$set:{
                                            selfBenefit:agentUser.selfBenefit+directMoney,
                                            remainedMoney:agentUser.remainedMoney+directMoney,
                                            __v:agentUser.__v+1
                                        }
                                        }).exec();
                                    await royaltyRecordModel.create({
                                        gameUid:gameUser._id,
                                        agentUid:agentUser._id,
                                        preMoney:agentUser.selfBenefit,
                                        percent:percent,
                                        money:directMoney
                                    });
                                });
                                break;
                        }
                    }
                    //判断该玩家是否绑定了上上家
                    if(!!gameUser.upperSpreadId){
                        let upperAgentUser = await agentUserModel.findOne({_id: gameUser.upperSpreadId});
                        if(upperAgentUser && upperAgentUser.status != 100){
                            switch (upperAgentUser.grade){
                                case 3:
                                    //总代非直属分成
                                    q.push(async function (cb) {
                                        let percent=payConfig.value.highAgent.indirectProportion; //分成比例
                                        let directMoney=Math.round(order.total_fee*percent); //分成钱数，单位为分
                                        //更新总代的下级代理贡献金额
                                        agentUser.contributionMoney += directMoney;
                                        await agentUser.save();
                                        // await agentUserModel.update(
                                        //     {_id: agentUser._id, __v: agentUser.__v},
                                        //     {$set: {
                                        //         contributionMoney: agentUser.contributionMoney + directMoney,
                                        //         __v: agentUser.__v + 1
                                        //     }
                                        //     }).exec();
                                        await agentUserModel.update(
                                            {_id:upperAgentUser._id,__v:upperAgentUser.__v},
                                            {$set:{
                                                selfBenefit:upperAgentUser.selfBenefit+directMoney,
                                                remainedMoney:upperAgentUser.remainedMoney+directMoney,
                                                __v:upperAgentUser.__v+1
                                            }
                                            }).exec();
                                        await royaltyRecordModel.create({
                                            gameUid:gameUser._id,
                                            agentUid:upperAgentUser._id,
                                            preMoney:upperAgentUser.selfBenefit,
                                            percent:percent,
                                            money:directMoney
                                        });
                                    });
                                    break;
                                case 1:
                                    //一级非直属分成
                                    q.push(async function (cb) {
                                        let percent=payConfig.value.oneAgent.indirectProportion; //分成比例
                                        let directMoney=Math.round(order.total_fee*percent); //分成钱数，单位为分
                                        //更新一级代理的下级代理的贡献金额
                                        agentUser.contributionMoney += directMoney;
                                        await agentUser.save();
                                        // await agentUserModel.update(
                                        //     {_id: agentUser._id, __v: agentUser.__v},
                                        //     {$set: {
                                        //         contributionMoney: agentUser.contributionMoney + directMoney,
                                        //         __v: agentUser.__v + 1
                                        //     }
                                        //     }).exec();
                                        await agentUserModel.update(
                                            {_id:upperAgentUser._id,__v:upperAgentUser.__v},
                                            {$set:{
                                                selfBenefit:upperAgentUser.selfBenefit+directMoney,
                                                remainedMoney:upperAgentUser.remainedMoney+directMoney,
                                                __v:upperAgentUser.__v+1
                                            }
                                            }).exec();
                                        await royaltyRecordModel.create({
                                            gameUid:gameUser._id,
                                            agentUid:upperAgentUser._id,
                                            preMoney:upperAgentUser.selfBenefit,
                                            percent:percent,
                                            money:directMoney
                                        });
                                    });
                                    break;

                            }
                        }
                        //判断该玩家是否绑定了上上上家
                        if(!!gameUser.lastSpreadId){
                            //总代隔级提成
                            let lastAgentUser = await agentUserModel.findOne({_id: gameUser.lastSpreadId});
                            if(lastAgentUser && lastAgentUser.status != 100){
                                q.push(async function (cb) {
                                    let percent=payConfig.value.highAgent.spaceProportion; //分成比例
                                    let directMoney=Math.round(order.total_fee*percent); //分成钱数，单位为分
                                    await agentUserModel.update(
                                        {_id:lastAgentUser._id,__v:lastAgentUser.__v},
                                        {$set:{
                                            selfBenefit:lastAgentUser.selfBenefit+directMoney,
                                            remainedMoney:lastAgentUser.remainedMoney+directMoney,
                                            __v:lastAgentUser.__v+1
                                        }
                                        }).exec();
                                    await royaltyRecordModel.create({
                                        gameUid:gameUser._id,
                                        agentUid:lastAgentUser._id,
                                        preMoney:lastAgentUser.selfBenefit,
                                        percent:percent,
                                        money:directMoney
                                    });
                                });
                            }
                        }
                    }
                }
            }
        }
    }else{
        console.log('回调签名不合法');
    }

});
module.exports = router;