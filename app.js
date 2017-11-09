const http = require('http');
const express = require('express');
const path = require('path');
const config=require('./lib/config')
const bodyParser = require('body-parser');
require('body-parser-xml')(bodyParser);
require('./db/mongodb').load();
// require('./testClearShare').scheduleCronstyle();

const app = express();
app.set('port', config.webPort); //设置express端口，跟http服务端口相同即可
app.use(function(req, res, next) { //404错误的处理
    res.setHeader('Access-Control-Allow-Origin', '*');
    next();
});
app.use(bodyParser.xml({
    limit: '2MB',   // Reject payload bigger than 1 MB
    xmlParseOptions: {
        normalize: true,     // Trim whitespace inside text nodes
        normalizeTags: true, // Transform tags to lowercase
        explicitArray: false // Only put nodes in array if >1
    }
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public'))); //设置静态文件目录
app.use('/login', require('./router/otherLogin'));
app.use('/otherLogin', require('./router/otherLogin'));
app.use('/pay', require('./router/threePay'));
app.use('/share', require('./router/share'));
app.use('/threepay', require('./router/threePay'));

// app.use('/test', require('./router/test'));

app.use(function(req, res, next) { //404错误的处理
    res.send('404');
});
//
//if (app.get('env') === 'development') { //开发环境错误的处理
//    app.use(function(err, req, res, next) {
//        res.status(err.status || 500);
//        res.send(err.message);
//        //res.render('error', {
//        //    message: err.message,
//        //    error: err
//        //});
//    });
//}
//
//app.use(function(err, req, res, next) { //产品环境错误的处理
//    res.status(err.status || 500);
//    res.send(err.message);
//    //res.render('error', {
//    //    message: err.message,
//    //    error: {}
//    //});
//});

//app.listen(port);
//
var server = http.createServer(app);
server.listen(config.webPort);

// require('./db/gameuser').load();
// http://localhost:3000/test.html
