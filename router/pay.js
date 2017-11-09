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
//测试openid:ol9tcw861XVjXTnSL6dNBDpsss8o

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
}

let createSign=function(object, key) {
    var querystring = createQueryString(object);
    if(key) querystring += "&key=" + key;
    return MD5(querystring).toUpperCase();
}

router.get('/onecard', async function(req, res, next) {
    if(!req.query.openid){
        res.json({return_code:'FAIL',return_msg:'没有正确的openid参数'});
        return;
    }
    let order={
        body: '购买单张房卡', // 商品或支付单简要描述
        out_trade_no: '', // 商户系统内部的订单号,32个字符内、可包含字母
        total_fee: 1,
        spbill_create_ip: '127.0.0.1',
        notify_url: 'http://hzwx.fzhmsy.com.cn/pay/notify',
        trade_type: 'NATIVE',
        product_id: '1',
        openid: req.query.openid
    };
    let orderModel=await wxOrdersModel.create(order);
    order.out_trade_no=orderModel._id.toString();
    wxPayment.createUnifiedOrder(order, function(err, result){
        //console.log(result);
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

router.get('/buycard', async function(req, res, next) {
    if(!req.query.openid){
        res.json({return_code:'FAIL',return_msg:'没有正确的openid参数'});
        return;
    }
    let order={
        body: req.query.card==='10'?'购买十张房卡':'购买单张房卡', // 商品或支付单简要描述
        out_trade_no: '', // 商户系统内部的订单号,32个字符内、可包含字母
        total_fee: req.query.card==='10'?4800:500,
        spbill_create_ip: '127.0.0.1',
        notify_url: 'http://hzwx.fzhmsy.com.cn/pay/notify',
        trade_type: 'NATIVE',
        product_id: '1',
        openid: req.query.openid
    };
    let orderModel=await wxOrdersModel.create(order);
    order.out_trade_no=orderModel._id.toString();
    wxPayment.createUnifiedOrder(order, function(err, result){
        //console.log(result);
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

// 0|hzwx     | post: { xml:
//     0|hzwx     |    { appid: 'wxf0204bd2fa1abbac',
//         0|hzwx     |      bank_type: 'CFT',
// 0|hzwx     |      cash_fee: '1',
// 0|hzwx     |      fee_type: 'CNY',
// 0|hzwx     |      is_subscribe: 'N',
// 0|hzwx     |      mch_id: '1443443102',
// 0|hzwx     |      nonce_str: 'ir22qd09p6b1g07h30xef80k',
// 0|hzwx     |      openid: 'ol9tcw861XVjXTnSL6dNBDpsss8o',
// 0|hzwx     |      out_trade_no: '5994ffd9220acb17a5942a43',
// 0|hzwx     |      result_code: 'SUCCESS',
// 0|hzwx     |      return_code: 'SUCCESS',
// 0|hzwx     |      sign: 'D45065FFF581F0910732D42DCE21BAD9',
// 0|hzwx     |      time_end: '20170817103100',
// 0|hzwx     |      total_fee: '1',
// 0|hzwx     |      trade_type: 'NATIVE',
// 0|hzwx     |      transaction_id: '4007692001201708176670636597' } }

router.post('/notify', async function(req, res, next) {
    //验证合法性
    console.log(createSign(req.body.xml,config.apiKey));
    if(req.body.xml.sign===createSign(req.body.xml,config.apiKey)){
        let order=await wxOrdersModel.findById(req.body.xml.out_trade_no);
        if(!!order&&order.status===0){ //等于0的订单才开启支付
            let cardNum=order.body==="购买十张房卡"?10:1;
            //修改订单状态
            await wxOrdersModel.update({_id:order._id,__v:order.__v},{$set:{status:20,__v:order.__v+1}}).exec();
            console.log('订单状态修改完毕');
            //给用户加卡
            let gameUser=await gameUserModel.findOne({openid:order.openid});
            if(!!gameUser){
                console.log("用户存在加卡");
                await gameUserModel.update({_id:gameUser._id,__v:gameUser.__v},{$set:{roomCard:gameUser.roomCard+cardNum,__v:gameUser.__v+1}}).exec();
            }
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
        }
    }else{
        console.log('回调签名不合法');
    }
    res.send("<xml><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[OK]]></return_msg></xml>");
});
module.exports = router;