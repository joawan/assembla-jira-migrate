#!/usr/bin/env node

'use strict';

var request = require('request'),
  es = require('event-stream'),
  config = require('./config.js');

var baseRequest = request.defaults({
  headers: {
    'X-Api-Key': config.key,
    'X-Api-Secret': config.secret
  }
});

function reporterToUser(id) {
  return config.users[id] || '';
}

function csvEscape(val) {
  return val.replace(/"/g, '""');
}

function timeFormat(val) {
  return val.slice(0,19).replace('T', ' ') // yyyy-MM-dd HH:mm:ss
}

function guessType(summary) {
  if (summary.slice(0,3).toLowerCase() == 'bug') {
    return "Bug";
  }
  if (summary.slice(0,3).toLowerCase() == 'as ') {
    return "Story";
  }
  if (summary.slice(0,4).toLowerCase() == 'task') {
    return "Task";
  }

  return "Incoming";
}

process.stdin
  .pipe(es.split())
  .pipe(es.map(function(num, cb) {
    if (!parseInt(num, 10)) {
      return cb();
    }
    var url = '{b}/spaces/{s}/tickets/{#}.json'.replace('{b}', config.url).replace('{s}', config.space).replace('{#}', num);
    baseRequest.get(url, function(err, res, body) {
      if (err) {
        return cb(err);
      }
      if (res.statusCode !== 200) {
        return cb(null, 'Ticket {n} not found'.replace('{n}', num));
      }
      var ticket = JSON.parse(body);

      // "ExternalId","Summary","Description","Reporter","Issue Type","Priority","Date Created"
      var out = [
        ticket.number,
        csvEscape(ticket.summary),
        csvEscape(ticket.description),
        reporterToUser(ticket.reporter_id),
        guessType(ticket.summary),
        ticket.priority,
        timeFormat(ticket.created_on)
      ]
      out = '"' + out.join('","') + '"';
      return cb(null, out);
    });
  }))
  .pipe(es.join('\n'))
  .pipe(process.stdout);
