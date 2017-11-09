/**
 * Created by 111111 on 2017/10/24.
 */
// let payConfig;
// let getConfig = async function () {
//    payConfig = await dictionaryModel.findOne({name: '系统'});
// };
// getConfig();
// setInterval(getConfig, 300000);
// let transform = function(allPai){
//     let arr = [
//         [0,0,0,0,0,0,0,0,0],
//         [0,0,0,0,0,0,0,0,0],
//         [0,0,0,0,0,0,0,0,0]
//     ];
//     let allPaiLength = allPai.length;
//     for(let i = 0; i < allPaiLength; i++){
//         let int = Math.floor(allPai[i]/10);
//         let index = allPai[i]%10;
//         arr[int][index-1]++;
//     }
//     return arr;
// };
// let mahjongs = [];
// let createMahjongs = function(){
//
//     for(let i = 1; i < 10; i++){
//         for(let j = 0; j < 4; j++){
//             mahjongs.push(i);
//             mahjongs.push(i+10);
//             mahjongs.push(i+20);
//         }
//     }
// };
// createMahjongs();
//
// let washMahjongs = function(){
//     let index, _mahjong, mahjong = [];
//     let mahjongLength = mahjongs.length;
//     for(let i = mahjongLength; i > 0; i--){
//         index = Math.floor(Math.random() * i);
//         _mahjong = mahjongs.splice(index, 1);
//         mahjong.push(_mahjong[0]);
//     }
//     return mahjong;
// };
// let all = washMahjongs();
// console.log(all.length)

// console.log(mahjongs.sort((a,b)=>{
//     return a-b;
// }));
// let mahjongs = [5,5,5,12,13,14,6,6,25,26,27,15,16,17];
// let allPai = transform(mahjongs);
// console.log(allPai)
// module.exports = {
//     cleanData: async function(){
//         let agentUsers = await agentUserModel.find({});
//         for(let i = 0; i < agentUsers.length; i++){
//             let gameUid = await gameModel.findOne({id:})
//
//     }
// }
