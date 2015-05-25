## assembla-jira-migrate

App reads ticketlist from stdin, and pipes it to request to get ticket info from Assembla, and outputs data for JIRA migration.

### Usage
Copy `config-dist.js` to `config.js` and set your space id and API credentials.
API credentials can be found in [assembla](https://www.assembla.com/user/edit/manage_clients). Do not use application credentials.

This one is a bit complex but...
```
git log --abbrev-commit --pretty=oneline --no-merges  master..rc | grep -o -e "#[0-9]\+" | tr -d "#" | sort -u -r | ~/dir/app.js
```

Inside your repository of choice, run git log with a diff between branches, master and rc in this case. Then grep lines with ticket numbers, remove the hash, sort uniques and pipe it to this app to get ticket information about those tickets.

### License
MIT