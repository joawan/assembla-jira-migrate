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
  if (!config.users[id]) {
    console.warn(id + ' no found!');
  }
  return config.users[id] || '';
}

function timeFormat(val) {
  return val.replace('Z', '+0100') // yyyy-MM-dd'T'HH:mm:ss.SSS+0100
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

function priority(prio) {
  switch (prio) {
    case 1:
      return 'Critical';
    case 2:
      return 'Major';
    case 3:
      return 'None';
    case 4:
      return 'Minor';
    case 5:
      return 'Trivial';
  }
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
        return cb('Ticket {n} not found'.replace('{n}', num));
      }
      var ticket = JSON.parse(body);
      return cb(null, ticket);
    });
  }))
  .pipe(es.map(function(ticket, cb) {
    var url = '{b}/spaces/{s}/tickets/{#}/ticket_comments.json'.replace('{b}', config.url).replace('{s}', config.space).replace('{#}', ticket.number);
    baseRequest.get(url, function(err, res, body) {
      if (err) {
        return cb(err);
      }
      if (res.statusCode !== 200) {
        return cb('Ticket {n} not found'.replace('{n}', ticket.number));
      }
      ticket.comments = JSON.parse(body);
      return cb(null, ticket);
    });
  }))
  .pipe(es.map(function(ticket, cb) {
    console.log(ticket);
    var jira = {
      'externalId': ticket.number,
      'summary': ticket.summary,
      'description': ticket.description,
      'reporter': reporterToUser(ticket.reporter_id),
      'issueType': guessType(ticket.summary),
      'priority': priority(ticket.priority),
      'created': timeFormat(ticket.created_on)
    };

    var comments = ticket.comments || [];
    jira.comments = comments.map(function(comment) {
      return {
        'body': comment.comment || comment.ticket_changes,
        'author': reporterToUser(comment.user_id),
        'created': timeFormat(comment.created_on)
      };
    }).filter(function(comment) {
      return comment.body !== "--- []\n";
    });;

    return cb(null, JSON.stringify(jira));
  }))
  .pipe(es.join(',\n'))
  .pipe(process.stdout);
