# Pebble - Timeline Services Server
Version 1.8
## About

This server runs the collection of pebble timeline services on https://willow.systems/pebble/. This includes timeline tester, and the ifttt-proxy server.

Timeline Tester is a simple webapp that lets you easily create a timeline pin for pebble.

It also has a server component which proxies pin requests, both for timeline-tester and for [ifttt integration](https://willow.systems/integrate-pebble-with-ifttt-once-again/)

The production tool is available at https://willow.systems/pebble/timeline-tester/

The feature documentation is at https://willow.systems/integrate-pebble-with-ifttt-once-again/

The Release 2 (Server 1.8) feature documentation is at https://willow.systems/pinproxy-v2-released/

## The code

The code is made of two parts, the 'webapp', which is an html page and a little Javascript, and the proxy server, which accepts pin creation requests as POST requests, then forwards them to rebble. This is to get around CORS issues, but also to perform some sanity checking.

For ifttt, there is a special endpoint (/pinproxy-ifttt) which accepts requests without a pin ID, and generates one before sending to rws

## Deploy yourself

Before you deploy yourself, consider instead using [The Timeline Bounce Server](https://github.com/Willow-Systems/timeline-bounce-server), it's a similar server in that it accepts web requests and proxies to rws, but it is designed to be self hosted and work for one user. It's somewhat more secure as your timeline token is stored on the server, whereas for this application it isn't.
Timeline bounce also supports Monzo transaction webhooks, and will be updated to handle translating other services in the future

### Dependencies

`npm install express https fs`

Deploying is pretty simple, put the contents of /site on a web server, and update main.js to point to where you'll be running the nodejs app.

Then configure the nodejs app in /proxyServer to include your SSL cert and key, or alternatively set use_https to no and run it behind a reverse proxy (that's what I ended up doing).

## Using the tester

The easiest way is just to use the live version at https://willow.systems/pebble/timeline-tester/. You'll need a timeline token, so if you don't have one of those you can press the little "what's this" button above the input and download the Generate Token app to... generate one
