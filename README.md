node-caldav-mod
===========

A lightweight Node.JS Caldav Client

Usage
-----------
```
  npm install {github repo}
```
```javascript
var caldav = require("node-caldav-mod");
```
### Event
The event object needs to look like this:

```javascript
const event = {
  key: "", // ID of the event, needs to be unique and can be used to edit the event in the future
  summary: "", // The title of the event
  location: "" // Location of the event, optional.
  description: "" // Description of the event, optional.
  startDate: "", // Any timeformat handled by moment.js
  endDate: "", // Any timeformat handled by moment.js
  tzid: "" // time zone in the format of "Europe/London"
  allDayEvent: "false" // specify allDayEvent (no time just date) / note no timezone for allDayEvents
}
```
### Get Events
```javascript
/**
 * Get the events from a CalDAV calendar for a specific range of dates
 * @param {string} url - CalDAV Calendar URL
 * @param {string} username - CalDAV Username
 * @param {string} password - CalDAV password
 * @param {string} startDate - Date from which to start, Any timeformat handled by moment.js
 * @param {string} endDate -  Date from which to stop, Any timeformat handled by moment.js optional (can be null).
 * @param {function} callback - Callback function
 * @function
 */
caldav.getEvents(url, username, password, startDate, endDate, callback)
```
### Add Event
```javascript
/**
 * Get the events from a CalDAV calendar for a specific range of dates
 * @param {string} url - CalDAV Calendar URL
 * @param {string} username - CalDAV Username
 * @param {string} password - CalDAV password
 * @param {function} callback - Callback function
 * @function
 */
caldav.addEvent(event, url, username, password, callback)
```
### Delete Event
```javascript
/**
 * Get the events from a CalDAV calendar for a specific range of dates
 * @param {string} url - CalDAV Calendar URL
 * @param {string} username - CalDAV Username
 * @param {string} password - CalDAV password
 * @param {function} callback - Callback function
 * @function
 */
caldav.removeEvent(event, url, username, password, callback)
```

Fork
-----------

I have forked [this](https://github.com/andreafalzetti/node-caldav-mod/) project because the error handling was really bad and I needed a method for deleting events.
