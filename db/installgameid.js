/**
 * Created by admin on 2017/8/22.
 */
'use strict';
const mongoose = require('mongoose');
const db = require('./db');
const modelName = 'InstallGameId';

let schema = new mongoose.Schema({
    name: {
        type: String
    },
    arr: {
        type: Array
    }
});

schema.index({ name: 1 });

schema.statics={
};


module.exports= {
    load:function(){
        let model = mongoose.model(modelName, schema);
        console.log(`模块${modelName}被注册`);
    }
};
