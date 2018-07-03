# seneca-member

[Seneca](senecajs.org) plugin for generic membership relations between entities.

[![Npm][BadgeNpm]][Npm]
[![Travis][BadgeTravis]][Travis]
[![Coveralls][BadgeCoveralls]][Coveralls]


## Quick Example

```
const Seneca = require('seneca')

Seneca()
    .use('member')
    .act({
      role: 'member',
      cmd: 'add',
      parent:'p001', 
      child:'c001', 
      kind:'group', 
      code:'admin', 
      tags:['foo','bar']
      },
      function(err, out) {
        console.log(out)
      })
```

## Install

```sh
$ npm install seneca-member
```


## Inbound Messages



## Implementations



[BadgeCoveralls]: https://coveralls.io/repos/voxgig/seneca-member/badge.svg?branch=master&service=github
[BadgeNpm]: https://badge.fury.io/js/seneca-member.svg
[BadgeTravis]: https://travis-ci.org/voxgig/seneca-member.svg?branch=master
[Coveralls]: https://coveralls.io/github/voxgig/seneca-member?branch=master
[Npm]: https://www.npmjs.com/package/seneca-member
[Travis]: https://travis-ci.org/voxgig/seneca-member?branch=master
