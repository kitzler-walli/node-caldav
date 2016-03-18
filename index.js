"use strict";

var https = require("https");
var xmljs = require("libxmljs");
var moment = require('moment');

module.exports = {

  /**
   * Add an event to a given calendar
   *
   * @param  {Object} event   
   * @param  {String} url
   * @param  {String} user
   * @param  {String} pass
   * @param  {function} cb

   */
  addEvent: function (event, url, user, pass, cb) {

    var urlparts = /(https?)\:\/\/(.*?):?(\d*)?(\/.*\/?)/gi.exec(url);
    var protocol = urlparts[1];
    var host = urlparts[2];
    var port = urlparts[3] || (protocol === "https" ? 443 : 80);
    var path = urlparts[4] + event.key;
    


    /*
    
      BEGIN:VCALENDAR
      BEGIN:VEVENT
      UID:test123
      SUMMARY:Test Event
      DTSTART:20140920T080000Z
      DTEND:20140920T170000Z
      END:VEVENT
      END:VCALENDAR

      BEGIN:VCALENDAR
      BEGIN:VEVENT
      UID:test123
      SUMMARY:Test Event
      DTSTART;VALUE=DATE:20160319
      DTEND;VALUE=DATE:20160321
      END:VEVENT
      END:VCALENDAR

    */
   
    var body = 'BEGIN:VCALENDAR\n' +
               'BEGIN:VEVENT\n' +
               'UID:' + event.key + '\n' +
               'SUMMARY:' + event.summary + '\n';
    
    var _startDateBody, _endDateBody;
    
    var format_allDay = "YYYYMMDDTHHmms";
    var format_singleEvent = "YYYYMMDD";
    
    /*var _startDate = moment(event.startDate).format("YYYYMMDDTHHmms") + "Z";
    if(typeof event.endDate === "undefined" ||
       event.endDate === "") {
         _endDate = moment(event.startDate).add(1, "days").format("YYYYMMDDTHHmms") + "Z";
    } else {
         var _endDate = moment(event.endDate).format("YYYYMMDDTHHmms") + "Z"; 
    }*/
        
    
    if(moment(event.startDate).hour() === 0) {
      _startDateBody = 'DTSTART;VALUE=DATE:' + moment(event.startDate).format(format_singleEvent) + '\n';
    } else {
      _startDateBody = 'DTSTART:' + moment(event.startDate).format(format_allDay) + 'Z\n';
    }
    
    if(moment(event.endDate).hour() === 0) {
      _endDateBody = 'DTEND;VALUE=DATE:' + moment(event.endDate).format(format_singleEvent) + '\n';
    } else {
      _endDateBody = 'DTEND:' + moment(event.endDate).format(format_allDay) + 'Z\n';      
    }
    
    
    body += _startDateBody + 
            _endDateBody +   
            'END:VEVENT\n' +
            'END:VCALENDAR';
    console.log(body);
    var options = {
      rejectUnauthorized: false,
      hostname          : host,
      port              : port,
      path              : path,
      method            : 'PUT',
      headers           : {
        "Content-type"  : "text/calendar",
        "Content-Length": body.length,
        "User-Agent"    : "calDavClient",
        "Connection"    : "close",
        "Depth"         : "1"
      }
    };    
    
    if (user && pass) {
      var userpass = new Buffer(user + ":" + pass).toString('base64');
      options.headers["Authorization"] = "Basic " + userpass;
    }
    
    /* ERROR example
      <D:error xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
        <C:valid-calendar-data/>
      </D:error>
    */
    console.log(options);
    var req = https.request(options, function (res) {
      var s = "";
      res.on('data', function (chunk) {
        s += chunk;
      });

      req.on('close', function () {
        if(s === "") {
          cb(true);
        } else {
          cb(false);
        }
      });
    });

    req.end(body);

    req.on('error', function (e) {
      console.log('problem with request: ' + e.message);
    });        
  },

  /**
   * Get a list of Folders/Calendars from a given url
   *
   * @param  {String} url
   * @param  {String} user
   * @param  {String} pass
   * @param  {function} cb

   */

  getList: function (url, user, pass, cb) {

    var urlparts = /(https?)\:\/\/(.*?):?(\d*)?(\/.*\/?)/gi.exec(url);
    var protocol = urlparts[1];
    var host = urlparts[2];
    var port = urlparts[3] || (protocol === "https" ? 443 : 80);
    var path = urlparts[4];

    var xml = '<?xml version="1.0" encoding="utf-8" ?>\n' +
      ' <D:propfind xmlns:D="DAV:" xmlns:C="http://calendarserver.org/ns/">\n' +
      '     <D:prop>\n' +
      '             <D:displayname />\n' +
      '     </D:prop>\n' +
      ' </D:propfind>';

    var options = {
      rejectUnauthorized: false,
      hostname          : host,
      port              : port,
      path              : path,
      method            : 'PROPFIND',
      headers           : {
        "Content-type"  : "text/xml",
        "Content-Length": xml.length,
        "User-Agent"    : "calDavClient",
        "Connection"    : "close",
        "Depth"         : "1"
      }
    };

    if (user && pass) {
      var userpass = new Buffer(user + ":" + pass).toString('base64');
      options.headers["Authorization"] = "Basic " + userpass;
    }


    var req = https.request(options, function (res) {
      var s = "";
      res.on('data', function (chunk) {
        s += chunk;
      });

      req.on('close', function () {
        var reslist = [];
        try {
          var xmlDoc = xmljs.parseXml(s);
          // console.log(xmlDoc.toString() );
          var resp = xmlDoc.find("a:response", { a: 'DAV:'});
          for (var i in resp) {
            var el = resp[i];
            var href = el.get("a:href", { a: 'DAV:'});
            var dspn = el.get("a:propstat/a:prop/a:displayname", { a: 'DAV:'});
            if (dspn) {
              var resobj = {};
              resobj.displayName = dspn.text();
              resobj.href = href.text();
              reslist.push(resobj);
            }
          }
        }
        catch (e) {
          console.log("Error parsing response")
        }

        cb(reslist);

      });
    });

    req.end(xml);

    req.on('error', function (e) {
      console.log('problem with request: ' + e.message);
    });

  },

  /**
   * Get a list of Events from a given Calendarurl
   *
   * @param  {String} url
   * @param  {String} user
   * @param  {String} pass
   * @param  {String} date from which to start like 20140101T120000Z
   * @param  {String} date from which to stop like 20140102T120000Z, optional (can be undefined)
   * @param  {function} cb

   */
  getEvents: function (url, user, pass, start, end, cb) {

    var urlparts = /(https?)\:\/\/(.*?):?(\d*)?(\/.*\/?)/gi.exec(url);
    var protocol = urlparts[1];
    var host = urlparts[2];
    var port = urlparts[3] || (protocol === "https" ? 443 : 80);
    var path = urlparts[4];
    var endTimeRange = (end) ? ' end="'+end+'"' : "";

    var xml = '<?xml version="1.0" encoding="utf-8" ?>\n' +
      '<C:calendar-query xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">\n' +
      '  <D:prop>\n' +
      '    <C:calendar-data/>\n' +
      '  </D:prop>\n' +
      '  <C:filter>\n' +
      '    <C:comp-filter name="VCALENDAR">\n' +
      '      <C:comp-filter name="VEVENT">\n' +
      '        <C:time-range start="'+start+'"'+endTimeRange+'/>\n' +
      '      </C:comp-filter>\n' +
      '    </C:comp-filter>\n' +
      '  </C:filter>\n' +
      '</C:calendar-query>';
console.log(xml);
    var options = {
      rejectUnauthorized: false,
      hostname          : host,
      port              : port,
      path              : path,
      method            : 'REPORT',
      headers           : {
        "Content-type"  : "text/xml",
        "Content-Length": xml.length,
        "User-Agent"    : "calDavClient",
        "Connection"    : "close",
        "Depth"         : "1"
      }
    };

    if (user && pass) {
      var userpass = new Buffer(user + ":" + pass).toString('base64');
      options.headers["Authorization"] = "Basic " + userpass;
    }

    var req = https.request(options, function (res) {
      var s = "";
      res.on('data', function (chunk) {
        s += chunk;
      });

      req.on('close', function () {
        var reslist = [];
        try {
          var xmlDoc = xmljs.parseXml(s);
          // console.log(xmlDoc.toString() );
          var data = xmlDoc.find("d:response/d:propstat/d:prop/c:calendar-data",{ d: 'DAV:', c: "urn:ietf:params:xml:ns:caldav" });
    for (var i in data) {
            var ics = data[i].text();
            var evs = ics.match(/BEGIN:VEVENT[\s\S]*END:VEVENT/gi);
            for (var x in evs) {
              var evobj = {};
          var evstr = evs[x];
        var regexFix = /[^\S\t]\n/gm;
              evstr = evstr.replace(regexFix, "");
          evstr = evstr.split("\n");
              for (var y in evstr) {
                var evpropstr = evstr[y];
                if (evpropstr.match(/BEGIN:|END:/gi)) {
                  continue;
                }
                var sp = evpropstr.split(":");
                var key = sp[0];
                var val = sp[1];
                if (key && val) {
                  evobj[key] = val;
                }

              }
              reslist.push(evobj)
            }

          }
          cb(reslist);
        }
        catch (e) {
          console.log("Error parsing response")
        }

      });
    });

    req.end(xml);

    req.on('error', function (e) {
      console.log('problem with request: ' + e.message);
    });

  }
};
