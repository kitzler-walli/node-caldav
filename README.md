node-caldav (Work-in-Progress)
===========

A lightweight Node.JS Caldav Client

Usage
-----------

```sh

var caldav = require("node-caldav");

caldav.getList([caldav_baseurl],[username],[password],callback)

caldav.getEvents([caldav_calendarurl],[username],[password],[startDate],[endDate],callback)

```

Fork
-----------

I have forked [this]() project because it wasn't parsing correctly my caldav XML. If you are having the same issue, feel free to use this node.js package and modify it.
