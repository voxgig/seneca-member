# seneca-member

[Seneca](senecajs.org) plugin for generic membership relations between entities.

[![Npm][BadgeNpm]][Npm]
[![Travis][BadgeTravis]][Travis]
[![Coveralls][BadgeCoveralls]][Coveralls]


## Install

```sh
$ npm install seneca-promisify seneca-member
```


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


## Usage

* For message validation,
  load [seneca-doc](github.com/voxgig/seneca-doc)
  and [seneca-joi](github.com/voxgig/seneca-joi)



<!--START:action-list-->


## Action Patterns

* [add:kinds,role:member](#-addkindsrolemember-)
* [add:member,role:member](#-addmemberrolemember-)
* [get:kinds,role:member](#-getkindsrolemember-)
* [is:member,role:member](#-ismemberrolemember-)
* [list:children,role:member](#-listchildrenrolemember-)
* [list:parents,role:member](#-listparentsrolemember-)
* [remove:member,role:member](#-removememberrolemember-)
* [role:member,update:member](#-rolememberupdatemember-)


<!--END:action-list-->

<!--START:action-desc-->


## Action Descriptions

### &laquo; `add:kinds,role:member` &raquo;

Add parent and child entity types.


#### Parameters


* _kinds_ : object


----------
### &laquo; `add:member,role:member` &raquo;

Add child (id) to parent (id) under relationship `kind` (idempotent).


#### Parameters


* _parent_ : string <i><small>{presence:required}</small></i>
 : Parent entity identifier.
* _child_ : string <i><small>{presence:required}</small></i>
 : Child entity identifier.
* _kind_ : string <i><small>{presence:required}</small></i>
* _code_ : string
* _tags_ : array <i><small>{sparse:false}</small></i>


----------
### &laquo; `get:kinds,role:member` &raquo;

No description provided.



----------
### &laquo; `is:member,role:member` &raquo;

No description provided.


#### Parameters


* _parent_ : string <i><small>{presence:required}</small></i>
* _child_ : string
 : Child entity identifier.
* _kind_ : string
* _code_ : string
* _tags_ : array <i><small>{sparse:false}</small></i>


----------
### &laquo; `list:children,role:member` &raquo;

No description provided.


#### Parameters


* _parent_ : string
* _child_ : string
* _kind_ : string
* _code_ : string
* _tags_ : array <i><small>{sparse:false}</small></i>


----------
### &laquo; `list:parents,role:member` &raquo;

No description provided.


#### Parameters


* _parent_ : string
* _child_ : string
* _kind_ : string
* _code_ : string
* _tags_ : array <i><small>{sparse:false}</small></i>


----------
### &laquo; `remove:member,role:member` &raquo;

No description provided.


#### Parameters


* _parent_ : string
 : Parent entity identifier.
* _child_ : string
* _kind_ : string
* _code_ : string
* _tags_ : array <i><small>{sparse:false}</small></i>
* _id_ : string


----------
### &laquo; `role:member,update:member` &raquo;

No description provided.


#### Parameters


* _parent_ : string
 : Parent entity identifier.
* _child_ : string
 : Child entity identifier.
* _kind_ : string
* _code_ : string
* _tags_ : array <i><small>{sparse:false}</small></i>
* _id_ : string <i><small>{presence:required}</small></i>


----------


<!--END:action-desc-->


## Development

* Retain @hapi/joi@15 until seneca-joi is updated


[BadgeCoveralls]: https://coveralls.io/repos/voxgig/seneca-member/badge.svg?branch=master&service=github
[BadgeNpm]: https://badge.fury.io/js/seneca-member.svg
[BadgeTravis]: https://travis-ci.org/voxgig/seneca-member.svg?branch=master
[Coveralls]: https://coveralls.io/github/voxgig/seneca-member?branch=master
[Npm]: https://www.npmjs.com/package/seneca-member
[Travis]: https://travis-ci.org/voxgig/seneca-member?branch=master
