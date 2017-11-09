let express = require('express');
let router = express.Router();
let http = require('../lib/httpHelper');
const config=require('../lib/config');

const mongoose = require('mongoose');

//红中麻将
let wechat_AppID = config.appid;
let wechat_AppSecret = config.appsecret;

//铜陵麻将
// let wechat_AppID = 'wx8297ab41f50afec2';
// let wechat_AppSecret = '9d154ecc1a58eb40b9b8df2bb8975b65';

//血战麻将
// let wechat_AppID = 'wx05379f98cf41df38';
// let wechat_AppSecret = '9a0e78f079d2f578bc156eab5cb6b319';



/**
 * 登陆
 */
router.get('/', async function(req, res, next) {
    // console.log(`获取到query: ${JSON.stringify(req.query)}`);
    // console.log(`获取到code: ${JSON.stringify(req.query.code)}`);
    // 加解密，预留
    // let encrypt_text = cryptUtil.des.encrypt(JSON.stringify(req.body),0);
    // let decrypt_text = cryptUtil.des.decrypt(encrypt_text,0);

    // code 换取 access_token
    try{
        let wechat_url = `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${wechat_AppID}&secret=${wechat_AppSecret}&code=${req.query.code}&grant_type=authorization_code`;
        let data=await http.getLocal(wechat_url);
        //console.log(`收到信息${data}`);
        let wxlogin=JSON.parse(data);
        if(wxlogin.errcode){
            throw new Error(wxlogin.errmsg);
        }
        let {access_token,expires_in,refresh_token,openid,scope,unionid} = wxlogin;

        let wechat_userinfo = `https://api.weixin.qq.com/sns/userinfo?access_token=${access_token}&openid=${openid}`;
        data=await http.getLocal(wechat_userinfo);
        let wxuserinfo=JSON.parse(data);
        if(wxuserinfo.errcode){
            throw new Error(wxuserinfo.errmsg);
        }
        let gameUserObject={openid:openid,token:access_token,wxlogin:wxlogin,wxuserinfo:wxuserinfo};
        let now=new Date().toLocaleString();
        console.log(`${now}<<${gameUserObject.wxuserinfo.nickname}>>正在登陆,openid:${openid},token:${access_token}`);
        const gameUser = mongoose.models['GameUser'];
        await gameUser.otherRegister(gameUserObject);
        res.json({code:200,openid:openid,token:access_token});
    }catch(ex){
        console.log(ex.message);
        res.json({code:500,msg:ex.message});
    }
});

module.exports = router;
