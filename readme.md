# Pebble - Timeline Tester
Version 1.1
## About

Timeline Tester is a simple webapp that lets you easily create a timeline pin for pebble.

The production tool is available at https://willow.systems/pebble/timeline-tester/

## The code

The code is made of two parts, the 'webapp', which is an html page and a little Javascript, and the proxy server, which accepts pin creation requests as POST requests, then forwards them to rebble. This is to get around CORS issues, but also to perform some sanity checking.

## Deploy yourself

### Dependencies

`npm install express https fs cors`

Deploying is pretty simple, put the contents of /site on a web server, and update main.js to point to where you'll be running the nodejs app.

Then configure the nodejs app in /proxyServer to include your SSL cert and key, or alternatively set use_https to no and run it behind a reverse proxy (that's what I ended up doing).

## Using the tester

The easiest way is just to use the live version at https://willow.systems/pebble/timeline-tester/. You'll need a timeline token, so if you don't have one of those you can press the little "what's this" button above the input and download the Generate Token app to... generate one
