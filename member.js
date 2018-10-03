/* Copyright (c) 2018 voxgig and other contributors, MIT License */
'use strict'

// TODO: ensure tags don't get obliterated

const Util = require('util')

const Optioner = require('optioner')
const Eraro = require('eraro')

const Joi = Optioner.Joi

var Errors = require('./lib/errors')

const W = Util.promisify

const SYS_MEMBER_SV = 0

const optioner = Optioner({
  kinds:{}
})

var error = (exports.error = Eraro({
  package: 'seneca',
  msgmap: Errors,
  override: true
}))

module.exports = function member(options) {
  const seneca = this
  const opts = optioner.check(options)

  function define_patterns() {
    seneca
      .add('role:member,add:kinds', add_kinds)
      .add('role:member,get:kinds', get_kinds)
      .add('role:member,add:member', add_member)
      .add('role:member,is:member', is_member)
      .add('role:member,remove:member', remove_member)
      .add('role:member,update:member', update_member)
      .add('role:member,list:children', list_children)
      .add('role:member,list:parents', list_parents)
  }


  const validate_member = {
    parent: Joi.string(),
    child: Joi.string(),
    kind: Joi.string(),
    code: Joi.string(),
    tags: Joi.array().items(Joi.string())
  }


  
  add_kinds.validate = {
    kinds: Joi.object().pattern(/./, Joi.object().unknown(false).keys({
      p: Joi.string().required(),
      c: Joi.string().required()
    }))
  }

  function add_kinds(msg, reply) {
    const seneca = this
    work().then(reply).catch(reply)
  
    async function work() {
      opts.kinds = Object.assign(opts.kinds,msg.kinds)
      return { kinds: opts.kinds }
    }
  }


  function get_kinds(msg, reply) {
    const seneca = this
    work().then(reply).catch(reply)
  
    async function work() {
      return { kinds: opts.kinds }
    }
  }



  add_member.validate = Object.assign({}, validate_member, {
    parent: Joi.string().required(),
    child: Joi.string().required(),
    kind: Joi.string().required(),
  })

  // idemptotent
  function add_member(msg, reply) {
    const seneca = this
    work().then(reply).catch(reply)
  
    async function work() {
      const member_ent = WE(seneca.make('sys/member'))

      const q = {
        p: msg.parent,
        c: msg.child,
        k: msg.kind,
        d: msg.code,
      }
      const prev = await WE(member_ent.make$()).load$(q)

      var member
      
      if(prev) {
        member = await WE(prev).data$({
          t: msg.tags
        }).save$()
      }
      else {
        const data = {
          p: msg.parent,
          c: msg.child,
          k: msg.kind,
          d: msg.code,
          t: msg.tags,
          sv: SYS_MEMBER_SV
        }
        if(msg.id) {
          data.id$ = msg.id
        }

        member = await WE(member_ent.make$()).data$(data).save$()
      }

      return member
    }
  }



  is_member.validate = Object.assign({}, validate_member, {
    parent: Joi.string().required(),
  })

  function is_member(msg, reply) {
    const seneca = this
    work().then(reply).catch(reply)
  
    async function work() {
      const member_ent = WE(seneca.make('sys/member'))

      // required
      const q = {
        p: msg.parent
      }

      if(msg.child) {
        q.c = msg.child
      }

      if(msg.kind) {
        q.k = msg.kind
      }

      if(msg.code) {
        q.d = msg.code
      }

      const member = await member_ent.load$(q)
      var child = []
      
      if(member && 'child' === msg.as) {
        child = await load_items(seneca, [member], msg, 'c')
      }
      
      return {member: member, child: child[0], q: q}
    }
  }


  remove_member.validate = Object.assign({}, validate_member, {
    child: Joi.string().required(),
    kind: Joi.string().required(), // to identify specific membership
  })

  function remove_member(msg, reply) {
    const seneca = this
    work().then(reply).catch(reply)
  
    async function work() {
      const member_ent = WE(seneca.make('sys/member'))

      // required
      const q = {
        c: msg.child,
        k: msg.kind
      }

      if(msg.parent) {
        q.p = msg.parent
      }

      if(msg.code) {
        q.d = msg.code
      }

      const list = await member_ent.list$(q)

      for(var i = 0; i < list.length; i++) {
        await WE(list[i]).remove$()
      }

      return {items:list}
    }
  }

  
  update_member.validate = Object.assign({}, validate_member, {
    id: Joi.string().required(),
  })


  function update_member(msg, reply) {
    const seneca = this
    work().then(reply).catch(reply)
  
    async function work() {
      const member_ent = WE(seneca.make('sys/member'))

      // TODO: remove as replaced by role:member,remove:member
      if(msg.remove) {
        return await WE(member_ent.make$()).remove$(msg.id)
      }
      else {
        var member = await WE(member_ent.make$()).load$(msg.id)

        if(member) {
          member.p = null == msg.parent ? member.p : msg.parent
          member.c = null == msg.child ? member.c : msg.child
          member.k = null == msg.kind ? member.k : msg.kind
          member.d = null == msg.code ? member.d : msg.code
          member.t = null == msg.tags ? member.t : msg.tags
          
          member = await WE(member).save$()
        }

        return member
      }
    }
  }

  
  list_children.validate = Object.assign({}, validate_member, {
  })

  function list_children(msg, reply) {
    const seneca = this
    build_list(seneca,msg,'c').then(reply).catch(reply)
  
  }

  list_parents.validate = Object.assign({}, validate_member, {
  })

  function list_parents(msg, reply) {
    build_list(seneca,msg,'p').then(reply).catch(reply)
  }


  async function build_list(seneca,msg,type) {
    const member_ent = WE(seneca.make('sys/member'))

    const fields = []
    const q = {}

    if('c' === type && null != msg.parent) {
      q.p = msg.parent
    }
    if('p' === type && null != msg.child) {
      q.c = msg.child
    }
    if(null != msg.kind) {
      q.k = msg.kind
    }
    if(null != msg.code) {
      q.d = msg.code
    }
    
    var list = await member_ent.list$(q)
    
    var seen = {}
    list = list.filter(x => seen[x[type]] ? false : seen[x[type]] = true)

    const prefix = 'c' === type ? 'child' : 'parent'
    
    // Return referenced entity ids
    if(null == msg.as || prefix+'-id' == msg.as) {
      list = list.map(x=>x[type])
    }

    // Return sys/member ids
    else if('member-id' == msg.as) {
      list = list.map(x=>x.id)
    }

    // Return sys/member ents
    else if('member' == msg.as) {
      // use list as is
    }

    // Return referenced entities
    else if(prefix == msg.as) {
      list = await load_items(seneca,list,msg,type)
    }
    
    return {items:list}
  }    

  
  async function load_items(seneca, list, msg, type) {
    const out = []

    for(var i = 0; i < list.length; i++) {
      var kind = list[i].k
      var canon = opts.kinds[kind][type]
      var ent = WE(seneca.make(canon))
      var entid = list[i][type]

      var q = {id:entid}
      if(msg.fields) {
        q.fields$ = msg.fields
      }

      var found = (await ent.list$(q))[0]
      if(found) {
        out.push(found)
      }
    }

    return out
  }

  return define_patterns()
}

const intern = (module.exports.intern = {
})


function WE(ent) {
  //const make = ent.make$
  //ent.make$ = function() {
  //  return WE(make.apply(ent,arguments))
  //}
  ent.load$ = W(ent.load$.bind(ent))
  ent.save$ = W(ent.save$.bind(ent))
  ent.list$ = W(ent.list$.bind(ent))
  ent.remove$ = W(ent.remove$.bind(ent))
  return ent
}
