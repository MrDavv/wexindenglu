var express = require('express');
var router = express.Router();
const mongoose = require('mongoose');
const wxOrdersModel = mongoose.models['WxOrder'];
const gameUserModel = mongoose.models['GameUser'];
const roomCardRecordModel = mongoose.models['RoomCardRecord'];
const agentUserModel = mongoose.models['AgentUser'];
const dictionaryModel = mongoose.models['Dictionary'];
const royaltyRecordModel = mongoose.models['RoyaltyRecord'];
//消息队列的处理，防止提成的时候出问题
const q=require('queue')();
q.autostart=true;

let payConfig=null;
let getConfig=async function () {
    payConfig=await dictionaryModel.findOne({name:'代理商配置信息'});
};
getConfig();
//没过5分钟重新读取代理商配置，避免重复读取
setInterval(getConfig,300000);
router.get('/testPay', async function(req, res, next) {
    // let payConfig= await dictionaryModel.findOne({name:'代理商配置信息'});
    // console.log(payConfig,'<<<<<<<<<<<<代理商配置信息')
    // var a=JSON.parse(req.body.a);
    // res.json({a:1});
    // next();
    //req.query.card==='40'?'购买四十张房卡':'购买四张房卡'
console.log(11111111111)
     let  openid = 'o0Xjz0Qig_RBm1wAh9RivynyOS-4';
    let gameUser = await gameUserModel.findOne({openid:openid});


    let order={
        body: '购买四张房卡', // 商品或支付单简要描述
        out_trade_no: '', // 商户系统内部的订单号,32个字符内、可包含字母
        total_fee: 500,
        spbill_create_ip: '127.0.0.1',
        // notify_url: 'http://'+config.domain+'/pay/notify',
        trade_type: 'NATIVE',
        product_id: '1',
        openid: gameUser.openid,
        status:20,
        create_at: new Date(),
        spreadId:gameUser.spreadId
    };
    let cardNum = order.total_fee == 500?4 : 40;
    let total_fee = order.total_fee;
    console.log(total_fee,cardNum,'<<<<<<<<<<<<<<,,total_fee')
    await wxOrdersModel.create(order);
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
            let upperAgentUser = await agentUserModel.findOne({_id: gameuser.upperSpreadId});
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
    // if(!!gameUser.spreadId) {
    //     let agentUser = await agentUserModel.findOne({_id: gameUser.spreadId});
    //     if(agentUser && agentUser.status != 100){
    //         switch (agentUser.grade){
    //             case 3:
    //                 //总代直属分成
    //                 q.push(async function (cb) {
    //                     let percent=payConfig.value.highAgent.directProportion; //分成比例
    //                     let directMoney=Math.round(order.total_fee*percent); //分成钱数，单位为分
    //                     await agentUserModel.update(
    //                         {_id:agentUser._id,__v:agentUser.__v},
    //                         {$set:{
    //                             selfBenefit:agentUser.selfBenefit+directMoney,
    //                             remainedMoney:agentUser.remainedMoney+directMoney,
    //                             __v:agentUser.__v+1
    //                         }
    //                         }).exec();
    //                     await royaltyRecordModel.create({
    //                         gameUid:gameUser._id,
    //                         agentUid:agentUser._id,
    //                         preMoney:agentUser.selfBenefit,
    //                         percent:percent,
    //                         money:directMoney
    //                     });
    //                 });
    //                 break;
    //             case 1:
    //                 //一级直属分成
    //                 q.push(async function (cb) {
    //                     let percent=payConfig.value.oneAgent.directProportion; //分成比例
    //                     let directMoney=Math.round(order.total_fee*percent); //分成钱数，单位为分
    //                     await agentUserModel.update(
    //                         {_id:agentUser._id,__v:agentUser.__v},
    //                         {$set:{
    //                             selfBenefit:agentUser.selfBenefit+directMoney,
    //                             remainedMoney:agentUser.remainedMoney+directMoney,
    //                             __v:agentUser.__v+1
    //                         }
    //                         }).exec();
    //                     await royaltyRecordModel.create({
    //                         gameUid:gameUser._id,
    //                         agentUid:agentUser._id,
    //                         preMoney:agentUser.selfBenefit,
    //                         percent:percent,
    //                         money:directMoney
    //                     });
    //                 });
    //                 break;
    //             case 2:
    //                 //二级直属分成
    //                 q.push(async function (cb) {
    //                     let percent=payConfig.value.twoAgent.directProportion; //分成比例
    //                     let directMoney=Math.round(order.total_fee*percent); //分成钱数，单位为分
    //                     await agentUserModel.update(
    //                         {_id:agentUser._id,__v:agentUser.__v},
    //                         {$set:{
    //                             selfBenefit:agentUser.selfBenefit+directMoney,
    //                             remainedMoney:agentUser.remainedMoney+directMoney,
    //                             __v:agentUser.__v+1
    //                         }
    //                         }).exec();
    //                     await royaltyRecordModel.create({
    //                         gameUid:gameUser._id,
    //                         agentUid:agentUser._id,
    //                         preMoney:agentUser.selfBenefit,
    //                         percent:percent,
    //                         money:directMoney
    //                     });
    //                 });
    //                 break;
    //         }
    //     }
    //
    //     //判断该玩家是否绑定了上上家
    //     if(!!gameUser.upperSpreadId){
    //         let upperAgentUser = await agentUserModel.findOne({_id: gameUser.upperSpreadId});
    //         if(upperAgentUser && upperAgentUser.status != 100){
    //             switch (upperAgentUser.grade){
    //                 case 3:
    //                     //总代非直属分成
    //                     q.push(async function (cb) {
    //                         let percent=payConfig.value.highAgent.indirectProportion; //分成比例
    //                         let directMoney=Math.round(order.total_fee*percent); //分成钱数，单位为分
    //                         //更新总代的下级代理贡献金额
    //                         agentUser.contributionMoney += directMoney;
    //                         await agentUser.save();
    //                         // await agentUserModel.update(
    //                         //     {_id: agentUser._id, __v: agentUser.__v},
    //                         //     {$set: {
    //                         //         contributionMoney: agentUser.contributionMoney + directMoney,
    //                         //         __v: agentUser.__v + 1
    //                         //     }
    //                         //     }).exec();
    //                         await agentUserModel.update(
    //                             {_id:upperAgentUser._id,__v:upperAgentUser.__v},
    //                             {$set:{
    //                                 selfBenefit:upperAgentUser.selfBenefit+directMoney,
    //                                 remainedMoney:upperAgentUser.remainedMoney+directMoney,
    //                                 __v:upperAgentUser.__v+1
    //                             }
    //                             }).exec();
    //                         await royaltyRecordModel.create({
    //                             gameUid:gameUser._id,
    //                             agentUid:upperAgentUser._id,
    //                             preMoney:upperAgentUser.selfBenefit,
    //                             percent:percent,
    //                             money:directMoney
    //                         });
    //                     });
    //                     break;
    //                 case 1:
    //                     //一级非直属分成
    //                     q.push(async function (cb) {
    //                         let percent=payConfig.value.oneAgent.indirectProportion; //分成比例
    //                         let directMoney=Math.round(order.total_fee*percent); //分成钱数，单位为分
    //                         //更新一级代理的下级代理的贡献金额
    //                         agentUser.contributionMoney += directMoney;
    //                         await agentUser.save();
    //                         // await agentUserModel.update(
    //                         //     {_id: agentUser._id, __v: agentUser.__v},
    //                         //     {$set: {
    //                         //         contributionMoney: agentUser.contributionMoney + directMoney,
    //                         //         __v: agentUser.__v + 1
    //                         //     }
    //                         //     }).exec();
    //                         await agentUserModel.update(
    //                             {_id:upperAgentUser._id,__v:upperAgentUser.__v},
    //                             {$set:{
    //                                 selfBenefit:upperAgentUser.selfBenefit+directMoney,
    //                                 remainedMoney:upperAgentUser.remainedMoney+directMoney,
    //                                 __v:upperAgentUser.__v+1
    //                             }
    //                             }).exec();
    //                         await royaltyRecordModel.create({
    //                             gameUid:gameUser._id,
    //                             agentUid:upperAgentUser._id,
    //                             preMoney:upperAgentUser.selfBenefit,
    //                             percent:percent,
    //                             money:directMoney
    //                         });
    //                     });
    //                     break;
    //
    //             }
    //         }
    //         //判断该玩家是否绑定了上上上家
    //         if(!!gameUser.lastSpreadId){
    //             //总代隔级提成
    //             let lastAgentUser = await agentUserModel.findOne({_id: gameUser.lastSpreadId});
    //             if(lastAgentUser && lastAgentUser.status != 100){
    //                 q.push(async function (cb) {
    //                     let percent=payConfig.value.highAgent.spaceProportion; //分成比例
    //                     let directMoney=Math.round(order.total_fee*percent); //分成钱数，单位为分
    //                     await agentUserModel.update(
    //                         {_id:lastAgentUser._id,__v:lastAgentUser.__v},
    //                         {$set:{
    //                             selfBenefit:lastAgentUser.selfBenefit+directMoney,
    //                             remainedMoney:lastAgentUser.remainedMoney+directMoney,
    //                             __v:lastAgentUser.__v+1
    //                         }
    //                         }).exec();
    //                     await royaltyRecordModel.create({
    //                         gameUid:gameUser._id,
    //                         agentUid:lastAgentUser._id,
    //                         preMoney:lastAgentUser.selfBenefit,
    //                         percent:percent,
    //                         money:directMoney
    //                     });
    //                 });
    //             }
    //         }
    //     }
    // }
    // if(!!gameUser.spreadId){
    //     console.log('绑定推广码的有提成')
    //     let agentUser=await agentUserModel.findOne({_id:gameUser.spreadId});
    //     console.log(agentUser,'<<<<<<<<<<<<<<<<');
    //     if(!!agentUser&&agentUser.status!==100){ //代理存在，并且未被锁定
    //         console.log(agentUser.grade,'<<<<<<<<<代理商等级');
    //         switch(agentUser.grade){
    //             case 3:{
    //                 //总代分成
    //                 q.push(async function (cb) {
    //                     let percent=payConfig.value.highAgent.directProportion; //分成比例
    //                     let directMoney=Math.round(order.total_fee*percent); //分成钱数，单位为分
    //                     await agentUserModel.update(
    //                         {_id:agentUser._id,__v:agentUser.__v},
    //                         {$set:{
    //                             contributionMoney:agentUser.contributionMoney+directMoney,
    //                             remainedMoney:agentUser.remainedMoney+directMoney,
    //                             __v:agentUser.__v+1
    //                         }
    //                         }).exec();
    //                     await royaltyRecordModel.create({
    //                         gameUid:gameUser._id,
    //                         agentUid:agentUser._id,
    //                         preMoney:agentUser.contributionMoney,
    //                         percent:percent,
    //                         money:directMoney
    //                     });
    //                 });
    //                 break;
    //             }
    //             case 1:{
    //                 //一级代理
    //                 q.push(async function (cb) {
    //                     let onePercent=payConfig.value.oneAgent.directProportion; //分成比例
    //                     let oneDirectMoney=Math.round(order.total_fee*onePercent); //分成钱数，单位为分
    //                     //一级分成记录写入
    //                     await agentUserModel.update(
    //                         {_id:agentUser._id,__v:agentUser.__v},
    //                         {$set:{
    //                             contributionMoney:agentUser.contributionMoney+oneDirectMoney,
    //                             remainedMoney:agentUser.remainedMoney+oneDirectMoney,
    //                             __v:agentUser.__v+1
    //                         }
    //                         }).exec();
    //                     await royaltyRecordModel.create({
    //                         gameUid:gameUser._id,
    //                         agentUid:agentUser._id,
    //                         preMoney:agentUser.contributionMoney,
    //                         percent:onePercent,
    //                         money:oneDirectMoney
    //                     });
    //                     //二级分成记录写入
    //                     let parentAgentUser=await agentUserModel.findOne({_id:agentUser.parentId});
    //                     if(!!parentAgentUser){
    //                         let twoPercent=payConfig.value.highAgent.indirectProportion; //分成比例
    //                         let twoDirectMoney=Math.round(order.total_fee*twoPercent); //分成钱数，单位为分
    //                         await agentUserModel.update(
    //                             {_id:parentAgentUser._id,__v:parentAgentUser.__v},
    //                             {$set:{
    //                                 contributionMoney:parentAgentUser.contributionMoney+twoDirectMoney,
    //                                 remainedMoney:parentAgentUser.remainedMoney+twoDirectMoney,
    //                                 __v:parentAgentUser.__v+1
    //                             }
    //                             }).exec();
    //                         await royaltyRecordModel.create({
    //                             gameUid:gameUser._id,
    //                             agentUid:parentAgentUser._id,
    //                             preMoney:parentAgentUser.contributionMoney,
    //                             percent:twoPercent,
    //                             money:twoDirectMoney
    //                         });
    //                     }
    //                 });
    //                 break;
    //             }
    //             default:{
    //                 //二级代理
    //                 q.push(async function (cb) {
    //                     let onePercent = payConfig.value.twoAgent.directProportion; //分成比例
    //                     let oneDirectMoney = Math.round(order.total_fee * onePercent); //分成钱数，单位为分
    //                     //一级分成记录写入
    //                     await agentUserModel.update(
    //                         {_id: agentUser._id, __v: agentUser.__v},
    //                         {
    //                             $set: {
    //                                 contributionMoney: agentUser.contributionMoney + oneDirectMoney,
    //                                 remainedMoney: agentUser.remainedMoney + oneDirectMoney,
    //                                 __v: agentUser.__v + 1
    //                             }
    //                         }).exec();
    //                     await royaltyRecordModel.create({
    //                         gameUid: gameUser._id,
    //                         agentUid: agentUser._id,
    //                         preMoney: agentUser.contributionMoney,
    //                         percent: onePercent,
    //                         money: oneDirectMoney
    //                     });
    //                     //二级分成记录写入
    //                     let parentAgentUser=await agentUserModel.findOne({_id:agentUser.parentId});
    //                     if(!!parentAgentUser){
    //                         if(parentAgentUser.grade==3){//如果该二级代理的上家是总代
    //                             let twoPercent=payConfig.value.highAgent.indirectProportion; //分成比例
    //                             let twoDirectMoney=Math.round(order.total_fee*twoPercent); //分成钱数，单位为分
    //                             await agentUserModel.update(
    //                                 {_id:parentAgentUser._id,__v:parentAgentUser.__v},
    //                                 {$set:{
    //                                     contributionMoney:parentAgentUser.contributionMoney+twoDirectMoney,
    //                                     remainedMoney:parentAgentUser.remainedMoney+twoDirectMoney,
    //                                     __v:parentAgentUser.__v+1
    //                                 }
    //                                 }).exec();
    //                             await royaltyRecordModel.create({
    //                                 gameUid:gameUser._id,
    //                                 agentUid:parentAgentUser._id,
    //                                 preMoney:parentAgentUser.contributionMoney,
    //                                 percent:twoPercent,
    //                                 money:twoDirectMoney
    //                             });
    //                         }
    //
    //                         if(parentAgentUser.grade==1){ //如果该二级代理的上家是一级代理
    //                             let twoPercent=payConfig.value.oneAgent.indirectProportion; //分成比例
    //                             let twoDirectMoney=Math.round(order.total_fee*twoPercent); //分成钱数，单位为分
    //                             await agentUserModel.update(
    //                                 {_id:parentAgentUser._id,__v:parentAgentUser.__v},
    //                                 {$set:{
    //                                     contributionMoney:parentAgentUser.contributionMoney+twoDirectMoney,
    //                                     remainedMoney:parentAgentUser.remainedMoney+twoDirectMoney,
    //                                     __v:parentAgentUser.__v+1
    //                                 }
    //                                 }).exec();
    //                             await royaltyRecordModel.create({
    //                                 gameUid:gameUser._id,
    //                                 agentUid:parentAgentUser._id,
    //                                 preMoney:parentAgentUser.contributionMoney,
    //                                 percent:twoPercent,
    //                                 money:twoDirectMoney
    //                             });
    //                             //三级分成写入
    //                             let highAgentUser=await agentUserModel.findOne({_id:parentAgentUser.parentId});
    //                             if(!!highAgentUser&&highAgentUser.grade==3){
    //                                 let threePercent=payConfig.value.highAgent.spaceProportion; //分成比例
    //                                 let threeDirectMoney=Math.round(order.total_fee*threePercent); //分成钱数，单位为分
    //                                 await agentUserModel.update(
    //                                     {_id:highAgentUser._id,__v:highAgentUser.__v},
    //                                     {$set:{
    //                                         contributionMoney:highAgentUser.contributionMoney+threeDirectMoney,
    //                                         remainedMoney:highAgentUser.remainedMoney+threeDirectMoney,
    //                                         __v:highAgentUser.__v+1
    //                                     }
    //                                     }).exec();
    //                                 await royaltyRecordModel.create({
    //                                     gameUid:gameUser._id,
    //                                     agentUid:highAgentUser._id,
    //                                     preMoney:highAgentUser.contributionMoney,
    //                                     percent:threePercent,
    //                                     money:threeDirectMoney
    //                                 });
    //                             }
    //                         }
    //                     }
    //                 });
    //                 break;
    //             }
    //         }
    //     }
    // }

    return res.send({code:200})
});

// router.post('/', function(req, res, next) {
//     console.log(req.body.username);
//     res.send('ok');
//     //next();
// });

module.exports = router;