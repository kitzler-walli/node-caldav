"use strict";

var https = require("https");
var parseString = require('xml2js').parseString;
var moment = require('moment');
var ical = require('ical.js');


  /**
   * Add an event to a given calendar
   *
   * @param  {Object} event
   * @param  {String} url
   * @param  {String} user
   * @param  {String} pass
   * @param  {function} cb

   */
var updateEvent = function (event, url, user, pass, method, cb) {

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

    if(moment(event.startDate).hour() === 0) {
      _startDateBody = 'DTSTART;VALUE=DATE:' + moment(event.startDate).format(format_singleEvent) + '\n';
    } else {
      _startDateBody = 'DTSTART:' + moment(event.startDate).format(format_allDay) + 'Z\n';
    }

    if(moment(event.endDate).hour() === 0) {
      _endDateBody = 'DTEND;VALUE=DATE:' + moment(event.endDate).add(1, 'days').format(format_singleEvent) + '\n';
    } else {
      _endDateBody = 'DTEND:' + moment(event.endDate).format(format_allDay) + 'Z\n';
    }


    body += _startDateBody +
            _endDateBody +
            'END:VEVENT\n' +
            'END:VCALENDAR';

    var options = {
      rejectUnauthorized: false,
      hostname          : host,
      port              : port,
      path              : path,
      method            : method,
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

    var err;
    var req = https.request(options, function (res) {
        if (res.statusCode < 200 || res.statusCode >= 300) {
            err = new Error('response error: ' + res.statusCode);
        }
    });

    req.on('error', function (e) {
        err = e;
    });

    req.on('close', function () {
        return cb(err);
    });

    return req.end(body);
};

module.exports = {
    addEvent: function (event, url, user, pass, cb) {
        return updateEvent(event, url, user, pass, 'PUT', cb);
    },

    removeEvent: function (event, url, user, pass, cb) {
        return updateEvent(event, url, user, pass, 'DELETE', cb);
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

    var req = https.request(options, (res) => {
      var s = "";
      res.on('data', (chunk) => {
        s += chunk;
      });

      req.on('close', () => {
        var reslist = [];
        try {

          console.log(s);
          parseString(s, (err, result) => {
            console.log("Parsing.....");
            console.log(result);
            var data = result['D:multistatus']['D:response'];

            if(data) {
              data.map((event) => {
                var ics = event['D:propstat'][0]['D:prop'][0]['C:calendar-data'][0];
                var jcalData = ICAL.parse(ics);
                var vcalendar = new ical.Component(jcalData);
                var vevent = vcalendar.getFirstSubcomponent('vevent');
                reslist.push(vevent)
              });
            }

            cb(reslist);
          });
        }
        catch (e) {
          console.log("Error parsing response");
          console.log(e);
        }

      });
    });

    req.end(xml);

    req.on('error', function (e) {
      console.log('problem with request: ' + e.message);
    });

  }
};
