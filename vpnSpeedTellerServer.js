const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')

const adapterShanghai = new FileSync('Shanghai.json')
const dbOfShanghai = low(adapterShanghai)

const adapterCluj = new FileSync('Cluj.json')
const dbOfCluj = low(adapterCluj)

var express = require('express')
var fs = require('fs')
var app = express()
const MAX_RECORDS = 10
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
	console.log('post requets ' + request.body)
	console.log(JSON.stringify(request.body))
	var site = request.body.site

	var db;
	if(site.toLowerCase() == "shanghai") {
		db = dbOfShanghai
	}
	else if(site.toLowerCase() == "cluj"){
		db = dbOfCluj
	}
	
	var responseTime = request.body.ResponseTime
	if(responseTime.Octane_RT != undefined) {
		filldb(db, TEST_TARGET.Octane_RT, request.body.vpn, request.body.DateTime, responseTime.Octane_RT)
	}
	if(responseTime.MF_RT != undefined) {
		filldb(db, TEST_TARGET.MF_RT, request.body.vpn, request.body.DateTime, responseTime.MF_RT)
	}
	if(responseTime.Kalimanjaro_RT != undefined) {
		filldb(db, TEST_TARGET.Kalimanjaro_RT, request.body.vpn, request.body.DateTime, responseTime.Kalimanjaro_RT)
	}
	if(responseTime.RDP_RT != undefined) {
		filldb(db, TEST_TARGET.RDP_RT, request.body.vpn, request.body.DateTime, responseTime.RDP_RT)
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
app.get('/', function(request, response) {
	response.render('vpn_status1.html',null/*{email:data.email,password:data.password}*/);
	
})
app.get('/clear', function(request, response) {
	for (let key in TEST_TARGET){
		dbOfShanghai.unset(key).write()
		dbOfCluj.unset(key).write()
	}
	response.writeHead(200, {'Content-Type': 'text/html'})
	response.end('clear!\n');
	
})

app.get('/data', function(request, response) {
	console.log('request.query ' + JSON.stringify(request.query))
	var db = dbOfShanghai;
	if(request.query.site.toLowerCase() == 'cluj')
		db = dbOfCluj
	
	var octaneArr = {}
	var mfArr = {}
	var kalimanjaroArr = {}
	var rdpArr = {}
	for (let key in VPN){
		/*octane*/
		var octanetime = db.get(TEST_TARGET.Octane_RT).filter({vpn: VPN[key]}).orderBy('DateTime', 'desc').take(1).value()
		if(octanetime[0] != undefined)
			octaneArr[key] = octanetime[0].responseTime

		/*mf main page*/
		var mftime = db.get(TEST_TARGET.MF_RT).filter({vpn: VPN[key]}).orderBy('DateTime', 'desc').take(1).value()
		if(mftime[0] != undefined)
			mfArr[key] = mftime[0].responseTime

		
		/*kalimanjaro page*/
		var kalimanjarotime = db.get(TEST_TARGET.Kalimanjaro_RT).filter({vpn: VPN[key]}).orderBy('DateTime', 'desc').take(1).value()
		if(kalimanjarotime[0] != undefined)
			kalimanjaroArr[key] = kalimanjarotime[0].responseTime
		
		/*rdp*/
		var rdptime = db.get(TEST_TARGET.RDP_RT).filter({vpn: VPN[key]}).orderBy('DateTime', 'desc').take(1).value()
		if(rdptime[0] != undefined)
			rdpArr[key] = rdptime[0].responseTime
	}
	console.log('temporarily return rdp data for test ' + JSON.stringify(rdpArr))
	response.status(200).json(rdpArr)
	
})

app.listen(process.env.PORT ||5055)
