module.exports={
    load:()=>{
        require('./installgameid').load();
        require('./autonumber').load();
        require('./gameuser').load();
        require('./wxorder').load();
        require('./active').load();
        require('./signShare').load();
        require('./roomcardrecord').load();
        require('./agentUser').load();
        require('./royaltyrecord').load();
        require('./dictionary').load();
        require('./share').load();
    }
}
