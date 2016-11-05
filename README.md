node-caldav-mod
===========

A lightweight Node.JS Caldav Client

Usage
-----------

```sh

var caldav = require("node-caldav-mod");

caldav.addEvent(event, url, user, pass, cb)

caldav.getEvents([caldav_calendarurl],[username],[password],[startDate],[endDate],callback)

```

Fork
-----------

I have forked [this](https://github.com/jachwe/node-caldav/) project because it wasn't parsing correctly my caldav XML. If you are having the same issue, feel free to use this node.js package and modify it.
