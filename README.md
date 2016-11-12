node-caldav-mod
===========

A lightweight Node.JS Caldav Client

Usage
-----------

```javascript

var caldav = require("node-caldav-mod");

/**
 * Add a new event to a CalDAV calendar
 * @param {object} event - Information about the event
 * @param {string} url - CalDAV Calendar URL
 * @param {string} username - CalDAV Username
 * @param {string} password - CalDAV password
 * @param {function} callback - Callback function
 * @function
 */
caldav.addEvent(event, url, username, password, callback)
```

The event object needs to look like this:

```javascript
const event = {
  key: "", // ID of the event, needs to be unique and can be used to edit the event in the future
  summary: "", // The title of the event
  startDate: "", // YYYYMMDDTHHmmsZ
  endDate: "", // YYYYMMDDTHHmmsZ - To create an all-day event, set endDate = startDate
}
```

```javascript
/**
 * Get the events from a CalDAV calendar for a specific range of dates
 * @param {string} url - CalDAV Calendar URL
 * @param {string} username - CalDAV Username
 * @param {string} password - CalDAV password
 * @param {string} startDate - Date from which to start, format: YYYYMMDDTHHmmsZ (example: 20140101T120000Z)
 * @param {string} endDate - CalDAV password
 * @param {function} callback - Callback function
 * @function
 */
caldav.getEvents(url, username, password, startDate, endDate, callback)
```

Fork
-----------

I have forked [this](https://github.com/jachwe/node-caldav/) project because it wasn't parsing correctly my caldav XML. If you are having the same issue, feel free to use this node.js package and modify it.
