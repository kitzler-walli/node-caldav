'use strict';

const https = require('https');
const parseString = require('xml2js').parseString;
const moment = require('moment');
const ical = require('ical.js');


/**
 * Add an event to a given calendar
 *
 * @param  {Object} event
 * @param  {String} url
 * @param  {String} user
 * @param  {String} pass
 * @param  {function} cb

 */
const updateEvent = function (event, url, user, pass, method, cb) {
    const urlparts = /(https?)\:\/\/(.*?):?(\d*)?(\/.*\/?)/gi.exec(url);
    const protocol = urlparts[1];
    const host = urlparts[2];
    const port = urlparts[3] || (protocol === 'https' ? 443 : 80);
    const path = urlparts[4] + event.key;

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

    let body = `${'BEGIN:VCALENDAR\n' +
        'BEGIN:VEVENT\n' +
        'UID:'}${event.key}\n` +
        `LOCATION:${event.location ? event.location : ''}\n` +
        `DESCRIPTION:${event.description ? event.description : ''}\n` +
        `SUMMARY:${event.summary}\n`;

    let _startDateBody;
    let _endDateBody;

    const formatSingleEvent = 'YYYYMMDDTHHmmss';
    const formatAllDay = 'YYYYMMDD';

    if (event.allDayEvent) {
        _startDateBody = `DTSTART;TZID=${event.tzid}:${moment(event.startDate).format(formatAllDay)}\n`;
        
    } else {
        _startDateBody = `DTSTART;VALUE=DATE:${moment(event.startDate).format(formatSingleEvent)}\n`;
    }

    if (event.allDayEvent) {
        _endDateBody = `DTEND;TZID=${event.tzid}:${moment(event.endDate).format(formatAllDay)}\n`;
    } else {
        _endDateBody = `DTEND;VALUE=DATE:${moment(event.endDate).add(1, 'days').format(formatSingleEvent)}\n`;
    }


    body += `${_startDateBody +
        _endDateBody
        }END:VEVENT\n` +
        'END:VCALENDAR';

    const options = {
        rejectUnauthorized: false,
        hostname: host,
        port,
        path,
        method,
        headers: {
            'Content-type': 'text/calendar',
            'Content-Length': body.length,
            'User-Agent': 'calDavClient',
            Connection: 'close',
            Depth: '1',
        },
    };

    if (user && pass) {
        const userpass = Buffer.from(`${user}:${pass}`).toString('base64');
        options.headers.Authorization = `Basic ${userpass}`;
    }

    /* ERROR example
      <D:error xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
        <C:valid-calendar-data/>
      </D:error>
    */

    let err;
    const req = https.request(options, (res) => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
            err = new Error(`response error: ${res.statusCode}`);
        }
    });

    req.on('error', (e) => {
        err = e;
    });

    req.on('close', () => {
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
     * @param  {String} Any timeformat handled by moment.js
     * @param  {String} Any timeformat handled by moment.js, optional (can be null).
     * @param  {Boolean} raw return all details in raw ICAL.Event structore, otherwise parse to event object
     * @param  {function} cb
  
     */
    getEvents: function (url, user, pass, start, end, raw, cb) {

        start = moment(start).utc().format('YYYYMMDD[T]HHmmss[Z]');
        end = (end) ? moment(end).utc().format('YYYYMMDD[T]HHmmss[Z]') : null;

        const urlparts = /(https?)\:\/\/(.*?):?(\d*)?(\/.*\/?)/gi.exec(url);
        const protocol = urlparts[1];
        const host = urlparts[2];
        const port = urlparts[3] || (protocol === 'https' ? 443 : 80);
        const path = urlparts[4];
        const endTimeRange = (end) ? ` end="${end}"` : '';

        const xml = `${'<?xml version="1.0" encoding="utf-8" ?>\n' +
            '<C:calendar-query xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">\n' +
            '  <D:prop>\n' +
            '    <C:calendar-data/>\n' +
            '  </D:prop>\n' +
            '  <C:filter>\n' +
            '    <C:comp-filter name="VCALENDAR">\n' +
            '      <C:comp-filter name="VEVENT">\n' +
            '        <C:time-range start="'}${start}"${endTimeRange}/>\n` +
            '      </C:comp-filter>\n' +
            '    </C:comp-filter>\n' +
            '  </C:filter>\n' +
            '</C:calendar-query>';

        const options = {
            rejectUnauthorized: false,
            hostname: host,
            port,
            path,
            method: 'REPORT',
            headers: {
                'Content-type': 'text/xml',
                'Content-Length': xml.length,
                'User-Agent': 'calDavClient',
                Connection: 'close',
                Depth: '1',
            },
        };

        if (user && pass) {
            const userpass = Buffer.from(`${user}:${pass}`).toString('base64');
            options.headers.Authorization = `Basic ${userpass}`;
        }

        let s = '';
        const req = https.request(options, (res) => {
            res.on('data', (chunk) => {
                s += chunk;
            });
        });

        let err;
        req.on('error', (e) => {
            err = e;
        });

        req.on('close', () => {
            if (err) {
                return cb(err);
            }

            const reslist = [];
            try {
                return parseString(s, (err, result) => {
                    const data = result['d:multistatus']['d:response'];

                    if (data) {
                        data.forEach((event) => {
                            const ics = event['d:propstat'][0]['d:prop'][0]['cal:calendar-data'][0];
                            const jcalData = ical.parse(ics);
                            const vcalendar = new ical.Component(jcalData);
                            const vevent = vcalendar.getFirstSubcomponent('vevent');
                            var event = new ICAL.Event(vevent);
                            if (raw) {
                                reslist.push(event);
                            }
                            else {
                                reslist.push({
                                    key: event.uid,
                                    summary: event.summary,
                                    location: event.location,
                                    description: event.description,
                                    startDate: event.startDate.toICALString(),
                                    endDate: event.endDate.toICALString(),
                                    tzid: event.startDate.zone.tzid,
                                    allDayEvent: event.startDate.icaltype == 'date'
                                });
                            }
                        });
                    }

                    return cb(null, reslist);
                });
            } catch (e) {
                return cb(e);
            }
        });

        return req.end(xml);
    },
};
