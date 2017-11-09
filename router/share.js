/**
 * Created by wangwei on 2017/9/21.
 */
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const gameUserModel = mongoose.models['GameUser'];
const activeModel = mongoose.models['Active'];
const signShareModel = mongoose.models['signShare'];
const roomCardRecordModel = mongoose.models['RoomCardRecord'];
const shareModel = mongoose.models['Share'];
const startTime = new Date('2017/9/30');
const endTime = new Date('2017/10/08');
//红中国庆活动分享
router.get('/userShare',async function(req, res, next) {
    //检测用户是否存在
    let openid = req.query.openid;
    if(!openid){
        return res.json({code: 500, msg: '没有正确的openid参数'});
    }
    let gameUser = await gameUserModel.findByOpenId(openid);
    if(!gameUser){
        return res.json({code: 500, msg: '该玩家不存在!!!'});
    }
    let gameUserActive = await activeModel.findOne({gameUserId: gameUser._id});
    if(!gameUserActive){
        gameUserActive = await activeModel.create({gameUserId: gameUser._id});
    }
    let time = new Date();
    // 活动时间内分享才能累计抽奖次数，并且每天只能添加一次抽奖机会
    if(time.getTime() < startTime.getTime()){
        return res.json({code: 200, type: 3, msg: '活动尚未开始'});
    }
    if(time.getTime() > endTime.getTime()){
        return res.json({code: 200, type: 3, msg: '活动已经结束'});
    }
    let dayTime = new Date(time.getFullYear(), time.getMonth(), time.getDate());
    let shareTime = gameUserActive.lastShareTime;
    let timeDifference = shareTime - dayTime.getTime();
    if(timeDifference < 0){
        gameUserActive.shareCount += 1;
        gameUserActive.lotteryCount += 1;
        gameUserActive.lastShareTime = time.getTime();
        await gameUserActive.save();
        return res.json({code: 200, type: 1, msg: '感谢您的分享，已额外获得一次抽奖次数，祝您中奖！'});
    }
    res.json({code: 200, type: 2, msg: '十分感谢您的热心参与，每天仅能通过分享获得一次抽奖机会，记得明天继续分享哟！'});
});

//铜陵分享拿房卡
router.get('/tlUserShare',async function(req, res, next) {
    //检测用户是否存在
    let openid = req.query.openid;
    if(!openid){
        return res.json({code: 500, msg: '没有正确的openid参数'});
    }
    let gameUser = await gameUserModel.findByOpenId(openid);
    if(!gameUser){
        return res.json({code: 500, msg: '该玩家不存在!!!'});
    }
    //判断当天有无分享记录
    let time = new Date();
    let startDayTime = new Date(time.getFullYear(), time.getMonth(), time.getDate());
    let endDayTime = new Date(time.getFullYear(), time.getMonth(), time.getDate() + 1);
    let shareRecord = await shareModel.findOne({aboutUserId: gameUser._id,createTime:{$gte: startDayTime, $lte: endDayTime}});
    //有则返回已分享
    if(!!shareRecord){
        res.send({code: 200, msg: '已分享'});
    }else{
        //无，插入分享记录，，
        await shareModel.create({
            aboutUserId: gameUser._id,
            createTime: new Date(),
        });
        //再判断是否有5条未使用记录
        let noUseShare = await shareModel.find({aboutUserId: gameUser._id,status:1});
        let count = await shareModel.count({aboutUserId: gameUser._id,status:1});

        if(count === 5){
            //更改这5条记录的状态为已使用
            for(let i = 0 ; i < count; i++){
                await shareModel.update({_id: noUseShare[i]._id}, {status: 0}).exec();
            }
            //加房卡，创房卡异动记录表
            await gameUserModel.update({_id: gameUser._id, __v: gameUser.__v}, {roomCard: gameUser.roomCard + 1, __v: gameUser.__v + 1}).exec();
            await roomCardRecordModel.create({
                aboutUserId: gameUser._id,
                modifyType: 'system',
                preNumber: gameUser.roomCard,
                curNumber: 1,
                afterNumber: gameUser.roomCard+1,
                description: '累计分享5次赠送一张房卡',
                createTime: new Date(),
            });
            res.send({code: 200, msg: '分享成功，请稍后刷新您的房卡'});
        }else{
            res.send({code: 200, msg: '分享成功'});
        }
    }
});



module.exports = router;