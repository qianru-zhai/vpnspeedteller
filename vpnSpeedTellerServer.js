const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')

const adapterShanghai = new FileSync('Shanghai.json')
const dbOfShanghai = low(adapterShanghai)

const adapterCluj = new FileSync('Cluj.json')
const dbOfCluj = low(adapterCluj)

var express = require('express')
var zip = require('express-zip')
var fs = require('fs')
var app = express()
const MAX_RECORDS = 10
const TIMEOUT = 120
const TEST_TARGET = {
   Octane_RT: "Octane_RT",
   MF_RT: "MF_RT",
   Kalimanjaro_RT: "Kalimanjaro_RT",
   RDP_RT: "RDP_RT"
};

const VPN = {
   Singapore: "Singapore",
   China: "China",
   Houston_US: "Houston US",
   India: "India",
   UK: "UK",  
};

app.use(express.json());
app.use(express.static(__dirname + '/'));   
app.use(express.urlencoded({ extended: true }))
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');
app.set('views', __dirname);

function filldb(db, testSite, vpn, dateTime, resTime) {
	if(db.has(testSite) == false)
		db.set(testSite, []).write()
	var count = db.get(testSite).size().value()
	console.log('count of ' +testSite + ' is' + count)
	if(count > MAX_RECORDS){
		old = db.get(testSite).sortBy('DateTime').take(count - MAX_RECORDS).value()
		console.log('old value length is ' + old.length)
		for(var i=0; i<old.length; i++)
		{
			console.log('old value datatTime is ' + old[i].DateTime)
			db.get(testSite).remove({ DateTime: old[i].DateTime}).write()
		}
	}
			
	db.get(testSite).push({ DateTime: dateTime, responseTime: resTime, vpn: vpn}).write()
}
app.post('/', function(request, response) {
	/*push data to db*/
	console.log(JSON.stringify(request.body))
	var site = request.body.Site

	var db;
	if(site.toLowerCase() == "shanghai") {
		db = dbOfShanghai
	}
	else if(site.toLowerCase() == "cluj"){
		db = dbOfCluj
	}
	
	var responseTime = request.body.ResponseTime
	if(responseTime.Octane_RT != undefined) {
		filldb(db, TEST_TARGET.Octane_RT, request.body.GateWay, request.body.DateTime, responseTime.Octane_RT)
	}
	if(responseTime.MF_RT != undefined) {
		filldb(db, TEST_TARGET.MF_RT, request.body.GateWay, request.body.DateTime, responseTime.MF_RT)
	}
	if(responseTime.Kalimanjaro_RT != undefined) {
		filldb(db, TEST_TARGET.Kalimanjaro_RT, request.body.GateWay, request.body.DateTime, responseTime.Kalimanjaro_RT)
	}
	if(responseTime.RDP_RT != undefined) {
		filldb(db, TEST_TARGET.RDP_RT, request.body.GateWay, request.body.DateTime, responseTime.RDP_RT)
	}
	response.writeHead(200, {'Content-Type': 'text/html'})
	response.end('post data done!\n');
	
	/* for data structure defined by Tina
	var results = request.body.results
	for(var i = 0; i < results.length; i++)
	{
		var protocol = results[i].target
		if(db.has(protocol) == false)
			db.set(protocol, []).write()
		var count = db.get(protocol).size().value()
		console.log('count of ' +protocol + ' is ' + count)
		if(count > MAX_RECORDS){
			old = db.get(protocol).sortBy('DateTime').take(count - MAX_RECORDS).value()
			console.log('old value length is ' + old.length)
			for(var i=0; i<old.length; i++)
			{
				console.log('old value datatTime is ' + old[i].DateTime)
				db.get(protocol).remove({ DateTime: old[i].DateTime}).write()
			}
		}
			
		db.get(protocol).push({ DateTime: results[i].DateTime, responseTime: results[i].AverageTrtProcVal, vpn: results[i].vpn}).write()
	}*/

})

app.post('/upload', function(request, response) {
	console.log('upload... ' + request.query.site)
	var db = dbOfShanghai;
	if(request.query.site.toLowerCase() == 'cluj')
		db = dbOfCluj
	
	var octane = request.body.Octane_RT
	for(var i = 0; i < octane.length; i++){
		filldb(db, TEST_TARGET.Octane_RT, octane[i].vpn, octane[i].DateTime, octane[i].responseTime)
	}
	
	var mf = request.body.MF_RT
	for(var i = 0; i < mf.length; i++){
		filldb(db, TEST_TARGET.MF_RT, mf[i].vpn, mf[i].DateTime, mf[i].responseTime)
	}
	
	var kalimanjaro = request.body.Kalimanjaro_RT
	for(var i = 0; i < kalimanjaro.length; i++){
		filldb(db, TEST_TARGET.Kalimanjaro_RT, kalimanjaro[i].vpn, kalimanjaro[i].DateTime, kalimanjaro[i].responseTime)
	}
	
	var rdp = request.body.RDP_RT
	for(var i = 0; i < rdp.length; i++){
		filldb(db, TEST_TARGET.RDP_RT, rdp[i].vpn, rdp[i].DateTime, rdp[i].responseTime)
	}
	
	response.writeHead(200, {'Content-Type': 'text/html'})
	response.end('upload done!\n');
	
})

app.get('/', function(request, response) {
	response.render('vpn_status1.html',null/*{email:data.email,password:data.password}*/);
	
})
app.get('/clear', function(request, response) {
	for (let key in TEST_TARGET){
		dbOfShanghai.unset(key).write()
		dbOfCluj.unset(key).write()
	}
	console.log('clear data')
	response.writeHead(200, {'Content-Type': 'text/html'})
	response.end('clear!\n');
	
})

app.get('/download', function(request, response) {
	response.zip([
    { path: `${__dirname}/Shanghai.json`, name: 'Shanghai.json' },
    { path: `${__dirname}/Cluj.json`, name: 'Cluj.json' }
  ]);
})

app.get('/data', function(request, response) {
	console.log('request.query ' + JSON.stringify(request.query))
	var db = dbOfShanghai;
	if(request.query.site.toLowerCase() == 'cluj')
		db = dbOfCluj
	
	var overall = {"Singapore":{}, "China": {}, "Houston US": {}, "India":{}, "UK":{}}
	for (let key in VPN){
		/*octane*/
		var octanetime = db.get(TEST_TARGET.Octane_RT).filter({vpn: VPN[key]}).orderBy('DateTime', 'desc').take(1).value()
		if(octanetime[0] != undefined)
			overall[VPN[key]][TEST_TARGET.Octane_RT] = octanetime[0].responseTime
		else
			overall[VPN[key]][TEST_TARGET.Octane_RT] = TIMEOUT

		/*mf main page*/
		var mftime = db.get(TEST_TARGET.MF_RT).filter({vpn: VPN[key]}).orderBy('DateTime', 'desc').take(1).value()
		if(mftime[0] != undefined)
			overall[VPN[key]][TEST_TARGET.MF_RT] = mftime[0].responseTime
		else
			overall[VPN[key]][TEST_TARGET.MF_RT] = TIMEOUT

		
		/*kalimanjaro page*/
		var kalimanjarotime = db.get(TEST_TARGET.Kalimanjaro_RT).filter({vpn: VPN[key]}).orderBy('DateTime', 'desc').take(1).value()
		if(kalimanjarotime[0] != undefined)
			overall[VPN[key]][TEST_TARGET.Kalimanjaro_RT] = kalimanjarotime[0].responseTime
		else
			overall[VPN[key]][TEST_TARGET.Kalimanjaro_RT] = TIMEOUT
		
		/*rdp*/
		var rdptime = db.get(TEST_TARGET.RDP_RT).filter({vpn: VPN[key]}).orderBy('DateTime', 'desc').take(1).value()
		if(rdptime[0] != undefined)
			overall[VPN[key]][TEST_TARGET.RDP_RT] = rdptime[0].responseTime
		else
			overall[VPN[key]][TEST_TARGET.RDP_RT] = TIMEOUT
		
		overall[VPN[key]]["SpeedIndex"] = 0.5*overall[VPN[key]][TEST_TARGET.Octane_RT] + 0.1*overall[VPN[key]][TEST_TARGET.MF_RT] + 0.2*overall[VPN[key]][TEST_TARGET.Kalimanjaro_RT] +0.2*overall[VPN[key]][TEST_TARGET.RDP_RT]
		
	}
	
	/*overall[TEST_TARGET.Octane_RT] = octaneArr
	overall[TEST_TARGET.MF_RT] = mfArr
	overall[TEST_TARGET.Kalimanjaro_RT] = kalimanjaroArr
	overall[TEST_TARGET.RDP_RT] = rdpArr
	overall["Weights_RT"] = weightsArr*/
	console.log('return all data for test ' + JSON.stringify(overall))
	response.status(200).json(overall)
	
})

app.listen(process.env.PORT ||5055)
